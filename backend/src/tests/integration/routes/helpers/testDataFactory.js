/**
 * Test Data Factory - Infraestrutura de Testes
 * 
 * Responsável por gerar dados de teste padronizados e consistentes
 * para todos os módulos do sistema de gerenciamento de câmaras refrigeradas.
 * 
 * Objetivo: Centralizar e padronizar a criação de dados de teste,
 * garantindo consistência e reutilização entre todos os testes de integração.
 */

const mongoose = require('mongoose');
const testDatabase = require('./TestDatabase');

/**
 * Classe principal para factory de dados de teste
 */
class TestDataFactory {
  /**
   * Gerar ObjectId aleatório
   */
  static generateObjectId() {
    return new mongoose.Types.ObjectId();
  }

  /**
   * Obter usuários reais do banco de teste
   */
  static getTestUsers() {
    const fixtures = testDatabase.getFixtures();
    return fixtures?.users || [];
  }

  /**
   * Obter usuário admin real
   */
  static getAdminUser() {
    return testDatabase.getUserByRole('admin');
  }

  /**
   * Obter usuário operator real
   */
  static getOperatorUser() {
    return testDatabase.getUserByRole('operator');
  }

  /**
   * Obter usuário viewer real
   */
  static getViewerUser() {
    return testDatabase.getUserByRole('viewer');
  }

  /**
   * Obter tipos de sementes reais do banco de teste
   */
  static getTestSeedTypes() {
    const fixtures = testDatabase.getFixtures();
    return fixtures?.seedTypes || [];
  }

  /**
   * Obter tipo de semente específico por nome
   */
  static getSeedTypeByName(name) {
    const seedTypes = this.getTestSeedTypes();
    return seedTypes.find(st => st.name === name);
  }

  /**
   * Obter câmaras reais do banco de teste
   */
  static getTestChambers() {
    const fixtures = testDatabase.getFixtures();
    return fixtures?.chambers || [];
  }

  /**
   * Obter câmara principal
   */
  static getMainChamber() {
    const chambers = this.getTestChambers();
    return chambers.find(c => c.name === 'Câmara Principal');
  }

  /**
   * Obter localizações reais do banco de teste
   */
  static getTestLocations() {
    const fixtures = testDatabase.getFixtures();
    return fixtures?.locations || [];
  }

  /**
   * Obter localização livre
   */
  static getFreeLocation() {
    return testDatabase.getFreeLocation();
  }

  /**
   * Obter localização ocupada
   */
  static getOccupiedLocation() {
    return testDatabase.getOccupiedLocation();
  }

  /**
   * Obter localização com baixa capacidade
   */
  static getLowCapacityLocation() {
    return testDatabase.getLowCapacityLocation();
  }

  /**
   * Obter produtos reais do banco de teste
   */
  static getTestProducts() {
    const fixtures = testDatabase.getFixtures();
    return fixtures?.products || [];
  }

  /**
   * Obter produto por nome
   */
  static getProductByName(name) {
    const products = this.getTestProducts();
    return products.find(p => p.name.includes(name));
  }

  /**
   * Obter movimentações reais do banco de teste
   */
  static getTestMovements() {
    const fixtures = testDatabase.getFixtures();
    return fixtures?.movements || [];
  }

