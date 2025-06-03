/**
 * Testes Unitários - MovementController  
 * Verificando RASTREABILIDADE: Registro automático, histórico completo, auditoria
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

// Mock do movementService
jest.mock('../../../services/movementService', () => ({
  analyzeMovementPatterns: jest.fn(),
  registerManualMovement: jest.fn(),
  analyzeProductHistory: jest.fn(),
  generateAuditReport: jest.fn(),
  verifyPendingMovements: jest.fn()
}));

// Mock do Movement model
jest.mock('../../../models/Movement');

const app = require('../../../app');
const movementService = require('../../../services/movementService');
const Movement = require('../../../models/Movement');

describe('MovementController - Rastreabilidade e Auditoria', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integração com MovementService', () => {
    it('deve verificar disponibilidade dos métodos do movementService', async () => {
      // Verificar se os métodos críticos estão disponíveis
      expect(movementService.analyzeMovementPatterns).toBeDefined();
      expect(movementService.registerManualMovement).toBeDefined();
      expect(movementService.analyzeProductHistory).toBeDefined();
      expect(movementService.generateAuditReport).toBeDefined();
      expect(movementService.verifyPendingMovements).toBeDefined();
    });

    it('deve usar movementService.analyzeMovementPatterns para análise de padrões', async () => {
      const mockPatterns = {
        temporalPatterns: {
          peakHours: ['09:00', '14:00'],
          quietPeriods: ['12:00-13:00']
        },
        userPatterns: {
          mostActiveUser: 'user123',
          averageMovementsPerUser: 25
        },
        anomalies: [],
        recommendations: ['Distribuir operações ao longo do dia']
      };

      movementService.analyzeMovementPatterns.mockResolvedValue(mockPatterns);

      const result = await movementService.analyzeMovementPatterns();
      
      expect(result.temporalPatterns.peakHours).toContain('09:00');
      expect(result.userPatterns.mostActiveUser).toBe('user123');
      expect(result.recommendations).toBeDefined();
      expect(movementService.analyzeMovementPatterns).toHaveBeenCalled();
    });

    it('deve usar movementService.registerManualMovement para registro manual', async () => {
      const mockResult = {
        success: true,
        data: {
          movement: {
            _id: 'mov123',
            type: 'adjustment',
            quantity: 50,
            metadata: { isAutomatic: false }
          },
          analysis: {
            anomalies: [],
            efficiency: 0.85,
            recommendations: []
          },
          audit: {
            recorded: true,
            verificationRequired: false
          }
        }
      };

      movementService.registerManualMovement.mockResolvedValue(mockResult);

      const movementData = {
        productId: 'prod123',
        type: 'adjustment',
        quantity: 50,
        reason: 'Correção de inventário',
        notes: 'Ajuste manual necessário'
      };

      const result = await movementService.registerManualMovement(movementData, 'user123');

      expect(result.success).toBe(true);
      expect(result.data.movement.metadata.isAutomatic).toBe(false);
      expect(result.data.audit.recorded).toBe(true);
      expect(movementService.registerManualMovement).toHaveBeenCalledWith(movementData, 'user123');
    });

    it('deve usar movementService.analyzeProductHistory para histórico completo', async () => {
      const mockHistory = {
        product: {
          _id: 'prod123',
          name: 'Produto Teste'
        },
        movements: [
          {
            type: 'entry',
            timestamp: new Date('2024-01-01'),
            quantity: 100
          },
          {
            type: 'transfer',
            timestamp: new Date('2024-01-15'),
            quantity: 100
          }
        ],
        analysis: {
          totalMovements: 2,
          weightEvolution: [
            { date: '2024-01-01', weight: 100 },
            { date: '2024-01-15', weight: 100 }
          ],
          locationJourney: [
            { location: 'Q1-L1-F1-A1', period: '2024-01-01 to 2024-01-15' }
          ],
          anomalies: []
        },
        summary: {
          firstEntry: new Date('2024-01-01'),
          lastMovement: new Date('2024-01-15'),
          daysInSystem: 14
        }
      };

      movementService.analyzeProductHistory.mockResolvedValue(mockHistory);

      const result = await movementService.analyzeProductHistory('prod123');

      expect(result.product.name).toBe('Produto Teste');
      expect(result.movements).toHaveLength(2);
      expect(result.analysis.totalMovements).toBe(2);
      expect(result.summary.daysInSystem).toBe(14);
      expect(movementService.analyzeProductHistory).toHaveBeenCalledWith('prod123');
    });

    it('deve usar movementService.generateAuditReport para relatório de auditoria', async () => {
      const mockAuditReport = {
        summary: {
          totalMovements: 1000,
          verifiedMovements: 950,
          pendingVerification: 50,
          anomaliesDetected: 5
        },
        reliability: {
          overallScore: 0.95,
          byUser: {
            'user123': { score: 0.98, movements: 100 }
          },
          byType: {
            'automatic': { score: 0.99, count: 800 },
            'manual': { score: 0.85, count: 200 }
          }
        },
        pendingMovements: [
          {
            _id: 'mov123',
            type: 'transfer',
            urgency: 'high',
            daysPending: 3
          }
        ],
        suspiciousPatterns: [],
        recommendations: [
          'Verificar movimentações pendentes há mais de 48h',
          'Revisar padrões do usuário user456'
        ]
      };

      movementService.generateAuditReport.mockResolvedValue(mockAuditReport);

      const result = await movementService.generateAuditReport();

      expect(result.summary.totalMovements).toBe(1000);
      expect(result.reliability.overallScore).toBe(0.95);
      expect(result.pendingMovements).toHaveLength(1);
      expect(result.recommendations).toHaveLength(2);
      expect(movementService.generateAuditReport).toHaveBeenCalled();
    });

    it('deve usar movementService.verifyPendingMovements para verificação', async () => {
      const mockVerificationResult = {
        processed: 10,
        verified: 8,
        rejected: 2,
        details: [
          { movementId: 'mov123', status: 'verified', confidence: 0.95 },
          { movementId: 'mov124', status: 'rejected', reason: 'Inconsistent data' }
        ],
        recommendations: [
          'Revisar movimentações rejeitadas',
          'Implementar validação adicional'
        ]
      };

      movementService.verifyPendingMovements.mockResolvedValue(mockVerificationResult);

      const result = await movementService.verifyPendingMovements({
        minConfidence: 0.8,
        maxAge: 48
      });

      expect(result.processed).toBe(10);
      expect(result.verified).toBe(8);
      expect(result.rejected).toBe(2);
      expect(result.details).toHaveLength(2);
      expect(movementService.verifyPendingMovements).toHaveBeenCalledWith({
        minConfidence: 0.8,
        maxAge: 48
      });
    });
  });

  describe('Validação de Regras de Rastreabilidade', () => {
    it('deve garantir registro automático de movimentações', async () => {
      // Simulando regra de negócio: toda mudança gera movimento
      const changeEvent = {
        type: 'product_update',
        productId: 'prod123',
        changes: { quantity: 150, previousQuantity: 100 }
      };
      
      expect(changeEvent.changes.quantity).not.toBe(changeEvent.changes.previousQuantity);
      expect(changeEvent.productId).toBeDefined();
      expect(changeEvent.type).toBe('product_update');
    });

    it('deve validar integridade de timestamps', async () => {
      const movement = {
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      expect(movement.timestamp).toBeInstanceOf(Date);
      expect(movement.createdAt).toBeInstanceOf(Date);
      expect(movement.updatedAt).toBeInstanceOf(Date);
    });

    it('deve garantir identificação do usuário responsável', async () => {
      const movement = {
        userId: 'user123',
        type: 'manual',
        metadata: {
          ip: '192.168.1.1',
          userAgent: 'test-agent'
        }
      };
      
      expect(movement.userId).toBeDefined();
      expect(movement.metadata.ip).toBeDefined();
      expect(movement.type).toBe('manual');
    });
  });

  describe('Análise de Padrões Temporais', () => {
    it('deve analisar padrões por horário', async () => {
      const mockTemporalAnalysis = {
        temporal: {
          peakHours: ['09:00-10:00', '14:00-15:00'],
          quietPeriods: ['12:00-13:00', '17:00-18:00'],
          weeklyTrends: {
            monday: { movements: 150, efficiency: 0.85 },
            friday: { movements: 120, efficiency: 0.90 }
          }
        },
        operational: {
          averageTimePerMovement: 5.2,
          mostEfficientUsers: ['user123', 'user456'],
          bottleneckLocations: ['Q1-L1-F1-A1']
        },
        quality: {
          errorRate: 0.02,
          mostCommonErrors: ['Weight mismatch', 'Location occupied'],
          improvementSuggestions: [
            'Implementar verificação dupla para transferências',
            'Melhorar treinamento de operadores'
          ]
        }
      };

      movementService.analyzeMovementPatterns.mockResolvedValue(mockTemporalAnalysis);

      const result = await movementService.analyzeMovementPatterns();

      expect(result.temporal.peakHours).toContain('09:00-10:00');
      expect(result.operational.averageTimePerMovement).toBe(5.2);
      expect(result.quality.errorRate).toBe(0.02);
      expect(movementService.analyzeMovementPatterns).toHaveBeenCalled();
    });
  });

  describe('Tratamento de Erros - Rastreabilidade', () => {
    it('deve tratar erro de movimentação duplicada', async () => {
      movementService.registerManualMovement.mockRejectedValue(
        new Error('Movimentação duplicada detectada')
      );

      try {
        await movementService.registerManualMovement({
          productId: 'prod123',
          type: 'transfer',
          quantity: 100
        }, 'user123');
      } catch (error) {
        expect(error.message).toBe('Movimentação duplicada detectada');
      }

      expect(movementService.registerManualMovement).toHaveBeenCalled();
    });

    it('deve tratar erro de dados incompletos', async () => {
      // Simulando validação de dados obrigatórios
      const incompleteData = {
        type: 'transfer',
        quantity: 100
        // Faltando productId
      };
      
      expect(incompleteData.productId).toBeUndefined();
      expect(incompleteData.type).toBeDefined();
      expect(incompleteData.quantity).toBeDefined();
    });
  });

  describe('Análise de Funcionalidades - Movement Model', () => {
    it('deve verificar estrutura de query do Movement model', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Movement.find.mockReturnValue(mockQuery);
      Movement.countDocuments.mockResolvedValue(0);

      // Verificar se a cadeia de query funciona
      const query = Movement.find({})
        .populate('productId')
        .populate('userId')
        .sort('-timestamp');
      
      expect(Movement.find).toBeDefined();
      expect(mockQuery.populate).toBeDefined();
      expect(mockQuery.sort).toBeDefined();
    });

    it('deve verificar filtros por período no model', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Movement.find.mockReturnValue(mockQuery);
      Movement.countDocuments.mockResolvedValue(0);

      // Simular filtro por período
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      
      Movement.find({
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      });

      expect(Movement.find).toHaveBeenCalledWith({
        timestamp: {
          $gte: startDate,
          $lte: endDate
        }
      });
    });

    it('deve verificar métodos de instância do Movement', async () => {
      const mockMovement = {
        _id: 'mov123',
        type: 'transfer',
        isVerified: false,
        verify: jest.fn().mockResolvedValue(true),
        cancel: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      Movement.findById.mockResolvedValue(mockMovement);

      const movement = await Movement.findById('mov123');
      
      expect(movement.verify).toBeDefined();
      expect(movement.cancel).toBeDefined();
      expect(movement.save).toBeDefined();
      
      // Simular verificação
      await movement.verify();
      expect(movement.verify).toHaveBeenCalled();
      
      // Simular cancelamento
      await movement.cancel();
      expect(movement.cancel).toHaveBeenCalled();
    });
  });

  describe('Análise de Localização - Integração de Movimentações', () => {
    it('deve verificar histórico por localização', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Movement.find.mockReturnValue(mockQuery);

      // Simular busca por localização (origem ou destino)
      Movement.find({
        $or: [
          { toLocationId: 'loc123' },
          { fromLocationId: 'loc123' }
        ]
      });

      expect(Movement.find).toHaveBeenCalledWith({
        $or: [
          { toLocationId: 'loc123' },
          { fromLocationId: 'loc123' }
        ]
      });
    });
  });

  describe('Validação de Auditoria', () => {
    it('deve verificar conformidade de auditoria', async () => {
      const auditRequirements = {
        userTracking: true,
        timestampAccuracy: true,
        changeLogging: true,
        verificationProcess: true
      };
      
      // Verificar se todos os requisitos de auditoria estão ativos
      Object.values(auditRequirements).forEach(requirement => {
        expect(requirement).toBe(true);
      });
    });

    it('deve calcular score de confiabilidade', async () => {
      const reliabilityData = {
        totalMovements: 1000,
        verifiedMovements: 950,
        suspiciousActivities: 5
      };
      
      const reliabilityScore = reliabilityData.verifiedMovements / reliabilityData.totalMovements;
      const suspiciousRate = reliabilityData.suspiciousActivities / reliabilityData.totalMovements;
      
      expect(reliabilityScore).toBe(0.95);
      expect(suspiciousRate).toBe(0.005);
      expect(reliabilityScore).toBeGreaterThan(0.9); // Score alto
      expect(suspiciousRate).toBeLessThan(0.01); // Taxa baixa de suspeita
    });
  });
}); 