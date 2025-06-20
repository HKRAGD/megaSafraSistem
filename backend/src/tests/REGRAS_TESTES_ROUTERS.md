# Regras e Padrões para Testes de Routers

## 🎯 Objetivo
Este documento estabelece as regras obrigatórias que todos os testes de integração de routers devem seguir para garantir consistência, qualidade e cobertura adequada das regras de negócio críticas.

## 🗄️ **NOVA ABORDAGEM: Banco de Dados de Teste Real**

### Por que Mudamos?
- **Problemas resolvidos**: Eliminamos problemas complexos com mocks e autenticação falsa
- **Realismo**: Testes usam dados e estruturas reais próximas ao ambiente de produção
- **Autenticação real**: Usuários reais no banco com tokens JWT válidos
- **Simplicidade**: Código mais simples e manutenível

### Infraestrutura de Teste
```javascript
const { TestDatabase, TestDataFactory, AuthHelpers } = require('./helpers');

// Setup do banco de teste
beforeAll(async () => {
  await TestDatabase.connect();
  await TestDatabase.populate();
});

afterAll(async () => {
  await TestDatabase.disconnect();
});
```

## 📋 Regras Obrigatórias

### 1. **Estrutura Padrão dos Testes**
```javascript
/**
 * Testes de Integração - [Nome] Routes  
 * 
 * Objetivo: [Descrição do objetivo específico]
 * 
 * Endpoints testados:
 * - [Lista de todos os endpoints]
 * 
 * Regras de Negócio Críticas:
 * - [Lista das regras específicas validadas]
 */

const request = require('supertest');
const app = require('../../../app');
const { TestDatabase, TestDataFactory, AuthHelpers } = require('./helpers');

describe('[Router] Routes - [Descrição]', () => {
  let adminToken, operatorToken, viewerToken;

  beforeAll(async () => {
    await TestDatabase.connect();
    await TestDatabase.populate();
    
    // Tokens baseados em usuários reais do banco
    adminToken = AuthHelpers.generateAdminToken();
    operatorToken = AuthHelpers.generateOperatorToken();
    viewerToken = AuthHelpers.generateViewerToken();
  });

  afterAll(async () => {
    await TestDatabase.disconnect();
  });

  // Testes aqui...
});
```

### 2. **Uso Obrigatório dos Helpers Atualizados**
- **TestDatabase**: Gerencia conexão e população do banco de teste
- **TestDataFactory**: Acessa dados reais e cria dados para testes de criação
- **AuthHelpers**: Gera tokens baseados em usuários reais

### 3. **Dados de Teste Disponíveis**

#### 3.1 **Usuários Reais**
```javascript
// Três usuários com senhas conhecidas
const adminUser = TestDataFactory.getAdminUser();     // admin@teste.com
const operatorUser = TestDataFactory.getOperatorUser(); // operator@teste.com  
const viewerUser = TestDataFactory.getViewerUser();     // viewer@teste.com
// Senha para todos: 'teste123'
```

#### 3.2 **Tipos de Sementes**
```javascript
const seedTypes = TestDataFactory.getTestSeedTypes();
// Disponíveis: Soja Premium, Milho Híbrido, Algodão Transgênico, Feijão Carioca
const sojaType = TestDataFactory.getSeedTypeByName('Soja Premium');
```

#### 3.3 **Câmaras e Localizações**
```javascript
const chambers = TestDataFactory.getTestChambers();
const mainChamber = TestDataFactory.getMainChamber(); // Câmara Principal (3x4x5x3)
const locations = TestDataFactory.getTestLocations();

// Localizações específicas para testes
const freeLocation = TestDataFactory.getFreeLocation();      // Para criar produtos
const occupiedLocation = TestDataFactory.getOccupiedLocation(); // Para testar conflitos
const lowCapacityLocation = TestDataFactory.getLowCapacityLocation(); // Para testar limites
```

