/**
 * Testes Unitários - chamberService
 * Sistema de Gestão Avançada de Câmaras
 * 
 * Objetivos dos Testes:
 * - Validar integração crítica com locationService
 * - Testar geração automática de localizações
 * - Verificar análise de capacidade e utilização
 * - Validar monitoramento ambiental
 * - Testar otimização de layout
 */

const chamberService = require('../../../services/chamberService');
const Chamber = require('../../../models/Chamber');
const Product = require('../../../models/Product');

// Mock das dependências
jest.mock('../../../models/Chamber', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  findByIdAndDelete: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../../../models/Product', () => ({
  find: jest.fn()
}));

jest.mock('../../../services/locationService', () => ({
  generateLocationsForChamber: jest.fn(),
  analyzeOccupancy: jest.fn(),
  findAvailableLocations: jest.fn(),
  analyzeChamberConditions: jest.fn(),
  getLocationsByChamber: jest.fn()
}));

jest.mock('../../../services/productService', () => ({
  getProductsByConditions: jest.fn(),
  analyzeProductDistribution: jest.fn(),
  getProductsByChamber: jest.fn(),
  analyzeProductGrowth: jest.fn()
}));

jest.mock('../../../services/movementService', () => ({
  registerSystemEvent: jest.fn().mockResolvedValue({ success: true }),
  analyzeMovementPatterns: jest.fn(),
  getMovementsByChamber: jest.fn()
}));

jest.mock('../../../services/seedTypeService', () => ({
  recommendSeedTypesForChamber: jest.fn()
}));

const locationService = require('../../../services/locationService');
const productService = require('../../../services/productService');
const movementService = require('../../../services/movementService');
const seedTypeService = require('../../../services/seedTypeService');

