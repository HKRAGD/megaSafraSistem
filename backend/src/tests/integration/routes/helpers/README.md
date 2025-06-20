# Infraestrutura de Testes - Helpers de Integração

Esta pasta contém a infraestrutura robusta de testes para todos os routes do Sistema de Gerenciamento de Câmaras Refrigeradas.

## 📁 Arquivos

- **`testDataFactory.js`** - Factory para criação de dados de teste padronizados
- **`authHelpers.js`** - Utilitários para autenticação e tokens JWT
- **`mockHelpers.js`** - Configuração avançada de mocks para models e services
- **`index.js`** - Ponto de entrada para importação dos helpers

## 🚀 Uso Básico

```javascript
const { TestDataFactory, AuthHelpers, MockHelpers } = require('./helpers');

describe('Meu Route Test', () => {
  let models, services;
  let adminToken, operatorToken;

  beforeAll(() => {
    // Configurar infraestrutura completa
    ({ models, services } = MockHelpers.setupCompleteTestEnvironment());
    
    // Gerar tokens para diferentes roles
    adminToken = AuthHelpers.generateAdminToken();
    operatorToken = AuthHelpers.generateOperatorToken();
  });

  beforeEach(() => {
    // Limpar mocks entre testes
    MockHelpers.resetAllMocks();
  });

  it('deve funcionar com dados válidos', async () => {
    // Usar factory para criar dados
    const validUser = TestDataFactory.createValidUser();
    const validChamber = TestDataFactory.createValidChamber();
    
    // Teste aqui...
  });
});
```

## 🧪 TestDataFactory - Exemplos

### Criação de Usuários
```javascript
// Usuário básico
const user = TestDataFactory.createValidUser();

// Admin específico
const admin = TestDataFactory.createValidAdmin({
  name: 'Admin Customizado',
  email: 'custom@admin.com'
});

// Múltiplos usuários
const users = TestDataFactory.createMultipleUsers(5, 'operator');
```

### Criação de Câmaras e Localizações
```javascript
// Câmara padrão
const chamber = TestDataFactory.createValidChamber();

// Câmara com dimensões específicas
const largeChamber = TestDataFactory.createValidChamber({
  dimensions: { quadras: 5, lados: 4, filas: 10, andares: 6 }
});

// Localizações para uma câmara
const locations = TestDataFactory.createLocationsForChamber(
  chamber._id,
  { quadras: 2, lados: 2, filas: 3, andares: 4 }
);
```

### Criação de Produtos
```javascript
// Produto padrão
const product = TestDataFactory.createValidProduct(locationId, seedTypeId);

// Produto próximo ao vencimento
const expiringProduct = TestDataFactory.createExpiringProduct(locationId, 3); // 3 dias

// Produto com dados específicos
const customProduct = TestDataFactory.createValidProduct(locationId, seedTypeId, {
  name: 'Soja Premium',
  lot: 'SP2024001',
  quantity: 200,
  weightPerUnit: 30
});
```

## 🔐 AuthHelpers - Exemplos

### Geração de Tokens
```javascript
// Tokens por role
const adminToken = AuthHelpers.generateAdminToken();
const operatorToken = AuthHelpers.generateOperatorToken();
const viewerToken = AuthHelpers.generateViewerToken();

// Token customizado
const customToken = AuthHelpers.generateValidToken({
  id: 'custom123',
  email: 'custom@test.com',
  role: 'operator',
  name: 'Custom User'
});

// Tokens para cenários de erro
const invalidToken = AuthHelpers.generateInvalidToken();
const expiredToken = AuthHelpers.generateExpiredToken();
```

### Configuração de Mocks de Usuário
```javascript
// Setup básico
const users = AuthHelpers.setupUserMocks(User);

// Setup com usuários customizados
const customUsers = {
  specialAdmin: TestDataFactory.createValidAdmin({ name: 'Special Admin' })
};
const users = AuthHelpers.setupUserMocks(User, customUsers);
```

### Validação de Respostas
```javascript
// Validar resposta de sucesso
AuthHelpers.validateSuccessResponse(response, { expectedField: 'value' });

// Validar resposta de erro
AuthHelpers.validateErrorResponse(response, 401, 'Token inválido');

// Validar estrutura básica
AuthHelpers.validateAuthResponse(response);
```

### Testes de Autorização em Massa
```javascript
// Testar autorização para endpoint
await AuthHelpers.testEndpointAuthorization(
  request,
  '/api/chambers',
  'post',
  ['admin', 'operator'] // roles permitidos
);
```

## 🎭 MockHelpers - Exemplos

### Setup Completo
```javascript
// Configuração completa de ambiente
const { models, services } = MockHelpers.setupCompleteTestEnvironment({
  users: { admin: TestDataFactory.createValidAdmin() },
  chambers: [TestDataFactory.createValidChamber()],
  products: [TestDataFactory.createValidProduct()]
});
```

### Setup Individual de Models
```javascript
// Configurar apenas User
const users = MockHelpers.setupUserMocks(User, {
  testAdmin: TestDataFactory.createValidAdmin()
});

// Configurar apenas Chamber
const chambers = MockHelpers.setupChamberMocks(Chamber, [
  TestDataFactory.createValidChamber({ name: 'Câmara A' }),
  TestDataFactory.createValidChamber({ name: 'Câmara B' })
]);
```

### Simulação de Cenários de Erro
```javascript
// Erro de banco de dados
MockHelpers.simulateDatabaseError(User, 'find');

// Erro de validação
MockHelpers.simulateValidationError(Product, 'create');

// Recurso não encontrado
MockHelpers.simulateNotFoundError(Chamber, 'findById');

// Erro de autorização no service
MockHelpers.simulateAuthorizationError(productService, 'createProduct');
```

