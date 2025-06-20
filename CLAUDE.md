# Claude Code Memory - Sistema de Gerenciamento de Câmaras Refrigeradas

## 🎯 Visão Geral do Projeto

Sistema completo para gerenciamento de produtos em câmaras refrigeradas com sistema de roles diferenciados (Administrador/Operador) e workflow específico de produtos.

### Stack Tecnológico Principal
- **Backend**: Node.js + Express.js + MongoDB + Mongoose
- **Frontend**: React.js + TypeScript + Material-UI
- **Autenticação**: JWT
- **API**: RESTful
- **Testes**: Jest + Supertest (Backend) | Jest + React Testing Library (Frontend)

## 🔑 Funcionalidades Críticas

### Sistema de Roles
- **ADMIN**: Cadastra produtos, gerencia usuários, cria solicitações de retirada, acesso completo
- **OPERATOR**: Localiza produtos, move produtos, confirma retiradas, acesso limitado

### Estados dos Produtos (FSM)
```
CADASTRADO → AGUARDANDO_LOCACAO → LOCADO → AGUARDANDO_RETIRADA → RETIRADO
                    ↓                ↓                              ↑
                  LOCADO          REMOVIDO                    CANCELADO
```

### Mudanças Arquiteturais Principais
1. **Produtos podem ser cadastrados SEM localização** (estado "Aguardando Locação")
2. **Novo fluxo de retirada** com solicitação (Admin) + confirmação (Operador)
3. **Controle de acesso granular** baseado em roles
4. **Separação clara de responsabilidades** entre Admin e Operador

## 📊 Modelos de Dados Essenciais

### Product (Atualizado)
```javascript
{
  name: String,
  lot: String,
  seedTypeId: ObjectId,
  quantity: Number,
  storageType: 'saco' | 'bag',
  weightPerUnit: Number,
  totalWeight: Number,
  locationId?: String, // OPCIONAL agora
  status: ProductStatus, // NOVO CAMPO
  entryDate: Date,
  expirationDate?: Date,
  version: Number // Para optimistic locking
}
```

### User (Atualizado)
```javascript
{
  name: String,
  email: String,
  password: String,
  role: 'ADMIN' | 'OPERATOR', // NOVO CAMPO
  isActive: Boolean
}
```

### WithdrawalRequest (Novo)
```javascript
{
  productId: ObjectId,
  requestedBy: ObjectId, // Admin
  status: 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO',
  type: 'TOTAL' | 'PARCIAL',
  quantityRequested?: Number,
  reason?: String,
  requestedAt: Date,
  confirmedBy?: ObjectId // Operator
}
```

### Client (Novo)
```javascript
{
  name: String (required, unique),
  cnpjCpf: String (optional, validated),
  documentType: String ('CPF' | 'CNPJ' | 'OUTROS'),
  contactPerson: String,
  email: String (optional, unique),
  phone: String,
  address: {
    street, number, complement, neighborhood,
    city, state, zipCode, country
  },
  notes: String,
  isActive: Boolean,
  specifications: Mixed, // Flexibilidade
  metadata: {
    createdBy: ObjectId,
    lastModifiedBy: ObjectId
  }
}
```

### Outros Models Existentes
- **Chamber**: Câmaras refrigeradas com dimensões (quadras, lados, filas, andares)
- **Location**: Localizações específicas dentro das câmaras
- **SeedType**: Tipos de sementes com parâmetros ideais
- **Movement**: Histórico de todas as movimentações

## 🔧 Backend - Estrutura Principal

### Services Críticos
- **ProductService**: CRUD + localização + movimentação + remoção
- **WithdrawalService**: Solicitação + confirmação + cancelamento de retiradas
- **LocationService**: Geração automática + disponibilidade + validação de capacidade
- **MovementService**: Registro automático de todas as operações
- **ClientService**: Validações CPF/CNPJ + soft delete + estatísticas + unicidade

