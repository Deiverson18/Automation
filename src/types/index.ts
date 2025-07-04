export interface Script {
  id: string;
  name: string;
  description: string;
  code: string;
  parameters: ScriptParameter[];
  createdAt: string;
  updatedAt: string;
  tags: string[];
  status: 'draft' | 'active' | 'disabled';
}

export interface ScriptParameter {
  id: string;
  key: string;
  value: string | number | boolean;
  type: 'string' | 'number' | 'boolean';
  description?: string;
  required?: boolean;
}

export interface ScriptInput {
  name: string;
  description: string;
  code: string;
  tags: string[];
  status: 'draft' | 'active' | 'disabled';
  parameters: ScriptParameter[];
}
export interface Execution {
  id: string;
  scriptId: string;
  scriptName: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  parameters: Record<string, any>;
  logs: LogEntry[];
  result?: any;
  error?: string;
}

export interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: any;
}

export interface SystemStats {
  totalScripts: number;
  activeScripts: number;
  totalExecutions: number;
  successRate: number;
  avgExecutionTime: number;
  runningExecutions: number;
  queuedExecutions: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: string;
  lastLogin: string;
}

export interface Config {
  general: {
    serverPort: number;
    maxConcurrentExecutions: number;
    logLevel: string;
    enableHttps: boolean;
  };
  playwright: {
    defaultBrowser: 'chromium' | 'firefox' | 'webkit';
    headless: boolean;
    timeout: number;
    screenshot: boolean;
    video: boolean;
  };
  security: {
    requireAuth: boolean;
    sessionTimeout: number;
    maxLoginAttempts: number;
    allowedIps: string[];
  };
}