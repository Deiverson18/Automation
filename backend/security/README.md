# Sistema de Segurança - Playwright Hub

## 🔒 Visão Geral

Este diretório contém o sistema completo de segurança para execução de scripts Playwright, implementando múltiplas camadas de proteção contra código malicioso e ataques de segurança.

## 📁 Estrutura de Arquivos

```
security/
├── CodeSanitizer.js          # Sanitização e validação de código
├── ExecutionValidator.js     # Validação e monitoramento de execuções
├── SecurityDocumentation.md  # Documentação técnica completa
└── README.md                # Este arquivo
```

## 🛡️ Componentes de Segurança

### 1. CodeSanitizer.js
**Sistema avançado de sanitização de código JavaScript**

- ✅ Detecta 50+ padrões perigosos
- ✅ Remove APIs não permitidas
- ✅ Valida estrutura e sintaxe
- ✅ Análise semântica avançada
- ✅ Sandbox de validação com VM2

### 2. ExecutionValidator.js
**Validador de execução com controles de recursos**

- ✅ Monitoramento de CPU e memória
- ✅ Controle de timeout rigoroso
- ✅ Detecção de dados sensíveis
- ✅ Limpeza automática de recursos
- ✅ Métricas de segurança em tempo real

## 🚀 Como Usar

### Integração Básica

```javascript
const CodeSanitizer = require('./security/CodeSanitizer');
const ExecutionValidator = require('./security/ExecutionValidator');

// Inicializar componentes
const sanitizer = new CodeSanitizer();
const validator = new ExecutionValidator();

// Sanitizar código
const result = sanitizer.sanitizeCode(userCode);
if (!result.isValid) {
  throw new Error(`Código rejeitado: ${result.errors.join(', ')}`);
}

// Validar execução
const validation = validator.validateExecutionParameters(
  executionId, result.sanitizedCode, config
);
```

### Exemplo Completo

```javascript
async function executeSecureScript(code, executionId, config) {
  try {
    // 1. Sanitizar código
    const sanitization = sanitizer.sanitizeCode(code);
    if (!sanitization.isValid) {
      throw new Error('Código contém padrões perigosos');
    }

    // 2. Validar parâmetros
    const validation = validator.validateExecutionParameters(
      executionId, sanitization.sanitizedCode, config
    );
    if (!validation.isValid) {
      throw new Error('Parâmetros de execução inválidos');
    }

    // 3. Executar com monitoramento
    const execution = await runPlaywrightScript(
      sanitization.sanitizedCode, 
      validation.config
    );

    // 4. Validar resultado
    const resultValidation = validator.validateExecutionResult(
      executionId, execution.result
    );

    return execution;
  } catch (error) {
    logger.error('Erro na execução segura:', error);
    throw error;
  }
}
```

## ⚙️ Configuração

### Configurações de Segurança

```javascript
// CodeSanitizer
const sanitizerConfig = {
  maxCodeLength: 50000,        // 50KB máximo
  maxLines: 1000,              // 1000 linhas máximo
  maxFunctionDepth: 10,        // Máximo 10 níveis
  maxLoops: 100,               // Máximo 100 loops
  strictMode: true,            // Modo rigoroso
  logViolations: true          // Log de violações
};

// ExecutionValidator
const validatorConfig = {
  maxMemoryMB: 512,            // 512MB máximo
  maxExecutionTimeMs: 300000,  // 5 minutos
  maxCpuUsagePercent: 80,      // 80% CPU máximo
  maxConcurrentExecutions: 5   // 5 execuções simultâneas
};
```

### Variáveis de Ambiente

```bash
# Configurações de segurança
SECURITY_STRICT_MODE=true
SECURITY_LOG_LEVEL=info
SECURITY_QUARANTINE_ENABLED=true
SECURITY_MAX_CODE_SIZE=50000
SECURITY_MAX_EXECUTION_TIME=300000
```

## 🔍 Padrões Detectados

### Comandos Perigosos Bloqueados

