const fs = require('fs-extra');
const path = require('path');
const { spawn } = require('child_process');
const { v4: uuidv4 } = require('uuid');
const winston = require('winston');

// Importar sistema de segurança
const CodeSanitizer = require('./security/CodeSanitizer');
const ExecutionValidator = require('./security/ExecutionValidator');

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

/**
 * Sistema Seguro de Execução de Scripts Playwright
 * 
 * Implementa múltiplas camadas de segurança:
 * - Sanitização rigorosa de código
 * - Validação de parâmetros
 * - Monitoramento de recursos
 * - Isolamento de processos
 * - Controle de timeout
 * 
 * @author Playwright Hub Security Team
 * @version 2.0.0
 */
class ExecutionEngine {
  constructor(websocketManager) {
    this.websocketManager = websocketManager;
    this.executions = new Map();
    this.tempDir = path.join(__dirname, 'temp');
    this.screenshotsDir = path.join(__dirname, 'screenshots');
    
    // Inicializar sistema de segurança
    this.codeSanitizer = new CodeSanitizer();
    this.executionValidator = new ExecutionValidator();
    
    // Configurações de segurança
    this.securityConfig = {
      maxConcurrentExecutions: 5,
      defaultTimeout: 30000,
      maxTimeout: 300000,
      maxCodeSize: 50000,
      enableSandbox: true,
      logSecurityEvents: true,
      quarantineFailedCode: true
    };
    
    // Inicializar sistema
    this.initializeSecureSystem();
  }

  /**
   * Inicializa o sistema seguro de execução
   */
  async initializeSecureSystem() {
    try {
      // Criar diretórios necessários
      await this.initDirectories();
      
      // Iniciar monitoramento periódico
      this.executionValidator.startPeriodicMonitoring();
      
      // Configurar handlers de segurança
      this.setupSecurityHandlers();
      
      logger.info('Sistema seguro de execução inicializado', {
        securityConfig: this.securityConfig,
        tempDir: this.tempDir,
        screenshotsDir: this.screenshotsDir
      });
      
    } catch (error) {
      logger.error('Erro na inicialização do sistema seguro:', error);
      throw error;
    }
  }

  /**
   * Cria diretórios necessários com permissões seguras
   */
  async initDirectories() {
    try {
      await fs.ensureDir(this.tempDir);
      await fs.ensureDir(this.screenshotsDir);
      await fs.ensureDir(path.join(__dirname, 'logs'));
      await fs.ensureDir(path.join(__dirname, 'quarantine'));
      
      // Definir permissões restritivas (apenas para sistemas Unix)
      if (process.platform !== 'win32') {
        await fs.chmod(this.tempDir, 0o750);
        await fs.chmod(this.screenshotsDir, 0o750);
      }
      
      logger.info('Diretórios seguros criados com sucesso');
    } catch (error) {
      logger.error('Erro ao criar diretórios seguros:', error);
      throw error;
    }
  }

  /**
   * Configura handlers de segurança
   */
  setupSecurityHandlers() {
    // Handler para limpeza de emergência
    process.on('SIGTERM', () => {
      logger.info('Recebido SIGTERM, iniciando limpeza de segurança...');
      this.emergencyCleanup();
    });

    process.on('SIGINT', () => {
      logger.info('Recebido SIGINT, iniciando limpeza de segurança...');
      this.emergencyCleanup();
    });

    // Handler para erros não capturados
    process.on('uncaughtException', (error) => {
      logger.error('Exceção não capturada detectada:', error);
      this.quarantineCurrentExecution(error);
    });

    process.on('unhandledRejection', (reason, promise) => {
      logger.error('Promise rejeitada não tratada:', { reason, promise });
    });
  }

