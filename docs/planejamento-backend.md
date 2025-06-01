# Backend - Sistema de Gerenciamento de Câmaras Refrigeradas

## 🚀 Stack Tecnológico
- **Runtime**: Node.js 18+
- **Framework**: Express.js
- **Banco de Dados**: MongoDB + Mongoose
- **Autenticação**: JWT (jsonwebtoken)
- **Validação**: Joi ou Yup
- **Testes**: Jest + Supertest
- **Documentação**: Swagger/OpenAPI

## 📁 Estrutura de Pastas
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js
│   │   ├── auth.js
│   │   └── swagger.js
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── tests/
├── package.json
└── server.js
```

## 🗄️ Models (MongoDB/Mongoose)

### User
```javascript
{
  name: String (required),
  email: String (required, unique),
  password: String (required, hashed),
  role: String (enum: ['admin', 'operator', 'viewer']),
  isActive: Boolean (default: true),
  timestamps: true
}
```

### SeedType
```javascript
{
  name: String (required, unique),
  description: String,
  optimalTemperature: Number,
  optimalHumidity: Number,
  maxStorageTimeDays: Number,
  isActive: Boolean (default: true),
  timestamps: true
}
```

### Chamber
```javascript
{
  name: String (required, unique),
  description: String,
  currentTemperature: Number,
  currentHumidity: Number,
  dimensions: {
    quadras: Number (required, min: 1),
    lados: Number (required, min: 1),
    filas: Number (required, min: 1),
    andares: Number (required, min: 1)
  },
  status: String (enum: ['active', 'maintenance', 'inactive']),
  timestamps: true
}
```

### Location
```javascript
{
  chamberId: ObjectId (ref: 'Chamber', required),
  coordinates: {
    quadra: Number (required),
    lado: Number (required),
    fila: Number (required),
    andar: Number (required)
  },
  code: String (auto-generated: "Q1-L2-F3-A4"),
  isOccupied: Boolean (default: false),
  maxCapacityKg: Number (default: 1000),
  currentWeightKg: Number (default: 0),
  timestamps: true
}
```

### Product
```javascript
{
  name: String (required),
  lot: String (required),
  seedTypeId: ObjectId (ref: 'SeedType', required),
  quantity: Number (required),
  storageType: String (enum: ['saco', 'bag'], required),
  weightPerUnit: Number (required),
  totalWeight: Number (calculated),
  locationId: ObjectId (ref: 'Location', required),
  entryDate: Date (default: Date.now),
  expirationDate: Date,
  status: String (enum: ['stored', 'reserved', 'removed']),
  notes: String,
  timestamps: true
}
```

### Movement
```javascript
{
  productId: ObjectId (ref: 'Product', required),
  type: String (enum: ['entry', 'exit', 'transfer', 'adjustment']),
  fromLocationId: ObjectId (ref: 'Location'),
  toLocationId: ObjectId (ref: 'Location'),
  quantity: Number (required),
  weight: Number (required),
  userId: ObjectId (ref: 'User', required),
  reason: String,
  notes: String,
  timestamp: Date (default: Date.now)
}
```

## 📚 Controllers & Routes

### 1. Auth Controller (`/api/auth`)
- `POST /login` - Login usuário
- `POST /register` - Registrar usuário (admin only)
- `POST /refresh` - Refresh token
- `POST /logout` - Logout

### 2. Users Controller (`/api/users`)
- `GET /` - Listar usuários (paginado)
- `POST /` - Criar usuário
- `GET /:id` - Obter usuário específico
- `PUT /:id` - Atualizar usuário
- `DELETE /:id` - Desativar usuário

### 3. SeedTypes Controller (`/api/seed-types`)
- `GET /` - Listar tipos de sementes
- `POST /` - Criar tipo de semente
- `GET /:id` - Obter tipo específico
- `PUT /:id` - Atualizar tipo
- `DELETE /:id` - Desativar tipo

### 4. Chambers Controller (`/api/chambers`)
- `GET /` - Listar câmaras
- `POST /` - Criar câmara
- `GET /:id` - Obter câmara específica
- `PUT /:id` - Atualizar câmara
- `DELETE /:id` - Desativar câmara
- `POST /:id/generate-locations` - Gerar localizações automaticamente

### 5. Locations Controller (`/api/locations`)
- `GET /` - Listar localizações (com filtros)
- `GET /chamber/:chamberId` - Localizações por câmara
- `GET /available` - Apenas localizações disponíveis
- `GET /:id` - Obter localização específica
- `PUT /:id` - Atualizar localização

### 6. Products Controller (`/api/products`)
- `GET /` - Listar produtos (paginado, com filtros)
- `POST /` - Cadastrar produto
- `GET /:id` - Obter produto específico
- `PUT /:id` - Atualizar produto
- `DELETE /:id` - Remover produto
- `POST /:id/move` - Mover produto para nova localização

### 7. Movements Controller (`/api/movements`)
- `GET /` - Listar movimentações (paginado, com filtros)
- `POST /` - Registrar movimentação manual
- `GET /product/:productId` - Histórico por produto
- `GET /location/:locationId` - Histórico por localização

### 8. Dashboard Controller (`/api/dashboard`)
- `GET /summary` - Resumo geral do sistema
- `GET /chamber-status` - Status de todas as câmaras
- `GET /storage-capacity` - Capacidade de armazenamento
- `GET /recent-movements` - Últimas movimentações

### 9. Reports Controller (`/api/reports`)
- `GET /inventory` - Relatório de estoque atual
- `GET /movements` - Relatório de movimentações por período
- `GET /expiration` - Produtos próximos do vencimento
- `GET /capacity` - Relatório de capacidade por câmara

## 🔧 Services (Lógica de Negócio)

### LocationService
- `generateLocationsForChamber(chamberId)` - Gera todas as localizações para uma câmara
- `findAvailableLocations(filters)` - Busca localizações disponíveis
- `validateLocationCapacity(locationId, weight)` - Valida se localização suporta peso

### ProductService
- `createProduct(productData)` - Cria produto e ocupa localização
- `moveProduct(productId, newLocationId)` - Move produto e registra movimentação
- `removeProduct(productId)` - Remove produto e libera localização
- `calculateTotalWeight(quantity, weightPerUnit)` - Calcula peso total

### MovementService
- `registerMovement(movementData)` - Registra nova movimentação
- `getMovementHistory(filters)` - Busca histórico de movimentações

### ReportService
- `generateInventoryReport(filters)` - Gera relatório de estoque
- `generateMovementReport(dateRange)` - Gera relatório de movimentações
- `getExpiringProducts(days)` - Produtos que vencem em X dias

## 🛡️ Middleware

### Authentication
```javascript
// Verificar token JWT
const authenticateToken = (req, res, next) => { ... }

