const express = require('express');
const { body, validationResult } = require('express-validator');
const { v4: uuidv4 } = require('uuid');
const router = express.Router();

// Mock data para demonstração
const mockScripts = [
  {
    id: '1',
    name: 'Login Test',
    description: 'Teste automatizado de login',
    status: 'active',
    lastRun: new Date().toISOString(),
    executions: 45,
    code: `// Teste de login automatizado
await page.goto('https://example.com/login');
console.log('[PLAYWRIGHT] Navegando para página de login');

await page.fill('#username', 'testuser');
console.log('[PLAYWRIGHT] Preenchendo campo de usuário');

await page.fill('#password', 'testpass');
console.log('[PLAYWRIGHT] Preenchendo campo de senha');

await page.click('button[type="submit"]');
console.log('[PLAYWRIGHT] Clicando no botão de login');

await page.waitForSelector('.dashboard', { timeout: 5000 });
console.log('[PLAYWRIGHT] Login realizado com sucesso');

// Capturar screenshot
await page.screenshot({ path: 'login-success.png' });
console.log('[PLAYWRIGHT] Screenshot capturado');`
  },
  {
    id: '2',
    name: 'E-commerce Checkout',
    description: 'Automação do processo de checkout',
    status: 'active',
    lastRun: new Date().toISOString(),
    executions: 32,
    code: `// Automação de checkout e-commerce
await page.goto('https://demo-store.com/product/123');
console.log('[PLAYWRIGHT] Navegando para página do produto');

await page.click('.add-to-cart');
console.log('[PLAYWRIGHT] Adicionando produto ao carrinho');

await page.waitForSelector('.cart-notification');
console.log('[PLAYWRIGHT] Produto adicionado com sucesso');

await page.click('.checkout-btn');
console.log('[PLAYWRIGHT] Iniciando processo de checkout');

await page.fill('#email', 'test@example.com');
await page.fill('#first-name', 'João');
await page.fill('#last-name', 'Silva');
console.log('[PLAYWRIGHT] Preenchendo dados do cliente');

await page.screenshot({ path: 'checkout-form.png' });
console.log('[PLAYWRIGHT] Checkout concluído com sucesso');`
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
  // Incluir execuções do engine se disponível
  let allExecutions = [...mockExecutions];
  
  if (req.app.locals.executionEngine) {
    const engineExecutions = req.app.locals.executionEngine.getAllExecutions();
    allExecutions = [...allExecutions, ...engineExecutions];
  }

  res.json({
    success: true,
    data: allExecutions,
    total: allExecutions.length
  });
});

router.post('/executions', [
  body('scriptId').notEmpty().withMessage('Script ID é obrigatório'),
  body('code').notEmpty().withMessage('Código é obrigatório')
], handleValidationErrors, async (req, res) => {
  const { scriptId, code, parameters = {}, config = {} } = req.body;
  
  try {
    const executionId = uuidv4();
    
    // Verificar se o execution engine está disponível
    if (!req.app.locals.executionEngine) {
      return res.status(500).json({
        error: 'Engine de execução não disponível'
      });
    }

    // Iniciar execução assíncrona
    req.app.locals.executionEngine.executeTest(code, executionId, config)
      .catch(error => {
        console.error(`Erro na execução ${executionId}:`, error);
      });

    res.status(201).json({
      success: true,
      data: {
        id: executionId,
        scriptId,
        status: 'running',
        startTime: new Date().toISOString(),
        parameters,
        config
      }
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
router.post('/executions/:id/cancel', (req, res) => {
  const { id } = req.params;
  
  if (!req.app.locals.executionEngine) {
    return res.status(500).json({
      error: 'Engine de execução não disponível'
    });
  }

  const success = req.app.locals.executionEngine.cancelExecution(id);
  
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
});

// Obter detalhes de uma execução
router.get('/executions/:id', (req, res) => {
  const { id } = req.params;
  
  if (!req.app.locals.executionEngine) {
    return res.status(500).json({
      error: 'Engine de execução não disponível'
    });
  }

  const execution = req.app.locals.executionEngine.getExecution(id);
  
  if (execution) {
    res.json({
      success: true,
      data: execution
    });
  } else {
    res.status(404).json({
      error: 'Execução não encontrada'
    });
  }
});

// Rotas de estatísticas
router.get('/stats', (req, res) => {
  let runningExecutions = 0;
  let totalExecutions = mockExecutions.length;

  if (req.app.locals.executionEngine) {
    const engineExecutions = req.app.locals.executionEngine.getAllExecutions();
    totalExecutions += engineExecutions.length;
    runningExecutions = engineExecutions.filter(e => e.status === 'running').length;
  }

  const stats = {
    totalScripts: mockScripts.length,
    activeScripts: mockScripts.filter(s => s.status === 'active').length,
    totalExecutions,
    runningExecutions,
    successRate: 87.5,
    avgExecutionTime: 15000
  };
  
  res.json({
    success: true,
    data: stats
  });
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
      port: 3001
    }
  });
});

// Rota de logs
router.get('/logs', (req, res) => {
  const logs = [
    {
      timestamp: new Date().toISOString(),
      level: 'info',
      message: 'Sistema Playwright Hub iniciado com sucesso',
      service: 'backend'
    },
    {
      timestamp: new Date(Date.now() - 60000).toISOString(),
      level: 'info',
      message: 'WebSocket server ativo na porta 3001',
      service: 'websocket'
    },
    {
      timestamp: new Date(Date.now() - 120000).toISOString(),
      level: 'info',
      message: 'Engine de execução Playwright inicializado',
      service: 'execution-engine'
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
      websocketPort: 3001,
      maxConcurrentExecutions: 5,
      logLevel: 'info'
    },
    playwright: {
      defaultBrowser: 'chromium',
      headless: true,
      timeout: 30000,
      screenshotsEnabled: true,
      videosEnabled: false
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