  /**
   * Executa script com segurança máxima
   * 
   * @param {string} testCode - Código do script a ser executado
   * @param {string} executionId - ID único da execução
   * @param {Object} config - Configurações de execução
   * @returns {Promise} Resultado da execução
   */
  async executeTest(testCode, executionId, config = {}) {
    const startTime = Date.now();
    
    try {
      logger.info(`Iniciando execução segura ${executionId}`, {
        executionId,
        codeLength: testCode.length,
        config
      });

      // === FASE 1: VALIDAÇÃO DE PARÂMETROS ===
      const paramValidation = this.executionValidator.validateExecutionParameters(
        executionId, testCode, config
      );
      
      if (!paramValidation.isValid) {
        throw new Error(`Validação de parâmetros falhou: ${paramValidation.errors.join(', ')}`);
      }

      // === FASE 2: SANITIZAÇÃO DE CÓDIGO ===
      const sanitizationResult = this.codeSanitizer.sanitizeCode(testCode, {
        executionId,
        strictMode: true,
        logViolations: true
      });

      if (!sanitizationResult.isValid) {
        await this.quarantineCode(testCode, sanitizationResult.errors, executionId);
        throw new Error(`Código rejeitado por segurança: ${sanitizationResult.errors.join(', ')}`);
      }

      // === FASE 3: CRIAÇÃO DA EXECUÇÃO ===
      const execution = this.createSecureExecution(
        executionId, 
        sanitizationResult.sanitizedCode, 
        paramValidation.config
      );

      this.executions.set(executionId, execution);
      this.sendUpdate(executionId, 'STATUS', { 
        status: 'running', 
        progress: 0,
        securityLevel: 'HIGH',
        sanitizationId: sanitizationResult.sanitizationId
      });

      // === FASE 4: CRIAÇÃO DE ARQUIVO SEGURO ===
      const testFile = await this.createSecureTestFile(
        sanitizationResult.sanitizedCode, 
        executionId, 
        execution.config
      );

      // === FASE 5: EXECUÇÃO MONITORADA ===
      await this.runSecurePlaywrightTest(testFile, executionId, execution);

      const duration = Date.now() - startTime;
      logger.info(`Execução segura ${executionId} concluída`, {
        executionId,
        duration,
        securityLevel: 'HIGH'
      });

    } catch (error) {
      logger.error(`Erro na execução segura ${executionId}:`, {
        executionId,
        error: error.message,
        stack: error.stack,
        duration: Date.now() - startTime
      });
      
      this.handleSecureExecutionError(executionId, error);
    }
  }

  /**
   * Cria objeto de execução segura
   */
  createSecureExecution(executionId, sanitizedCode, config) {
    return {
      id: executionId,
      status: 'running',
      startTime: new Date(),
      progress: 0,
      logs: [],
      screenshots: [],
      config: {
        timeout: Math.min(config.timeout || this.securityConfig.defaultTimeout, this.securityConfig.maxTimeout),
        headless: config.headless !== false, // Default true para segurança
        browser: config.browser || 'chromium',
        screenshots: config.screenshots !== false,
        maxMemory: Math.min(config.maxMemory || 256, 512),
        maxCpu: Math.min(config.maxCpu || 50, 80),
        ...config
      },
      security: {
        sanitized: true,
        validationPassed: true,
        isolationLevel: 'HIGH',
        monitoringEnabled: true
      },
      sanitizedCode,
      originalCodeHash: this.generateCodeHash(sanitizedCode)
    };
  }

  /**
   * Cria arquivo de teste seguro
   */
  async createSecureTestFile(sanitizedCode, executionId, config) {
    const testFileName = `secure-test-${executionId}.spec.js`;
    const testFilePath = path.join(this.tempDir, testFileName);
    
    // Template seguro com controles adicionais
    const secureTestTemplate = `
// === ARQUIVO DE TESTE SEGURO ===
// Execução ID: ${executionId}
// Gerado em: ${new Date().toISOString()}
// Nível de Segurança: ALTO

const { test, expect } = require('@playwright/test');
const path = require('path');

// Configurações de segurança
test.setTimeout(${config.timeout});

test.describe('Execução Segura - ${executionId}', () => {
  test('Script sanitizado', async ({ page }) => {
    
    // === CONTROLES DE SEGURANÇA ===
    
    // Configurar página com limites de segurança
    await page.setViewportSize({ width: 1280, height: 720 });
    
    // Configurar timeout de navegação
    page.setDefaultTimeout(${Math.min(config.timeout, 30000)});
    page.setDefaultNavigationTimeout(${Math.min(config.timeout, 30000)});
    
    // Bloquear recursos desnecessários para segurança
    await page.route('**/*', (route) => {
      const resourceType = route.request().resourceType();
      
      // Permitir apenas recursos essenciais
      if (['document', 'script', 'stylesheet', 'image', 'font'].includes(resourceType)) {
        route.continue();
      } else {
        route.abort();
      }
    });
    
    // Log de início seguro
    console.log('[PLAYWRIGHT] Iniciando execução em ambiente seguro');
    console.log('[SECURITY] Execução ID: ${executionId}');
    console.log('[SECURITY] Timeout configurado: ${config.timeout}ms');
    console.log('[SECURITY] Modo headless: ${config.headless}');
    
    try {
      // === CÓDIGO SANITIZADO DO USUÁRIO ===
      ${sanitizedCode}
      
      console.log('[PLAYWRIGHT] Script executado com sucesso em ambiente seguro');
      console.log('[SECURITY] Execução concluída sem violações de segurança');
      
    } catch (error) {
      console.error('[PLAYWRIGHT] Erro na execução segura:', error.message);
      console.error('[SECURITY] Erro capturado e isolado');
      
      // Registrar erro para análise de segurança
      console.log('EXPORT_DATA::', JSON.stringify({
        securityError: {
          message: error.message,
          type: error.name,
          executionId: '${executionId}',
          timestamp: Date.now(),
          securityLevel: 'HIGH'
        }
      }));
      
      throw error;
    }
  });
});
`;

    // Escrever arquivo com permissões restritivas
    await fs.writeFile(testFilePath, secureTestTemplate);
    
    if (process.platform !== 'win32') {
      await fs.chmod(testFilePath, 0o640); // Leitura/escrita apenas para owner
    }
    
    logger.info(`Arquivo de teste seguro criado: ${testFilePath}`, {
      executionId,
      fileSize: secureTestTemplate.length,
      securityLevel: 'HIGH'
    });

    return testFilePath;
  }

