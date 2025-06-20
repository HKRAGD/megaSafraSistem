/**
 * Testes Unitários - seedTypeService
 * Sistema Dinâmico de Tipos de Sementes
 * 
 * Objetivos dos Testes:
 * - Validar sistema dinâmico sem hard-coding
 * - Testar análise de condições ideais
 * - Verificar recomendações inteligentes
 * - Validar integrações com outros services
 */

const seedTypeService = require('../../../services/seedTypeService');

// Mock das dependências
jest.mock('../../../models/SeedType', () => ({
  create: jest.fn(),
  find: jest.fn(),
  findById: jest.fn(),
  findOne: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../../../services/productService', () => ({
  getProductsByConditions: jest.fn(),
  analyzeProductPerformance: jest.fn()
}));

jest.mock('../../../services/locationService', () => ({
  getLocationsByConditions: jest.fn(),
  analyzeChamberConditions: jest.fn()
}));

jest.mock('../../../services/movementService', () => ({
  registerSystemEvent: jest.fn().mockResolvedValue({ success: true }),
  getMovementHistory: jest.fn()
}));

const SeedType = require('../../../models/SeedType');
const productService = require('../../../services/productService');
const locationService = require('../../../services/locationService');
const movementService = require('../../../services/movementService');

describe('SeedTypeService - Sistema Dinâmico de Tipos', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createSeedType - Sistema Dinâmico', () => {
    test('deve criar novo tipo de semente dinamicamente', async () => {
      const mockSeedType = {
        _id: 'seed123',
        name: 'Milho Transgênico Z1000',
        category: 'cereal',
        varietyCode: 'MT-Z1000',
        characteristics: {
          expectedYield: '8-12 ton/ha',
          resistances: ['drought', 'pest'],
          maturityDays: 120
        },
        storageRequirements: {
          temperature: { min: 10, max: 25 },
          humidity: { min: 40, max: 60 },
          ventilation: 'moderate'
        }
      };

      SeedType.create.mockResolvedValue(mockSeedType);

      const seedTypeData = {
        name: 'Milho Transgênico Z1000',
        category: 'cereal',
        varietyCode: 'MT-Z1000',
        characteristics: {
          expectedYield: '8-12 ton/ha',
          resistances: ['drought', 'pest'],
          maturityDays: 120
        },
        storageRequirements: {
          temperature: { min: 10, max: 25 },
          humidity: { min: 40, max: 60 },
          ventilation: 'moderate'
        }
      };

      const result = await seedTypeService.createSeedType(seedTypeData);

      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Milho Transgênico Z1000');
      expect(result.data.varietyCode).toBe('MT-Z1000');
      
      // Validar que registrou evento no sistema
      expect(movementService.registerSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'seed_type_created',
          seedTypeId: 'seed123'
        })
      );

      expect(SeedType.create).toHaveBeenCalledWith(seedTypeData);
    });

    test('deve validar dados obrigatórios', async () => {
      await expect(
        seedTypeService.createSeedType({})
      ).rejects.toThrow('Nome do tipo de semente é obrigatório');

      await expect(
        seedTypeService.createSeedType({ name: 'Teste' })
      ).rejects.toThrow('Categoria é obrigatória');
    });

    test('deve detectar tipo duplicado', async () => {
      SeedType.create.mockRejectedValue({ code: 11000 }); // Erro de duplicação

      await expect(
        seedTypeService.createSeedType({
          name: 'Milho Existente',
          category: 'cereal',
          varietyCode: 'ME-001'
        })
      ).rejects.toThrow('Tipo de semente já existe');
    });
  });

  describe('analyzeOptimalConditions - Análise Inteligente', () => {
    test('deve analisar condições ideais baseado em dados reais', async () => {
      // Mock da busca do seedType
      SeedType.findById.mockResolvedValue({
        _id: 'seed123',
        name: 'Milho Premium'
      });

      const mockProducts = [
        { 
          seedType: 'seed123', 
          storageConditions: { temperature: 18, humidity: 50 },
          qualityMetrics: { germination: 95, viability: 98 }
        },
        { 
          seedType: 'seed123', 
          storageConditions: { temperature: 20, humidity: 45 },
          qualityMetrics: { germination: 92, viability: 95 }
        }
      ];

      productService.getProductsByConditions.mockResolvedValue(mockProducts);

      const result = await seedTypeService.analyzeOptimalConditions('seed123');

      expect(result.success).toBe(true);
      expect(result.data.optimalTemperature).toBeDefined();
      expect(result.data.optimalHumidity).toBeDefined();
      expect(result.data.averageGermination).toBeDefined();
      expect(result.data.recommendations).toHaveLength(2);
      expect(result.data.dataPoints).toBe(2);
    });

    test('deve retornar recomendações padrão sem dados', async () => {
      // Mock da busca do seedType
      SeedType.findById.mockResolvedValue({
        _id: 'seed123',
        name: 'Milho Premium'
      });

      productService.getProductsByConditions.mockResolvedValue([]);

      const result = await seedTypeService.analyzeOptimalConditions('seed123');

      expect(result.success).toBe(true);
      expect(result.data.optimalTemperature).toBe('15-25°C');
      expect(result.data.recommendations).toContain('Configurar monitoramento inicial');
    });
  });

  describe('recommendSeedTypesForChamber - Recomendações Inteligentes', () => {
    test('deve recomendar tipos compatíveis com câmara', async () => {
      const mockChamberConditions = {
        temperature: { current: 18, range: [15, 25] },
        humidity: { current: 55, range: [40, 70] },
        capacity: 1000
      };

      locationService.analyzeChamberConditions.mockResolvedValue(mockChamberConditions);

      const mockSeedTypes = [
        {
          _id: 'seed1',
          name: 'Milho Premium',
          storageRequirements: {
            temperature: { min: 15, max: 25 },
            humidity: { min: 40, max: 60 }
          }
        },
        {
          _id: 'seed2',
          name: 'Soja Especial',
          storageRequirements: {
            temperature: { min: 20, max: 30 },
            humidity: { min: 50, max: 80 }
          }
        }
      ];

      SeedType.find.mockResolvedValue(mockSeedTypes);

      const result = await seedTypeService.recommendSeedTypesForChamber('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.chamberConditions).toEqual(mockChamberConditions);
      expect(result.data.compatibleTypes).toHaveLength(2);
      expect(result.data.bestMatch).toBeDefined();
      expect(result.data.recommendations).toHaveLength(2);
    });

    test('deve detectar incompatibilidades', async () => {
      const mockChamberConditions = {
        temperature: { current: 35, range: [30, 40] },
        humidity: { current: 80, range: [70, 90] }
      };

      locationService.analyzeChamberConditions.mockResolvedValue(mockChamberConditions);

      const mockSeedTypes = [
        {
          _id: 'seed1',
          name: 'Sementes Delicadas',
          storageRequirements: {
            temperature: { min: 10, max: 20 },
            humidity: { min: 30, max: 50 }
          }
        }
      ];

      SeedType.find.mockResolvedValue(mockSeedTypes);

      const result = await seedTypeService.recommendSeedTypesForChamber('chamber123');

      expect(result.success).toBe(true);
      expect(result.data.compatibleTypes).toHaveLength(0);
      expect(result.data.incompatibleReasons).toHaveLength(1);
      expect(result.data.recommendations).toContain('Ajustar condições da câmara');
    });
  });

  describe('compareSeedTypePerformance - Análise de Performance', () => {
    test('deve comparar performance entre tipos', async () => {
      const mockPerformanceData = {
        'seed1': {
          averageGermination: 95,
          storageTime: 12,
          lossRate: 2,
          qualityScore: 9.5
        },
        'seed2': {
          averageGermination: 88,
          storageTime: 10,
          lossRate: 5,
          qualityScore: 8.2
        }
      };

      productService.analyzeProductPerformance.mockResolvedValue(mockPerformanceData);

      const result = await seedTypeService.compareSeedTypePerformance(['seed1', 'seed2'], {
        timeframe: '12m'
      });

      expect(result.success).toBe(true);
      expect(result.data.comparison).toHaveProperty('seed1');
      expect(result.data.comparison).toHaveProperty('seed2');
      expect(result.data.bestPerformer).toBe('seed1');
      expect(result.data.metrics).toHaveLength(4);
      expect(result.data.insights).toHaveLength(2);
    });

    test('deve identificar tendências', async () => {
      const mockMovements = [
        { seedType: 'seed1', month: '2024-01', lossRate: 1 },
        { seedType: 'seed1', month: '2024-02', lossRate: 2 },
        { seedType: 'seed1', month: '2024-03', lossRate: 3 }
      ];

      movementService.getMovementHistory.mockResolvedValue(mockMovements);

      const result = await seedTypeService.compareSeedTypePerformance(['seed1'], {
        includeTrends: true
      });

      expect(result.data.trends).toBeDefined();
      expect(result.data.trends['seed1'].direction).toBe('deteriorating');
    });
  });

  describe('predictStorageNeeds - Previsão Inteligente', () => {
    test('deve prever necessidades de armazenamento', async () => {
      const mockHistoricalData = [
        { month: '2024-01', seedType: 'seed1', quantity: 1000 },
        { month: '2024-02', seedType: 'seed1', quantity: 1200 },
        { month: '2024-03', seedType: 'seed1', quantity: 1100 }
      ];

      movementService.getMovementHistory.mockResolvedValue(mockHistoricalData);

      const result = await seedTypeService.predictStorageNeeds('seed1', {
        months: 6,
        seasonality: true
      });

      expect(result.success).toBe(true);
      expect(result.data.currentTrend).toBeDefined();
      expect(result.data.projections).toHaveLength(6);
      expect(result.data.seasonalFactors).toBeDefined();
      expect(result.data.recommendations).toHaveLength(3);
    });

    test('deve detectar padrões sazonais', async () => {
      const mockSeasonalData = [
        { month: '2023-01', quantity: 800 },
        { month: '2023-02', quantity: 900 },
        { month: '2023-03', quantity: 1500 }, // Plantio
        { month: '2023-04', quantity: 1200 },
        { month: '2023-09', quantity: 1800 }, // Colheita
        { month: '2023-10', quantity: 1000 }
      ];

      movementService.getMovementHistory.mockResolvedValue(mockSeasonalData);

      const result = await seedTypeService.predictStorageNeeds('seed1', {
        months: 12,
        seasonality: true
      });

      expect(result.data.seasonalPeaks).toHaveLength(2);
      expect(result.data.seasonalFactors.plantingSeason).toBeDefined();
      expect(result.data.seasonalFactors.harvestSeason).toBeDefined();
    });
  });

  describe('detectConditionViolations - Monitoramento de Qualidade', () => {
    test('deve detectar violações de condições', async () => {
      const mockProducts = [
        {
          _id: 'prod1',
          seedType: 'seed1',
          currentConditions: { temperature: 30, humidity: 70 },
          storageRequirements: {
            temperature: { min: 15, max: 25 },
            humidity: { min: 40, max: 60 }
          },
          location: 'chamber1'
        },
        {
          _id: 'prod2',
          seedType: 'seed1',
          currentConditions: { temperature: 20, humidity: 50 },
          storageRequirements: {
            temperature: { min: 15, max: 25 },
            humidity: { min: 40, max: 60 }
          },
          location: 'chamber2'
        }
      ];

      productService.getProductsByConditions.mockResolvedValue(mockProducts);

      const result = await seedTypeService.detectConditionViolations('seed1');

      expect(result.success).toBe(true);
      expect(result.data.violations).toHaveLength(1);
      expect(result.data.violations[0].productId).toBe('prod1');
      expect(result.data.violations[0].violationType).toContain('temperature');
      expect(result.data.violations[0].violationType).toContain('humidity');
      expect(result.data.totalChecked).toBe(2);
      expect(result.data.actionRequired).toBe(true);
    });

    test('deve calcular severidade das violações', async () => {
      // Mock da busca do seedType
      SeedType.findById.mockResolvedValue({
        _id: 'seed1',
        name: 'Seed Test'
      });

      const mockProducts = [
        {
          _id: 'prod1',
          currentConditions: { temperature: 35 }, // Muito alto
          storageRequirements: { temperature: { min: 15, max: 25 } }
        }
      ];

      productService.getProductsByConditions.mockResolvedValue(mockProducts);

      const result = await seedTypeService.detectConditionViolations('seed1');

      expect(result.data.violations[0].severity).toBe('high');
      expect(result.data.violations[0].deviation.temperature).toBe(10);
    });
  });

  describe('suggestStorageOptimizations - Otimizações Inteligentes', () => {
    test('deve sugerir otimizações baseadas em análise', async () => {
      const mockAnalysisData = {
        performanceIssues: ['high_loss_rate', 'suboptimal_conditions'],
        underPerformingLocations: ['chamber1', 'chamber3'],
        optimalConditions: { temperature: 18, humidity: 45 }
      };

      // Mock das dependências internas
      const detectSpy = jest.spyOn(seedTypeService, 'detectConditionViolations')
        .mockResolvedValue({
          data: { violations: [{ location: 'chamber1' }] }
        });

      const analyzeSpy = jest.spyOn(seedTypeService, 'analyzeOptimalConditions')
        .mockResolvedValue({
          data: { optimalTemperature: 18, optimalHumidity: 45 }
        });

      const result = await seedTypeService.suggestStorageOptimizations('seed1');

      expect(result.success).toBe(true);
      expect(result.data.currentIssues).toBeDefined();
      expect(result.data.optimizationSuggestions).toHaveLength(3);
      expect(result.data.priorityActions).toHaveLength(2);
      expect(result.data.expectedImpact).toBeDefined();

      // Restaurar spies
      detectSpy.mockRestore();
      analyzeSpy.mockRestore();
    });
  });

  describe('Integração com Sistema - Alinhamento aos Objetivos', () => {
    test('deve registrar eventos em todas as operações críticas', async () => {
      // Teste que valida alinhamento com objetivo: "Movimentações automáticas"
      const mockSeedType = { _id: 'seed123' };
      SeedType.create.mockResolvedValue(mockSeedType);

      await seedTypeService.createSeedType({
        name: 'Teste',
        category: 'test',
        varietyCode: 'T001'
      });

      expect(movementService.registerSystemEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'seed_type_created',
          seedTypeId: 'seed123'
        })
      );
    });

    test('deve funcionar dinamicamente sem hard-coding', async () => {
      // Teste que valida alinhamento com objetivo: "Tipos dinâmicos"
      const customSeedType = {
        name: 'Nova Variedade Experimental X999',
        category: 'experimental',
        varietyCode: 'EXP-X999',
        characteristics: {
          customField1: 'valor1',
          customField2: 'valor2',
          newProperty: 'novo valor'
        }
      };

      SeedType.create.mockResolvedValue({ _id: 'new123', ...customSeedType });

      const result = await seedTypeService.createSeedType(customSeedType);

      expect(result.success).toBe(true);
      expect(result.data.characteristics.customField1).toBe('valor1');
      expect(result.data.characteristics.newProperty).toBe('novo valor');
    });

    test('deve fornecer análise baseada em uso real', async () => {
      // Teste que valida alinhamento com objetivo: "Análise baseada em uso real"
      
      // Limpar mocks anteriores
      jest.clearAllMocks();
      
      // Mock da busca do seedType
      SeedType.findById.mockResolvedValue({
        _id: 'seed123',
        name: 'Seed Test'
      });

      const mockRealUsageData = [
        { 
          qualityMetrics: { germination: 95 }, 
          storageConditions: { temperature: 18, humidity: 50 } 
        },
        { 
          qualityMetrics: { germination: 92 }, 
          storageConditions: { temperature: 22, humidity: 45 } 
        }
      ];

      productService.getProductsByConditions.mockResolvedValue(mockRealUsageData);

      try {
        const analysis = await seedTypeService.analyzeOptimalConditions('seed123');
        
        expect(analysis.success).toBe(true);
        expect(analysis.data.dataPoints).toBe(2);
        expect(analysis.data.averageGermination).toBeDefined();
        expect(analysis.data.optimalTemperature).toBeDefined();
      } catch (error) {
        console.log('Erro no teste:', error.message);
        throw error;
      }
    });

    test('deve integrar com outros services conforme arquitetura', async () => {
      // Teste que valida integrações: productService, locationService, movementService
      await seedTypeService.recommendSeedTypesForChamber('chamber123');

      expect(locationService.analyzeChamberConditions).toHaveBeenCalledWith('chamber123');
      expect(SeedType.find).toHaveBeenCalled();
    });
  });
}); 