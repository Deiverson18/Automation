import { useState, useEffect } from 'react';
import { Script, Execution, SystemStats, Config } from '../types';

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

  useEffect(() => {
    // Simulate API calls
    const loadData = async () => {
      setIsLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      setScripts(mockScripts);
      setExecutions(mockExecutions);
      setStats(mockStats);
      setIsLoading(false);
    };

    loadData();
  }, []);

  const createScript = async (script: Omit<Script, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newScript: Script = {
      ...script,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setScripts(prev => [...prev, newScript]);
    return newScript;
  };

  const updateScript = async (id: string, updates: Partial<Script>) => {
    setScripts(prev => prev.map(script => 
      script.id === id 
        ? { ...script, ...updates, updatedAt: new Date().toISOString() }
        : script
    ));
  };

  const deleteScript = async (id: string) => {
    setScripts(prev => prev.filter(script => script.id !== id));
  };

  const executeScript = async (scriptId: string, parameters: Record<string, any>) => {
    const script = scripts.find(s => s.id === scriptId);
    if (!script) return;

    const newExecution: Execution = {
      id: Date.now().toString(),
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

    // Simulate execution progress
    setTimeout(() => {
      setExecutions(prev => prev.map(exec => 
        exec.id === newExecution.id 
          ? { ...exec, status: 'running', logs: [...exec.logs, 
              { timestamp: new Date().toISOString(), level: 'info', message: 'Execution started' }
            ]}
          : exec
      ));
    }, 1000);

    return newExecution;
  };

  const cancelExecution = async (executionId: string) => {
    setExecutions(prev => prev.map(exec => 
      exec.id === executionId 
        ? { ...exec, status: 'cancelled', endTime: new Date().toISOString() }
        : exec
    ));
  };

  return {
    scripts,
    executions,
    stats,
    isLoading,
    createScript,
    updateScript,
    deleteScript,
    executeScript,
    cancelExecution
  };
};