### Middleware de Autorização
```javascript
const authorizeRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) {
    return res.status(403).json({ 
      success: false, 
      message: 'Acesso negado para esta operação' 
    });
  }
  next();
};
```

### Endpoints Principais por Role
**Admin Only:**
- `POST /api/products` - Criar produto
- `DELETE /api/products/:id` - Remover produto
- `POST /api/withdrawal-requests` - Solicitar retirada
- `POST /api/users` - Criar usuário
- `POST /api/clients` - Criar cliente
- `PUT /api/clients/:id` - Atualizar cliente
- `DELETE /api/clients/:id` - Desativar cliente (soft delete)

**Operator Only:**
- `PATCH /api/products/:id/locate` - Localizar produto
- `PATCH /api/products/:id/move` - Mover produto
- `PATCH /api/withdrawal-requests/:id/confirm` - Confirmar retirada

**Admin/Operator:**
- `GET /api/clients` - Listar clientes (com filtros)
- `GET /api/clients/:id` - Obter cliente específico
- `GET /api/clients/search` - Buscar clientes por texto

## ⚛️ Frontend - Estrutura Principal

### Hooks Customizados Essenciais
```typescript
// Hook para ações baseadas em role
const useProductActions = () => ({
  canCreate: user?.role === 'ADMIN',
  canLocate: user?.role === 'OPERATOR',
  canMove: user?.role === 'OPERATOR',
  canRemove: user?.role === 'ADMIN',
  canRequestWithdrawal: user?.role === 'ADMIN',
  canConfirmWithdrawal: user?.role === 'OPERATOR'
});

// Outros hooks críticos
useProducts(), useChambers(), useLocations(), 
useWithdrawalRequests(), useDashboard(), useReports(),
useClients() // NOVO: Gerenciamento de clientes
```

### Componentes Novos Principais
- **ProductLocationForm** - Localizar produtos (Operator)
- **WithdrawalRequestForm** - Solicitar retirada (Admin)
- **WithdrawalConfirmationDialog** - Confirmar retirada (Operator)
- **PendingLocationList** - Produtos aguardando locação
- **PendingWithdrawalList** - Solicitações pendentes
- **ClientForm** - Formulário de cadastro/edição de clientes
- **ClientList** - Lista de clientes com filtros e busca
- **ClientSelector** - Seletor de cliente para produtos

### Navegação Condicional por Role
```typescript
{isAdmin && (
  <>
    <Link to="/products/new">Cadastrar Produto</Link>
    <Link to="/users">Usuários</Link>
    <Link to="/clients">Clientes</Link>
    <Link to="/reports">Relatórios</Link>
  </>
)}

{isOperator && (
  <>
    <Link to="/products/pending-location">Aguardando Locação</Link>
    <Link to="/withdrawal-requests/pending">Confirmar Retiradas</Link>
  </>
)}
```

## 🔄 Fluxos de Trabalho Críticos

### 1. Cadastro de Produto (Admin)
Admin → Cadastrar Produto → Localização OPCIONAL → Status definido automaticamente

### 2. Localização de Produto (Operator)
Operator → Lista "Aguardando Locação" → Selecionar produto → Escolher localização → Confirmar

### 3. Solicitação de Retirada (Admin)
Admin → Produto LOCADO → "Solicitar Retirada" → Tipo + Quantidade → Status "AGUARDANDO_RETIRADA"

### 4. Confirmação de Retirada (Operator)
Operator → "Confirmar Retiradas" → Solicitações pendentes → Confirmar retirada física → Status "RETIRADO"

## 📂 Estrutura de Pastas Recomendada

### Backend
```
backend/src/
├── controllers/ (authController, productController, withdrawalController, clientController...)
├── middleware/ (auth.js, validation.js, errorHandler.js)
├── models/ (User, Product, WithdrawalRequest, Chamber, Location, Client...)
├── routes/ (auth, products, withdrawal-requests, chambers, clients...)
├── services/ (ProductService, WithdrawalService, LocationService, ClientService...)
└── utils/ (validators.js, helpers.js, constants.js)
```

