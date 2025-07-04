const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/docker-execution.log' }),
    new winston.transports.Console()
  ]
});

class DockerExecutionEngine {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.executions = new Map();
    this.tempDir = path.join(__dirname, 'temp');
    this.screenshotsDir = path.join(__dirname, 'screenshots');
    this.dockerImage = 'playwright-runner:latest';
    this.maxConcurrentExecutions = 5;
    this.activeExecutions = 0;
    
    // Configurações de segurança
    this.securityConfig = {
      memory: '512m',           // Limite de memória
      cpus: '0.5',             // Limite de CPU
      networkMode: 'none',     // Sem acesso à rede
      readOnly: true,          // Sistema de arquivos somente leitura
      noNewPrivileges: true,   // Sem novos privilégios
      user: 'playwright:playwright', // Usuário não-root
      timeout: 300000          // Timeout de 5 minutos
    };
    
    this.initDirectories();
    this.buildDockerImage();
  }

  async initDirectories() {
    try {
      await fs.ensureDir(this.tempDir);
      await fs.ensureDir(this.screenshotsDir);
      await fs.ensureDir(path.join(__dirname, 'logs'));
      await fs.ensureDir(path.join(__dirname, 'docker'));
      
      logger.info('Diretórios inicializados com sucesso');
    } catch (error) {
      logger.error('Erro ao criar diretórios:', error);
      throw error;
    }
  }

  async buildDockerImage() {
    try {
      // Verificar se a imagem já existe
      const imageExists = await this.checkDockerImage();
      if (imageExists) {
        logger.info('Imagem Docker já existe');
        return;
      }

      logger.info('Construindo imagem Docker do Playwright...');
      await this.createDockerfile();
      await this.buildImage();
      logger.info('Imagem Docker construída com sucesso');
    } catch (error) {
      logger.error('Erro ao construir imagem Docker:', error);
      throw error;
    }
  }

  async createDockerfile() {
    const dockerfilePath = path.join(__dirname, 'docker', 'Dockerfile');
    
    const dockerfileContent = `
# Imagem base oficial do Playwright
FROM mcr.microsoft.com/playwright:v1.40.0-focal

# Criar usuário não-root para segurança
RUN groupadd -r playwright && useradd -r -g playwright playwright

# Criar diretórios necessários
RUN mkdir -p /app/tests /app/screenshots /app/temp && \\
    chown -R playwright:playwright /app

# Instalar dependências de segurança
RUN apt-get update && apt-get install -y \\
    dumb-init \\
    && rm -rf /var/lib/apt/lists/*

# Configurar diretório de trabalho
WORKDIR /app

# Copiar package.json para instalação de dependências
COPY package.json ./
RUN npm install --only=production

# Configurar usuário não-root
USER playwright

# Configurar variáveis de ambiente
ENV NODE_ENV=production
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright

# Ponto de entrada seguro
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "runner.js"]
`;

    await fs.writeFile(dockerfilePath, dockerfileContent.trim());
    
    // Criar package.json para o contêiner
    const packageJsonPath = path.join(__dirname, 'docker', 'package.json');
    const packageJson = {
      name: "playwright-docker-runner",
      version: "1.0.0",
      dependencies: {
        "@playwright/test": "^1.40.0",
        "playwright": "^1.40.0"
      }
    };
    
    await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));
    
    // Criar runner.js
    await this.createDockerRunner();
  }

  async createDockerRunner() {
    const runnerPath = path.join(__dirname, 'docker', 'runner.js');
    
    const runnerContent = `
const { test } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

// Configurações de segurança
process.on('SIGTERM', () => {
  console.log('[DOCKER] Recebido SIGTERM, encerrando...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('[DOCKER] Recebido SIGINT, encerrando...');
  process.exit(0);
});

// Timeout global
setTimeout(() => {
  console.error('[DOCKER] Timeout atingido, encerrando execução');
  process.exit(1);
}, 300000); // 5 minutos

async function runTest() {
  try {
    const testFile = process.env.TEST_FILE;
    const executionId = process.env.EXECUTION_ID;
    
    if (!testFile || !executionId) {
      throw new Error('Variáveis de ambiente TEST_FILE e EXECUTION_ID são obrigatórias');
    }
    
    console.log(\`[DOCKER] Iniciando execução \${executionId}\`);
    console.log(\`[DOCKER] Arquivo de teste: \${testFile}\`);
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(testFile)) {
      throw new Error(\`Arquivo de teste não encontrado: \${testFile}\`);
    }
    
    // Executar o teste
    const { spawn } = require('child_process');
    
    const playwrightProcess = spawn('npx', [
      'playwright', 'test',
      testFile,
      '--reporter=line',
      '--output=/app/screenshots'
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        PLAYWRIGHT_BROWSERS_PATH: '/ms-playwright'
      }
    });
    
    playwrightProcess.stdout.on('data', (data) => {
      process.stdout.write(data);
    });
    
    playwrightProcess.stderr.on('data', (data) => {
      process.stderr.write(data);
    });
    
    playwrightProcess.on('close', (code) => {
      console.log(\`[DOCKER] Processo finalizado com código \${code}\`);
      process.exit(code);
    });
    
    playwrightProcess.on('error', (error) => {
      console.error(\`[DOCKER] Erro no processo: \${error.message}\`);
      process.exit(1);
    });
    
  } catch (error) {
    console.error(\`[DOCKER] Erro na execução: \${error.message}\`);
    process.exit(1);
  }
}

runTest();
`;

    await fs.writeFile(runnerPath, runnerContent.trim());
  }

  async buildImage() {
    return new Promise((resolve, reject) => {
      const dockerBuildProcess = spawn('docker', [
        'build',
        '-t', this.dockerImage,
        '-f', path.join(__dirname, 'docker', 'Dockerfile'),
        path.join(__dirname, 'docker')
      ], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      dockerBuildProcess.stdout.on('data', (data) => {
        output += data.toString();
        logger.info(`Docker build: ${data.toString().trim()}`);
      });

      dockerBuildProcess.stderr.on('data', (data) => {
        errorOutput += data.toString();
        logger.error(`Docker build error: ${data.toString().trim()}`);
      });

      dockerBuildProcess.on('close', (code) => {
        if (code === 0) {
          logger.info('Imagem Docker construída com sucesso');
          resolve();
        } else {
          logger.error(`Docker build falhou com código ${code}: ${errorOutput}`);
          reject(new Error(`Docker build failed: ${errorOutput}`));
        }
      });

      dockerBuildProcess.on('error', (error) => {
        logger.error('Erro ao executar docker build:', error);
        reject(error);
      });
    });
  }

  async checkDockerImage() {
    return new Promise((resolve) => {
      const dockerProcess = spawn('docker', ['images', '-q', this.dockerImage], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';

      dockerProcess.stdout.on('data', (data) => {
        output += data.toString();
      });

      dockerProcess.on('close', (code) => {
        resolve(code === 0 && output.trim().length > 0);
      });

      dockerProcess.on('error', () => {
        resolve(false);
      });
    });
  }

  async executeTest(testCode, executionId, config = {}) {
    try {
      // Verificar limite de execuções simultâneas
      if (this.activeExecutions >= this.maxConcurrentExecutions) {
        throw new Error('Limite de execuções simultâneas atingido');
      }

      this.activeExecutions++;
      logger.info(`Iniciando execução Docker ${executionId} (${this.activeExecutions}/${this.maxConcurrentExecutions})`);
      
      const execution = {
        id: executionId,
        status: 'running',
        startTime: new Date(),
        progress: 0,
        logs: [],
        screenshots: [],
        containerId: null,
        config: {
          timeout: this.securityConfig.timeout,
          headless: true,
          browser: 'chromium',
          screenshots: true,
          ...config
        }
      };

      this.executions.set(executionId, execution);
      this.sendUpdate(executionId, 'STATUS', { status: 'running', progress: 0 });

      // Criar arquivo de teste
      const testFile = await this.createTestFile(testCode, executionId, execution.config);
      
      // Executar em contêiner Docker
      await this.runDockerContainer(testFile, executionId, execution);

    } catch (error) {
      logger.error(`Erro na execução Docker ${executionId}:`, error);
      this.handleExecutionError(executionId, error);
    } finally {
      this.activeExecutions--;
    }
  }

  async createTestFile(testCode, executionId, config) {
    const testFileName = `test-${executionId}.spec.js`;
    const testFilePath = path.join(this.tempDir, testFileName);
    
    // Sanitizar código do usuário
    const sanitizedCode = this.sanitizeUserCode(testCode);
    
    const testTemplate = `
const { test, expect } = require('@playwright/test');

test.describe('Automated Test - ${executionId}', () => {
  test('Execute user script', async ({ page }) => {
    // Configurações de segurança
    test.setTimeout(${Math.min(config.timeout, this.securityConfig.timeout)});
    
    // Configurar página
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Log inicial
    console.log('[PLAYWRIGHT] Iniciando execução do script em contêiner isolado');
    
    try {
      // Código do usuário (sanitizado)
      ${sanitizedCode}
      
      console.log('[PLAYWRIGHT] Script executado com sucesso');
      
    } catch (error) {
      console.error('[PLAYWRIGHT] Erro na execução:', error.message);
      throw error;
    }
  });
});
`;

    await fs.writeFile(testFilePath, testTemplate);
    return testFilePath;
  }

  sanitizeUserCode(code) {
    // Remover comandos potencialmente perigosos
    const dangerousPatterns = [
      /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
      /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
      /require\s*\(\s*['"`]os['"`]\s*\)/gi,
      /require\s*\(\s*['"`]path['"`]\s*\)/gi,
      /process\./gi,
      /global\./gi,
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /setTimeout\s*\(/gi,
      /setInterval\s*\(/gi
    ];

    let sanitizedCode = code;
    
    dangerousPatterns.forEach(pattern => {
      sanitizedCode = sanitizedCode.replace(pattern, '// REMOVIDO POR SEGURANÇA');
    });

    return sanitizedCode;
  }

  async runDockerContainer(testFile, executionId, execution) {
    return new Promise((resolve, reject) => {
      const screenshotDir = path.join(this.screenshotsDir, executionId);
      fs.ensureDirSync(screenshotDir);

      // Argumentos do Docker com configurações de segurança
      const dockerArgs = [
        'run',
        '--rm',                                    // Remover contêiner após execução
        '--memory', this.securityConfig.memory,   // Limite de memória
        '--cpus', this.securityConfig.cpus,       // Limite de CPU
        '--network', this.securityConfig.networkMode, // Sem acesso à rede
        '--read-only',                            // Sistema de arquivos somente leitura
        '--tmpfs', '/tmp:rw,noexec,nosuid,size=100m', // Tmpfs limitado
        '--security-opt', 'no-new-privileges',    // Sem novos privilégios
        '--user', this.securityConfig.user,      // Usuário não-root
        '--cap-drop', 'ALL',                     // Remover todas as capabilities
        '--cap-add', 'SYS_ADMIN',                // Apenas para Playwright
        '--shm-size', '2gb',                     // Shared memory para Playwright
        '-v', `${testFile}:/app/tests/test.spec.js:ro`, // Montar arquivo de teste (somente leitura)
        '-v', `${screenshotDir}:/app/screenshots:rw`,   // Diretório de screenshots
        '-e', `TEST_FILE=/app/tests/test.spec.js`,
        '-e', `EXECUTION_ID=${executionId}`,
        '-e', `PLAYWRIGHT_BROWSERS_PATH=/ms-playwright`,
        this.dockerImage
      ];

      logger.info(`Executando contêiner Docker para ${executionId}`);
      
      const dockerProcess = spawn('docker', dockerArgs, {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let outputBuffer = '';
      let errorBuffer = '';

      // Armazenar ID do contêiner para possível cancelamento
      execution.process = dockerProcess;

      dockerProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        this.processDockerOutput(executionId, output);
      });

      dockerProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorBuffer += error;
        this.sendLog(executionId, 'error', error.trim());
      });

      dockerProcess.on('close', async (code) => {
        try {
          // Limpar arquivo temporário
          await fs.remove(testFile);
          
          if (code === 0) {
            await this.handleExecutionSuccess(executionId, outputBuffer);
            resolve();
          } else {
            await this.handleExecutionFailure(executionId, errorBuffer, code);
            reject(new Error(`Docker container exited with code ${code}`));
          }
        } catch (error) {
          logger.error(`Erro no cleanup da execução Docker ${executionId}:`, error);
          reject(error);
        }
      });

      dockerProcess.on('error', (error) => {
        logger.error(`Erro no processo Docker ${executionId}:`, error);
        this.handleExecutionError(executionId, error);
        reject(error);
      });

      // Timeout de segurança
      setTimeout(() => {
        if (dockerProcess && !dockerProcess.killed) {
          logger.warn(`Timeout atingido para execução ${executionId}, matando contêiner`);
          dockerProcess.kill('SIGKILL');
          this.handleExecutionError(executionId, new Error('Timeout de execução atingido'));
        }
      }, this.securityConfig.timeout);
    });
  }

  processDockerOutput(executionId, output) {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      // Detectar logs do Playwright
      if (line.includes('[PLAYWRIGHT]')) {
        const message = line.replace(/.*\[PLAYWRIGHT\]/, '').trim();
        this.sendLog(executionId, 'info', message);
        
        // Atualizar progresso
        if (message.includes('Iniciando')) {
          this.updateProgress(executionId, 10);
        } else if (message.includes('navegando') || message.includes('goto')) {
          this.updateProgress(executionId, 30);
        } else if (message.includes('clicando') || message.includes('click')) {
          this.updateProgress(executionId, 50);
        } else if (message.includes('preenchendo') || message.includes('fill')) {
          this.updateProgress(executionId, 70);
        } else if (message.includes('sucesso')) {
          this.updateProgress(executionId, 100);
        }
      }
      
      // Detectar logs do Docker
      if (line.includes('[DOCKER]')) {
        const message = line.replace(/.*\[DOCKER\]/, '').trim();
        this.sendLog(executionId, 'debug', `Docker: ${message}`);
      }
      
      // Detectar screenshots
      if (line.includes('screenshot')) {
        this.handleScreenshot(executionId, line);
      }
      
      // Logs gerais (filtrar ruído)
      if (line.trim() && 
          !line.includes('Running') && 
          !line.includes('✓') &&
          !line.includes('[DOCKER]') &&
          !line.includes('[PLAYWRIGHT]')) {
        this.sendLog(executionId, 'debug', line.trim());
      }
    });
  }

  handleScreenshot(executionId, logLine) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const screenshotName = `screenshot-${Date.now()}.png`;
    execution.screenshots.push(screenshotName);
    
    this.sendLog(executionId, 'info', `Screenshot capturado: ${screenshotName}`);
    this.sendUpdate(executionId, 'SCREENSHOT', { filename: screenshotName });
  }

  async handleExecutionSuccess(executionId, output) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.progress = 100;

    // Coletar screenshots
    await this.collectScreenshots(executionId);

    this.sendLog(executionId, 'info', `Execução Docker concluída em ${execution.duration}ms`);
    this.sendUpdate(executionId, 'COMPLETE', {
      status: 'completed',
      duration: execution.duration,
      screenshots: execution.screenshots
    });

    logger.info(`Execução Docker ${executionId} concluída com sucesso`);
  }

  async handleExecutionFailure(executionId, errorOutput, exitCode) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.error = errorOutput;

    this.sendLog(executionId, 'error', `Execução Docker falhou com código ${exitCode}`);
    this.sendUpdate(executionId, 'ERROR', {
      status: 'failed',
      error: errorOutput,
      exitCode
    });

    logger.error(`Execução Docker ${executionId} falhou:`, errorOutput);
  }

  handleExecutionError(executionId, error) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.error = error.message;

    this.sendLog(executionId, 'error', `Erro interno Docker: ${error.message}`);
    this.sendUpdate(executionId, 'ERROR', {
      status: 'failed',
      error: error.message
    });

    logger.error(`Erro na execução Docker ${executionId}:`, error);
  }

  async collectScreenshots(executionId) {
    try {
      const screenshotDir = path.join(this.screenshotsDir, executionId);
      const files = await fs.readdir(screenshotDir);
      
      const execution = this.executions.get(executionId);
      if (!execution) return;

      const screenshots = files.filter(file => 
        file.endsWith('.png') || file.endsWith('.jpg')
      );

      execution.screenshots = screenshots;
    } catch (error) {
      logger.error(`Erro ao coletar screenshots Docker para ${executionId}:`, error);
    }
  }

  cancelExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    try {
      if (execution.process) {
        // Matar processo Docker
        execution.process.kill('SIGKILL');
        
        // Tentar parar contêiner se ainda estiver rodando
        this.stopDockerContainer(executionId);
      }

      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;

      this.sendLog(executionId, 'warn', 'Execução Docker cancelada pelo usuário');
      this.sendUpdate(executionId, 'CANCELLED', {
        status: 'cancelled',
        duration: execution.duration
      });

      logger.info(`Execução Docker ${executionId} cancelada`);
      return true;
    } catch (error) {
      logger.error(`Erro ao cancelar execução Docker ${executionId}:`, error);
      return false;
    }
  }

  stopDockerContainer(executionId) {
    // Tentar parar contêineres relacionados a esta execução
    const dockerStopProcess = spawn('docker', [
      'ps', '-q', '--filter', `label=execution_id=${executionId}`
    ], { stdio: ['pipe', 'pipe', 'pipe'] });

    dockerStopProcess.stdout.on('data', (data) => {
      const containerIds = data.toString().trim().split('\n').filter(id => id);
      
      containerIds.forEach(containerId => {
        spawn('docker', ['kill', containerId], { stdio: 'ignore' });
        logger.info(`Contêiner Docker ${containerId} parado para execução ${executionId}`);
      });
    });
  }

  updateProgress(executionId, progress) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.progress = Math.max(execution.progress, progress);
    this.sendUpdate(executionId, 'PROGRESS', { progress });
  }

  sendLog(executionId, level, message) {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message
    };

    const execution = this.executions.get(executionId);
    if (execution) {
      execution.logs.push(log);
    }

    this.websocketManager.sendToExecution(executionId, {
      type: 'LOG',
      executionId,
      data: log,
      timestamp: new Date().toISOString()
    });
  }

  sendUpdate(executionId, type, data) {
    this.websocketManager.sendToExecution(executionId, {
      type,
      executionId,
      data,
      timestamp: new Date().toISOString()
    });
  }

  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  getAllExecutions() {
    return Array.from(this.executions.values());
  }

  getSystemStats() {
    return {
      activeExecutions: this.activeExecutions,
      maxConcurrentExecutions: this.maxConcurrentExecutions,
      totalExecutions: this.executions.size,
      securityConfig: this.securityConfig
    };
  }

  async cleanup() {
    try {
      // Parar todas as execuções ativas
      for (const [executionId, execution] of this.executions.entries()) {
        if (execution.status === 'running') {
          this.cancelExecution(executionId);
        }
      }

      // Limpar arquivos temporários
      await fs.emptyDir(this.tempDir);
      
      // Limpar contêineres órfãos
      await this.cleanupOrphanedContainers();
      
      logger.info('Cleanup Docker concluído');
    } catch (error) {
      logger.error('Erro no cleanup Docker:', error);
    }
  }

  async cleanupOrphanedContainers() {
    try {
      const dockerProcess = spawn('docker', [
        'ps', '-aq', '--filter', 'ancestor=' + this.dockerImage
      ], { stdio: ['pipe', 'pipe', 'pipe'] });

      dockerProcess.stdout.on('data', (data) => {
        const containerIds = data.toString().trim().split('\n').filter(id => id);
        
        containerIds.forEach(containerId => {
          spawn('docker', ['rm', '-f', containerId], { stdio: 'ignore' });
          logger.info(`Contêiner órfão removido: ${containerId}`);
        });
      });
    } catch (error) {
      logger.error('Erro ao limpar contêineres órfãos:', error);
    }
  }
}

module.exports = DockerExecutionEngine;