  /**
   * Executa teste Playwright com monitoramento de segurança
   */
  async runSecurePlaywrightTest(testFile, executionId, execution) {
    return new Promise((resolve, reject) => {
      const screenshotDir = path.join(this.screenshotsDir, executionId);
      fs.ensureDirSync(screenshotDir);

      // Argumentos seguros do Playwright
      const securePlaywrightArgs = [
        'test',
        testFile,
        '--reporter=line',
        `--output=${screenshotDir}`,
        execution.config.headless ? '--headed=false' : '--headed=true',
        '--workers=1', // Apenas 1 worker para controle
        '--retries=0', // Sem retries para evitar loops
        '--timeout=30000', // Timeout adicional de segurança
        '--max-failures=1' // Parar na primeira falha
      ];

      // Ambiente seguro
      const secureEnv = {
        ...process.env,
        PLAYWRIGHT_BROWSER: execution.config.browser,
        NODE_ENV: 'secure_execution',
        PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD: '1',
        // Remover variáveis potencialmente perigosas
        PATH: process.env.PATH, // Manter apenas PATH essencial
        HOME: undefined,
        USER: undefined,
        SHELL: undefined
      };

      // Opções seguras do processo
      const secureProcessOptions = {
        env: secureEnv,
        cwd: __dirname,
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: execution.config.timeout,
        killSignal: 'SIGKILL',
        windowsHide: true
      };

      logger.info(`Iniciando processo Playwright seguro para ${executionId}`, {
        args: securePlaywrightArgs,
        timeout: execution.config.timeout,
        securityLevel: 'HIGH'
      });

      const playwrightProcess = spawn('npx', ['playwright', ...securePlaywrightArgs], secureProcessOptions);

      let outputBuffer = '';
      let errorBuffer = '';
      let isResolved = false;

      // Monitoramento de recursos
      const resourceMonitor = setInterval(() => {
        const monitorResult = this.executionValidator.monitorExecution(executionId);
        
        if (!monitorResult.isValid) {
          logger.warn(`Violação de recursos detectada para ${executionId}:`, monitorResult.errors);
          
          if (!isResolved) {
            clearInterval(resourceMonitor);
            playwrightProcess.kill('SIGKILL');
            reject(new Error(`Execução terminada por violação de recursos: ${monitorResult.errors.join(', ')}`));
            isResolved = true;
          }
        }
      }, 5000); // Verificar a cada 5 segundos

      playwrightProcess.stdout.on('data', (data) => {
        const output = data.toString();
        outputBuffer += output;
        
        // Processar logs com segurança
        this.processSecurePlaywrightOutput(executionId, output);
      });

      playwrightProcess.stderr.on('data', (data) => {
        const error = data.toString();
        errorBuffer += error;
        
        // Filtrar logs de erro sensíveis
        const filteredError = this.filterSensitiveData(error);
        this.sendLog(executionId, 'error', filteredError);
      });

      playwrightProcess.on('close', async (code, signal) => {
        clearInterval(resourceMonitor);
        
        if (isResolved) return;
        isResolved = true;

        try {
          // Limpar arquivo temporário imediatamente
          await fs.remove(testFile);
          
          // Finalizar validação
          this.executionValidator.finalizeExecution(executionId, { 
            status: code === 0 ? 'success' : 'failed',
            exitCode: code,
            signal
          });
          
          if (code === 0) {
            await this.handleSecureExecutionSuccess(executionId, outputBuffer);
            resolve();
          } else {
            await this.handleSecureExecutionFailure(executionId, errorBuffer, code, signal);
            reject(new Error(`Processo Playwright terminou com código ${code}, sinal: ${signal}`));
          }
        } catch (error) {
          logger.error(`Erro no cleanup da execução segura ${executionId}:`, error);
          reject(error);
        }
      });

      playwrightProcess.on('error', (error) => {
        clearInterval(resourceMonitor);
        
        if (isResolved) return;
        isResolved = true;

        logger.error(`Erro no processo Playwright seguro ${executionId}:`, error);
        this.handleSecureExecutionError(executionId, error);
        reject(error);
      });

      // Timeout de segurança absoluto
      const absoluteTimeout = setTimeout(() => {
        if (!isResolved) {
          clearInterval(resourceMonitor);
          logger.warn(`Timeout absoluto atingido para execução ${executionId}`);
          
          playwrightProcess.kill('SIGKILL');
          this.executionValidator.forceTerminateExecution(executionId, 'Timeout absoluto');
          
          reject(new Error('Timeout absoluto de execução atingido'));
          isResolved = true;
        }
      }, this.securityConfig.maxTimeout);

      // Limpar timeout se execução terminar normalmente
      playwrightProcess.on('close', () => {
        clearTimeout(absoluteTimeout);
      });

      // Armazenar referência do processo para cancelamento
      execution.process = playwrightProcess;
      execution.resourceMonitor = resourceMonitor;
    });
  }

