/**
 * Testes Unitários - DashboardController
 * Verificando MÉTRICAS E INSIGHTS: Resumo geral, status das câmaras, capacidade
 * Alinhamento: Conforme planejamento-backend.md - Dashboard Controller
 */

const request = require('supertest');

// Mock do middleware de autenticação ANTES do require do app
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      _id: 'user123',
      email: 'test@test.com',
      role: 'operator',
      name: 'Test User'
    };
    next();
  },
  authorizeRole: (...roles) => (req, res, next) => {
    next();
  },
  requireAdmin: (req, res, next) => {
    next();
  },
  requireOperator: (req, res, next) => {
    next();
  }
}));

// Mock dos services reais que o dashboardController usa
jest.mock('../../../services/reportService', () => ({
  generateExecutiveDashboard: jest.fn(),
  generateCapacityReport: jest.fn()
}));

jest.mock('../../../services/locationService', () => ({
  findAvailableLocations: jest.fn(),
  analyzeOccupancy: jest.fn()
}));

jest.mock('../../../services/productService', () => ({
  getProducts: jest.fn()
}));

jest.mock('../../../services/movementService', () => ({
  getMovementHistory: jest.fn()
}));

// Mock dos models
jest.mock('../../../models/Product');
jest.mock('../../../models/Chamber');
jest.mock('../../../models/Location');
jest.mock('../../../models/Movement');
jest.mock('../../../models/SeedType');
jest.mock('../../../models/User');

const app = require('../../../app');
const reportService = require('../../../services/reportService');
const Product = require('../../../models/Product');
const Chamber = require('../../../models/Chamber');
const Location = require('../../../models/Location');
const Movement = require('../../../models/Movement');
const SeedType = require('../../../models/SeedType');
const User = require('../../../models/User');

