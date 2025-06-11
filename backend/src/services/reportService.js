/**
 * ReportService - Geração de Relatórios Avançados
 * Objetivos: Relatórios gerenciais para Sistema de Câmaras Refrigeradas
 * Funcionalidades: Estoque, movimentações, capacidade, análises, exportação
 * Integração: locationService, productService, movementService
 */

const Product = require('../models/Product');
const Movement = require('../models/Movement');
const Location = require('../models/Location');
const Chamber = require('../models/Chamber');
const SeedType = require('../models/SeedType');
const User = require('../models/User');

const locationService = require('./locationService');
const productService = require('./productService');
const movementService = require('./movementService');

/**
 * Relatório completo de estoque atual
 * @param {Object} filters - Filtros do relatório
 * @param {Object} options - Opções de geração
 * @returns {Object} Relatório de estoque
 */
const generateInventoryReport = async (filters = {}, options = {}) => {
  try {
    const {
      includeChamberBreakdown = true,
      includeExpirationAnalysis = true,
      includeValueAnalysis = false,
      includeOptimization = true,
      format = 'detailed'
    } = options;

    const {
      chamberId,
      seedTypeId,
      status = ['stored', 'reserved'],
      expirationDays,
      includeInactive = false
    } = filters;

    // 1. Query base para produtos
    const baseQuery = { status: { $in: status } };
    if (chamberId) {
      const locations = await Location.find({ chamberId }).select('_id');
      baseQuery.locationId = { $in: locations.map(l => l._id) };
    }
    if (seedTypeId) baseQuery.seedTypeId = seedTypeId;

    // 2. Buscar produtos com dados completos
    const products = await Product.find(baseQuery)
      .populate('seedTypeId', 'name optimalTemperature optimalHumidity maxStorageTimeDays')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg')
      .populate({
        path: 'locationId',
        populate: { path: 'chamberId', select: 'name currentTemperature currentHumidity' }
      })
      .sort({ 'locationId.chamberId': 1, 'locationId.code': 1 });

    // 3. Análise por câmara
    let chamberBreakdown = {};
    if (includeChamberBreakdown) {
      chamberBreakdown = await generateChamberBreakdown(products);
    }

    // 4. Análise de expiração
    let expirationAnalysis = {};
    if (includeExpirationAnalysis) {
      expirationAnalysis = await analyzeProductExpiration(products);
    }

    // 5. Análise de otimização
    let optimizationSuggestions = [];
    if (includeOptimization) {
      optimizationSuggestions = await generateOptimizationSuggestions(products);
    }

    // 6. Estatísticas consolidadas
    const locationsOccupied = new Set(products.map(p => p.locationId._id.toString())).size;
    
    // Calcular total de localizações para taxa de ocupação
    const allChambers = new Set(products.map(p => p.locationId.chamberId._id.toString()));
    let totalLocations = 0;
    if (allChambers.size > 0) {
      const chambersData = await Chamber.find({ 
        _id: { $in: Array.from(allChambers) } 
      });
      totalLocations = chambersData.reduce((sum, chamber) => {
        return sum + (chamber.dimensions.quadras * chamber.dimensions.lados * 
                     chamber.dimensions.filas * chamber.dimensions.andares);
      }, 0);
    }
    
    const statistics = {
      totalProducts: products.length,
      totalWeight: products.reduce((sum, p) => sum + p.totalWeight, 0),
      totalQuantity: products.reduce((sum, p) => sum + p.quantity, 0),
      uniqueSeedTypes: new Set(products.map(p => p.seedTypeId._id.toString())).size,
      chambersInUse: new Set(products.map(p => p.locationId.chamberId._id.toString())).size,
      locationsOccupied,
      totalLocations,
      occupancyRate: totalLocations > 0 ? Math.round((locationsOccupied / totalLocations) * 100) : 0,
      averageStorageTime: await calculateAverageStorageTime(products)
    };

    // 7. Formatação por tipo
    const report = {
      metadata: {
        generatedAt: new Date(),
        generatedBy: 'ReportService',
        reportType: 'inventory',
        filters,
        options
      },
      summary: statistics,
      data: {
        products: format === 'summary' ? products.slice(0, 50) : products,
        chamberBreakdown,
        expirationAnalysis,
        optimizationSuggestions
      }
    };

    return {
      success: true,
      data: report
    };

  } catch (error) {
    throw new Error(`Erro ao gerar relatório de estoque: ${error.message}`);
  }
};

