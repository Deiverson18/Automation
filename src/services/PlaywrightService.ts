import { EventEmitter } from '../utils/EventEmitter';
import { Script, Execution, SystemStats, ScriptParameter } from '../types';

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
  private heartbeatInterval: number | null = null;
  private apiBasePath: string;
  private scripts: Script[] = [];
  private systemStats: SystemStats | null = null;
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
    // Determinar o caminho base da API baseado no ambiente
    this.apiBasePath = this.determineApiBasePath();
    this.connectWebSocket();
  }

  /**
   * Determina o caminho base da API baseado no ambiente atual
   */
  private determineApiBasePath(): string {
    // Em produção, a API está no mesmo servidor que serve o frontend
    // Em desenvolvimento, a API está em um servidor separado (geralmente na porta 3000)
    if (process.env.NODE_ENV === 'development') {
      return 'http://localhost:3000/api';
    }
    
    // Em produção, usamos o caminho relativo
    return '/api';
  }

  // === GETTERS ===
  
  /**
   * Retorna os scripts em cache
   */
  getCachedScripts(): Script[] {
    return [...this.scripts];
  }
  
  /**
   * Retorna as estatísticas do sistema em cache
   */
  getCachedStats(): SystemStats | null {
    return this.systemStats;
  }

  private connectWebSocket() {
    try {
      // Determinar URL do WebSocket baseado no ambiente
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.hostname;
      const port = process.env.NODE_ENV === 'development' ? '3001' : window.location.port;
      const wsUrl = `${protocol}//${host}:${port}`;
      
      console.log(`🔌 Conectando ao WebSocket: ${wsUrl}`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log('✅ WebSocket conectado ao servidor Playwright');
        this.reconnectAttempts = 0;
        this.emit('connected');
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

      this.ws.onclose = (event) => {
        console.log(`🔌 WebSocket desconectado (código: ${event.code})`);
        this.emit('disconnected');
        this.stopHeartbeat();
        
        // Tentar reconectar apenas se não foi um fechamento intencional
        if (event.code !== 1000) {
          this.attemptReconnect();
        }
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
    this.stopHeartbeat(); // Limpar interval anterior se existir
    
    this.heartbeatInterval = window.setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'PING' }));
      }
    }, 30000); // Ping a cada 30 segundos
  }

  private stopHeartbeat() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private handleWebSocketMessage(message: any) {
    const { type, executionId, data } = message;

    switch (type) {
      case 'CONNECTED':
        console.log('🎉 Conectado ao servidor Playwright Hub');
        break;

      case 'SUBSCRIBED':
        console.log(`📡 Inscrito para receber atualizações da execução ${executionId}`);
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
      console.log(`🚀 Iniciando execução do script ${scriptId}`);
      
      // Fazer requisição para o backend para iniciar execução
      const response = await fetch(`${this.apiBasePath}/executions`, {
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
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      const executionId = result.data.id;

      // Criar execução local
      const execution: Execution = {
        id: executionId,
        scriptId,
        scriptName: '',  // Será preenchido pelo backend
        status: 'pending',
        startTime: new Date(),
        parameters,
        progress: 0,
        logs: [{
          timestamp: new Date().toISOString(),
          level: 'info',
          message: 'Execução iniciada'
        }]
      };

      this.emit('executionCreated', execution);

      // Inscrever-se para receber atualizações via WebSocket
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({
          type: 'SUBSCRIBE',
          executionId
        }));
      } else {
        console.warn('⚠️ WebSocket não conectado, não será possível receber atualizações em tempo real');
      }

      return executionId;

    } catch (error) {
      console.error('Erro ao executar script:', error);
      throw error;
    }
  }

  async cancelExecution(executionId: string): Promise<boolean> {
    try {
      console.log(`🛑 Cancelando execução ${executionId}`);
      
      const response = await fetch(`${this.apiBasePath}/executions/${executionId}/cancel`, {
        method: 'POST'
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
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
    console.log('⚙️ Configuração do Playwright atualizada:', this.config);
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

  // === API METHODS ===

  /**
   * Busca estatísticas do sistema
   */
  async getSystemStats(): Promise<SystemStats> {
    try {
      console.log('📊 Buscando estatísticas do sistema');
      
      const response = await fetch(`${this.apiBasePath}/stats`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao buscar estatísticas');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Erro ao buscar estatísticas:', error);
      throw error;
    }
  }

  /**
   * Busca execuções com filtros opcionais
   */
  async getExecutions(options: {
    page?: number;
    limit?: number;
    status?: string;
    scriptId?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    executions: Execution[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      console.log('📋 Listando execuções com filtros:', options);
      
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.status) params.append('status', options.status);
      if (options.scriptId) params.append('scriptId', options.scriptId);
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      
      const response = await fetch(`${this.apiBasePath}/executions?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao listar execuções');
      }

      return {
        executions: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('❌ Erro ao listar execuções:', error);
      throw error;
    }
  }

  // === SCRIPT MANAGEMENT METHODS ===

  /**
   * Cria um novo script
   */
  async createScript(scriptData: Omit<Script, 'id' | 'createdAt' | 'updatedAt'> | any): Promise<Script> {
    try {
      console.log('🆕 Criando novo script:', scriptData.name);
      
      const response = await fetch(`${this.apiBasePath}/scripts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scriptData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao criar script');
      }

      console.log('✅ Script criado com sucesso:', result.data.id);
      
      // Atualizar cache local
      this.scripts = [result.data, ...this.scripts];
      this.emit('scriptCreated', result.data);
      
      return result.data;
    } catch (error) {
      console.error('❌ Erro ao criar script:', error);
      this.emit('scriptError', { operation: 'create', error });
      throw error;
    }
  }

  /**
   * Atualiza um script existente
   */
  async updateScript(scriptId: string, scriptData: Partial<Omit<Script, 'id' | 'createdAt' | 'updatedAt'>> | any): Promise<Script> {
    try {
      console.log('📝 Atualizando script:', scriptId);
      
      const response = await fetch(`${this.apiBasePath}/scripts/${scriptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(scriptData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        
        if (response.status === 404) {
          throw new Error('Script não encontrado');
        }
        
        if (response.status === 400) {
          throw new Error(errorData.details ? 
            errorData.details.map((d: any) => d.msg).join(', ') : 
            errorData.error || 'Dados inválidos'
          );
        }
        
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao atualizar script');
      }

      console.log('✅ Script atualizado com sucesso:', scriptId);
      
      // Atualizar cache local
      this.scripts = this.scripts.map(script => 
        script.id === scriptId ? result.data : script
      );
      this.emit('scriptUpdated', result.data);
      
      return result.data;
    } catch (error) {
      console.error('❌ Erro ao atualizar script:', error);
      this.emit('scriptError', { operation: 'update', error, scriptId });
      throw error;
    }
  }

  /**
   * Busca um script por ID
   */
  async getScript(scriptId: string): Promise<Script> {
    try {
      console.log('🔍 Buscando script:', scriptId);
      
      const response = await fetch(`${this.apiBasePath}/scripts/${scriptId}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Script não encontrado');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao buscar script');
      }

      return result.data;
    } catch (error) {
      console.error('❌ Erro ao buscar script:', error);
      this.emit('scriptError', { operation: 'get', error, scriptId });
      throw error;
    }
  }

  /**
   * Lista todos os scripts com filtros opcionais
   */
  async getScripts(options: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
    tags?: string[];
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  } = {}): Promise<{
    scripts: Script[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> {
    try {
      console.log('📋 Listando scripts com filtros:', options);
      
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.status) params.append('status', options.status);
      if (options.search) params.append('search', options.search);
      if (options.tags?.length) params.append('tags', options.tags.join(','));
      if (options.sortBy) params.append('sortBy', options.sortBy);
      if (options.sortOrder) params.append('sortOrder', options.sortOrder);
      
      const response = await fetch(`${this.apiBasePath}/scripts?${params.toString()}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      this.scripts = result.data;
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao listar scripts');
      }

      return {
        scripts: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('❌ Erro ao listar scripts:', error);
      this.emit('scriptError', { operation: 'list', error });
      throw error;
    }
  }

  /**
   * Deleta um script
   */
  async deleteScript(scriptId: string): Promise<void> {
    try {
      console.log('🗑️ Deletando script:', scriptId);
      
      const response = await fetch(`${this.apiBasePath}/scripts/${scriptId}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Script não encontrado');
        }
        
        const errorData = await response.json();
        throw new Error(errorData.error || `Erro HTTP: ${response.status}`);
      }

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Falha ao deletar script');
      }

      console.log('✅ Script deletado com sucesso:', scriptId);
      
      // Atualizar cache local
      this.scripts = this.scripts.filter(script => script.id !== scriptId);
      this.emit('scriptDeleted', { scriptId });
      
    } catch (error) {
      console.error('❌ Erro ao deletar script:', error);
      this.emit('scriptError', { operation: 'delete', error, scriptId });
      throw error;
    }
  }

  /**
   * Carrega todos os dados necessários para a aplicação
   * Retorna scripts, execuções e estatísticas
   */
  async loadAppData(): Promise<{
    scripts: Script[];
    executions: Execution[];
    stats: SystemStats;
  }> {
    try {
      console.log('🔄 Carregando dados da aplicação');
      
      // Carregar dados em paralelo para melhor performance
      const [scriptsResult, executionsResult, stats] = await Promise.all([
        this.getScripts({ limit: 100, sortBy: 'updatedAt', sortOrder: 'desc' }),
        this.getExecutions({ limit: 20, sortBy: 'startTime', sortOrder: 'desc' }),
        this.getSystemStats()
      ]);
      
      console.log('✅ Dados carregados com sucesso');
      
      // Atualizar cache local
      this.scripts = scriptsResult.scripts;
      this.systemStats = stats;
      
      return {
        scripts: scriptsResult.scripts,
        executions: executionsResult.executions,
        stats
      };
    } catch (error) {
      console.error('❌ Erro ao carregar dados da aplicação:', error);
      throw error;
    }
  }

  disconnect() {
    console.log('🔌 Desconectando WebSocket...');
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(1000, 'Desconexão intencional');
      this.ws = null;
    }
  }

  // Método para reconectar manualmente
  reconnect() {
    console.log('🔄 Reconectando WebSocket manualmente...');
    this.disconnect();
    this.reconnectAttempts = 0;
    setTimeout(() => this.connectWebSocket(), 1000);
  }
}

// Exportar instância singleton
export const playwrightService = new PlaywrightService();

// Adicionar ao window para debug (apenas em desenvolvimento)
if (process.env.NODE_ENV === 'development') {
  (window as any).playwrightService = playwrightService;
}