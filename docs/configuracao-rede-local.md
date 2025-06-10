# Configuração para Acesso via Rede Local

## 🌐 Problema Resolvido: ERR_CONNECTION_REFUSED

Este documento explica como configurar o Sistema de Câmaras Refrigeradas para permitir acesso de múltiplos computadores na mesma rede local.

## 🚨 Problema Original

```
POST http://localhost:3001/api/auth/login net::ERR_CONNECTION_REFUSED
```

**Causa:** Frontend tentando acessar `localhost:3001` de um computador remoto (IP: 192.168.1.89), mas backend configurado apenas para localhost.

## ✅ Solução Implementada

### 1. **Backend - Configuração de Rede**

**Arquivo:** `backend/.env`
```env
PORT=3001
HOST=0.0.0.0                              # ✅ Bind para todas as interfaces
CORS_ORIGIN=http://192.168.1.89:3000     # ✅ Permitir frontend da rede
```

**Arquivo:** `backend/server.js`
```javascript
const HOST = process.env.HOST || '0.0.0.0';
const server = app.listen(PORT, HOST, () => {
  // Servidor agora aceita conexões de qualquer IP da rede local
});
```

### 2. **Frontend - Configuração de API**

**Arquivo:** `frontend/.env.local`
```env
REACT_APP_API_URL=http://192.168.1.89:3001/api  # ✅ IP do servidor na rede
HOST=0.0.0.0                                     # ✅ Frontend acessível na rede
```

## 🔧 Como Testar

### 1. **Reiniciar os Serviços**
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd frontend
npm start

# Ou ambos juntos (da raiz do projeto)
npm run dev
```

### 2. **Verificar Logs do Backend**
Deve mostrar:
```
🚀 Servidor rodando na porta 3001
🌐 Host: 0.0.0.0 (todas as interfaces de rede)
🔗 API Base URL Local: http://localhost:3001/api
🔗 API Base URL Rede: http://192.168.1.89:3001/api
✅ Frontend permitido: http://192.168.1.89:3000
```

### 3. **Testar Conectividade**

**Do computador servidor (onde roda o backend):**
- Local: http://localhost:3000
- Rede: http://192.168.1.89:3000

**De outro computador na rede:**
- Acesso: http://192.168.1.89:3000
- API: http://192.168.1.89:3001/api/health

## 🔒 Configurações de Segurança

### CORS Configurado
```javascript
// backend/src/app.js
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true
}));
```

### Headers de Segurança
- ✅ Helmet.js ativo para headers de segurança
- ✅ CORS restrito ao IP específico do frontend
- ✅ Credenciais permitidas para autenticação JWT

## 🌍 Encontrar seu IP Local

### Windows:
```cmd
ipconfig | findstr "IPv4"
```

### Linux/macOS:
```bash
ip a | grep inet
# ou
ifconfig | grep "inet "
```

### Atualizar Configuração
1. **Encontre seu IP** (ex: 192.168.1.100)
2. **Atualize backend/.env:**
   ```env
   CORS_ORIGIN=http://192.168.1.100:3000
   ```
3. **Atualize frontend/.env.local:**
   ```env
   REACT_APP_API_URL=http://192.168.1.100:3001/api
   ```
4. **Reinicie os serviços**

## 🔥 Troubleshooting

### Problema: Ainda não conecta
1. **Verificar firewall** do sistema operacional
2. **Confirmar IP correto** com `ipconfig/ifconfig`
3. **Testar endpoint** direto: `http://IP:3001/api/health`

### Problema: CORS Error
- Verificar se `CORS_ORIGIN` no backend corresponde exatamente ao IP do frontend
- Incluir porta correta (3000 para React)

### Problema: MongoDB Connection
- MongoDB deve estar rodando na máquina servidor
- Outros computadores acessam via backend, não diretamente ao MongoDB

## 🚀 Comandos Rápidos

```bash
# Verificar se portas estão abertas
netstat -an | findstr :3001    # Windows
netstat -an | grep :3001       # Linux/macOS

# Testar conectividade
curl http://192.168.1.89:3001/api/health

# Ver logs em tempo real
npm run dev | grep -E "(🚀|❌|✅)"
```

## 📝 Configuração para Produção

Para ambiente de produção, considere:

1. **Variáveis de ambiente específicas:**
```env
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com
HOST=0.0.0.0
```

2. **Proxy reverso** (Nginx):
```nginx
server {
    listen 80;
    server_name seu-ip;
    
    location /api/ {
        proxy_pass http://localhost:3001/api/;
    }
    
    location / {
        proxy_pass http://localhost:3000/;
    }
}
```

---

**Data da Configuração:** 09/06/2025  
**Versão:** Sistema de Câmaras Refrigeradas v1.0  
**Status:** ✅ **CONFIGURAÇÃO COMPLETA E TESTADA** 