/**
 * Relatório de movimentações por período
 * @param {Object} filters - Filtros do relatório
 * @param {Object} options - Opções de geração
 * @returns {Object} Relatório de movimentações
 */
const generateMovementReport = async (filters = {}, options = {}) => {
  try {
    const {
      includePatternAnalysis = true,
      includeUserActivity = true,
      includeEfficiencyMetrics = true,
      groupBy = 'day'
    } = options;

    const {
      startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      endDate = new Date(),
      movementType,
      userId,
      chamberId
    } = filters;

    // 1. Buscar movimentações reais primeiro
    const baseQuery = {
      timestamp: { $gte: startDate, $lte: endDate },
      status: { $ne: 'cancelled' }
    };

    if (movementType) baseQuery.type = movementType;
    if (userId) baseQuery.userId = userId;

    // Se filtro por câmara, buscar localizações dessa câmara
    if (chamberId) {
      const locations = await Location.find({ chamberId }).select('_id');
      const locationIds = locations.map(l => l._id);
      baseQuery.$or = [
        { fromLocationId: { $in: locationIds } },
        { toLocationId: { $in: locationIds } }
      ];
    }

    // Buscar movimentações com dados populados
    const movements = await Movement.find(baseQuery)
      .populate('productId', 'name lot totalWeight status')
      .populate('userId', 'name email role')
      .populate('fromLocationId', 'code coordinates chamberId')
      .populate('toLocationId', 'code coordinates chamberId')
      .populate({
        path: 'fromLocationId',
        populate: { path: 'chamberId', select: 'name' }
      })
      .populate({
        path: 'toLocationId',
        populate: { path: 'chamberId', select: 'name' }
      })
      .sort({ timestamp: -1 });

    // 2. Usar movementService para análise de padrões
    const patterns = await movementService.analyzeMovementPatterns(filters, {
      includeHourlyPatterns: includePatternAnalysis,
      includeUserPatterns: includeUserActivity,
      includeLocationPatterns: true,
      includeAnomalies: true
    });

    // 3. Análise temporal detalhada
    const temporalAnalysis = await generateTemporalAnalysis(filters, groupBy);

    // 4. Métricas de eficiência
    let efficiencyMetrics = {};
    if (includeEfficiencyMetrics) {
      efficiencyMetrics = await calculateMovementEfficiency(filters);
    }

    // 5. Top movimentações e produtos
    const topAnalysis = await generateTopMovementsAnalysis(filters);

    const report = {
      metadata: {
        generatedAt: new Date(),
        reportType: 'movements',
        period: { startDate, endDate },
        filters
      },
      summary: patterns.data.summary,
      movements: movements,
      analysis: {
        patterns: patterns.data.patterns,
        temporal: temporalAnalysis,
        efficiency: efficiencyMetrics,
        anomalies: patterns.data.anomalies,
        topAnalysis
      }
    };

    return {
      success: true,
      data: report
    };

  } catch (error) {
    throw new Error(`Erro ao gerar relatório de movimentações: ${error.message}`);
  }
};

/**
 * Relatório de produtos próximos ao vencimento
 * @param {Object} criteria - Critérios de análise
 * @returns {Object} Relatório de expiração
 */
