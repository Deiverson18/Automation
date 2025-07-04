# Sistema de Persistência SQLite - Playwright Hub

## 🗄️ Visão Geral

Este diretório contém o sistema completo de persistência de dados usando SQLite com Prisma ORM, substituindo o armazenamento em memória por um banco de dados robusto e escalável.

## 📁 Estrutura de Arquivos

```
database/
├── DatabaseManager.js     # Gerenciador principal do banco de dados
├── seedData.js           # Script para popular dados de exemplo
└── README.md            # Este arquivo

prisma/
├── schema.prisma        # Schema do banco de dados
└── playwright_hub.db   # Arquivo do banco SQLite (gerado)

migrations/
└── 001_initial_setup.sql # Migração inicial
```

## 🚀 Configuração Inicial

### 1. Instalar Dependências

```bash
cd backend
npm install prisma @prisma/client sqlite3 bcrypt vm2
```

### 2. Gerar Cliente Prisma

```bash
npm run db:generate
```

### 3. Criar Banco de Dados

```bash
npm run db:push
```

### 4. Popular com Dados de Exemplo

```bash
npm run db:seed
```

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

#### **Scripts**
```sql
- id (TEXT PRIMARY KEY)
- name (TEXT NOT NULL)
- description (TEXT)
- code (TEXT NOT NULL)
- parameters (TEXT JSON)
- tags (TEXT JSON)
- status (TEXT: draft|active|disabled)
- created_at (DATETIME)
- updated_at (DATETIME)
```

#### **Executions**
```sql
- id (TEXT PRIMARY KEY)
- script_id (TEXT FK)
- script_name (TEXT)
- status (TEXT: queued|running|completed|failed|cancelled)
- start_time (DATETIME)
- end_time (DATETIME)
- duration (INTEGER ms)
- progress (INTEGER 0-100)
- parameters (TEXT JSON)
- config (TEXT JSON)
- logs (TEXT JSON)
- screenshots (TEXT JSON)
- result (TEXT JSON)
- error (TEXT)
- security_level (TEXT)
- sanitization_id (TEXT)
- validation_id (TEXT)
- quarantined (BOOLEAN)
```

#### **System_Logs**
```sql
- id (TEXT PRIMARY KEY)
- level (TEXT: info|warn|error|debug|security)
- message (TEXT)
- context (TEXT)
- metadata (TEXT JSON)
- timestamp (DATETIME)
- execution_id (TEXT)
```

#### **Security_Metrics**
```sql
- id (TEXT PRIMARY KEY)
- total_executions (INTEGER)
- blocked_executions (INTEGER)
- timeout_executions (INTEGER)
- memory_violations (INTEGER)
- cpu_violations (INTEGER)
- quarantined_scripts (INTEGER)
- avg_execution_time (REAL)
- avg_sanitization_time (REAL)
- avg_validation_time (REAL)
- recorded_at (DATETIME)
```

### Tabelas de Suporte

- **System_Config**: Configurações dinâmicas do sistema
- **Quarantined_Code**: Código malicioso isolado para análise
- **Users**: Sistema de usuários e autenticação
- **User_Sessions**: Controle de sessões ativas

## 🔧 Scripts Disponíveis

### Desenvolvimento

```bash
# Gerar cliente Prisma
npm run db:generate

# Aplicar mudanças no schema
npm run db:push

# Criar migração
npm run db:migrate

# Abrir Prisma Studio
npm run db:studio
```

### Dados

```bash
# Popular banco com dados de exemplo
npm run db:seed

# Limpar todos os dados
npm run db:clean

# Reset completo (limpar + recriar + popular)
npm run db:reset
```

## 💻 Uso do DatabaseManager

### Inicialização

```javascript
const DatabaseManager = require('./database/DatabaseManager');

const dbManager = new DatabaseManager();
await dbManager.connect();
```

### Operações de Scripts

```javascript
// Criar script
const script = await dbManager.createScript({
  name: 'Meu Script',
  description: 'Descrição do script',
  code: 'console.log("Hello World");',
  tags: ['test', 'example'],
  parameters: { timeout: 30000 },
  status: 'active'
});

// Buscar script
const script = await dbManager.getScriptById('script_id');

// Listar scripts com paginação
const result = await dbManager.getScripts({
  page: 1,
  limit: 10,
  status: 'active',
  search: 'login'
});

// Atualizar script
const updated = await dbManager.updateScript('script_id', {
  name: 'Novo Nome',
  status: 'disabled'
});

// Deletar script
await dbManager.deleteScript('script_id');
```

