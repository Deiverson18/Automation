/**
 * Script de Seed para Popular Banco de Dados
 * 
 * Popula o banco com dados de exemplo para desenvolvimento e testes
 * 
 * @author Playwright Hub Database Team
 * @version 1.0.0
 */

const DatabaseManager = require('./DatabaseManager');
const bcrypt = require('bcrypt');

class DatabaseSeeder {
  constructor() {
    this.dbManager = new DatabaseManager();
  }

  /**
   * Executa o seed completo do banco de dados
   */
  async seed() {
    try {
      console.log('🌱 Iniciando seed do banco de dados...');
      
      await this.dbManager.connect();
      
      // Seed em ordem de dependência
      await this.seedUsers();
      await this.seedScripts();
      await this.seedExecutions();
      await this.seedSystemConfig();
      await this.seedSecurityMetrics();
      
      console.log('✅ Seed concluído com sucesso!');
      
    } catch (error) {
      console.error('❌ Erro no seed:', error);
      throw error;
    } finally {
      await this.dbManager.disconnect();
    }
  }

  /**
   * Popula tabela de usuários
   */
  async seedUsers() {
    console.log('👥 Criando usuários...');
    
    const users = [
      {
        username: 'admin',
        email: 'admin@playwright.local',
        password: await bcrypt.hash('admin', 10),
        role: 'admin'
      },
      {
        username: 'developer',
        email: 'dev@playwright.local',
        password: await bcrypt.hash('dev123', 10),
        role: 'user'
      },
      {
        username: 'security',
        email: 'security@playwright.local',
        password: await bcrypt.hash('sec123', 10),
        role: 'security'
      }
    ];

    for (const userData of users) {
      try {
        await this.dbManager.prisma.user.create({ data: userData });
        console.log(`  ✓ Usuário criado: ${userData.username}`);
      } catch (error) {
        if (error.code === 'P2002') {
          console.log(`  ⚠ Usuário já existe: ${userData.username}`);
        } else {
          throw error;
        }
      }
    }
  }

