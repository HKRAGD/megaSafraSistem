/**
 * Mock Helpers - Infraestrutura de Testes
 * 
 * Responsável por configurar mocks avançados para services e models,
 * incluindo simulação de cenários reais e de erro.
 * 
 * Objetivo: Centralizar e padronizar a configuração de mocks para todos
 * os testes de integração, permitindo simulação de cenários complexos.
 */

const TestDataFactory = require('./testDataFactory');

/**
 * Classe principal para helpers de mocks
 */
class MockHelpers {
  /**
   * Configuração básica de mocks para todos os models
   */
  static setupBasicModelMocks() {
    // Mocks dos models principais
    jest.mock('../../../models/User');
    jest.mock('../../../models/Chamber');
    jest.mock('../../../models/Location');
    jest.mock('../../../models/SeedType');
    jest.mock('../../../models/Product');
    jest.mock('../../../models/Movement');

    const models = {
      User: require('../../../models/User'),
      Chamber: require('../../../models/Chamber'),
      Location: require('../../../models/Location'),
      SeedType: require('../../../models/SeedType'),
      Product: require('../../../models/Product'),
      Movement: require('../../../models/Movement')
    };

    // Configurar mocks básicos para cada model
    Object.values(models).forEach(Model => {
      this.setupDefaultModelMethods(Model);
    });

    return models;
  }

  /**
   * Configura métodos padrão para um model
   */
  static setupDefaultModelMethods(Model) {
    // Métodos básicos de CRUD
    Model.find = jest.fn().mockReturnValue(this.createQueryBuilder([]));
    Model.findById = jest.fn().mockReturnValue(this.createQueryBuilder(null));
    Model.findOne = jest.fn().mockReturnValue(this.createQueryBuilder(null));
    Model.create = jest.fn().mockResolvedValue(null);
    Model.findByIdAndUpdate = jest.fn().mockResolvedValue(null);
    Model.findByIdAndDelete = jest.fn().mockResolvedValue(null);
    Model.deleteOne = jest.fn().mockResolvedValue({ deletedCount: 0 });
    Model.deleteMany = jest.fn().mockResolvedValue({ deletedCount: 0 });
    Model.updateOne = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    Model.updateMany = jest.fn().mockResolvedValue({ modifiedCount: 0 });
    
    // Métodos de agregação e contagem
    Model.countDocuments = jest.fn().mockResolvedValue(0);
    Model.aggregate = jest.fn().mockResolvedValue([]);
    Model.distinct = jest.fn().mockResolvedValue([]);
    
    // Métodos de validação
    Model.validate = jest.fn().mockResolvedValue(true);
  }

  /**
   * Cria query builder mock para métodos encadeados
   */
  static createQueryBuilder(defaultResult = null) {
    const queryBuilder = {
      select: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      lean: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue(defaultResult),
      then: jest.fn().mockImplementation((resolve) => {
        resolve(defaultResult);
        return Promise.resolve(defaultResult);
      })
    };

    // Permitir execução direta sem .exec()
    queryBuilder.valueOf = () => defaultResult;
    
    return Object.assign(Promise.resolve(defaultResult), queryBuilder);
  }

  /**
   * Configuração específica para mocks de User
   */
  static setupUserMocks(User, users = {}) {
    const defaultUsers = {
      admin: TestDataFactory.createValidAdmin(),
      operator: TestDataFactory.createValidOperator(),
      viewer: TestDataFactory.createValidViewer()
    };

    const allUsers = { ...defaultUsers, ...users };

    User.findById = jest.fn().mockImplementation((id) => {
      const userQueryBuilder = {
        select: jest.fn().mockImplementation(() => {
          const user = Object.values(allUsers).find(u => u._id.toString() === id);
          return Promise.resolve(user ? {
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive,
            passwordChangedAfter: user.passwordChangedAfter || null
          } : null);
        })
      };
      return userQueryBuilder;
    });

    User.find = jest.fn().mockReturnValue(this.createQueryBuilder(Object.values(allUsers)));
    User.countDocuments = jest.fn().mockResolvedValue(Object.keys(allUsers).length);

    return allUsers;
  }