const generateExpirationReport = async (criteria = {}) => {
  try {
    const {
      days = 30,
      includeCritical = true,
      includeRecommendations = true,
      groupByChamber = true
    } = criteria;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);

    // 1. Buscar produtos próximos ao vencimento
    const expiringProducts = await Product.find({
      status: { $in: ['stored', 'reserved'] },
      expirationDate: { $lte: cutoffDate, $gte: new Date() }
    })
    .populate('seedTypeId', 'name maxStorageTimeDays')
    .populate('locationId', 'code coordinates chamberId')
    .populate({ path: 'locationId', populate: { path: 'chamberId', select: 'name' } })
    .sort({ expirationDate: 1 });

    // 2. Classificar por urgência
    const classification = classifyByExpiration(expiringProducts);

    // 3. Agrupamento por câmara
    let chamberGroups = {};
    if (groupByChamber) {
      chamberGroups = groupProductsByChamber(expiringProducts);
    }

    // 4. Produtos já vencidos
    let expiredProducts = [];
    if (includeCritical) {
      expiredProducts = await Product.find({
        status: { $in: ['stored', 'reserved'] },
        expirationDate: { $lt: new Date() }
      })
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code')
      .populate({ path: 'locationId', populate: { path: 'chamberId', select: 'name' } });
    }

    // 5. Recomendações
    let recommendations = [];
    if (includeRecommendations) {
      recommendations = generateExpirationRecommendations(classification, expiredProducts);
    }

    const report = {
      metadata: {
        generatedAt: new Date(),
        reportType: 'expiration',
        criteria
      },
      summary: {
        totalExpiring: expiringProducts.length,
        totalExpired: expiredProducts.length,
        daysAnalyzed: days,
        criticalCount: classification.critical?.length || 0,
        warningCount: classification.warning?.length || 0
      },
      data: {
        classification,
        chamberGroups,
        expiredProducts,
        recommendations
      }
    };

    return {
      success: true,
      data: report
    };

  } catch (error) {
    throw new Error(`Erro ao gerar relatório de expiração: ${error.message}`);
  }
};

/**
 * Relatório de capacidade e ocupação
 * @param {Object} filters - Filtros do relatório
 * @returns {Object} Relatório de capacidade
 */
const generateCapacityReport = async (filters = {}) => {
  try {
    const { chamberId, includeProjections = true } = filters;

    // 1. Análise detalhada por câmara
    const chamberQuery = chamberId ? { _id: chamberId } : {};
    const chambers = await Chamber.find(chamberQuery);

    const chamberAnalysis = [];
    for (const chamber of chambers) {
      const analysis = await analyzeChamberCapacity(chamber);
      chamberAnalysis.push(analysis);
    }

    // 2. Projeções de capacidade
    let projections = {};
    if (includeProjections) {
      projections = await generateCapacityProjections(chamberAnalysis);
    }

    // 3. Alertas de capacidade
    const alerts = generateCapacityAlerts(chamberAnalysis);

    const report = {
      metadata: {
        generatedAt: new Date(),
        reportType: 'capacity',
        filters
      },
      summary: {
        totalChambers: chambers.length,
        averageUtilization: chamberAnalysis.length > 0 
          ? chamberAnalysis.reduce((sum, c) => sum + c.utilizationRate, 0) / chamberAnalysis.length 
          : 0,
        totalCapacity: chamberAnalysis.reduce((sum, c) => sum + c.totalCapacity, 0),
        totalUsed: chamberAnalysis.reduce((sum, c) => sum + c.usedCapacity, 0)
      },
      data: {
        chamberAnalysis,
        projections,
        alerts
      }
    };

    return {
      success: true,
      data: report
    };

  } catch (error) {
    throw new Error(`Erro ao gerar relatório de capacidade: ${error.message}`);
  }
};

/**
 * Dashboard executivo com KPIs principais
 * @param {Object} options - Opções do dashboard
 * @returns {Object} Dashboard executivo
 */
