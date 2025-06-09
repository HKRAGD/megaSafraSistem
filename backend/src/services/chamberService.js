/**
 * Chamber Service
 * Gestão Avançada de Câmaras
 * 
 * Funcionalidades:
 * - Criação integrada com geração de localizações
 * - Análise avançada de capacidade e utilização
 * - Monitoramento de condições ambientais
 * - Otimização de layout baseada em uso
 * - Previsão de necessidades futuras
 * - Cronograma inteligente de manutenção
 * 
 * Integrações Críticas:
 * - locationService (geração e gestão de localizações)
 * - productService (análise de produtos armazenados)
 * - movementService (padrões de movimentação)
 * - reportService (relatórios específicos)
 * - seedTypeService (compatibilidade de tipos)
 */

const Chamber = require('../models/Chamber');
const Location = require('../models/Location');
const Product = require('../models/Product');
const locationService = require('./locationService');
const productService = require('./productService');
const movementService = require('./movementService');
const reportService = require('./reportService');

/**
 * Cria câmara com geração automática de localizações
 * @param {object} chamberData - Dados da câmara
 * @param {object} locationOptions - Opções para geração de localizações
 * @returns {object} Resultado da criação
 */
const createChamberWithLocations = async (chamberData, locationOptions = {}) => {
  try {
    // 1. Validar dados da câmara
    const validationResult = validateChamberData(chamberData);
    if (!validationResult.isValid) {
      throw new Error(`Dados inválidos: ${validationResult.errors.join(', ')}`);
    }

    // 2. Criar câmara
    const chamber = await Chamber.create({
      name: chamberData.name.trim(),
      description: chamberData.description?.trim() || '',
      currentTemperature: chamberData.currentTemperature || null,
      currentHumidity: chamberData.currentHumidity || null,
      dimensions: {
        quadras: chamberData.dimensions.quadras,
        lados: chamberData.dimensions.lados,
        filas: chamberData.dimensions.filas,
        andares: chamberData.dimensions.andares
      },
      status: chamberData.status || 'active'
    });

    // 3. **INTEGRAÇÃO CRÍTICA** com locationService - Corrigindo parâmetros
    const locationResult = await locationService.generateLocationsForChamber(
      chamber._id,
      {
        dimensions: chamberData.dimensions,
        defaultCapacity: locationOptions.defaultCapacity || chamberData.capacity || 1000,
        capacityVariation: locationOptions.capacityVariation !== false,
        optimizeAccess: locationOptions.optimizeAccess !== false,
        baseCapacityKg: locationOptions.baseCapacityKg || 1000,
        capacityRange: locationOptions.capacityRange || { min: 500, max: 2000 },
        accessibilityPriority: locationOptions.accessibilityPriority || 'balanced',
        ...locationOptions
      }
    );

    if (!locationResult.success) {
      // Se falhar na criação de localizações, remover a câmara criada
      await Chamber.findByIdAndDelete(chamber._id);
      throw new Error(`Falha na geração de localizações: ${locationResult.error || locationResult.message || 'Erro desconhecido'}`);
    }

    console.log(`✅ Câmara "${chamber.name}" criada com ${locationResult.locationsCreated} localizações`);

    // 4. Registrar evento de criação
    await movementService.registerSystemEvent({
      type: 'chamber_created_with_locations',
      chamberId: chamber._id,
      metadata: {
        locationsCreated: locationResult.locationsCreated,
        chamberDimensions: chamber.dimensions,
        timestamp: new Date()
      }
    });

    // 5. Calcular score inicial de eficiência
    const initialEfficiencyScore = calculateInitialEfficiencyScore(chamber, { totalGenerated: locationResult.locationsCreated });

    const finalResult = {
      success: true,
      data: {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          description: chamber.description,
          dimensions: chamber.dimensions,
          status: chamber.status,
          currentConditions: {
            temperature: chamber.currentTemperature,
            humidity: chamber.currentHumidity
          },
          createdAt: chamber.createdAt
        },
        locations: {
          totalGenerated: locationResult.locationsCreated,
          created: locationResult.locationsCreated,
          summary: locationResult.stats || {}
        },
        estimatedBenefits: {
          storageCapacity: locationResult.stats?.totalCapacity || (locationResult.locationsCreated * (locationOptions.defaultCapacity || 1000)),
          efficiency: initialEfficiencyScore,
          flexibilityScore: calculateFlexibilityScore({ totalGenerated: locationResult.locationsCreated })
        }
      }
    };

    return finalResult;
  } catch (error) {
    console.error('❌ Erro em createChamberWithLocations:', error.message);
    throw new Error(`Erro ao criar câmara com localizações: ${error.message}`);
  }
};

/**
 * Analisa utilização de capacidade de uma câmara
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções da análise
 * @returns {object} Análise de utilização
 */