describe('ChamberService - Sistema de Gestão Avançada', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChamberWithLocations - Integração Crítica', () => {
    test('deve criar câmara com geração automática de localizações', async () => {
      const mockChamber = {
        _id: 'chamber123',
        name: 'Câmara Premium A1',
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 5
        },
        capacity: 1000,
        status: 'active'
      };

      const mockLocations = [
        { _id: 'loc1', code: 'Q1-L1-F1-A1', chamberId: 'chamber123' },
        { _id: 'loc2', code: 'Q1-L1-F1-A2', chamberId: 'chamber123' },
        { _id: 'loc3', code: 'Q1-L1-F1-A3', chamberId: 'chamber123' }
      ];

      Chamber.create.mockResolvedValue(mockChamber);
      locationService.generateLocationsForChamber.mockResolvedValue({
        success: true,
        data: {
          locations: mockLocations,
          totalGenerated: 120, // 2*3*4*5
          summary: {
            totalCapacity: 120000,
            averageCapacityPerLocation: 1000
          }
        }
      });

      const chamberData = {
        name: 'Câmara Premium A1',
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 5
        },
        capacity: 1000
      };

      const result = await chamberService.createChamberWithLocations(chamberData);

      expect(result.success).toBe(true);
      expect(result.data.chamber.name).toBe('Câmara Premium A1');
      expect(result.data.locations.totalGenerated).toBe(120);
      
      // Validar integração crítica
      expect(locationService.generateLocationsForChamber).toHaveBeenCalledWith(
        'chamber123',
        expect.objectContaining({
          dimensions: chamberData.dimensions,
          defaultCapacity: 1000
        })
      );

      // Validar registro de evento
      expect(movementService.registerSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chamber_created_with_locations',
          chamberId: 'chamber123'
        })
      );
    });

    test('deve validar dimensões da câmara', async () => {
      await expect(
        chamberService.createChamberWithLocations({
          name: 'Teste',
          dimensions: {
            quadras: 0, // Inválido
            lados: 2,
            filas: 3,
            andares: 4
          }
        })
      ).rejects.toThrow('Todas as dimensões devem ser pelo menos 1');
    });

    test('deve tratar falha na geração de localizações', async () => {
      const mockChamber = { _id: 'chamber123', name: 'Teste' };
      Chamber.create.mockResolvedValue(mockChamber);
      
      locationService.generateLocationsForChamber.mockResolvedValue({
        success: false,
        error: 'Erro na geração'
      });

      await expect(
        chamberService.createChamberWithLocations({
          name: 'Teste',
          dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
        })
      ).rejects.toThrow('Falha na geração de localizações: Erro na geração');
    });
  });

  describe('analyzeCapacityUtilization - Análise Inteligente', () => {
    test('deve analisar utilização de capacidade da câmara', async () => {
      const mockChamber = {
        _id: 'chamber123',
        name: 'Câmara A1',
        dimensions: { quadras: 2, lados: 2, filas: 2, andares: 2 }
      };

      const mockOccupancyData = {
        totalLocations: 16,
        occupiedLocations: 12,
        availableLocations: 4,
        utilizationPercentage: 75,
        capacityAnalysis: {
          totalCapacity: 16000,
          usedCapacity: 12000,
          availableCapacity: 4000
        },
        distribution: {
          byQuadra: { Q1: 6, Q2: 6 },
          byAndar: { A1: 3, A2: 3, A3: 3, A4: 3 }
        }
      };

      Chamber.findById.mockResolvedValue(mockChamber);
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      locationService.analyzeOccupancy.mockResolvedValue({
        success: true,
        data: mockOccupancyData
      });

      const result = await chamberService.analyzeCapacityUtilization('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.capacity.utilizationPercentage).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.efficiency.rating).toBeDefined();
      
      // Validar análise de eficiência
      expect(result.data.efficiency.rating).toBeGreaterThan(0);
      expect(result.data.efficiency.rating).toBeLessThanOrEqual(100);
    });

    test('deve gerar recomendações baseadas na utilização', async () => {
      const mockChamber = { _id: 'chamber123', name: 'Câmara A1' };
      const mockHighUtilization = {
        utilizationPercentage: 96, // Maior que 95 para triggerar recomendação
        availableLocations: 2,
        totalLocations: 40
      };

      Chamber.findById.mockResolvedValue(mockChamber);
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      locationService.analyzeOccupancy.mockResolvedValue({
        success: true,
        data: mockHighUtilization
      });

      const result = await chamberService.analyzeCapacityUtilization('chamber123');

      expect(result.data.recommendations).toContain('Considerar expansão da câmara');
      expect(result.data.alerts).toContain('Capacidade crítica atingida');
    });
  });

  describe('monitorEnvironmentalConditions - Monitoramento Ambiental', () => {
    test('deve monitorar condições ambientais da câmara', async () => {
      const mockChamber = {
        _id: 'chamber123',
        name: 'Câmara A1',
        currentTemperature: 18,
        currentHumidity: 55,
        targetTemperature: 20,
        targetHumidity: 50
      };

      const mockProducts = [
        {
          seedType: 'seed1',
          storageRequirements: {
            temperature: { min: 15, max: 25 },
            humidity: { min: 40, max: 60 }
          }
        },
        {
          seedType: 'seed2',
          storageRequirements: {
            temperature: { min: 18, max: 22 },
            humidity: { min: 45, max: 55 }
          }
        }
      ];

      Chamber.findById.mockResolvedValue(mockChamber);
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByConditions.mockResolvedValue(mockProducts);

      const result = await chamberService.monitorEnvironmentalConditions('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.currentConditions.temperature).toBe(18);
      expect(result.data.currentConditions.humidity).toBe(55);
      expect(result.data.compliance.overall).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
    });

    test('deve detectar violações de condições ambientais', async () => {
      const mockChamber = {
        _id: 'chamber123',
        currentTemperature: 30, // Muito alto
        currentHumidity: 80,    // Muito alto
        targetTemperature: 20,
        targetHumidity: 50
      };

      const mockProducts = [
        {
          storageRequirements: {
            temperature: { min: 15, max: 25 },
            humidity: { min: 40, max: 60 }
          }
        }
      ];

      Chamber.findById.mockResolvedValue(mockChamber);
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByConditions.mockResolvedValue(mockProducts);

      const result = await chamberService.monitorEnvironmentalConditions('chamber123');

      expect(result.data.violations).toHaveLength(2); // Temperatura e umidade
      expect(result.data.alerts).toContain('Condições críticas detectadas');
      expect(result.data.compliance.overall).toBe('non_compliant');
    });
  });

  describe('optimizeChamberLayout - Otimização de Layout', () => {
    test('deve otimizar layout da câmara', async () => {
      const mockChamber = { _id: 'chamber123', name: 'Câmara A1' };
      
      const mockDistributionData = {
        unbalancedAreas: [
          { area: 'Q1', utilization: 95, recommendation: 'redistribute' },
          { area: 'Q2', utilization: 30, recommendation: 'increase_usage' }
        ],
        hotspots: ['Q1-L1', 'Q1-L2'],
        underutilizedAreas: ['Q2-L3', 'Q2-L4']
      };

      // Mock completo da cadeia de chamadas
      Chamber.findById.mockResolvedValue(mockChamber);
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      locationService.analyzeOccupancy.mockResolvedValue({ success: true, data: {} });
      
      // Mock do analyzeCapacityUtilization (método interno)
      const mockUtilizationData = {
        capacity: { utilizationPercentage: 75 },
        utilization: { trends: {}, efficiency: 75 }
      };
      
      movementService.analyzeMovementPatterns.mockResolvedValue({
        success: true,
        data: { summary: {} }
      });
      
      productService.analyzeProductDistribution.mockResolvedValue({
        success: true,
        data: { summary: mockDistributionData }
      });

      const result = await chamberService.optimizeChamberLayout('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.optimizations).toBeDefined();
      expect(result.data.benefits).toBeDefined();
      expect(result.data.implementation).toBeDefined();
    });
  });

  describe('generateMaintenanceSchedule - Manutenção Preditiva', () => {
    test('deve gerar cronograma de manutenção', async () => {
      const mockChamber = {
        _id: 'chamber123',
        name: 'Câmara A1',
        lastMaintenance: new Date('2024-01-01'),
        operatingHours: 2000,
        createdAt: new Date('2023-01-01')
      };

      const mockMovementData = {
        totalMovements: 500,
        averageMovementsPerDay: 10,
        peakUsagePeriods: ['morning', 'afternoon']
      };

      Chamber.findById.mockResolvedValue(mockChamber);
      
      // Mock da cadeia de analyzeCapacityUtilization
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      locationService.analyzeOccupancy.mockResolvedValue({ success: true, data: {} });
      
      movementService.analyzeMovementPatterns.mockResolvedValue({
        success: true,
        data: mockMovementData
      });

      const result = await chamberService.generateMaintenanceSchedule('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.schedule).toBeDefined();
      expect(result.data.timeline).toBeDefined();
      expect(result.data.costs).toBeDefined();
      expect(result.data.analysis).toBeDefined();
    });
  });

  describe('predictCapacityNeeds - Previsão de Capacidade', () => {
    test('deve prever necessidades futuras de capacidade', async () => {
      const mockChamber = { _id: 'chamber123', name: 'Câmara A1' };
      
      const mockHistoricalData = {
        utilizationTrend: 'increasing',
        growthRate: 0.15, // 15% ao mês
        seasonalPatterns: {
          peak: 'harvest_season',
          low: 'planting_season'
        }
      };

      Chamber.findById.mockResolvedValue(mockChamber);
      
      // Mock da cadeia de analyzeCapacityUtilization
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      locationService.analyzeOccupancy.mockResolvedValue({
        success: true,
        data: { utilizationPercentage: 75 }
      });
      
      movementService.analyzeMovementPatterns.mockResolvedValue({
        success: true,
        data: mockHistoricalData
      });
      
      productService.analyzeProductGrowth.mockResolvedValue({
        success: true,
        data: { demandTrends: {} }
      });

      const result = await chamberService.predictCapacityNeeds('chamber123', {
        months: 6,
        includeSeasonality: true
      });

      expect(result.success).toBe(true);
      expect(result.data.forecast.predictions).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.futureNeeds.expansionNeeds).toBeDefined();
    });
  });

  describe('recommendOptimalProducts - Recomendações Inteligentes', () => {
    test('deve recomendar produtos ideais para câmara', async () => {
      const mockChamber = {
        _id: 'chamber123',
        currentTemperature: 18,
        currentHumidity: 50
      };

      const mockRecommendations = {
        compatibleTypes: [
          { _id: 'seed1', name: 'Milho Premium', compatibilityScore: 95 },
          { _id: 'seed2', name: 'Soja Especial', compatibilityScore: 88 }
        ],
        bestMatch: { _id: 'seed1', name: 'Milho Premium' },
        recommendations: [
          { _id: 'seed1', name: 'Milho Premium', compatibilityScore: 95 },
          { _id: 'seed2', name: 'Soja Especial', compatibilityScore: 88 }
        ]
      };

      Chamber.findById.mockResolvedValue(mockChamber);
      
      // Mock das dependências
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByConditions.mockResolvedValue([]);
      locationService.analyzeOccupancy.mockResolvedValue({ success: true, data: {} });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      
      seedTypeService.recommendSeedTypesForChamber.mockResolvedValue({
        success: true,
        data: mockRecommendations
      });

      const result = await chamberService.recommendOptimalProducts('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.recommendations).toBeDefined();
      expect(result.data.bestMatch.name).toBe('Milho Premium');
      expect(result.data.analysis).toBeDefined();
    });
  });

  describe('Integração com Sistema - Alinhamento aos Objetivos', () => {
    test('deve registrar eventos em todas as operações críticas', async () => {
      // Teste que valida alinhamento com objetivo: "Movimentações automáticas"
      const mockChamber = { _id: 'chamber123' };
      Chamber.create.mockResolvedValue(mockChamber);
      locationService.generateLocationsForChamber.mockResolvedValue({
        success: true,
        data: { locations: [], totalGenerated: 0 }
      });

      await chamberService.createChamberWithLocations({
        name: 'Teste',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
      });

      expect(movementService.registerSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'chamber_created_with_locations',
          chamberId: 'chamber123'
        })
      );
    });

    test('deve validar hierarquia de localizações', async () => {
      // Teste que valida alinhamento com objetivo: "Hierarquia de localizações"
      const chamberData = {
        name: 'Câmara Teste',
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 5
        }
      };

      Chamber.create.mockResolvedValue({ _id: 'chamber123' });
      locationService.generateLocationsForChamber.mockResolvedValue({
        success: true,
        data: { locations: [], totalGenerated: 120 }
      });

      await chamberService.createChamberWithLocations(chamberData);

      expect(locationService.generateLocationsForChamber).toHaveBeenCalledWith(
        'chamber123',
        expect.objectContaining({
          dimensions: {
            quadras: 2,
            lados: 3,
            filas: 4,
            andares: 5
          }
        })
      );
    });

    test('deve integrar com todos os services conforme arquitetura', async () => {
      // Teste que valida integrações: locationService, productService, movementService, seedTypeService
      const mockChamber = { _id: 'chamber123', createdAt: new Date('2023-01-01') };
      
      Chamber.findById.mockResolvedValue(mockChamber);
      locationService.getLocationsByChamber.mockResolvedValue({ data: [] });
      productService.getProductsByChamber.mockResolvedValue({ data: [] });
      movementService.getMovementsByChamber.mockResolvedValue({ data: [] });
      locationService.analyzeOccupancy.mockResolvedValue({ success: true, data: {} });
      
      productService.getProductsByConditions.mockResolvedValue([]);
      movementService.analyzeMovementPatterns.mockResolvedValue({ success: true, data: {} });
      productService.analyzeProductGrowth.mockResolvedValue({ success: true, data: { demandTrends: {} } });
      seedTypeService.recommendSeedTypesForChamber.mockResolvedValue({ 
        success: true, 
        data: { recommendations: [] } 
      });

      await chamberService.analyzeCapacityUtilization('chamber123');
      await chamberService.monitorEnvironmentalConditions('chamber123');
      await chamberService.generateMaintenanceSchedule('chamber123');
      await chamberService.predictCapacityNeeds('chamber123', { months: 6 });
      await chamberService.recommendOptimalProducts('chamber123');

      expect(locationService.analyzeOccupancy).toHaveBeenCalled();
      expect(productService.getProductsByConditions).toHaveBeenCalled();
      expect(movementService.analyzeMovementPatterns).toHaveBeenCalled();
      expect(seedTypeService.recommendSeedTypesForChamber).toHaveBeenCalled();
    });
  });
}); 