const generateExecutiveDashboard = async (options = {}) => {
  try {
    const {
      period = 30,
      includeComparisons = true,
      includeTrends = true
    } = options;

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - period * 24 * 60 * 60 * 1000);

    // 1. KPIs principais
    const kpis = await calculateMainKPIs(startDate, endDate);

    // 2. Comparações com período anterior
    let comparisons = {};
    if (includeComparisons) {
      const prevStartDate = new Date(startDate.getTime() - period * 24 * 60 * 60 * 1000);
      const prevKpis = await calculateMainKPIs(prevStartDate, startDate);
      comparisons = calculateKPIComparisons(kpis, prevKpis);
    }

    // 3. Tendências
    let trends = {};
    if (includeTrends) {
      trends = await calculateTrends(period);
    }

    // 4. Alertas críticos
    const criticalAlerts = await getCriticalAlerts();

    // 5. Top produtos e movimentações
    const topData = await getTopPerformers(startDate, endDate);

    const dashboard = {
      metadata: {
        generatedAt: new Date(),
        reportType: 'executive_dashboard',
        period: { startDate, endDate, days: period }
      },
      kpis,
      comparisons,
      trends,
      alerts: criticalAlerts,
      topData,
      quickStats: {
        lastUpdate: new Date(),
        systemHealth: await calculateSystemHealth()
      }
    };

    return {
      success: true,
      data: dashboard
    };

  } catch (error) {
    throw new Error(`Erro ao gerar dashboard executivo: ${error.message}`);
  }
};

// ============ FUNÇÕES AUXILIARES ============

/**
 * Análise detalhada por câmara
 */
const generateChamberBreakdown = async (products) => {
  const breakdown = {};
  
  for (const product of products) {
    const chamberId = product.locationId.chamberId._id.toString();
    const chamberName = product.locationId.chamberId.name;
    
    if (!breakdown[chamberId]) {
      breakdown[chamberId] = {
        name: chamberName,
        products: [],
        totalWeight: 0,
        totalQuantity: 0,
        locationsUsed: new Set(),
        seedTypes: new Set()
      };
    }
    
    breakdown[chamberId].products.push(product);
    breakdown[chamberId].totalWeight += product.totalWeight;
    breakdown[chamberId].totalQuantity += product.quantity;
    breakdown[chamberId].locationsUsed.add(product.locationId._id.toString());
    breakdown[chamberId].seedTypes.add(product.seedTypeId._id.toString());
  }

  // Converter Sets para números
  for (const chamber of Object.values(breakdown)) {
    chamber.locationsUsed = chamber.locationsUsed.size;
    chamber.seedTypes = chamber.seedTypes.size;
  }

  return breakdown;
};

/**
 * Análise de produtos próximos ao vencimento
 */
const analyzeProductExpiration = async (products) => {
  const now = new Date();
  const analysis = {
    expired: [],
    critical: [], // < 7 dias
    warning: [],  // < 30 dias
    attention: [], // < 90 dias
    good: []
  };

  products.forEach(product => {
    if (!product.expirationDate) {
      analysis.good.push(product);
      return;
    }

    const daysUntilExpiration = Math.ceil((product.expirationDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      analysis.expired.push({ ...product.toObject(), daysOverdue: Math.abs(daysUntilExpiration) });
    } else if (daysUntilExpiration <= 7) {
      analysis.critical.push({ ...product.toObject(), daysRemaining: daysUntilExpiration });
    } else if (daysUntilExpiration <= 30) {
      analysis.warning.push({ ...product.toObject(), daysRemaining: daysUntilExpiration });
    } else if (daysUntilExpiration <= 90) {
      analysis.attention.push({ ...product.toObject(), daysRemaining: daysUntilExpiration });
    } else {
      analysis.good.push(product);
    }
  });

  return analysis;
};

/**
 * Geração de sugestões de otimização
 */
const generateOptimizationSuggestions = async (products) => {
  const suggestions = [];

  // Análise de distribuição por câmara
  const chamberDistribution = {};
  products.forEach(product => {
    const chamberId = product.locationId.chamberId._id.toString();
    if (!chamberDistribution[chamberId]) {
      chamberDistribution[chamberId] = { count: 0, weight: 0 };
    }
    chamberDistribution[chamberId].count++;
    chamberDistribution[chamberId].weight += product.totalWeight;
  });

  // Detectar desequilíbrios
  const chambers = Object.keys(chamberDistribution);
  if (chambers.length > 1) {
    const avgWeight = Object.values(chamberDistribution).reduce((sum, c) => sum + c.weight, 0) / chambers.length;
    
    for (const [chamberId, data] of Object.entries(chamberDistribution)) {
      if (data.weight > avgWeight * 1.5) {
        suggestions.push({
          type: 'overload',
          priority: 'medium',
          description: `Câmara com sobrecarga - considerar redistribuição`,
          chamberId,
          currentWeight: data.weight,
          recommendedWeight: avgWeight
        });
      }
    }
  }

  return suggestions;
};

/**
 * Cálculo do tempo médio de armazenamento
 */
const calculateAverageStorageTime = async (products) => {
  const now = new Date();
  let totalDays = 0;
  let count = 0;

  products.forEach(product => {
    if (product.entryDate) {
      const days = Math.floor((now - product.entryDate) / (1000 * 60 * 60 * 24));
      totalDays += days;
      count++;
    }
  });

  return count > 0 ? Math.round(totalDays / count) : 0;
};

/**
 * Análise temporal de movimentações
 */
const generateTemporalAnalysis = async (filters, groupBy) => {
  const { startDate, endDate } = filters;
  
  return await Movement.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: {
          period: getDateGrouping(groupBy),
          type: '$type'
        },
        count: { $sum: 1 },
        totalWeight: { $sum: '$weight' }
      }
    },
    { $sort: { '_id.period': 1 } }
  ]);
};

