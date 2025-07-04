/**
 * Gerenciador de Banco de Dados SQLite com Prisma ORM
 * 
 * Implementa operações CRUD seguras e otimizadas para todos os modelos
 * 
 * @author Playwright Hub Database Team
 * @version 1.0.0
 */

const { PrismaClient } = require('@prisma/client');
const winston = require('winston');

// Logger específico para operações de banco
const dbLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/database.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class DatabaseManager {
  constructor() {
    this.prisma = new PrismaClient({
      log: [
        { level: 'query', emit: 'event' },
        { level: 'error', emit: 'event' },
        { level: 'info', emit: 'event' },
        { level: 'warn', emit: 'event' },
      ],
    });

    // Configurar logging do Prisma
    this.setupPrismaLogging();
    
    // Configurar handlers de erro
    this.setupErrorHandlers();
  }

  /**
   * Configura logging do Prisma
   */
  setupPrismaLogging() {
    this.prisma.$on('query', (e) => {
      dbLogger.debug('Database Query', {
        query: e.query,
        params: e.params,
        duration: e.duration,
        timestamp: e.timestamp
      });
    });

    this.prisma.$on('error', (e) => {
      dbLogger.error('Database Error', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });

    this.prisma.$on('info', (e) => {
      dbLogger.info('Database Info', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });

    this.prisma.$on('warn', (e) => {
      dbLogger.warn('Database Warning', {
        message: e.message,
        target: e.target,
        timestamp: e.timestamp
      });
    });
  }

  /**
   * Configura handlers de erro
   */
  setupErrorHandlers() {
    process.on('beforeExit', async () => {
      await this.disconnect();
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Inicializa conexão com o banco de dados
   */
  async connect() {
    try {
      await this.prisma.$connect();
      dbLogger.info('Conexão com banco de dados estabelecida');
      
      // Verificar se o banco está funcionando
      await this.healthCheck();
      
      return true;
    } catch (error) {
      dbLogger.error('Erro ao conectar com banco de dados:', error);
      throw error;
    }
  }

  /**
   * Desconecta do banco de dados
   */
  async disconnect() {
    try {
      await this.prisma.$disconnect();
      dbLogger.info('Conexão com banco de dados encerrada');
    } catch (error) {
      dbLogger.error('Erro ao desconectar do banco de dados:', error);
    }
  }

  /**
   * Verifica saúde do banco de dados
   */
  async healthCheck() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'healthy', timestamp: new Date().toISOString() };
    } catch (error) {
      dbLogger.error('Health check falhou:', error);
      return { status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() };
    }
  }

  // === OPERAÇÕES DE SCRIPTS ===

  /**
   * Cria um novo script
   */
  async createScript(scriptData) {
    try {
      const script = await this.prisma.script.create({
        data: {
          name: scriptData.name,
          description: scriptData.description || null,
          code: scriptData.code,
          parameters: JSON.stringify(scriptData.parameters || {}),
          tags: JSON.stringify(scriptData.tags || []),
          status: scriptData.status || 'draft'
        }
      });

      dbLogger.info('Script criado', { scriptId: script.id, name: script.name });
      
      return this.formatScript(script);
    } catch (error) {
      dbLogger.error('Erro ao criar script:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Busca script por ID
   */
  async getScriptById(id) {
    try {
      const script = await this.prisma.script.findUnique({
        where: { id },
        include: {
          executions: {
            orderBy: { startTime: 'desc' },
            take: 10 // Últimas 10 execuções
          }
        }
      });

      if (!script) {
        return null;
      }

      return this.formatScript(script);
    } catch (error) {
      dbLogger.error('Erro ao buscar script:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Lista todos os scripts com paginação
   */
  async getScripts(options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        status,
        search,
        tags,
        sortBy = 'updatedAt',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      
      // Construir filtros
      const where = {};
      
      if (status) {
        where.status = status;
      }
      
      if (search) {
        where.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      if (tags && tags.length > 0) {
        // Filtrar por tags (implementação simplificada)
        where.tags = { contains: tags[0] };
      }

      const [scripts, total] = await Promise.all([
        this.prisma.script.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            _count: {
              select: { executions: true }
            }
          }
        }),
        this.prisma.script.count({ where })
      ]);

      return {
        scripts: scripts.map(script => this.formatScript(script)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      dbLogger.error('Erro ao listar scripts:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Atualiza um script
   */
  async updateScript(id, updateData) {
    try {
      const script = await this.prisma.script.update({
        where: { id },
        data: {
          ...(updateData.name && { name: updateData.name }),
          ...(updateData.description !== undefined && { description: updateData.description }),
          ...(updateData.code && { code: updateData.code }),
          ...(updateData.parameters && { parameters: JSON.stringify(updateData.parameters) }),
          ...(updateData.tags && { tags: JSON.stringify(updateData.tags) }),
          ...(updateData.status && { status: updateData.status }),
          updatedAt: new Date()
        }
      });

      dbLogger.info('Script atualizado', { scriptId: script.id, name: script.name });
      
      return this.formatScript(script);
    } catch (error) {
      dbLogger.error('Erro ao atualizar script:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Deleta um script
   */
  async deleteScript(id) {
    try {
      await this.prisma.script.delete({
        where: { id }
      });

      dbLogger.info('Script deletado', { scriptId: id });
      
      return { success: true, deletedId: id };
    } catch (error) {
      dbLogger.error('Erro ao deletar script:', error);
      throw this.handleDatabaseError(error);
    }
  }

  // === OPERAÇÕES DE EXECUÇÕES ===

  /**
   * Cria uma nova execução
   */
  async createExecution(executionData) {
    try {
      const execution = await this.prisma.execution.create({
        data: {
          id: executionData.id,
          scriptId: executionData.scriptId,
          scriptName: executionData.scriptName,
          status: executionData.status || 'queued',
          parameters: JSON.stringify(executionData.parameters || {}),
          config: JSON.stringify(executionData.config || {}),
          logs: JSON.stringify(executionData.logs || []),
          screenshots: JSON.stringify(executionData.screenshots || []),
          securityLevel: executionData.securityLevel || 'HIGH',
          sanitizationId: executionData.sanitizationId,
          validationId: executionData.validationId
        }
      });

      dbLogger.info('Execução criada', { 
        executionId: execution.id, 
        scriptId: execution.scriptId 
      });
      
      return this.formatExecution(execution);
    } catch (error) {
      dbLogger.error('Erro ao criar execução:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Busca execução por ID
   */
  async getExecutionById(id) {
    try {
      const execution = await this.prisma.execution.findUnique({
        where: { id },
        include: {
          script: {
            select: { id: true, name: true, description: true }
          }
        }
      });

      if (!execution) {
        return null;
      }

      return this.formatExecution(execution);
    } catch (error) {
      dbLogger.error('Erro ao buscar execução:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Lista execuções com filtros
   */
  async getExecutions(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        scriptId,
        sortBy = 'startTime',
        sortOrder = 'desc'
      } = options;

      const skip = (page - 1) * limit;
      
      const where = {};
      
      if (status) {
        where.status = status;
      }
      
      if (scriptId) {
        where.scriptId = scriptId;
      }

      const [executions, total] = await Promise.all([
        this.prisma.execution.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: {
            script: {
              select: { id: true, name: true }
            }
          }
        }),
        this.prisma.execution.count({ where })
      ]);

      return {
        executions: executions.map(execution => this.formatExecution(execution)),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      dbLogger.error('Erro ao listar execuções:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Atualiza uma execução
   */
  async updateExecution(id, updateData) {
    try {
      const execution = await this.prisma.execution.update({
        where: { id },
        data: {
          ...(updateData.status && { status: updateData.status }),
          ...(updateData.endTime && { endTime: new Date(updateData.endTime) }),
          ...(updateData.duration !== undefined && { duration: updateData.duration }),
          ...(updateData.progress !== undefined && { progress: updateData.progress }),
          ...(updateData.logs && { logs: JSON.stringify(updateData.logs) }),
          ...(updateData.screenshots && { screenshots: JSON.stringify(updateData.screenshots) }),
          ...(updateData.result && { result: JSON.stringify(updateData.result) }),
          ...(updateData.error && { error: updateData.error }),
          ...(updateData.quarantined !== undefined && { quarantined: updateData.quarantined })
        }
      });

      return this.formatExecution(execution);
    } catch (error) {
      dbLogger.error('Erro ao atualizar execução:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Adiciona log a uma execução
   */
  async addExecutionLog(executionId, logEntry) {
    try {
      const execution = await this.prisma.execution.findUnique({
        where: { id: executionId },
        select: { logs: true }
      });

      if (!execution) {
        throw new Error('Execução não encontrada');
      }

      const currentLogs = JSON.parse(execution.logs || '[]');
      currentLogs.push({
        timestamp: logEntry.timestamp || new Date().toISOString(),
        level: logEntry.level,
        message: logEntry.message,
        data: logEntry.data
      });

      await this.prisma.execution.update({
        where: { id: executionId },
        data: { logs: JSON.stringify(currentLogs) }
      });

      return { success: true };
    } catch (error) {
      dbLogger.error('Erro ao adicionar log à execução:', error);
      throw this.handleDatabaseError(error);
    }
  }

  // === OPERAÇÕES DE LOGS DO SISTEMA ===

  /**
   * Cria um log do sistema
   */
  async createSystemLog(logData) {
    try {
      const log = await this.prisma.systemLog.create({
        data: {
          level: logData.level,
          message: logData.message,
          context: logData.context,
          metadata: JSON.stringify(logData.metadata || {}),
          executionId: logData.executionId
        }
      });

      return log;
    } catch (error) {
      dbLogger.error('Erro ao criar log do sistema:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Lista logs do sistema
   */
  async getSystemLogs(options = {}) {
    try {
      const {
        page = 1,
        limit = 50,
        level,
        context,
        executionId,
        startDate,
        endDate
      } = options;

      const skip = (page - 1) * limit;
      
      const where = {};
      
      if (level) {
        where.level = level;
      }
      
      if (context) {
        where.context = context;
      }
      
      if (executionId) {
        where.executionId = executionId;
      }
      
      if (startDate || endDate) {
        where.timestamp = {};
        if (startDate) where.timestamp.gte = new Date(startDate);
        if (endDate) where.timestamp.lte = new Date(endDate);
      }

      const [logs, total] = await Promise.all([
        this.prisma.systemLog.findMany({
          where,
          skip,
          take: limit,
          orderBy: { timestamp: 'desc' }
        }),
        this.prisma.systemLog.count({ where })
      ]);

      return {
        logs: logs.map(log => ({
          ...log,
          metadata: JSON.parse(log.metadata || '{}')
        })),
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      dbLogger.error('Erro ao listar logs do sistema:', error);
      throw this.handleDatabaseError(error);
    }
  }

  // === OPERAÇÕES DE MÉTRICAS DE SEGURANÇA ===

  /**
   * Registra métricas de segurança
   */
  async recordSecurityMetrics(metrics) {
    try {
      const record = await this.prisma.securityMetric.create({
        data: {
          totalExecutions: metrics.totalExecutions || 0,
          blockedExecutions: metrics.blockedExecutions || 0,
          timeoutExecutions: metrics.timeoutExecutions || 0,
          memoryViolations: metrics.memoryViolations || 0,
          cpuViolations: metrics.cpuViolations || 0,
          quarantinedScripts: metrics.quarantinedScripts || 0,
          avgExecutionTime: metrics.avgExecutionTime || 0,
          avgSanitizationTime: metrics.avgSanitizationTime || 0,
          avgValidationTime: metrics.avgValidationTime || 0
        }
      });

      return record;
    } catch (error) {
      dbLogger.error('Erro ao registrar métricas de segurança:', error);
      throw this.handleDatabaseError(error);
    }
  }

  /**
   * Obtém estatísticas do sistema
   */
  async getSystemStats() {
    try {
      const [
        totalScripts,
        activeScripts,
        totalExecutions,
        runningExecutions,
        recentExecutions,
        latestMetrics
      ] = await Promise.all([
        this.prisma.script.count(),
        this.prisma.script.count({ where: { status: 'active' } }),
        this.prisma.execution.count(),
        this.prisma.execution.count({ where: { status: 'running' } }),
        this.prisma.execution.findMany({
          where: { status: 'completed' },
          select: { duration: true },
          orderBy: { startTime: 'desc' },
          take: 100
        }),
        this.prisma.securityMetric.findFirst({
          orderBy: { recordedAt: 'desc' }
        })
      ]);

      // Calcular taxa de sucesso
      const completedExecutions = await this.prisma.execution.count({
        where: { status: 'completed' }
      });
      const failedExecutions = await this.prisma.execution.count({
        where: { status: 'failed' }
      });
      
      const successRate = totalExecutions > 0 
        ? (completedExecutions / (completedExecutions + failedExecutions)) * 100 
        : 0;

      // Calcular tempo médio de execução
      const avgExecutionTime = recentExecutions.length > 0
        ? recentExecutions.reduce((sum, exec) => sum + (exec.duration || 0), 0) / recentExecutions.length
        : 0;

      return {
        totalScripts,
        activeScripts,
        totalExecutions,
        runningExecutions,
        successRate: Math.round(successRate * 100) / 100,
        avgExecutionTime: Math.round(avgExecutionTime),
        securityMetrics: latestMetrics
      };
    } catch (error) {
      dbLogger.error('Erro ao obter estatísticas do sistema:', error);
      throw this.handleDatabaseError(error);
    }
  }

  // === OPERAÇÕES DE QUARENTENA ===

  /**
   * Adiciona código à quarentena
   */
  async quarantineCode(quarantineData) {
    try {
      const quarantine = await this.prisma.quarantinedCode.create({
        data: {
          executionId: quarantineData.executionId,
          originalCode: quarantineData.originalCode,
          sanitizedCode: quarantineData.sanitizedCode,
          reason: quarantineData.reason,
          errors: JSON.stringify(quarantineData.errors || []),
          severity: quarantineData.severity || 'medium'
        }
      });

      dbLogger.warn('Código colocado em quarentena', {
        quarantineId: quarantine.id,
        executionId: quarantine.executionId,
        severity: quarantine.severity
      });

      return quarantine;
    } catch (error) {
      dbLogger.error('Erro ao colocar código em quarentena:', error);
      throw this.handleDatabaseError(error);
    }
  }

  // === MÉTODOS AUXILIARES ===

  /**
   * Formata script para resposta da API
   */
  formatScript(script) {
    return {
      id: script.id,
      name: script.name,
      description: script.description,
      code: script.code,
      parameters: JSON.parse(script.parameters || '{}'),
      tags: JSON.parse(script.tags || '[]'),
      status: script.status,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString(),
      executions: script.executions ? script.executions.length : undefined,
      _count: script._count
    };
  }

  /**
   * Formata execução para resposta da API
   */
  formatExecution(execution) {
    return {
      id: execution.id,
      scriptId: execution.scriptId,
      scriptName: execution.scriptName,
      status: execution.status,
      startTime: execution.startTime.toISOString(),
      endTime: execution.endTime ? execution.endTime.toISOString() : null,
      duration: execution.duration,
      progress: execution.progress,
      parameters: JSON.parse(execution.parameters || '{}'),
      config: JSON.parse(execution.config || '{}'),
      logs: JSON.parse(execution.logs || '[]'),
      screenshots: JSON.parse(execution.screenshots || '[]'),
      result: execution.result ? JSON.parse(execution.result) : null,
      error: execution.error,
      securityLevel: execution.securityLevel,
      sanitizationId: execution.sanitizationId,
      validationId: execution.validationId,
      quarantined: execution.quarantined,
      script: execution.script
    };
  }

  /**
   * Trata erros do banco de dados
   */
  handleDatabaseError(error) {
    if (error.code === 'P2002') {
      return new Error('Registro duplicado: ' + error.meta?.target?.join(', '));
    }
    
    if (error.code === 'P2025') {
      return new Error('Registro não encontrado');
    }
    
    if (error.code === 'P2003') {
      return new Error('Violação de chave estrangeira');
    }
    
    return error;
  }

  /**
   * Executa migração do banco de dados
   */
  async migrate() {
    try {
      dbLogger.info('Iniciando migração do banco de dados...');
      
      // O Prisma CLI deve ser usado para migrações em produção
      // Este método é apenas para desenvolvimento
      await this.prisma.$executeRaw`PRAGMA foreign_keys = ON`;
      
      dbLogger.info('Migração concluída com sucesso');
      return { success: true };
    } catch (error) {
      dbLogger.error('Erro na migração:', error);
      throw error;
    }
  }

  /**
   * Limpa dados antigos
   */
  async cleanup(options = {}) {
    try {
      const {
        olderThanDays = 30,
        keepSuccessfulExecutions = 100,
        keepFailedExecutions = 50
      } = options;

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      // Limpar logs antigos
      const deletedLogs = await this.prisma.systemLog.deleteMany({
        where: {
          timestamp: { lt: cutoffDate },
          level: { not: 'error' } // Manter logs de erro
        }
      });

      // Limpar execuções antigas (manter as mais recentes)
      const oldSuccessfulExecutions = await this.prisma.execution.findMany({
        where: { status: 'completed' },
        orderBy: { startTime: 'desc' },
        skip: keepSuccessfulExecutions,
        select: { id: true }
      });

      const oldFailedExecutions = await this.prisma.execution.findMany({
        where: { status: 'failed' },
        orderBy: { startTime: 'desc' },
        skip: keepFailedExecutions,
        select: { id: true }
      });

      const executionsToDelete = [
        ...oldSuccessfulExecutions.map(e => e.id),
        ...oldFailedExecutions.map(e => e.id)
      ];

      const deletedExecutions = await this.prisma.execution.deleteMany({
        where: { id: { in: executionsToDelete } }
      });

      dbLogger.info('Limpeza concluída', {
        deletedLogs: deletedLogs.count,
        deletedExecutions: deletedExecutions.count
      });

      return {
        deletedLogs: deletedLogs.count,
        deletedExecutions: deletedExecutions.count
      };
    } catch (error) {
      dbLogger.error('Erro na limpeza:', error);
      throw error;
    }
  }
}

module.exports = DatabaseManager;