import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Code, Copy, FileText, CheckCircle } from 'lucide-react';

interface ScriptTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  code: string;
  tags: string[];
}

const scriptTemplates: ScriptTemplate[] = [
  {
    id: 'data-export-basic',
    name: 'Exportação Básica de Dados',
    description: 'Template básico para exportar dados de uma página',
    category: 'Exportação',
    tags: ['export', 'data', 'basic'],
    code: `// Template: Exportação Básica de Dados
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para a página
    await page.goto('https://example.com');
    console.log('[PLAYWRIGHT] Navegando para a página');
    
    // Exportar dados básicos da página
    const pageTitle = await page.title();
    const pageUrl = page.url();
    
    // Usar sistema de exportação padronizado
    console.log('EXPORT_DATA::', JSON.stringify({
      pageInfo: {
        title: pageTitle,
        url: pageUrl,
        timestamp: Date.now()
      }
    }));
    
    // Extrair dados específicos (exemplo: lista de links)
    const links = await page.$$eval('a', anchors => 
      anchors.map(a => ({
        text: a.textContent?.trim(),
        href: a.href,
        target: a.target
      })).filter(link => link.text && link.href)
    );
    
    // Exportar lista de links
    console.log('EXPORT_DATA::', JSON.stringify({
      links: {
        items: links,
        count: links.length,
        extractedAt: Date.now()
      }
    }));
    
    console.log('[PLAYWRIGHT] Dados exportados com sucesso');
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro na execução:', error.message);
    
    // Exportar erro
    console.log('EXPORT_DATA::', JSON.stringify({
      error: {
        message: error.message,
        timestamp: Date.now(),
        context: 'data_extraction'
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`
  },
  {
    id: 'form-data-export',
    name: 'Exportação de Dados de Formulário',
    description: 'Preenche formulário e exporta dados de resposta',
    category: 'Formulários',
    tags: ['form', 'export', 'data'],
    code: `// Template: Exportação de Dados de Formulário
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para formulário
    await page.goto('https://example.com/contact');
    console.log('[PLAYWRIGHT] Navegando para formulário');
    
    // Dados do formulário
    const formData = {
      name: 'João Silva',
      email: 'joao@example.com',
      message: 'Mensagem de teste'
    };
    
    // Preencher formulário
    await page.fill('#name', formData.name);
    await page.fill('#email', formData.email);
    await page.fill('#message', formData.message);
    
    console.log('[PLAYWRIGHT] Formulário preenchido');
    
    // Exportar dados do formulário
    console.log('EXPORT_DATA::', JSON.stringify({
      formSubmission: {
        data: formData,
        timestamp: Date.now(),
        formUrl: page.url()
      }
    }));
    
    // Submeter formulário
    await page.click('button[type="submit"]');
    
    // Aguardar resposta
    await page.waitForSelector('.success-message, .error-message', { timeout: 10000 });
    
    // Verificar resultado
    const successMessage = await page.$('.success-message');
    const errorMessage = await page.$('.error-message');
    
    if (successMessage) {
      const message = await successMessage.textContent();
      console.log('EXPORT_DATA::', JSON.stringify({
        formResult: {
          status: 'success',
          message: message?.trim(),
          timestamp: Date.now()
        }
      }));
    } else if (errorMessage) {
      const message = await errorMessage.textContent();
      console.log('EXPORT_DATA::', JSON.stringify({
        formResult: {
          status: 'error',
          message: message?.trim(),
          timestamp: Date.now()
        }
      }));
    }
    
    console.log('[PLAYWRIGHT] Formulário processado com sucesso');
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro no formulário:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      error: {
        message: error.message,
        context: 'form_processing',
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`
  },
  {
    id: 'ecommerce-data-export',
    name: 'Exportação de Dados E-commerce',
    description: 'Extrai dados de produtos de uma loja online',
    category: 'E-commerce',
    tags: ['ecommerce', 'products', 'export'],
    code: `// Template: Exportação de Dados E-commerce
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Navegar para loja
    await page.goto('https://shop.example.com/products');
    console.log('[PLAYWRIGHT] Navegando para loja online');
    
    // Aguardar carregamento dos produtos
    await page.waitForSelector('.product-item', { timeout: 10000 });
    
    // Extrair dados dos produtos
    const products = await page.$$eval('.product-item', items => 
      items.map(item => {
        const name = item.querySelector('.product-name')?.textContent?.trim();
        const price = item.querySelector('.product-price')?.textContent?.trim();
        const image = item.querySelector('.product-image img')?.src;
        const link = item.querySelector('a')?.href;
        const rating = item.querySelector('.rating')?.textContent?.trim();
        
        return {
          name,
          price,
          image,
          link,
          rating,
          extractedAt: Date.now()
        };
      }).filter(product => product.name && product.price)
    );
    
    // Exportar dados dos produtos
    console.log('EXPORT_DATA::', JSON.stringify({
      products: {
        items: products,
        count: products.length,
        source: page.url(),
        extractedAt: Date.now()
      }
    }));
    
    // Calcular estatísticas
    const prices = products
      .map(p => parseFloat(p.price?.replace(/[^0-9.,]/g, '').replace(',', '.')))
      .filter(p => !isNaN(p));
    
    const stats = {
      totalProducts: products.length,
      avgPrice: prices.length > 0 ? prices.reduce((a, b) => a + b, 0) / prices.length : 0,
      minPrice: prices.length > 0 ? Math.min(...prices) : 0,
      maxPrice: prices.length > 0 ? Math.max(...prices) : 0
    };
    
    // Exportar estatísticas
    console.log('EXPORT_DATA::', JSON.stringify({
      productStats: {
        ...stats,
        calculatedAt: Date.now()
      }
    }));
    
    console.log('[PLAYWRIGHT] Dados de produtos exportados com sucesso');
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro na extração de produtos:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      error: {
        message: error.message,
        context: 'product_extraction',
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`
  },
  {
    id: 'performance-metrics-export',
    name: 'Exportação de Métricas de Performance',
    description: 'Mede e exporta métricas de performance da página',
    category: 'Performance',
    tags: ['performance', 'metrics', 'export'],
    code: `// Template: Exportação de Métricas de Performance
const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  try {
    // Iniciar medição de tempo
    const startTime = Date.now();
    
    // Navegar para página
    await page.goto('https://example.com', { waitUntil: 'networkidle' });
    console.log('[PLAYWRIGHT] Página carregada');
    
    const loadTime = Date.now() - startTime;
    
    // Obter métricas de performance
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0];
      const paint = performance.getEntriesByType('paint');
      
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        firstPaint: paint.find(p => p.name === 'first-paint')?.startTime || 0,
        firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime || 0,
        transferSize: navigation.transferSize,
        encodedBodySize: navigation.encodedBodySize,
        decodedBodySize: navigation.decodedBodySize
      };
    });
    
    // Exportar métricas básicas
    console.log('EXPORT_DATA::', JSON.stringify({
      performanceMetrics: {
        ...performanceMetrics,
        totalLoadTime: loadTime,
        url: page.url(),
        timestamp: Date.now()
      }
    }));
    
    // Medir tempo de interação
    const interactionStart = Date.now();
    await page.click('body'); // Simular interação
    const interactionTime = Date.now() - interactionStart;
    
    // Obter informações da página
    const pageInfo = await page.evaluate(() => ({
      title: document.title,
      images: document.images.length,
      links: document.links.length,
      scripts: document.scripts.length,
      stylesheets: document.styleSheets.length
    }));
    
    // Exportar dados da página
    console.log('EXPORT_DATA::', JSON.stringify({
      pageAnalysis: {
        ...pageInfo,
        interactionTime,
        timestamp: Date.now()
      }
    }));
    
    // Capturar screenshot para análise visual
    await page.screenshot({ path: 'performance-test.png', fullPage: true });
    
    // Exportar resumo final
    console.log('EXPORT_DATA::', JSON.stringify({
      testSummary: {
        status: 'completed',
        totalDuration: Date.now() - startTime,
        screenshotCaptured: true,
        metricsCollected: Object.keys(performanceMetrics).length,
        timestamp: Date.now()
      }
    }));
    
    console.log('[PLAYWRIGHT] Análise de performance concluída');
    
  } catch (error) {
    console.error('[PLAYWRIGHT] Erro na análise de performance:', error.message);
    
    console.log('EXPORT_DATA::', JSON.stringify({
      error: {
        message: error.message,
        context: 'performance_analysis',
        timestamp: Date.now()
      }
    }));
    
    throw error;
  } finally {
    await browser.close();
  }
})();`
  }
];

