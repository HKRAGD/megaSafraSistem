/**
 * Testes unitários para productService
 * Baseados nos OBJETIVOS DO PROJETO especificados no planejamento
 * 
 * OBJETIVOS TESTADOS:
 * 1. Criação inteligente com busca automática de localização ótima (REGRA CRÍTICA)
 * 2. Movimentação otimizada com análise de benefícios
 * 3. Aplicar regra "uma localização = um produto" rigorosamente
 * 4. Gerar movimentações automáticas em todas as operações (REGRA CRÍTICA)
 * 5. Validar capacidade em todas as operações (REGRA CRÍTICA)
 * 6. Análise de distribuição no sistema para otimização
 */

const productService = require('../../../services/productService');
const Product = require('../../../models/Product');
const Location = require('../../../models/Location');
const Movement = require('../../../models/Movement');
const SeedType = require('../../../models/SeedType');
const Chamber = require('../../../models/Chamber');

// Configurar setup de testes
require('../../setup');

describe('ProductService - Objetivos do Projeto', () => {
  let testCounter = 0;

  // Helper para gerar códigos únicos
  const getUniqueLocationCode = () => {
    testCounter++;
    return `T${testCounter}-Q1-L1-F1-A1`;
  };

  const getUniqueCoordinates = () => {
    testCounter++;
    return { 
      quadra: Math.ceil(testCounter / 10), 
      lado: Math.ceil(testCounter / 5), 
      fila: testCounter, 
      andar: 1 
    };
  };

  describe('🎯 OBJETIVO: Criação inteligente com busca automática de localização ótima', () => {
    test('deve criar produto com localização específica e ocupá-la automaticamente', async () => {
      const seedType = await global.createTestSeedType();
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        isOccupied: false, 
        maxCapacityKg: 1000,
        currentWeightKg: 0
      });

      const productData = {
        name: 'Milho Premium',
        lot: 'LOT-2024-001',
        seedTypeId: seedType._id,
        quantity: 20,
        storageType: 'saco',
        weightPerUnit: 50,
        locationId: location._id
      };

      const result = await productService.createProduct(productData, user._id);

      expect(result.success).toBe(true);
      expect(result.data.product.name).toBe('Milho Premium');
      expect(result.data.product.totalWeight).toBe(1000); // 20 * 50

      // REGRA CRÍTICA: Verificar se localização foi ocupada automaticamente
      const updatedLocation = await Location.findById(location._id);
      expect(updatedLocation.isOccupied).toBe(true);
      expect(updatedLocation.currentWeightKg).toBe(1000);

      // REGRA CRÍTICA: Verificar se movimento foi criado automaticamente
      const movements = await Movement.find({ productId: result.data.product._id });
      expect(movements).toHaveLength(1);
      expect(movements[0].type).toBe('entry');
      expect(movements[0].weight).toBe(1000);
    });

    test('deve buscar localização automaticamente quando não especificada', async () => {
      const seedType = await global.createTestSeedType();
      const user = await global.createTestUser();
      const chamber = await global.createTestChamber();
      
      // Criar múltiplas localizações para teste de busca ótima
      const location1 = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 5 }, // Alto - menos ótima
        isOccupied: false, 
        maxCapacityKg: 800
      });
      
      const location2 = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 }, // Baixo - mais ótima
        isOccupied: false, 
        maxCapacityKg: 1500
      });

      const productData = {
        name: 'Soja Premium',
        lot: 'LOT-2024-002',
        seedTypeId: seedType._id,
        quantity: 10,
        storageType: 'bag',
        weightPerUnit: 100
      };

      const result = await productService.createProduct(productData, user._id);

      expect(result.success).toBe(true);
      expect(result.data.product.locationId).toBeDefined();
      
      // Verificar se localização foi selecionada automaticamente
      const selectedLocationId = result.data.product.locationId._id || result.data.product.locationId;
      expect([location1._id.toString(), location2._id.toString()]).toContain(selectedLocationId.toString());
    });

    test('deve rejeitar criação quando não há localizações disponíveis', async () => {
      const seedType = await global.createTestSeedType();
      const user = await global.createTestUser();
      const chamber = await global.createTestChamber();
      
      // Não criar nenhuma localização disponível
      // (todas já estão ocupadas ou não existem)

      const productData = {
        name: 'Produto Teste',
        lot: 'LOT-2024-003',
        seedTypeId: seedType._id,
        quantity: 10,
        storageType: 'saco',
        weightPerUnit: 100
      };

      await expect(
        productService.createProduct(productData, user._id)
      ).rejects.toThrow('Nenhuma localização disponível');
    });

    test('deve validar capacidade antes de criar produto (REGRA CRÍTICA)', async () => {
      const seedType = await global.createTestSeedType();
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        isOccupied: false, 
        maxCapacityKg: 500,
        currentWeightKg: 0
      });

      const productData = {
        name: 'Produto Pesado',
        lot: 'LOT-2024-004',
        seedTypeId: seedType._id,
        quantity: 20,
        storageType: 'saco',
        weightPerUnit: 50, // Total: 1000kg > 500kg capacidade
        locationId: location._id
      };

      await expect(
        productService.createProduct(productData, user._id)
      ).rejects.toThrow('Capacidade insuficiente');
    });

    test('deve impedir múltiplos produtos na mesma localização (REGRA CRÍTICA)', async () => {
      const seedType = await global.createTestSeedType();
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        isOccupied: false, 
        maxCapacityKg: 2000,
        currentWeightKg: 0
      });

      // Criar primeiro produto
      const productData1 = {
        name: 'Produto 1',
        lot: 'LOT-001',
        seedTypeId: seedType._id,
        quantity: 10,
        storageType: 'saco',
        weightPerUnit: 50,
        locationId: location._id
      };

      const result1 = await productService.createProduct(productData1, user._id);
      expect(result1.success).toBe(true);

      // Tentar criar segundo produto na mesma localização
      const productData2 = {
        name: 'Produto 2',
        lot: 'LOT-002',
        seedTypeId: seedType._id,
        quantity: 5,
        storageType: 'saco',
        weightPerUnit: 50,
        locationId: location._id
      };

      await expect(
        productService.createProduct(productData2, user._id)
      ).rejects.toThrow('já está ocupada');
    });
  });

  describe('🎯 OBJETIVO: Movimentação otimizada com análise de benefícios', () => {
    test('deve mover produto para nova localização com sucesso', async () => {
      const chamber = await global.createTestChamber();
      const currentLocation = await global.createTestLocation({ 
        chamberId: chamber._id,
        isOccupied: false,
        maxCapacityKg: 1000
      });
      
      const product = await global.createTestProduct({ 
        locationId: currentLocation._id,
        quantity: 10, 
        weightPerUnit: 50 
      });
      
      const newLocation = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false, 
        maxCapacityKg: 1000 
      });
      const user = await global.createTestUser();

      const result = await productService.moveProduct(product._id, newLocation._id, user._id, {
        reason: 'Reorganização'
      });

      expect(result.success).toBe(true);
      expect(result.data.movement.type).toBe('transfer');
      expect(result.data.movement.toLocationId.toString()).toBe(newLocation._id.toString());

      // REGRA CRÍTICA: Verificar se produto foi atualizado
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.locationId.toString()).toBe(newLocation._id.toString());

      // REGRA CRÍTICA: Verificar se localizações foram atualizadas corretamente
      const oldLocation = await Location.findById(currentLocation._id);
      const newLocationUpdated = await Location.findById(newLocation._id);
      
      expect(oldLocation.isOccupied).toBe(false);
      expect(oldLocation.currentWeightKg).toBe(0);
      expect(newLocationUpdated.isOccupied).toBe(true);
      expect(newLocationUpdated.currentWeightKg).toBe(product.totalWeight);
    });

    test('deve analisar benefícios da movimentação', async () => {
      const chamber = await global.createTestChamber();
      const currentLocation = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 5 }, // Andar alto
        isOccupied: false,
        maxCapacityKg: 1000
      });
      
      const product = await global.createTestProduct({ 
        locationId: currentLocation._id,
        quantity: 10,
        weightPerUnit: 50
      });
      
      const betterLocation = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 }, // Andar baixo
        isOccupied: false,
        maxCapacityKg: 1500
      });
      const user = await global.createTestUser();

      const result = await productService.moveProduct(product._id, betterLocation._id, user._id, {
        reason: 'Otimização',
        analyzeOptimization: true
      });

      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
      expect(result.data.analysis.benefits).toBeDefined();
      expect(result.data.analysis.score).toBeGreaterThan(0);
    });

    test('deve impedir movimentação para localização ocupada (REGRA CRÍTICA)', async () => {
      const product = await global.createTestProduct();
      
      // Criar localização e produto que a ocupa
      const occupiedLocation = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false,  
        maxCapacityKg: 1000 
      });
      
      // Criar produto que ocupa a localização
      const occupyingProduct = await global.createTestProduct({ 
        locationId: occupiedLocation._id,
        quantity: 10,
        weightPerUnit: 50 // 500kg total
      });
      
      // Forçar atualização da localização como ocupada
      await Location.findByIdAndUpdate(occupiedLocation._id, {
        isOccupied: true,
        currentWeightKg: occupyingProduct.totalWeight
      });
      
      // Verificar se localização está ocupada
      const updatedLocation = await Location.findById(occupiedLocation._id);
      expect(updatedLocation.isOccupied).toBe(true);
      
      const user = await global.createTestUser();

      await expect(
        productService.moveProduct(product._id, occupiedLocation._id, user._id, {
          reason: 'Teste'
        })
      ).rejects.toThrow('já está ocupada');
    });

    test('deve validar capacidade antes da movimentação (REGRA CRÍTICA)', async () => {
      const product = await global.createTestProduct({ quantity: 20, weightPerUnit: 50 }); // 1000kg
      const smallLocation = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false, 
        maxCapacityKg: 500 // Insuficiente
      });
      const user = await global.createTestUser();

      await expect(
        productService.moveProduct(product._id, smallLocation._id, user._id, {
          reason: 'Teste'
        })
      ).rejects.toThrow('Capacidade insuficiente');
    });
  });

  describe('🎯 OBJETIVO: Remoção com liberação automática de espaço', () => {
    test('deve remover produto e liberar localização automaticamente', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        isOccupied: false,
        maxCapacityKg: 1000
      });
      
      const product = await global.createTestProduct({ 
        locationId: location._id,
        quantity: 10,
        weightPerUnit: 80
      });
      const user = await global.createTestUser();

      const result = await productService.removeProduct(product._id, user._id, {
        reason: 'Vencimento'
      });

      expect(result.success).toBe(true);
      expect(result.data.movement.type).toBe('exit');

      // REGRA CRÍTICA: Verificar se produto foi marcado como removido
      const updatedProduct = await Product.findById(product._id);
      expect(updatedProduct.status).toBe('removed');

      // REGRA CRÍTICA: Verificar se localização foi liberada automaticamente
      const updatedLocation = await Location.findById(location._id);
      expect(updatedLocation.isOccupied).toBe(false);
      expect(updatedLocation.currentWeightKg).toBe(0);

      // REGRA CRÍTICA: Verificar se movimento de saída foi criado automaticamente
      const movements = await Movement.find({ 
        productId: product._id, 
        type: 'exit' 
      });
      expect(movements).toHaveLength(1);
      expect(movements[0].weight).toBe(product.totalWeight);
    });

    test('deve incluir análise de liberação de espaço', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        isOccupied: false,
        maxCapacityKg: 1000
      });
      const product = await global.createTestProduct({ 
        locationId: location._id,
        quantity: 10,
        weightPerUnit: 80
      });
      const user = await global.createTestUser();

      const result = await productService.removeProduct(product._id, user._id, {
        reason: 'Saída',
        includeSpaceAnalysis: true
      });

      expect(result.success).toBe(true);
      expect(result.data.spaceAnalysis).toBeDefined();
      expect(result.data.spaceAnalysis.freedCapacity).toBe(800); // 10 * 80
    });
  });

  describe('🎯 OBJETIVO: Busca de localização ótima com algoritmo inteligente', () => {
    test('deve encontrar localização ótima considerando acesso e capacidade', async () => {
      const chamber = await global.createTestChamber();
      
      // Criar localizações com diferentes características
      const location1 = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 3 }, // Alto
        isOccupied: false,
        maxCapacityKg: 800
      });
      
      const location2 = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 }, // Baixo, melhor acesso
        isOccupied: false,
        maxCapacityKg: 1200
      });

      const productData = {
        quantity: 10,
        weightPerUnit: 50 // 500kg total
      };

      const result = await productService.findOptimalLocation(productData);

      expect(result.success).toBe(true);
      expect(result.data.location).toBeDefined();
      expect(result.data.score).toBeGreaterThan(0);
      
      // Location2 deve ser melhor (andar baixo, maior capacidade)
      expect(result.data.location._id.toString()).toBe(location2._id.toString());
    });

    test('deve retornar erro quando não há localizações disponíveis', async () => {
      // Não criar nenhuma localização

      const productData = {
        quantity: 10,
        weightPerUnit: 50
      };

      const result = await productService.findOptimalLocation(productData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Nenhuma localização disponível');
    });
  });

  describe('🎯 OBJETIVO: Análise de distribuição no sistema para otimização', () => {
    test('deve analisar distribuição de produtos por câmara', async () => {
      const chamber1 = await global.createTestChamber({ name: 'Câmara 1' });
      const chamber2 = await global.createTestChamber({ name: 'Câmara 2' });
      
      const location1 = await global.createTestLocation({ 
        chamberId: chamber1._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false 
      });
      const location2 = await global.createTestLocation({ 
        chamberId: chamber2._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false 
      });
      
      await global.createTestProduct({ locationId: location1._id });
      await global.createTestProduct({ locationId: location2._id });

      const result = await productService.analyzeProductDistribution();

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
      expect(result.data.summary.totalProducts).toBe(2);
      expect(result.data.summary.totalChambers).toBe(2);
      expect(result.data.chambersData).toHaveLength(2);
    });

    test('deve incluir recomendações de otimização', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id, 
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 5 }, // Alto
        isOccupied: false
      });
      await global.createTestProduct({ locationId: location._id });

      const result = await productService.analyzeProductDistribution({
        includeOptimizations: true
      });

      expect(result.success).toBe(true);
      expect(result.data.optimization).toBeDefined();
      expect(result.data.optimization.recommendations).toBeDefined();
    });
  });

  describe('🎯 OBJETIVO: Validação rigorosa de dados de produto', () => {
    test('deve validar dados do produto corretamente', async () => {
      const seedType = await global.createTestSeedType();
      
      const productData = {
        name: 'Produto Válido',
        lot: 'LOT-VALID-001',
        seedTypeId: seedType._id,
        quantity: 10,
        storageType: 'saco',
        weightPerUnit: 50
      };

      const result = await productService.validateProductData(productData);

      expect(result.valid).toBe(true);
      expect(result.data.totalWeight).toBe(500);
      expect(result.data.isValid).toBe(true);
    });

    test('deve detectar dados inválidos', async () => {
      const productData = {
        name: '',
        lot: 'LOT-INVALID',
        seedTypeId: 'invalid-id',
        quantity: -5, // Inválido
        storageType: 'tipo-inexistente',
        weightPerUnit: 0 // Inválido
      };

      const result = await productService.validateProductData(productData);

      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('🚨 Tratamento de Erros Alinhado aos Objetivos', () => {
    test('deve validar ObjectIds inválidos', async () => {
      const user = await global.createTestUser();
      
      await expect(
        productService.moveProduct('invalid-id', '507f1f77bcf86cd799439011', user._id, {
          reason: 'Teste'
        })
      ).rejects.toThrow();
    });

    test('deve tratar produto inexistente graciosamente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';
      const user = await global.createTestUser();

      await expect(
        productService.removeProduct(fakeId, user._id, {
          reason: 'Teste'
        })
      ).rejects.toThrow('Produto não encontrado');
    });
  });

  describe('🎯 Casos Extremos e Regras de Negócio', () => {
    test('deve funcionar com sistema sem produtos', async () => {
      const result = await productService.analyzeProductDistribution();

      expect(result.success).toBe(true);
      expect(result.data.summary.totalProducts).toBe(0);
      expect(result.data.summary.totalChambers).toBe(0);
    });

    test('deve calcular corretamente peso zero (deve ser rejeitado)', async () => {
      const productData = {
        quantity: 10,
        weightPerUnit: 0
      };

      const result = await productService.findOptimalLocation(productData);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Peso por unidade deve ser maior que zero');
    });

    test('deve gerar código de rastreamento único', async () => {
      const seedType = await global.createTestSeedType();
      
      const productData = {
        name: 'Produto Único',
        lot: 'LOT-UNIQUE-001',
        seedTypeId: seedType._id,
        quantity: 1,
        storageType: 'saco',
        weightPerUnit: 50
      };

      const result = await productService.generateProductCode(productData);

      expect(result.success).toBe(true);
      expect(result.data.code).toBeDefined();
      expect(result.data.code).toMatch(/PRD-\d{4}-\d{6}/);
    });
  });
}); 