const analyzeCapacityUtilization = async (chamberId, options = {}) => {
  try {
    const timeframe = options.timeframe || '30d';
    const includeProjections = options.includeProjections !== false;
    
    // 1. Buscar dados básicos da câmara
    const chamber = await Chamber.findById(chamberId);
    if (!chamber) {
      throw new Error('Câmara não encontrada');
    }

    // 2. Integração com múltiplos services - Corrigindo mocks
    const locations = await locationService.getLocationsByChamber(chamberId);
    const products = await productService.getProductsByChamber(chamberId);
    const movements = await movementService.getMovementsByChamber(chamberId, timeframe);
    const occupancyAnalysis = await locationService.analyzeOccupancy({ chamberId });

    // 3. Calcular métricas de capacidade
    const capacityMetrics = calculateCapacityMetrics(
      chamber, 
      locations?.data || locations || [], 
      products?.data || products || []
    );

    // 4. Calcular tendências de utilização
    const utilizationTrends = calculateUtilizationTrends(
      products?.data || products || [], 
      movements?.data || movements || []
    );

    // 5. Gerar sugestões de otimização
    const optimizations = suggestCapacityOptimizations(
      chamber, 
      capacityMetrics, 
      utilizationTrends, 
      occupancyAnalysis?.data || {}
    );

    // 6. Gerar previsões futuras (se solicitado)
    let predictions = null;
    if (includeProjections) {
      predictions = await predictFutureCapacityNeeds(chamberId, movements?.data || [], timeframe);
    }

    // 7. Adicionar análise de eficiência e alertas
    const efficiency = {
      rating: calculateInitialEfficiencyScore(chamber, { totalGenerated: (locations?.data || []).length }),
      flexibilityScore: calculateFlexibilityScore({ totalGenerated: (locations?.data || []).length, summary: {} })
    };

    const recommendations = [];
    const alerts = [];

    // Usar dados de occupancyAnalysis se disponível, senão usar capacityMetrics
    const utilizationPercentage = occupancyAnalysis?.data?.utilizationPercentage || capacityMetrics.utilizationPercentage;

    if (utilizationPercentage > 95) {
      recommendations.push('Considerar expansão da câmara');
      alerts.push('Capacidade crítica atingida');
    } else if (utilizationPercentage < 30) {
      recommendations.push('Otimizar utilização da capacidade disponível');
    }

    if (utilizationTrends.efficiencyScore < 60) {
      recommendations.push('Revisar organização interna');
    }

    return {
      success: true,
      data: {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          dimensions: chamber.dimensions,
          status: chamber.status
        },
        capacity: {
          total: capacityMetrics.totalCapacity,
          used: capacityMetrics.usedCapacity,
          available: capacityMetrics.availableCapacity,
          utilizationPercentage: capacityMetrics.utilizationPercentage,
          distribution: capacityMetrics.distribution
        },
        utilization: {
          trends: utilizationTrends,
          efficiency: utilizationTrends.efficiencyScore,
          patterns: utilizationTrends.patterns
        },
        efficiency,
        optimizations: optimizations,
        predictions: predictions,
        recommendations,
        alerts,
        analyzedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na análise de capacidade: ${error.message}`);
  }
};

/**
 * Monitora condições ambientais da câmara
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções do monitoramento
 * @returns {object} Status das condições
 */
const monitorEnvironmentalConditions = async (chamberId, options = {}) => {
  try {
    const timeframe = options.timeframe || '24h';
    const includeAlerts = options.includeAlerts !== false;
    
    // Corrigindo problema do populate
    const chamber = await Chamber.findById(chamberId);
    if (!chamber) {
      throw new Error('Câmara não encontrada');
    }

    // 1. Buscar localizações da câmara
    const locations = await locationService.getLocationsByChamber(chamberId);
    const locationIds = (locations?.data || []).map(l => l._id);

    // 2. Analisar produtos armazenados
    const products = await productService.getProductsByConditions({
      locationId: { $in: locationIds },
      status: { $in: ['stored', 'reserved'] }
    });

    // 3. Calcular condições ideais baseadas nos produtos
    const idealConditions = calculateIdealConditions(products || []);

    // 4. Verificar conformidade atual
    const complianceCheck = checkEnvironmentalCompliance(chamber, idealConditions);

    // 5. Buscar histórico de condições (se disponível)
    const conditionHistory = await getConditionHistory(chamberId, timeframe);

    // 6. Gerar alertas se necessário
    let alerts = [];
    let violations = [];
    if (includeAlerts) {
      alerts = generateEnvironmentalAlerts(chamber, idealConditions, complianceCheck);
      
      // Detectar violações específicas
      if (chamber.currentTemperature > idealConditions.temperature.max ||
          chamber.currentTemperature < idealConditions.temperature.min) {
        violations.push({
          type: 'temperature',
          current: chamber.currentTemperature,
          expected: idealConditions.temperature,
          severity: 'high'
        });
        alerts.push('Condições críticas detectadas');
      }

      if (chamber.currentHumidity > idealConditions.humidity.max ||
          chamber.currentHumidity < idealConditions.humidity.min) {
        violations.push({
          type: 'humidity',
          current: chamber.currentHumidity,
          expected: idealConditions.humidity,
          severity: 'medium'
        });
        if (!alerts.includes('Condições críticas detectadas')) {
          alerts.push('Condições críticas detectadas');
        }
      }
    }

    // 7. Calcular score de qualidade ambiental
    const qualityScore = calculateEnvironmentalQualityScore(
      chamber, 
      idealConditions, 
      complianceCheck, 
      (products || []).length
    );

    // 8. Determinar conformidade geral
    const overallCompliance = violations.length === 0 ? 'compliant' : 'non_compliant';

    return {
      success: true,
      data: {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          status: chamber.status
        },
        currentConditions: {
          temperature: chamber.currentTemperature,
          humidity: chamber.currentHumidity,
          lastUpdated: chamber.updatedAt
        },
        idealConditions: idealConditions,
        compliance: {
          ...complianceCheck,
          overall: overallCompliance
        },
        violations,
        qualityScore: qualityScore,
        alerts: alerts,
        history: conditionHistory,
        productsAnalyzed: (products || []).length,
        recommendations: generateEnvironmentalRecommendations(
          chamber, 
          idealConditions, 
          complianceCheck
        ),
        monitoredAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro no monitoramento ambiental: ${error.message}`);
  }
};

