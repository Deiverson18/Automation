/**
 * Validador de Execução com Controles de Segurança Avançados
 * 
 * Implementa validação em tempo de execução e monitoramento de recursos
 * 
 * @author Playwright Hub Security Team
 * @version 2.0.0
 */

const winston = require('winston');
const { performance } = require('perf_hooks');

// Logger específico para validação de execução
const validationLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/execution-validation.log' }),
    new winston.transports.Console()
  ]
});

class ExecutionValidator {
  constructor() {
    this.activeExecutions = new Map();
    this.resourceLimits = {
      maxMemoryMB: 512,
      maxExecutionTimeMs: 300000, // 5 minutos
      maxCpuUsagePercent: 80,
      maxFileOperations: 100,
      maxNetworkRequests: 50
    };
    
    this.securityMetrics = {
      totalExecutions: 0,
      blockedExecutions: 0,
      timeoutExecutions: 0,
      memoryViolations: 0,
      cpuViolations: 0
    };
  }

  /**
   * Valida parâmetros de execução antes de iniciar
   */
  validateExecutionParameters(executionId, code, config = {}) {
    const validationId = this.generateValidationId();
    
    try {
      validationLogger.info('Validando parâmetros de execução', {
        validationId,
        executionId,
        codeLength: code.length,
        config
      });

      const errors = [];

      // Validar ID de execução
      if (!executionId || typeof executionId !== 'string') {
        errors.push('ID de execução inválido');
      }

      // Validar código
      if (!code || typeof code !== 'string') {
        errors.push('Código inválido ou vazio');
      }

      // Validar configurações
      const validatedConfig = this.validateConfig(config);
      if (!validatedConfig.isValid) {
        errors.push(...validatedConfig.errors);
      }

      // Verificar limites de recursos
      const resourceCheck = this.checkResourceAvailability();
      if (!resourceCheck.isValid) {
        errors.push(...resourceCheck.errors);
      }

      // Verificar se execução já existe
      if (this.activeExecutions.has(executionId)) {
        errors.push('Execução com este ID já está ativa');
      }

      const isValid = errors.length === 0;

      if (isValid) {
        // Registrar execução
        this.registerExecution(executionId, {
          startTime: Date.now(),
          config: validatedConfig.config,
          validationId,
          resourceUsage: {
            memory: 0,
            cpu: 0,
            fileOperations: 0,
            networkRequests: 0
          }
        });
      }

      validationLogger.info('Validação de parâmetros concluída', {
        validationId,
        executionId,
        isValid,
        errors
      });

      return {
        isValid,
        errors,
        validationId,
        config: validatedConfig.config
      };

    } catch (error) {
      validationLogger.error('Erro na validação de parâmetros', {
        validationId,
        executionId,
        error: error.message
      });

      return {
        isValid: false,
        errors: [`Erro interno na validação: ${error.message}`],
        validationId
      };
    }
  }

  /**
   * Valida configurações de execução
   */
  validateConfig(config) {
    const errors = [];
    const validatedConfig = {
      timeout: 30000,
      headless: true,
      browser: 'chromium',
      screenshots: true,
      maxMemory: 256,
      maxCpu: 50,
      ...config
    };

    // Validar timeout
    if (validatedConfig.timeout > this.resourceLimits.maxExecutionTimeMs) {
      errors.push(`Timeout excede máximo permitido de ${this.resourceLimits.maxExecutionTimeMs}ms`);
      validatedConfig.timeout = this.resourceLimits.maxExecutionTimeMs;
    }

    // Validar memória
    if (validatedConfig.maxMemory > this.resourceLimits.maxMemoryMB) {
      errors.push(`Limite de memória excede máximo de ${this.resourceLimits.maxMemoryMB}MB`);
      validatedConfig.maxMemory = this.resourceLimits.maxMemoryMB;
    }

    // Validar CPU
    if (validatedConfig.maxCpu > this.resourceLimits.maxCpuUsagePercent) {
      errors.push(`Limite de CPU excede máximo de ${this.resourceLimits.maxCpuUsagePercent}%`);
      validatedConfig.maxCpu = this.resourceLimits.maxCpuUsagePercent;
    }

    // Validar browser
    const allowedBrowsers = ['chromium', 'firefox', 'webkit'];
    if (!allowedBrowsers.includes(validatedConfig.browser)) {
      errors.push(`Browser não permitido: ${validatedConfig.browser}`);
      validatedConfig.browser = 'chromium';
    }

    return {
      isValid: errors.length === 0,
      errors,
      config: validatedConfig
    };
  }

