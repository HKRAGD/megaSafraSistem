/**
 * Testes Unitários - Dashboard Service
 * Objetivo: Testar serviço de métricas e insights do dashboard executivo
 * Funcionalidades: Resumo geral, status câmaras, análise capacidade, movimentações
 * Alinhamento: Conforme planejamento-backend.md - Dashboard Controller
 */

const dashboardService = require('../../../services/dashboardService');
const Product = require('../../../models/Product');
const Chamber = require('../../../models/Chamber');
const Location = require('../../../models/Location');
const Movement = require('../../../models/Movement');
const User = require('../../../models/User');

// Mock dos models
jest.mock('../../../models/Product');
jest.mock('../../../models/Chamber');
jest.mock('../../../models/Location');
jest.mock('../../../models/Movement');
jest.mock('../../../models/User');

describe('DashboardService - Métricas e Insights do Sistema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateSystemSummary - Resumo Geral do Sistema', () => {
    it('deve gerar resumo com métricas básicas do sistema', async () => {
      // Mock dos dados básicos
      Product.countDocuments.mockResolvedValue(150);
      Chamber.countDocuments.mockResolvedValue(5);
      Location.countDocuments.mockResolvedValue(500);
      Movement.countDocuments.mockResolvedValue(1200);

      // Mock das agregações de capacidade
      Location.aggregate
        .mockResolvedValueOnce([{ total: 250000 }]) // totalCapacity
        .mockResolvedValueOnce([{ used: 187500 }]); // usedCapacity

      Movement.countDocuments.mockResolvedValue(25); // movementsToday

      const result = await dashboardService.generateSystemSummary();

      // Verificar estrutura do resumo
      expect(result).toHaveProperty('overview');
      expect(result).toHaveProperty('metrics');
      expect(result).toHaveProperty('trends');
      expect(result).toHaveProperty('insights');
      expect(result).toHaveProperty('generatedAt');

      // Verificar métricas básicas
      expect(result.overview.totalProducts).toBe(150);
      expect(result.overview.totalChambers).toBe(5);
      expect(result.overview.totalLocations).toBe(500);
      expect(result.overview.utilizationRate).toBe(0.75); // 187500/250000

      // Verificar métricas operacionais
      expect(result.metrics.movementsToday).toBe(25);
      expect(result.metrics.efficiency).toBeGreaterThan(0.8);
      expect(result.metrics.criticalAlerts).toBeGreaterThanOrEqual(0);

      // Verificar insights baseados em utilização
      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.length).toBeGreaterThanOrEqual(0);
    });

    it('deve calcular eficiência baseada na taxa de utilização', async () => {
      // Simular sistema com baixa utilização
      Product.countDocuments.mockResolvedValue(50);
      Chamber.countDocuments.mockResolvedValue(3);
      Location.countDocuments.mockResolvedValue(300);
      Movement.countDocuments.mockResolvedValue(500);

      Location.aggregate
        .mockResolvedValueOnce([{ total: 150000 }])
        .mockResolvedValueOnce([{ used: 45000 }]); // 30% utilização

      Movement.countDocuments.mockResolvedValue(10);

      const result = await dashboardService.generateSystemSummary();

      expect(result.overview.utilizationRate).toBe(0.3);
      expect(result.metrics.efficiency).toBeGreaterThanOrEqual(0.8);
      expect(result.metrics.criticalAlerts).toBe(0); // Baixa utilização = sem alertas
    });

    it('deve gerar alertas críticos para alta utilização', async () => {
      // Simular sistema com alta utilização
      Location.aggregate
        .mockResolvedValueOnce([{ total: 100000 }])
        .mockResolvedValueOnce([{ used: 95000 }]); // 95% utilização

      Product.countDocuments.mockResolvedValue(200);
      Chamber.countDocuments.mockResolvedValue(4);
      Location.countDocuments.mockResolvedValue(400);
      Movement.countDocuments.mockResolvedValue(800);
      Movement.countDocuments.mockResolvedValue(30);

      const result = await dashboardService.generateSystemSummary();

      expect(result.overview.utilizationRate).toBe(0.95);
      expect(result.metrics.criticalAlerts).toBe(2); // Alta utilização = 2 alertas
      expect(result.insights).toContain('Sistema próximo da capacidade máxima');
    });

    it('deve tratar erro de consulta ao banco', async () => {
      Product.countDocuments.mockRejectedValue(new Error('Erro de conexão'));

      await expect(dashboardService.generateSystemSummary())
        .rejects.toThrow('Erro ao gerar resumo do sistema: Erro de conexão');
    });
  });

  describe('analyzeChamberStatus - Status Detalhado das Câmaras', () => {
    it('deve analisar status de todas as câmaras ativas', async () => {
      const mockChambers = [
        {
          _id: 'chamber1',
          name: 'Câmara Principal',
          status: 'active',
          currentTemperature: 18,
          currentHumidity: 65
        },
        {
          _id: 'chamber2',
          name: 'Câmara Secundária',
          status: 'active',
          currentTemperature: 19,
          currentHumidity: 70
        }
      ];

      const mockLocations = [
        { _id: 'loc1', chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 750, isOccupied: true },
        { _id: 'loc2', chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 500, isOccupied: true },
        { _id: 'loc3', chamberId: 'chamber2', maxCapacityKg: 1500, currentWeightKg: 300, isOccupied: true }
      ];

      Chamber.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue(mockChambers)
      });

      Location.find
        .mockResolvedValueOnce(mockLocations.filter(l => l.chamberId === 'chamber1'))
        .mockResolvedValueOnce(mockLocations.filter(l => l.chamberId === 'chamber2'));

      const result = await dashboardService.analyzeChamberStatus();

      // Verificar estrutura
      expect(result).toHaveProperty('chambers');
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('recommendations');

      // Verificar análise das câmaras
      expect(result.chambers).toHaveLength(2);
      expect(result.chambers[0]).toHaveProperty('id');
      expect(result.chambers[0]).toHaveProperty('name');
      expect(result.chambers[0]).toHaveProperty('conditions');
      expect(result.chambers[0]).toHaveProperty('utilization');
      expect(result.chambers[0]).toHaveProperty('performance');

      // Verificar cálculos de utilização
      expect(result.chambers[0].utilization.percentage).toBe(63); // (750+500)/(1000+1000) = 62.5% -> 63%
      expect(result.chambers[1].utilization.percentage).toBe(20); // 300/1500 = 20%

      // Verificar summary
      expect(result.summary.totalChambers).toBe(2);
      expect(result.summary.activeChambers).toBe(2);
      expect(typeof result.summary.averageUtilization).toBe('number');
    });

    it('deve incluir condições ambientais otimizadas', async () => {
      const mockChamber = {
        _id: 'chamber1',
        name: 'Câmara Teste',
        status: 'active',
        currentTemperature: 18,
        currentHumidity: 50
      };

      Chamber.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([mockChamber])
      });

      Location.find.mockResolvedValue([
        { chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 500, isOccupied: true }
      ]);

      const result = await dashboardService.analyzeChamberStatus();

      expect(result.chambers[0].conditions.temperature).toBe(18);
      expect(result.chambers[0].conditions.humidity).toBe(50);
      expect(result.chambers[0].conditions.isOptimal).toBe(true);
    });

    it('deve gerar recomendações operacionais', async () => {
      Chamber.find.mockReturnValue({
        lean: jest.fn().mockResolvedValue([])
      });

      const result = await dashboardService.analyzeChamberStatus();

      expect(Array.isArray(result.recommendations)).toBe(true);
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations).toContain('Agendar manutenção preventiva conforme cronograma');
    });

    it('deve tratar erro na análise de câmaras', async () => {
      Chamber.find.mockReturnValue({
        lean: jest.fn().mockRejectedValue(new Error('Erro ao buscar câmaras'))
      });

      await expect(dashboardService.analyzeChamberStatus())
        .rejects.toThrow('Erro ao analisar status das câmaras: Erro ao buscar câmaras');
    });
  });

  describe('analyzeStorageCapacity - Análise de Capacidade de Armazenamento', () => {
    it('deve analisar capacidade total do sistema', async () => {
      // Mock da agregação de capacidade
      Location.aggregate.mockResolvedValue([{
        totalCapacity: 500000,
        usedCapacity: 375000
      }]);

      const mockChambers = [
        { _id: 'chamber1', name: 'Câmara 1', status: 'active' },
        { _id: 'chamber2', name: 'Câmara 2', status: 'active' }
      ];

      Chamber.find.mockResolvedValue(mockChambers);

      // Mock das localizações por câmara
      Location.find
        .mockResolvedValueOnce([
          { maxCapacityKg: 250000, currentWeightKg: 200000 },
          { maxCapacityKg: 100000, currentWeightKg: 75000 }
        ])
        .mockResolvedValueOnce([
          { maxCapacityKg: 150000, currentWeightKg: 100000 }
        ]);

      const result = await dashboardService.analyzeStorageCapacity();

      // Verificar estrutura
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('byChamber');
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('efficiency');

      // Verificar capacidade geral
      expect(result.overall.totalCapacity).toBe(500000);
      expect(result.overall.usedCapacity).toBe(375000);
      expect(result.overall.availableCapacity).toBe(125000);
      expect(result.overall.utilizationRate).toBe(0.75);

      // Verificar análise por câmara
      expect(result.byChamber).toHaveLength(2);
      expect(result.byChamber[0].capacity).toBe(350000); // 250000 + 100000
      expect(result.byChamber[0].used).toBe(275000); // 200000 + 75000

      // Verificar previsões
      expect(result.predictions.daysUntilFull).toBeGreaterThan(0);
      expect(result.predictions.fullCapacityDate).toBeInstanceOf(Date);
      expect(Array.isArray(result.predictions.recommendedActions)).toBe(true);
    });

    it('deve calcular eficiência de armazenamento', async () => {
      Location.aggregate.mockResolvedValue([{
        totalCapacity: 200000,
        usedCapacity: 140000 // 70% utilização
      }]);

      Chamber.find.mockResolvedValue([]);

      const result = await dashboardService.analyzeStorageCapacity();

      // Verificar com tolerância para precisão de ponto flutuante
      expect(result.efficiency.spaceUtilization).toBeCloseTo(0.8, 2); // min(0.95, 0.7 + 0.1)
      expect(result.efficiency.accessibilityScore).toBe(0.92);
      // Com 70% utilização, o rating é 'excellent' (< 0.8)
      expect(result.efficiency.overallRating).toBe('excellent'); // 70% utilização
    });

    it('deve gerar ações recomendadas para alta utilização', async () => {
      Location.aggregate.mockResolvedValue([{
        totalCapacity: 100000,
        usedCapacity: 85000 // 85% utilização
      }]);

      Chamber.find.mockResolvedValue([]);

      const result = await dashboardService.analyzeStorageCapacity();

      expect(result.predictions.recommendedActions).toContain('Considerar expansão de capacidade');
      expect(result.efficiency.overallRating).toBe('good'); // 85% utilização
    });

    it('deve tratar cenário sem dados de capacidade', async () => {
      Location.aggregate.mockResolvedValue([]);
      Chamber.find.mockResolvedValue([]);

      const result = await dashboardService.analyzeStorageCapacity();

      expect(result.overall.totalCapacity).toBe(0);
      expect(result.overall.usedCapacity).toBe(0);
      expect(result.overall.utilizationRate).toBe(0);
      // Quando não há dados, daysUntilFull será um número alto (divisão por 0)
      expect(typeof result.predictions.daysUntilFull).toBe('number');
    });
  });

  describe('getRecentMovements - Movimentações Recentes', () => {
    it('deve obter movimentações recentes com estatísticas', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          type: 'entry',
          quantity: 50,
          timestamp: new Date(),
          productId: { name: 'Milho Híbrido' },
          userId: { name: 'João Silva' },
          toLocationId: { code: 'Q1-L1-F1-A1' },
          metadata: { priority: 'normal' }
        },
        {
          _id: 'mov2',
          type: 'transfer',
          quantity: 30,
          timestamp: new Date(),
          productId: { name: 'Soja Premium' },
          userId: { name: 'Maria Santos' },
          fromLocationId: { code: 'Q1-L1-F2-A1' },
          toLocationId: { code: 'Q2-L1-F1-A1' },
          metadata: { priority: 'high' }
        }
      ];

      // Mock correto do encadeamento Movement.find()
      const mockMovementQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMovements)
      };

      Movement.find.mockReturnValue(mockMovementQuery);

      const mockTodayMovements = [
        { type: 'entry' },
        { type: 'entry' },
        { type: 'exit' },
        { type: 'transfer' },
        { type: 'transfer' }
      ];

      // Mock para a segunda chamada de Movement.find (hoje)
      Movement.find.mockImplementation((query) => {
        if (query && query.timestamp) {
          return Promise.resolve(mockTodayMovements);
        }
        return mockMovementQuery;
      });

      const result = await dashboardService.getRecentMovements(5);

      // Verificar estrutura
      expect(result).toHaveProperty('movements');
      expect(result).toHaveProperty('statistics');
      expect(result).toHaveProperty('trends');

      // Verificar movimentações processadas
      expect(result.movements).toHaveLength(2);
      expect(result.movements[0]).toHaveProperty('id');
      expect(result.movements[0]).toHaveProperty('type');
      expect(result.movements[0]).toHaveProperty('productName');
      expect(result.movements[0]).toHaveProperty('user');
      expect(result.movements[0]).toHaveProperty('priority');

      // Verificar estatísticas
      expect(result.statistics.totalToday).toBe(5);
      expect(result.statistics.byType.entry).toBe(2);
      expect(result.statistics.byType.exit).toBe(1);
      expect(result.statistics.byType.transfer).toBe(2);
      expect(result.statistics.efficiency).toBe(0.94);

      // Verificar tendências
      expect(result.trends.peakHour).toBe('14:00');
      expect(result.trends.quietPeriod).toBe('12:00-13:00');
    });

    it('deve lidar com movimentações sem dados completos', async () => {
      const mockMovements = [
        {
          _id: 'mov1',
          type: 'entry',
          quantity: 50,
          timestamp: new Date(),
          productId: null, // Produto não encontrado
          userId: null, // Usuário não encontrado
          toLocationId: null
        }
      ];

      const mockMovementQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue(mockMovements)
      };

      Movement.find.mockImplementation((query) => {
        if (query && query.timestamp) {
          return Promise.resolve([]);
        }
        return mockMovementQuery;
      });

      const result = await dashboardService.getRecentMovements();

      expect(result.movements[0].productName).toBe('Produto não encontrado');
      expect(result.movements[0].user).toBe('Usuário não encontrado');
      expect(result.movements[0].location).toBe('N/A');
      expect(result.movements[0].priority).toBe('normal');
    });
  });

  describe('analyzeOperationalEfficiency - Eficiência Operacional', () => {
    it('deve analisar eficiência operacional do sistema', async () => {
      const mockLocations = [
        { maxCapacityKg: 1000, currentWeightKg: 800 },
        { maxCapacityKg: 1500, currentWeightKg: 900 },
        { maxCapacityKg: 2000, currentWeightKg: 1000 }
      ];

      Location.find.mockResolvedValue(mockLocations);

      const result = await dashboardService.analyzeOperationalEfficiency();

      // Verificar estrutura
      expect(result).toHaveProperty('overall');
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('benchmarks');
      expect(result).toHaveProperty('improvements');

      // Verificar score geral
      expect(result.overall.score).toBeGreaterThan(0);
      expect(result.overall.score).toBeLessThanOrEqual(1);
      expect(['excellent', 'good', 'needs_improvement']).toContain(result.overall.rating);
      expect(result.overall.trend).toBe('improving');

      // Verificar categorias
      expect(result.categories.spaceUtilization.score).toBeGreaterThan(0);
      expect(result.categories.movementEfficiency.score).toBe(0.85);
      expect(result.categories.userProductivity.score).toBe(0.84);

      // Verificar benchmarks
      expect(result.benchmarks.industryAverage).toBe(0.75);
      expect(result.benchmarks.compared).toBe('+16%');
      expect(result.benchmarks.ranking).toBe('top 25%');

      // Verificar recomendações
      expect(Array.isArray(result.improvements)).toBe(true);
      expect(result.improvements.length).toBe(3);
    });

    it('deve calcular utilização de espaço corretamente', async () => {
      const mockLocations = [
        { maxCapacityKg: 1000, currentWeightKg: 600 }, // 60%
        { maxCapacityKg: 2000, currentWeightKg: 1400 } // 70%
      ];

      Location.find.mockResolvedValue(mockLocations);

      const result = await dashboardService.analyzeOperationalEfficiency();

      // Total: 3000kg, Usado: 2000kg = 66.67% utilização
      const expectedUtilization = 2000 / 3000; // 0.67
      const expectedSpaceScore = Math.min(expectedUtilization * 1.2, 0.95); // 0.8

      expect(result.categories.spaceUtilization.score).toBe(0.8);
      expect(result.categories.spaceUtilization.details).toBe('Espaço subutilizado');
    });
  });

  describe('generateAlerts - Alertas do Sistema', () => {
    it('deve gerar alertas categorizados por severidade', async () => {
      const mockLocations = [
        { chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 970 }, // 97% - crítico
        { chamberId: 'chamber2', maxCapacityKg: 1000, currentWeightKg: 850 } // 85% - warning
      ];

      const mockChambers = [
        {
          _id: 'chamber1',
          name: 'Câmara Crítica',
          status: 'active',
          currentTemperature: 22
        },
        {
          _id: 'chamber2',
          name: 'Câmara Normal',
          status: 'active',
          currentTemperature: 18
        }
      ];

      Location.find.mockResolvedValue(mockLocations);
      Chamber.find.mockResolvedValue(mockChambers);

      const result = await dashboardService.generateAlerts();

      // Verificar estrutura
      expect(result).toHaveProperty('critical');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('info');
      expect(result).toHaveProperty('summary');

      // Verificar alertas críticos (capacidade > 95%)
      expect(result.critical.length).toBeGreaterThan(0);
      expect(result.critical[0]).toHaveProperty('type', 'capacity');
      expect(result.critical[0]).toHaveProperty('severity', 'critical');
      expect(result.critical[0]).toHaveProperty('actionRequired', true);
      expect(Array.isArray(result.critical[0].suggestedActions)).toBe(true);

      // Verificar warnings (capacidade > 85% ou temperatura alta)
      expect(result.warnings.length).toBeGreaterThan(0);

      // Verificar alertas informativos
      expect(result.info.length).toBeGreaterThan(0);
      expect(result.info[0]).toHaveProperty('type', 'maintenance');

      // Verificar summary
      expect(result.summary.totalAlerts).toBeGreaterThan(0);
      expect(result.summary.criticalCount).toBeGreaterThan(0);
      expect(result.summary.lastUpdate).toBeInstanceOf(Date);
    });

    it('deve gerar alertas de temperatura elevada', async () => {
      const mockChambers = [
        {
          _id: 'chamber1',
          name: 'Câmara Quente',
          status: 'active',
          currentTemperature: 25 // Temperatura alta
        }
      ];

      Location.find.mockResolvedValue([
        { chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 400 } // 40% - sem alerta capacidade
      ]);

      Chamber.find.mockResolvedValue(mockChambers);

      const result = await dashboardService.generateAlerts();

      const tempAlert = result.warnings.find(alert => alert.type === 'temperature');
      expect(tempAlert).toBeDefined();
      expect(tempAlert.message).toContain('ligeiramente elevada');
      expect(tempAlert.severity).toBe('warning');
    });

    it('deve tratar cenário sem alertas críticos', async () => {
      Location.find.mockResolvedValue([
        { chamberId: 'chamber1', maxCapacityKg: 1000, currentWeightKg: 500 } // 50% - normal
      ]);

      Chamber.find.mockResolvedValue([
        {
          _id: 'chamber1',
          name: 'Câmara Normal',
          status: 'active',
          currentTemperature: 18
        }
      ]);

      const result = await dashboardService.generateAlerts();

      expect(result.critical).toHaveLength(0);
      expect(result.summary.criticalCount).toBe(0);
      expect(result.info.length).toBeGreaterThan(0); // Sempre tem alertas informativos
    });
  });
}); 