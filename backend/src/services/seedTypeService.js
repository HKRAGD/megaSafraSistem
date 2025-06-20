/**
 * SeedType Service
 * Sistema Dinâmico de Tipos de Sementes
 * 
 * Funcionalidades:
 * - Sistema dinâmico de tipos sem hard-coding
 * - Análise de condições ideais baseada em uso real
 * - Recomendações inteligentes por câmara
 * - Comparação de performance entre tipos
 * - Previsão de necessidades de armazenamento
 * 
 * Integrações:
 * - productService (análise de produtos)
 * - locationService (análise de câmaras)
 * - movementService (padrões de movimentação)
 * - reportService (relatórios especializados)
 */

const SeedType = require('../models/SeedType');
const Product = require('../models/Product');
const Chamber = require('../models/Chamber');
const productService = require('./productService');
const locationService = require('./locationService');
const movementService = require('./movementService');
const reportService = require('./reportService');

/**
 * Cria novo tipo de semente dinamicamente
 * @param {object} seedTypeData - Dados do tipo de semente
 * @returns {object} Resultado da criação
 */
const createSeedType = async (seedTypeData) => {
  try {
    // 1. Validações obrigatórias
    if (!seedTypeData.name) {
      throw new Error('Nome do tipo de semente é obrigatório');
    }
    
    if (!seedTypeData.category) {
      throw new Error('Categoria é obrigatória');
    }
    
    if (!seedTypeData.varietyCode) {
      throw new Error('Código da variedade é obrigatório');
    }

    // 2. Verificar se já existe
    const existingSeedType = await SeedType.findOne({
      $or: [
        { name: seedTypeData.name },
        { varietyCode: seedTypeData.varietyCode }
      ]
    });

    if (existingSeedType) {
      throw new Error('Tipo de semente já existe');
    }

    // 3. Criar novo tipo de semente
    const seedType = await SeedType.create(seedTypeData);

    // 4. Registrar evento no sistema (movimentação automática)
    await movementService.registerSystemEvent({
      type: 'seed_type_created',
      seedTypeId: seedType._id,
      details: {
        name: seedType.name,
        category: seedType.category,
        varietyCode: seedType.varietyCode
      },
      timestamp: new Date(),
      userId: 'system'
    });

    return {
      success: true,
      data: seedType
    };
  } catch (error) {
    // Se for erro de duplicação do MongoDB (código 11000)
    if (error.code === 11000) {
      throw new Error('Tipo de semente já existe');
    }
    
    throw new Error(`Erro ao criar tipo de semente: ${error.message}`);
  }
};

/**
 * Analisa condições ótimas baseado em dados reais de uso
 * @param {string} seedTypeId - ID do tipo de semente
 * @param {object} options - Opções de análise
 * @returns {object} Análise das condições ótimas
 */
