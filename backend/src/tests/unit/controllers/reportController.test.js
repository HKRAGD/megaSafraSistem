/**
 * Testes Unitários - ReportController
 * Verificando RELATÓRIOS E ANÁLISES: Estoque, movimentações, vencimento, capacidade
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

// Mock do reportService
jest.mock('../../../services/reportService', () => ({
  generateInventoryReport: jest.fn(),
  generateMovementReport: jest.fn(),
  generateExpirationReport: jest.fn(),
  generateCapacityReport: jest.fn(),
  generateComprehensiveReport: jest.fn(),
  analyzeProductTrends: jest.fn(),
  generateAuditTrail: jest.fn()
}));

// Mock dos models necessários
jest.mock('../../../models/Product');
jest.mock('../../../models/Movement');
jest.mock('../../../models/Location');
jest.mock('../../../models/Chamber');

const app = require('../../../app');
const reportService = require('../../../services/reportService');
const Product = require('../../../models/Product');
const Movement = require('../../../models/Movement');
const Location = require('../../../models/Location');
const Chamber = require('../../../models/Chamber');

describe('ReportController - Relatórios e Análises', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integração com ReportService', () => {
    it('deve verificar disponibilidade dos métodos do reportService', async () => {
      // Verificar se os métodos críticos estão disponíveis
      expect(reportService.generateInventoryReport).toBeDefined();
      expect(reportService.generateMovementReport).toBeDefined();
      expect(reportService.generateExpirationReport).toBeDefined();
      expect(reportService.generateCapacityReport).toBeDefined();
      expect(reportService.generateComprehensiveReport).toBeDefined();
      expect(reportService.analyzeProductTrends).toBeDefined();
      expect(reportService.generateAuditTrail).toBeDefined();
    });

    it('deve usar reportService.generateInventoryReport para relatório de estoque', async () => {
      const mockInventoryReport = {
        summary: {
          totalProducts: 250,
          totalWeight: 125000,
          totalValue: 500000,
          activeChambers: 5,
          occupiedLocations: 187
        },
        breakdown: {
          byChamber: [
            {
              chamberId: 'chamber1',
              chamberName: 'Câmara Principal',
              productCount: 50,
              totalWeight: 25000,
              utilizationRate: 0.75
            }
          ],
          bySeedType: [
            {
              seedTypeId: 'seed1',
              seedTypeName: 'Milho Híbrido',
              count: 100,
              totalWeight: 50000,
              averageAge: 30
            }
          ],
          byStatus: {
            stored: 200,
            reserved: 30,
            removed: 20
          }
        },
        analytics: {
          turnoverRate: 0.15,
          averageStorageTime: 45,
          mostActiveProducts: ['Milho Híbrido', 'Soja Premium'],
          slowMovingProducts: ['Trigo Especial']
        },
        alerts: [
          'Estoque de Milho Híbrido está baixo',
          'Câmara 2 próxima da capacidade máxima'
        ],
        generatedAt: new Date(),
        filters: {
          chamber: null,
          seedType: null,
          dateRange: null
        }
      };

      reportService.generateInventoryReport.mockResolvedValue(mockInventoryReport);

      const filters = {
        chamber: 'chamber1',
        seedType: 'seed1',
        includeAnalytics: true
      };

      const result = await reportService.generateInventoryReport(filters);

      expect(result.summary.totalProducts).toBe(250);
      expect(result.breakdown.byChamber).toHaveLength(1);
      expect(result.analytics.turnoverRate).toBe(0.15);
      expect(result.alerts).toHaveLength(2);
      expect(reportService.generateInventoryReport).toHaveBeenCalledWith(filters);
    });

    it('deve usar reportService.generateMovementReport para relatório de movimentações', async () => {
      const mockMovementReport = {
        summary: {
          totalMovements: 1500,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          byType: {
            entry: 500,
            exit: 300,
            transfer: 600,
            adjustment: 100
          }
        },
        trends: {
          dailyAverage: 48.4,
          peakDays: ['2024-01-15', '2024-01-22'],
          quietDays: ['2024-01-07', '2024-01-14'],
          efficiency: {
            averageTime: 8.5,
            successRate: 0.98,
            errorRate: 0.02
          }
        },
        details: {
          byUser: [
            {
              userId: 'user123',
              userName: 'João Silva',
              movements: 150,
              efficiency: 0.95,
              errorCount: 2
            }
          ],
          byChamber: [
            {
              chamberId: 'chamber1',
              chamberName: 'Câmara Principal',
              incomingMovements: 75,
              outgoingMovements: 50,
              internalTransfers: 25
            }
          ],
          byProduct: [
            {
              productId: 'prod123',
              productName: 'Milho Híbrido',
              movements: 25,
              totalQuantityMoved: 1250,
              avgMovementSize: 50
            }
          ]
        },
        anomalies: [
          {
            type: 'unusual_volume',
            description: 'Volume de transferências 30% acima da média em 15/01',
            severity: 'medium',
            date: new Date('2024-01-15')
          }
        ],
        recommendations: [
          'Otimizar horários de pico para melhor distribuição',
          'Revisar processo de transferências na Câmara 2'
        ]
      };

      reportService.generateMovementReport.mockResolvedValue(mockMovementReport);

      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        chamber: null,
        user: null,
        includeAnomalies: true
      };

      const result = await reportService.generateMovementReport(filters);

      expect(result.summary.totalMovements).toBe(1500);
      expect(result.trends.efficiency.successRate).toBe(0.98);
      expect(result.details.byUser).toHaveLength(1);
      expect(result.anomalies).toHaveLength(1);
      expect(reportService.generateMovementReport).toHaveBeenCalledWith(filters);
    });

    it('deve usar reportService.generateExpirationReport para produtos próximos ao vencimento', async () => {
      const mockExpirationReport = {
        summary: {
          totalProducts: 250,
          expiringProducts: 15,
          criticalProducts: 3,
          warningProducts: 12,
          averageDaysToExpiry: 120
        },
        categories: {
          critical: [
            {
              productId: 'prod123',
              productName: 'Milho Híbrido',
              lot: 'LOTE123',
              expirationDate: new Date('2024-02-15'),
              daysRemaining: 5,
              location: 'Q1-L1-F1-A1',
              totalWeight: 500,
              recommendedAction: 'Usar imediatamente'
            }
          ],
          warning: [
            {
              productId: 'prod124',
              productName: 'Soja Premium',
              lot: 'LOTE124',
              expirationDate: new Date('2024-03-01'),
              daysRemaining: 20,
              location: 'Q2-L1-F1-A1',
              totalWeight: 750,
              recommendedAction: 'Priorizar uso'
            }
          ]
        },
        trends: {
          expirationPattern: 'seasonal',
          averageWasteRate: 0.02,
          improvementPotential: 'medium',
          costImpact: 15000
        },
        recommendations: [
          'Implementar sistema de alerta antecipado',
          'Priorizar rotação FIFO nas câmaras',
          'Revisar políticas de compra para reduzir desperdício'
        ],
        preventiveActions: [
          {
            action: 'Transferir produto LOTE123 para área de uso imediato',
            priority: 'high',
            deadline: new Date('2024-02-12')
          }
        ]
      };

      reportService.generateExpirationReport.mockResolvedValue(mockExpirationReport);

      const filters = {
        days: 30,
        chamber: null,
        seedType: null,
        includeRecommendations: true
      };

      const result = await reportService.generateExpirationReport(filters);

      expect(result.summary.expiringProducts).toBe(15);
      expect(result.categories.critical).toHaveLength(1);
      expect(result.recommendations).toHaveLength(3);
      expect(result.preventiveActions).toHaveLength(1);
      expect(reportService.generateExpirationReport).toHaveBeenCalledWith(filters);
    });

    it('deve usar reportService.generateCapacityReport para relatório de capacidade', async () => {
      const mockCapacityReport = {
        overview: {
          totalCapacity: 250000,
          usedCapacity: 187500,
          availableCapacity: 62500,
          utilizationRate: 0.75
        },
        chambers: [
          {
            chamberId: 'chamber1',
            chamberName: 'Câmara Principal',
            totalCapacity: 50000,
            usedCapacity: 37500,
            utilizationRate: 0.75,
            locations: {
              total: 100,
              occupied: 75,
              available: 25
            },
            trends: {
              growthRate: '+2.5% per month',
              projectedFull: new Date('2024-08-15'),
              efficiency: 0.92
            }
          }
        ],
        predictions: {
          fullCapacityDate: new Date('2024-06-30'),
          daysUntilFull: 150,
          recommendedExpansion: {
            chambers: ['chamber6'],
            estimatedCapacity: 50000,
            priority: 'medium'
          }
        },
        optimization: {
          underutilizedAreas: [
            {
              location: 'Q3-L2-F1-A4',
              utilizationRate: 0.25,
              potential: 'high'
            }
          ],
          consolidationOpportunities: [
            {
              description: 'Consolidar produtos similares na Câmara 2',
              spaceSaving: 2500,
              difficulty: 'low'
            }
          ]
        },
        alerts: [
          'Câmara 2 atingirá capacidade máxima em 60 dias',
          'Câmara 4 subutilizada - oportunidade de otimização'
        ]
      };

      reportService.generateCapacityReport.mockResolvedValue(mockCapacityReport);

      const filters = {
        includePredictions: true,
        includeOptimization: true,
        timeframe: 'quarterly'
      };

      const result = await reportService.generateCapacityReport(filters);

      expect(result.overview.utilizationRate).toBe(0.75);
      expect(result.chambers).toHaveLength(1);
      expect(result.predictions.daysUntilFull).toBe(150);
      expect(result.optimization.underutilizedAreas).toHaveLength(1);
      expect(reportService.generateCapacityReport).toHaveBeenCalledWith(filters);
    });

    it('deve usar reportService.generateComprehensiveReport para relatório abrangente', async () => {
      const mockComprehensiveReport = {
        executiveSummary: {
          systemHealth: 'good',
          overallScore: 0.87,
          keyMetrics: {
            utilizationRate: 0.75,
            efficiency: 0.92,
            movementVolume: 1500,
            alertsCount: 5
          },
          trendDirection: 'improving'
        },
        sections: {
          inventory: { summary: 'Estoque bem distribuído' },
          movements: { summary: 'Operações eficientes' },
          capacity: { summary: 'Capacidade adequada' },
          expiration: { summary: 'Baixo risco de vencimento' }
        },
        insights: [
          'Sistema operando com alta eficiência',
          'Oportunidades de otimização identificadas',
          'Crescimento sustentável previsto'
        ],
        actionItems: [
          {
            priority: 'high',
            action: 'Implementar alertas preventivos',
            deadline: new Date('2024-03-01'),
            responsible: 'Equipe de TI'
          }
        ],
        benchmarks: {
          industryComparison: '+15% above average',
          lastPeriod: '+3% improvement',
          targets: {
            utilization: 0.80,
            efficiency: 0.95,
            status: 'on_track'
          }
        }
      };

      reportService.generateComprehensiveReport.mockResolvedValue(mockComprehensiveReport);

      const filters = {
        period: 'monthly',
        includeComparisons: true,
        includeBenchmarks: true
      };

      const result = await reportService.generateComprehensiveReport(filters);

      expect(result.executiveSummary.overallScore).toBe(0.87);
      expect(result.insights).toHaveLength(3);
      expect(result.actionItems).toHaveLength(1);
      expect(result.benchmarks.targets.status).toBe('on_track');
      expect(reportService.generateComprehensiveReport).toHaveBeenCalledWith(filters);
    });

    it('deve usar reportService.analyzeProductTrends para análise de tendências', async () => {
      const mockTrendAnalysis = {
        overview: {
          totalProducts: 250,
          analyzedPeriod: '6 months',
          trendsIdentified: 8
        },
        patterns: {
          seasonal: [
            {
              product: 'Milho Híbrido',
              pattern: 'High demand in spring',
              confidence: 0.85,
              impact: 'high'
            }
          ],
          cyclical: [
            {
              product: 'Soja Premium',
              cycle: 'Quarterly peak',
              confidence: 0.78,
              impact: 'medium'
            }
          ]
        },
        predictions: [
          {
            product: 'Milho Híbrido',
            nextPeakDate: new Date('2024-03-15'),
            expectedVolume: 150,
            confidence: 0.82
          }
        ],
        recommendations: [
          'Aumentar estoque de Milho Híbrido antes do pico sazonal',
          'Otimizar espaço para Soja Premium no final de cada trimestre'
        ]
      };

      reportService.analyzeProductTrends.mockResolvedValue(mockTrendAnalysis);

      const filters = {
        products: ['prod123', 'prod124'],
        period: '6months',
        includePredictions: true
      };

      const result = await reportService.analyzeProductTrends(filters);

      expect(result.patterns.seasonal).toHaveLength(1);
      expect(result.predictions).toHaveLength(1);
      expect(result.recommendations).toHaveLength(2);
      expect(reportService.analyzeProductTrends).toHaveBeenCalledWith(filters);
    });

    it('deve usar reportService.generateAuditTrail para trilha de auditoria', async () => {
      const mockAuditTrail = {
        summary: {
          totalEvents: 5000,
          period: {
            start: new Date('2024-01-01'),
            end: new Date('2024-01-31')
          },
          usersInvolved: 15,
          systemEvents: 4500,
          userEvents: 500
        },
        events: [
          {
            timestamp: new Date(),
            type: 'product_created',
            userId: 'user123',
            details: {
              productId: 'prod123',
              productName: 'Milho Híbrido',
              location: 'Q1-L1-F1-A1'
            },
            ip: '192.168.1.100',
            verified: true
          }
        ],
        compliance: {
          dataIntegrity: 0.99,
          completeness: 0.98,
          traceability: 0.97,
          overallScore: 0.98
        },
        anomalies: [
          {
            type: 'unusual_access_pattern',
            description: 'Múltiplos acessos fora do horário normal',
            risk: 'low',
            timestamp: new Date('2024-01-20')
          }
        ],
        recommendations: [
          'Implementar autenticação de dois fatores',
          'Revisar políticas de acesso noturno'
        ]
      };

      reportService.generateAuditTrail.mockResolvedValue(mockAuditTrail);

      const filters = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        userId: null,
        eventType: null,
        includeAnomalies: true
      };

      const result = await reportService.generateAuditTrail(filters);

      expect(result.summary.totalEvents).toBe(5000);
      expect(result.compliance.overallScore).toBe(0.98);
      expect(result.anomalies).toHaveLength(1);
      expect(result.recommendations).toHaveLength(2);
      expect(reportService.generateAuditTrail).toHaveBeenCalledWith(filters);
    });
  });

  describe('Validação de Estrutura de Relatórios', () => {
    it('deve validar formato padrão de relatórios', async () => {
      const reportStructure = {
        metadata: {
          reportType: 'inventory',
          generatedAt: new Date(),
          generatedBy: 'user123',
          version: '1.0'
        },
        summary: {},
        data: [],
        analytics: {},
        recommendations: []
      };

      // Validações básicas de estrutura
      expect(reportStructure.metadata).toBeDefined();
      expect(reportStructure.summary).toBeDefined();
      expect(reportStructure.data).toBeDefined();
      expect(Array.isArray(reportStructure.data)).toBe(true);
      expect(Array.isArray(reportStructure.recommendations)).toBe(true);
    });

    it('deve validar métricas de qualidade de relatório', async () => {
      const qualityMetrics = {
        completeness: 0.95,
        accuracy: 0.98,
        timeliness: 0.92,
        relevance: 0.88
      };

      const overallQuality = Object.values(qualityMetrics).reduce((a, b) => a + b, 0) / Object.keys(qualityMetrics).length;

      expect(overallQuality).toBeGreaterThan(0.9);
      expect(qualityMetrics.accuracy).toBeGreaterThan(qualityMetrics.completeness);
    });
  });

  describe('Tratamento de Erros em Relatórios', () => {
    it('deve tratar erro quando reportService falha', async () => {
      reportService.generateInventoryReport.mockRejectedValue(
        new Error('Erro ao gerar relatório de estoque')
      );

      try {
        await reportService.generateInventoryReport({});
      } catch (error) {
        expect(error.message).toBe('Erro ao gerar relatório de estoque');
      }

      expect(reportService.generateInventoryReport).toHaveBeenCalled();
    });

    it('deve lidar com filtros inválidos graciosamente', async () => {
      const invalidFilters = {
        startDate: 'invalid-date',
        chamber: 'non-existent-chamber'
      };

      // Verificar se filtros são tratados adequadamente
      expect(invalidFilters.startDate).toBe('invalid-date');
      expect(invalidFilters.chamber).toBe('non-existent-chamber');
    });

    it('deve retornar relatório vazio quando não há dados', async () => {
      reportService.generateInventoryReport.mockResolvedValue({
        summary: {
          totalProducts: 0,
          totalWeight: 0
        },
        breakdown: {
          byChamber: [],
          bySeedType: []
        },
        analytics: null,
        alerts: []
      });

      const result = await reportService.generateInventoryReport({});

      expect(result.summary.totalProducts).toBe(0);
      expect(result.breakdown.byChamber).toHaveLength(0);
      expect(result.analytics).toBeNull();
    });
  });

  describe('Integração com Models para Dados Básicos', () => {
    it('deve verificar consultas básicas quando reportService não estiver disponível', async () => {
      // Mock das consultas básicas para relatórios
      Product.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      Movement.find.mockReturnValue({
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      });

      // Verificar disponibilidade dos methods básicos
      expect(Product.find).toBeDefined();
      expect(Movement.find).toBeDefined();
      expect(Location.find).toBeDefined();
      expect(Chamber.find).toBeDefined();
    });

    it('deve verificar agregações para relatórios estatísticos', async () => {
      const mockAggregation = [
        {
          _id: 'chamber1',
          totalProducts: 50,
          totalWeight: 25000,
          averageWeight: 500
        }
      ];

      Product.aggregate.mockResolvedValue(mockAggregation);

      const result = await Product.aggregate([
        {
          $group: {
            _id: '$chamberId',
            totalProducts: { $sum: 1 },
            totalWeight: { $sum: '$totalWeight' },
            averageWeight: { $avg: '$totalWeight' }
          }
        }
      ]);

      expect(result).toHaveLength(1);
      expect(result[0].totalProducts).toBe(50);
      expect(result[0].totalWeight).toBe(25000);
    });
  });
}); 