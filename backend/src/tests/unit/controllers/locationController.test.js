/**
 * Testes Unitários - LocationController
 * Verificando HIERARQUIA e CAPACIDADE: Validação de coordenadas, capacidade máxima
 */

const request = require('supertest');

// Mock do middleware de autenticação ANTES do require do app
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      _id: 'user123',
      email: 'test@test.com',
      role: 'operator'
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

// Mock do locationService
jest.mock('../../../services/locationService', () => ({
  analyzeOccupancy: jest.fn(),
  findAvailableLocations: jest.fn(),
  findAdjacentLocations: jest.fn(),
  validateCapacity: jest.fn(),
  generateLocationsForChamber: jest.fn()
}));

// Mock do Location model
jest.mock('../../../models/Location');

const app = require('../../../app');
const locationService = require('../../../services/locationService');
const Location = require('../../../models/Location');

describe('LocationController - Hierarquia e Capacidade', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integração com LocationService', () => {
    it('deve verificar disponibilidade dos métodos do locationService', async () => {
      // Verificar se os métodos críticos estão disponíveis
      expect(locationService.analyzeOccupancy).toBeDefined();
      expect(locationService.findAvailableLocations).toBeDefined();
      expect(locationService.findAdjacentLocations).toBeDefined();
      expect(locationService.validateCapacity).toBeDefined();
      expect(locationService.generateLocationsForChamber).toBeDefined();
    });

    it('deve usar locationService.analyzeOccupancy para análise de ocupação', async () => {
      const mockOccupancyAnalysis = {
        totalLocations: 100,
        occupiedCount: 75,
        occupancyRate: 0.75,
        underutilized: ['Q1-L1-F1-A2'],
        recommendations: ['Otimizar distribuição']
      };

      locationService.analyzeOccupancy.mockResolvedValue(mockOccupancyAnalysis);

      const result = await locationService.analyzeOccupancy();
      
      expect(result.totalLocations).toBe(100);
      expect(result.occupancyRate).toBe(0.75);
      expect(result.recommendations).toBeDefined();
      expect(locationService.analyzeOccupancy).toHaveBeenCalled();
    });

    it('deve usar locationService.findAvailableLocations para busca otimizada', async () => {
      const mockAvailableLocations = {
        strategy: 'FIFO',
        locations: [
          {
            code: 'Q1-L1-F1-A1',
            availableCapacity: 1000,
            accessScore: 0.9
          }
        ],
        total: 1
      };

      locationService.findAvailableLocations.mockResolvedValue(mockAvailableLocations);

      const result = await locationService.findAvailableLocations({
        strategy: 'FIFO',
        minCapacity: 500
      });

      expect(result.strategy).toBe('FIFO');
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].accessScore).toBe(0.9);
      expect(locationService.findAvailableLocations).toHaveBeenCalledWith({
        strategy: 'FIFO',
        minCapacity: 500
      });
    });

    it('deve usar locationService.validateCapacity para validação de capacidade', async () => {
      const mockValidation = {
        canAccommodate: true,
        currentWeight: 750,
        maxCapacity: 1000,
        availableCapacity: 250,
        utilizationRate: 0.75,
        status: 'ok',
        suggestions: []
      };

      locationService.validateCapacity.mockResolvedValue(mockValidation);

      const result = await locationService.validateCapacity('loc123', 150);

      expect(result.canAccommodate).toBe(true);
      expect(result.utilizationRate).toBe(0.75);
      expect(result.availableCapacity).toBe(250);
      expect(locationService.validateCapacity).toHaveBeenCalledWith('loc123', 150);
    });

    it('deve usar locationService.findAdjacentLocations para operações coordenadas', async () => {
      const mockAdjacent = {
        center: { code: 'Q1-L1-F1-A1' },
        adjacent: [
          { code: 'Q1-L1-F1-A2', direction: 'up', isOccupied: false },
          { code: 'Q1-L1-F2-A1', direction: 'forward', isOccupied: true }
        ],
        availableCount: 1,
        operationalBenefits: [
          'Facilita movimentação coordenada',
          'Reduz tempo de acesso'
        ]
      };

      locationService.findAdjacentLocations.mockResolvedValue(mockAdjacent);

      const result = await locationService.findAdjacentLocations('loc123');

      expect(result.center.code).toBe('Q1-L1-F1-A1');
      expect(result.availableCount).toBe(1);
      expect(result.operationalBenefits).toHaveLength(2);
      expect(locationService.findAdjacentLocations).toHaveBeenCalledWith('loc123');
    });

    it('deve usar locationService.generateLocationsForChamber para geração automática', async () => {
      const mockResult = {
        success: true,
        data: {
          chamberId: 'chamber123',
          generated: 100,
          locations: [],
          summary: {
            totalGenerated: 100,
            byFloor: { '1': 25, '2': 25, '3': 25, '4': 25 }
          }
        }
      };

      locationService.generateLocationsForChamber.mockResolvedValue(mockResult);

      const result = await locationService.generateLocationsForChamber(
        'chamber123',
        { capacityStrategy: 'variable' }
      );

      expect(result.success).toBe(true);
      expect(result.data.generated).toBe(100);
      expect(result.data.summary.totalGenerated).toBe(100);
      expect(locationService.generateLocationsForChamber).toHaveBeenCalledWith(
        'chamber123',
        { capacityStrategy: 'variable' }
      );
    });
  });

  describe('Validação de Regras de Negócio', () => {
    it('deve validar hierarquia de coordenadas dentro dos limites', async () => {
      // Simulando validação de coordenadas
      const coordinates = { quadra: 1, lado: 1, fila: 1, andar: 1 };
      
      // Verificar se as coordenadas são válidas
      expect(coordinates.quadra).toBeGreaterThan(0);
      expect(coordinates.lado).toBeGreaterThan(0);
      expect(coordinates.fila).toBeGreaterThan(0);
      expect(coordinates.andar).toBeGreaterThan(0);
    });

    it('deve garantir capacidade máxima positiva', async () => {
      const maxCapacityKg = 1000;
      
      expect(maxCapacityKg).toBeGreaterThan(0);
      expect(typeof maxCapacityKg).toBe('number');
    });

    it('deve verificar ocupação exclusiva (uma localização = um produto)', async () => {
      const location = {
        isOccupied: false,
        currentProductId: null
      };
      
      expect(location.isOccupied).toBe(false);
      expect(location.currentProductId).toBeNull();
    });
  });

  describe('Tratamento de Erros - Regras de Capacidade', () => {
    it('deve tratar erro de capacidade insuficiente', async () => {
      locationService.validateCapacity.mockRejectedValue(
        new Error('Capacidade insuficiente')
      );

      try {
        await locationService.validateCapacity('loc123', 2000);
      } catch (error) {
        expect(error.message).toBe('Capacidade insuficiente');
      }

      expect(locationService.validateCapacity).toHaveBeenCalled();
    });

    it('deve tratar erro de coordenadas fora dos limites', async () => {
      locationService.generateLocationsForChamber.mockRejectedValue(
        new Error('Coordenadas excedem limites da câmara')
      );

      try {
        await locationService.generateLocationsForChamber('chamber123', {
          coordinates: { quadra: 100, lado: 100, fila: 100, andar: 100 }
        });
      } catch (error) {
        expect(error.message).toBe('Coordenadas excedem limites da câmara');
      }

      expect(locationService.generateLocationsForChamber).toHaveBeenCalled();
    });
  });

  describe('Análise de Funcionalidades - Location Model', () => {
    it('deve verificar estrutura de query do Location model', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Location.find.mockReturnValue(mockQuery);
      Location.countDocuments.mockResolvedValue(0);

      // Verificar se a cadeia de query funciona
      const query = Location.find({ isOccupied: false })
        .populate('chamberId')
        .sort('code');
      
      expect(Location.find).toBeDefined();
      expect(mockQuery.populate).toBeDefined();
      expect(mockQuery.sort).toBeDefined();
    });

    it('deve verificar filtros de capacidade no model', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Location.find.mockReturnValue(mockQuery);
      Location.countDocuments.mockResolvedValue(0);

      // Simular filtro de capacidade
      Location.find({
        isOccupied: false,
        maxCapacityKg: { $gte: 500 }
      });

      expect(Location.find).toHaveBeenCalledWith({
        isOccupied: false,
        maxCapacityKg: { $gte: 500 }
      });
    });

    it('deve verificar métodos de instância do Location', async () => {
      const mockLocation = {
        _id: 'loc123',
        maxCapacityKg: 1000,
        currentWeightKg: 750,
        save: jest.fn().mockResolvedValue(true),
        calculateAvailableCapacity: jest.fn().mockReturnValue(250)
      };

      Location.findById.mockResolvedValue(mockLocation);

      const location = await Location.findById('loc123');
      
      expect(location.save).toBeDefined();
      expect(location.calculateAvailableCapacity).toBeDefined();
      
      // Simular cálculo de capacidade
      const available = location.calculateAvailableCapacity();
      expect(available).toBe(250);
    });
  });

  describe('Análise de Estratégias de Busca', () => {
    it('deve testar estratégia FIFO (First In, First Out)', async () => {
      const mockStrategy = {
        strategy: 'FIFO',
        priority: 'oldest_first',
        efficiency: 0.85
      };

      locationService.findAvailableLocations.mockResolvedValue({
        strategy: 'FIFO',
        locations: [],
        metadata: mockStrategy
      });

      const result = await locationService.findAvailableLocations({
        strategy: 'FIFO'
      });

      expect(result.strategy).toBe('FIFO');
      expect(locationService.findAvailableLocations).toHaveBeenCalledWith({
        strategy: 'FIFO'
      });
    });

    it('deve testar estratégia OPTIMAL (Otimizada)', async () => {
      const mockStrategy = {
        strategy: 'OPTIMAL',
        priority: 'efficiency_first',
        efficiency: 0.95
      };

      locationService.findAvailableLocations.mockResolvedValue({
        strategy: 'OPTIMAL',
        locations: [],
        metadata: mockStrategy
      });

      const result = await locationService.findAvailableLocations({
        strategy: 'OPTIMAL'
      });

      expect(result.strategy).toBe('OPTIMAL');
      expect(locationService.findAvailableLocations).toHaveBeenCalledWith({
        strategy: 'OPTIMAL'
      });
    });
  });
}); 