interface ScriptTemplatesProps {
  onSelectTemplate: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const ScriptTemplates: React.FC<ScriptTemplatesProps> = ({ onSelectTemplate, isOpen, onClose }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [copiedTemplate, setCopiedTemplate] = useState<string | null>(null);

  const categories = ['all', ...Array.from(new Set(scriptTemplates.map(t => t.category)))];
  
  const filteredTemplates = selectedCategory === 'all' 
    ? scriptTemplates 
    : scriptTemplates.filter(t => t.category === selectedCategory);

  const handleCopyCode = async (template: ScriptTemplate) => {
    try {
      await navigator.clipboard.writeText(template.code);
      setCopiedTemplate(template.id);
      setTimeout(() => setCopiedTemplate(null), 2000);
    } catch (error) {
      console.error('Erro ao copiar código:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Code className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Templates de Scripts com Exportação de Dados
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Category Filter */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedCategory === category
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {category === 'all' ? 'Todos' : category}
              </button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredTemplates.map((template, index) => (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-6 border border-gray-200 dark:border-gray-600"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {template.name}
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 text-sm mb-3">
                      {template.description}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {template.tags.map(tag => (
                        <span
                          key={tag}
                          className="px-2 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-400 rounded text-xs"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="bg-gray-900 rounded-lg p-4 mb-4 max-h-40 overflow-y-auto">
                  <pre className="text-green-400 text-xs font-mono">
                    {template.code.split('\n').slice(0, 8).join('\n')}
                    {template.code.split('\n').length > 8 && '\n...'}
                  </pre>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => onSelectTemplate(template.code)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
                  >
                    <FileText className="w-4 h-4" />
                    <span>Usar Template</span>
                  </button>
                  
                  <button
                    onClick={() => handleCopyCode(template)}
                    className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                  >
                    {copiedTemplate === template.id ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ScriptTemplates;