  /**
   * Verifica disponibilidade de recursos do sistema
   */
  checkResourceAvailability() {
    const errors = [];

    try {
      // Verificar número de execuções ativas
      if (this.activeExecutions.size >= 5) {
        errors.push('Número máximo de execuções simultâneas atingido');
      }

      // Verificar uso de memória do processo
      const memoryUsage = process.memoryUsage();
      const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;
      
      if (memoryUsageMB > 1024) { // 1GB
        errors.push('Uso de memória do sistema muito alto');
      }

      // Verificar uptime do processo
      const uptimeHours = process.uptime() / 3600;
      if (uptimeHours > 24) {
        validationLogger.warn('Processo rodando há mais de 24 horas', {
          uptimeHours,
          memoryUsageMB
        });
      }

    } catch (error) {
      errors.push(`Erro ao verificar recursos: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Registra uma nova execução
   */
  registerExecution(executionId, executionData) {
    this.activeExecutions.set(executionId, {
      ...executionData,
      registeredAt: Date.now()
    });

    this.securityMetrics.totalExecutions++;

    validationLogger.info('Execução registrada', {
      executionId,
      totalActive: this.activeExecutions.size,
      totalExecutions: this.securityMetrics.totalExecutions
    });
  }

  /**
   * Monitora execução em tempo real
   */
  monitorExecution(executionId) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return { isValid: false, errors: ['Execução não encontrada'] };
    }

    const currentTime = Date.now();
    const executionTime = currentTime - execution.startTime;
    const errors = [];

    // Verificar timeout
    if (executionTime > execution.config.timeout) {
      errors.push('Timeout de execução atingido');
      this.securityMetrics.timeoutExecutions++;
    }

    // Verificar tempo máximo absoluto
    if (executionTime > this.resourceLimits.maxExecutionTimeMs) {
      errors.push('Tempo máximo absoluto de execução atingido');
    }

    // Atualizar métricas de uso
    execution.resourceUsage.executionTime = executionTime;
    execution.lastCheck = currentTime;

    if (errors.length > 0) {
      validationLogger.warn('Violações detectadas durante monitoramento', {
        executionId,
        errors,
        executionTime,
        resourceUsage: execution.resourceUsage
      });

      this.securityMetrics.blockedExecutions++;
    }

    return {
      isValid: errors.length === 0,
      errors,
      executionTime,
      resourceUsage: execution.resourceUsage
    };
  }

  /**
   * Finaliza execução e limpa recursos
   */
  finalizeExecution(executionId, result = {}) {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return { success: false, error: 'Execução não encontrada' };
    }

    const finalTime = Date.now();
    const totalDuration = finalTime - execution.startTime;

    // Registrar métricas finais
    const finalMetrics = {
      executionId,
      duration: totalDuration,
      resourceUsage: execution.resourceUsage,
      result: result.status || 'unknown',
      finalizedAt: finalTime
    };

    validationLogger.info('Execução finalizada', finalMetrics);

    // Remover da lista de execuções ativas
    this.activeExecutions.delete(executionId);

    return {
      success: true,
      metrics: finalMetrics,
      activeExecutions: this.activeExecutions.size
    };
  }

  /**
   * Cancela execução forçadamente
   */
  forceTerminateExecution(executionId, reason = 'Cancelamento forçado') {
    const execution = this.activeExecutions.get(executionId);
    if (!execution) {
      return { success: false, error: 'Execução não encontrada' };
    }

    validationLogger.warn('Execução terminada forçadamente', {
      executionId,
      reason,
      duration: Date.now() - execution.startTime,
      resourceUsage: execution.resourceUsage
    });

    this.activeExecutions.delete(executionId);
    this.securityMetrics.blockedExecutions++;

    return {
      success: true,
      reason,
      terminatedAt: Date.now()
    };
  }

  /**
   * Obtém estatísticas de segurança
   */
  getSecurityMetrics() {
    return {
      ...this.securityMetrics,
      activeExecutions: this.activeExecutions.size,
      resourceLimits: this.resourceLimits,
      systemInfo: {
        memoryUsage: process.memoryUsage(),
        uptime: process.uptime(),
        cpuUsage: process.cpuUsage()
      }
    };
  }

  /**
   * Valida resultado de execução
   */
  validateExecutionResult(executionId, result) {
    const errors = [];

    try {
      // Verificar se resultado é válido
      if (!result || typeof result !== 'object') {
        errors.push('Resultado de execução inválido');
      }

      // Verificar se contém dados sensíveis
      if (this.containsSensitiveData(result)) {
        errors.push('Resultado contém dados potencialmente sensíveis');
      }

      // Verificar tamanho do resultado
      const resultSize = JSON.stringify(result).length;
      if (resultSize > 1024 * 1024) { // 1MB
        errors.push('Resultado excede tamanho máximo permitido');
      }

    } catch (error) {
      errors.push(`Erro na validação do resultado: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      resultSize: JSON.stringify(result).length
    };
  }

  /**
   * Verifica se dados contêm informações sensíveis
   */
  containsSensitiveData(data) {
    const sensitivePatterns = [
      /password/gi,
      /token/gi,
      /secret/gi,
      /key/gi,
      /auth/gi,
      /credential/gi,
      /private/gi,
      /confidential/gi,
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, // Credit card
      /\b\d{3}-\d{2}-\d{4}\b/g, // SSN
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g // Email
    ];

    const dataString = JSON.stringify(data).toLowerCase();
    return sensitivePatterns.some(pattern => pattern.test(dataString));
  }

  /**
   * Limpa execuções antigas
   */
  cleanupOldExecutions() {
    const currentTime = Date.now();
    const maxAge = 60 * 60 * 1000; // 1 hora

    for (const [executionId, execution] of this.activeExecutions.entries()) {
      if (currentTime - execution.startTime > maxAge) {
        validationLogger.warn('Removendo execução antiga', {
          executionId,
          age: currentTime - execution.startTime
        });
        
        this.forceTerminateExecution(executionId, 'Execução muito antiga');
      }
    }
  }

  // === MÉTODOS AUXILIARES ===

  generateValidationId() {
    return `val_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Inicia monitoramento periódico
   */
  startPeriodicMonitoring() {
    setInterval(() => {
      this.cleanupOldExecutions();
      
      // Log de estatísticas periódicas
      if (this.activeExecutions.size > 0) {
        validationLogger.info('Status do sistema', this.getSecurityMetrics());
      }
    }, 60000); // A cada minuto
  }
}

module.exports = ExecutionValidator;