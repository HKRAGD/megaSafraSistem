# 🌍 Configuração para Acesso Público - Sistema Mega Safra

## 🎯 Objetivo

Permitir acesso ao Sistema de Câmaras Refrigeradas tanto da **rede local** quanto de **computadores externos** via IP público, mantendo segurança e performance.

## 🔧 Configuração Automática

### **1. Script de Configuração Automática**

Execute o script que detecta automaticamente seu IP público e configura tudo:

```bash
# Detectar IP automaticamente e configurar
node scripts/setup-public-access.js

# Ou fornecer IP manualmente
node scripts/setup-public-access.js 203.0.113.45

# Com teste de conectividade
node scripts/setup-public-access.js --test
```

### **2. Configuração Manual**

Se preferir configurar manualmente:

#### **Backend (`backend/.env`)**
```env
# Configuração básica
PORT=3001
HOST=0.0.0.0
NODE_ENV=development

# Banco de dados
MONGODB_URI=mongodb://localhost:27017/mega-safra-01

# IPs de acesso
PUBLIC_IP=203.0.113.45                    # ✅ SEU IP PÚBLICO
LOCAL_IP=192.168.1.89                     # ✅ IP da rede local

# CORS - Múltiplas origens
CORS_ORIGIN=http://192.168.1.89:3000,http://203.0.113.45:3000

# URLs de acesso
API_URL_LOCAL=http://192.168.1.89:3001/api
API_URL_PUBLIC=http://203.0.113.45:3001/api
```

#### **Frontend (`frontend/.env.local`)**
```env
# Detecção automática de rede
REACT_APP_API_URL_LOCAL=http://192.168.1.89:3001/api
REACT_APP_API_URL_PUBLIC=http://203.0.113.45:3001/api

# IPs para configuração
REACT_APP_LOCAL_IP=192.168.1.89
REACT_APP_PUBLIC_IP=203.0.113.45

# Configurações do React
HOST=0.0.0.0
GENERATE_SOURCEMAP=false
```

## 🌐 Como Funciona a Detecção Automática

O sistema **detecta automaticamente** se está sendo acessado localmente ou externamente:

### **Acesso Local:**
- URL: `http://192.168.1.89:3000`
- API: `http://192.168.1.89:3001/api`
- **Usado quando:** Acessado do IP local da rede

### **Acesso Externo:**
- URL: `http://203.0.113.45:3000`
- API: `http://203.0.113.45:3001/api`
- **Usado quando:** Acessado do IP público

## 🔧 Configuração do Roteador

### **1. Redirecionamento de Portas (Port Forwarding)**

Configure no seu roteador:

| Serviço | Porta Externa | Porta Interna | IP Interno |
|---------|---------------|---------------|------------|
| Frontend | 3000 | 3000 | 192.168.1.89 |
| Backend API | 3001 | 3001 | 192.168.1.89 |

### **2. DMZ (Alternativa)**

Se disponível, coloque o IP do servidor (192.168.1.89) na DMZ do roteador.

⚠️ **Cuidado:** DMZ expõe todos os serviços - use apenas se necessário.

## 🔥 Configuração do Firewall

### **Windows Firewall**
```cmd
# Liberar portas de entrada
netsh advfirewall firewall add rule name="Mega Safra Frontend" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Mega Safra Backend" dir=in action=allow protocol=TCP localport=3001
```

### **Linux (UFW)**
```bash
# Liberar portas
sudo ufw allow 3000
sudo ufw allow 3001

# Verificar status
sudo ufw status
```

### **Linux (iptables)**
```bash
# Liberar portas
sudo iptables -A INPUT -p tcp --dport 3000 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 3001 -j ACCEPT

# Salvar regras
sudo iptables-save > /etc/iptables/rules.v4
```

## 🧪 Testes de Conectividade

### **1. Testar do Próprio Servidor**
```bash
# Testar backend local
curl http://localhost:3001/api/health

# Testar backend via IP local
curl http://192.168.1.89:3001/api/health

# Testar backend via IP público (interno)
curl http://203.0.113.45:3001/api/health
```

### **2. Testar de Computador Externo**
```bash
# Testar conectividade básica
ping 203.0.113.45

# Testar portas específicas
telnet 203.0.113.45 3001
telnet 203.0.113.45 3000

# Testar API
curl http://203.0.113.45:3001/api/health
```

