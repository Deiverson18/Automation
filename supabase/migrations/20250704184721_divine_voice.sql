-- Migração inicial do banco de dados SQLite
-- Criação das tabelas principais do Playwright Hub
-- Data: 2024-01-25

-- Habilitar chaves estrangeiras
PRAGMA foreign_keys = ON;

-- Tabela de Scripts
CREATE TABLE IF NOT EXISTS scripts (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    code TEXT NOT NULL,
    parameters TEXT DEFAULT '{}',
    tags TEXT DEFAULT '[]',
    status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'disabled')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Execuções
CREATE TABLE IF NOT EXISTS executions (
    id TEXT PRIMARY KEY,
    script_id TEXT NOT NULL,
    script_name TEXT NOT NULL,
    status TEXT DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed', 'cancelled')),
    start_time DATETIME DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME,
    duration INTEGER,
    progress INTEGER DEFAULT 0,
    parameters TEXT DEFAULT '{}',
    config TEXT DEFAULT '{}',
    logs TEXT DEFAULT '[]',
    screenshots TEXT DEFAULT '[]',
    result TEXT,
    error TEXT,
    security_level TEXT DEFAULT 'HIGH',
    sanitization_id TEXT,
    validation_id TEXT,
    quarantined BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (script_id) REFERENCES scripts(id) ON DELETE CASCADE
);

-- Tabela de Logs do Sistema
CREATE TABLE IF NOT EXISTS system_logs (
    id TEXT PRIMARY KEY,
    level TEXT NOT NULL CHECK (level IN ('info', 'warn', 'error', 'debug', 'security')),
    message TEXT NOT NULL,
    context TEXT,
    metadata TEXT DEFAULT '{}',
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    execution_id TEXT
);

-- Tabela de Configurações do Sistema
CREATE TABLE IF NOT EXISTS system_config (
    id TEXT PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Métricas de Segurança
CREATE TABLE IF NOT EXISTS security_metrics (
    id TEXT PRIMARY KEY,
    total_executions INTEGER DEFAULT 0,
    blocked_executions INTEGER DEFAULT 0,
    timeout_executions INTEGER DEFAULT 0,
    memory_violations INTEGER DEFAULT 0,
    cpu_violations INTEGER DEFAULT 0,
    quarantined_scripts INTEGER DEFAULT 0,
    avg_execution_time REAL DEFAULT 0,
    avg_sanitization_time REAL DEFAULT 0,
    avg_validation_time REAL DEFAULT 0,
    recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Código em Quarentena
CREATE TABLE IF NOT EXISTS quarantined_code (
    id TEXT PRIMARY KEY,
    execution_id TEXT,
    original_code TEXT NOT NULL,
    sanitized_code TEXT,
    reason TEXT NOT NULL,
    errors TEXT DEFAULT '[]',
    severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    reviewed BOOLEAN DEFAULT FALSE,
    reviewed_by TEXT,
    reviewed_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Usuários
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'security')),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabela de Sessões de Usuário
CREATE TABLE IF NOT EXISTS user_sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_scripts_status ON scripts(status);
CREATE INDEX IF NOT EXISTS idx_scripts_updated_at ON scripts(updated_at);
CREATE INDEX IF NOT EXISTS idx_executions_script_id ON executions(script_id);
CREATE INDEX IF NOT EXISTS idx_executions_status ON executions(status);
CREATE INDEX IF NOT EXISTS idx_executions_start_time ON executions(start_time);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp ON system_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_system_logs_execution_id ON system_logs(execution_id);
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
CREATE INDEX IF NOT EXISTS idx_quarantined_code_severity ON quarantined_code(severity);
CREATE INDEX IF NOT EXISTS idx_quarantined_code_reviewed ON quarantined_code(reviewed);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);

-- Trigger para atualizar updated_at automaticamente
CREATE TRIGGER IF NOT EXISTS update_scripts_updated_at 
    AFTER UPDATE ON scripts
    FOR EACH ROW
    BEGIN
        UPDATE scripts SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_system_config_updated_at 
    AFTER UPDATE ON system_config
    FOR EACH ROW
    BEGIN
        UPDATE system_config SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_users_updated_at 
    AFTER UPDATE ON users
    FOR EACH ROW
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- Inserir configurações padrão do sistema
INSERT OR IGNORE INTO system_config (id, key, value, description, category) VALUES
    ('cfg_001', 'max_concurrent_executions', '5', 'Número máximo de execuções simultâneas', 'performance'),
    ('cfg_002', 'default_timeout', '30000', 'Timeout padrão para execuções (ms)', 'performance'),
    ('cfg_003', 'max_code_size', '50000', 'Tamanho máximo de código permitido (bytes)', 'security'),
    ('cfg_004', 'enable_quarantine', 'true', 'Habilitar quarentena de código malicioso', 'security'),
    ('cfg_005', 'log_level', 'info', 'Nível de log do sistema', 'general'),
    ('cfg_006', 'cleanup_days', '30', 'Dias para manter logs antigos', 'maintenance'),
    ('cfg_007', 'enable_docker', 'true', 'Habilitar execução em Docker', 'security'),
    ('cfg_008', 'max_memory_mb', '512', 'Limite máximo de memória por execução (MB)', 'performance'),
    ('cfg_009', 'enable_screenshots', 'true', 'Habilitar captura de screenshots', 'features'),
    ('cfg_010', 'security_level', 'HIGH', 'Nível de segurança do sistema', 'security');

-- Inserir usuário administrador padrão
INSERT OR IGNORE INTO users (id, username, email, password, role) VALUES
    ('usr_admin', 'admin', 'admin@playwright.local', '$2b$10$hash_placeholder', 'admin');

-- Inserir métricas iniciais de segurança
INSERT OR IGNORE INTO security_metrics (id) VALUES ('metrics_initial');

-- Comentários sobre a estrutura
-- 
-- Scripts: Armazena todos os scripts Playwright criados pelos usuários
-- Executions: Registra todas as execuções de scripts com logs e resultados
-- System_logs: Logs centralizados do sistema para auditoria e debugging
-- System_config: Configurações dinâmicas do sistema
-- Security_metrics: Métricas de segurança coletadas ao longo do tempo
-- Quarantined_code: Código malicioso detectado e isolado para análise
-- Users: Sistema de usuários para autenticação e autorização
-- User_sessions: Sessões ativas de usuários para controle de acesso