# 🛠️ Scripts de Administração - Sistema de Sementes

Este diretório contém scripts utilitários para administração do sistema de gerenciamento de câmaras refrigeradas.

## 📋 Scripts Disponíveis

### 1. 👤 Criar Usuário Administrador
**Arquivo:** `createAdmin.js`

Cria o primeiro usuário administrador no sistema.

```bash
node scripts/createAdmin.js
```

**Funcionalidades:**
- ✅ Verifica se já existe um administrador
- ✅ Cria usuário admin com credenciais padrão
- ✅ Promove usuário existente para admin se necessário
- ✅ Validações de segurança

**Credenciais Padrão:**
- 📧 **Email:** `admin@sistema-sementes.com`
- 🔑 **Senha:** `admin123456`
- 🔐 **Role:** `admin`

> ⚠️ **IMPORTANTE:** Altere a senha após o primeiro login!

---

### 2. 🔑 Redefinir Senha de Usuário
**Arquivo:** `resetPassword.js`

Permite redefinir a senha de qualquer usuário do sistema.

#### Redefinir Senha:
```bash
node scripts/resetPassword.js email@exemplo.com novaSenha
```

#### Listar Usuários:
```bash
node scripts/resetPassword.js list
# ou simplesmente
node scripts/resetPassword.js
```

**Exemplos:**
```bash
# Redefinir senha do admin
node scripts/resetPassword.js admin@sistema-sementes.com minhaNovaSenh@123

# Redefinir senha de operador
node scripts/resetPassword.js operador@empresa.com senha123456

# Listar todos os usuários
node scripts/resetPassword.js list
```

**Funcionalidades:**
- ✅ Lista todos os usuários do sistema
- ✅ Redefine senha com validações
- ✅ Mostra informações de acesso
- ✅ Validações de email e senha

---

## 🚀 Como Usar

### Pré-requisitos
1. **MongoDB rodando:** Certifique-se que o MongoDB está ativo
2. **Variáveis de ambiente:** Arquivo `.env` configurado
3. **Dependências:** Execute `npm install` antes

### Primeiro Uso do Sistema

1. **Criar usuário administrador:**
   ```bash
   node scripts/createAdmin.js
   ```

2. **Anotar as credenciais exibidas:**
   ```
   📧 Email: admin@sistema-sementes.com
   🔑 Senha: admin123456
   ```

3. **Testar login via API:**
   ```bash
   curl -X POST http://localhost:3001/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@sistema-sementes.com","password":"admin123456"}'
   ```

4. **Alterar senha (opcional):**
   ```bash
   node scripts/resetPassword.js admin@sistema-sementes.com minhaSenhaSegura123
   ```

---

## 🔐 Segurança

### Boas Práticas:
- 🔴 **Nunca** compartilhe as credenciais do administrador
- 🔴 **Sempre** altere a senha padrão após primeiro login
- 🔴 **Use** senhas fortes (mínimo 6 caracteres)
- 🟢 **Mantenha** registro seguro das credenciais
- 🟢 **Execute** os scripts apenas quando necessário

### Validações Implementadas:
- ✅ Email válido obrigatório
- ✅ Senha mínima de 6 caracteres
- ✅ Verificação de usuários existentes
- ✅ Conexão segura com MongoDB
- ✅ Logs detalhados de operações

---

## 🐛 Solução de Problemas

### Erro: "Usuário não encontrado"
```bash
# Liste todos os usuários primeiro
node scripts/resetPassword.js list

# Use o email exato mostrado na lista
node scripts/resetPassword.js email.exato@sistema.com novaSenha
```

### Erro: "Conexão com MongoDB"
1. Verifique se MongoDB está rodando
2. Confirme as variáveis no arquivo `.env`
3. Teste a conectividade:
   ```bash
   # Windows
   mongosh "mongodb://localhost:27017/sistema-sementes"
   
   # Ou teste direto no código
   node -e "require('dotenv').config(); console.log(process.env.MONGODB_URI)"
   ```

### Erro: "Email já existe"
```bash
# Se você quer promover usuário existente para admin
node scripts/createAdmin.js
# O script detectará automaticamente e promoverá o usuário
```

### Erro: "Senha muito simples"
- Use pelo menos 6 caracteres
- Inclua letras e números
- Evite senhas óbvias como "123456"

---

## 📞 Suporte

### Logs dos Scripts:
- ✅ **Sucesso:** Mensagens em verde com ✅
- ⚠️ **Atenção:** Mensagens em amarelo com ⚠️
- ❌ **Erro:** Mensagens em vermelho com ❌

### Informações Úteis:
- 🔗 **API URL:** `http://localhost:3001/api`
- 📊 **Banco:** `sistema-sementes`
- 🗂️ **Collection:** `users`

### Em Caso de Problemas:
1. Verifique os logs do script
2. Confirme se o backend está rodando
3. Teste a conexão com MongoDB
4. Verifique as variáveis de ambiente

---

## 📝 Exemplos Completos

### Cenário 1: Primeira Instalação
```bash
# 1. Criar admin
node scripts/createAdmin.js

# 2. Listar usuários criados
node scripts/resetPassword.js list

# 3. Testar login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistema-sementes.com","password":"admin123456"}'
```

### Cenário 2: Esqueci a Senha do Admin
```bash
# 1. Listar usuários para confirmar email
node scripts/resetPassword.js list

# 2. Redefinir senha
node scripts/resetPassword.js admin@sistema-sementes.com novaSenhaSegura123

# 3. Testar novo login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@sistema-sementes.com","password":"novaSenhaSegura123"}'
```

### Cenário 3: Gerenciar Múltiplos Usuários
```bash
# 1. Ver todos os usuários
node scripts/resetPassword.js list

# 2. Redefinir senha de operador
node scripts/resetPassword.js operador@empresa.com novasenha123

# 3. Redefinir senha de visualizador
node scripts/resetPassword.js viewer@empresa.com senha456
```

---

## 🎯 Próximos Passos

Após configurar o usuário administrador:

1. **Acesse o sistema** via API ou interface web
2. **Crie usuários adicionais** com roles apropriadas:
   - 👑 `admin`: Acesso total
   - ⚙️ `operator`: Operações de estoque
   - 👁️ `viewer`: Apenas visualização
3. **Configure as câmaras** e localizações
4. **Cadastre tipos de sementes**
5. **Inicie as operações** de estoque

---

*💡 **Dica:** Mantenha este arquivo README.md como referência para futuras operações administrativas.* 