// Verificar role do usuário
const authorizeRole = (roles) => (req, res, next) => { ... }
```

### Validation
```javascript
// Validar dados de entrada usando Joi
const validateRequest = (schema) => (req, res, next) => { ... }
```

### Error Handling
```javascript
// Middleware global de tratamento de erros
const errorHandler = (err, req, res, next) => { ... }
```

## 🧪 Estratégia de Testes

### Testes Unitários
- Testar todas as funções dos services
- Testar validações dos models
- Testar middleware de autenticação

### Testes de Integração
- Testar todas as rotas da API
- Testar fluxos completos (criar produto → mover → remover)
- Testar autenticação e autorização

### Estrutura de Testes
```
tests/
├── unit/
│   ├── services/
│   ├── models/
│   └── utils/
├── integration/
│   ├── auth.test.js
│   ├── chambers.test.js
│   ├── products.test.js
│   └── movements.test.js
└── fixtures/
    └── testData.js
```

## 📋 Cronograma de Desenvolvimento

### Semana 1-2: Base do Sistema
- [x] Setup inicial do projeto
- [x] Configuração MongoDB + Mongoose
- [x] Criação de todos os models
- [x] Middleware de autenticação
- [ ] Testes unitários dos models

### ✅ SETUP COMPLETO - CONCLUÍDO
- [x] Estrutura de pastas criada
- [x] package.json configurado com dependências
- [x] Express.js 4.x configurado
- [x] Configuração MongoDB (database.js)
- [x] Configuração JWT (auth.js)
- [x] Middleware de tratamento de erros
- [x] Servidor principal (server.js)
- [x] App Express (app.js)
- [x] Health check endpoints funcionando
- [x] README.md documentado

### ✅ MODELS MONGOOSE - CONCLUÍDO
- [x] User.js - Usuários com autenticação e roles
- [x] SeedType.js - Tipos de sementes dinâmicos
- [x] Chamber.js - Câmaras com estrutura hierárquica
- [x] Location.js - Localizações com regra "um produto por local"
- [x] Product.js - Produtos com movimentações automáticas
- [x] Movement.js - Histórico completo de movimentações

#### 🔥 Regras de Negócio Críticas Implementadas:
- **Uma localização = Um produto** ✅ (Location + Product)
- **Movimentações automáticas** ✅ (Product middleware)
- **Validação de capacidade** ✅ (Location methods)
- **Hierarquia respeitada** ✅ (Chamber + Location)
- **Tipos dinâmicos** ✅ (SeedType flexibility)

### ✅ MIDDLEWARE DE AUTENTICAÇÃO - CONCLUÍDO
- [x] auth.js - Autenticação JWT e autorização por roles
  - [x] `authenticateToken()` - Verificar token JWT
  - [x] `authorizeRole()` - Verificar roles do usuário
  - [x] `requireAdmin()` - Middleware para admin apenas
  - [x] `requireOperator()` - Middleware para operadores
  - [x] `optionalAuth()` - Autenticação opcional
  - [x] `canAccessUser()` - Verificar acesso a dados de usuário
  - [x] `userRateLimit()` - Rate limiting por usuário
  - [x] `auditLogger()` - Log de auditoria
- [x] validation.js - Validação de dados com Joi
  - [x] `validateRequest()` - Validação genérica
  - [x] `validateBody()`, `validateParams()`, `validateQuery()`
  - [x] Schemas para todos os models (User, SeedType, Chamber, etc.)
  - [x] Schemas de autenticação (login, register)
  - [x] Validação de ObjectId MongoDB
- [x] Atualização User.js com `passwordChangedAfter()`
- [x] Testes unitários dos middlewares (20 testes aprovados)

### Semana 3-4: APIs Principais
- [ ] Controllers: Auth, Users, SeedTypes
- [ ] Controllers: Chambers, Locations
- [ ] Controllers: Products, Movements
- [ ] Services com lógica de negócio
- [ ] Validações de entrada

### Semana 5-6: APIs Avançadas e Testes
- [ ] Dashboard e Reports controllers
- [ ] Testes de integração completos
- [ ] Documentação Swagger
- [ ] Otimizações e refatorações
- [ ] Deploy e configuração de produção

## 🔍 Validações Importantes

### Regras de Negócio
- Uma localização só pode ter um produto ativo
- Peso total não pode exceder capacidade da localização
- Movimentações devem ser registradas automaticamente
- Produtos removidos não podem ser editados
- Apenas admin pode criar usuários e câmaras

### Validações de Dados
- Email único para usuários
- Códigos de localização únicos por câmara
- Datas de validade não podem ser passadas
- Quantidades e pesos devem ser positivos
- Coordenadas devem estar dentro dos limites da câmara