#### 3.4 **Produtos e Movimentações**
```javascript
const products = TestDataFactory.getTestProducts();
// Produtos: Soja Lote 2024-001, Milho Híbrido LT-2024-002, Algodão Especial LT-2024-003

const movements = TestDataFactory.getTestMovements();
// Histórico de movimentações para cada produto
```

### 4. **Cenários de Teste Mínimos**
Para CADA endpoint, DEVE testar:

#### 4.1 **Autorização com Tokens Reais**
```javascript
it('deve permitir acesso a usuário admin', async () => {
  const response = await request(app)
    .get('/api/endpoint')
    .set('Authorization', `Bearer ${adminToken}`);
  
  expect(response.status).toBe(200);
});

it('deve rejeitar usuário sem permissão', async () => {
  const response = await request(app)
    .post('/api/endpoint')
    .set('Authorization', `Bearer ${viewerToken}`)
    .send(data);
  
  expect(response.status).toBe(403);
});
```

#### 4.2 **Validação com Dados Reais**
```javascript
it('deve criar recurso com dados válidos', async () => {
  const validData = TestDataFactory.createValidProductData();
  
  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validData);
    
  expect(response.status).toBe(201);
});
```

#### 4.3 **Casos de Erro Realistas**
```javascript
it('deve retornar erro para recurso não encontrado', async () => {
  const nonExistentId = TestDataFactory.generateObjectId();
  
  const response = await request(app)
    .get(`/api/products/${nonExistentId}`)
    .set('Authorization', `Bearer ${adminToken}`);
    
  expect(response.status).toBe(404);
});
```

### 5. **Validação de Regras Críticas de Negócio**

#### 5.1 **One Location = One Product**
```javascript
it('deve rejeitar produto quando localização já ocupada', async () => {
  const occupiedLocation = TestDataFactory.getOccupiedLocation();
  const productData = TestDataFactory.createValidProductData({
    locationId: occupiedLocation._id.toString()
  });

  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(productData);

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('já está ocupada');
});
```

#### 5.2 **Capacity Validation**
```javascript
it('deve rejeitar produto que excede capacidade', async () => {
  const overCapacityData = TestDataFactory.createOverCapacityProductData();

  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(overCapacityData);

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('capacidade');
});
```

#### 5.3 **Automatic Movements**
```javascript
it('deve gerar movimentação automática ao criar produto', async () => {
  const validData = TestDataFactory.createValidProductData();

  const response = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(validData);

  expect(response.status).toBe(201);
  expect(response.body.data.movement).toBeDefined();
  expect(response.body.data.movement.type).toBe('entry');
});
```

#### 5.4 **Location Hierarchy Validation**
```javascript
it('deve rejeitar coordenadas fora dos limites da câmara', async () => {
  const chamber = TestDataFactory.getMainChamber(); // 3x4x5x3
  const invalidData = TestDataFactory.createValidLocationData({
    coordinates: { quadra: 5, lado: 6, fila: 7, andar: 5 } // Excede limites
  });

  const response = await request(app)
    .post('/api/locations/generate')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(invalidData);

  expect(response.status).toBe(400);
  expect(response.body.message).toContain('dimensões da câmara');
});
```

#### 5.5 **Dynamic Types**
```javascript
it('deve permitir criação de tipo com características únicas', async () => {
  const uniqueTypeData = TestDataFactory.createValidSeedTypeData({
    characteristics: {
      variety: 'Quinoa especial',
      nutritionalProfile: { protein: 16.2 },
      specialRequirements: { oxygenLevel: 'low' }
    }
  });

  const response = await request(app)
    .post('/api/seed-types')
    .set('Authorization', `Bearer ${adminToken}`)
    .send(uniqueTypeData);

  expect(response.status).toBe(201);
});
```

### 6. **Validação de Respostas com Dados Reais**

#### 6.1 **Estrutura e Conteúdo**
```javascript
it('deve retornar dados completos com relacionamentos', async () => {
  const product = TestDataFactory.getTestProducts()[0];
  
  const response = await request(app)
    .get(`/api/products/${product._id}`)
    .set('Authorization', `Bearer ${adminToken}`);

  expect(response.status).toBe(200);
  expect(response.body.data).toMatchObject({
    product: {
      _id: product._id.toString(),
      name: expect.any(String),
      seedTypeId: expect.any(String),
      locationId: expect.any(String)
    },
    movements: expect.any(Array)
  });
});
```