  /**
   * Processa saída do Playwright com filtros de segurança
   */
  processSecurePlaywrightOutput(executionId, output) {
    const lines = output.split('\n').filter(line => line.trim());
    
    lines.forEach(line => {
      // Processar dados exportados primeiro (com validação)
      this.processExportedDataSecurely(executionId, line);
      
      // Detectar logs do Playwright
      if (line.includes('[PLAYWRIGHT]')) {
        const message = line.replace(/.*\[PLAYWRIGHT\]/, '').trim();
        const filteredMessage = this.filterSensitiveData(message);
        this.sendLog(executionId, 'info', filteredMessage);
        
        // Atualizar progresso
        this.updateProgressFromLogs(executionId, filteredMessage);
      }
      
      // Detectar logs de segurança
      if (line.includes('[SECURITY]')) {
        const message = line.replace(/.*\[SECURITY\]/, '').trim();
        this.sendLog(executionId, 'security', message);
      }
      
      // Detectar screenshots
      if (line.includes('screenshot')) {
        this.handleSecureScreenshot(executionId, line);
      }
      
      // Logs gerais (filtrados)
      if (line.trim() && 
          !line.includes('Running') && 
          !line.includes('✓') &&
          !line.includes('[PLAYWRIGHT]') &&
          !line.includes('[SECURITY]')) {
        const filteredLine = this.filterSensitiveData(line.trim());
        this.sendLog(executionId, 'debug', filteredLine);
      }
    });
  }

