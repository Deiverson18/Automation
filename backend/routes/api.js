const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const DatabaseManager = require('../database/DatabaseManager');
const router = express.Router();

// Inicializar gerenciador de banco de dados
const dbManager = new DatabaseManager();

// Middleware de validação
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Dados inválidos',
      details: errors.array()
    });
  }
  next();
};

// Middleware para conectar ao banco se necessário
const ensureDbConnection = async (req, res, next) => {
  try {
    // Verificar se a conexão está ativa
    const health = await dbManager.healthCheck();
    if (health.status !== 'healthy') {
      await dbManager.connect();
    }
    next();
  } catch (error) {
    console.error('Erro na conexão com banco de dados:', error);
    res.status(500).json({
      error: 'Erro de conexão com banco de dados',
      message: 'Tente novamente em alguns instantes'
    });
  }
};

// Aplicar middleware de conexão a todas as rotas
router.use(ensureDbConnection);

// === ROTAS DE AUTENTICAÇÃO ===

router.post('/auth/login', [
  body('username').notEmpty().withMessage('Username é obrigatório'),
  body('password').notEmpty().withMessage('Password é obrigatório')
], handleValidationErrors, (req, res) => {
  const { username, password } = req.body;
  
  // Autenticação simples para demonstração
  if (username === 'admin' && password === 'admin') {
    res.json({
      success: true,
      user: {
        id: '1',
        username: 'admin',
        email: 'admin@playwright.local',
        role: 'admin'
      },
      token: 'mock-jwt-token'
    });
  } else {
    res.status(401).json({
      error: 'Credenciais inválidas'
    });
  }
});

// === ROTAS DE SCRIPTS ===

// Listar scripts com paginação e filtros
router.get('/scripts', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      status,
      search,
      tags,
      sortBy = 'updatedAt',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      search,
      tags: tags ? tags.split(',') : undefined,
      sortBy,
      sortOrder
    };

    const result = await dbManager.getScripts(options);
    
    res.json({
      success: true,
      data: result.scripts,
      pagination: result.pagination,
      total: result.pagination.total
    });
  } catch (error) {
    console.error('Erro ao listar scripts:', error);
    res.status(500).json({
      error: 'Erro ao buscar scripts',
      message: error.message
    });
  }
});

// Buscar script por ID
router.get('/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const script = await dbManager.getScriptById(id);
    
    if (!script) {
      return res.status(404).json({
        error: 'Script não encontrado'
      });
    }
    
    res.json({
      success: true,
      data: script
    });
  } catch (error) {
    console.error('Erro ao buscar script:', error);
    res.status(500).json({
      error: 'Erro ao buscar script',
      message: error.message
    });
  }
});

// Criar novo script
router.post('/scripts', [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional(),
  body('code').notEmpty().withMessage('Código é obrigatório'),
  body('tags').optional().isArray().withMessage('Tags devem ser um array'),
  body('parameters').optional().isObject().withMessage('Parâmetros devem ser um objeto'),
  body('status').optional().isIn(['draft', 'active', 'disabled']).withMessage('Status inválido')
], handleValidationErrors, async (req, res) => {
  try {
    const scriptData = {
      name: req.body.name,
      description: req.body.description,
      code: req.body.code,
      tags: req.body.tags || [],
      parameters: req.body.parameters || {},
      status: req.body.status || 'draft'
    };
    
    const script = await dbManager.createScript(scriptData);
    
    res.status(201).json({
      success: true,
      data: script,
      message: 'Script criado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao criar script:', error);
    res.status(500).json({
      error: 'Erro ao criar script',
      message: error.message
    });
  }
});

// Atualizar script existente
router.put('/scripts/:id', [
  body('name').optional().notEmpty().withMessage('Nome não pode estar vazio'),
  body('code').optional().notEmpty().withMessage('Código não pode estar vazio'),
  body('description').optional().isString().withMessage('Descrição deve ser uma string'),
  body('tags').optional().isArray().withMessage('Tags devem ser um array'),
  body('tags.*').optional().isString().withMessage('Cada tag deve ser uma string'),
  body('parameters').optional().isObject().withMessage('Parâmetros devem ser um objeto'),
  body('status').optional().isIn(['draft', 'active', 'disabled']).withMessage('Status deve ser: draft, active ou disabled')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = {};
    
    // Apenas incluir campos que foram fornecidos
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.code !== undefined) updateData.code = req.body.code;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.tags !== undefined) updateData.tags = req.body.tags;
    if (req.body.parameters !== undefined) updateData.parameters = req.body.parameters;
    if (req.body.status !== undefined) updateData.status = req.body.status;
    
    const script = await dbManager.updateScript(id, updateData);
    
    res.json({
      success: true,
      data: script,
      message: 'Script atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar script:', error);
    
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({
        error: 'Script não encontrado',
        message: `Script com ID ${req.params.id} não existe`
      });
    }
    
    res.status(500).json({
      error: 'Erro ao atualizar script',
      message: error.message
    });
  }
});

