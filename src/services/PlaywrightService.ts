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
    this.setupWebSocket();
  }

  private setupWebSocket() {
    // Simular WebSocket para comunicação em tempo real
    // Em produção, conectaria com o backend real
    console.log('WebSocket connection established');
  }

  async executeScript(scriptId: string, code: string, parameters: Record<string, any> = {}): Promise<string> {
    const executionId = `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
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

    // Simular execução assíncrona
    this.simulateExecution(executionId, code, parameters);

    return executionId;
  }

  private async simulateExecution(executionId: string, code: string, parameters: Record<string, any>) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    try {
      // Iniciar execução
      execution.status = 'running';
      this.addLog(executionId, 'info', 'Iniciando execução do script Playwright');
      this.emit('executionUpdated', execution);

      // Simular progresso
      const steps = [
        { progress: 10, message: 'Inicializando navegador...' },
        { progress: 25, message: 'Carregando página...' },
        { progress: 50, message: 'Executando ações...' },
        { progress: 75, message: 'Coletando dados...' },
        { progress: 90, message: 'Capturando screenshots...' },
        { progress: 100, message: 'Execução concluída!' }
      ];

      for (const step of steps) {
        if (execution.status === 'cancelled') {
          this.addLog(executionId, 'warn', 'Execução cancelada pelo usuário');
          return;
        }

        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
        
        execution.progress = step.progress;
        this.addLog(executionId, 'info', step.message);
        
        // Simular screenshot
        if (step.progress === 50 || step.progress === 90) {
          execution.screenshots.push(`screenshot_${Date.now()}.png`);
          this.addLog(executionId, 'debug', `Screenshot capturado: screenshot_${Date.now()}.png`);
        }

        this.emit('executionUpdated', execution);
      }

      // Finalizar com sucesso
      execution.status = 'completed';
      execution.endTime = new Date();
      execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
      execution.result = {
        success: true,
        data: { elementsFound: 5, actionsPerformed: 3 }
      };

      this.addLog(executionId, 'info', `Execução concluída em ${execution.duration}ms`);
      this.emit('executionCompleted', execution);

    } catch (error) {
      execution.status = 'failed';
      execution.endTime = new Date();
      execution.duration = execution.endTime!.getTime() - execution.startTime.getTime();
      execution.error = error instanceof Error ? error.message : 'Erro desconhecido';
      
      this.addLog(executionId, 'error', `Erro na execução: ${execution.error}`);
      this.emit('executionFailed', execution);
    }
  }

  private addLog(executionId: string, level: PlaywrightLog['level'], message: string, data?: any) {
    const execution = this.executions.get(executionId);
    if (!execution) return;

    const log: PlaywrightLog = {
      timestamp: new Date(),
      level,
      message,
      data
    };

    execution.logs.push(log);
    this.emit('logAdded', { executionId, log });
  }

  cancelExecution(executionId: string): boolean {
    const execution = this.executions.get(executionId);
    if (!execution || execution.status !== 'running') {
      return false;
    }

    execution.status = 'cancelled';
    execution.endTime = new Date();
    execution.duration = execution.endTime.getTime() - execution.startTime.getTime();
    
    this.addLog(executionId, 'warn', 'Execução cancelada');
    this.emit('executionCancelled', execution);
    
    return true;
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
}

export const playwrightService = new PlaywrightService();