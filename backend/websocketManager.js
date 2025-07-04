const WebSocket = require('ws');
const winston = require('winston');

// Configurar logger
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/websocket.log' }),
    new winston.transports.Console()
  ]
});

class WebSocketManager {
  constructor(port = 3001) {
    this.port = port;
    this.wss = null;
    this.connections = new Map(); // executionId -> Set<WebSocket>
    this.clientConnections = new Set(); // Todas as conexões de clientes
  }

  start() {
    this.wss = new WebSocket.Server({ 
      port: this.port,
      perMessageDeflate: false
    });

    this.wss.on('connection', (ws, req) => {
      logger.info(`Nova conexão WebSocket de ${req.socket.remoteAddress}`);
      
      // Adicionar à lista de clientes
      this.clientConnections.add(ws);

      ws.on('message', (message) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleClientMessage(ws, data);
        } catch (error) {
          logger.error('Erro ao processar mensagem WebSocket:', error);
          this.sendError(ws, 'Formato de mensagem inválido');
        }
      });

      ws.on('close', () => {
        logger.info('Conexão WebSocket fechada');
        this.clientConnections.delete(ws);
        
        // Remover das execuções
        for (const [executionId, connections] of this.connections.entries()) {
          connections.delete(ws);
          if (connections.size === 0) {
            this.connections.delete(executionId);
          }
        }
      });

      ws.on('error', (error) => {
        logger.error('Erro na conexão WebSocket:', error);
        this.clientConnections.delete(ws);
      });

      // Enviar mensagem de boas-vindas
      this.send(ws, {
        type: 'CONNECTED',
        message: 'Conectado ao servidor Playwright Hub',
        timestamp: new Date().toISOString()
      });
    });

    logger.info(`Servidor WebSocket iniciado na porta ${this.port}`);
  }

  handleClientMessage(ws, data) {
    const { type, executionId, payload } = data;

    switch (type) {
      case 'SUBSCRIBE':
        if (executionId) {
          this.subscribeToExecution(ws, executionId);
        }
        break;

      case 'UNSUBSCRIBE':
        if (executionId) {
          this.unsubscribeFromExecution(ws, executionId);
        }
        break;

      case 'PING':
        this.send(ws, { type: 'PONG', timestamp: new Date().toISOString() });
        break;

      case 'GET_STATUS':
        this.sendStatus(ws);
        break;

      default:
        logger.warn(`Tipo de mensagem desconhecido: ${type}`);
        this.sendError(ws, `Tipo de mensagem desconhecido: ${type}`);
    }
  }

  subscribeToExecution(ws, executionId) {
    if (!this.connections.has(executionId)) {
      this.connections.set(executionId, new Set());
    }
    
    this.connections.get(executionId).add(ws);
    
    this.send(ws, {
      type: 'SUBSCRIBED',
      executionId,
      message: `Inscrito para receber atualizações da execução ${executionId}`,
      timestamp: new Date().toISOString()
    });

    logger.info(`Cliente inscrito na execução ${executionId}`);
  }

  unsubscribeFromExecution(ws, executionId) {
    if (this.connections.has(executionId)) {
      this.connections.get(executionId).delete(ws);
      
      if (this.connections.get(executionId).size === 0) {
        this.connections.delete(executionId);
      }
    }

    this.send(ws, {
      type: 'UNSUBSCRIBED',
      executionId,
      message: `Desinscrito da execução ${executionId}`,
      timestamp: new Date().toISOString()
    });

    logger.info(`Cliente desinscrito da execução ${executionId}`);
  }

  sendToExecution(executionId, message) {
    const connections = this.connections.get(executionId);
    if (!connections) return;

    const messageStr = JSON.stringify(message);
    
    connections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          logger.error('Erro ao enviar mensagem para cliente:', error);
          connections.delete(ws);
        }
      } else {
        connections.delete(ws);
      }
    });

    // Limpar conexões vazias
    if (connections.size === 0) {
      this.connections.delete(executionId);
    }
  }

  broadcast(message) {
    const messageStr = JSON.stringify(message);
    
    this.clientConnections.forEach(ws => {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(messageStr);
        } catch (error) {
          logger.error('Erro ao fazer broadcast:', error);
          this.clientConnections.delete(ws);
        }
      } else {
        this.clientConnections.delete(ws);
      }
    });
  }

  send(ws, message) {
    if (ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(message));
      } catch (error) {
        logger.error('Erro ao enviar mensagem:', error);
      }
    }
  }

  sendError(ws, error) {
    this.send(ws, {
      type: 'ERROR',
      error,
      timestamp: new Date().toISOString()
    });
  }

  sendStatus(ws) {
    const status = {
      type: 'STATUS',
      data: {
        activeConnections: this.clientConnections.size,
        activeExecutions: this.connections.size,
        uptime: process.uptime()
      },
      timestamp: new Date().toISOString()
    };

    this.send(ws, status);
  }

  getConnectionCount() {
    return this.clientConnections.size;
  }

  getActiveExecutions() {
    return Array.from(this.connections.keys());
  }

  stop() {
    if (this.wss) {
      this.wss.close();
      logger.info('Servidor WebSocket parado');
    }
  }
}

module.exports = WebSocketManager;