### Configuração de Cenários Específicos
```javascript
// Cenário de sucesso
MockHelpers.setupSuccessScenario(models, services, {
  chambers: [TestDataFactory.createValidChamber()],
  locations: TestDataFactory.createLocationsForChamber(chamberId)
});

// Cenário de erro
MockHelpers.setupErrorScenario(models, 'database');
```

### Verificação de Mocks
```javascript
// Verificar se mock foi chamado
MockHelpers.verifyMockCalled(User.find, 1);

// Verificar chamada com argumentos específicos
MockHelpers.verifyMockCalledWith(User.findById, 'user123');

// Verificar que mock não foi chamado
MockHelpers.verifyNoMockCalled(User.create);
```

## 📋 Padrão de Teste Completo

```javascript
/**
 * Exemplo de teste completo usando toda a infraestrutura
 */
const request = require('supertest');
const app = require('../../../app');
const { TestDataFactory, AuthHelpers, MockHelpers } = require('./helpers');

describe('Example Routes - Teste Completo', () => {
  let models, services;
  let adminToken, operatorToken, viewerToken;
  let testUser, testChamber, testLocation;

  beforeAll(() => {
    // Setup completo da infraestrutura
    ({ models, services } = MockHelpers.setupCompleteTestEnvironment());
    
    // Criar tokens para diferentes cenários
    adminToken = AuthHelpers.generateAdminToken();
    operatorToken = AuthHelpers.generateOperatorToken();
    viewerToken = AuthHelpers.generateViewerToken();
  });

  beforeEach(() => {
    // Limpar mocks e criar dados frescos para cada teste
    MockHelpers.resetAllMocks();
    
    // Criar dados de teste
    testUser = TestDataFactory.createValidUser();
    testChamber = TestDataFactory.createValidChamber();
    testLocation = TestDataFactory.createValidLocation(testChamber._id);
    
    // Configurar mocks com dados específicos
    AuthHelpers.setupUserMocks(models.User, { testUser });
    MockHelpers.setupChamberMocks(models.Chamber, [testChamber]);
    MockHelpers.setupLocationMocks(models.Location, [testLocation]);
  });

  afterEach(() => {
    // Limpeza após cada teste
    AuthHelpers.clearAllMocks();
  });

  describe('Autenticação e Autorização', () => {
    it('deve retornar 401 para requisições sem token', async () => {
      const response = await request(app).get('/api/example');
      
      AuthHelpers.validateErrorResponse(response, 401, 'Token de acesso requerido');
    });

    it('deve permitir acesso para admin', async () => {
      const response = await request(app)
        .get('/api/example')
        .set(AuthHelpers.getAuthHeaders(adminToken));
      
      AuthHelpers.validateSuccessResponse(response);
    });
  });

  describe('Funcionalidades Específicas', () => {
    it('deve processar dados válidos corretamente', async () => {
      const requestData = {
        name: testChamber.name,
        dimensions: testChamber.dimensions
      };

      const response = await request(app)
        .post('/api/example')
        .set(AuthHelpers.getAuthHeaders(adminToken))
        .send(requestData);

      // Validar resposta
      expect(response.status).toBe(201);
      AuthHelpers.validateSuccessResponse(response, { name: testChamber.name });
      
      // Verificar que mocks foram chamados
      MockHelpers.verifyMockCalled(models.Chamber.create, 1);
      MockHelpers.verifyMockCalledWith(models.Chamber.create, 
        expect.objectContaining(requestData)
      );
    });

    it('deve tratar erros de validação adequadamente', async () => {
      // Simular erro de validação
      MockHelpers.simulateValidationError(models.Chamber, 'create');

      const response = await request(app)
        .post('/api/example')
        .set(AuthHelpers.getAuthHeaders(adminToken))
        .send({ name: '' }); // Dados inválidos

      AuthHelpers.validateErrorResponse(response, 400, 'Validation failed');
    });

    it('deve tratar erros de banco de dados', async () => {
      // Simular erro de conexão
      MockHelpers.simulateDatabaseError(models.Chamber, 'find');

      const response = await request(app)
        .get('/api/example')
        .set(AuthHelpers.getAuthHeaders(adminToken));

      AuthHelpers.validateErrorResponse(response, 500, 'Database connection error');
    });
  });

  describe('Regras de Negócio', () => {
    it('deve validar regras específicas do domínio', async () => {
      // Configurar cenário específico
      const occupiedLocation = TestDataFactory.createOccupiedLocation(testChamber._id, 500);
      MockHelpers.setupLocationMocks(models.Location, [occupiedLocation]);

      const response = await request(app)
        .post('/api/example/validate')
        .set(AuthHelpers.getAuthHeaders(operatorToken))
        .send({ locationId: occupiedLocation._id });

      // Validar que regra de negócio foi aplicada
      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Localização já ocupada');
    });
  });
});
```

## 🎯 Benefícios da Infraestrutura

1. **Consistência**: Todos os testes seguem o mesmo padrão
2. **Reutilização**: Helpers podem ser usados em qualquer teste
3. **Manutenibilidade**: Mudanças centralizadas nos helpers
4. **Produtividade**: Menos código boilerplate em cada teste
5. **Qualidade**: Cenários complexos fáceis de simular
6. **Isolamento**: Cada teste é completamente independente

## 🔧 Próximos Passos

Com esta infraestrutura criada, você pode:

1. Implementar qualquer teste de route usando os helpers
2. Adicionar novos métodos aos helpers conforme necessário
3. Simular cenários complexos de integração entre módulos
4. Manter alta qualidade e cobertura de testes

---

**Objetivo**: Garantir que todos os testes de routes sejam **robustos**, **reutilizáveis** e **maintíveis**, identificando problemas reais ao invés de mascarar falhas. 