  /**
   * Configuração específica para mocks de Chamber
   */
  static setupChamberMocks(Chamber, chambers = []) {
    const defaultChambers = chambers.length > 0 ? chambers : [
      TestDataFactory.createValidChamber({ name: 'Câmara Test 01' }),
      TestDataFactory.createValidChamber({ name: 'Câmara Test 02' }),
      TestDataFactory.createValidChamber({ name: 'Câmara Test 03' })
    ];

    Chamber.find = jest.fn().mockReturnValue(this.createQueryBuilder(defaultChambers));
    Chamber.findById = jest.fn().mockImplementation((id) => {
      const chamber = defaultChambers.find(c => c._id.toString() === id);
      return this.createQueryBuilder(chamber);
    });
    Chamber.countDocuments = jest.fn().mockResolvedValue(defaultChambers.length);

    return defaultChambers;
  }

  /**
   * Configuração específica para mocks de Location
   */
  static setupLocationMocks(Location, locations = []) {
    const defaultLocations = locations.length > 0 ? locations : 
      TestDataFactory.createLocationsForChamber(TestDataFactory.generateObjectId());

    Location.find = jest.fn().mockReturnValue(this.createQueryBuilder(defaultLocations));
    Location.findById = jest.fn().mockImplementation((id) => {
      const location = defaultLocations.find(l => l._id.toString() === id);
      return this.createQueryBuilder(location);
    });
    Location.countDocuments = jest.fn().mockResolvedValue(defaultLocations.length);
    Location.aggregate = jest.fn().mockResolvedValue([]);

    return defaultLocations;
  }

  /**
   * Configuração específica para mocks de SeedType
   */
  static setupSeedTypeMocks(SeedType, seedTypes = []) {
    const defaultSeedTypes = seedTypes.length > 0 ? seedTypes : [
      TestDataFactory.createValidSeedType({ name: 'Milho Híbrido' }),
      TestDataFactory.createValidSeedType({ name: 'Soja Transgênica' }),
      TestDataFactory.createValidSeedType({ name: 'Trigo Comum' })
    ];

    SeedType.find = jest.fn().mockReturnValue(this.createQueryBuilder(defaultSeedTypes));
    SeedType.findById = jest.fn().mockImplementation((id) => {
      const seedType = defaultSeedTypes.find(s => s._id.toString() === id);
      return this.createQueryBuilder(seedType);
    });
    SeedType.countDocuments = jest.fn().mockResolvedValue(defaultSeedTypes.length);

    return defaultSeedTypes;
  }

  /**
   * Configuração específica para mocks de Product
   */
  static setupProductMocks(Product, products = []) {
    const defaultProducts = products.length > 0 ? products : [
      TestDataFactory.createValidProduct(),
      TestDataFactory.createValidProduct({ lot: 'LT2024002' }),
      TestDataFactory.createExpiringProduct(null, 5) // Expira em 5 dias
    ];

    Product.find = jest.fn().mockReturnValue(this.createQueryBuilder(defaultProducts));
    Product.findById = jest.fn().mockImplementation((id) => {
      const product = defaultProducts.find(p => p._id.toString() === id);
      return this.createQueryBuilder(product);
    });
    Product.countDocuments = jest.fn().mockResolvedValue(defaultProducts.length);

    return defaultProducts;
  }

  /**
   * Configuração específica para mocks de Movement
   */
  static setupMovementMocks(Movement, movements = []) {
    const defaultMovements = movements.length > 0 ? movements : [
      TestDataFactory.createValidMovement(),
      TestDataFactory.createTransferMovement(),
      TestDataFactory.createValidMovement({ type: 'exit' })
    ];

    Movement.find = jest.fn().mockReturnValue(this.createQueryBuilder(defaultMovements));
    Movement.findById = jest.fn().mockImplementation((id) => {
      const movement = defaultMovements.find(m => m._id.toString() === id);
      return this.createQueryBuilder(movement);
    });
    Movement.countDocuments = jest.fn().mockResolvedValue(defaultMovements.length);
    Movement.aggregate = jest.fn().mockResolvedValue([]);

    return defaultMovements;
  }

