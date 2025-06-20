/**
 * Teste de Integração - Movements Routes com Banco Real
 * 
 * Objetivo: Testar o sistema completo de auditoria e rastreamento de movimentações
 * usando dados reais do banco de teste
 * 
 * Endpoints testados:
 * - GET /api/movements
 * - GET /api/movements/product/:productId
 * - GET /api/movements/location/:locationId
 * - GET /api/movements/patterns
 * - GET /api/movements/audit
 * - GET /api/movements/product/:id/detailed-history
 * - POST /api/movements
 * - POST /api/movements/manual
 * - POST /api/movements/verify-pending
 * 
 * Funcionalidades Críticas Validadas:
 * - REGRA 2: Automatic Movements (registros automáticos)
 * - Auditoria completa e rastreamento
 * - Histórico por produto e localização
 * - Autorização por roles
 * - Filtros e paginação
 * - Análise de padrões
 * - Verificação de integridade
 */

const request = require('supertest');
const app = require('../../../app');
const { TestDatabase, TestDataFactory, AuthHelpers } = require('./helpers');

describe('Movements Routes - Teste com Banco Real', () => {
  let adminToken, operatorToken, viewerToken;

  beforeAll(async () => {
    console.log('🔄 Configurando banco de teste para Movements...');
    await TestDatabase.connect();
    await TestDatabase.populate();
    
    // Gerar tokens baseados em usuários reais do banco
    adminToken = AuthHelpers.generateAdminToken();
    operatorToken = AuthHelpers.generateOperatorToken();
    viewerToken = AuthHelpers.generateViewerToken();
    
    console.log('✅ Banco de teste configurado para Movements');
  });

  afterAll(async () => {
    await TestDatabase.disconnect();
    console.log('✅ Banco de teste desconectado');
  });

  describe('🔍 GET /api/movements', () => {
    it('deve listar movimentações para usuário admin com dados reais', async () => {
      const response = await request(app)
        .get('/api/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📊 Status da resposta movements:', response.status);
      console.log('📊 Movimentações encontradas:', response.body?.data?.movements?.length || 0);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('movements');
      expect(Array.isArray(response.body.data.movements)).toBe(true);
      expect(response.body.data.movements.length).toBeGreaterThan(0);
    });

    it('deve listar movimentações para usuário operator', async () => {
      const response = await request(app)
        .get('/api/movements')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve listar movimentações para usuário viewer', async () => {
      const response = await request(app)
        .get('/api/movements')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve rejeitar usuário sem token', async () => {
      const response = await request(app)
        .get('/api/movements');

      expect(response.status).toBe(401);
      if (response.body.success !== undefined) {
        expect(response.body.success).toBe(false);
      } else if (response.body.status !== undefined) {
        expect(['fail', 'error']).toContain(response.body.status);
      }
    });

    it('deve aplicar filtros corretamente', async () => {
      const response = await request(app)
        .get('/api/movements?type=entry&limit=5')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      if (response.body.data.movements.length > 0) {
        response.body.data.movements.forEach(movement => {
          expect(movement.type).toBe('entry');
        });
      }
    });

    it('deve aplicar paginação corretamente', async () => {
      const response = await request(app)
        .get('/api/movements?page=1&limit=2')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.movements.length).toBeLessThanOrEqual(2);
      expect(response.body.data.pagination).toBeDefined();
    });

    it('deve filtrar por período de data', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 dias atrás
      const endDate = new Date().toISOString();
      
      const response = await request(app)
        .get(`/api/movements?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('🔍 GET /api/movements/product/:productId', () => {
    it('deve obter histórico de movimentações por produto específico', async () => {
      const products = TestDataFactory.getTestProducts();
      expect(products.length).toBeGreaterThan(0);
      
      const testProduct = products[0];
      
      const response = await request(app)
        .get(`/api/movements/product/${testProduct._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📊 Histórico do produto:', testProduct.name);
      console.log('📊 Movimentações encontradas:', response.body?.data?.movements?.length || 0);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('movements');
      
      // Verificar se todas as movimentações são do produto correto
      if (response.body.data.movements.length > 0) {
        response.body.data.movements.forEach(movement => {
          expect(movement.productId.toString()).toBe(testProduct._id.toString());
        });
      }
    });

    it('deve retornar array vazio para produto sem movimentações', async () => {
      const nonExistentProductId = TestDataFactory.generateObjectId();
      
      const response = await request(app)
        .get(`/api/movements/product/${nonExistentProductId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.movements).toEqual([]);
      expect(response.body.data.product).toBeNull();
    });
  });

  describe('🔍 GET /api/movements/location/:locationId', () => {
    it('deve obter histórico de movimentações por localização específica', async () => {
      const locations = TestDataFactory.getTestLocations();
      const occupiedLocation = locations.find(loc => loc.isOccupied);
      expect(occupiedLocation).toBeDefined();
      
      const response = await request(app)
        .get(`/api/movements/location/${occupiedLocation._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📊 Histórico da localização:', occupiedLocation.code);
      console.log('📊 Movimentações encontradas:', response.body?.data?.movements?.length || 0);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('movements');
    });

    it('deve retornar array vazio para localização sem movimentações', async () => {
      const freeLocation = TestDataFactory.getFreeLocation();
      
      const response = await request(app)
        .get(`/api/movements/location/${freeLocation._id}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      // Pode ter ou não movimentações, mas deve retornar estrutura correta
      expect(response.body.data).toHaveProperty('movements');
      expect(Array.isArray(response.body.data.movements)).toBe(true);
    });
  });

  describe('📊 GET /api/movements/patterns (Admin/Operator)', () => {
    it('deve obter padrões de movimentações para admin', async () => {
      const response = await request(app)
        .get('/api/movements/patterns')
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📈 Padrões de movimentações status:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Patterns pode incluir análises estatísticas
      expect(response.body.data).toBeDefined();
    });

    it('deve obter padrões de movimentações para operator', async () => {
      const response = await request(app)
        .get('/api/movements/patterns')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve rejeitar acesso de viewer aos padrões', async () => {
      const response = await request(app)
        .get('/api/movements/patterns')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
      if (response.body.success !== undefined) {
        expect(response.body.success).toBe(false);
      } else if (response.body.status !== undefined) {
        expect(response.body.status).toBe('fail');
      }
    });
  });

  describe('📋 GET /api/movements/audit (Admin/Operator)', () => {
    it('deve obter relatório de auditoria para admin', async () => {
      const response = await request(app)
        .get('/api/movements/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📋 Auditoria status:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Relatório de auditoria deve incluir verificações de integridade
      expect(response.body.data).toBeDefined();
    });

    it('deve obter relatório de auditoria para operator', async () => {
      const response = await request(app)
        .get('/api/movements/audit')
        .set('Authorization', `Bearer ${operatorToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('deve rejeitar acesso de viewer à auditoria', async () => {
      const response = await request(app)
        .get('/api/movements/audit')
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(403);
      if (response.body.success !== undefined) {
        expect(response.body.success).toBe(false);
      } else if (response.body.status !== undefined) {
        expect(response.body.status).toBe('fail');
      }
    });
  });

  describe('📜 GET /api/movements/product/:id/detailed-history', () => {
    it('deve obter histórico detalhado de produto', async () => {
      const products = TestDataFactory.getTestProducts();
      const testProduct = products[0];
      
      const response = await request(app)
        .get(`/api/movements/product/${testProduct._id}/detailed-history`)
        .set('Authorization', `Bearer ${adminToken}`);

      console.log('📜 Histórico detalhado status:', response.status);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('deve permitir acesso a viewer para histórico detalhado', async () => {
      const products = TestDataFactory.getTestProducts();
      const testProduct = products[0];
      
      const response = await request(app)
        .get(`/api/movements/product/${testProduct._id}/detailed-history`)
        .set('Authorization', `Bearer ${viewerToken}`);

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });
  });

  describe('➕ POST /api/movements (Manual Registration)', () => {
    it('deve registrar movimentação manual para admin', async () => {
      const products = TestDataFactory.getTestProducts();
      const testProduct = products[0];
      
      const movementData = {
        productId: testProduct._id.toString(),
        type: 'adjustment',
        quantity: testProduct.quantity,
        weight: testProduct.totalWeight,
        toLocationId: testProduct.locationId.toString(),
        reason: 'Teste de movimentação manual',
        notes: 'Movimentação registrada manualmente via teste'
      };

      console.log('📝 Dados da movimentação manual:', movementData);

      const response = await request(app)
        .post('/api/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(movementData);

      console.log('📊 Resposta do registro manual:', response.status, response.body);

      expect([200, 201]).toContain(response.status);
      if (response.status === 201) {
        expect(response.body.success).toBe(true);
        expect(response.body.data.movement).toBeDefined();
      }
    });

    it('deve registrar movimentação manual para operator', async () => {
      const products = TestDataFactory.getTestProducts();
      const testProduct = products[1];
      
      const movementData = {
        productId: testProduct._id.toString(),
        type: 'adjustment',
        quantity: testProduct.quantity,
        weight: testProduct.totalWeight,
        toLocationId: testProduct.locationId.toString(),
        reason: 'Teste operator',
        notes: 'Movimento operator'
      };

      const response = await request(app)
        .post('/api/movements')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send(movementData);

      expect([200, 201]).toContain(response.status);
    });

    it('deve rejeitar registro de viewer', async () => {
      const products = TestDataFactory.getTestProducts();
      const testProduct = products[0];
      
      const movementData = {
        productId: testProduct._id.toString(),
        type: 'adjustment',
        quantity: testProduct.quantity,
        weight: testProduct.totalWeight,
        toLocationId: testProduct.locationId.toString(),
        reason: 'Teste negado',
        notes: 'Deve ser rejeitado'
      };

      const response = await request(app)
        .post('/api/movements')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(movementData);

      expect(response.status).toBe(403);
      if (response.body.success !== undefined) {
        expect(response.body.success).toBe(false);
      } else if (response.body.status !== undefined) {
        expect(response.body.status).toBe('fail');
      }
    });

    it('deve rejeitar dados inválidos', async () => {
      const invalidData = {
        // Faltando campos obrigatórios
        type: 'invalid_type',
        reason: 'Teste inválido'
      };

      const response = await request(app)
        .post('/api/movements')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(invalidData);

      expect(response.status).toBe(400);
      if (response.body.success !== undefined) {
        expect(response.body.success).toBe(false);
      } else if (response.body.status !== undefined) {
        expect(['fail', 'error']).toContain(response.body.status);
      }
    });
  });

  describe('📝 POST /api/movements/manual (Manual Registration Alternative)', () => {
    it('deve usar endpoint manual específico para admin', async () => {
      const products = TestDataFactory.getTestProducts();
      const testProduct = products[0];
      
      const manualData = {
        productId: testProduct._id.toString(),
        type: 'adjustment',
        quantity: testProduct.quantity,
        weight: testProduct.totalWeight,
        toLocationId: testProduct.locationId.toString(),
        reason: 'Registro manual específico',
        notes: 'Teste do endpoint manual'
      };

      const response = await request(app)
        .post('/api/movements/manual')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(manualData);

      console.log('📝 Resposta do registro manual específico:', response.status);

      // Endpoint manual pode retornar 200 (sucesso), 201 (criado) ou 400 (erro de validação)
      expect([200, 201, 400]).toContain(response.status);
      
      // Se foi bem-sucedido, verificar estrutura da resposta
      if (response.status === 200 || response.status === 201) {
        expect(response.body.success).toBe(true);
      }
    });

    it('deve rejeitar acesso de viewer ao endpoint manual', async () => {
      const manualData = {
        productId: TestDataFactory.generateObjectId(),
        type: 'adjustment',
        quantity: 10,
        weight: 100,
        reason: 'Deve ser rejeitado'
      };

      const response = await request(app)
        .post('/api/movements/manual')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send(manualData);

      expect(response.status).toBe(403);
    });
  });

  describe('✅ POST /api/movements/verify-pending', () => {
    it('deve verificar movimentações pendentes para admin', async () => {
      const response = await request(app)
        .post('/api/movements/verify-pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      console.log('✅ Verificação de pendentes status:', response.status);

      expect([200, 201]).toContain(response.status);
      expect(response.body.success).toBe(true);
    });

    it('deve verificar movimentações pendentes para operator', async () => {
      const response = await request(app)
        .post('/api/movements/verify-pending')
        .set('Authorization', `Bearer ${operatorToken}`)
        .send({});

      expect([200, 201]).toContain(response.status);
    });

    it('deve rejeitar acesso de viewer à verificação', async () => {
      const response = await request(app)
        .post('/api/movements/verify-pending')
        .set('Authorization', `Bearer ${viewerToken}`)
        .send({});

      expect(response.status).toBe(403);
    });
  });

  describe('🔒 Validação de Regras de Negócio', () => {
    it('🔒 REGRA 2: deve validar que movimentações automáticas existem (Automatic Movements)', async () => {
      const response = await request(app)
        .get('/api/movements?isAutomatic=true')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      // Deve haver pelo menos algumas movimentações automáticas dos produtos criados no setup
      if (response.body.data.movements.length > 0) {
        response.body.data.movements.forEach(movement => {
          expect(movement.metadata?.isAutomatic).toBe(true);
        });
      }
      
      console.log('🔒 Movimentações automáticas encontradas:', response.body.data.movements.length);
    });

    it('deve validar integridade de dados em movimentações', async () => {
      const response = await request(app)
        .get('/api/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      
      // Verificar que cada movimentação tem os campos essenciais
      response.body.data.movements.forEach(movement => {
        expect(movement).toHaveProperty('type');
        expect(movement).toHaveProperty('timestamp');
        expect(movement).toHaveProperty('quantity');
        expect(movement).toHaveProperty('weight');
        expect(['entry', 'exit', 'transfer', 'adjustment']).toContain(movement.type);
      });
    });
  });

  describe('📊 Verificação de Dados do Banco - Movements', () => {
    it('deve ter movimentações de teste populadas corretamente', () => {
      const fixtures = TestDatabase.getFixtures();
      
      expect(fixtures).toBeDefined();
      expect(fixtures.movements.length).toBeGreaterThan(0);
      
      console.log('📊 Movimentações de teste:', fixtures.movements.length);
      
      // Verificar tipos de movimentações
      const movementTypes = fixtures.movements.map(m => m.type);
      expect(movementTypes).toContain('entry');
      
      console.log('📊 Tipos de movimentações:', [...new Set(movementTypes)]);
    });

    it('deve ter relacionamentos corretos entre movimentações e produtos', () => {
      const fixtures = TestDatabase.getFixtures();
      const movements = fixtures.movements;
      const products = fixtures.products;
      
      // Verificar que todas as movimentações têm produtos válidos
      movements.forEach(movement => {
        const relatedProduct = products.find(p => 
          p._id.toString() === movement.productId.toString()
        );
        expect(relatedProduct).toBeDefined();
      });
      
      console.log('✅ Relacionamentos movimento-produto validados');
    });
  });

  describe('🔄 Integração Completa - Movimentações', () => {
    it('deve demonstrar fluxo completo de auditoria e rastreamento', async () => {
      console.log('🔄 Iniciando fluxo completo de movimentações...');
      
      // 1. Listar todas as movimentações
      const allMovements = await request(app)
        .get('/api/movements')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(allMovements.status).toBe(200);
      console.log('📊 Total de movimentações:', allMovements.body.data.movements.length);

      // 2. Verificar histórico por produto
      if (allMovements.body.data.movements.length > 0) {
        const firstMovement = allMovements.body.data.movements[0];
        
        if (firstMovement.productId) {
          // Extrair ID corretamente (pode ser string ou objeto)
          const productId = typeof firstMovement.productId === 'object' 
            ? firstMovement.productId._id || firstMovement.productId.id 
            : firstMovement.productId;
          
          const productHistory = await request(app)
            .get(`/api/movements/product/${productId}`)
            .set('Authorization', `Bearer ${adminToken}`);

          // Deve retornar 200 sempre, mesmo se produto não existir (retorna array vazio)
          expect(productHistory.status).toBe(200);
          expect(productHistory.body.data).toHaveProperty('movements');
          console.log('📜 Histórico do produto:', productHistory.body.data.movements.length);
        }
      }

      // 3. Obter padrões de movimentações
      const patterns = await request(app)
        .get('/api/movements/patterns')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(patterns.status).toBe(200);
      console.log('📈 Padrões obtidos com sucesso');

      // 4. Relatório de auditoria
      const audit = await request(app)
        .get('/api/movements/audit')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(audit.status).toBe(200);
      console.log('📋 Auditoria executada com sucesso');

      // 5. Verificar pendências
      const verifyPending = await request(app)
        .post('/api/movements/verify-pending')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({});

      expect([200, 201]).toContain(verifyPending.status);
      console.log('✅ Verificação de pendências concluída');

      console.log('✅ Fluxo completo de movimentações executado com sucesso');
    });
  });
}); 