  /**
   * Popula tabela de scripts
   */
  async seedScripts() {
    console.log('📝 Criando scripts de exemplo...');
    
    const scripts = [
      {
        name: 'Login Test',
        description: 'Teste automatizado de login para aplicações web',
        code: `// Teste de login automatizado
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para página de login
    await page.goto('https://example.com/login');
    console.log('[PLAYWRIGHT] Navegando para página de login');
    
    // Preencher credenciais
    await page.fill('#username', 'testuser');
    await page.fill('#password', 'testpass');
    console.log('[PLAYWRIGHT] Preenchendo credenciais');
    
    // Fazer login
    await page.click('button[type="submit"]');
    console.log('[PLAYWRIGHT] Clicando no botão de login');
    
    // Aguardar redirecionamento
    await page.waitForSelector('.dashboard', { timeout: 5000 });
    console.log('[PLAYWRIGHT] Login realizado com sucesso');
    
    // Exportar resultado
    console.log('EXPORT_DATA::', JSON.stringify({
      loginResult: {
        status: 'success',
        timestamp: Date.now(),
        redirectUrl: page.url()
      }
    }));
    
    // Capturar screenshot
    await page.screenshot({ path: 'login-success.png' });
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro no login:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      loginResult: {
        status: 'error',
        error: error.message,
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`,
        parameters: JSON.stringify({
          username: 'testuser',
          password: 'testpass',
          loginUrl: 'https://example.com/login'
        }),
        tags: JSON.stringify(['login', 'authentication', 'web', 'test']),
        status: 'active'
      },
      {
        name: 'E-commerce Product Search',
        description: 'Busca e extração de dados de produtos em loja online',
        code: `// Busca de produtos em e-commerce
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para loja
    await page.goto('https://shop.example.com');
    console.log('[PLAYWRIGHT] Navegando para loja online');
    
    // Buscar produto
    await page.fill('#search', 'smartphone');
    await page.press('#search', 'Enter');
    console.log('[PLAYWRIGHT] Buscando produtos');
    
    // Aguardar resultados
    await page.waitForSelector('.product-item', { timeout: 10000 });
    
    // Extrair dados dos produtos
    const products = await page.$$eval('.product-item', items => 
      items.map(item => ({
        name: item.querySelector('.product-name')?.textContent?.trim(),
        price: item.querySelector('.product-price')?.textContent?.trim(),
        rating: item.querySelector('.rating')?.textContent?.trim(),
        image: item.querySelector('img')?.src,
        link: item.querySelector('a')?.href
      })).filter(product => product.name && product.price)
    );
    
    console.log('[PLAYWRIGHT] Produtos extraídos:', products.length);
    
    // Exportar dados
    console.log('EXPORT_DATA::', JSON.stringify({
      searchResults: {
        query: 'smartphone',
        products: products,
        count: products.length,
        timestamp: Date.now()
      }
    }));
    
    // Capturar screenshot
    await page.screenshot({ path: 'search-results.png', fullPage: true });
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro na busca:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      searchError: {
        message: error.message,
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`,
        parameters: JSON.stringify({
          searchTerm: 'smartphone',
          storeUrl: 'https://shop.example.com',
          maxResults: 20
        }),
        tags: JSON.stringify(['ecommerce', 'search', 'products', 'data-extraction']),
        status: 'active'
      },
      {
        name: 'Form Validation Test',
        description: 'Teste de validação de formulários web',
        code: `// Teste de validação de formulário
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para formulário
    await page.goto('https://forms.example.com/contact');
    console.log('[PLAYWRIGHT] Navegando para formulário');
    
    // Teste 1: Submissão com campos vazios
    await page.click('button[type="submit"]');
    await page.waitForSelector('.error-message', { timeout: 3000 });
    
    const emptyFieldErrors = await page.$$eval('.error-message', 
      errors => errors.map(e => e.textContent?.trim())
    );
    
    console.log('[PLAYWRIGHT] Erros de campos vazios detectados');
    
    // Teste 2: Email inválido
    await page.fill('#email', 'email-invalido');
    await page.click('button[type="submit"]');
    
    const emailError = await page.$eval('#email + .error', 
      el => el.textContent?.trim()
    ).catch(() => null);
    
    // Teste 3: Formulário válido
    await page.fill('#name', 'João Silva');
    await page.fill('#email', 'joao@example.com');
    await page.fill('#message', 'Mensagem de teste');
    
    await page.click('button[type="submit"]');
    await page.waitForSelector('.success-message', { timeout: 5000 });
    
    const successMessage = await page.$eval('.success-message', 
      el => el.textContent?.trim()
    );
    
    console.log('[PLAYWRIGHT] Formulário enviado com sucesso');
    
    // Exportar resultados dos testes
    console.log('EXPORT_DATA::', JSON.stringify({
      validationTests: {
        emptyFields: {
          errors: emptyFieldErrors,
          passed: emptyFieldErrors.length > 0
        },
        invalidEmail: {
          error: emailError,
          passed: !!emailError
        },
        validSubmission: {
          success: successMessage,
          passed: !!successMessage
        },
        timestamp: Date.now()
      }
    }));
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro no teste de formulário:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      testError: {
        message: error.message,
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`,
        parameters: JSON.stringify({
          formUrl: 'https://forms.example.com/contact',
          testData: {
            name: 'João Silva',
            email: 'joao@example.com',
            message: 'Mensagem de teste'
          }
        }),
        tags: JSON.stringify(['form', 'validation', 'testing', 'web']),
        status: 'draft'
      },
      {
        name: 'Performance Monitoring',
        description: 'Monitoramento de performance de páginas web',
        code: `// Monitoramento de performance
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    const startTime = Date.now();
    
    // Navegar e medir tempo de carregamento
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    const loadTime = Date.now() - startTime;
    
    console.log('[PLAYWRIGHT] Página carregada em', loadTime, 'ms');
    
    // Obter métricas de performance
    const metrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize
      };
    });
    
    // Obter informações da página
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      url: location.href,
      images: document.images.length,
      links: document.links.length,
      scripts: document.scripts.length
    }));
    
    console.log('[PLAYWRIGHT] Métricas coletadas');
    
    // Exportar dados de performance
    console.log('EXPORT_DATA::', JSON.stringify({
      performanceMetrics: {
        ...metrics,
        totalLoadTime: loadTime,
        pageInfo: pageInfo,
        timestamp: Date.now()
      }
    }));
    
    // Capturar screenshot
    await page.screenshot({ path: 'performance-test.png' });
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro no monitoramento:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      performanceError: {
        message: error.message,
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`,
        parameters: JSON.stringify({
          targetUrl: 'https://example.com',
          waitForNetworkIdle: true,
          captureScreenshot: true
        }),
        tags: JSON.stringify(['performance', 'monitoring', 'metrics', 'web']),
        status: 'active'
      }
    ];

    for (const scriptData of scripts) {
      try {
        const script = await this.dbManager.createScript(scriptData);
        console.log(`  ✓ Script criado: ${script.name}`);
      } catch (error) {
        console.log(`  ⚠ Erro ao criar script: ${scriptData.name}`, error.message);
      }
    }
  }