  /**
   * Configuração completa de mocks para services
   */
  static setupServiceMocks() {
    // Mock dos services principais
    jest.mock('../../../services/reportService');
    jest.mock('../../../services/locationService');
    jest.mock('../../../services/productService');
    jest.mock('../../../services/movementService');

    const services = {
      reportService: require('../../../services/reportService'),
      locationService: require('../../../services/locationService'),
      productService: require('../../../services/productService'),
      movementService: require('../../../services/movementService')
    };

    // Configurar mocks básicos para reportService
    services.reportService.generateExecutiveDashboard = jest.fn().mockResolvedValue({
      data: TestDataFactory.createDashboardSummary()
    });
    services.reportService.generateCapacityReport = jest.fn().mockResolvedValue({
      data: TestDataFactory.createCapacityReport()
    });

    // Configurar mocks básicos para locationService
    services.locationService.analyzeOccupancy = jest.fn().mockResolvedValue({
      data: { occupancyRate: 0.5, distribution: {}, efficiency: 'good' }
    });
    services.locationService.findAvailableLocations = jest.fn().mockResolvedValue([]);
    services.locationService.validateLocationCapacity = jest.fn().mockResolvedValue(true);

    // Configurar mocks básicos para productService
    services.productService.createProduct = jest.fn().mockResolvedValue(TestDataFactory.createValidProduct());
    services.productService.moveProduct = jest.fn().mockResolvedValue(true);
    services.productService.removeProduct = jest.fn().mockResolvedValue(true);

    // Configurar mocks básicos para movementService
    services.movementService.registerMovement = jest.fn().mockResolvedValue(TestDataFactory.createValidMovement());
    services.movementService.getMovementHistory = jest.fn().mockResolvedValue([]);

    return services;
  }

  /**
   * Simulação de cenários de erro
   */
  static simulateDatabaseError(Model, method = 'find') {
    Model[method] = jest.fn().mockRejectedValue(new Error('Database connection error'));
  }

  static simulateValidationError(Model, method = 'create') {
    const validationError = new Error('Validation failed');
    validationError.name = 'ValidationError';
    validationError.errors = {
      name: { message: 'Campo name é obrigatório' }
    };
    Model[method] = jest.fn().mockRejectedValue(validationError);
  }

  static simulateNotFoundError(Model, method = 'findById') {
    Model[method] = jest.fn().mockReturnValue(this.createQueryBuilder(null));
  }

  static simulateAuthorizationError(service, method) {
    const authError = new Error('Acesso negado');
    authError.status = 403;
    service[method] = jest.fn().mockRejectedValue(authError);
  }

  /**
   * Configuração de cenários específicos para testes
   */
  static setupSuccessScenario(models, services, data = {}) {
    // Configurar mocks com dados válidos
    if (data.users) this.setupUserMocks(models.User, data.users);
    if (data.chambers) this.setupChamberMocks(models.Chamber, data.chambers);
    if (data.locations) this.setupLocationMocks(models.Location, data.locations);
    if (data.seedTypes) this.setupSeedTypeMocks(models.SeedType, data.seedTypes);
    if (data.products) this.setupProductMocks(models.Product, data.products);
    if (data.movements) this.setupMovementMocks(models.Movement, data.movements);
  }

  static setupErrorScenario(models, errorType = 'database') {
    // Configurar mocks para simular erros
    switch (errorType) {
      case 'database':
        Object.values(models).forEach(Model => {
          this.simulateDatabaseError(Model);
        });
        break;
      case 'validation':
        Object.values(models).forEach(Model => {
          this.simulateValidationError(Model);
        });
        break;
      case 'not_found':
        Object.values(models).forEach(Model => {
          this.simulateNotFoundError(Model);
        });
        break;
    }
  }

  /**
   * Utilitários para validação de mocks
   */
  static verifyMockCalled(mockFn, times = 1) {
    expect(mockFn).toHaveBeenCalledTimes(times);
  }

  static verifyMockCalledWith(mockFn, ...args) {
    expect(mockFn).toHaveBeenCalledWith(...args);
  }

  static verifyNoMockCalled(mockFn) {
    expect(mockFn).not.toHaveBeenCalled();
  }

  /**
   * Reset de todos os mocks
   */
  static resetAllMocks() {
    jest.clearAllMocks();
  }

  static restoreAllMocks() {
    jest.restoreAllMocks();
  }

  /**
   * Configuração completa para início de teste
   */
  static setupCompleteTestEnvironment(customData = {}) {
    const models = this.setupBasicModelMocks();
    const services = this.setupServiceMocks();
    
    // Configurar dados padrão
    this.setupSuccessScenario(models, services, customData);
    
    return { models, services };
  }
}

module.exports = MockHelpers; 