### 7. **Níveis de Autorização**

#### 7.1 **Admin Only**
- DELETE endpoints críticos
- Criação de usuários e câmaras
- Análises avançadas e relatórios sensíveis

#### 7.2 **Admin + Operator**  
- CRUD de produtos, localizações, tipos de sementes
- Movimentações e operações do dia a dia
- Consultas detalhadas e análises operacionais

#### 7.3 **All Authenticated**
- Consultas básicas (GET)
- Listagens gerais
- Informações não sensíveis

### 8. **Dados de Teste Específicos por Cenário**

#### 8.1 **Para Testes de Capacidade**
```javascript
// Localização com capacidade baixa (500kg)
const lowCapLocation = TestDataFactory.getLowCapacityLocation();

// Produto que excede capacidade
const overCapacityProduct = TestDataFactory.createOverCapacityProductData();
```

#### 8.2 **Para Testes de Conflito**
```javascript
// Localização já ocupada
const occupiedLocation = TestDataFactory.getOccupiedLocation();

// Movimento para localização ocupada
const conflictMove = TestDataFactory.createMoveToOccupiedLocationData();
```

#### 8.3 **Para Testes de Hierarquia**
```javascript
// Câmara com dimensões conhecidas
const mainChamber = TestDataFactory.getMainChamber(); // 3x4x5x3

// Coordenadas inválidas que excedem limites
const invalidCoords = { quadra: 5, lado: 6, fila: 7, andar: 5 };
```

### 9. **Configuração de Ambiente**

#### 9.1 **Variáveis de Ambiente**
```bash
# .env.test
TEST_DATABASE_URL=mongodb://localhost:27017/sementes_test
JWT_SECRET=teste-secret-key
NODE_ENV=test
```

#### 9.2 **Isolamento de Dados**
- Banco dedicado para testes (`sementes_test`)
- Dados populados a cada execução
- Limpeza automática entre test suites
- Independência total do banco de desenvolvimento

### 10. **Exemplo de Teste Completo**

```javascript
describe('POST /api/products', () => {
  it('deve criar produto e validar todas as regras críticas', async () => {
    // Arrange - Usar dados reais do banco de teste
    const validData = TestDataFactory.createValidProductData();
    const freeLocation = TestDataFactory.getFreeLocation();
    
    // Act
    const response = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send(validData);

    // Assert
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.product).toMatchObject({
      name: validData.name,
      locationId: validData.locationId
    });
    
    // Verificar regra: Automatic Movements
    expect(response.body.data.movement).toBeDefined();
    expect(response.body.data.movement.type).toBe('entry');
    
    // Verificar regra: Location occupied
    const updatedLocation = await Location.findById(freeLocation._id);
    expect(updatedLocation.isOccupied).toBe(true);
  });
});
```

## ✅ Checklist de Implementação

Para cada teste implementado, verificar:

- [ ] **Banco de teste**: Conectado e populado antes dos testes
- [ ] **Tokens reais**: Gerados baseados em usuários do banco
- [ ] **Dados reais**: Usados para cenários de teste
- [ ] **Regras críticas**: Validadas com dados realistas
- [ ] **Cenários completos**: Autorização, validação, casos de erro
- [ ] **Relacionamentos**: Testados com dados conectados
- [ ] **Limpeza**: Banco desconectado após testes
- [ ] **Isolamento**: Testes independentes do ambiente de desenvolvimento

## 🎯 Meta de Qualidade

**Objetivo**: 100% dos testes devem passar usando dados reais e regras de negócio autênticas. Esta abordagem elimina a complexidade dos mocks e garante que os testes reflitam o comportamento real do sistema.

**Princípio**: Testes com dados reais são mais confiáveis, simples de manter e detectam problemas que mocks poderiam mascarar. 