### Frontend
```
frontend/src/
├── components/
│   ├── common/ (Header, Sidebar, Loading, Modal, Table)
│   ├── forms/ (ProductForm, WithdrawalRequestForm, ClientForm...)
│   └── ui/ (Button, Input, Select, Card)
├── hooks/ (useAuth, useProducts, useWithdrawalRequests, useClients...)
├── pages/ (Dashboard, Products, Users, Clients, Reports, History)
├── services/ (api.js, authService, productService, clientService...)
└── contexts/ (AuthContext, NotificationContext)
```

## 🛡️ Validações e Segurança Críticas

### Regras de Negócio
- Uma localização = Um produto ativo
- Transições de estado sempre validadas no backend
- Operações só permitidas em estados válidos
- Peso não pode exceder capacidade da localização

### Controle de Acesso
- JWT tokens com informação de role
- Middleware de autorização em todas as rotas
- Frontend esconde ações não permitidas
- Backend SEMPRE valida permissões

## 📈 Migração de Dados

### Scripts Necessários
```javascript
// Produtos existentes
products.forEach(product => {
  product.status = product.locationId ? 'LOCADO' : 'AGUARDANDO_LOCACAO';
  product.version = 0;
});

// Usuários existentes
users.forEach(user => {
  user.role = user.email.includes('admin') ? 'ADMIN' : 'OPERATOR';
});
```

## 📅 Cronograma de Implementação

### Fase 1: Backend Core (2-3 semanas)
- Atualização dos modelos + Services + Middleware + APIs + Migração

### Fase 2: Frontend Base (2 semanas)
- AuthContext + Hooks + Componentes base + Navegação condicional

### Fase 3: Interface Completa (2 semanas)
- Páginas específicas + Formulários + Relatórios + Dashboard

### Fase 4: Refinamentos (1 semana)
- Testes E2E + Ajustes + Deploy

## 🧪 Estratégia de Testes

### Backend
- Testes unitários para services e validações de estado
- Testes de integração para endpoints com diferentes roles
- Testes de transação para operações críticas

### Frontend
- Testes de componente para renderização condicional por role
- Testes de integração para fluxos completos
- Testes de permissão para controle de acesso

## 💡 Dicas Importantes para Development

### Para Discussões com Zen
- Sempre usar formato `/c/caminho-do-arquivo/...` ao invés de `/mnt/c/...`
- Pedir para Zen analisar arquitetura, debugar problemas complexos
- Solicitar feedback sobre implementações críticas de segurança
- Revisar lógica de transições de estado com Zen
- **Validar integração Cliente-Produto** com Zen para garantir integridade

### Pontos de Atenção
- **Optimistic Locking**: Implementar para prevenir conflitos
- **Transações MongoDB**: Para operações críticas
- **Logs de Auditoria**: Registrar todas as mudanças de estado
- **Validação Dupla**: Frontend + Backend sempre
- **Cache Inteligente**: Para dados frequentemente acessados
- **Soft Delete**: Clientes desativados mantém referência em produtos
- **Validação CPF/CNPJ**: Usar biblioteca validation-br para robustez
- **Unicidade**: Nome e documento únicos apenas entre clientes ativos

### Performance
- Indexação adequada no MongoDB
- Paginação em todas as listagens
- Lazy loading de componentes pesados
- Virtualização em listas grandes
- Debounce em campos de busca

## 🎯 Objetivos de Qualidade

- **Separação clara de responsabilidades** entre roles
- **Workflow realista** alinhado com operações físicas
- **Controle total** sobre processo de armazenamento
- **Rastreabilidade completa** de todas as operações
- **Interface otimizada** para cada tipo de usuário
- **Zero conflitos** de localização
- **100% de auditoria** nas retiradas

---

**Status**: Especificação técnica completa criada
**Próximo Passo**: Aprovação e início da implementação