  /**
   * Popula tabela de execuções (exemplos históricos)
   */
  async seedExecutions() {
    console.log('🚀 Criando execuções de exemplo...');
    
    // Buscar scripts criados
    const scripts = await this.dbManager.prisma.script.findMany();
    
    if (scripts.length === 0) {
      console.log('  ⚠ Nenhum script encontrado para criar execuções');
      return;
    }

    const executions = [
      {
        scriptId: scripts[0].id,
        scriptName: scripts[0].name,
        status: 'completed',
        startTime: new Date(Date.now() - 3600000), // 1 hora atrás
        endTime: new Date(Date.now() - 3540000),   // 59 minutos atrás
        duration: 60000, // 1 minuto
        progress: 100,
        parameters: JSON.stringify({ username: 'testuser', password: 'testpass' }),
        logs: JSON.stringify([
          { timestamp: new Date().toISOString(), level: 'info', message: 'Execução iniciada' },
          { timestamp: new Date().toISOString(), level: 'info', message: 'Login realizado com sucesso' },
          { timestamp: new Date().toISOString(), level: 'info', message: 'Execução concluída' }
        ]),
        result: JSON.stringify({
          loginResult: { status: 'success', timestamp: Date.now() }
        }),
        securityLevel: 'HIGH'
      },
      {
        scriptId: scripts[1]?.id || scripts[0].id,
        scriptName: scripts[1]?.name || scripts[0].name,
        status: 'failed',
        startTime: new Date(Date.now() - 7200000), // 2 horas atrás
        endTime: new Date(Date.now() - 7140000),   // 1h59min atrás
        duration: 60000,
        progress: 75,
        parameters: JSON.stringify({ searchTerm: 'smartphone' }),
        logs: JSON.stringify([
          { timestamp: new Date().toISOString(), level: 'info', message: 'Execução iniciada' },
          { timestamp: new Date().toISOString(), level: 'error', message: 'Timeout ao aguardar elementos' }
        ]),
        error: 'Timeout: Elemento não encontrado após 10000ms',
        securityLevel: 'HIGH'
      }
    ];

    for (const executionData of executions) {
      try {
        const execution = await this.dbManager.createExecution({
          ...executionData,
          id: `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        });
        console.log(`  ✓ Execução criada: ${execution.id}`);
      } catch (error) {
        console.log(`  ⚠ Erro ao criar execução:`, error.message);
      }
    }
  }

  /**
   * Popula configurações do sistema
   */
  async seedSystemConfig() {
    console.log('⚙️ Configurando sistema...');
    
    const configs = [
      {
        key: 'max_concurrent_executions',
        value: '5',
        description: 'Número máximo de execuções simultâneas',
        category: 'performance'
      },
      {
        key: 'default_timeout',
        value: '30000',
        description: 'Timeout padrão para execuções (ms)',
        category: 'performance'
      },
      {
        key: 'enable_quarantine',
        value: 'true',
        description: 'Habilitar quarentena de código malicioso',
        category: 'security'
      },
      {
        key: 'log_retention_days',
        value: '30',
        description: 'Dias para manter logs do sistema',
        category: 'maintenance'
      }
    ];

    for (const configData of configs) {
      try {
        await this.dbManager.prisma.systemConfig.upsert({
          where: { key: configData.key },
          update: configData,
          create: {
            ...configData,
            id: `cfg_${configData.key}`
          }
        });
        console.log(`  ✓ Configuração: ${configData.key}`);
      } catch (error) {
        console.log(`  ⚠ Erro na configuração ${configData.key}:`, error.message);
      }
    }
  }

  /**
   * Popula métricas de segurança iniciais
   */
  async seedSecurityMetrics() {
    console.log('🔒 Criando métricas de segurança...');
    
    const metrics = {
      totalExecutions: 150,
      blockedExecutions: 5,
      timeoutExecutions: 8,
      memoryViolations: 2,
      cpuViolations: 1,
      quarantinedScripts: 3,
      avgExecutionTime: 45.5,
      avgSanitizationTime: 2.1,
      avgValidationTime: 1.8
    };

    try {
      await this.dbManager.recordSecurityMetrics(metrics);
      console.log('  ✓ Métricas de segurança criadas');
    } catch (error) {
      console.log('  ⚠ Erro ao criar métricas:', error.message);
    }
  }

  /**
   * Limpa todos os dados do banco (para reset)
   */
  async clean() {
    console.log('🧹 Limpando banco de dados...');
    
    try {
      await this.dbManager.connect();
      
      // Limpar em ordem reversa de dependência
      await this.dbManager.prisma.userSession.deleteMany();
      await this.dbManager.prisma.execution.deleteMany();
      await this.dbManager.prisma.systemLog.deleteMany();
      await this.dbManager.prisma.quarantinedCode.deleteMany();
      await this.dbManager.prisma.securityMetric.deleteMany();
      await this.dbManager.prisma.script.deleteMany();
      await this.dbManager.prisma.systemConfig.deleteMany();
      await this.dbManager.prisma.user.deleteMany();
      
      console.log('✅ Banco de dados limpo!');
      
    } catch (error) {
      console.error('❌ Erro na limpeza:', error);
      throw error;
    } finally {
      await this.dbManager.disconnect();
    }
  }
}

// Executar seed se chamado diretamente
if (require.main === module) {
  const seeder = new DatabaseSeeder();
  
  const command = process.argv[2];
  
  if (command === 'clean') {
    seeder.clean()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  } else {
    seeder.seed()
      .then(() => process.exit(0))
      .catch(error => {
        console.error(error);
        process.exit(1);
      });
  }
}

module.exports = DatabaseSeeder;