describe('DashboardController - Dashboard Executivo', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup padrão dos mocks para evitar erros
    Product.countDocuments = jest.fn().mockResolvedValue(0);
    Chamber.countDocuments = jest.fn().mockResolvedValue(0);
    Location.countDocuments = jest.fn().mockResolvedValue(0);
    Movement.countDocuments = jest.fn().mockResolvedValue(0);
    SeedType.countDocuments = jest.fn().mockResolvedValue(0);
    User.countDocuments = jest.fn().mockResolvedValue(0);
    
    // Mock das agregações
    Location.aggregate = jest.fn().mockResolvedValue([]);
    Movement.aggregate = jest.fn().mockResolvedValue([]);
    
    // Mock do find com populate - query builder completo
    const mockQueryBuilder = {
      populate: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      lean: jest.fn().mockResolvedValue([]),
      exec: jest.fn().mockResolvedValue([]),
      select: jest.fn().mockReturnThis()
    };
    
    Product.find = jest.fn().mockReturnValue(mockQueryBuilder);
    Movement.find = jest.fn().mockReturnValue(mockQueryBuilder);
    
    // Mock especial para Chamber.find que precisa de .sort() no controller
    const mockChamberQueryBuilder = {
      sort: jest.fn().mockResolvedValue([]),
      lean: jest.fn().mockReturnThis(),
      populate: jest.fn().mockReturnThis(),
      exec: jest.fn().mockResolvedValue([])
    };
    
    Chamber.find = jest.fn().mockReturnValue(mockChamberQueryBuilder);
    Location.find = jest.fn().mockResolvedValue([]);
  });

  describe('GET /api/dashboard/summary - Resumo Geral do Sistema', () => {
    it('deve retornar resumo executivo do sistema', async () => {
      // Mock do executive dashboard do reportService
      const mockExecutiveDashboard = {
        data: {
          totalProducts: 150,
          totalMovements: 1200,
          utilizationRate: 75,
          efficiency: 92,
          trends: {
            productsGrowth: '+5.2%',
            movementsGrowth: '+12%'
          },
          alerts: {
            critical: 1,
            warnings: 3
          },
          metadata: {
            generatedAt: new Date(),
            period: 7
          }
        }
      };

      reportService.generateExecutiveDashboard.mockResolvedValue(mockExecutiveDashboard);

      // Mock das contagens adicionais
      User.countDocuments.mockResolvedValue(8);
      SeedType.countDocuments.mockResolvedValue(12);
      Location.countDocuments.mockResolvedValue(500);
      Chamber.countDocuments.mockResolvedValue(5);

      // Mock para getCriticalAlertsCount
      Product.countDocuments.mockResolvedValue(2); // produtos expirados
      Location.aggregate.mockResolvedValue([{ count: 1 }]); // câmaras sobrecarregadas
      Chamber.countDocuments.mockImplementation((query) => {
        if (query.status === 'inactive') return Promise.resolve(0);
        return Promise.resolve(5);
      });

      const response = await request(app)
        .get('/api/dashboard/summary')
        .query({ period: 7 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('Resumo do sistema obtido com sucesso');

      // Verificar estrutura da resposta
      expect(response.body.data).toHaveProperty('totalProducts', 150);
      expect(response.body.data).toHaveProperty('totalMovements', 1200);
      expect(response.body.data).toHaveProperty('systemStatus');
      expect(response.body.data).toHaveProperty('criticalAlerts');
      expect(response.body.data).toHaveProperty('metadata');

      // Verificar system status
      expect(response.body.data.systemStatus.totalUsers).toBe(8);
      expect(response.body.data.systemStatus.totalSeedTypes).toBe(12);
      expect(response.body.data.systemStatus.totalLocations).toBe(500);
      expect(response.body.data.systemStatus.totalChambers).toBe(5);

      // Verificar que o reportService foi chamado corretamente
      expect(reportService.generateExecutiveDashboard).toHaveBeenCalledWith({
        period: 7,
        includeComparisons: true,
        includeTrends: true
      });
    });

    it('deve usar período padrão de 7 dias se não especificado', async () => {
      const mockExecutiveDashboard = {
        data: {
          totalProducts: 100,
          metadata: { period: 7 }
        }
      };

      reportService.generateExecutiveDashboard.mockResolvedValue(mockExecutiveDashboard);

      User.countDocuments.mockResolvedValue(5);
      SeedType.countDocuments.mockResolvedValue(8);
      Location.countDocuments.mockResolvedValue(300);
      Chamber.countDocuments.mockResolvedValue(3);

      // Mock para getCriticalAlertsCount
      Product.countDocuments.mockResolvedValue(0);
      Location.aggregate.mockResolvedValue([]);
      
      const response = await request(app)
        .get('/api/dashboard/summary');

      expect(response.status).toBe(200);
      expect(reportService.generateExecutiveDashboard).toHaveBeenCalledWith({
        period: 7,
        includeComparisons: true,
        includeTrends: true
      });
    });

    it('deve tratar erro do reportService', async () => {
      reportService.generateExecutiveDashboard.mockRejectedValue(new Error('Erro no relatório'));

      const response = await request(app)
        .get('/api/dashboard/summary');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Erro interno do servidor');
    });
  });

  describe('GET /api/dashboard/chamber-status - Status das Câmaras', () => {
    it('deve retornar status detalhado das câmaras ativas', async () => {
      const mockChambers = [
        {
          _id: 'chamber1',
          name: 'Câmara Principal',
          description: 'Câmara para sementes',
          status: 'active',
          currentTemperature: 18,
          currentHumidity: 65,
          dimensions: { quadras: 2, lados: 3, filas: 4, andares: 5 }
        }
      ];

      const mockLocations = [
        { _id: 'loc1', chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 750, isOccupied: true },
        { _id: 'loc2', chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 500, isOccupied: false }
      ];

      const mockProducts = [
        {
          _id: 'prod1',
          name: 'Milho Premium',
          locationId: 'loc1',
          status: 'stored',
          expirationDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000), // 10 dias
          seedTypeId: { name: 'Milho' }
        }
      ];

      // Corrigir o mock do Chamber.find para retornar query builder que funciona com .sort()
      const mockChamberQueryBuilder = {
        sort: jest.fn().mockResolvedValue(mockChambers) // sort resolve para os dados
      };
      Chamber.find.mockReturnValue(mockChamberQueryBuilder);
      
      Location.find.mockResolvedValue(mockLocations);
      
      const mockProductQuery = {
        populate: jest.fn().mockResolvedValue(mockProducts)
      };
      Product.find.mockReturnValue(mockProductQuery);
      
      Movement.countDocuments.mockResolvedValue(5);

      const response = await request(app)
        .get('/api/dashboard/chamber-status');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar estrutura da resposta
      expect(response.body.data).toHaveProperty('consolidated');
      expect(response.body.data).toHaveProperty('chambers');
      expect(response.body.data).toHaveProperty('metadata');

      // Verificar dados consolidados
      expect(response.body.data.consolidated.totalChambers).toBe(1);
      expect(response.body.data.consolidated.activeChambers).toBe(1);

      // Verificar dados da câmara
      const chamber = response.body.data.chambers[0];
      expect(chamber.chamber.name).toBe('Câmara Principal');
      expect(chamber.occupancy.totalLocations).toBe(2);
      expect(chamber.occupancy.occupiedLocations).toBe(1);
      expect(chamber.capacity.totalCapacity).toBe(2000);
      expect(chamber.capacity.usedCapacity).toBe(1250);
      expect(chamber.products.totalProducts).toBe(1);
    });

    it('deve incluir câmaras inativas quando solicitado', async () => {
      const mockChambers = [
        { _id: 'chamber1', name: 'Câmara Ativa', status: 'active' },
        { _id: 'chamber2', name: 'Câmara Inativa', status: 'inactive' }
      ];

      // Corrigir o mock do Chamber.find
      const mockChamberQueryBuilder = {
        sort: jest.fn().mockResolvedValue(mockChambers)
      };
      Chamber.find.mockReturnValue(mockChamberQueryBuilder);
      
      Location.find.mockResolvedValue([]);
      Product.find.mockReturnValue({
        populate: jest.fn().mockResolvedValue([])
      });
      Movement.countDocuments.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/dashboard/chamber-status')
        .query({ includeInactive: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.data.chambers).toHaveLength(2);
      expect(response.body.data.metadata.includeInactive).toBe(true);

      expect(Chamber.find).toHaveBeenCalledWith({});
    });

    it('deve tratar erro na consulta de câmaras', async () => {
      // Para testar erro, mock a função sort para rejeitar
      const mockChamberQueryBuilder = {
        sort: jest.fn().mockRejectedValue(new Error('Erro na consulta'))
      };
      Chamber.find.mockReturnValue(mockChamberQueryBuilder);

      const response = await request(app)
        .get('/api/dashboard/chamber-status');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/dashboard/storage-capacity - Capacidade de Armazenamento', () => {
    it('deve retornar análise de capacidade do sistema', async () => {
      const mockChambers = [
        { _id: 'chamber1', name: 'Câmara 1', status: 'active' }
      ];

      const mockLocations = [
        { chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 750 },
        { chamberId: 'chamber1', maxCapacityKg: 1500, currentWeightKg: 800 }
      ];

      const mockCapacityReport = {
        data: {
          summary: {
            totalCapacity: 2500,
            usedCapacity: 1550,
            utilizationRate: 62,
            availableCapacity: 950
          },
          chamberAnalysis: [{
            chamberId: 'chamber1',
            name: 'Câmara 1',
            capacity: 2500,
            used: 1550,
            utilizationRate: 62,
            available: 950
          }],
          projections: {
            nextMonth: { expected: 1700, confidence: 85 },
            quarterProjection: { expected: 2000, confidence: 75 }
          },
          alerts: [],
          trends: {
            growth: { period: '30 days', trend: 'stable' },
            projectedMonthly: 100
          },
          efficiency: {
            averageUtilization: 62,
            balanceScore: 85,
            efficiencyRating: 'good'
          }
        }
      };

      const mockOccupancyAnalysis = {
        data: {
          occupancyRate: 0.62,
          distribution: {
            chamber1: { rate: 0.62, locations: 2 }
          },
          efficiency: 'good'
        }
      };

      Chamber.find.mockResolvedValue(mockChambers);
      Location.find.mockResolvedValue(mockLocations);
      Movement.aggregate.mockResolvedValue([{ totalWeight: 1000 }]);
      
      // Mock dos services principais
      reportService.generateCapacityReport.mockResolvedValue(mockCapacityReport);
      
      // Adicionar o mock do locationService.analyzeOccupancy corretamente
      const locationService = require('../../../services/locationService');
      locationService.analyzeOccupancy.mockResolvedValue(mockOccupancyAnalysis);

      const response = await request(app)
        .get('/api/dashboard/storage-capacity');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar estrutura da resposta
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data).toHaveProperty('projections');
      expect(response.body.data).toHaveProperty('recommendations');
      expect(response.body.data).toHaveProperty('metadata');

      // Verificar dados do summary (vem do capacityReport)
      expect(response.body.data.summary.totalCapacity).toBe(2500);
      expect(response.body.data.summary.usedCapacity).toBe(1550);
      expect(response.body.data.summary.utilizationRate).toBe(62);

      // Verificar análise (vem de várias fontes)
      expect(response.body.data.analysis).toHaveProperty('capacity');
      expect(response.body.data.analysis).toHaveProperty('occupancy');
      expect(response.body.data.analysis).toHaveProperty('growth');
      expect(response.body.data.analysis).toHaveProperty('efficiency');

      // Verificar que os services foram chamados corretamente
      expect(reportService.generateCapacityReport).toHaveBeenCalledWith({
        includeProjections: true
      });
      expect(locationService.analyzeOccupancy).toHaveBeenCalledWith({});
    });

    it('deve incluir tendências e projeções', async () => {
      const mockCapacityReport = {
        data: {
          summary: { totalCapacity: 0, usedCapacity: 0, utilizationRate: 0 },
          chamberAnalysis: [],
          projections: {
            nextMonth: { expected: 500, confidence: 90 },
            quarterProjection: { expected: 1500, confidence: 80 }
          },
          alerts: [],
          trends: {
            growth: { period: '30 days', trend: 'increasing' },
            projectedMonthly: 500
          },
          efficiency: {
            averageUtilization: 0,
            balanceScore: 100,
            efficiencyRating: 'needs_improvement'
          }
        }
      };

      const mockOccupancyAnalysis = {
        data: {
          occupancyRate: 0,
          distribution: {},
          efficiency: 'needs_improvement'
        }
      };

      Chamber.find.mockResolvedValue([]);
      Location.find.mockResolvedValue([]);
      Movement.aggregate.mockResolvedValue([{ totalWeight: 500 }]);
      
      reportService.generateCapacityReport.mockResolvedValue(mockCapacityReport);
      
      const locationService = require('../../../services/locationService');
      locationService.analyzeOccupancy.mockResolvedValue(mockOccupancyAnalysis);

      const response = await request(app)
        .get('/api/dashboard/storage-capacity');

      expect(response.status).toBe(200);

      // Verificar projections
      expect(response.body.data.projections).toHaveProperty('nextMonth');
      expect(response.body.data.projections).toHaveProperty('quarterProjection');
      expect(response.body.data.projections.nextMonth.expected).toBe(500);

      // Verificar que includeProjections foi respeitado
      expect(response.body.data.metadata.includeProjections).toBe(true);
    });

    it('deve tratar parâmetros de query corretamente', async () => {
      const mockCapacityReport = {
        data: {
          summary: { totalCapacity: 1000, usedCapacity: 500, utilizationRate: 50 },
          chamberAnalysis: [],
          projections: null, // Sem projeções
          alerts: [],
          trends: {},
          efficiency: {}
        }
      };

      const mockOccupancyAnalysis = {
        data: { occupancyRate: 0.5, distribution: {}, efficiency: 'good' }
      };

      reportService.generateCapacityReport.mockResolvedValue(mockCapacityReport);
      
      const locationService = require('../../../services/locationService');
      locationService.analyzeOccupancy.mockResolvedValue(mockOccupancyAnalysis);

      const response = await request(app)
        .get('/api/dashboard/storage-capacity')
        .query({ 
          includeProjections: 'false',
          groupBy: 'location'
        });

      expect(response.status).toBe(200);

      // Verificar parâmetros no metadata
      expect(response.body.data.metadata.includeProjections).toBe(false);
      expect(response.body.data.metadata.groupBy).toBe('location');

      // Verificar que o service foi chamado com os parâmetros corretos
      expect(reportService.generateCapacityReport).toHaveBeenCalledWith({
        includeProjections: false
      });
    });
  });

  describe('GET /api/dashboard/recent-movements - Movimentações Recentes', () => {
    it('deve retornar movimentações recentes com análises', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          type: 'entry',
          quantity: 50,
          weight: 500,
          timestamp: new Date(),
          productId: { name: 'Milho' },
          userId: { _id: 'user1', name: 'João' },
          toLocationId: { code: 'Q1-L1-F1-A1' },
          metadata: { isAutomatic: false }
        }
      ];

      // Corrigir o mock para seguir a cadeia correta: populate -> sort -> limit -> resultado
      const mockMovementQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue(mockMovements) // limit resolve para o array final
      };

      Movement.find.mockReturnValue(mockMovementQuery);

      const response = await request(app)
        .get('/api/dashboard/recent-movements')
        .query({ limit: 10, hours: 24, includeAnalysis: 'true' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);

      // Verificar estrutura da resposta
      expect(response.body.data).toHaveProperty('movements');
      expect(response.body.data).toHaveProperty('summary');
      expect(response.body.data).toHaveProperty('analysis');
      expect(response.body.data).toHaveProperty('activity');

      // Verificar movimentações processadas
      expect(response.body.data.movements).toHaveLength(1);
      expect(response.body.data.movements[0]).toHaveProperty('type', 'entry');
      expect(response.body.data.movements[0]).toHaveProperty('_id', 'mov1');

      // Verificar análise
      expect(response.body.data.analysis).toHaveProperty('userActivity');
      expect(response.body.data.analysis).toHaveProperty('averageWeight');
      expect(response.body.data.analysis).toHaveProperty('automationRate');
    });

    it('deve usar valores padrão para parâmetros não informados', async () => {
      const mockMovementQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]) // limit resolve para array vazio
      };

      Movement.find.mockReturnValue(mockMovementQuery);

      const response = await request(app)
        .get('/api/dashboard/recent-movements');

      expect(response.status).toBe(200);

      // Verificar que foi chamado com valores padrão (50, não 20)
      expect(mockMovementQuery.limit).toHaveBeenCalledWith(50); // Verificar valor padrão correto
    });

    it('deve tratar erro na consulta de movimentações', async () => {
      Movement.find.mockImplementation(() => {
        throw new Error('Erro na consulta');
      });

      const response = await request(app)
        .get('/api/dashboard/recent-movements');

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });
  });

  describe('Autenticação e Autorização', () => {
    it('deve incluir informações do usuário autenticado no metadata', async () => {
      reportService.generateExecutiveDashboard.mockResolvedValue({
        data: { totalProducts: 100, metadata: {} }
      });

      User.countDocuments.mockResolvedValue(5);
      SeedType.countDocuments.mockResolvedValue(8);
      Location.countDocuments.mockResolvedValue(300);
      Chamber.countDocuments.mockResolvedValue(3);

      // Mock para getCriticalAlertsCount
      Product.countDocuments.mockResolvedValue(0);
      Location.aggregate.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/dashboard/summary');

      expect(response.status).toBe(200);
      expect(response.body.data.metadata.generatedBy).toBe('Test User');
      expect(response.body.data.metadata.userRole).toBe('operator');
    });
  });

  describe('Integração entre endpoints', () => {
    it('deve manter consistência nos dados entre diferentes endpoints', async () => {
      // Setup comum para todos os endpoints
      const mockChambers = [{ _id: 'chamber1', name: 'Câmara 1', status: 'active' }];
      const mockLocations = [{ chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 500 }];

      // Corrigir o mock do Chamber.find para usar query builder
      const mockChamberQueryBuilder = {
        sort: jest.fn().mockResolvedValue(mockChambers)
      };
      Chamber.find.mockReturnValue(mockChamberQueryBuilder);
      
      Location.find.mockResolvedValue(mockLocations);
      Product.find.mockReturnValue({ populate: jest.fn().mockResolvedValue([]) });
      Movement.countDocuments.mockResolvedValue(0);
      Movement.aggregate.mockResolvedValue([{ totalWeight: 100 }]);

      reportService.generateExecutiveDashboard.mockResolvedValue({
        data: { totalProducts: 50, metadata: {} }
      });

      // Mock correto para countDocuments - deve retornar 1 para ser consistente
      User.countDocuments.mockResolvedValue(5);
      SeedType.countDocuments.mockResolvedValue(8);
      Location.countDocuments.mockResolvedValue(1); // Corrigir para ser consistente
      Chamber.countDocuments.mockResolvedValue(1); // Corrigir para ser consistente

      // Mock para getCriticalAlertsCount
      Product.countDocuments.mockResolvedValue(0);
      Location.aggregate.mockResolvedValue([]);

      // Testar summary
      const summaryResponse = await request(app).get('/api/dashboard/summary');
      expect(summaryResponse.body.data.systemStatus.totalChambers).toBe(1);

      // Testar chamber-status
      const chamberResponse = await request(app).get('/api/dashboard/chamber-status');
      expect(chamberResponse.body.data.consolidated.totalChambers).toBe(1);

      // Verificar consistência
      expect(summaryResponse.body.data.systemStatus.totalChambers)
        .toBe(chamberResponse.body.data.consolidated.totalChambers);
    });
  });
}); 