```javascript
// ❌ Acesso ao sistema de arquivos
require('fs')
fs.readFile, fs.writeFile

// ❌ Execução de comandos
require('child_process')
spawn, exec, execSync

// ❌ Manipulação de processos
process.exit, process.env

// ❌ Avaliação dinâmica
eval(), Function()

// ❌ Escape de contexto
constructor.constructor
__proto__
```

### APIs Permitidas

```javascript
// ✅ Playwright APIs
page.goto, page.click, page.fill
browser.newPage, browser.close

// ✅ JavaScript básico
JSON.stringify, JSON.parse
Math.random, Date.now

// ✅ Console para logs
console.log, console.error
```

## 📊 Monitoramento

### Métricas Coletadas

- **Execuções totais**: Número total de execuções
- **Execuções bloqueadas**: Scripts rejeitados por segurança
- **Violações de timeout**: Execuções que excederam tempo limite
- **Violações de memória**: Uso excessivo de RAM
- **Violações de CPU**: Uso excessivo de processamento

### Logs de Segurança

```javascript
// Exemplo de log de violação
{
  "timestamp": "2024-01-25T10:30:00.000Z",
  "level": "warn",
  "message": "Padrão perigoso detectado",
  "executionId": "exec_123",
  "pattern": "require('fs')",
  "action": "blocked"
}
```

## 🚨 Tratamento de Incidentes

### Código Malicioso Detectado

1. **Bloqueio imediato** da execução
2. **Quarentena** do código para análise
3. **Log detalhado** do incidente
4. **Notificação** da equipe de segurança

### Violação de Recursos

1. **Terminação forçada** do processo
2. **Limpeza** de recursos alocados
3. **Registro** da violação
4. **Análise** de causa raiz

## 🔧 Manutenção

### Atualizações de Segurança

```bash
# Atualizar padrões perigosos
npm run security:update-patterns

# Verificar integridade do sistema
npm run security:health-check

# Limpar quarentena antiga
npm run security:cleanup-quarantine
```

### Backup de Configurações

```bash
# Backup das configurações
cp security/*.js backup/security/

# Backup dos logs
cp logs/security.log backup/logs/
```

## 📈 Performance

### Impacto na Performance

- **Sanitização**: +50-200ms por script
- **Validação**: +10-50ms por execução
- **Monitoramento**: +5-15ms por verificação
- **Memória adicional**: ~10-20MB durante análise

### Otimizações

- Cache de padrões compilados
- Análise incremental
- Validação em paralelo
- Cleanup automático

## 🧪 Testes

### Executar Testes de Segurança

```bash
# Testes unitários
npm test security/

# Testes de penetração
npm run security:pentest

# Validação de padrões
npm run security:validate-patterns
```

### Casos de Teste

```javascript
// Teste de código malicioso
const maliciousCode = `
  const fs = require('fs');
  fs.readFile('/etc/passwd', console.log);
`;

const result = sanitizer.sanitizeCode(maliciousCode);
expect(result.isValid).toBe(false);
expect(result.errors).toContain('Padrão perigoso detectado');
```

## 📚 Documentação Adicional

- **[SecurityDocumentation.md](./SecurityDocumentation.md)**: Documentação técnica completa
- **[API Reference](../docs/security-api.md)**: Referência da API de segurança
- **[Best Practices](../docs/security-best-practices.md)**: Melhores práticas

## 🆘 Suporte

### Contatos de Emergência

- **Email**: security@playwrighthub.com
- **Slack**: #security-incidents
- **Telefone**: +55 11 9999-9999 (24/7)

### Reportar Vulnerabilidades

1. **Não** divulgue publicamente
2. **Envie** detalhes para security@playwrighthub.com
3. **Inclua** steps para reproduzir
4. **Aguarde** confirmação da equipe

---

**⚠️ IMPORTANTE**: Este sistema de segurança é crítico para a operação segura da plataforma. Qualquer modificação deve ser revisada pela equipe de segurança antes da implementação.

**🔒 Classificação**: CONFIDENCIAL - USO INTERNO APENAS