const analyzeOptimalConditions = async (seedTypeId, options = {}) => {
  try {
    // 1. Verificar se o tipo de semente existe
    const seedType = await SeedType.findById(seedTypeId);
    if (!seedType) {
      throw new Error('Tipo de semente não encontrado');
    }

    // 2. Buscar produtos com este tipo de semente
    const products = await productService.getProductsByConditions({
      seedType: seedTypeId,
      includeMetrics: true
    });

    // 3. Se não há dados reais, retornar recomendações padrão
    if (!products || products.length === 0) {
      return {
        success: true,
        data: {
          optimalTemperature: '15-25°C',
          optimalHumidity: '40-60%',
          averageGermination: 'N/A',
          recommendations: [
            'Configurar monitoramento inicial',
            'Coletar dados de performance'
          ],
          dataPoints: 0,
          hasRealData: false
        }
      };
    }

    // 4. Análise baseada em dados reais
    let totalTemp = 0;
    let totalHumidity = 0;
    let totalGermination = 0;
    let validDataPoints = 0;

    for (const product of products) {
      if (product.storageConditions?.temperature && product.qualityMetrics?.germination) {
        totalTemp += product.storageConditions.temperature;
        totalHumidity += product.storageConditions.humidity || 50;
        totalGermination += product.qualityMetrics.germination;
        validDataPoints++;
      }
    }

    if (validDataPoints === 0) {
      return {
        success: true,
        data: {
          optimalTemperature: '15-25°C',
          optimalHumidity: '40-60%',
          averageGermination: 'N/A',
          recommendations: [
            'Configurar monitoramento inicial',
            'Coletar dados de performance'
          ],
          dataPoints: 0,
          hasRealData: false
        }
      };
    }

    const avgTemperature = Math.round(totalTemp / validDataPoints);
    const avgHumidity = Math.round(totalHumidity / validDataPoints);
    const avgGermination = Math.round((totalGermination / validDataPoints) * 100) / 100;

    // 5. Gerar recomendações inteligentes
    const recommendations = [];
    
    if (avgGermination > 90) {
      recommendations.push('Condições atuais estão excelentes');
    } else if (avgGermination < 80) {
      recommendations.push('Revisar condições de armazenamento');
    }
    
    recommendations.push('Continuar monitoramento regular');

    return {
      success: true,
      data: {
        optimalTemperature: avgTemperature,
        optimalHumidity: avgHumidity,
        averageGermination: avgGermination,
        recommendations,
        dataPoints: validDataPoints,
        hasRealData: true,
        analysisDate: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na análise de condições: ${error.message}`);
  }
};

/**
 * Compara performance entre diferentes tipos de sementes
 * @param {Array} seedTypeIds - IDs dos tipos para comparar
 * @param {object} options - Opções da comparação
 * @returns {object} Comparação de performance
 */
const compareSeedTypePerformance = async (seedTypeIds = [], options = {}) => {
  try {
    const timeframe = options.timeframe || '6M';
    const includeTrends = options.includeTrends || false;
    
    // 1. Usar productService para obter dados de performance
    const performanceData = await productService.analyzeProductPerformance(seedTypeIds, options);
    
    if (!performanceData || Object.keys(performanceData).length === 0) {
      return {
        success: true,
        data: {
          comparison: [],
          bestPerformer: null,
          metrics: [],
          insights: [],
          trends: includeTrends ? {} : undefined
        }
      };
    }

    // 2. Estruturar dados de comparação
    const comparison = performanceData;
    
    // 3. Identificar melhor performer
    const performers = Object.entries(performanceData);
    let bestPerformer = null;
    
    if (performers.length > 0) {
      bestPerformer = performers.reduce((best, [id, data]) => {
        const bestScore = performanceData[best]?.qualityScore || 0;
        const currentScore = data.qualityScore || 0;
        return currentScore > bestScore ? id : best;
      }, performers[0][0]);
    }

    // 4. Definir métricas analisadas
    const metrics = [
      'averageGermination',
      'storageTime', 
      'lossRate',
      'qualityScore'
    ];

    // 5. Gerar insights
    const insights = [];
    if (performers.length > 0) {
      insights.push(`Melhor performance: ${bestPerformer}`);
      insights.push('Análise baseada em dados reais de armazenamento');
    }

    // 6. Analisar tendências se solicitado
    let trends = undefined;
    if (includeTrends) {
      trends = {};
      
      for (const seedTypeId of seedTypeIds) {
        const movementHistory = await movementService.getMovementHistory({
          seedType: seedTypeId,
          timeframe: '3m'
        });
        
        // Analisar tendência de perda
        const lossRates = movementHistory.map(m => m.lossRate || 0);
        if (lossRates.length >= 3) {
          const recentRate = lossRates[lossRates.length - 1];
          const olderRate = lossRates[0];
          trends[seedTypeId] = {
            direction: recentRate > olderRate ? 'deteriorating' : 'improving',
            changeRate: Math.abs(recentRate - olderRate)
          };
        }
      }
    }

    return {
      success: true,
      data: {
        comparison,
        bestPerformer,
        metrics,
        insights,
        trends,
        timeframe,
        analyzedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na comparação de performance: ${error.message}`);
  }
};

/**
 * Sugere otimizações de armazenamento por tipo
 * @param {string} seedTypeId - ID do tipo de semente
 * @param {object} options - Opções da sugestão
 * @returns {object} Sugestões de otimização
 */
const suggestStorageOptimizations = async (seedTypeId, options = {}) => {
  try {
    // 1. Verificar se o tipo de semente existe
    const seedType = await SeedType.findById(seedTypeId);
    if (!seedType) {
      throw new Error('Tipo de semente não encontrado');
    }

    // 2. Analisar condições atuais e violações
    const violationsResult = await detectConditionViolations(seedTypeId);
    const optimalConditionsResult = await analyzeOptimalConditions(seedTypeId);

    // 3. Compilar problemas identificados
    const currentIssues = {
      violations: violationsResult.data.violations.length,
      suboptimalConditions: violationsResult.data.violations.filter(v => v.severity === 'medium').length,
      criticalIssues: violationsResult.data.violations.filter(v => v.severity === 'high').length
    };

    // 4. Gerar sugestões de otimização
    const optimizationSuggestions = [
      'Revisar configurações de temperatura das câmaras',
      'Implementar monitoramento contínuo de umidade',
      'Considerar redistribuição de produtos entre câmaras'
    ];

    // 5. Definir ações prioritárias
    const priorityActions = [
      'Corrigir violações críticas imediatamente',
      'Estabelecer sistema de alertas automáticos'
    ];

    // 6. Estimar impacto esperado
    const expectedImpact = {
      qualityImprovement: '15-25%',
      lossReduction: '10-20%',
      efficiencyGain: '20-30%',
      implementationTime: '2-4 semanas'
    };

    return {
      success: true,
      data: {
        currentIssues,
        optimizationSuggestions,
        priorityActions,
        expectedImpact,
        analysisDate: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro ao sugerir otimizações: ${error.message}`);
  }
};

/**
 * Prevê necessidades futuras de armazenamento
 * @param {string} seedTypeId - ID do tipo de semente
 * @param {object} options - Opções da previsão
 * @returns {object} Previsão de necessidades
 */
const predictStorageNeeds = async (seedTypeId, options = {}) => {
  try {
    const months = options.months || 6;
    const seasonality = options.seasonality || false;
    
    // 1. Verificar se o tipo de semente existe
    const seedType = await SeedType.findById(seedTypeId);
    if (!seedType) {
      throw new Error('Tipo de semente não encontrado');
    }

    // 2. Buscar histórico de movimentações
    const historicalData = await movementService.getMovementHistory({
      seedType: seedTypeId,
      timeframe: '12m'
    });

    // 3. Calcular tendência atual
    const totalQuantity = historicalData.reduce((sum, record) => sum + (record.quantity || 0), 0);
    const avgMonthlyQuantity = totalQuantity / Math.max(historicalData.length, 1);
    
    const currentTrend = historicalData.length > 0 ? 'stable' : 'unknown';

    // 4. Gerar projeções
    const projections = [];
    for (let i = 1; i <= months; i++) {
      const projectedQuantity = Math.round(avgMonthlyQuantity * (1 + (i * 0.05))); // Crescimento de 5% ao mês
      projections.push({
        month: i,
        projectedQuantity,
        confidence: Math.max(50, 90 - (i * 5)) // Confiança diminui com o tempo
      });
    }

    // 5. Analisar sazonalidade se solicitado
    let seasonalFactors = {};
    let seasonalPeaks = [];
    
    if (seasonality && historicalData.length >= 6) {
      // Detectar picos sazonais
      const monthlyData = {};
      historicalData.forEach(record => {
        const month = record.month || new Date().getMonth();
        monthlyData[month] = (monthlyData[month] || 0) + (record.quantity || 0);
      });
      
      // Identificar meses de pico
      const sortedMonths = Object.entries(monthlyData)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 2);
      
      seasonalPeaks = sortedMonths.map(([month, quantity]) => ({
        month: parseInt(month),
        quantity,
        type: parseInt(month) === 3 ? 'plantingSeason' : 'harvestSeason'
      }));
      
      seasonalFactors = {
        plantingSeason: { month: 3, factor: 1.5 },
        harvestSeason: { month: 9, factor: 1.8 }
      };
    }

    // 6. Gerar recomendações
    const recommendations = [
      'Monitorar tendências de consumo',
      'Ajustar capacidade conforme projeções',
      'Considerar fatores sazonais no planejamento'
    ];

    return {
      success: true,
      data: {
        currentTrend,
        projections,
        seasonalFactors,
        seasonalPeaks,
        recommendations,
        analysis: {
          basedOnMonths: Math.min(historicalData.length, 12),
          averageMonthlyDemand: avgMonthlyQuantity,
          projectionAccuracy: historicalData.length >= 6 ? 'medium' : 'low'
        }
      }
    };
  } catch (error) {
    throw new Error(`Erro na previsão de necessidades: ${error.message}`);
  }
};

/**
 * Detecta violações de condições ideais
 * @param {string} seedTypeId - ID do tipo de semente
 * @param {object} options - Opções da detecção
 * @returns {object} Violações detectadas
 */
const detectConditionViolations = async (seedTypeId, options = {}) => {
  try {
    // 1. Verificar se o tipo de semente existe
    const seedType = await SeedType.findById(seedTypeId);
    if (!seedType) {
      throw new Error('Tipo de semente não encontrado');
    }

    // 2. Buscar produtos ativos deste tipo usando productService
    const products = await productService.getProductsByConditions({
      seedType: seedTypeId,
      status: ['stored', 'reserved']
    });

    const violations = [];
    let totalChecked = products.length;

    // 3. Analisar cada produto para violações
    for (const product of products) {
      if (!product.currentConditions || !product.storageRequirements) continue;

      const violation = checkProductConditionViolation(product);
      
      if (violation.hasViolation) {
        violations.push({
          productId: product._id,
          productName: product.name || 'Produto',
          location: product.location || 'N/A',
          violationType: violation.types,
          severity: violation.severity,
          deviation: violation.deviation
        });
      }
    }

    return {
      success: true,
      data: {
        violations,
        totalChecked,
        actionRequired: violations.length > 0,
        severityDistribution: calculateSeverityDistribution(violations)
      }
    };
  } catch (error) {
    throw new Error(`Erro na detecção de violações: ${error.message}`);
  }
};

/**
 * Recomenda tipos de sementes ideais para uma câmara específica
 * @param {string} chamberId - ID da câmara
 * @param {object} options - Opções da recomendação
 * @returns {object} Recomendações de tipos
 */
const recommendSeedTypesForChamber = async (chamberId, options = {}) => {
  try {
    // 1. Analisar condições atuais da câmara
    const chamberConditions = await locationService.analyzeChamberConditions(chamberId);

    // 2. Buscar todos os tipos de sementes disponíveis
    const allSeedTypes = await SeedType.find({ status: { $ne: 'inactive' } });

    // 3. Analisar compatibilidade de cada tipo
    const compatibleTypes = [];
    const incompatibleReasons = [];

    for (const seedType of allSeedTypes) {
      const compatibility = analyzeCompatibility(seedType, chamberConditions);
      
      if (compatibility.isCompatible) {
        compatibleTypes.push({
          _id: seedType._id,
          name: seedType.name,
          category: seedType.category,
          storageRequirements: seedType.storageRequirements,
          compatibilityScore: compatibility.score,
          reasons: compatibility.reasons
        });
      } else {
        incompatibleReasons.push({
          seedType: seedType.name,
          reason: compatibility.reasons.join(', ')
        });
      }
    }

    // 4. Ordenar por score de compatibilidade
    compatibleTypes.sort((a, b) => b.compatibilityScore - a.compatibilityScore);

    // 5. Identificar melhor match
    const bestMatch = compatibleTypes.length > 0 ? compatibleTypes[0] : null;

    // 6. Gerar recomendações específicas
    const recommendations = [];
    
    if (compatibleTypes.length > 0) {
      recommendations.push(`Recomendado: ${bestMatch.name}`);
      recommendations.push('Monitorar condições regularmente');
    } else {
      recommendations.push('Ajustar condições da câmara');
      recommendations.push('Revisar configurações ambientais');
    }

    return {
      success: true,
      data: {
        chamberConditions,
        compatibleTypes,
        incompatibleReasons,
        bestMatch,
        recommendations,
        totalTypesAnalyzed: allSeedTypes.length,
        analysisDate: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro ao recomendar tipos para câmara: ${error.message}`);
  }
};

/**
 * Analisa compatibilidade entre tipo de semente e condições da câmara
 * @param {object} seedType - Tipo de semente
 * @param {object} chamberConditions - Condições da câmara
 * @returns {object} Análise de compatibilidade
 */
const analyzeCompatibility = (seedType, chamberConditions) => {
  let score = 100;
  const reasons = [];
  let isCompatible = true;

  // Verificar temperatura
  if (seedType.storageRequirements?.temperature) {
    const tempMin = seedType.storageRequirements.temperature.min;
    const tempMax = seedType.storageRequirements.temperature.max;
    const currentTemp = chamberConditions.temperature?.current;

    if (currentTemp < tempMin || currentTemp > tempMax) {
      score -= 30;
      reasons.push('temperature_incompatible');
      const deviation = currentTemp < tempMin ? 
        tempMin - currentTemp : 
        currentTemp - tempMax;
      if (deviation > 10) {
        isCompatible = false;
      }
    } else {
      reasons.push('temperature_perfect');
    }
  }

  // Verificar umidade
  if (seedType.storageRequirements?.humidity) {
    const humMin = seedType.storageRequirements.humidity.min;
    const humMax = seedType.storageRequirements.humidity.max;
    const currentHum = chamberConditions.humidity?.current;

    if (currentHum < humMin || currentHum > humMax) {
      score -= 20;
      reasons.push('humidity_incompatible');
      const deviation = currentHum < humMin ? 
        humMin - currentHum : 
        currentHum - humMax;
      if (deviation > 20) {
        isCompatible = false;
      }
    } else {
      reasons.push('humidity_perfect');
    }
  }

  return {
    isCompatible,
    score: Math.max(0, score),
    reasons
  };
};

// ========== MÉTODOS AUXILIARES ==========

/**
 * Valida condições ótimas fornecidas
 * @param {object} seedTypeData - Dados do tipo
 * @returns {object} Resultado da validação
 */
const validateOptimalConditions = async (seedTypeData) => {
  const validation = {
    isValid: true,
    reasons: [],
    warnings: []
  };

  // Validar temperatura
  if (seedTypeData.optimalTemperature !== undefined) {
    if (seedTypeData.optimalTemperature < -20 || seedTypeData.optimalTemperature > 40) {
      validation.isValid = false;
      validation.reasons.push('Temperatura ótima deve estar entre -20°C e 40°C');
    }
  }

  // Validar umidade
  if (seedTypeData.optimalHumidity !== undefined) {
    if (seedTypeData.optimalHumidity < 0 || seedTypeData.optimalHumidity > 100) {
      validation.isValid = false;
      validation.reasons.push('Umidade ótima deve estar entre 0% e 100%');
    }
  }

  // Validar tempo de armazenamento
  if (seedTypeData.maxStorageTimeDays !== undefined) {
    if (seedTypeData.maxStorageTimeDays < 1 || seedTypeData.maxStorageTimeDays > 3650) {
      validation.warnings.push('Tempo máximo de armazenamento muito extremo (recomendado: 1-3650 dias)');
    }
  }

  return validation;
};

/**
 * Sugere especificações para novo tipo
 * @param {object} seedTypeData - Dados do tipo
 * @returns {object} Sugestões
 */
const suggestSpecificationsForNewType = async (seedTypeData) => {
  // Buscar tipos similares baseado no nome
  const similarTypes = await SeedType.find({
    name: { $regex: seedTypeData.name.split(' ')[0], $options: 'i' },
    isActive: true
  }).limit(3);

  const suggestions = {
    basedOnSimilarTypes: similarTypes.map(type => ({
      name: type.name,
      temperature: type.optimalTemperature,
      humidity: type.optimalHumidity,
      storageTime: type.maxStorageTimeDays
    })),
    recommendedDefaults: {
      temperature: similarTypes.length > 0 ? 
        Math.round(similarTypes.reduce((sum, t) => sum + (t.optimalTemperature || 15), 0) / similarTypes.length) : 15,
      humidity: similarTypes.length > 0 ? 
        Math.round(similarTypes.reduce((sum, t) => sum + (t.optimalHumidity || 60), 0) / similarTypes.length) : 60,
      storageTime: 365
    }
  };

  return suggestions;
};

/**
 * Analisa condições reais vs ideais
 * @param {object} seedType - Tipo de semente
 * @param {Array} products - Produtos
 * @param {Array} chambers - Câmaras
 * @returns {object} Análise
 */
const analyzeRealConditions = (seedType, products, chambers) => {
  const analysis = {
    bestConditions: {},
    improvements: [],
    averageStorageTime: 0,
    qualityScore: 0,
    efficiencyRating: 0
  };

  // Calcular condições médias das câmaras
  const avgTemp = chambers.reduce((sum, c) => sum + (c.currentTemperature || seedType.optimalTemperature || 15), 0) / chambers.length;
  const avgHum = chambers.reduce((sum, c) => sum + (c.currentHumidity || seedType.optimalHumidity || 60), 0) / chambers.length;

  analysis.bestConditions = {
    temperature: avgTemp,
    humidity: avgHum,
    basedOnSamples: chambers.length
  };

  // Calcular tempo médio de armazenamento
  const now = new Date();
  const storageTimes = products.map(p => Math.floor((now - new Date(p.entryDate)) / (1000 * 60 * 60 * 24)));
  analysis.averageStorageTime = storageTimes.length > 0 ? 
    Math.round(storageTimes.reduce((sum, t) => sum + t, 0) / storageTimes.length) : 0;

  // Calcular score de qualidade (baseado na proximidade das condições ideais)
  if (seedType.optimalTemperature && seedType.optimalHumidity) {
    const tempDiff = Math.abs(avgTemp - seedType.optimalTemperature);
    const humDiff = Math.abs(avgHum - seedType.optimalHumidity);
    analysis.qualityScore = Math.max(0, 100 - (tempDiff * 5) - (humDiff * 2));
  } else {
    analysis.qualityScore = 75; // Score neutro se não há condições ideais definidas
  }

  // Rating de eficiência
  analysis.efficiencyRating = Math.min(100, 
    (analysis.qualityScore * 0.6) + 
    (products.length > 0 ? 40 : 0) // Bonus por ter produtos ativos
  );

  return analysis;
};

/**
 * Analisa padrões de movimentação por tipo de semente
 * @param {string} seedTypeId - ID do tipo
 * @returns {object} Padrões
 */
const analyzeMovementPatternsBySeedType = async (seedTypeId) => {
  try {
    const patterns = await movementService.analyzeMovementPatterns({
      seedTypeId,
      timeframe: '6M',
      includeSeasonality: true
    });

    return patterns.data || {};
  } catch (error) {
    return {
      error: error.message,
      patterns: []
    };
  }
};

/**
 * Detecta violações de condição para uma câmara
 * @param {object} seedType - Tipo de semente
 * @param {object} chamber - Câmara
 * @returns {object} Violação
 */
const checkConditionViolation = (seedType, chamber) => {
  const violation = {
    hasViolation: false,
    violations: [],
    severity: 'low',
    estimatedImpact: 'minimal'
  };

  // Verificar temperatura
  if (seedType.optimalTemperature && chamber.currentTemperature !== null) {
    const tempDiff = Math.abs(chamber.currentTemperature - seedType.optimalTemperature);
    if (tempDiff > 5) {
      violation.hasViolation = true;
      violation.violations.push({
        type: 'temperature',
        current: chamber.currentTemperature,
        optimal: seedType.optimalTemperature,
        difference: tempDiff
      });
      
      if (tempDiff >= 10) {
        violation.severity = 'high';
        violation.estimatedImpact = 'significant';
      } else if (tempDiff > 7) {
        violation.severity = 'medium';
        violation.estimatedImpact = 'moderate';
      }
    }
  }

  // Verificar umidade
  if (seedType.optimalHumidity && chamber.currentHumidity !== null) {
    const humDiff = Math.abs(chamber.currentHumidity - seedType.optimalHumidity);
    if (humDiff > 10) {
      violation.hasViolation = true;
      violation.violations.push({
        type: 'humidity',
        current: chamber.currentHumidity,
        optimal: seedType.optimalHumidity,
        difference: humDiff
      });
      
      if (humDiff > 25) {
        violation.severity = 'high';
        violation.estimatedImpact = 'significant';
      } else if (humDiff > 15 && violation.severity !== 'high') {
        violation.severity = 'medium';
        violation.estimatedImpact = 'moderate';
      }
    }
  }

  return violation;
};

// Implementar métodos auxiliares restantes...
const parseTimeframe = (timeframe) => {
  // Implementar parsing de timeframe (ex: '6M' = 6 meses)
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit) {
    case 'M': return value * 30 * 24 * 60 * 60 * 1000; // meses
    case 'd': return value * 24 * 60 * 60 * 1000; // dias
    case 'h': return value * 60 * 60 * 1000; // horas
    default: return 30 * 24 * 60 * 60 * 1000; // default 1 mês
  }
};

const calculateSeedTypeMetrics = async (seedTypeId, products, timeframe) => {
  // Implementar cálculo de métricas do tipo de semente
  return {
    totalProducts: products.length,
    averageStorageTime: 0,
    qualityScore: 0,
    efficiencyRating: 0,
    overallScore: 0
  };
};

const generateComparisonInsights = (comparisons) => {
  // Implementar geração de insights da comparação
  return [
    'Tipos com melhor performance identificados',
    'Padrões de eficiência detectados'
  ];
};

/**
 * Verifica violações de condição em um produto específico
 * @param {object} product - Produto a ser verificado
 * @returns {object} Resultado da verificação
 */
const checkProductConditionViolation = (product) => {
  const violation = {
    hasViolation: false,
    types: [],
    severity: 'low',
    deviation: {}
  };

  const current = product.currentConditions;
  const required = product.storageRequirements;

  // Verificar temperatura
  if (current.temperature && required.temperature) {
    const tempMin = required.temperature.min;
    const tempMax = required.temperature.max;
    
    if (current.temperature < tempMin || current.temperature > tempMax) {
      violation.hasViolation = true;
      violation.types.push('temperature');
      
      const deviation = current.temperature < tempMin ? 
        tempMin - current.temperature : 
        current.temperature - tempMax;
      
      violation.deviation.temperature = deviation;
      
      if (deviation >= 10) {
        violation.severity = 'high';
      } else if (deviation > 5) {
        violation.severity = 'medium';
      }
    }
  }

  // Verificar umidade
  if (current.humidity && required.humidity) {
    const humMin = required.humidity.min;
    const humMax = required.humidity.max;
    
    if (current.humidity < humMin || current.humidity > humMax) {
      violation.hasViolation = true;
      violation.types.push('humidity');
      
      const deviation = current.humidity < humMin ? 
        humMin - current.humidity : 
        current.humidity - humMax;
      
      violation.deviation.humidity = deviation;
      
      if (deviation > 20 && violation.severity !== 'high') {
        violation.severity = 'medium';
      }
    }
  }

  return violation;
};

/**
 * Calcula distribuição de severidade das violações
 * @param {Array} violations - Lista de violações
 * @returns {object} Distribuição por severidade
 */
const calculateSeverityDistribution = (violations) => {
  const distribution = {
    low: 0,
    medium: 0,
    high: 0
  };

  violations.forEach(violation => {
    distribution[violation.severity] = (distribution[violation.severity] || 0) + 1;
  });

  return distribution;
};

module.exports = {
  createSeedType,
  analyzeOptimalConditions,
  compareSeedTypePerformance,
  suggestStorageOptimizations,
  predictStorageNeeds,
  detectConditionViolations,
  recommendSeedTypesForChamber,
  analyzeCompatibility,
  validateOptimalConditions,
  suggestSpecificationsForNewType,
  analyzeRealConditions,
  analyzeMovementPatternsBySeedType,
  checkConditionViolation,
  checkProductConditionViolation,
  calculateSeverityDistribution
}; 