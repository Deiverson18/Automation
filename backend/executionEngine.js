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
    new winston.transports.File({ filename: 'logs/execution.log' }),
    new winston.transports.Console()
  ]
});

class ExecutionEngine {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.executions = new Map();
    this.tempDir = path.join(__dirname, 'temp');
    this.screenshotsDir = path.join(__dirname, 'screenshots');
    
    // Criar diretórios necessários
    this.initDirectories();
  }

  async initDirectories() {
    try {
      await fs.ensureDir(this.tempDir);
      await fs.ensureDir(this.screenshotsDir);
      await fs.ensureDir(path.join(__dirname, 'logs'));
    } catch (error) {
      logger.error('Erro ao criar diretórios:', error);
    }
  }

  async executeTest(testCode, executionId, config = {}) {
    try {
      logger.info(`Iniciando execução ${executionId}`);
      
      const execution = {
        id: executionId,
        status: 'running',
        startTime: new Date(),
        progress: 0,
        logs: [],
        screenshots: [],
        config: {
          timeout: 30000,
          headless: true,
          browser: 'chromium',
          screenshots: true,
          ...config
        }
      };

      this.executions.set(executionId, execution);
      this.sendUpdate(executionId, 'STATUS', { status: 'running', progress: 0 });

      // Criar arquivo de teste temporário
      const testFile = await this.createTestFile(testCode, executionId, execution.config);
      
      // Executar Playwright
      await this.runPlaywrightTest(testFile, executionId, execution);

    } catch (error) {
      logger.error(`Erro na execução ${executionId}:`, error);
      this.handleExecutionError(executionId, error);
    }
  }

  async createTestFile(testCode, executionId, config) {
    const testFileName = `test-${executionId}.spec.js`;
    const testFilePath = path.join(this.tempDir, testFileName);
    
    // Template do teste Playwright
    const testTemplate = `
const { test, expect } = require('@playwright/test');
const path = require('path');

test.describe('Automated Test - ${executionId}', () => {
  test('Execute user script', async ({ page }) => {
    // Configurar timeout
    test.setTimeout(${config.timeout});
    
    // Configurar screenshots
    if (${config.screenshots}) {
      await page.setViewportSize({ width: 1280, height: 720 });
    }
    
    // Log inicial
    console.log('[PLAYWRIGHT] Iniciando execução do script');
    
    try {
      // Código do usuário
      ${testCode}
      
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

  async runPlaywrightTest(testFile, executionId, execution) {
    return new Promise((resolve, reject) => {
      const screenshotDir = path.join(this.screenshotsDir, executionId);
      fs.ensureDirSync(screenshotDir);

      const playwrightArgs = [
        'test',
        testFile,
        '--reporter=line',
        `--output=${screenshotDir}`,
        execution.config.headless ? '--headed=false' : '--headed=true'
      ];

      // Configurar browser
      const env = {
        ...process.env,
        PLAYWRIGHT_BROWSER: execution.config.browser
      };

      const playwrightProcess = spawn('npx', ['playwright', ...playwrightArgs], {
        env,
        cwd: __dirname
      });

      let outputBuffer = '';
      let errorBuffer = '';

      playwrightProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        // Processar logs em tempo real
        this.processPlaywrightOutput(executionId, output);
      });

      playwrightProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorBuffer += error;
        
        // Enviar logs de erro
        this.sendLog(executionId, 'error', error.trim());
      });

      playwrightProcess.on('close', async (code) => {
        try {
          // Limpar arquivo temporário
          await fs.remove(testFile);
          
          if (code === 0) {
            await this.handleExecutionSuccess(executionId, outputBuffer);
            resolve();
          } else {
            await this.handleExecutionFailure(executionId, errorBuffer, code);
            reject(new Error(`Playwright exited with code ${code}`));
          }
        } catch (error) {
          logger.error(`Erro no cleanup da execução ${executionId}:`, error);
          reject(error);
        }
      });

      playwrightProcess.on('error', (error) => {
        logger.error(`Erro no processo Playwright ${executionId}:`, error);
        this.handleExecutionError(executionId, error);
        reject(error);
      });

      // Armazenar referência do processo para cancelamento
      execution.process = playwrightProcess;
    });
  }

  processPlaywrightOutput(executionId, output) {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      // Detectar progresso baseado em logs
      if (line.includes('[PLAYWRIGHT]')) {
        const message = line.replace(/.*\[PLAYWRIGHT\]/, '').trim();
        this.sendLog(executionId, 'info', message);
        
        // Atualizar progresso baseado em marcos
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
      
      // Detectar screenshots
      if (line.includes('screenshot')) {
        this.handleScreenshot(executionId, line);
      }
      
      // Logs gerais
      if (line.trim() && !line.includes('Running') && !line.includes('✓')) {
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

    // Coletar screenshots gerados
    await this.collectScreenshots(executionId);

    this.sendLog(executionId, 'info', `Execução concluída em ${execution.duration}ms`);
    this.sendUpdate(executionId, 'COMPLETE', {
      status: 'completed',
      duration: execution.duration,
      screenshots: execution.screenshots
    });

    logger.info(`Execução ${executionId} concluída com sucesso`);
  }

  async handleExecutionFailure(executionId, errorOutput, exitCode) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.error = errorOutput;

    this.sendLog(executionId, 'error', `Execução falhou com código ${exitCode}`);
    this.sendUpdate(executionId, 'ERROR', {
      status: 'failed',
      error: errorOutput,
      exitCode
    });

    logger.error(`Execução ${executionId} falhou:`, errorOutput);
  }

  handleExecutionError(executionId, error) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.error = error.message;

    this.sendLog(executionId, 'error', `Erro interno: ${error.message}`);
    this.sendUpdate(executionId, 'ERROR', {
      status: 'failed',
      error: error.message
    });

    logger.error(`Erro na execução ${executionId}:`, error);
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
      logger.error(`Erro ao coletar screenshots para ${executionId}:`, error);
    }
  }

  cancelExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    try {
      if (execution.process) {
        execution.process.kill('SIGTERM');
      }

      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;

      this.sendLog(executionId, 'warn', 'Execução cancelada pelo usuário');
      this.sendUpdate(executionId, 'CANCELLED', {
        status: 'cancelled',
        duration: execution.duration
      });

      logger.info(`Execução ${executionId} cancelada`);
      return true;
    } catch (error) {
      logger.error(`Erro ao cancelar execução ${executionId}:`, error);
      return false;
    }
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

  async cleanup() {
    try {
      // Limpar arquivos temporários
      await fs.emptyDir(this.tempDir);
      logger.info('Cleanup de arquivos temporários concluído');
    } catch (error) {
      logger.error('Erro no cleanup:', error);
    }
  }
}

module.exports = ExecutionEngine;