  /**
   * Criar dados válidos para novo produto (para testes de criação)
   */
  static createValidProductData(overrides = {}) {
    const freeLocation = this.getFreeLocation();
    const seedType = this.getTestSeedTypes()[0];

    if (!freeLocation || !seedType) {
      throw new Error('Dados de teste não encontrados. Certifique-se de que o banco de teste foi populado.');
    }

    return {
      name: 'Produto Teste',
      lot: `TEST-${Date.now()}`,
      seedTypeId: seedType._id.toString(),
      quantity: 20,
      storageType: 'saco',
      weightPerUnit: 25,
      locationId: freeLocation._id.toString(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      notes: 'Produto criado para teste',
      ...overrides
    };
  }

  /**
   * Criar dados válidos para nova localização (para testes de criação)
   */
  static createValidLocationData(overrides = {}) {
    const chamber = this.getMainChamber();

    if (!chamber) {
      throw new Error('Câmara principal não encontrada no banco de teste');
    }

    return {
      chamberId: chamber._id.toString(),
      coordinates: { quadra: 1, lado: 1, fila: 3, andar: 1 },
      code: 'TEST-Q1-L1-F3-A1',
      maxCapacityKg: 1000,
      ...overrides
    };
  }

  /**
   * Criar dados válidos para novo tipo de semente (para testes de criação)
   */
  static createValidSeedTypeData(overrides = {}) {
    return {
      name: `Tipo Teste ${Date.now()}`,
      description: 'Tipo de semente para teste',
      optimalTemperature: 15,
      optimalHumidity: 50,
      maxStorageTimeDays: 365,
      specifications: {
        variety: 'Test variety',
        origin: 'Brasil',
        resistance: ['drought']
      },
      ...overrides
    };
  }

  /**
   * Criar dados válidos para nova câmara (para testes de criação)
   */
  static createValidChamberData(overrides = {}) {
    return {
      name: `Câmara Teste ${Date.now()}`,
      description: 'Câmara criada para teste',
      currentTemperature: 15.0,
      currentHumidity: 50.0,
      dimensions: {
        quadras: 2,
        lados: 2,
        filas: 3,
        andares: 2
      },
      status: 'active',
      ...overrides
    };
  }

  /**
   * Criar dados válidos para nova movimentação (para testes de criação)
   */
  static createValidMovementData(overrides = {}) {
    const product = this.getTestProducts()[0];
    const user = this.getAdminUser();
    const location = this.getFreeLocation();

    if (!product || !user || !location) {
      throw new Error('Dados de teste necessários não encontrados');
    }

    return {
      productId: product._id.toString(),
      type: 'transfer',
      toLocationId: location._id.toString(),
      quantity: 10,
      weight: 250,
      userId: user._id.toString(),
      reason: 'Teste de movimentação',
      notes: 'Movimentação criada para teste',
      ...overrides
    };
  }

  /**
   * Criar dados válidos para usuário (para testes de criação)
   */
  static createValidUserData(overrides = {}) {
    return {
      name: `Usuário Teste ${Date.now()}`,
      email: `teste${Date.now()}@example.com`,
      password: 'senhaSegura123',
      role: 'operator',
      ...overrides
    };
  }

  /**
   * Obter dados para teste de validação com erro
   */
  static createInvalidProductData() {
    return {
      // Dados inválidos propositalmente
      name: '', // Nome vazio
      quantity: -5, // Quantidade negativa
      weightPerUnit: 0, // Peso zero
      seedTypeId: 'id-invalido',
      locationId: 'id-invalido'
    };
  }

  /**
   * Obter produto que excede capacidade da localização
   */
  static createOverCapacityProductData() {
    const lowCapacityLocation = this.getLowCapacityLocation();
    const seedType = this.getTestSeedTypes()[0];

    if (!lowCapacityLocation || !seedType) {
      throw new Error('Dados de teste necessários não encontrados');
    }

    return {
      name: 'Produto Pesado',
      lot: `HEAVY-${Date.now()}`,
      seedTypeId: seedType._id.toString(),
      quantity: 50, // 50 unidades
      storageType: 'saco',
      weightPerUnit: 100, // 100kg por unidade = 5000kg total
      locationId: lowCapacityLocation._id.toString(), // Localização com apenas 500kg de capacidade
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    };
  }

  /**
   * Criar dados para movimentação para localização ocupada
   */
  static createMoveToOccupiedLocationData() {
    const product = this.getTestProducts()[0];
    const occupiedLocation = this.getOccupiedLocation();

    if (!product || !occupiedLocation) {
      throw new Error('Dados de teste necessários não encontrados');
    }

    return {
      newLocationId: occupiedLocation._id.toString(),
      reason: 'Teste de movimento para localização ocupada'
    };
  }

  /**
   * Gera timestamp atual
   */
  static generateTimestamp() {
    return new Date();
  }

  /**
   * Factory para Users
   */
  static createValidUser(overrides = {}) {
    return {
      _id: this.generateObjectId(),
      name: 'Test User',
      email: 'test@example.com',
      password: '$2a$10$hashedPasswordExample123',
      role: 'operator',
      isActive: true,
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
      passwordChangedAfter: null,
      ...overrides
    };
  }

  static createValidAdmin(overrides = {}) {
    return this.createValidUser({
      name: 'Test Admin',
      email: 'admin@example.com',
      role: 'admin',
      ...overrides
    });
  }

  static createValidOperator(overrides = {}) {
    return this.createValidUser({
      name: 'Test Operator', 
      email: 'operator@example.com',
      role: 'operator',
      ...overrides
    });
  }

  static createValidViewer(overrides = {}) {
    return this.createValidUser({
      name: 'Test Viewer',
      email: 'viewer@example.com', 
      role: 'viewer',
      ...overrides
    });
  }

  /**
   * Factory para SeedTypes
   */
  static createValidSeedType(overrides = {}) {
    return {
      _id: this.generateObjectId(),
      name: 'Milho Híbrido',
      description: 'Semente de milho híbrido para teste',
      optimalTemperature: 15,
      optimalHumidity: 45,
      maxStorageTimeDays: 365,
      isActive: true,
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
      ...overrides
    };
  }

  /**
   * Factory para Chambers
   */
  static createValidChamber(overrides = {}) {
    return {
      _id: this.generateObjectId(),
      name: 'Câmara Test 01',
      description: 'Câmara refrigerada para testes',
      currentTemperature: 15.5,
      currentHumidity: 42.3,
      dimensions: {
        quadras: 2,
        lados: 3,
        filas: 4,
        andares: 5
      },
      status: 'active',
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
      ...overrides
    };
  }

  /**
   * Factory para Locations
   */
  static createValidLocation(chamberId = null, overrides = {}) {
    const quadra = 1;
    const lado = 1;
    const fila = 1;
    const andar = 1;
    
    return {
      _id: this.generateObjectId(),
      chamberId: chamberId || this.generateObjectId(),
      coordinates: {
        quadra,
        lado,
        fila,
        andar
      },
      code: `Q${quadra}-L${lado}-F${fila}-A${andar}`,
      isOccupied: false,
      maxCapacityKg: 1000,
      currentWeightKg: 0,
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
      ...overrides
    };
  }

  static createOccupiedLocation(chamberId = null, productWeight = 500, overrides = {}) {
    return this.createValidLocation(chamberId, {
      isOccupied: true,
      currentWeightKg: productWeight,
      ...overrides
    });
  }

  /**
   * Factory para Products
   */
  static createValidProduct(locationId = null, seedTypeId = null, overrides = {}) {
    const quantity = 100;
    const weightPerUnit = 25; // kg por saco
    
    return {
      _id: this.generateObjectId(),
      name: 'Milho Premium Lote Test',
      lot: 'LT2024001',
      seedTypeId: seedTypeId || this.generateObjectId(),
      quantity,
      storageType: 'saco',
      weightPerUnit,
      totalWeight: quantity * weightPerUnit, // 2500kg
      locationId: locationId || this.generateObjectId(),
      entryDate: this.generateTimestamp(),
      expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
      status: 'stored',
      notes: 'Produto para testes de integração',
      createdAt: this.generateTimestamp(),
      updatedAt: this.generateTimestamp(),
      ...overrides
    };
  }

  static createExpiringProduct(locationId = null, daysToExpire = 7, overrides = {}) {
    return this.createValidProduct(locationId, null, {
      expirationDate: new Date(Date.now() + daysToExpire * 24 * 60 * 60 * 1000),
      ...overrides
    });
  }

  /**
   * Factory para Movements
   */
  static createValidMovement(productId = null, userId = null, overrides = {}) {
    return {
      _id: this.generateObjectId(),
      productId: productId || this.generateObjectId(),
      type: 'entry',
      fromLocationId: null,
      toLocationId: this.generateObjectId(),
      quantity: 50,
      weight: 1250, // 50 * 25kg
      userId: userId || this.generateObjectId(),
      reason: 'Entrada de estoque para teste',
      notes: 'Movimentação de teste de integração',
      timestamp: this.generateTimestamp(),
      ...overrides
    };
  }

  static createTransferMovement(productId = null, fromLocationId = null, toLocationId = null, userId = null, overrides = {}) {
    return this.createValidMovement(productId, userId, {
      type: 'transfer',
      fromLocationId: fromLocationId || this.generateObjectId(),
      toLocationId: toLocationId || this.generateObjectId(),
      reason: 'Transferência entre localizações',
      ...overrides
    });
  }

  /**
   * Factory para dados agregados (Dashboard/Reports)
   */
  static createDashboardSummary(overrides = {}) {
    return {
      systemStatus: {
        totalUsers: 5,
        totalChambers: 3,
        totalLocations: 120,
        totalSeedTypes: 8,
        totalProducts: 45
      },
      storageStats: {
        totalCapacity: 120000, // kg
        usedCapacity: 67500,   // kg
        utilizationRate: 0.5625,
        availableLocations: 75
      },
      recentActivity: {
        lastEntries: 12,
        lastExits: 5,
        lastTransfers: 8,
        period: '7 days'
      },
      criticalAlerts: [],
      metadata: {
        lastUpdated: this.generateTimestamp(),
        period: 7,
        version: '1.0.0'
      },
      ...overrides
    };
  }

  static createCapacityReport(overrides = {}) {
    return {
      summary: {
        totalChambers: 3,
        totalCapacity: 120000,
        usedCapacity: 67500,
        utilizationRate: 0.5625
      },
      chamberAnalysis: [
        {
          chamberId: this.generateObjectId(),
          name: 'Câmara 01',
          totalLocations: 40,
          occupiedLocations: 25,
          occupancyRate: 0.625,
          totalCapacity: 40000,
          usedCapacity: 22500,
          utilizationRate: 0.5625
        }
      ],
      projections: {
        estimatedFullCapacity: '45 days',
        recommendedActions: ['Expandir Câmara 02']
      },
      alerts: [],
      trends: {
        utilizationTrend: 'stable',
        occupancyTrend: 'increasing'
      },
      efficiency: {
        spaceEfficiency: 0.85,
        operationalEfficiency: 0.92
      },
      ...overrides
    };
  }

  /**
   * Factory para respostas de erro padronizadas
   */
  static createErrorResponse(message = 'Erro interno do servidor', status = 500, overrides = {}) {
    return {
      success: false,
      message,
      status,
      timestamp: this.generateTimestamp(),
      ...overrides
    };
  }

  static createValidationErrorResponse(field = 'campo', message = 'é obrigatório', overrides = {}) {
    return this.createErrorResponse(`Campo '${field}' ${message}`, 400, {
      type: 'validation_error',
      field,
      ...overrides
    });
  }

  static createAuthErrorResponse(message = 'Token inválido', overrides = {}) {
    return this.createErrorResponse(message, 401, {
      type: 'authentication_error',
      ...overrides
    });
  }

  static createForbiddenErrorResponse(message = 'Acesso negado', overrides = {}) {
    return this.createErrorResponse(message, 403, {
      type: 'authorization_error',
      ...overrides
    });
  }

  /**
   * Factory para dados de request comuns
   */
  static createPaginationQuery(page = 1, limit = 10, overrides = {}) {
    return {
      page,
      limit,
      ...overrides
    };
  }

  static createFilterQuery(overrides = {}) {
    return {
      search: '',
      status: 'active',
      ...overrides
    };
  }

  /**
   * Métodos utilitários para geração de dados em massa
   */
  static createMultipleUsers(count = 5, role = 'operator') {
    return Array.from({ length: count }, (_, index) => 
      this.createValidUser({
        name: `Test User ${index + 1}`,
        email: `user${index + 1}@example.com`,
        role
      })
    );
  }

  static createMultipleChambers(count = 3) {
    return Array.from({ length: count }, (_, index) => 
      this.createValidChamber({
        name: `Câmara Test ${String(index + 1).padStart(2, '0')}`,
        description: `Câmara refrigerada para testes ${index + 1}`
      })
    );
  }

  static createLocationsForChamber(chamberId, dimensions = { quadras: 2, lados: 2, filas: 2, andares: 2 }) {
    const locations = [];
    const { quadras, lados, filas, andares } = dimensions;
    
    for (let q = 1; q <= quadras; q++) {
      for (let l = 1; l <= lados; l++) {
        for (let f = 1; f <= filas; f++) {
          for (let a = 1; a <= andares; a++) {
            locations.push(this.createValidLocation(chamberId, {
              coordinates: { quadra: q, lado: l, fila: f, andar: a },
              code: `Q${q}-L${l}-F${f}-A${a}`
            }));
          }
        }
      }
    }
    
    return locations;
  }
}

module.exports = TestDataFactory; 