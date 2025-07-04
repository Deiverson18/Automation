import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import serveStatic from 'serve-static';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 1. Middleware de configuração global
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 2. Health check (antes das rotas da API)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// 3. Rotas da API - Devem vir ANTES dos arquivos estáticos
// Aqui você adicionaria suas rotas de API, por exemplo:
// app.use('/api', require('./routes/api'));

// 4. Servir arquivos estáticos
app.use(serveStatic(join(__dirname, 'dist'), {
  index: false, // Importante: não servir index.html automaticamente
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0
}));

// 5. Fallback para SPA - DEPOIS dos arquivos estáticos
app.get('*', (req, res) => {
  // Não redirecionar solicitações de API não encontradas para o SPA
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'API endpoint não encontrado' });
  }
  
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// 6. Middleware de erro
app.use((err, req, res, next) => {
  console.error('Erro no servidor:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Iniciar servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Playwright Hub rodando em http://0.0.0.0:${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'production'}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido, encerrando graciosamente');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido, encerrando graciosamente');
  process.exit(0);
});