// Deletar script
router.delete('/scripts/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await dbManager.deleteScript(id);
    
    res.json({
      success: true,
      message: 'Script deletado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao deletar script:', error);
    
    if (error.message.includes('não encontrado')) {
      return res.status(404).json({
        error: 'Script não encontrado'
      });
    }
    
    res.status(500).json({
      error: 'Erro ao deletar script',
      message: error.message
    });
  }
});

// === ROTAS DE EXECUÇÕES ===

// Listar execuções
router.get('/executions', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      scriptId,
      sortBy = 'startTime',
      sortOrder = 'desc'
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      status,
      scriptId,
      sortBy,
      sortOrder
    };

    // Incluir execuções do engine se disponível
    let engineExecutions = [];
    if (req.app.locals.executionEngine) {
      engineExecutions = req.app.locals.executionEngine.getAllExecutions();
    }

    const result = await dbManager.getExecutions(options);
    
    // Mesclar execuções do banco com execuções ativas do engine
    const allExecutions = [...result.executions];
    
    // Adicionar execuções ativas que não estão no banco
    for (const engineExec of engineExecutions) {
      const existsInDb = allExecutions.find(dbExec => dbExec.id === engineExec.id);
      if (!existsInDb) {
        allExecutions.unshift({
          id: engineExec.id,
          scriptId: engineExec.scriptId || 'unknown',
          scriptName: engineExec.scriptName || 'Script em execução',
          status: engineExec.status,
          startTime: engineExec.startTime.toISOString(),
          endTime: engineExec.endTime ? engineExec.endTime.toISOString() : null,
          duration: engineExec.duration,
          progress: engineExec.progress || 0,
          parameters: engineExec.parameters || {},
          logs: engineExec.logs || [],
          screenshots: engineExec.screenshots || [],
          result: engineExec.result,
          error: engineExec.error,
          securityLevel: engineExec.security?.isolationLevel || 'HIGH'
        });
      }
    }

    res.json({
      success: true,
      data: allExecutions,
      pagination: result.pagination,
      total: allExecutions.length
    });
  } catch (error) {
    console.error('Erro ao listar execuções:', error);
    res.status(500).json({
      error: 'Erro ao buscar execuções',
      message: error.message
    });
  }
});

// Buscar execução por ID
router.get('/executions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Primeiro tentar buscar no banco
    let execution = await dbManager.getExecutionById(id);
    
    // Se não encontrar no banco, buscar no engine
    if (!execution && req.app.locals.executionEngine) {
      const engineExecution = req.app.locals.executionEngine.getExecution(id);
      if (engineExecution) {
        execution = {
          id: engineExecution.id,
          scriptId: engineExecution.scriptId || 'unknown',
          scriptName: engineExecution.scriptName || 'Script em execução',
          status: engineExecution.status,
          startTime: engineExecution.startTime.toISOString(),
          endTime: engineExecution.endTime ? engineExecution.endTime.toISOString() : null,
          duration: engineExecution.duration,
          progress: engineExecution.progress || 0,
          parameters: engineExecution.parameters || {},
          logs: engineExecution.logs || [],
          screenshots: engineExecution.screenshots || [],
          result: engineExecution.result,
          error: engineExecution.error,
          securityLevel: engineExecution.security?.isolationLevel || 'HIGH'
        };
      }
    }
    
    if (!execution) {
      return res.status(404).json({
        error: 'Execução não encontrada'
      });
    }
    
    res.json({
      success: true,
      data: execution
    });
  } catch (error) {
    console.error('Erro ao buscar execução:', error);
    res.status(500).json({
      error: 'Erro ao buscar execução',
      message: error.message
    });
  }
});