/**
 * Otimiza layout da câmara baseado no uso
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções da otimização
 * @returns {object} Sugestões de otimização
 */
const optimizeChamberLayout = async (chamberId, options = {}) => {
  try {
    const timeframe = options.timeframe || '90d';
    const includeReorganization = options.includeReorganization !== false;
    
    // 1. Analisar uso atual da câmara
    const utilizationAnalysis = await analyzeCapacityUtilization(chamberId, { timeframe });
    
    // 2. Analisar padrões de acesso e movimentação
    const accessPatterns = await movementService.analyzeMovementPatterns({
      chamberId,
      timeframe,
      includeLocationPatterns: true
    });

    // 3. Analisar distribuição de produtos por tipo
    const productDistribution = await productService.analyzeProductDistribution({
      chamberId,
      includeTypeAnalysis: true
    });

    // 4. Gerar sugestões de otimização de layout
    const layoutOptimizations = generateLayoutOptimizations(
      utilizationAnalysis.data,
      accessPatterns.data,
      productDistribution.data
    );

    // 5. Calcular benefícios estimados
    const estimatedBenefits = calculateLayoutBenefits(layoutOptimizations);

    // 6. Sugestões de reorganização (se solicitado)
    let reorganizationPlan = null;
    if (includeReorganization) {
      reorganizationPlan = await generateReorganizationPlan(
        chamberId, 
        layoutOptimizations,
        utilizationAnalysis.data
      );
    }

    return {
      success: true,
      data: {
        chamber: {
          id: chamberId,
          currentLayout: utilizationAnalysis.data.capacity.distribution
        },
        analysis: {
          utilization: utilizationAnalysis.data.utilization,
          accessPatterns: accessPatterns.data.summary,
          productDistribution: productDistribution.data.summary
        },
        optimizations: layoutOptimizations,
        benefits: estimatedBenefits,
        reorganization: reorganizationPlan,
        implementation: {
          priority: prioritizeOptimizations(layoutOptimizations),
          timeline: estimateImplementationTimeline(layoutOptimizations),
          resources: estimateRequiredResources(layoutOptimizations)
        },
        analyzedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na otimização de layout: ${error.message}`);
  }
};

/**
 * Gera cronograma de manutenção inteligente
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções do cronograma
 * @returns {object} Cronograma de manutenção
 */
const generateMaintenanceSchedule = async (chamberId, options = {}) => {
  try {
    const lookAhead = options.lookAhead || '6M';
    const includePredictive = options.includePredictive !== false;
    
    const chamber = await Chamber.findById(chamberId);
    if (!chamber) {
      throw new Error('Câmara não encontrada');
    }

    // 1. Analisar histórico de utilização
    const utilizationHistory = await analyzeCapacityUtilization(chamberId, { 
      timeframe: '12M',
      includeProjections: false 
    });

    // 2. Identificar padrões de uso crítico
    const criticalUsagePatterns = identifyCriticalUsagePatterns(utilizationHistory.data);

    // 3. Calcular desgaste estimado
    const wearEstimation = calculateWearEstimation(
      chamber,
      utilizationHistory.data,
      criticalUsagePatterns
    );

    // 4. Gerar cronograma base de manutenção
    const maintenanceSchedule = generateBaseMaintenanceSchedule(chamber, wearEstimation);

    // 5. Aplicar manutenção preditiva (se solicitado)
    if (includePredictive) {
      const predictiveMainenance = await generatePredictiveMaintenance(
        chamberId,
        wearEstimation,
        utilizationHistory.data
      );
      
      maintenanceSchedule.predictive = predictiveMainenance;
    }

    // 6. Otimizar cronograma baseado em impacto operacional
    const optimizedSchedule = optimizeMaintenanceSchedule(
      maintenanceSchedule,
      utilizationHistory.data.utilization.patterns
    );

    return {
      success: true,
      data: {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          age: calculateChamberAge(chamber),
          utilizationLevel: utilizationHistory.data.capacity.utilizationPercentage
        },
        analysis: {
          wearLevel: wearEstimation.overall,
          criticalAreas: wearEstimation.critical,
          usagePatterns: criticalUsagePatterns.summary
        },
        schedule: optimizedSchedule,
        timeline: {
          immediate: optimizedSchedule.immediate,
          nextQuarter: optimizedSchedule.nextQuarter,
          next6Months: optimizedSchedule.next6Months,
          annual: optimizedSchedule.annual
        },
        costs: {
          estimated: estimateMaintenanceCosts(optimizedSchedule),
          preventive: calculatePreventiveSavings(optimizedSchedule),
          breakdown: breakdownMaintenanceCosts(optimizedSchedule)
        },
        generatedAt: new Date(),
        validUntil: new Date(Date.now() + parseTimeframe(lookAhead))
      }
    };
  } catch (error) {
    throw new Error(`Erro na geração do cronograma de manutenção: ${error.message}`);
  }
};

/**
 * Prevê necessidades futuras de capacidade
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções da previsão
 * @returns {object} Previsão de necessidades
 */
const predictCapacityNeeds = async (chamberId, options = {}) => {
  try {
    const forecastPeriod = options.forecastPeriod || '12M';
    const basedOnPeriod = options.basedOnPeriod || '24M';
    
    // 1. Analisar histórico extenso
    const historicalAnalysis = await analyzeCapacityUtilization(chamberId, {
      timeframe: basedOnPeriod,
      includeProjections: true
    });

    // 2. Buscar tendências de movimentação
    const movementTrends = await movementService.analyzeMovementPatterns({
      chamberId,
      timeframe: basedOnPeriod,
      includeSeasonality: true,
      includeTrends: true
    });

    // 3. Analisar crescimento por tipo de produto
    const productGrowthAnalysis = await productService.analyzeProductGrowth({
      chamberId,
      timeframe: basedOnPeriod
    });

    // 4. Aplicar modelos de previsão
    const forecasts = applyForecastingModels(
      historicalAnalysis.data,
      movementTrends.data,
      productGrowthAnalysis.data,
      forecastPeriod
    );

    // 5. Identificar gargalos futuros
    const futureBottlenecks = identifyFutureBottlenecks(forecasts, chamberId);

    // 6. Gerar recomendações estratégicas
    const strategicRecommendations = generateStrategicRecommendations(
      forecasts,
      futureBottlenecks,
      historicalAnalysis.data
    );

    return {
      success: true,
      data: {
        chamber: {
          id: chamberId,
          currentCapacity: historicalAnalysis.data.capacity.total,
          currentUtilization: historicalAnalysis.data.capacity.utilizationPercentage
        },
        forecast: {
          period: forecastPeriod,
          basedOn: basedOnPeriod,
          predictions: forecasts,
          confidence: forecasts.confidenceLevel,
          scenarios: forecasts.scenarios
        },
        trends: {
          capacity: movementTrends.data.capacityTrends,
          demand: productGrowthAnalysis.data.demandTrends,
          seasonality: movementTrends.data.seasonality
        },
        futureNeeds: {
          bottlenecks: futureBottlenecks,
          expansionNeeds: forecasts.expansionRecommendations,
          timeline: forecasts.timeline
        },
        recommendations: strategicRecommendations,
        actionPlan: {
          immediate: strategicRecommendations.immediate,
          shortTerm: strategicRecommendations.shortTerm,
          longTerm: strategicRecommendations.longTerm
        },
        forecastedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na previsão de necessidades: ${error.message}`);
  }
};

/**
 * Recomenda produtos ótimos para a câmara
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções da recomendação
 * @returns {object} Recomendações de produtos
 */
const recommendOptimalProducts = async (chamberId, options = {}) => {
  try {
    // 1. Analisar condições da câmara
    const environmentalAnalysis = await monitorEnvironmentalConditions(chamberId);
    
    // 2. Analisar capacidade disponível
    const capacityAnalysis = await analyzeCapacityUtilization(chamberId);

    // 3. Integração com seedTypeService para recomendações
    const seedTypeService = require('./seedTypeService');
    const seedTypeRecommendations = await seedTypeService.recommendSeedTypesForChamber(
      chamberId,
      { includePerformanceMetrics: true }
    );

    // 4. Analisar padrões históricos de sucesso
    const historicalSuccess = await analyzeHistoricalProductSuccess(chamberId);

    // 5. Calcular recomendações otimizadas
    const optimizedRecommendations = optimizeProductRecommendations(
      seedTypeRecommendations.data,
      capacityAnalysis.data,
      environmentalAnalysis.data,
      historicalSuccess
    );

    return {
      success: true,
      data: {
        chamber: {
          id: chamberId,
          suitability: environmentalAnalysis.data.qualityScore,
          availableCapacity: capacityAnalysis.data.capacity.available
        },
        recommendations: optimizedRecommendations,
        bestMatch: seedTypeRecommendations.data.bestMatch || optimizedRecommendations.priority?.[0] || null,
        seedTypes: seedTypeRecommendations.data.recommendations || [],
        analysis: {
          environmental: environmentalAnalysis.data.compliance,
          capacity: capacityAnalysis.data.capacity,
          historical: historicalSuccess.summary
        },
        implementation: {
          priorityOrder: optimizedRecommendations.priority,
          estimatedROI: optimizedRecommendations.roi,
          riskAssessment: optimizedRecommendations.risks
        },
        recommendedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro ao recomendar produtos: ${error.message}`);
  }
};

// ========== MÉTODOS AUXILIARES ==========

/**
 * Valida dados da câmara
 */
const validateChamberData = (chamberData) => {
  const validation = { isValid: true, errors: [] };
  
  if (!chamberData.name || chamberData.name.trim().length === 0) {
    validation.isValid = false;
    validation.errors.push('Nome da câmara é obrigatório');
  }
  
  if (!chamberData.dimensions) {
    validation.isValid = false;
    validation.errors.push('Dimensões da câmara são obrigatórias');
  } else {
    const { quadras, lados, filas, andares } = chamberData.dimensions;
    if (!quadras || !lados || !filas || !andares || 
        quadras < 1 || lados < 1 || filas < 1 || andares < 1) {
      validation.isValid = false;
      validation.errors.push('Todas as dimensões devem ser pelo menos 1');
    }
  }
  
  return validation;
};

/**
 * Calcula score inicial de eficiência da câmara
 * @param {object} chamber - Dados da câmara
 * @param {object} locationData - Dados das localizações
 * @returns {number} Score de eficiência (0-100)
 */
const calculateInitialEfficiencyScore = (chamber, locationData) => {
  let score = 100;
  
  // Penalizar se não há localizações
  if (!locationData.totalGenerated || locationData.totalGenerated === 0) {
    score -= 50;
  }
  
  // Bonus por capacidade adequada
  if (chamber.capacity && chamber.capacity > 0) {
    score += 10;
  }
  
  // Bonus por dimensões balanceadas
  if (chamber.dimensions) {
    const { quadras, lados, filas, andares } = chamber.dimensions;
    const total = quadras * lados * filas * andares;
    if (total === locationData.totalGenerated) {
      score += 15;
    }
  }
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Calcula score de flexibilidade baseado nas localizações
 * @param {object} locationData - Dados das localizações
 * @returns {number} Score de flexibilidade (0-100)
 */
const calculateFlexibilityScore = (locationData) => {
  let score = 50; // Base score
  
  // Bonus por variedade de localizações
  if (locationData.totalGenerated > 50) {
    score += 20;
  } else if (locationData.totalGenerated > 20) {
    score += 10;
  }
  
  // Bonus por capacidade total
  if (locationData.summary?.totalCapacity > 50000) {
    score += 15;
  }
  
  // Bonus por distribuição equilibrada
  if (locationData.summary?.averageCapacityPerLocation > 500) {
    score += 15;
  }
  
  return Math.max(0, Math.min(100, score));
};

/**
 * Calcula métricas de capacidade
 */
const calculateCapacityMetrics = (chamber, locations, products) => {
  const totalCapacity = locations.reduce((sum, loc) => sum + loc.maxCapacityKg, 0);
  const usedCapacity = products.reduce((sum, prod) => sum + prod.totalWeight, 0);
  const availableCapacity = totalCapacity - usedCapacity;
  const utilizationPercentage = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
  
  return {
    totalCapacity,
    usedCapacity,
    availableCapacity,
    utilizationPercentage,
    distribution: calculateCapacityDistribution(locations, products)
  };
};

/**
 * Calcula distribuição de capacidade
 */
const calculateCapacityDistribution = (locations, products) => {
  // Implementar cálculo de distribuição por quadras/andares
  return {
    byQuadra: {},
    byAndar: {},
    utilizationMap: []
  };
};

/**
 * Calcula tendências de utilização
 */
const calculateUtilizationTrends = (products, movements) => {
  // Implementar análise de tendências baseada em movimentações
  const efficiencyScore = products.length > 0 ? Math.min(100, products.length * 10) : 50;
  
  return {
    efficiencyScore,
    patterns: [
      { type: 'daily', peak: '14:00-16:00' },
      { type: 'weekly', peak: 'Tuesday-Thursday' }
    ],
    trends: {
      capacity: 'stable',
      usage: 'increasing',
      efficiency: efficiencyScore > 70 ? 'good' : 'needs_improvement'
    }
  };
};

/**
 * Sugere otimizações de capacidade
 */
const suggestCapacityOptimizations = (chamber, capacityMetrics, utilizationTrends, occupancyAnalysis) => {
  const optimizations = {
    immediate: [],
    shortTerm: [],
    longTerm: []
  };
  
  // Análise de utilização
  if (capacityMetrics.utilizationPercentage > 90) {
    optimizations.immediate.push({
      type: 'capacity_expansion',
      priority: 'high',
      description: 'Câmara próxima da capacidade máxima'
    });
  }
  
  if (capacityMetrics.utilizationPercentage < 30) {
    optimizations.shortTerm.push({
      type: 'efficiency_improvement',
      priority: 'medium',
      description: 'Baixa utilização da capacidade'
    });
  }
  
  return optimizations;
};

/**
 * Parse timeframe string para milliseconds
 */
const parseTimeframe = (timeframe) => {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit.toUpperCase()) {
    case 'M': return value * 30 * 24 * 60 * 60 * 1000; // meses
    case 'D': return value * 24 * 60 * 60 * 1000; // dias
    case 'H': return value * 60 * 60 * 1000; // horas
    default: return 30 * 24 * 60 * 60 * 1000; // default 1 mês
  }
};

// Implementar outros métodos auxiliares...
const predictFutureCapacityNeeds = async (chamberId, movements, timeframe) => {
  // Implementar previsão baseada em movimentações
  return {
    expectedGrowth: 0,
    bottlenecks: [],
    recommendations: []
  };
};

const calculateIdealConditions = (products) => {
  // Calcular condições ideais baseadas nos produtos armazenados
  if (!products || products.length === 0) {
    return {
      temperature: { min: 10, max: 25, optimal: 15 },
      humidity: { min: 40, max: 70, optimal: 55 }
    };
  }

  // Agregar requisitos de todos os produtos
  let tempMin = 50, tempMax = -50, humMin = 100, humMax = 0;
  let hasRequirements = false;

  products.forEach(product => {
    if (product.storageRequirements?.temperature) {
      tempMin = Math.min(tempMin, product.storageRequirements.temperature.min || 15);
      tempMax = Math.max(tempMax, product.storageRequirements.temperature.max || 25);
      hasRequirements = true;
    }
    if (product.storageRequirements?.humidity) {
      humMin = Math.min(humMin, product.storageRequirements.humidity.min || 40);
      humMax = Math.max(humMax, product.storageRequirements.humidity.max || 60);
      hasRequirements = true;
    }
  });

  if (!hasRequirements) {
    return {
      temperature: { min: 10, max: 25, optimal: 15 },
      humidity: { min: 40, max: 70, optimal: 55 }
    };
  }

  return {
    temperature: { 
      min: tempMin, 
      max: tempMax, 
      optimal: Math.round((tempMin + tempMax) / 2) 
    },
    humidity: { 
      min: humMin, 
      max: humMax, 
      optimal: Math.round((humMin + humMax) / 2) 
    }
  };
};

const checkEnvironmentalCompliance = (chamber, idealConditions) => {
  // Verificar conformidade das condições atuais
  const tempCompliant = chamber.currentTemperature >= idealConditions.temperature.min && 
                        chamber.currentTemperature <= idealConditions.temperature.max;
  const humCompliant = chamber.currentHumidity >= idealConditions.humidity.min && 
                       chamber.currentHumidity <= idealConditions.humidity.max;

  return {
    temperature: { 
      compliant: tempCompliant, 
      deviation: tempCompliant ? 0 : Math.min(
        Math.abs(chamber.currentTemperature - idealConditions.temperature.min),
        Math.abs(chamber.currentTemperature - idealConditions.temperature.max)
      )
    },
    humidity: { 
      compliant: humCompliant, 
      deviation: humCompliant ? 0 : Math.min(
        Math.abs(chamber.currentHumidity - idealConditions.humidity.min),
        Math.abs(chamber.currentHumidity - idealConditions.humidity.max)
      )
    },
    overallCompliance: tempCompliant && humCompliant
  };
};

const getConditionHistory = async (chamberId, timeframe) => {
  // Implementar busca de histórico de condições (mock por enquanto)
  return {
    timeframe,
    dataPoints: 0,
    temperatureTrend: 'stable',
    humidityTrend: 'stable',
    averageTemperature: 18,
    averageHumidity: 55
  };
};

const generateEnvironmentalAlerts = (chamber, idealConditions, complianceCheck) => {
  const alerts = [];

  if (!complianceCheck.temperature.compliant) {
    if (complianceCheck.temperature.deviation > 10) {
      alerts.push('Temperatura crítica - ação imediata necessária');
    } else if (complianceCheck.temperature.deviation > 5) {
      alerts.push('Temperatura fora do ideal');
    }
  }

  if (!complianceCheck.humidity.compliant) {
    if (complianceCheck.humidity.deviation > 20) {
      alerts.push('Umidade crítica - verificar sistema');
    } else if (complianceCheck.humidity.deviation > 10) {
      alerts.push('Umidade fora do ideal');
    }
  }

  return alerts;
};

const calculateEnvironmentalQualityScore = (chamber, idealConditions, complianceCheck, productsCount) => {
  let score = 100;

  // Penalizar por desvios de temperatura
  if (complianceCheck.temperature.deviation > 0) {
    score -= Math.min(50, complianceCheck.temperature.deviation * 3);
  }

  // Penalizar por desvios de umidade
  if (complianceCheck.humidity.deviation > 0) {
    score -= Math.min(30, complianceCheck.humidity.deviation * 2);
  }

  // Bonus por ter produtos armazenados
  if (productsCount > 0) {
    score += 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

const generateEnvironmentalRecommendations = (chamber, idealConditions, complianceCheck) => {
  const recommendations = [];

  if (!complianceCheck.temperature.compliant) {
    if (chamber.currentTemperature > idealConditions.temperature.max) {
      recommendations.push('Reduzir temperatura da câmara');
    } else {
      recommendations.push('Aumentar temperatura da câmara');
    }
  }

  if (!complianceCheck.humidity.compliant) {
    if (chamber.currentHumidity > idealConditions.humidity.max) {
      recommendations.push('Reduzir umidade da câmara');
    } else {
      recommendations.push('Aumentar umidade da câmara');
    }
  }

  if (recommendations.length === 0) {
    recommendations.push('Condições ambientais adequadas - manter monitoramento');
  }

  return recommendations;
};

// Métodos auxiliares para outras funcionalidades
const generateLayoutOptimizations = (utilizationAnalysis, accessPatterns, productDistribution) => {
  return {
    hotspotReduction: ['Redistribuir produtos de alta rotatividade'],
    accessOptimization: ['Melhorar rotas de acesso'],
    spaceUtilization: ['Reorganizar produtos por frequência de uso']
  };
};

const calculateLayoutBenefits = (layoutOptimizations) => {
  return {
    expectedEfficiencyGain: '15-25%',
    accessTimeReduction: '20-30%',
    capacityOptimization: '10-15%',
    implementationCost: 'Baixo a médio'
  };
};

const generateReorganizationPlan = async (chamberId, layoutOptimizations, utilizationData) => {
  return {
    phases: [
      { name: 'Análise atual', duration: '1 semana', description: 'Mapear situação atual' },
      { name: 'Reorganização', duration: '2 semanas', description: 'Implementar mudanças' },
      { name: 'Otimização', duration: '1 semana', description: 'Ajustes finais' }
    ],
    estimatedDowntime: '2-4 horas',
    requiredResources: ['2-3 operadores', 'equipamento de movimentação']
  };
};

const identifyCriticalUsagePatterns = (utilizationData) => {
  return {
    summary: {
      peakUsageHours: ['09:00-11:00', '14:00-16:00'],
      heavyUsageAreas: ['Q1', 'Q2'],
      maintenanceWindows: ['22:00-06:00']
    },
    criticalFactors: ['alta rotatividade', 'acesso frequente']
  };
};

const calculateWearEstimation = (chamber, utilizationHistory, criticalPatterns) => {
  const age = calculateChamberAge(chamber);
  const utilizationLevel = utilizationHistory.capacity?.utilizationPercentage || 0;
  
  let wearLevel = 'low';
  if (age > 5 && utilizationLevel > 80) {
    wearLevel = 'high';
  } else if (age > 3 || utilizationLevel > 60) {
    wearLevel = 'medium';
  }

  return {
    overall: wearLevel,
    critical: wearLevel === 'high' ? ['sistema refrigeração', 'vedações'] : [],
    factors: { age, utilizationLevel }
  };
};

const generateBaseMaintenanceSchedule = (chamber, wearEstimation) => {
  const baseSchedule = {
    immediate: [],
    nextQuarter: ['Inspeção geral', 'Limpeza profunda'],
    next6Months: ['Manutenção preventiva sistemas'],
    annual: ['Revisão completa', 'Calibração sensores']
  };

  if (wearEstimation.overall === 'high') {
    baseSchedule.immediate.push('Inspeção urgente componentes críticos');
  }

  return baseSchedule;
};

const generatePredictiveMaintenance = async (chamberId, wearEstimation, utilizationData) => {
  return {
    riskAssessment: wearEstimation.overall === 'high' ? 'Alto' : 'Médio',
    predictedFailures: [],
    preventiveActions: ['Monitoramento contínuo', 'Inspeções regulares']
  };
};

const optimizeMaintenanceSchedule = (schedule, usagePatterns) => {
  // Otimizar cronograma baseado em padrões de uso
  return {
    ...schedule,
    optimized: true,
    schedulingNotes: 'Cronograma otimizado para minimizar impacto operacional'
  };
};

const calculateChamberAge = (chamber) => {
  const createdAt = new Date(chamber.createdAt);
  const now = new Date();
  const ageInYears = (now - createdAt) / (1000 * 60 * 60 * 24 * 365);
  return Math.max(0, Math.round(ageInYears * 10) / 10); // Arredondar para 1 casa decimal
};

const estimateMaintenanceCosts = (schedule) => {
  return {
    immediate: 'R$ 500-1.000',
    quarterly: 'R$ 2.000-3.000',
    annual: 'R$ 5.000-8.000',
    total: 'R$ 7.500-12.000'
  };
};

const calculatePreventiveSavings = (schedule) => {
  return {
    avoidedFailures: 'R$ 15.000-25.000',
    downtimeReduction: 'R$ 5.000-10.000',
    totalSavings: 'R$ 20.000-35.000'
  };
};

const breakdownMaintenanceCosts = (schedule) => {
  return {
    labor: '40%',
    parts: '35%',
    external: '15%',
    overhead: '10%'
  };
};

// Métodos para previsão de capacidade
const applyForecastingModels = (historicalData, movementTrends, productGrowth, forecastPeriod) => {
  return {
    scenarios: {
      conservative: { growthRate: 0.05, confidence: 85 },
      realistic: { growthRate: 0.10, confidence: 75 },
      optimistic: { growthRate: 0.15, confidence: 65 }
    },
    confidenceLevel: 75,
    timeline: ['3M', '6M', '12M'],
    expansionRecommendations: []
  };
};

const identifyFutureBottlenecks = (forecasts, chamberId) => {
  return {
    capacity: forecasts.scenarios.realistic.growthRate > 0.12 ? 'high_risk' : 'low_risk',
    timeline: '6-12 meses',
    areas: ['entrada/saída', 'armazenamento vertical']
  };
};

const generateStrategicRecommendations = (forecasts, futureBottlenecks, historicalData) => {
  return {
    immediate: ['Otimizar layout atual'],
    shortTerm: ['Planejar expansão se necessário'],
    longTerm: ['Considerar automação'],
    priority: futureBottlenecks.capacity === 'high_risk' ? 'Alta' : 'Média'
  };
};

// Métodos para recomendação de produtos
const analyzeHistoricalProductSuccess = async (chamberId) => {
  return {
    summary: {
      bestPerformingTypes: ['Milho', 'Soja'],
      averageStorageTime: 180,
      successRate: 95
    },
    details: []
  };
};

const optimizeProductRecommendations = (seedTypeRecommendations, capacityAnalysis, environmentalAnalysis, historicalSuccess) => {
  return {
    priority: seedTypeRecommendations.bestMatch ? [seedTypeRecommendations.bestMatch] : [],
    roi: { expected: '15-25%', timeframe: '6-12 meses' },
    risks: environmentalAnalysis.compliance.overall === 'compliant' ? 'Baixo' : 'Médio'
  };
};

/**
 * Métodos para otimização de cronograma
 */
const prioritizeOptimizations = (layoutOptimizations) => {
  // Se layoutOptimizations for um objeto, converter para array
  if (typeof layoutOptimizations === 'object' && !Array.isArray(layoutOptimizations)) {
    const optimizationArray = Object.values(layoutOptimizations).flat();
    return optimizationArray.map((opt, index) => ({
      ...opt,
      priority: index < 2 ? 'high' : 'medium'
    }));
  }
  
  // Se for array
  if (Array.isArray(layoutOptimizations)) {
    return layoutOptimizations.map((opt, index) => ({
      ...opt,
      priority: index < 2 ? 'high' : 'medium'
    }));
  }
  
  // Se não for nem array nem objeto, retornar array vazio
  return [];
};

const estimateImplementationTimeline = (layoutOptimizations) => {
  return {
    planning: '1-2 semanas',
    implementation: '2-4 semanas',
    validation: '1 semana',
    total: '4-7 semanas'
  };
};

const estimateRequiredResources = (layoutOptimizations) => {
  return {
    personnel: '2-4 operadores',
    equipment: 'empilhadeiras, equipamentos de movimentação',
    budget: 'R$ 5.000-15.000',
    downtime: '4-8 horas'
  };
};

module.exports = {
  createChamberWithLocations,
  analyzeCapacityUtilization,
  monitorEnvironmentalConditions,
  optimizeChamberLayout,
  generateMaintenanceSchedule,
  predictCapacityNeeds,
  recommendOptimalProducts,
  validateChamberData,
  calculateInitialEfficiencyScore,
  calculateFlexibilityScore,
  calculateCapacityMetrics,
  calculateCapacityDistribution,
  calculateUtilizationTrends,
  suggestCapacityOptimizations,
  parseTimeframe,
  // Métodos auxiliares adicionais
  predictFutureCapacityNeeds,
  calculateIdealConditions,
  checkEnvironmentalCompliance,
  getConditionHistory,
  generateEnvironmentalAlerts,
  calculateEnvironmentalQualityScore,
  generateEnvironmentalRecommendations,
  generateLayoutOptimizations,
  calculateLayoutBenefits,
  generateReorganizationPlan,
  identifyCriticalUsagePatterns,
  calculateWearEstimation,
  generateBaseMaintenanceSchedule,
  generatePredictiveMaintenance,
  optimizeMaintenanceSchedule,
  calculateChamberAge,
  estimateMaintenanceCosts,
  calculatePreventiveSavings,
  breakdownMaintenanceCosts,
  applyForecastingModels,
  identifyFutureBottlenecks,
  generateStrategicRecommendations,
  analyzeHistoricalProductSuccess,
  optimizeProductRecommendations,
  prioritizeOptimizations,
  estimateImplementationTimeline,
  estimateRequiredResources
}; 