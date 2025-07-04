/**
 * Sistema Avançado de Sanitização de Código JavaScript
 * 
 * Implementa múltiplas camadas de segurança para prevenir:
 * - Execução de comandos do sistema
 * - Acesso a APIs perigosas
 * - Injeção de código malicioso
 * - Vazamento de dados sensíveis
 * 
 * @author Playwright Hub Security Team
 * @version 2.0.0
 */

const winston = require('winston');
const { VM } = require('vm2');

// Configurar logger específico para segurança
const securityLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/security.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

class CodeSanitizer {
  constructor() {
    // Padrões de código perigoso - Lista abrangente
    this.dangerousPatterns = [
      // Acesso ao sistema de arquivos
      /require\s*\(\s*['"`]fs['"`]\s*\)/gi,
      /require\s*\(\s*['"`]node:fs['"`]\s*\)/gi,
      /import\s+.*from\s+['"`]fs['"`]/gi,
      /fs\.(readFile|writeFile|unlink|mkdir|rmdir|stat|access)/gi,
      
      // Execução de comandos do sistema
      /require\s*\(\s*['"`]child_process['"`]\s*\)/gi,
      /require\s*\(\s*['"`]node:child_process['"`]\s*\)/gi,
      /spawn|exec|execSync|fork/gi,
      /\.exec\s*\(/gi,
      
      // Acesso ao sistema operacional
      /require\s*\(\s*['"`]os['"`]\s*\)/gi,
      /require\s*\(\s*['"`]node:os['"`]\s*\)/gi,
      /process\.(exit|kill|abort|chdir|cwd|env)/gi,
      
      // Acesso à rede (exceto Playwright)
      /require\s*\(\s*['"`]http['"`]\s*\)/gi,
      /require\s*\(\s*['"`]https['"`]\s*\)/gi,
      /require\s*\(\s*['"`]net['"`]\s*\)/gi,
      /require\s*\(\s*['"`]dgram['"`]\s*\)/gi,
      
      // Manipulação de paths perigosos
      /require\s*\(\s*['"`]path['"`]\s*\)/gi,
      /require\s*\(\s*['"`]node:path['"`]\s*\)/gi,
      /\.\.\//gi, // Path traversal
      
      // Avaliação dinâmica de código
      /eval\s*\(/gi,
      /Function\s*\(/gi,
      /new\s+Function/gi,
      /setTimeout\s*\(\s*['"`]/gi, // setTimeout com string
      /setInterval\s*\(\s*['"`]/gi, // setInterval com string
      
      // Acesso a objetos globais perigosos
      /global\./gi,
      /globalThis\./gi,
      /window\./gi,
      /self\./gi,
      
      // Manipulação de módulos
      /require\.cache/gi,
      /require\.resolve/gi,
      /module\.(exports|require|children|parent)/gi,
      
      // Acesso a buffers e streams perigosos
      /Buffer\.(from|alloc|allocUnsafe)/gi,
      /require\s*\(\s*['"`]stream['"`]\s*\)/gi,
      
      // Debugging e profiling
      /require\s*\(\s*['"`]inspector['"`]\s*\)/gi,
      /require\s*\(\s*['"`]v8['"`]\s*\)/gi,
      /debugger/gi,
      
      // Acesso a workers e clusters
      /require\s*\(\s*['"`]worker_threads['"`]\s*\)/gi,
      /require\s*\(\s*['"`]cluster['"`]\s*\)/gi,
      
      // Manipulação de eventos do processo
      /process\.on\s*\(/gi,
      /process\.once\s*\(/gi,
      /process\.emit\s*\(/gi,
      
      // Acesso a crypto sensível
      /require\s*\(\s*['"`]crypto['"`]\s*\).*\.randomBytes/gi,
      /require\s*\(\s*['"`]crypto['"`]\s*\).*\.createHash/gi,
      
      // Manipulação de DNS
      /require\s*\(\s*['"`]dns['"`]\s*\)/gi,
      
      // Acesso a TTY
      /require\s*\(\s*['"`]tty['"`]\s*\)/gi,
      
      // Manipulação de URLs perigosas
      /file:\/\//gi,
      /data:.*base64/gi,
      
      // Tentativas de escape de sandbox
      /constructor\.constructor/gi,
      /\[\s*['"`]constructor['"`]\s*\]/gi,
      /prototype\.constructor/gi,
      
      // Acesso a __proto__ e outras propriedades perigosas
      /__proto__/gi,
      /__defineGetter__/gi,
      /__defineSetter__/gi,
      /__lookupGetter__/gi,
      /__lookupSetter__/gi,
      
      // Tentativas de quebrar o contexto
      /this\.constructor/gi,
      /arguments\.callee/gi,
      /arguments\.caller/gi,
      
      // Manipulação de proxies perigosos
      /new\s+Proxy/gi,
      /Reflect\.(get|set|has|deleteProperty|defineProperty)/gi,
      
      // Acesso a WeakMap/WeakSet para vazamento de memória
      /WeakMap|WeakSet/gi,
      
      // Manipulação de símbolos para bypass
      /Symbol\.(for|keyFor|iterator)/gi,
      
      // Tentativas de acesso a propriedades não enumeráveis
      /Object\.(getOwnPropertyNames|getOwnPropertyDescriptors|getOwnPropertySymbols)/gi,
      
      // Manipulação de protótipos
      /Object\.(setPrototypeOf|getPrototypeOf|create)/gi,
      
      // Acesso a generators para bypass
      /function\s*\*/gi,
      /yield/gi,
      
      // Async/await potencialmente perigoso
      /async\s+function.*require/gi,
      
      // Tentativas de importação dinâmica
      /import\s*\(/gi,
      
      // Acesso a console para vazamento de dados (exceto logs permitidos)
      /console\.(trace|table|group|groupEnd|time|timeEnd|profile|profileEnd)/gi,
      
      // Manipulação de JSON perigosa
      /JSON\.parse.*\$\{/gi, // Template injection via JSON
      
      // Regex perigosas (ReDoS)
      /new\s+RegExp\s*\(/gi,
      
      // Tentativas de acesso a propriedades via string
      /\[['"`]constructor['"`]\]/gi,
      /\[['"`]__proto__['"`]\]/gi,
      
      // Manipulação de arrays para bypass
      /Array\.from\s*\(/gi,
      /Array\.prototype\./gi,
      
      // Tentativas de usar bind/call/apply para bypass
      /\.(bind|call|apply)\s*\(/gi,
      
      // Acesso a Error.captureStackTrace
      /Error\.captureStackTrace/gi,
      
      // Tentativas de usar toString para bypass
      /\.toString\s*\(\s*\)\s*\[/gi,
      
      // Manipulação de dates para timing attacks
      /Date\.now\s*\(\s*\)\s*\+/gi,
      /performance\.now/gi,
      
      // Tentativas de usar valueOf para bypass
      /\.valueOf\s*\(/gi,
      
      // Acesso a propriedades via computed properties
      /\[.*constructor.*\]/gi,
      /\[.*__proto__.*\]/gi
    ];

    // Palavras-chave permitidas (whitelist)
    this.allowedKeywords = [
      'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
      'do', 'switch', 'case', 'default', 'break', 'continue', 'try', 'catch',
      'finally', 'throw', 'new', 'this', 'true', 'false', 'null', 'undefined',
      'typeof', 'instanceof', 'in', 'delete', 'void', 'await', 'async',
      'class', 'extends', 'super', 'static', 'get', 'set'
    ];

    // APIs permitidas do Playwright
    this.allowedPlaywrightAPIs = [
      'chromium', 'firefox', 'webkit', 'page', 'browser', 'context',
      'goto', 'click', 'fill', 'type', 'press', 'waitForSelector',
      'waitForTimeout', 'screenshot', 'pdf', 'evaluate', 'evaluateHandle',
      'addScriptTag', 'addStyleTag', 'setContent', 'content', 'title',
      'url', 'setViewportSize', 'viewportSize', 'emulateMedia',
      'setExtraHTTPHeaders', 'setUserAgent', 'cookies', 'setCookies',
      'addCookies', 'clearCookies', 'localStorage', 'sessionStorage',
      'reload', 'goBack', 'goForward', 'close', 'isClosed',
      'waitForEvent', 'waitForFunction', 'waitForLoadState',
      'waitForNavigation', 'waitForRequest', 'waitForResponse',
      'route', 'unroute', 'setDefaultTimeout', 'setDefaultNavigationTimeout'
    ];

    // Configurações de segurança
    this.securityConfig = {
      maxCodeLength: 50000,        // 50KB máximo
      maxLines: 1000,              // 1000 linhas máximo
      maxFunctionDepth: 10,        // Máximo 10 níveis de aninhamento
      maxLoops: 100,               // Máximo 100 loops
      allowedRequires: [           // Módulos permitidos
        'playwright',
        '@playwright/test'
      ],
      blockedStrings: [            // Strings completamente bloqueadas
        'rm -rf',
        'format c:',
        'del /f /q',
        'sudo',
        'chmod 777',
        'passwd',
        'shadow',
        '/etc/',
        '/proc/',
        '/sys/',
        'C:\\Windows',
        'C:\\System32'
      ]
    };
  }

  /**
   * Sanitiza código JavaScript removendo padrões perigosos
   * 
   * @param {string} code - Código a ser sanitizado
   * @param {Object} options - Opções de sanitização
   * @returns {Object} Resultado da sanitização
   */
  sanitizeCode(code, options = {}) {
    const startTime = Date.now();
    const sanitizationId = this.generateSanitizationId();
    
    try {
      securityLogger.info('Iniciando sanitização de código', {
        sanitizationId,
        codeLength: code.length,
        options
      });

      // Validações básicas
      const basicValidation = this.performBasicValidation(code);
      if (!basicValidation.isValid) {
        return this.createSanitizationResult(false, basicValidation.errors, null, sanitizationId);
      }

      // Análise estrutural
      const structuralAnalysis = this.performStructuralAnalysis(code);
      if (!structuralAnalysis.isValid) {
        return this.createSanitizationResult(false, structuralAnalysis.errors, null, sanitizationId);
      }

      // Detecção de padrões perigosos
      const patternAnalysis = this.detectDangerousPatterns(code);
      if (!patternAnalysis.isValid) {
        return this.createSanitizationResult(false, patternAnalysis.errors, null, sanitizationId);
      }

      // Análise semântica
      const semanticAnalysis = this.performSemanticAnalysis(code);
      if (!semanticAnalysis.isValid) {
        return this.createSanitizationResult(false, semanticAnalysis.errors, null, sanitizationId);
      }

      // Sanitização ativa
      const sanitizedCode = this.applySanitization(code);

      // Validação final
      const finalValidation = this.performFinalValidation(sanitizedCode);
      if (!finalValidation.isValid) {
        return this.createSanitizationResult(false, finalValidation.errors, null, sanitizationId);
      }

      const duration = Date.now() - startTime;
      
      securityLogger.info('Sanitização concluída com sucesso', {
        sanitizationId,
        duration,
        originalLength: code.length,
        sanitizedLength: sanitizedCode.length,
        removedPatterns: patternAnalysis.removedPatterns || 0
      });

      return this.createSanitizationResult(true, [], sanitizedCode, sanitizationId, {
        duration,
        originalLength: code.length,
        sanitizedLength: sanitizedCode.length,
        securityLevel: 'HIGH'
      });

    } catch (error) {
      securityLogger.error('Erro durante sanitização', {
        sanitizationId,
        error: error.message,
        stack: error.stack
      });

      return this.createSanitizationResult(false, [`Erro interno de sanitização: ${error.message}`], null, sanitizationId);
    }
  }

  /**
   * Validações básicas do código
   */
  performBasicValidation(code) {
    const errors = [];

    // Verificar se o código não está vazio
    if (!code || typeof code !== 'string') {
      errors.push('Código deve ser uma string não vazia');
    }

    // Verificar tamanho máximo
    if (code.length > this.securityConfig.maxCodeLength) {
      errors.push(`Código excede tamanho máximo de ${this.securityConfig.maxCodeLength} caracteres`);
    }

    // Verificar número de linhas
    const lines = code.split('\n');
    if (lines.length > this.securityConfig.maxLines) {
      errors.push(`Código excede máximo de ${this.securityConfig.maxLines} linhas`);
    }

    // Verificar strings bloqueadas
    for (const blockedString of this.securityConfig.blockedStrings) {
      if (code.toLowerCase().includes(blockedString.toLowerCase())) {
        errors.push(`Código contém string bloqueada: ${blockedString}`);
      }
    }

    // Verificar encoding suspeito
    if (this.containsSuspiciousEncoding(code)) {
      errors.push('Código contém encoding suspeito ou caracteres não permitidos');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Análise estrutural do código
   */
  performStructuralAnalysis(code) {
    const errors = [];

    try {
      // Verificar balanceamento de parênteses, chaves e colchetes
      if (!this.isProperlyBalanced(code)) {
        errors.push('Código possui parênteses, chaves ou colchetes desbalanceados');
      }

      // Verificar profundidade de aninhamento
      const depth = this.calculateNestingDepth(code);
      if (depth > this.securityConfig.maxFunctionDepth) {
        errors.push(`Profundidade de aninhamento excede máximo de ${this.securityConfig.maxFunctionDepth}`);
      }

      // Verificar número de loops
      const loopCount = this.countLoops(code);
      if (loopCount > this.securityConfig.maxLoops) {
        errors.push(`Número de loops excede máximo de ${this.securityConfig.maxLoops}`);
      }

      // Verificar sintaxe básica
      if (!this.hasValidBasicSyntax(code)) {
        errors.push('Código possui sintaxe JavaScript inválida');
      }

    } catch (error) {
      errors.push(`Erro na análise estrutural: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Detecta padrões perigosos no código
   */
  detectDangerousPatterns(code) {
    const errors = [];
    const detectedPatterns = [];

    for (const pattern of this.dangerousPatterns) {
      const matches = code.match(pattern);
      if (matches) {
        detectedPatterns.push({
          pattern: pattern.toString(),
          matches: matches.length,
          examples: matches.slice(0, 3) // Primeiros 3 exemplos
        });
        errors.push(`Padrão perigoso detectado: ${matches[0]}`);
      }
    }

    // Verificar requires não permitidos
    const requireMatches = code.match(/require\s*\(\s*['"`]([^'"`]+)['"`]\s*\)/gi);
    if (requireMatches) {
      for (const match of requireMatches) {
        const moduleName = match.match(/['"`]([^'"`]+)['"`]/)[1];
        if (!this.securityConfig.allowedRequires.includes(moduleName) && 
            !this.allowedPlaywrightAPIs.includes(moduleName)) {
          errors.push(`Módulo não permitido: ${moduleName}`);
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      detectedPatterns
    };
  }

  /**
   * Análise semântica avançada
   */
  performSemanticAnalysis(code) {
    const errors = [];

    try {
      // Verificar se o código tenta escapar do contexto Playwright
      if (this.attemptsContextEscape(code)) {
        errors.push('Código tenta escapar do contexto de execução Playwright');
      }

      // Verificar tentativas de obfuscação
      if (this.isObfuscated(code)) {
        errors.push('Código parece estar ofuscado ou contém padrões suspeitos');
      }

      // Verificar uso de APIs permitidas
      if (!this.usesOnlyAllowedAPIs(code)) {
        errors.push('Código usa APIs não permitidas');
      }

      // Verificar padrões de injeção
      if (this.containsInjectionPatterns(code)) {
        errors.push('Código contém padrões de injeção suspeitos');
      }

    } catch (error) {
      errors.push(`Erro na análise semântica: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Aplica sanitização ativa ao código
   */
  applySanitization(code) {
    let sanitizedCode = code;

    // Remover comentários suspeitos que podem conter código
    sanitizedCode = sanitizedCode.replace(/\/\*[\s\S]*?\*\//g, '');
    sanitizedCode = sanitizedCode.replace(/\/\/.*$/gm, '');

    // Remover padrões perigosos
    for (const pattern of this.dangerousPatterns) {
      sanitizedCode = sanitizedCode.replace(pattern, '/* REMOVIDO POR SEGURANÇA */');
    }

    // Normalizar espaços em branco
    sanitizedCode = sanitizedCode.replace(/\s+/g, ' ').trim();

    // Adicionar wrapper de segurança
    sanitizedCode = this.addSecurityWrapper(sanitizedCode);

    return sanitizedCode;
  }

  /**
   * Adiciona wrapper de segurança ao código
   */
  addSecurityWrapper(code) {
    return `
// === CÓDIGO SANITIZADO PELO SISTEMA DE SEGURANÇA ===
// Execução em ambiente controlado e isolado
// Timestamp: ${new Date().toISOString()}

(async function securePlaywrightExecution() {
  'use strict';
  
  // Bloquear acesso a objetos globais perigosos
  const blockedGlobals = ['global', 'process', 'require', 'module', 'exports', '__dirname', '__filename'];
  blockedGlobals.forEach(name => {
    if (typeof globalThis[name] !== 'undefined') {
      try {
        delete globalThis[name];
      } catch (e) {
        // Ignorar erros de propriedades não configuráveis
      }
    }
  });

  try {
    ${code}
  } catch (error) {
    console.error('[SECURITY] Erro na execução do código sanitizado:', error.message);
    throw error;
  }
})();
`;
  }

  /**
   * Validação final do código sanitizado
   */
  performFinalValidation(sanitizedCode) {
    const errors = [];

    try {
      // Tentar fazer parse do código para verificar sintaxe
      new Function(sanitizedCode);
      
      // Verificar se ainda contém padrões perigosos
      for (const pattern of this.dangerousPatterns) {
        if (pattern.test(sanitizedCode)) {
          errors.push(`Padrão perigoso ainda presente após sanitização: ${pattern}`);
        }
      }

    } catch (error) {
      errors.push(`Código sanitizado possui sintaxe inválida: ${error.message}`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // === MÉTODOS AUXILIARES ===

  generateSanitizationId() {
    return `san_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  createSanitizationResult(isValid, errors, sanitizedCode, sanitizationId, metadata = {}) {
    return {
      isValid,
      errors,
      sanitizedCode,
      sanitizationId,
      timestamp: new Date().toISOString(),
      metadata
    };
  }

  containsSuspiciousEncoding(code) {
    // Verificar caracteres Unicode suspeitos
    const suspiciousPatterns = [
      /[\u0000-\u001F]/g,  // Caracteres de controle
      /[\u007F-\u009F]/g,  // Caracteres de controle estendidos
      /[\uFEFF]/g,         // BOM
      /[\u200B-\u200D]/g   // Zero-width characters
    ];

    return suspiciousPatterns.some(pattern => pattern.test(code));
  }

  isProperlyBalanced(code) {
    const stack = [];
    const pairs = { '(': ')', '[': ']', '{': '}' };
    
    for (const char of code) {
      if (char in pairs) {
        stack.push(char);
      } else if (Object.values(pairs).includes(char)) {
        const last = stack.pop();
        if (!last || pairs[last] !== char) {
          return false;
        }
      }
    }
    
    return stack.length === 0;
  }

  calculateNestingDepth(code) {
    let depth = 0;
    let maxDepth = 0;
    
    for (const char of code) {
      if (char === '{') {
        depth++;
        maxDepth = Math.max(maxDepth, depth);
      } else if (char === '}') {
        depth--;
      }
    }
    
    return maxDepth;
  }

  countLoops(code) {
    const loopPatterns = [
      /\bfor\s*\(/g,
      /\bwhile\s*\(/g,
      /\bdo\s*{/g,
      /\.forEach\s*\(/g,
      /\.map\s*\(/g,
      /\.filter\s*\(/g,
      /\.reduce\s*\(/g
    ];
    
    return loopPatterns.reduce((count, pattern) => {
      const matches = code.match(pattern);
      return count + (matches ? matches.length : 0);
    }, 0);
  }

  hasValidBasicSyntax(code) {
    try {
      new Function(code);
      return true;
    } catch (error) {
      return false;
    }
  }

  attemptsContextEscape(code) {
    const escapePatterns = [
      /constructor\.constructor/gi,
      /prototype\.constructor/gi,
      /arguments\.callee/gi,
      /this\.constructor/gi,
      /__proto__/gi
    ];
    
    return escapePatterns.some(pattern => pattern.test(code));
  }

  isObfuscated(code) {
    // Verificar indicadores de ofuscação
    const obfuscationIndicators = [
      /\\x[0-9a-f]{2}/gi,      // Hex encoding
      /\\u[0-9a-f]{4}/gi,      // Unicode encoding
      /eval\s*\(/gi,           // Eval usage
      /String\.fromCharCode/gi, // Character code conversion
      /atob|btoa/gi,           // Base64 encoding/decoding
      /unescape/gi,            // URL decoding
      /decodeURI/gi            // URI decoding
    ];
    
    const suspiciousCount = obfuscationIndicators.reduce((count, pattern) => {
      return count + (code.match(pattern) || []).length;
    }, 0);
    
    // Se mais de 3 indicadores, considerar suspeito
    return suspiciousCount > 3;
  }

  usesOnlyAllowedAPIs(code) {
    // Extrair todas as chamadas de API
    const apiCalls = code.match(/\b\w+\.\w+/g) || [];
    
    for (const call of apiCalls) {
      const [object, method] = call.split('.');
      
      // Verificar se é uma API permitida do Playwright
      if (!this.allowedPlaywrightAPIs.includes(object) && 
          !this.allowedPlaywrightAPIs.includes(method)) {
        // Permitir console.log para exportação de dados
        if (call === 'console.log' || call === 'console.error' || call === 'console.warn') {
          continue;
        }
        
        // Permitir APIs básicas do JavaScript
        const allowedBasicAPIs = [
          'JSON.stringify', 'JSON.parse', 'Date.now', 'Math.random',
          'String.trim', 'Array.push', 'Array.pop', 'Array.slice',
          'Object.keys', 'Object.values', 'Number.parseInt'
        ];
        
        if (!allowedBasicAPIs.includes(call)) {
          return false;
        }
      }
    }
    
    return true;
  }

  containsInjectionPatterns(code) {
    const injectionPatterns = [
      /\$\{.*\}/g,           // Template injection
      /document\.write/gi,    // DOM injection
      /innerHTML\s*=/gi,      // HTML injection
      /outerHTML\s*=/gi,      // HTML injection
      /location\s*=/gi,       // URL injection
      /href\s*=/gi,          // URL injection
      /src\s*=/gi,           // Resource injection
      /javascript:/gi,        // JavaScript protocol
      /data:.*script/gi,      // Data URL script injection
      /vbscript:/gi,         // VBScript protocol
      /on\w+\s*=/gi          // Event handler injection
    ];
    
    return injectionPatterns.some(pattern => pattern.test(code));
  }

  /**
   * Valida código em ambiente isolado usando VM2
   */
  validateInSandbox(code) {
    try {
      const vm = new VM({
        timeout: 1000,
        sandbox: {},
        eval: false,
        wasm: false,
        fixAsync: true
      });
      
      // Tentar executar o código em sandbox para validação
      vm.run(`
        try {
          ${code}
        } catch (e) {
          throw new Error('Código inválido: ' + e.message);
        }
      `);
      
      return { isValid: true, errors: [] };
    } catch (error) {
      return { 
        isValid: false, 
        errors: [`Validação em sandbox falhou: ${error.message}`] 
      };
    }
  }
}

module.exports = CodeSanitizer;