// Criar nova execução
router.post('/executions', [
  body('scriptId').notEmpty().withMessage('Script ID é obrigatório'),
  body('code').notEmpty().withMessage('Código é obrigatório'),
  body('parameters').optional().isObject().withMessage('Parâmetros devem ser um objeto'),
  body('config').optional().isObject().withMessage('Configuração deve ser um objeto')
], handleValidationErrors, async (req, res) => {
  try {
    const { scriptId, code, parameters = {}, config = {} } = req.body;
    const executionId = uuidv4();
    
    // Buscar informações do script
    const script = await dbManager.getScriptById(scriptId);
    if (!script) {
      return res.status(404).json({
        error: 'Script não encontrado'
      });
    }
    
    // Criar registro de execução no banco
    const executionData = {
      id: executionId,
      scriptId,
      scriptName: script.name,
      status: 'queued',
      parameters,
      config,
      securityLevel: 'HIGH'
    };
    
    await dbManager.createExecution(executionData);
    
    // Verificar se o execution engine está disponível
    if (!req.app.locals.executionEngine) {
      return res.status(500).json({
        error: 'Engine de execução não disponível'
      });
    }

    // Iniciar execução assíncrona
    req.app.locals.executionEngine.executeTest(code, executionId, config)
      .then(async () => {
        // Atualizar status no banco quando concluído
        await dbManager.updateExecution(executionId, { 
          status: 'completed',
          endTime: new Date().toISOString()
        });
      })
      .catch(async (error) => {
        console.error(`Erro na execução ${executionId}:`, error);
        // Atualizar status no banco quando falhar
        await dbManager.updateExecution(executionId, { 
          status: 'failed',
          error: error.message,
          endTime: new Date().toISOString()
        });
      });

    res.status(201).json({
      success: true,
      data: {
        id: executionId,
        scriptId,
        scriptName: script.name,
        status: 'queued',
        startTime: new Date().toISOString(),
        parameters,
        config,
        securityLevel: 'HIGH'
      },
      message: 'Execução iniciada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao iniciar execução:', error);
    res.status(500).json({
      error: 'Erro ao iniciar execução',
      details: error.message
    });
  }
});

// Cancelar execução
router.post('/executions/:id/cancel', async (req, res) => {
  try {
    const { id } = req.params;
    
    let success = false;
    
    // Tentar cancelar no engine
    if (req.app.locals.executionEngine) {
      success = req.app.locals.executionEngine.cancelExecution(id);
    }
    
    // Atualizar status no banco
    if (success) {
      await dbManager.updateExecution(id, { 
        status: 'cancelled',
        endTime: new Date().toISOString()
      });
    }
    
    if (success) {
      res.json({
        success: true,
        message: 'Execução cancelada com sucesso'
      });
    } else {
      res.status(404).json({
        error: 'Execução não encontrada ou não pode ser cancelada'
      });
    }
  } catch (error) {
    console.error('Erro ao cancelar execução:', error);
    res.status(500).json({
      error: 'Erro ao cancelar execução',
      message: error.message
    });
  }
});

// === ROTAS DE ESTATÍSTICAS ===

router.get('/stats', async (req, res) => {
  try {
    const stats = await dbManager.getSystemStats();
    
    // Adicionar estatísticas do engine se disponível
    if (req.app.locals.executionEngine) {
      const engineStats = req.app.locals.executionEngine.getSecurityStats ? 
        req.app.locals.executionEngine.getSecurityStats() : {};
      
      stats.engineStats = engineStats;
      stats.runningExecutions = req.app.locals.executionEngine.getAllExecutions()
        .filter(e => e.status === 'running').length;
    }
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    res.status(500).json({
      error: 'Erro ao buscar estatísticas',
      message: error.message
    });
  }
});

// === ROTAS DE LOGS ===

router.get('/logs', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      level,
      context,
      executionId,
      startDate,
      endDate
    } = req.query;

    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      level,
      context,
      executionId,
      startDate,
      endDate
    };

    const result = await dbManager.getSystemLogs(options);
    
    res.json({
      success: true,
      data: result.logs,
      pagination: result.pagination
    });
  } catch (error) {
    console.error('Erro ao buscar logs:', error);
    res.status(500).json({
      error: 'Erro ao buscar logs',
      message: error.message
    });
  }
});

