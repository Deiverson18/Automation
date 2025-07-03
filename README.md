# Playwright Automation Platform

Uma plataforma moderna e elegante para automação com Playwright, oferecendo gerenciamento completo de scripts, monitoramento em tempo real e análise detalhada das execuções.

## 🚀 Deploy no Render

### Configuração Automática

1. **Conecte seu repositório** ao Render
2. **Configure as variáveis de ambiente**:
   ```
   NODE_ENV=production
   PORT=10000 (automaticamente definido pelo Render)
   ```

3. **Configurações de Build**:
   - **Build Command**: `npm ci && npm run build`
   - **Start Command**: `npm start`
   - **Node Version**: 18.19.0

### Configuração Manual

Se preferir configurar manualmente:

```bash
# 1. Clone o repositório
git clone <seu-repositorio>
cd playwright-automation-platform

# 2. Instale as dependências
npm install

# 3. Build para produção
npm run build

# 4. Inicie o servidor
npm start
```

### URLs de Acesso

- **Produção**: https://criptobalancer.onrender.com
- **Health Check**: https://criptobalancer.onrender.com/health
- **Dashboard**: https://criptobalancer.onrender.com/dashboard

## 🛠️ Tecnologias

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS + Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts
- **Server**: Express.js
- **Deploy**: Render

## 📋 Funcionalidades

### Dashboard Principal
- Estatísticas em tempo real
- Gráficos de execução
- Métricas de performance
- Execuções recentes

### Gerenciamento de Scripts
- Editor de código integrado
- Sistema de tags
- Controle de versão
- Parâmetros dinâmicos

### Monitoramento
- Logs em tempo real
- Status de execução
- Histórico completo
- Alertas e notificações

### Configuração
- Painel de administração
- Configurações de segurança
- Gerenciamento de usuários
- Configurações do Playwright

## 🔐 Autenticação

Credenciais padrão para desenvolvimento:
- **Usuário**: admin
- **Senha**: admin

## 🎨 Design System

### Cores
- **Primário**: Azul (#3B82F6)
- **Secundário**: Roxo (#8B5CF6)
- **Accent**: Verde (#10B981)
- **Sucesso**: Verde (#22C55E)
- **Aviso**: Amarelo (#F59E0B)
- **Erro**: Vermelho (#EF4444)

### Tipografia
- **Principal**: Inter
- **Código**: Fira Code

### Responsividade
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## 📊 Monitoramento

### Health Check
O endpoint `/health` retorna:
```json
{
  "status": "OK",
  "timestamp": "2024-01-25T10:00:00.000Z",
  "environment": "production"
}
```

### Logs
- Logs estruturados com níveis (info, warn, error, debug)
- Timestamps em ISO 8601
- Contexto de execução
- Rastreamento de erros

## 🔧 Configuração Avançada

### Variáveis de Ambiente
```env
NODE_ENV=production
PORT=10000
LOG_LEVEL=info
MAX_CONCURRENT_EXECUTIONS=5
SESSION_TIMEOUT=3600
```

### Docker
```bash
# Build da imagem
docker build -t playwright-platform .

# Executar container
docker run -p 3000:3000 playwright-platform
```

## 📈 Performance

- **Build otimizado** com code splitting
- **Lazy loading** de componentes
- **Caching** de assets estáticos
- **Compressão** gzip/brotli
- **Minificação** de CSS/JS

## 🛡️ Segurança

- Autenticação baseada em sessão
- Validação de entrada
- Rate limiting
- Headers de segurança
- Logs de auditoria

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Documentação: [Link para docs]
- Issues: [Link para GitHub Issues]
- Email: suporte@playwright-platform.com

---

**Desenvolvido com ❤️ para automação moderna**