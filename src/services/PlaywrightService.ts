import { EventEmitter } from 'events';

export interface PlaywrightExecution {
  id: string;
  scriptId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  duration?: number;
  progress: number;
  logs: PlaywrightLog[];
  screenshots: string[];
  error?: string;
  result?: any;
}

export interface PlaywrightLog {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export interface PlaywrightConfig {
  timeout: number;
  headless: boolean;
  browser: 'chromium' | 'firefox' | 'webkit';
  viewport: { width: number; height: number };
  screenshots: boolean;
  video: boolean;
}

class PlaywrightService extends EventEmitter {
  private executions = new Map<string, PlaywrightExecution>();
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private config: PlaywrightConfig = {
    timeout: 30000,
    headless: true,
    browser: 'chromium',
    viewport: { width: 1280, height: 720 },
    screenshots: true,
    video: false
  };

  constructor() {
    super();
    this.connectWebSocket();
  }

  private connectWebSocket() {
    try {
      const wsUrl = `ws://localhost:3001`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado ao servidor Playwright');
        this.reconnectAttempts = 0;
        this.emit('connected');
        
        // Enviar ping para manter conexão viva
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleWebSocketMessage(message);
        } catch (error) {
          console.error('Erro ao processar mensagem WebSocket:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 WebSocket desconectado');
        this.emit('disconnected');
        this.attemptReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('❌ Erro no WebSocket:', error);
        this.emit('error', error);
      };

    } catch (error) {
      console.error('Erro ao conectar WebSocket:', error);
      this.attemptReconnect();
    }
  }

  private attemptReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`🔄 Tentando reconectar WebSocket (${this.reconnectAttempts}/${this.maxReconnectAttempts}) em ${delay}ms`);
      
      setTimeout(() => {
        this.connectWebSocket();
      }, delay);
    } else {
      console.error('❌ Máximo de tentativas de reconexão atingido');
      this.emit('maxReconnectAttemptsReached');
    }
  }

  private startHeartbeat() {
    setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // Ping a cada 30 segundos
  }

  private handleWebSocketMessage(message: any) {
    const { type, executionId, data } = message;

    switch (type) {
      case 'CONNECTED':
        console.log('🎉 Conectado ao servidor Playwright Hub');
        break;

      case 'LOG':
        this.handleLogMessage(executionId, data);
        break;

      case 'STATUS':
      case 'PROGRESS':
        this.handleStatusUpdate(executionId, data);
        break;

      case 'COMPLETE':
        this.handleExecutionComplete(executionId, data);
        break;

      case 'ERROR':
        this.handleExecutionError(executionId, data);
        break;

      case 'CANCELLED':
        this.handleExecutionCancelled(executionId, data);
        break;

      case 'SCREENSHOT':
        this.handleScreenshot(executionId, data);
        break;

      case 'PONG':
        // Resposta ao ping - conexão está viva
        break;

      default:
        console.log('Mensagem WebSocket não reconhecida:', message);
    }
  }

  private handleLogMessage(executionId: string, logData: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const log: PlaywrightLog = {
      timestamp: new Date(logData.timestamp),
      level: logData.level,
      message: logData.message,
      data: logData.data
    };

    execution.logs.push(log);
    this.emit('logAdded', { executionId, log });
    this.emit('executionUpdated', execution);
  }

  private handleStatusUpdate(executionId: string, statusData: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    if (statusData.status) {
      execution.status = statusData.status;
    }
    
    if (statusData.progress !== undefined) {
      execution.progress = statusData.progress;
    }

    this.emit('executionUpdated', execution);
  }

  private handleExecutionComplete(executionId: string, data: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'completed';
    execution.endTime = new Date();
    execution.duration = data.duration;
    execution.progress = 100;
    
    if (data.screenshots) {
      execution.screenshots = data.screenshots;
    }

    this.emit('executionCompleted', execution);
  }

  private handleExecutionError(executionId: string, data: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'failed';
    execution.endTime = new Date();
    execution.error = data.error;
    execution.progress = 100;

    this.emit('executionFailed', execution);
  }

  private handleExecutionCancelled(executionId: string, data: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = data.duration;

    this.emit('executionCancelled', execution);
  }

  private handleScreenshot(executionId: string, data: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    execution.screenshots.push(data.filename);
    this.emit('executionUpdated', execution);
  }

  async executeScript(scriptId: string, code: string, parameters: Record<string, any> = {}): Promise<string> {
    try {
      // Fazer requisição para o backend para iniciar execução
      const response = await fetch('/api/executions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          scriptId,
          code,
          parameters,
          config: this.config
        })
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      const executionId = result.data.id;

      // Criar execução local
      const execution: PlaywrightExecution = {
        id: executionId,
        scriptId,
        status: 'pending',
        startTime: new Date(),
        progress: 0,
        logs: [],
        screenshots: []
      };

      this.executions.set(executionId, execution);
      this.emit('executionCreated', execution);

      // Inscrever-se para receber atualizações via WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          executionId
        }));
      }

      return executionId;

    } catch (error) {
      console.error('Erro ao executar script:', error);
      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      const response = await fetch(`/api/executions/${executionId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status}`);
      }

      return true;
    } catch (error) {
      console.error('Erro ao cancelar execução:', error);
      return false;
    }
  }

  getExecution(executionId: string): PlaywrightExecution | undefined {
    return this.executions.get(executionId);
  }

  getAllExecutions(): PlaywrightExecution[] {
    return Array.from(this.executions.values());
  }

  getRunningExecutions(): PlaywrightExecution[] {
    return this.getAllExecutions().filter(exec => exec.status === 'running');
  }

  updateConfig(newConfig: Partial<PlaywrightConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.emit('configUpdated', this.config);
  }

  getConfig(): PlaywrightConfig {
    return { ...this.config };
  }

  clearExecutions() {
    this.executions.clear();
    this.emit('executionsCleared');
  }

  getConnectionStatus(): 'connected' | 'disconnected' | 'connecting' {
    if (!this.ws) return 'disconnected';
    
    switch (this.ws.readyState) {
      case WebSocket.OPEN:
        return 'connected';
      case WebSocket.CONNECTING:
        return 'connecting';
      default:
        return 'disconnected';
    }
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const playwrightService = new PlaywrightService();