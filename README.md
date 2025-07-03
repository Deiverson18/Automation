# Guia de Configuração Windows - Node.js v18 + NGINX

Uma configuração completa para ambiente de produção no Windows com Node.js e NGINX como proxy reverso.

## 🎯 Requisitos do Sistema

- **Sistema Operacional**: Windows 10/11 ou Windows Server
- **Node.js**: Versão 18.x (LTS)
- **NGINX**: Versão mais recente para Windows
- **Privilégios**: Acesso de Administrador
- **Portas**: 80 (NGINX), 3000 (Backend)

## 📁 Estrutura do Projeto

```
playwright-automation-platform/
├── backend/                 # Servidor Node.js (Express)
│   ├── package.json
│   ├── server.js
│   └── routes/
├── frontend/               # Aplicação React/SPA
│   ├── package.json
│   ├── src/
│   └── dist/              # Build de produção
├── config/
│   ├── nginx.conf         # Configuração NGINX
│   ├── pm2.config.js      # Gerenciamento de processos
│   └── windows.conf       # Configurações específicas Windows
├── scripts/
│   ├── install.bat        # Script de instalação
│   ├── start.bat          # Script de inicialização
│   ├── stop.bat           # Script para parar serviços
│   └── restart.bat        # Script de reinicialização
├── logs/                  # Diretório de logs
└── README.md
```

## 🚀 Instalação Rápida

### 1. Pré-requisitos

**Instalar Node.js v18:**
```bash
# Baixar de: https://nodejs.org/en/download/
# Verificar instalação:
node -v
npm -v
```

**Instalar NGINX para Windows:**
```bash
# Baixar de: http://nginx.org/en/download.html
# Extrair para: C:\nginx
```

### 2. Configuração Automática

Execute como **Administrador**:
```batch
# Clone o projeto
git clone <repositorio>
cd playwright-automation-platform

# Execute o script de instalação
scripts\install.bat
```

### 3. Inicialização

```batch
# Iniciar todos os serviços
scripts\start.bat

# Ou individualmente:
scripts\start-backend.bat
scripts\start-nginx.bat
```

## 🔧 Configuração Manual

### Backend (Node.js + Express)

O backend já está configurado e rodando na porta 3000. Para verificar:

```bash
cd backend
npm install
npm start
```

### Frontend (React Build)

O frontend já foi buildado e está na pasta `dist/`. Para rebuildar:

```bash
npm run build
```

### NGINX como Proxy Reverso

1. **Copiar configuração:**
```batch
copy config\nginx.conf C:\nginx\conf\nginx.conf
```

2. **Iniciar NGINX:**
```batch
cd C:\nginx
start nginx
```

3. **Verificar status:**
```batch
tasklist /fi "imagename eq nginx.exe"
```

## 🌐 Acesso ao Sistema

### URLs de Acesso

- **Local**: http://localhost ou http://127.0.0.1
- **Rede Local**: http://SEU_IP_LOCAL
- **Rede Externa**: http://SEU_IP_EXTERNO

### Verificação de Conectividade

```batch
# Verificar portas abertas
netstat -an | findstr :80
netstat -an | findstr :3000

# Testar conectividade
curl http://localhost
curl http://localhost/api/health
```

## 🛠️ Gerenciamento de Serviços

### PM2 (Gerenciador de Processos)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicação
pm2 start config\pm2.config.js

# Monitorar
pm2 monit

# Logs
pm2 logs

# Reiniciar
pm2 restart all

# Parar
pm2 stop all
```

### NGINX

```batch
# Iniciar
cd C:\nginx && start nginx

# Recarregar configuração
nginx -s reload

# Parar
nginx -s quit

# Verificar configuração
nginx -t
```

## 🔒 Configuração de Firewall

### Windows Firewall

```batch
# Permitir porta 80 (HTTP)
netsh advfirewall firewall add rule name="HTTP Port 80" dir=in action=allow protocol=TCP localport=80

# Permitir porta 3000 (Backend)
netsh advfirewall firewall add rule name="Node.js Port 3000" dir=in action=allow protocol=TCP localport=3000

# Verificar regras
netsh advfirewall firewall show rule name="HTTP Port 80"
```

## 📊 Monitoramento e Logs

### Localização dos Logs

- **Backend**: `logs/backend.log`
- **NGINX**: `C:\nginx\logs\access.log` e `C:\nginx\logs\error.log`
- **PM2**: `%USERPROFILE%\.pm2\logs\`

### Comandos de Monitoramento

```batch
# Verificar processos
tasklist | findstr node
tasklist | findstr nginx

# Monitorar logs em tempo real
tail -f logs\backend.log
tail -f C:\nginx\logs\access.log
```

## 🚨 Solução de Problemas

### Problemas Comuns

**1. Porta 80 já em uso:**
```batch
# Verificar processo usando porta 80
netstat -ano | findstr :80
# Parar IIS se necessário
iisreset /stop
```

**2. Node.js não encontrado:**
```batch
# Verificar PATH
echo %PATH%
# Reinstalar Node.js se necessário
```

**3. NGINX não inicia:**
```batch
# Verificar configuração
cd C:\nginx
nginx -t
# Verificar logs de erro
type logs\error.log
```

### Comandos de Diagnóstico

```batch
# Status geral do sistema
scripts\status.bat

# Teste de conectividade
scripts\test-connectivity.bat

# Limpeza de logs
scripts\clean-logs.bat
```

## 🔄 Atualizações e Manutenção

### Atualização da Aplicação

```batch
# Parar serviços
scripts\stop.bat

# Atualizar código
git pull origin main

# Rebuildar frontend
npm run build

# Reiniciar serviços
scripts\start.bat
```

### Backup

```batch
# Backup automático
scripts\backup.bat

# Restaurar backup
scripts\restore.bat YYYY-MM-DD
```

## 📞 Suporte e Documentação

### URLs Importantes

- **Dashboard**: http://localhost/dashboard
- **API Health**: http://localhost/api/health
- **Documentação API**: http://localhost/api/docs
- **Logs Web**: http://localhost/logs

### Contatos

- **Suporte Técnico**: suporte@playwright-platform.com
- **Documentação**: https://docs.playwright-platform.com
- **Issues**: https://github.com/projeto/issues

---

**Desenvolvido para ambiente Windows de produção** 🚀