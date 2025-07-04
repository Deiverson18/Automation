import { useState, useEffect } from 'react';
import { Script, Execution, SystemStats, Config } from '../types';
import { playwrightService } from '../services/PlaywrightService';

// Mock data for demonstration
const mockScripts: Script[] = [
  {
    id: '1',
    name: 'Login Test',
    description: 'Automated login testing for web applications',
    code: `const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://example.com/login');
  await page.fill('#username', 'testuser');
  await page.fill('#password', 'testpass');
  await page.click('button[type="submit"]');
  
  await page.waitForSelector('.dashboard');
  console.log('Login successful!');
  
  await browser.close();
})();`,
    parameters: {
      username: 'testuser',
      password: 'testpass',
      url: 'https://example.com/login'
    },
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-20T14:15:00Z',
    tags: ['login', 'authentication', 'web'],
    status: 'active'
  },
  {
    id: '2',
    name: 'E-commerce Checkout',
    description: 'Complete checkout process automation',
    code: `// E-commerce checkout automation
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Navigate to product page
  await page.goto('https://shop.example.com/product/123');
  
  // Add to cart
  await page.click('.add-to-cart');
  await page.waitForSelector('.cart-notification');
  
  // Proceed to checkout
  await page.click('.checkout-btn');
  
  // Fill checkout form
  await page.fill('#email', 'test@example.com');
  await page.fill('#first-name', 'John');
  await page.fill('#last-name', 'Doe');
  
  console.log('Checkout process completed!');
  
  await browser.close();
})();`,
    parameters: {
      productId: '123',
      email: 'test@example.com',
      firstName: 'John',
      lastName: 'Doe'
    },
    createdAt: '2024-01-18T09:00:00Z',
    updatedAt: '2024-01-22T11:30:00Z',
    tags: ['e-commerce', 'checkout', 'shopping'],
    status: 'active'
  },
  {
    id: '3',
    name: 'Form Validation',
    description: 'Test form validation and error handling',
    code: `// Form validation testing
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('https://forms.example.com/contact');
  
  // Test empty form submission
  await page.click('button[type="submit"]');
  await page.waitForSelector('.error-message');
  
  // Test invalid email
  await page.fill('#email', 'invalid-email');
  await page.click('button[type="submit"]');
  
  console.log('Form validation tests completed!');
  
  await browser.close();
})();`,
    parameters: {
      formUrl: 'https://forms.example.com/contact',
      testEmail: 'invalid-email'
    },
    createdAt: '2024-01-20T16:45:00Z',
    updatedAt: '2024-01-20T16:45:00Z',
    tags: ['form', 'validation', 'testing'],
    status: 'draft'
  }
];

const mockExecutions: Execution[] = [
  {
    id: '1',
    scriptId: '1',
    scriptName: 'Login Test',
    status: 'completed',
    startTime: '2024-01-25T10:00:00Z',
    endTime: '2024-01-25T10:02:30Z',
    duration: 150000,
    parameters: { username: 'testuser', password: 'testpass' },
    logs: [
      { timestamp: '2024-01-25T10:00:00Z', level: 'info', message: 'Starting login test' },
      { timestamp: '2024-01-25T10:01:00Z', level: 'info', message: 'Navigating to login page' },
      { timestamp: '2024-01-25T10:02:30Z', level: 'info', message: 'Login successful' }
    ],
    result: { success: true, message: 'Login completed successfully' }
  },
  {
    id: '2',
    scriptId: '2',
    scriptName: 'E-commerce Checkout',
    status: 'running',
    startTime: '2024-01-25T10:05:00Z',
    parameters: { productId: '123', email: 'test@example.com' },
    logs: [
      { timestamp: '2024-01-25T10:05:00Z', level: 'info', message: 'Starting checkout process' },
      { timestamp: '2024-01-25T10:06:00Z', level: 'info', message: 'Product added to cart' }
    ]
  },
  {
    id: '3',
    scriptId: '1',
    scriptName: 'Login Test',
    status: 'failed',
    startTime: '2024-01-25T09:30:00Z',
    endTime: '2024-01-25T09:31:00Z',
    duration: 60000,
    parameters: { username: 'wronguser', password: 'wrongpass' },
    logs: [
      { timestamp: '2024-01-25T09:30:00Z', level: 'info', message: 'Starting login test' },
      { timestamp: '2024-01-25T09:31:00Z', level: 'error', message: 'Login failed: Invalid credentials' }
    ],
    error: 'Invalid credentials provided'
  }
];