/**
 * Cálculo de eficiência de movimentações
 */
const calculateMovementEfficiency = async (filters) => {
  const { startDate, endDate } = filters;
  
  const stats = await Movement.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate, $lte: endDate },
        status: 'completed'
      }
    },
    {
      $group: {
        _id: null,
        totalMovements: { $sum: 1 },
        automaticMovements: { $sum: { $cond: ['$metadata.isAutomatic', 1, 0] } },
        avgWeight: { $avg: '$weight' },
        totalWeight: { $sum: '$weight' }
      }
    }
  ]);

  const result = stats[0] || {};
  return {
    ...result,
    automationRate: result.totalMovements > 0 ? 
      Math.round((result.automaticMovements / result.totalMovements) * 100) : 0,
    avgWeightPerDay: result.totalWeight / Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))
  };
};

/**
 * Outras funções auxiliares necessárias para completar o service
 */
const generateTopMovementsAnalysis = async (filters) => {
  // Análise dos produtos com mais movimentações
  const topProducts = await Movement.aggregate([
    { $match: { timestamp: { $gte: filters.startDate, $lte: filters.endDate } } },
    { $group: { _id: '$productId', movementCount: { $sum: 1 }, totalWeight: { $sum: '$weight' } } },
    { $sort: { movementCount: -1 } },
    { $limit: 10 },
    { $lookup: { from: 'products', localField: '_id', foreignField: '_id', as: 'product' } }
  ]);

  return { topProducts };
};

const classifyByExpiration = (products) => {
  const now = new Date();
  return {
    critical: products.filter(p => p.expirationDate && (p.expirationDate - now) <= 7 * 24 * 60 * 60 * 1000),
    warning: products.filter(p => p.expirationDate && 
      (p.expirationDate - now) > 7 * 24 * 60 * 60 * 1000 && 
      (p.expirationDate - now) <= 30 * 24 * 60 * 60 * 1000)
  };
};

const groupProductsByChamber = (products) => {
  const groups = {};
  products.forEach(product => {
    const chamberId = product.locationId.chamberId._id.toString();
    if (!groups[chamberId]) groups[chamberId] = [];
    groups[chamberId].push(product);
  });
  return groups;
};

const generateExpirationRecommendations = (classification, expiredProducts) => {
  const recommendations = [];
  
  if (classification.critical?.length > 0) {
    recommendations.push({
      priority: 'high',
      action: 'immediate_action',
      description: `${classification.critical.length} produtos com vencimento crítico - ação imediata necessária`
    });
  }

  if (expiredProducts.length > 0) {
    recommendations.push({
      priority: 'critical',
      action: 'remove_expired',
      description: `${expiredProducts.length} produtos vencidos - remover imediatamente`
    });
  }

  return recommendations;
};