### Operações de Execuções

```javascript
// Criar execução
const execution = await dbManager.createExecution({
  id: 'exec_123',
  scriptId: 'script_id',
  scriptName: 'Meu Script',
  status: 'queued',
  parameters: { username: 'test' },
  config: { headless: true }
});

// Atualizar execução
await dbManager.updateExecution('exec_123', {
  status: 'completed',
  duration: 15000,
  result: { success: true }
});

// Adicionar log à execução
await dbManager.addExecutionLog('exec_123', {
  level: 'info',
  message: 'Script executado com sucesso'
});
```

### Logs e Métricas

```javascript
// Criar log do sistema
await dbManager.createSystemLog({
  level: 'info',
  message: 'Sistema iniciado',
  context: 'startup',
  metadata: { version: '1.0.0' }
});

// Registrar métricas de segurança
await dbManager.recordSecurityMetrics({
  totalExecutions: 100,
  blockedExecutions: 5,
  avgExecutionTime: 45.5
});

// Obter estatísticas do sistema
const stats = await dbManager.getSystemStats();
```

## 🔍 Consultas Avançadas

### Filtros e Paginação

```javascript
// Scripts com filtros avançados
const scripts = await dbManager.getScripts({
  page: 2,
  limit: 20,
  status: 'active',
  search: 'login',
  tags: ['authentication', 'web'],
  sortBy: 'updatedAt',
  sortOrder: 'desc'
});

// Execuções por período
const executions = await dbManager.getExecutions({
  status: 'completed',
  scriptId: 'script_123',
  sortBy: 'startTime',
  sortOrder: 'desc'
});

// Logs com filtros
const logs = await dbManager.getSystemLogs({
  level: 'error',
  context: 'execution',
  startDate: '2024-01-01',
  endDate: '2024-01-31'
});
```

## 🛡️ Segurança e Validação

### Sanitização de Dados

- Todos os dados JSON são validados antes da inserção
- Campos obrigatórios são verificados
- Tipos de dados são validados pelo Prisma

### Controle de Acesso

- Logs detalhados de todas as operações
- Rastreamento de alterações com timestamps
- Isolamento de dados sensíveis

### Backup e Recuperação

```bash
# Backup do banco
cp backend/prisma/playwright_hub.db backup/

# Restaurar backup
cp backup/playwright_hub.db backend/prisma/
```

## 📈 Performance

### Índices Otimizados

- Índices em campos de busca frequente
- Índices compostos para consultas complexas
- Otimização de queries com EXPLAIN

### Limpeza Automática

```javascript
// Limpar dados antigos
const result = await dbManager.cleanup({
  olderThanDays: 30,
  keepSuccessfulExecutions: 100,
  keepFailedExecutions: 50
});
```

## 🔧 Manutenção

### Health Check

```javascript
const health = await dbManager.healthCheck();
console.log(health); // { status: 'healthy', timestamp: '...' }
```

### Estatísticas do Banco

```javascript
const stats = await dbManager.getSystemStats();
// Retorna estatísticas completas do sistema
```

### Migração de Dados

Para migrar dados existentes:

1. Execute o script de migração
2. Valide a integridade dos dados
3. Teste as funcionalidades críticas
4. Faça backup antes de aplicar em produção

## 🐛 Troubleshooting

### Problemas Comuns

**Erro de conexão:**
```bash
# Verificar se o arquivo do banco existe
ls -la backend/prisma/playwright_hub.db

# Recriar banco se necessário
npm run db:push
```

**Dados corrompidos:**
```bash
# Reset completo
npm run db:reset
```

**Performance lenta:**
```bash
# Analisar queries no Prisma Studio
npm run db:studio
```

### Logs de Debug

```javascript
// Habilitar logs detalhados do Prisma
const dbManager = new DatabaseManager();
// Logs serão exibidos no console e salvos em logs/database.log
```

## 📚 Recursos Adicionais

- **[Prisma Documentation](https://www.prisma.io/docs)**
- **[SQLite Documentation](https://www.sqlite.org/docs.html)**
- **[Database Design Best Practices](https://www.prisma.io/dataguide)**

---

**🔒 Importante**: Este sistema gerencia dados críticos da aplicação. Sempre faça backup antes de modificações em produção e teste mudanças em ambiente de desenvolvimento primeiro.