const mockStats: SystemStats = {
  totalScripts: 3,
  activeScripts: 2,
  totalExecutions: 45,
  successRate: 87.5,
  avgExecutionTime: 125000,
  runningExecutions: 1,
  queuedExecutions: 0
};

export const useApi = () => {
  const [scripts, setScripts] = useState<Script[]>([]);
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Carregar scripts do backend
        const scriptsResult = await playwrightService.getScripts({
          page: 1,
          limit: 100,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        });
        
        setScripts(scriptsResult.scripts);
        
        // Usar dados mock para execuções e stats por enquanto
        setExecutions(mockExecutions);
        setStats(mockStats);
        
      } catch (err) {
        console.error('Erro ao carregar dados:', err);
        setError(err instanceof Error ? err.message : 'Erro ao carregar dados');
        
        // Fallback para dados mock em caso de erro
        setScripts(mockScripts);
        setExecutions(mockExecutions);
        setStats(mockStats);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
    
    // Configurar listeners para atualizações em tempo real
    const handleScriptCreated = (script: Script) => {
      setScripts(prev => [script, ...prev]);
    };
    
    const handleScriptUpdated = (script: Script) => {
      setScripts(prev => prev.map(s => s.id === script.id ? script : s));
    };
    
    const handleScriptDeleted = ({ scriptId }: { scriptId: string }) => {
      setScripts(prev => prev.filter(s => s.id !== scriptId));
    };
    
    playwrightService.on('scriptCreated', handleScriptCreated);
    playwrightService.on('scriptUpdated', handleScriptUpdated);
    playwrightService.on('scriptDeleted', handleScriptDeleted);
    
    return () => {
      playwrightService.off('scriptCreated', handleScriptCreated);
      playwrightService.off('scriptUpdated', handleScriptUpdated);
      playwrightService.off('scriptDeleted', handleScriptDeleted);
    };
  }, []);

  const createScript = async (script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setError(null);
      const newScript = await playwrightService.createScript(script);
      // O script será adicionado automaticamente via evento 'scriptCreated'
      return newScript;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar script';
      setError(errorMessage);
      throw err;
    }
  };

  const updateScript = async (id: string, updates: Partial<Script>) => {
    try {
      setError(null);
      const updatedScript = await playwrightService.updateScript(id, updates);
      // O script será atualizado automaticamente via evento 'scriptUpdated'
      return updatedScript;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar script';
      setError(errorMessage);
      throw err;
    }
  };

  const deleteScript = async (id: string) => {
    try {
      setError(null);
      await playwrightService.deleteScript(id);
      // O script será removido automaticamente via evento 'scriptDeleted'
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao deletar script';
      setError(errorMessage);
      throw err;
    }
  };

  const executeScript = async (scriptId: string, parameters: Record<string, any>) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    try {
      setError(null);
      const executionId = await playwrightService.executeScript(scriptId, script.code, parameters);
      
      // Criar execução local para exibição imediata
      const newExecution: Execution = {
        id: executionId,
        scriptId,
        scriptName: script.name,
        status: 'queued',
        startTime: new Date().toISOString(),
        parameters,
        logs: [
          { timestamp: new Date().toISOString(), level: 'info', message: 'Execution queued' }
        ]
      };

      setExecutions(prev => [newExecution, ...prev]);
      return newExecution;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao executar script';
      setError(errorMessage);
      throw err;
    }
  };

  const cancelExecution = async (executionId: string) => {
    try {
      setError(null);
      const success = await playwrightService.cancelExecution(executionId);
      
      if (success) {
        setExecutions(prev => prev.map(exec => 
          exec.id === executionId 
            ? { ...exec, status: 'cancelled', endTime: new Date().toISOString() }
            : exec
        ));
      }
      
      return success;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao cancelar execução';
      setError(errorMessage);
      throw err;
    }
  };

  return {
    scripts,
    executions,
    stats,
    isLoading,
    error,
    createScript,
    updateScript,
    deleteScript,
    executeScript,
    cancelExecution
  };
};