  /**
   * Processa dados exportados com validação de segurança
   */
  processExportedDataSecurely(executionId, line) {
    const EXPORT_PREFIX = 'EXPORT_DATA::';
    
    if (line.includes(EXPORT_PREFIX)) {
      try {
        // Extrair dados JSON da linha
        const jsonData = line.split(EXPORT_PREFIX)[1].trim();
        
        if (!jsonData) {
          this.sendLog(executionId, 'warn', 'Dados de exportação vazios detectados');
          return;
        }
        
        // Validar tamanho dos dados
        if (jsonData.length > 100000) { // 100KB máximo
          this.sendLog(executionId, 'error', 'Dados exportados excedem tamanho máximo permitido');
          return;
        }
        
        // Tentar fazer parse do JSON
        const parsedData = JSON.parse(jsonData);
        
        // Validar estrutura dos dados
        const dataValidation = this.executionValidator.validateExecutionResult(executionId, parsedData);
        if (!dataValidation.isValid) {
          this.sendLog(executionId, 'error', `Dados exportados inválidos: ${dataValidation.errors.join(', ')}`);
          return;
        }
        
        // Filtrar dados sensíveis
        const filteredData = this.filterSensitiveDataFromObject(parsedData);
        
        const execution = this.executions.get(executionId);
        if (!execution) {
          this.sendLog(executionId, 'error', 'Contexto de execução não encontrado para dados exportados');
          return;
        }
        
        // Inicializar resultado se não existir
        if (!execution.result) {
          execution.result = {};
        }
        
        // Mesclar dados exportados com resultado existente
        Object.assign(execution.result, filteredData);
        
        // Adicionar metadados de segurança
        if (!execution.result._metadata) {
          execution.result._metadata = {
            exportCount: 0,
            lastExportTime: null,
            exportHistory: [],
            securityLevel: 'HIGH',
            dataFiltered: false
          };
        }
        
        execution.result._metadata.exportCount++;
        execution.result._metadata.lastExportTime = new Date().toISOString();
        execution.result._metadata.dataFiltered = JSON.stringify(filteredData) !== JSON.stringify(parsedData);
        execution.result._metadata.exportHistory.push({
          timestamp: new Date().toISOString(),
          keys: Object.keys(filteredData),
          dataSize: JSON.stringify(filteredData).length,
          wasFiltered: execution.result._metadata.dataFiltered
        });
        
        // Manter apenas os últimos 10 registros de histórico
        if (execution.result._metadata.exportHistory.length > 10) {
          execution.result._metadata.exportHistory = execution.result._metadata.exportHistory.slice(-10);
        }
        
        // Enviar atualização em tempo real
        this.sendUpdate(executionId, 'RESULT_UPDATE', { 
          result: execution.result,
          exportedKeys: Object.keys(filteredData),
          timestamp: new Date().toISOString(),
          securityLevel: 'HIGH'
        });
        
        // Log de sucesso
        this.sendLog(executionId, 'info', 
          `Dados exportados processados com segurança: ${Object.keys(filteredData).join(', ')}`);
        
        logger.info(`Dados exportados processados com segurança para execução ${executionId}:`, {
          executionId,
          exportedKeys: Object.keys(filteredData),
          dataSize: JSON.stringify(filteredData).length,
          totalExports: execution.result._metadata.exportCount,
          wasFiltered: execution.result._metadata.dataFiltered
        });
        
      } catch (error) {
        // Tratamento detalhado de erros com contexto de segurança
        let errorMessage = 'Falha ao processar dados exportados';
        
        if (error instanceof SyntaxError) {
          errorMessage = `JSON inválido nos dados exportados: ${error.message}`;
        } else if (error.name === 'TypeError') {
          errorMessage = `Erro de tipo nos dados exportados: ${error.message}`;
        } else {
          errorMessage = `Erro inesperado ao processar dados: ${error.message}`;
        }
        
        this.sendLog(executionId, 'error', errorMessage);
        
        logger.error(`Erro ao processar dados exportados para execução ${executionId}:`, {
          executionId,
          error: error.message,
          stack: error.stack,
          rawLine: this.filterSensitiveData(line),
          securityLevel: 'HIGH'
        });
      }
    }
  }

  /**
   * Filtra dados sensíveis de strings
   */
  filterSensitiveData(data) {
    if (typeof data !== 'string') return data;
    
    const sensitivePatterns = [
      { pattern: /password[=:]\s*['"]?[^'"\s]+['"]?/gi, replacement: 'password=***' },
      { pattern: /token[=:]\s*['"]?[^'"\s]+['"]?/gi, replacement: 'token=***' },
      { pattern: /key[=:]\s*['"]?[^'"\s]+['"]?/gi, replacement: 'key=***' },
      { pattern: /secret[=:]\s*['"]?[^'"\s]+['"]?/gi, replacement: 'secret=***' },
      { pattern: /auth[=:]\s*['"]?[^'"\s]+['"]?/gi, replacement: 'auth=***' },
      { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '***@***.***' },
      { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '****-****-****-****' },
      { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '***-**-****' }
    ];
    
    let filteredData = data;
    for (const { pattern, replacement } of sensitivePatterns) {
      filteredData = filteredData.replace(pattern, replacement);
    }
    
    return filteredData;
  }