const analyzeChamberCapacity = async (chamber) => {
  const locations = await Location.find({ chamberId: chamber._id });
  const totalCapacity = locations.reduce((sum, loc) => sum + loc.maxCapacityKg, 0);
  const usedCapacity = locations.reduce((sum, loc) => sum + loc.currentWeightKg, 0);
  
  return {
    chamberId: chamber._id,
    name: chamber.name,
    totalCapacity,
    usedCapacity,
    availableCapacity: totalCapacity - usedCapacity,
    utilizationRate: totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0,
    locationsTotal: locations.length,
    locationsOccupied: locations.filter(l => l.isOccupied).length
  };
};

const generateCapacityProjections = async (chamberAnalysis) => {
  // Projeção simples baseada na tendência atual
  return {
    projectedUtilization: chamberAnalysis.map(c => ({
      chamberId: c.chamberId,
      current: c.utilizationRate,
      projected30Days: Math.min(100, c.utilizationRate + 5) // Estimativa simples
    }))
  };
};

const generateCapacityAlerts = (chamberAnalysis) => {
  const alerts = [];
  
  chamberAnalysis.forEach(chamber => {
    if (chamber.utilizationRate > 90) {
      alerts.push({
        type: 'capacity_critical',
        severity: 'high',
        chamberId: chamber.chamberId,
        message: `Câmara ${chamber.name} com ${chamber.utilizationRate}% de ocupação`
      });
    } else if (chamber.utilizationRate > 80) {
      alerts.push({
        type: 'capacity_warning',
        severity: 'medium',
        chamberId: chamber.chamberId,
        message: `Câmara ${chamber.name} próxima da capacidade máxima`
      });
    }
  });

  return alerts;
};

const calculateMainKPIs = async (startDate, endDate) => {
  // Consultas paralelas para melhor performance
  const [
    productsCount, 
    movements, 
    chambers, 
    locations,
    expiringProducts,
    productsWithWeight
  ] = await Promise.all([
    Product.countDocuments({ status: { $in: ['stored', 'reserved'] } }),
    Movement.countDocuments({ timestamp: { $gte: startDate, $lte: endDate } }),
    Chamber.countDocuments({ status: 'active' }),
    Location.find({}),
    Product.countDocuments({
      status: { $in: ['stored', 'reserved'] },
      expirationDate: { 
        $gte: new Date(),
        $lte: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // próximos 30 dias
      }
    }),
    // Buscar produtos para calcular peso total
    Product.find(
      { status: { $in: ['stored', 'reserved'] } },
      { totalWeight: 1 }
    )
  ]);

  // Calcular capacidade total e utilizada
  const totalCapacity = locations.reduce((sum, loc) => sum + (loc.maxCapacityKg || 0), 0);
  const usedCapacity = locations.reduce((sum, loc) => sum + (loc.currentWeightKg || 0), 0);
  const occupancyRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

  // Calcular localizações ocupadas
  const occupiedLocations = locations.filter(loc => loc.isOccupied).length;

  // Calcular peso total dos produtos armazenados
  const totalWeight = productsWithWeight.reduce((sum, product) => sum + (product.totalWeight || 0), 0);

  return {
    totalProducts: productsCount,
    totalWeight: totalWeight, // ✅ Agora incluindo o peso total dos produtos
    totalMovements: movements,
    activeChambers: chambers,
    totalLocations: locations.length,
    occupiedLocations,
    totalCapacity,
    usedCapacity,
    availableCapacity: totalCapacity - usedCapacity,
    occupancyRate,
    expiringProducts,
    period: { startDate, endDate }
  };
};

