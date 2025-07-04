# Playwright Hub - Plataforma de Automação Segura

Uma plataforma completa para automação com Playwright que executa scripts em **contêineres Docker isolados** para máxima segurança.

## 🔒 Segurança Máxima com Docker

### **Isolamento Completo**
- **Contêineres isolados**: Cada script executa em seu próprio contêiner Docker
- **Sem acesso à rede**: Contêineres executam com `--network none`
- **Sistema de arquivos somente leitura**: `--read-only` para prevenir modificações
- **Usuário não-root**: Execução com usuário `playwright:playwright`
- **Recursos limitados**: Memória (512MB) e CPU (0.5 cores) limitados

### **Proteções de Segurança**
- **Sanitização de código**: Remoção automática de comandos perigosos
- **Timeout rigoroso**: Execuções limitadas a 5 minutos
- **Capabilities mínimas**: Apenas `SYS_ADMIN` para Playwright
- **Tmpfs limitado**: Diretório temporário com 100MB máximo
- **Rate limiting**: Proteção contra abuso de recursos

## 🚀 Funcionalidades

### **Interface do Usuário**
- Dashboard com métricas em tempo real
- Editor de scripts com syntax highlighting
- Monitor de execuções com logs ao vivo
- Sistema de notificações WebSocket
- Tema claro/escuro

### **Execução de Scripts**
- Execução paralela em contêineres isolados
- Captura automática de screenshots
- Logs detalhados em tempo real
- Cancelamento de execuções
- Histórico completo

### **Monitoramento**
- Status de segurança do sistema
- Métricas de performance
- Logs centralizados
- Analytics de uso

## 📋 Requisitos

### **Sistema**
- **Docker**: Versão 20.10+ (obrigatório para segurança máxima)
- **Node.js**: Versão 18+ 
- **Sistema Operacional**: Linux, macOS, Windows com WSL2

### **Recursos Mínimos**
- **RAM**: 4GB (recomendado 8GB)
- **CPU**: 2 cores (recomendado 4 cores)
- **Disco**: 10GB livres
- **Rede**: Conexão para download de imagens Docker

## 🛠️ Instalação

### **1. Pré-requisitos**

**Instalar Docker:**
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Reiniciar sessão ou executar:
newgrp docker
```

**Verificar Docker:**
```bash
docker --version
docker run hello-world
```

### **2. Configuração do Projeto**

```bash
# Clone o repositório
git clone <repositorio>
cd playwright-automation-platform

# Instalar dependências do backend
cd backend
npm install

# Voltar para raiz e instalar frontend
cd ..
npm install

# Build do frontend
npm run build
```

### **3. Inicialização**

```bash
# Iniciar o sistema
cd backend
npm start
```

O sistema irá:
1. ✅ Verificar disponibilidade do Docker
2. 🐳 Construir imagem Docker do Playwright
3. 🔌 Inicializar WebSocket server
4. 🚀 Iniciar servidor HTTP

## 🔧 Configuração

### **Variáveis de Ambiente**

Crie um arquivo `.env` no diretório `backend/`:

```env
NODE_ENV=production
PORT=3000
WS_PORT=3001
LOG_LEVEL=info

# Configurações Docker
DOCKER_MEMORY_LIMIT=512m
DOCKER_CPU_LIMIT=0.5
DOCKER_TIMEOUT=300000
MAX_CONCURRENT_EXECUTIONS=5

# Segurança
RATE_LIMIT_WINDOW=900000
RATE_LIMIT_MAX=100
EXECUTION_RATE_LIMIT=10
```

### **Configurações de Segurança Docker**

As configurações padrão incluem:

```javascript
securityConfig: {
  memory: '512m',           // Limite de memória
  cpus: '0.5',             // Limite de CPU  
  networkMode: 'none',     // Sem acesso à rede
  readOnly: true,          // Sistema de arquivos somente leitura
  noNewPrivileges: true,   // Sem novos privilégios
  user: 'playwright:playwright', // Usuário não-root
  timeout: 300000          // Timeout de 5 minutos
}
```

## 🌐 Acesso

### **URLs Principais**
- **Dashboard**: http://localhost:3000
- **API Health**: http://localhost:3000/health
- **WebSocket**: ws://localhost:3001

### **Credenciais Padrão**
- **Usuário**: `admin`
- **Senha**: `admin`

## 📊 Monitoramento

### **Health Check**
```bash
curl http://localhost:3000/health
```

### **Status do Sistema**
```bash
curl http://localhost:3000/api/system/status
```

### **Logs**
```bash
# Logs do backend
tail -f backend/logs/backend.log

# Logs do Docker
tail -f backend/logs/docker-execution.log

# Logs do WebSocket
tail -f backend/logs/websocket.log
```

## 🔍 Solução de Problemas

### **Docker não disponível**
```bash
# Verificar status do Docker
systemctl status docker

# Iniciar Docker
sudo systemctl start docker

# Verificar permissões
docker ps
```

### **Erro de permissões**
```bash
# Adicionar usuário ao grupo docker
sudo usermod -aG docker $USER
newgrp docker
```

### **Porta em uso**
```bash
# Verificar portas ocupadas
netstat -tulpn | grep :3000
netstat -tulpn | grep :3001

# Matar processos se necessário
sudo kill -9 <PID>
```

### **Limpeza de contêineres**
```bash
# Remover contêineres parados
docker container prune

# Remover imagens não utilizadas
docker image prune

# Limpeza completa
docker system prune -a
```

## 🚨 Segurança

### **Níveis de Segurança**

1. **Alto (Docker disponível)**:
   - Execução em contêineres isolados
   - Sem acesso à rede
   - Sistema de arquivos protegido
   - Recursos limitados

2. **Médio (Sem Docker)**:
   - Execução em processos separados
   - Sanitização de código
   - Timeouts rigorosos
   - Rate limiting

### **Práticas Recomendadas**

- ✅ Sempre usar Docker em produção
- ✅ Monitorar logs regularmente
- ✅ Atualizar imagens Docker
- ✅ Configurar firewall adequadamente
- ✅ Usar HTTPS em produção

### **Sanitização de Código**

O sistema remove automaticamente:
- `require('fs')`, `require('child_process')`
- `process.*`, `global.*`
- `eval()`, `Function()`
- `setTimeout()`, `setInterval()`

## 📈 Performance

### **Métricas Monitoradas**
- Tempo médio de execução
- Taxa de sucesso
- Uso de recursos
- Execuções simultâneas

### **Otimizações**
- Pool de contêineres reutilizáveis
- Cache de imagens Docker
- Compressão de logs
- Cleanup automático

## 🔄 Atualizações

### **Atualizar Sistema**
```bash
git pull origin main
npm install
npm run build
```

### **Atualizar Imagem Docker**
```bash
cd backend
docker build -t playwright-runner:latest docker/
```

## 📞 Suporte

### **Logs Importantes**
- `backend/logs/backend.log` - Logs gerais
- `backend/logs/docker-execution.log` - Execuções Docker
- `backend/logs/websocket.log` - Comunicação WebSocket

### **Comandos de Debug**
```bash
# Status dos contêineres
docker ps -a

# Logs de um contêiner específico
docker logs <container_id>

# Estatísticas de recursos
docker stats
```

---

**Desenvolvido com foco em segurança máxima** 🔒🐳