/**
 * MovementService - Lógica de Negócio para Movimentações
 * Objetivos: Sistema completo de auditoria e rastreabilidade de movimentações
 * Funcionalidades: Análise de padrões, relatórios avançados, validações, auditoria
 * Regras: Rastreabilidade completa, validação de histórico, análise temporal
 */

const Movement = require('../models/Movement');
const Product = require('../models/Product');
const Location = require('../models/Location');
const User = require('../models/User');

/**
 * Registro inteligente de movimentação manual
 * @param {Object} movementData - Dados da movimentação
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções de registro
 * @returns {Object} Movimentação registrada com análises
 */
const registerManualMovement = async (movementData, userId, options = {}) => {
  try {
    const {
      validateBusiness = true,
      generateAnalysis = true,
      captureMetadata = true,
      verifyCapacity = true
    } = options;

    // 1. Validar dados básicos da movimentação
    const validation = await validateMovementData(movementData);
    if (!validation.valid) {
      throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
    }

    // 2. Buscar dados relacionados para validação
    const product = await Product.findById(movementData.productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    // 3. Validações específicas por tipo de movimentação
    if (validateBusiness) {
      const businessValidation = await validateBusinessRules(movementData, product);
      if (!businessValidation.valid) {
        throw new Error(`Regra de negócio violada: ${businessValidation.reason}`);
      }
    }

    // 4. Verificar capacidade das localizações se necessário
    if (verifyCapacity && movementData.toLocationId) {
      const location = await Location.findById(movementData.toLocationId);
      if (location && !location.canAccommodateWeight(movementData.weight)) {
        throw new Error(`Localização de destino não tem capacidade suficiente. Disponível: ${location.availableCapacityKg}kg`);
      }
    }

    // 5. Capturar metadados se solicitado
    let metadata = { isAutomatic: false };
    if (captureMetadata && options.requestMetadata) {
      metadata = {
        ...metadata,
        ipAddress: options.requestMetadata.ip,
        userAgent: options.requestMetadata.userAgent,
        sessionId: options.requestMetadata.sessionId
      };
    }

    // 6. Construir dados completos da movimentação
    const completeMovementData = {
      ...movementData,
      userId,
      metadata,
      status: 'completed',
      timestamp: new Date()
    };

    // 7. Criar movimentação
    const movement = new Movement(completeMovementData);
    await movement.save();

    // 8. Buscar movimentação completa com populações
    const fullMovement = await Movement.findById(movement._id)
      .populate('productId', 'name lot totalWeight')
      .populate('userId', 'name email')
      .populate('fromLocationId', 'code coordinates chamberId')
      .populate('toLocationId', 'code coordinates chamberId');

    // 9. Gerar análise se solicitado
    let analysis = null;
    if (generateAnalysis) {
      analysis = await generateMovementAnalysis(fullMovement, product);
    }

    // 10. Verificar impacto no histórico
    const historyImpact = await analyzeHistoryImpact(movementData.productId, movement);

    return {
      success: true,
      data: {
        movement: fullMovement,
        analysis,
        historyImpact,
        warnings: validation.warnings || []
      }
    };

  } catch (error) {
    throw new Error(`Erro ao registrar movimentação: ${error.message}`);
  }
};

/**
 * Análise avançada de padrões de movimentação
 * @param {Object} filters - Filtros de análise
 * @param {Object} options - Opções de análise
 * @returns {Object} Relatório de padrões
 */
const analyzeMovementPatterns = async (filters = {}, options = {}) => {
  try {
    const {
      period = 90,
      includeHourlyPatterns = true,
      includeUserPatterns = true,
      includeLocationPatterns = true,
      includeAnomalies = true
    } = options;

    const {
      startDate = new Date(Date.now() - period * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      movementType,
      userId,
      chamberId
    } = filters;

    // 1. Query base para análise
    const baseQuery = {
      timestamp: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    };

    if (movementType) baseQuery.type = movementType;
    if (userId) baseQuery.userId = userId;

    // 2. Padrões temporais (horários e dias da semana)
    let temporalPatterns = {};
    if (includeHourlyPatterns) {
      temporalPatterns = await Movement.aggregate([
        { $match: baseQuery },
        {
          $group: {
            _id: {
              hour: { $hour: '$timestamp' },
              dayOfWeek: { $dayOfWeek: '$timestamp' },
              type: '$type'
            },
            count: { $sum: 1 },
            avgWeight: { $avg: '$weight' },
            totalWeight: { $sum: '$weight' }
          }
        },
        {
          $group: {
            _id: { hour: '$_id.hour', dayOfWeek: '$_id.dayOfWeek' },
            totalMovements: { $sum: '$count' },
            avgWeightPerMovement: { $avg: '$avgWeight' },
            typeDistribution: {
              $push: {
                type: '$_id.type',
                count: '$count',
                percentage: { $multiply: [{ $divide: ['$count', '$totalMovements'] }, 100] }
              }
            }
          }
        },
        { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
      ]);
    }

    // 3. Padrões por usuário
    let userPatterns = {};
    if (includeUserPatterns) {
      userPatterns = await Movement.aggregate([
        { $match: baseQuery },
        {
          $lookup: {
            from: 'users',
            localField: 'userId',
            foreignField: '_id',
            as: 'user'
          }
        },
        { $unwind: '$user' },
        {
          $group: {
            _id: '$userId',
            userName: { $first: '$user.name' },
            userRole: { $first: '$user.role' },
            totalMovements: { $sum: 1 },
            movementTypes: {
              $push: '$type'
            },
            avgWeightHandled: { $avg: '$weight' },
            totalWeightHandled: { $sum: '$weight' },
            automaticMovements: {
              $sum: { $cond: ['$metadata.isAutomatic', 1, 0] }
            }
          }
        },
        {
          $addFields: {
            manualMovements: { $subtract: ['$totalMovements', '$automaticMovements'] },
            automationRate: {
              $multiply: [
                { $divide: ['$automaticMovements', '$totalMovements'] },
                100
              ]
            }
          }
        },
        { $sort: { totalMovements: -1 } }
      ]);
    }

    // 4. Padrões por localização
    let locationPatterns = {};
    if (includeLocationPatterns) {
      locationPatterns = await Movement.aggregate([
        { $match: baseQuery },
        {
          $facet: {
            origins: [
              { $match: { fromLocationId: { $exists: true } } },
              {
                $lookup: {
                  from: 'locations',
                  localField: 'fromLocationId',
                  foreignField: '_id',
                  as: 'location'
                }
              },
              { $unwind: '$location' },
              {
                $group: {
                  _id: '$fromLocationId',
                  locationCode: { $first: '$location.code' },
                  coordinates: { $first: '$location.coordinates' },
                  outgoingMovements: { $sum: 1 },
                  avgWeightOut: { $avg: '$weight' }
                }
              }
            ],
            destinations: [
              { $match: { toLocationId: { $exists: true } } },
              {
                $lookup: {
                  from: 'locations',
                  localField: 'toLocationId',
                  foreignField: '_id',
                  as: 'location'
                }
              },
              { $unwind: '$location' },
              {
                $group: {
                  _id: '$toLocationId',
                  locationCode: { $first: '$location.code' },
                  coordinates: { $first: '$location.coordinates' },
                  incomingMovements: { $sum: 1 },
                  avgWeightIn: { $avg: '$weight' }
                }
              }
            ]
          }
        }
      ]);
    }

    // 5. Detecção de anomalias
    let anomalies = [];
    if (includeAnomalies) {
      anomalies = await detectMovementAnomalies(baseQuery);
    }

    // 6. Estatísticas de velocidade e eficiência
    const efficiency = await analyzeMovementEfficiency(baseQuery);

    // 7. Tendências temporais
    const trends = await analyzeMovementTrends(baseQuery, period);

    return {
      success: true,
      data: {
        period: { startDate, endDate, days: period },
        patterns: {
          temporal: temporalPatterns,
          users: userPatterns,
          locations: locationPatterns
        },
        anomalies,
        efficiency,
        trends,
        summary: {
          totalMovements: await Movement.countDocuments(baseQuery),
          avgMovementsPerDay: await Movement.countDocuments(baseQuery) / period,
          typeDistribution: await getTypeDistribution(baseQuery)
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao analisar padrões: ${error.message}`);
  }
};

/**
 * Geração de relatório completo de auditoria
 * @param {Object} filters - Filtros do relatório
 * @param {Object} options - Opções de geração
 * @returns {Object} Relatório de auditoria
 */
const generateAuditReport = async (filters = {}, options = {}) => {
  try {
    const {
      includeVerificationStatus = true,
      includeRiskAnalysis = true,
      includeComplianceCheck = true,
      includeRecommendations = true,
      format = 'detailed'
    } = options;

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      userId,
      productId,
      movementType,
      verificationStatus
    } = filters;

    // 1. Query base
    const baseQuery = {
      timestamp: { $gte: startDate, $lte: endDate }
    };

    if (userId) baseQuery.userId = userId;
    if (productId) baseQuery.productId = productId;
    if (movementType) baseQuery.type = movementType;
    if (verificationStatus !== undefined) {
      baseQuery['verification.isVerified'] = verificationStatus;
    }

    // 2. Buscar movimentações com dados completos
    const movements = await Movement.find(baseQuery)
      .populate('productId', 'name lot totalWeight')
      .populate('userId', 'name email role')
      .populate('fromLocationId', 'code coordinates')
      .populate('toLocationId', 'code coordinates')
      .sort({ timestamp: -1 });

    // 3. Análise de status de verificação
    let verificationAnalysis = {};
    if (includeVerificationStatus) {
      verificationAnalysis = await analyzeVerificationStatus(movements);
    }

    // 4. Análise de riscos
    let riskAnalysis = {};
    if (includeRiskAnalysis) {
      riskAnalysis = await analyzeMovementRisks(movements);
    }

    // 5. Verificação de conformidade
    let complianceCheck = {};
    if (includeComplianceCheck) {
      complianceCheck = await checkMovementCompliance(movements);
    }

    // 6. Gerar recomendações
    let recommendations = [];
    if (includeRecommendations) {
      recommendations = await generateAuditRecommendations(movements, {
        verificationAnalysis,
        riskAnalysis,
        complianceCheck
      });
    }

    // 7. Estatísticas consolidadas
    const statistics = {
      totalMovements: movements.length,
      byType: getMovementCountByType(movements),
      byUser: getMovementCountByUser(movements),
      byStatus: getMovementCountByStatus(movements),
      weightHandled: movements.reduce((sum, mov) => sum + mov.weight, 0),
      averageWeightPerMovement: movements.length > 0 ? 
        movements.reduce((sum, mov) => sum + mov.weight, 0) / movements.length : 0,
      timeSpan: {
        startDate,
        endDate,
        totalDays: Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
      }
    };

    // 8. Formatação baseada no tipo solicitado
    const report = {
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'MovementService',
        filters,
        options,
        format
      },
      statistics,
      movements: format === 'summary' ? movements.slice(0, 10) : movements,
      analysis: {
        verification: verificationAnalysis,
        risks: riskAnalysis,
        compliance: complianceCheck
      },
      recommendations
    };

    return {
      success: true,
      data: report
    };

  } catch (error) {
    throw new Error(`Erro ao gerar relatório de auditoria: ${error.message}`);
  }
};

/**
 * Análise de histórico completo de um produto
 * @param {String} productId - ID do produto
 * @param {Object} options - Opções de análise
 * @returns {Object} Histórico detalhado
 */
const analyzeProductHistory = async (productId, options = {}) => {
  try {
    const {
      includeLocationJourney = true,
      includeWeightEvolution = true,
      includeUserActivity = true,
      includeTimelineAnalysis = true
    } = options;

    // 1. Buscar produto e todas suas movimentações
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name maxStorageTimeDays')
      .populate('locationId', 'code coordinates chamberId');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    const movements = await Movement.find({ productId })
      .populate('userId', 'name email role')
      .populate('fromLocationId', 'code coordinates')
      .populate('toLocationId', 'code coordinates')
      .sort({ timestamp: 1 }); // Ordem cronológica

    // 2. Jornada de localizações
    let locationJourney = [];
    if (includeLocationJourney) {
      locationJourney = buildLocationJourney(movements, product);
    }

    // 3. Evolução do peso
    let weightEvolution = [];
    if (includeWeightEvolution) {
      weightEvolution = buildWeightEvolution(movements);
    }

    // 4. Atividade por usuário
    let userActivity = {};
    if (includeUserActivity) {
      userActivity = analyzeUserActivity(movements);
    }

    // 5. Análise de timeline
    let timelineAnalysis = {};
    if (includeTimelineAnalysis) {
      timelineAnalysis = analyzeProductTimeline(product, movements);
    }

    // 6. Métricas calculadas
    const metrics = {
      totalMovements: movements.length,
      automaticMovements: movements.filter(m => m.metadata?.isAutomatic).length,
      manualMovements: movements.filter(m => !m.metadata?.isAutomatic).length,
      locationsVisited: new Set(movements.map(m => m.toLocationId?.toString()).filter(Boolean)).size,
      weightVariation: weightEvolution.length > 1 ? 
        weightEvolution[weightEvolution.length - 1].weight - weightEvolution[0].weight : 0,
      timeInStorage: product.entryDate ? 
        Math.floor((new Date() - product.entryDate) / (1000 * 60 * 60 * 24)) : 0,
      lastMovement: movements.length > 0 ? movements[movements.length - 1].timestamp : null
    };

    // 7. Alertas baseados no histórico
    const alerts = generateProductHistoryAlerts(product, movements, metrics);

    return {
      success: true,
      data: {
        product: {
          id: product._id,
          name: product.name,
          lot: product.lot,
          currentLocation: product.locationId,
          status: product.status,
          entryDate: product.entryDate,
          expirationDate: product.expirationDate
        },
        history: {
          movements,
          locationJourney,
          weightEvolution,
          userActivity,
          timeline: timelineAnalysis
        },
        metrics,
        alerts,
        analysisDate: new Date()
      }
    };

  } catch (error) {
    throw new Error(`Erro ao analisar histórico do produto: ${error.message}`);
  }
};

/**
 * Verificação automática de movimentações pendentes
 * @param {Object} criteria - Critérios de verificação
 * @returns {Object} Resultado da verificação
 */
const verifyPendingMovements = async (criteria = {}) => {
  try {
    const {
      maxAge = 24, // horas
      autoVerifyThreshold = 0.95, // 95% de confiança
      includeManualReview = true
    } = criteria;

    // 1. Buscar movimentações não verificadas
    const cutoffDate = new Date(Date.now() - maxAge * 60 * 60 * 1000);
    const pendingMovements = await Movement.find({
      'verification.isVerified': false,
      status: 'completed',
      timestamp: { $gte: cutoffDate }
    })
    .populate('productId', 'name lot')
    .populate('userId', 'name email')
    .populate('fromLocationId', 'code')
    .populate('toLocationId', 'code');

    // 2. Análise automática de confiabilidade
    const analysisResults = [];
    for (const movement of pendingMovements) {
      const confidence = await calculateMovementConfidence(movement);
      
      analysisResults.push({
        movement,
        confidence,
        recommendation: confidence >= autoVerifyThreshold ? 'auto_verify' : 'manual_review',
        reasons: await getConfidenceReasons(movement, confidence)
      });
    }

    // 3. Separar por recomendação
    const autoVerifiable = analysisResults.filter(r => r.recommendation === 'auto_verify');
    const manualReview = analysisResults.filter(r => r.recommendation === 'manual_review');

    // 4. Executar verificação automática se solicitado
    let autoVerifiedCount = 0;
    if (autoVerifiable.length > 0) {
      for (const result of autoVerifiable) {
        try {
          await result.movement.verify(null, 'Verificação automática por sistema');
          autoVerifiedCount++;
        } catch (error) {
          console.warn(`Erro na verificação automática: ${error.message}`);
        }
      }
    }

    return {
      success: true,
      data: {
        summary: {
          totalPending: pendingMovements.length,
          autoVerified: autoVerifiedCount,
          needingManualReview: manualReview.length,
          verificationRate: pendingMovements.length > 0 ? 
            ((autoVerifiedCount / pendingMovements.length) * 100).toFixed(2) : 100
        },
        autoVerifiable,
        manualReview: includeManualReview ? manualReview : manualReview.slice(0, 5),
        criteria,
        processedAt: new Date()
      }
    };

  } catch (error) {
    throw new Error(`Erro na verificação de movimentações: ${error.message}`);
  }
};

// ============ FUNÇÕES AUXILIARES ============

/**
 * Validação específica de dados de movimentação
 */
const validateMovementData = async (data) => {
  const errors = [];
  const warnings = [];

  // Validações básicas
  if (!data.productId) errors.push('ID do produto é obrigatório');
  if (!data.type) errors.push('Tipo de movimentação é obrigatório');
  if (!['entry', 'exit', 'transfer', 'adjustment'].includes(data.type)) {
    errors.push('Tipo deve ser: entry, exit, transfer ou adjustment');
  }
  
  if (data.quantity === undefined || data.quantity < 0) {
    errors.push('Quantidade deve ser um número não negativo');
  }
  
  if (data.weight === undefined || data.weight < 0) {
    errors.push('Peso deve ser um número não negativo');
  }

  // Validações específicas por tipo
  if (data.type === 'transfer' && !data.fromLocationId) {
    errors.push('Transferência deve ter localização de origem');
  }

  if (['entry', 'transfer', 'adjustment'].includes(data.type) && !data.toLocationId) {
    errors.push('Localização de destino é obrigatória para esta operação');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
};

/**
 * Validação de regras de negócio
 */
const validateBusinessRules = async (movementData, product) => {
  // Verificar se produto pode receber movimentação
  if (product.status === 'REMOVIDO' && movementData.type !== 'entry') {
    return {
      valid: false,
      reason: 'Produto removido não pode receber movimentações (exceto re-entrada)'
    };
  }

  // Verificar consistência de peso/quantidade
  const expectedWeight = movementData.quantity * product.weightPerUnit;
  const weightDiff = Math.abs(movementData.weight - expectedWeight);
  const tolerance = expectedWeight * 0.05; // 5% de tolerância

  if (weightDiff > tolerance) {
    return {
      valid: false,
      reason: `Peso informado (${movementData.weight}kg) não condiz com quantidade×peso unitário (${expectedWeight}kg)`
    };
  }

  return { valid: true };
};

/**
 * Geração de análise da movimentação
 */
const generateMovementAnalysis = async (movement, product) => {
  const analysis = {
    impact: 'normal',
    description: movement.description,
    locationChange: false,
    weightImpact: movement.weight,
    recommendations: []
  };

  // Analisar impacto da movimentação
  if (movement.type === 'transfer') {
    analysis.locationChange = true;
    analysis.impact = 'high';
    analysis.recommendations.push('Verificar condições da nova localização');
  }

  if (movement.weight > product.totalWeight * 0.5) {
    analysis.impact = 'high';
    analysis.recommendations.push('Movimentação de grande volume - verificar necessidade');
  }

  return analysis;
};

/**
 * Análise de impacto no histórico
 */
const analyzeHistoryImpact = async (productId, newMovement) => {
  const recentMovements = await Movement.find({
    productId,
    timestamp: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
  }).countDocuments();

  return {
    recentActivity: recentMovements > 3 ? 'high' : recentMovements > 1 ? 'medium' : 'low',
    movementFrequency: recentMovements,
    lastMovementType: newMovement.type,
    alert: recentMovements > 5 ? 'Produto com alta movimentação recente' : null
  };
};

/**
 * Detecção de anomalias em movimentações
 */
const detectMovementAnomalies = async (baseQuery) => {
  const anomalies = [];

  // Detectar movimentações fora do horário normal (ex: após 22h ou antes de 6h)
  const afterHours = await Movement.find({
    ...baseQuery,
    $expr: {
      $or: [
        { $lt: [{ $hour: '$timestamp' }, 6] },
        { $gt: [{ $hour: '$timestamp' }, 22] }
      ]
    }
  }).countDocuments();

  if (afterHours > 0) {
    anomalies.push({
      type: 'after_hours',
      count: afterHours,
      severity: 'medium',
      description: 'Movimentações fora do horário comercial'
    });
  }

  // Detectar picos de atividade
  const dailyMovements = await Movement.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: {
          year: { $year: '$timestamp' },
          month: { $month: '$timestamp' },
          day: { $dayOfMonth: '$timestamp' }
        },
        count: { $sum: 1 }
      }
    }
  ]);

  const avgDaily = dailyMovements.reduce((sum, day) => sum + day.count, 0) / dailyMovements.length;
  const spikes = dailyMovements.filter(day => day.count > avgDaily * 2);

  if (spikes.length > 0) {
    anomalies.push({
      type: 'activity_spike',
      count: spikes.length,
      severity: 'high',
      description: 'Picos de atividade detectados'
    });
  }

  return anomalies;
};

/**
 * Análise de eficiência de movimentações
 */
const analyzeMovementEfficiency = async (baseQuery) => {
  const stats = await Movement.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        avgWeight: { $avg: '$weight' },
        totalWeight: { $sum: '$weight' }
      }
    }
  ]);

  return {
    byType: stats,
    totalEfficiency: stats.reduce((sum, stat) => sum + (stat.avgWeight * stat.count), 0),
    recommendations: generateEfficiencyRecommendations(stats)
  };
};

/**
 * Análise de tendências temporais
 */
const analyzeMovementTrends = async (baseQuery, period) => {
  const trends = await Movement.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: {
          week: { $week: '$timestamp' },
          year: { $year: '$timestamp' }
        },
        count: { $sum: 1 },
        avgWeight: { $avg: '$weight' }
      }
    },
    { $sort: { '_id.year': 1, '_id.week': 1 } }
  ]);

  return {
    weeklyTrends: trends,
    direction: trends.length > 1 ? 
      (trends[trends.length - 1].count > trends[0].count ? 'increasing' : 'decreasing') : 'stable'
  };
};

/**
 * Distribuição por tipo de movimentação
 */
const getTypeDistribution = async (baseQuery) => {
  return await Movement.aggregate([
    { $match: baseQuery },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
};

/**
 * Outras funções auxiliares de análise
 */
const analyzeVerificationStatus = async (movements) => {
  const verified = movements.filter(m => m.verification?.isVerified).length;
  const pending = movements.length - verified;
  
  return {
    verified,
    pending,
    verificationRate: movements.length > 0 ? (verified / movements.length * 100).toFixed(2) : 100
  };
};

const analyzeMovementRisks = async (movements) => {
  const risks = [];
  
  // Movimentações não verificadas há mais de 48h
  const oldUnverified = movements.filter(m => 
    !m.verification?.isVerified && 
    (new Date() - m.timestamp) > 48 * 60 * 60 * 1000
  );

  if (oldUnverified.length > 0) {
    risks.push({
      type: 'old_unverified',
      count: oldUnverified.length,
      severity: 'high'
    });
  }

  return risks;
};

const checkMovementCompliance = async (movements) => {
  return {
    totalChecked: movements.length,
    compliant: movements.filter(m => m.verification?.isVerified || m.metadata?.isAutomatic).length,
    issues: []
  };
};

const generateAuditRecommendations = async (movements, analyses) => {
  const recommendations = [];
  
  if (analyses.verificationAnalysis.verificationRate < 80) {
    recommendations.push({
      priority: 'high',
      action: 'increase_verification_rate',
      description: 'Taxa de verificação baixa - implementar processo de verificação automática'
    });
  }

  return recommendations;
};

// Funções auxiliares para análise de produto
const buildLocationJourney = (movements, product) => {
  const journey = [];
  let currentLocation = null;

  movements.forEach(movement => {
    if (movement.toLocationId) {
      journey.push({
        timestamp: movement.timestamp,
        from: currentLocation,
        to: movement.toLocationId,
        type: movement.type,
        weight: movement.weight
      });
      currentLocation = movement.toLocationId;
    }
  });

  return journey;
};

const buildWeightEvolution = (movements) => {
  const evolution = [];
  let currentWeight = 0;

  movements.forEach(movement => {
    switch (movement.type) {
      case 'entry':
      case 'adjustment':
        currentWeight = movement.weight;
        break;
      case 'exit':
        currentWeight = Math.max(0, currentWeight - movement.weight);
        break;
    }

    evolution.push({
      timestamp: movement.timestamp,
      weight: currentWeight,
      change: movement.type,
      movementId: movement._id
    });
  });

  return evolution;
};

const analyzeUserActivity = (movements) => {
  const activity = {};
  
  movements.forEach(movement => {
    const userId = movement.userId._id.toString();
    if (!activity[userId]) {
      activity[userId] = {
        name: movement.userId.name,
        movementCount: 0,
        types: new Set()
      };
    }
    
    activity[userId].movementCount++;
    activity[userId].types.add(movement.type);
  });

  return Object.values(activity).map(user => ({
    ...user,
    types: Array.from(user.types)
  }));
};

const analyzeProductTimeline = (product, movements) => {
  return {
    entryDate: product.entryDate,
    firstMovement: movements[0]?.timestamp,
    lastMovement: movements[movements.length - 1]?.timestamp,
    totalStorageTime: product.entryDate ? 
      Math.floor((new Date() - product.entryDate) / (1000 * 60 * 60 * 24)) : 0,
    movementFrequency: movements.length > 1 ? 
      Math.floor((movements[movements.length - 1].timestamp - movements[0].timestamp) / movements.length) : 0
  };
};

const generateProductHistoryAlerts = (product, movements, metrics) => {
  const alerts = [];

  if (metrics.totalMovements > 20) {
    alerts.push({
      type: 'high_movement_frequency',
      severity: 'warning',
      message: 'Produto com alta frequência de movimentações'
    });
  }

  if (metrics.automaticMovements / metrics.totalMovements < 0.7) {
    alerts.push({
      type: 'low_automation',
      severity: 'info',
      message: 'Muitas movimentações manuais - considerar automação'
    });
  }

  return alerts;
};

const calculateMovementConfidence = async (movement) => {
  let confidence = 0.5; // Base

  // Fatores que aumentam confiança
  if (movement.metadata?.isAutomatic) confidence += 0.3;
  if (movement.userId && movement.reason) confidence += 0.2;
  if (movement.timestamp && (new Date() - movement.timestamp) < 60 * 60 * 1000) confidence += 0.1;

  return Math.min(1.0, confidence);
};

const getConfidenceReasons = async (movement, confidence) => {
  const reasons = [];
  
  if (movement.metadata?.isAutomatic) reasons.push('Movimentação automática');
  if (confidence > 0.8) reasons.push('Alta confiabilidade');
  if (confidence < 0.5) reasons.push('Requer verificação manual');

  return reasons;
};

const getMovementCountByType = (movements) => {
  const counts = {};
  movements.forEach(movement => {
    counts[movement.type] = (counts[movement.type] || 0) + 1;
  });
  return counts;
};

const getMovementCountByUser = (movements) => {
  const counts = {};
  movements.forEach(movement => {
    const userName = movement.userId?.name || 'Desconhecido';
    counts[userName] = (counts[userName] || 0) + 1;
  });
  return counts;
};

const getMovementCountByStatus = (movements) => {
  const counts = {};
  movements.forEach(movement => {
    counts[movement.status] = (counts[movement.status] || 0) + 1;
  });
  return counts;
};

const generateEfficiencyRecommendations = (stats) => {
  const recommendations = [];
  
  const transfers = stats.find(s => s._id === 'transfer');
  if (transfers && transfers.count > stats.reduce((sum, s) => sum + s.count, 0) * 0.4) {
    recommendations.push('Muitas transferências - otimizar posicionamento inicial');
  }

  return recommendations;
};

/**
 * Registra evento do sistema para auditoria
 * @param {Object} eventData - Dados do evento
 * @returns {Object} Resultado do registro
 */
const registerSystemEvent = async (eventData) => {
  try {
    // Para eventos de sistema, vamos apenas logar em vez de criar Movement
    // porque Movement é para rastreamento de produtos específicos
    console.log(`📋 Evento do sistema: ${eventData.type}`, {
      timestamp: eventData.timestamp || new Date(),
      details: eventData.details || {},
      chamberId: eventData.chamberId
    });

    return {
      success: true,
      message: 'Evento do sistema registrado nos logs'
    };
  } catch (error) {
    // Não falhar o processo principal se auditoria falhar
    console.warn('Erro ao registrar evento do sistema:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Registra evento de segurança para auditoria
 * @param {Object} eventData - Dados do evento de segurança
 * @returns {Object} Resultado do registro
 */
const registerSecurityEvent = async (eventData) => {
  try {
    // Criar movimentação de segurança para auditoria
    const securityMovement = new Movement({
      type: 'security',
      userId: eventData.userId || 'system',
      productId: eventData.productId || null,
      reason: eventData.action || 'Evento de Segurança',
      timestamp: eventData.timestamp || new Date(),
      metadata: {
        isAutomatic: true,
        isSecurityEvent: true,
        action: eventData.action,
        status: eventData.status,
        ipAddress: eventData.ipAddress,
        userAgent: eventData.userAgent,
        sessionId: eventData.sessionId,
        attempts: eventData.attempts,
        details: eventData.details || {}
      }
    });

    await securityMovement.save();

    return {
      success: true,
      data: securityMovement
    };
  } catch (error) {
    // Não falhar o processo principal se auditoria falhar
    console.warn('Erro ao registrar evento de segurança:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  registerManualMovement,
  analyzeMovementPatterns,
  generateAuditReport,
  analyzeProductHistory,
  verifyPendingMovements,
  registerSystemEvent,
  registerSecurityEvent
}; 