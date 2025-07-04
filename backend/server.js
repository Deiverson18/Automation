const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Importar módulos customizados
const WebSocketManager = require('./websocketManager');
const DockerExecutionEngine = require('./dockerExecutionEngine');

const app = express();
const PORT = process.env.PORT || 3000;
const WS_PORT = process.env.WS_PORT || 3001;

// Criar diretório de logs se não existir
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Configuração de logging
const winston = require('winston');
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'playwright-hub-backend' },
  transports: [
    new winston.transports.File({ 
      filename: path.join(logsDir, 'error.log'), 
      level: 'error' 
    }),
    new winston.transports.File({ 
      filename: path.join(logsDir, 'backend.log') 
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Verificar se Docker está disponível
async function checkDockerAvailability() {
  return new Promise((resolve) => {
    const { spawn } = require('child_process');
    const dockerProcess = spawn('docker', ['--version'], { stdio: 'ignore' });
    
    dockerProcess.on('close', (code) => {
      resolve(code === 0);
    });
    
    dockerProcess.on('error', () => {
      resolve(false);
    });
  });
}

// Inicializar sistema
async function initializeSystem() {
  try {
    // Verificar Docker
    const dockerAvailable = await checkDockerAvailability();
    if (!dockerAvailable) {
      logger.error('❌ Docker não está disponível! O sistema funcionará em modo limitado.');
      logger.info('💡 Para segurança máxima, instale o Docker e reinicie o sistema.');
    } else {
      logger.info('✅ Docker detectado e disponível');
    }

    // Inicializar WebSocket Manager
    const websocketManager = new WebSocketManager(WS_PORT);
    websocketManager.start();

    // Inicializar Execution Engine (Docker ou fallback)
    let executionEngine;
    if (dockerAvailable) {
      logger.info('🐳 Inicializando Docker Execution Engine...');
      executionEngine = new DockerExecutionEngine(websocketManager);
    } else {
      logger.warn('⚠️ Usando Execution Engine sem isolamento Docker');
      const ExecutionEngine = require('./executionEngine');
      executionEngine = new ExecutionEngine(websocketManager);
    }

    // Disponibilizar instâncias para as rotas
    app.locals.websocketManager = websocketManager;
    app.locals.executionEngine = executionEngine;
    app.locals.dockerAvailable = dockerAvailable;

    logger.info('🚀 Sistema inicializado com sucesso');
    
  } catch (error) {
    logger.error('❌ Erro na inicialização do sistema:', error);
    process.exit(1);
  }
}

// Middleware de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:", `ws://localhost:${WS_PORT}`, `wss://localhost:${WS_PORT}`]
    }
  }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por IP
  message: {
    error: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // máximo 5 tentativas de login por IP
  message: {
    error: 'Muitas tentativas de login, tente novamente em 15 minutos.'
  }
});

// Rate limiting específico para execuções (mais restritivo)
const executionLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 10, // máximo 10 execuções por IP
  message: {
    error: 'Muitas execuções solicitadas, tente novamente em 5 minutos.'
  }
});

app.use(limiter);
app.use('/api/auth', authLimiter);
app.use('/api/executions', executionLimiter);

// Middleware básico
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true
}));
app.use(express.json({ limit: '1mb' })); // Reduzido para segurança
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Logging de requisições
app.use(morgan('combined', {
  stream: {
    write: (message) => logger.info(message.trim())
  }
}));

// Health check endpoint
app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    memory: process.memoryUsage(),
    pid: process.pid,
    services: {
      websocket: {
        status: 'running',
        port: WS_PORT,
        connections: app.locals.websocketManager?.getConnectionCount() || 0
      },
      executionEngine: {
        status: 'running',
        type: app.locals.dockerAvailable ? 'docker' : 'standard',
        activeExecutions: app.locals.executionEngine?.getAllExecutions().filter(e => e.status === 'running').length || 0,
        stats: app.locals.executionEngine?.getSystemStats ? app.locals.executionEngine.getSystemStats() : {}
      },
      docker: {
        available: app.locals.dockerAvailable,
        status: app.locals.dockerAvailable ? 'available' : 'not_available'
      }
    }
  };
  
  logger.info('Health check accessed', healthCheck);
  res.status(200).json(healthCheck);
});

// Endpoint de status do sistema
app.get('/api/system/status', (req, res) => {
  const systemStatus = {
    docker: {
      available: app.locals.dockerAvailable,
      securityLevel: app.locals.dockerAvailable ? 'high' : 'medium'
    },
    executionEngine: {
      type: app.locals.dockerAvailable ? 'docker-isolated' : 'standard',
      stats: app.locals.executionEngine?.getSystemStats ? app.locals.executionEngine.getSystemStats() : {}
    },
    security: {
      isolation: app.locals.dockerAvailable ? 'container-based' : 'process-based',
      networkAccess: app.locals.dockerAvailable ? 'blocked' : 'limited',
      fileSystemAccess: app.locals.dockerAvailable ? 'read-only' : 'sandboxed'
    }
  };

  res.json({
    success: true,
    data: systemStatus
  });
});

// API Routes
app.use('/api', require('./routes/api'));

// Servir screenshots
app.use('/screenshots', express.static(path.join(__dirname, 'screenshots')));

// Servir arquivos estáticos do frontend (fallback)
const frontendPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(frontendPath)) {
  app.use(express.static(frontendPath));
  
  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
  });
} else {
  app.get('*', (req, res) => {
    res.status(404).json({
      error: 'Frontend não encontrado',
      message: 'Execute o build do frontend primeiro'
    });
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Erro não tratado:', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production' 
      ? 'Erro interno do servidor' 
      : err.message,
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  logger.warn('Rota não encontrada:', {
    url: req.url,
    method: req.method,
    ip: req.ip
  });
  
  res.status(404).json({
    error: 'Rota não encontrada',
    timestamp: new Date().toISOString()
  });
});

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Iniciando shutdown gracioso...');
  
  try {
    // Parar WebSocket server
    if (app.locals.websocketManager) {
      app.locals.websocketManager.stop();
    }
    
    // Cleanup do execution engine
    if (app.locals.executionEngine) {
      await app.locals.executionEngine.cleanup();
    }
    
    // Fechar servidor HTTP
    server.close(() => {
      logger.info('Servidor HTTP fechado');
      process.exit(0);
    });
    
    // Forçar saída após 15 segundos (mais tempo para Docker cleanup)
    setTimeout(() => {
      logger.error('Forçando saída após timeout');
      process.exit(1);
    }, 15000);
    
  } catch (error) {
    logger.error('Erro durante shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Tratamento de erros não capturados
process.on('uncaughtException', (err) => {
  logger.error('Exceção não capturada:', err);
  gracefulShutdown();
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promise rejeitada não tratada:', { reason, promise });
  gracefulShutdown();
});

// Inicializar e iniciar servidor
initializeSystem().then(() => {
  const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`🚀 Playwright Hub Backend rodando em http://0.0.0.0:${PORT}`);
    logger.info(`🔌 WebSocket Server rodando na porta ${WS_PORT}`);
    logger.info(`📊 Dashboard: http://localhost:${PORT}/dashboard`);
    logger.info(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`📝 Logs: ${logsDir}`);
    logger.info(`🎭 Execution Engine: ${app.locals.dockerAvailable ? 'Docker (Isolado)' : 'Standard'}`);
    logger.info(`🔒 Nível de Segurança: ${app.locals.dockerAvailable ? 'ALTO' : 'MÉDIO'}`);
  });
}).catch(error => {
  logger.error('Falha na inicialização:', error);
  process.exit(1);
});

module.exports = app;