// === ROTAS DE CONFIGURAÇÃO ===

router.get('/config', (req, res) => {
  const config = {
    general: {
      serverPort: process.env.PORT || 3000,
      websocketPort: process.env.WS_PORT || 3001,
      maxConcurrentExecutions: 5,
      logLevel: process.env.LOG_LEVEL || 'info'
    },
    playwright: {
      defaultBrowser: 'chromium',
      headless: true,
      timeout: 30000,
      screenshotsEnabled: true,
      videosEnabled: false
    },
    database: {
      type: 'sqlite',
      connected: true,
      location: './prisma/playwright_hub.db'
    },
    security: {
      isolationLevel: 'HIGH',
      sanitizationEnabled: true,
      quarantineEnabled: true,
      dockerAvailable: req.app.locals.dockerAvailable || false
    }
  };
  
  res.json({
    success: true,
    data: config
  });
});

// === ROTAS DE SAÚDE DO SISTEMA ===

router.get('/health', async (req, res) => {
  try {
    const dbHealth = await dbManager.healthCheck();
    
    const health = {
      status: 'OK',
      timestamp: new Date().toISOString(),
      database: dbHealth,
      executionEngine: {
        available: !!req.app.locals.executionEngine,
        activeExecutions: req.app.locals.executionEngine ? 
          req.app.locals.executionEngine.getAllExecutions().filter(e => e.status === 'running').length : 0
      },
      websocket: {
        available: !!req.app.locals.websocketManager,
        connections: req.app.locals.websocketManager ? 
          req.app.locals.websocketManager.getConnectionCount() : 0
      }
    };
    
    const overallStatus = dbHealth.status === 'healthy' ? 'OK' : 'DEGRADED';
    
    res.status(overallStatus === 'OK' ? 200 : 503).json({
      success: true,
      data: health
    });
  } catch (error) {
    console.error('Erro no health check:', error);
    res.status(503).json({
      success: false,
      error: 'Health check falhou',
      message: error.message
    });
  }
});

// Status do WebSocket
router.get('/websocket/status', (req, res) => {
  if (!req.app.locals.websocketManager) {
    return res.status(500).json({
      error: 'WebSocket manager não disponível'
    });
  }

  const wsManager = req.app.locals.websocketManager;
  
  res.json({
    success: true,
    data: {
      connections: wsManager.getConnectionCount(),
      activeExecutions: wsManager.getActiveExecutions(),
      port: process.env.WS_PORT || 3001
    }
  });
});

// === MIDDLEWARE DE ERRO ===

// Middleware de erro para rotas da API
router.use((err, req, res, next) => {
  console.error('Erro na API:', err);
  
  // Log do erro no banco se possível
  if (dbManager) {
    dbManager.createSystemLog({
      level: 'error',
      message: err.message,
      context: 'api',
      metadata: {
        stack: err.stack,
        url: req.url,
        method: req.method,
        ip: req.ip
      }
    }).catch(logError => {
      console.error('Erro ao salvar log no banco:', logError);
    });
  }
  
  res.status(500).json({
    error: 'Erro interno da API',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor',
    timestamp: new Date().toISOString()
  });
});

module.exports = router;