### **3. Ferramentas Online**
- **Port Checker:** https://www.yougetsignal.com/tools/open-ports/
- **Can You See Me:** https://canyouseeme.org/
- **Ping Test:** https://ping.eu/ping/

## 🔒 Considerações de Segurança

### **1. HTTPS em Produção**

Para produção, configure certificado SSL:

#### **Usar Certbot (Let's Encrypt)**
```bash
# Instalar certbot
sudo apt install certbot

# Gerar certificado
sudo certbot certonly --standalone -d seu-dominio.com

# Configurar renovação automática
sudo crontab -e
# Adicionar: 0 12 * * * /usr/bin/certbot renew --quiet
```

#### **Atualizar para HTTPS**
```env
# backend/.env para produção
NODE_ENV=production
CORS_ORIGIN=https://seu-dominio.com
```

### **2. Configurações de Segurança Adicionais**

#### **Rate Limiting**
O sistema já possui rate limiting configurado para prevenir ataques DDoS.

#### **Headers de Segurança**
Helmet.js já está configurado com:
- XSS Protection
- Content Security Policy
- HSTS (em HTTPS)
- Frame Options

#### **Autenticação Robusta**
- JWT com refresh token
- Senhas hash com bcrypt
- Roles de usuário (admin/operator/viewer)

## 🚨 Troubleshooting

### **Erro: CORS blocked**
```
CORS: Origem http://SEU_IP:3000 não permitida
```

**Solução:**
1. Verificar se `CORS_ORIGIN` no backend/.env inclui seu IP
2. Reiniciar backend após alteração
3. Verificar logs do backend para confirmar origens permitidas

### **Erro: ERR_CONNECTION_REFUSED**
```
POST http://SEU_IP:3001/api/auth/login net::ERR_CONNECTION_REFUSED
```

**Soluções:**
1. **Verificar redirecionamento de portas no roteador**
2. **Verificar firewall do servidor**
3. **Confirmar que backend está rodando**
4. **Testar conectividade com `telnet SEU_IP 3001`**

### **Erro: Timeout**
```
POST http://SEU_IP:3001/api/auth/login net::ERR_NETWORK_TIMEOUT
```

**Soluções:**
1. **Verificar se as portas estão abertas no roteador**
2. **Verificar firewall do provedor de internet**
3. **Confirmar IP público correto**

### **Backend funciona, Frontend não carrega**
1. **Verificar porta 3000 no roteador**
2. **Verificar se React está rodando**
3. **Acessar diretamente**: `http://SEU_IP:3000`

## 📊 Monitoramento

### **Logs do Sistema**
```bash
# Ver logs em tempo real
npm run dev | grep -E "(🚀|❌|✅|🔒)"

# Verificar CORS
npm run dev | grep CORS
```

### **Status do Sistema**
```bash
# Verificar se serviços estão rodando
netstat -tlnp | grep :3000
netstat -tlnp | grep :3001
```

## 🎯 URLs de Acesso

Após configuração completa:

### **Acesso Local (rede interna):**
- **Frontend:** http://192.168.1.89:3000
- **API:** http://192.168.1.89:3001/api

### **Acesso Externo (internet):**
- **Frontend:** http://SEU_IP_PUBLICO:3000
- **API:** http://SEU_IP_PUBLICO:3001/api

### **Credenciais Padrão:**
- **Email:** admin@sistema-sementes.com
- **Senha:** admin123456

## 🚀 Checklist Final

- [ ] ✅ IP público configurado em backend/.env
- [ ] ✅ IP público configurado em frontend/.env.local
- [ ] ✅ Redirecionamento de portas configurado no roteador
- [ ] ✅ Firewall configurado no servidor
- [ ] ✅ Backend rodando e acessível externamente
- [ ] ✅ Frontend rodando e acessível externamente
- [ ] ✅ Login funcionando de computador externo
- [ ] ✅ Todas as funcionalidades testadas

---

**Data da Configuração:** 09/06/2025  
**Sistema:** Mega Safra - Câmaras Refrigeradas v1.0  
**Status:** ✅ **ACESSO PÚBLICO CONFIGURADO** 