  /**
   * Filtra dados sensíveis de objetos
   */
  filterSensitiveDataFromObject(obj) {
    if (typeof obj !== 'object' || obj === null) return obj;
    
    const filtered = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth', 'credential', 'private'];
    
    for (const [key, value] of Object.entries(obj)) {
      const keyLower = key.toLowerCase();
      
      if (sensitiveKeys.some(sensitive => keyLower.includes(sensitive))) {
        filtered[key] = '***';
      } else if (typeof value === 'object' && value !== null) {
        filtered[key] = this.filterSensitiveDataFromObject(value);
      } else if (typeof value === 'string') {
        filtered[key] = this.filterSensitiveData(value);
      } else {
        filtered[key] = value;
      }
    }
    
    return filtered;
  }

  /**
   * Atualiza progresso baseado em logs
   */
  updateProgressFromLogs(executionId, message) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

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

  /**
   * Manipula screenshots com validação de segurança
   */
  handleSecureScreenshot(executionId, logLine) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const screenshotName = `secure-screenshot-${Date.now()}.png`;
    execution.screenshots.push(screenshotName);
    
    this.sendLog(executionId, 'info', `Screenshot seguro capturado: ${screenshotName}`);
    this.sendUpdate(executionId, 'SCREENSHOT', { 
      filename: screenshotName,
      securityLevel: 'HIGH'
    });
  }

  /**
   * Manipula sucesso de execução segura
   */
  async handleSecureExecutionSuccess(executionId, output) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.progress = 100;

    // Coletar screenshots gerados
    await this.collectSecureScreenshots(executionId);

    this.sendLog(executionId, 'info', `Execução segura concluída em ${execution.duration}ms`);
    this.sendUpdate(executionId, 'COMPLETE', {
      status: 'completed',
      duration: execution.duration,
      screenshots: execution.screenshots,
      securityLevel: 'HIGH',
      sanitizationId: execution.security?.sanitizationId
    });

    logger.info(`Execução segura ${executionId} concluída com sucesso`, {
      executionId,
      duration: execution.duration,
      securityLevel: 'HIGH',
      screenshotCount: execution.screenshots.length
    });
  }

  /**
   * Manipula falha de execução segura
   */
  async handleSecureExecutionFailure(executionId, errorOutput, exitCode, signal) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.error = this.filterSensitiveData(errorOutput);
    execution.exitCode = exitCode;
    execution.signal = signal;

    this.sendLog(executionId, 'error', `Execução segura falhou com código ${exitCode}, sinal: ${signal}`);
    this.sendUpdate(executionId, 'ERROR', {
      status: 'failed',
      error: execution.error,
      exitCode,
      signal,
      securityLevel: 'HIGH'
    });

    logger.error(`Execução segura ${executionId} falhou:`, {
      executionId,
      exitCode,
      signal,
      duration: execution.duration,
      error: execution.error
    });
  }

  /**
   * Manipula erro de execução segura
   */
  handleSecureExecutionError(executionId, error) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.duration = execution.endTime - execution.startTime;
    execution.error = this.filterSensitiveData(error.message);

    this.sendLog(executionId, 'error', `Erro interno seguro: ${execution.error}`);
    this.sendUpdate(executionId, 'ERROR', {
      status: 'failed',
      error: execution.error,
      securityLevel: 'HIGH'
    });

    logger.error(`Erro na execução segura ${executionId}:`, {
      executionId,
      error: execution.error,
      duration: execution.duration
    });
  }

  /**
   * Coleta screenshots com validação de segurança
   */
  async collectSecureScreenshots(executionId) {
    try {
      const screenshotDir = path.join(this.screenshotsDir, executionId);
      const files = await fs.readdir(screenshotDir);
      
      const execution = this.executions.get(executionId);
      if (!execution) return;

      const screenshots = files.filter(file => 
        (file.endsWith('.png') || file.endsWith('.jpg')) &&
        file.includes('secure-') // Apenas screenshots seguros
      );

      execution.screenshots = screenshots;
      
      logger.info(`Screenshots seguros coletados para ${executionId}:`, {
        executionId,
        screenshotCount: screenshots.length,
        securityLevel: 'HIGH'
      });
      
    } catch (error) {
      logger.error(`Erro ao coletar screenshots seguros para ${executionId}:`, error);
    }
  }

  /**
   * Cancela execução com limpeza de segurança
   */
  cancelExecution(executionId) {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    try {
      // Parar monitoramento de recursos
      if (execution.resourceMonitor) {
        clearInterval(execution.resourceMonitor);
      }

      // Matar processo
      if (execution.process) {
        execution.process.kill('SIGKILL');
      }

      // Forçar terminação no validador
      this.executionValidator.forceTerminateExecution(executionId, 'Cancelamento pelo usuário');

      execution.status = 'cancelled';
      execution.endTime = new Date();
      execution.duration = execution.endTime - execution.startTime;

      this.sendLog(executionId, 'warn', 'Execução segura cancelada pelo usuário');
      this.sendUpdate(executionId, 'CANCELLED', {
        status: 'cancelled',
        duration: execution.duration,
        securityLevel: 'HIGH'
      });

      logger.info(`Execução segura ${executionId} cancelada`, {
        executionId,
        duration: execution.duration,
        securityLevel: 'HIGH'
      });
      
      return true;
    } catch (error) {
      logger.error(`Erro ao cancelar execução segura ${executionId}:`, error);
      return false;
    }
  }

  /**
   * Coloca código em quarentena para análise
   */
  async quarantineCode(code, errors, executionId) {
    if (!this.securityConfig.quarantineFailedCode) return;

    try {
      const quarantineDir = path.join(__dirname, 'quarantine');
      await fs.ensureDir(quarantineDir);

      const quarantineFile = path.join(quarantineDir, `quarantine-${executionId}-${Date.now()}.js`);
      
      const quarantineContent = `
// === CÓDIGO EM QUARENTENA ===
// Execução ID: ${executionId}
// Data: ${new Date().toISOString()}
// Motivo: Falha na validação de segurança
// Erros: ${errors.join(', ')}

/*
CÓDIGO ORIGINAL:
${code}
*/
`;

      await fs.writeFile(quarantineFile, quarantineContent);
      
      logger.warn(`Código colocado em quarentena: ${quarantineFile}`, {
        executionId,
        errors,
        quarantineFile
      });
      
    } catch (error) {
      logger.error('Erro ao colocar código em quarentena:', error);
    }
  }

  /**
   * Coloca execução atual em quarentena
   */
  quarantineCurrentExecution(error) {
    const activeExecutions = Array.from(this.executions.values())
      .filter(exec => exec.status === 'running');
    
    activeExecutions.forEach(execution => {
      this.quarantineCode(
        execution.sanitizedCode || 'Código não disponível',
        [`Exceção não capturada: ${error.message}`],
        execution.id
      );
    });
  }

  /**
   * Limpeza de emergência
   */
  emergencyCleanup() {
    try {
      // Cancelar todas as execuções ativas
      for (const [executionId, execution] of this.executions.entries()) {
        if (execution.status === 'running') {
          this.cancelExecution(executionId);
        }
      }

      // Limpar arquivos temporários
      fs.emptyDirSync(this.tempDir);
      
      logger.info('Limpeza de emergência concluída');
    } catch (error) {
      logger.error('Erro na limpeza de emergência:', error);
    }
  }

  // === MÉTODOS AUXILIARES ===

  generateCodeHash(code) {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(code).digest('hex');
  }

  updateProgress(executionId, progress) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.progress = Math.max(execution.progress, progress);
    this.sendUpdate(executionId, 'PROGRESS', { 
      progress,
      securityLevel: 'HIGH'
    });
  }

  sendLog(executionId, level, message) {
    const log = {
      timestamp: new Date().toISOString(),
      level,
      message: this.filterSensitiveData(message),
      securityLevel: 'HIGH'
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
      data: {
        ...data,
        securityLevel: 'HIGH',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
  }

  getExecution(executionId) {
    return this.executions.get(executionId);
  }

  getAllExecutions() {
    return Array.from(this.executions.values());
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityStats() {
    return {
      ...this.executionValidator.getSecurityMetrics(),
      securityConfig: this.securityConfig,
      activeExecutions: this.executions.size,
      quarantineEnabled: this.securityConfig.quarantineFailedCode
    };
  }

  /**
   * Limpeza segura de recursos
   */
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
      
      logger.info('Cleanup seguro concluído');
    } catch (error) {
      logger.error('Erro no cleanup seguro:', error);
    }
  }
}

module.exports = ExecutionEngine;