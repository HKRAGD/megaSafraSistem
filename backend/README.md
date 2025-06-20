# 🌱 Sistema de Gerenciamento de Câmaras Refrigeradas - Backend

Backend em Node.js/Express para gerenciamento de câmaras refrigeradas de sementes agrícolas.

## 🚀 Tecnologias

- **Node.js 18+** - Runtime JavaScript
- **Express.js** - Framework web
- **MongoDB** - Banco de dados NoSQL
- **Mongoose** - ODM para MongoDB
- **JWT** - Autenticação
- **Joi** - Validação de dados
- **Jest** - Testes
- **Swagger** - Documentação API

## 📁 Estrutura do Projeto

```
backend/
├── src/
│   ├── config/         # Configurações (DB, Auth, Swagger)
│   ├── controllers/    # Controllers das rotas
│   ├── middleware/     # Middlewares (auth, validação, erros)
│   ├── models/         # Models do Mongoose
│   ├── routes/         # Definição das rotas
│   ├── services/       # Lógica de negócio
│   ├── utils/          # Utilitários
│   └── tests/          # Testes
├── .env.example        # Exemplo de variáveis de ambiente
├── package.json        # Dependências e scripts
└── server.js          # Entrada da aplicação
```

## ⚙️ Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env` e configure as variáveis:

```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas configurações:

```env
# Servidor
PORT=3000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sistema-sementes
MONGODB_TEST_URI=mongodb://localhost:27017/sistema-sementes-test

# JWT
JWT_SECRET=seu_jwt_secret_super_seguro_aqui
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=seu_jwt_refresh_secret_super_seguro_aqui
JWT_REFRESH_EXPIRES_IN=30d

# Hash
BCRYPT_ROUNDS=12

# CORS
CORS_ORIGIN=http://localhost:3001
```

### 3. Iniciar MongoDB

Certifique-se de que o MongoDB está rodando:

```bash
# Windows
net start MongoDB

# macOS/Linux
sudo systemctl start mongod
```

### 4. Executar a Aplicação

```bash
# Desenvolvimento (com auto-reload)
npm run dev

# Produção
npm start
```

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar testes em modo watch
npm run test:watch

# Executar testes com coverage
npm run test:coverage
```

## 📋 Scripts Disponíveis

- `npm start` - Inicia o servidor em produção
- `npm run dev` - Inicia o servidor em desenvolvimento com nodemon
- `npm test` - Executa os testes
- `npm run test:watch` - Executa os testes em modo watch
- `npm run test:coverage` - Executa os testes com relatório de cobertura

## 🔐 Autenticação

O sistema utiliza JWT (JSON Web Tokens) para autenticação. Cada usuário possui uma role:

- **admin** - Acesso total ao sistema
- **operator** - Operações de estoque e movimentação
- **viewer** - Apenas visualização

## 📊 Models Principais

### User
- Gestão de usuários do sistema
- Autenticação e autorização

### SeedType
- Tipos de sementes dinâmicos
- Configurações de armazenamento

### Chamber
- Câmaras refrigeradas
- Estrutura hierárquica (quadras, lados, filas, andares)

### Location
- Localizações específicas dentro das câmaras
- Controle de ocupação e capacidade

### Product
- Produtos armazenados (sementes)
- Rastreamento completo

### Movement
- Histórico de movimentações
- Auditoria de alterações

## 🔄 Regras de Negócio

### Críticas
- **Uma localização = Um produto** - Nunca permitir dois produtos na mesma localização
- **Movimentações automáticas** - Toda alteração de produto gera movimento
- **Validação de capacidade** - Verificar peso máximo antes de armazenar
- **Hierarquia respeitada** - Coordenadas dentro dos limites da câmara

### Validações
- Email único para usuários
- Códigos de localização únicos por câmara
- Datas de validade não podem ser passadas
- Quantidades e pesos positivos

## 🚀 Status de Desenvolvimento

### ✅ Concluído
- [x] Setup inicial do projeto
- [x] Configuração de dependências
- [x] Estrutura de pastas
- [x] Configuração MongoDB
- [x] Configuração JWT
- [x] Middleware de tratamento de erros
- [x] Servidor Express configurado

### 🔄 Em Progresso
- [ ] Models Mongoose
- [ ] Controllers e Routes
- [ ] Services de negócio
- [ ] Testes
- [ ] Documentação Swagger

## 📞 API Endpoints

### Health Check
- `GET /` - Informações da API
- `GET /api/health` - Status de saúde da API

### Autenticação (TODO)
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Registro (admin only)
- `POST /api/auth/refresh` - Refresh token
- `POST /api/auth/logout` - Logout

*Mais endpoints serão documentados conforme implementação...*

## 🐛 Troubleshooting

### Erro de Conexão MongoDB
```
Error: MONGODB_URI não definida nas variáveis de ambiente
```
**Solução**: Verifique se o arquivo `.env` existe e contém `MONGODB_URI`

### Erro de JWT
```
Error: JWT_SECRET não definido nas variáveis de ambiente
```
**Solução**: Configure `JWT_SECRET` no arquivo `.env`

## 📝 Próximos Passos

1. Implementar todos os Models Mongoose
2. Criar Controllers e Routes
3. Implementar Services com lógica de negócio
4. Adicionar testes completos
5. Documentar API com Swagger
6. Otimizações de performance

## 🤝 Contribuição

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request 