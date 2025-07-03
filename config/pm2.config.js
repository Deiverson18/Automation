module.exports = {
  apps: [{
    name: 'playwright-hub-backend',
    script: './server.js',
    cwd: './backend',
    instances: 1,
    exec_mode: 'fork',
    
    // Configurações de ambiente
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info'
    },
    
    // Configurações de log
    log_file: '../logs/combined.log',
    out_file: '../logs/out.log',
    error_file: '../logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    
    // Configurações de restart
    watch: false,
    ignore_watch: ['node_modules', 'logs', 'temp'],
    max_restarts: 10,
    min_uptime: '10s',
    
    // Configurações de memória
    max_memory_restart: '500M',
    
    // Configurações de cluster (se necessário)
    // instances: 'max',
    // exec_mode: 'cluster',
    
    // Scripts de lifecycle
    post_update: ['npm install'],
    
    // Configurações Windows específicas
    windowsHide: true,
    
    // Configurações de monitoramento
    monitoring: false,
    pmx: false,
    
    // Variáveis de ambiente específicas
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      LOG_LEVEL: 'info',
      LOG_FILE: '../logs/backend.log'
    },
    
    env_development: {
      NODE_ENV: 'development',
      PORT: 3000,
      LOG_LEVEL: 'debug',
      LOG_FILE: '../logs/backend-dev.log'
    }
  }]
};