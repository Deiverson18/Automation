const express = require('express');
const { body, validationResult } = require('express-validator');
const router = express.Router();

// Mock data para demonstração
const mockScripts = [
  {
    id: '1',
    name: 'Login Test',
    description: 'Teste automatizado de login',
    status: 'active',
    lastRun: new Date().toISOString(),
    executions: 45
  },
  {
    id: '2',
    name: 'E-commerce Checkout',
    description: 'Automação do processo de checkout',
    status: 'active',
    lastRun: new Date().toISOString(),
    executions: 32
  }
];

const mockExecutions = [
  {
    id: '1',
    scriptId: '1',
    scriptName: 'Login Test',
    status: 'completed',
    startTime: new Date().toISOString(),
    duration: 15000,
    success: true
  },
  {
    id: '2',
    scriptId: '2',
    scriptName: 'E-commerce Checkout',
    status: 'running',
    startTime: new Date().toISOString(),
    success: null
  }
];

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

// Rotas de autenticação
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

// Rotas de scripts
router.get('/scripts', (req, res) => {
  res.json({
    success: true,
    data: mockScripts,
    total: mockScripts.length
  });
});

router.get('/scripts/:id', (req, res) => {
  const script = mockScripts.find(s => s.id === req.params.id);
  if (!script) {
    return res.status(404).json({
      error: 'Script não encontrado'
    });
  }
  res.json({
    success: true,
    data: script
  });
});

router.post('/scripts', [
  body('name').notEmpty().withMessage('Nome é obrigatório'),
  body('description').optional(),
  body('code').notEmpty().withMessage('Código é obrigatório')
], handleValidationErrors, (req, res) => {
  const newScript = {
    id: Date.now().toString(),
    ...req.body,
    status: 'draft',
    createdAt: new Date().toISOString(),
    executions: 0
  };
  
  mockScripts.push(newScript);
  
  res.status(201).json({
    success: true,
    data: newScript
  });
});

// Rotas de execuções
router.get('/executions', (req, res) => {
  res.json({
    success: true,
    data: mockExecutions,
    total: mockExecutions.length
  });
});

router.post('/executions', [
  body('scriptId').notEmpty().withMessage('Script ID é obrigatório')
], handleValidationErrors, (req, res) => {
  const { scriptId, parameters = {} } = req.body;
  
  const script = mockScripts.find(s => s.id === scriptId);
  if (!script) {
    return res.status(404).json({
      error: 'Script não encontrado'
    });
  }
  
  const newExecution = {
    id: Date.now().toString(),
    scriptId,
    scriptName: script.name,
    status: 'queued',
    startTime: new Date().toISOString(),
    parameters,
    logs: []
  };
  
  mockExecutions.unshift(newExecution);
  
  // Simular mudança de status
  setTimeout(() => {
    newExecution.status = 'running';
  }, 1000);
  
  setTimeout(() => {
    newExecution.status = 'completed';
    newExecution.endTime = new Date().toISOString();
    newExecution.duration = 15000;
    newExecution.success = true;
  }, 5000);
  
  res.status(201).json({
    success: true,
    data: newExecution
  });
});

// Rotas de estatísticas
router.get('/stats', (req, res) => {
  const stats = {
    totalScripts: mockScripts.length,
    activeScripts: mockScripts.filter(s => s.status === 'active').length,
    totalExecutions: mockExecutions.length,
    runningExecutions: mockExecutions.filter(e => e.status === 'running').length,
    successRate: 87.5,
    avgExecutionTime: 15000
  };
  
  res.json({
    success: true,
    data: stats
  });
});

// Rota de logs
router.get('/logs', (req, res) => {
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Sistema iniciado com sucesso',
      service: 'backend'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'info',
      message: 'Configurações carregadas',
      service: 'backend'
    }
  ];
  
  res.json({
    success: true,
    data: logs
  });
});

// Rota de configurações
router.get('/config', (req, res) => {
  const config = {
    general: {
      serverPort: 3000,
      maxConcurrentExecutions: 5,
      logLevel: 'info'
    },
    playwright: {
      defaultBrowser: 'chromium',
      headless: true,
      timeout: 30000
    }
  };
  
  res.json({
    success: true,
    data: config
  });
});

// Middleware de erro para rotas da API
router.use((err, req, res, next) => {
  console.error('Erro na API:', err);
  res.status(500).json({
    error: 'Erro interno da API',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

module.exports = router;