const calculateKPIComparisons = (current, previous) => {
  return {
    products: {
      current: current.totalProducts,
      previous: previous.totalProducts,
      change: current.totalProducts - previous.totalProducts,
      changePercent: previous.totalProducts > 0 ? 
        Math.round(((current.totalProducts - previous.totalProducts) / previous.totalProducts) * 100) : 0
    },
    movements: {
      current: current.totalMovements,
      previous: previous.totalMovements,
      change: current.totalMovements - previous.totalMovements,
      changePercent: previous.totalMovements > 0 ? 
        Math.round(((current.totalMovements - previous.totalMovements) / previous.totalMovements) * 100) : 0
    }
  };
};

const calculateTrends = async (period) => {
  // Análise simplificada de tendências
  return {
    movementTrend: 'stable',
    capacityTrend: 'increasing',
    efficiencyTrend: 'improving'
  };
};

const getCriticalAlerts = async () => {
  const alerts = [];
  
  // Produtos vencidos
  const expiredCount = await Product.countDocuments({
    status: { $in: ['stored', 'reserved'] },
    expirationDate: { $lt: new Date() }
  });
  
  if (expiredCount > 0) {
    alerts.push({
      type: 'expired_products',
      severity: 'critical',
      count: expiredCount,
      message: `${expiredCount} produtos vencidos encontrados`
    });
  }

  return alerts;
};

const getTopPerformers = async (startDate, endDate) => {
  // Top usuários com mais movimentações (com populate para obter nomes)
  const topUsers = await Movement.aggregate([
    { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } },
    { $sort: { count: -1 } },
    { $limit: 5 },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user'
      }
    },
    { $unwind: '$user' },
    {
      $project: {
        _id: 1,
        count: 1,
        name: '$user.name',
        email: '$user.email'
      }
    }
  ]);

  // Top câmaras por ocupação e eficiência
  const chambers = await Chamber.find({ status: 'active' });
  const chamberPerformance = [];

  for (const chamber of chambers) {
    const locations = await Location.find({ chamberId: chamber._id });
    const totalCapacity = locations.reduce((sum, loc) => sum + (loc.maxCapacityKg || 0), 0);
    const usedCapacity = locations.reduce((sum, loc) => sum + (loc.currentWeightKg || 0), 0);
    const occupancyRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
    
    // Calcular eficiência baseada em movimentações recentes
    const recentMovements = await Movement.countDocuments({
      timestamp: { $gte: startDate, $lte: endDate },
      $or: [
        { fromLocationId: { $in: locations.map(l => l._id) } },
        { toLocationId: { $in: locations.map(l => l._id) } }
      ]
    });
    
    // Eficiência baseada em ocupação e atividade
    const efficiency = Math.min(100, Math.round(
      (occupancyRate * 0.7) + // 70% peso para ocupação
      (Math.min(recentMovements * 2, 30)) // 30% peso para atividade (máx 30 pontos)
    ));

    chamberPerformance.push({
      _id: chamber._id,
      name: chamber.name,
      occupancyRate,
      efficiency,
      recentMovements,
      totalCapacity,
      usedCapacity
    });
  }

  // Ordenar câmaras por eficiência
  const topChambers = chamberPerformance
    .sort((a, b) => b.efficiency - a.efficiency)
    .slice(0, 5);

  return {
    topUsers,
    topChambers
  };
};

const calculateSystemHealth = async () => {
  // Score simples de saúde do sistema (0-100)
  const totalProducts = await Product.countDocuments();
  const expiredProducts = await Product.countDocuments({ 
    expirationDate: { $lt: new Date() },
    status: { $in: ['stored', 'reserved'] }
  });
  
  const healthScore = totalProducts > 0 ? 
    Math.max(0, 100 - Math.round((expiredProducts / totalProducts) * 100)) : 100;
  
  return {
    score: healthScore,
    status: healthScore > 90 ? 'excellent' : healthScore > 70 ? 'good' : 'needs_attention'
  };
};

const getDateGrouping = (groupBy) => {
  switch (groupBy) {
    case 'hour':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
    case 'day':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
    case 'week':
      return { $week: '$timestamp' };
    case 'month':
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
    default:
      return {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
  }
};

module.exports = {
  generateInventoryReport,
  generateMovementReport,
  generateExpirationReport,
  generateCapacityReport,
  generateExecutiveDashboard
}; 