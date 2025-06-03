/**
 * Dashboard Controller - APIs de Resumo e Estatísticas
 * Objetivos: Dashboard executivo para Sistema de Câmaras Refrigeradas
 * Funcionalidades: Resumo geral, status câmaras, capacidade, movimentações recentes
 * Integração: reportService, locationService, productService, movementService
 */

const reportService = require('../services/reportService');
const locationService = require('../services/locationService');
const productService = require('../services/productService');
const movementService = require('../services/movementService');

const Product = require('../models/Product');
const Movement = require('../models/Movement');
const Chamber = require('../models/Chamber');
const Location = require('../models/Location');
const SeedType = require('../models/SeedType');
const User = require('../models/User');

/**
 * GET /api/dashboard/summary
 * Resumo geral do sistema
 */
const getSummary = async (req, res) => {
  try {
    const { period = 7 } = req.query;
    
    // 1. Usar reportService para dashboard executivo
    const executiveDashboard = await reportService.generateExecutiveDashboard({
      period: parseInt(period),
      includeComparisons: true,
      includeTrends: true
    });

    // 2. Estatísticas básicas adicionais
    const [totalUsers, totalSeedTypes, totalLocations, totalChambers] = await Promise.all([
      User.countDocuments({ isActive: true }),
      SeedType.countDocuments({ isActive: true }),
      Location.countDocuments(),
      Chamber.countDocuments({ status: 'active' })
    ]);

    // 3. Status do sistema em tempo real
    const systemStatus = {
      totalUsers,
      totalSeedTypes,
      totalLocations,
      totalChambers,
      lastUpdate: new Date()
    };

    // 4. Alertas críticos resumidos
    const criticalAlerts = await getCriticalAlertsCount();

    const summary = {
      ...executiveDashboard.data,
      systemStatus,
      criticalAlerts,
      metadata: {
        ...executiveDashboard.data.metadata,
        generatedBy: req.user?.name || 'Sistema',
        userRole: req.user?.role
      }
    };

    res.status(200).json({
      success: true,
      message: 'Resumo do sistema obtido com sucesso',
      data: summary
    });

  } catch (error) {
    console.error('Erro ao obter resumo do dashboard:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/dashboard/chamber-status
 * Status detalhado de todas as câmaras
 */
const getChamberStatus = async (req, res) => {
  try {
    const { includeInactive = false } = req.query;
    
    // 1. Buscar câmaras com status
    const chamberQuery = includeInactive === 'true' ? {} : { status: 'active' };
    const chambers = await Chamber.find(chamberQuery).sort({ name: 1 });

    // 2. Análise detalhada por câmara
    const chamberStatusList = [];
    
    for (const chamber of chambers) {
      // Buscar localizações da câmara
      const locations = await Location.find({ chamberId: chamber._id });
      const totalLocations = locations.length;
      const occupiedLocations = locations.filter(loc => loc.isOccupied).length;
      
      // Buscar produtos ativos na câmara
      const locationIds = locations.map(loc => loc._id);
      const products = await Product.find({
        locationId: { $in: locationIds },
        status: { $in: ['stored', 'reserved'] }
      }).populate('seedTypeId', 'name');

      // Calcular capacidade
      const totalCapacity = locations.reduce((sum, loc) => sum + loc.maxCapacityKg, 0);
      const usedCapacity = locations.reduce((sum, loc) => sum + loc.currentWeightKg, 0);
      const utilizationRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;

      // Análise de temperatura/umidade (simulada)
      const temperatureStatus = getTemperatureStatus(chamber.currentTemperature);
      const humidityStatus = getHumidityStatus(chamber.currentHumidity);

      // Produtos próximos ao vencimento
      const now = new Date();
      const expiringProducts = products.filter(p => {
        if (!p.expirationDate) return false;
        const daysUntilExpiration = Math.ceil((p.expirationDate - now) / (1000 * 60 * 60 * 24));
        return daysUntilExpiration <= 30;
      });

      // Movimentações recentes (últimas 24h)
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const recentMovements = await Movement.countDocuments({
        $or: [
          { fromLocationId: { $in: locationIds } },
          { toLocationId: { $in: locationIds } }
        ],
        timestamp: { $gte: yesterday }
      });

      const status = {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          description: chamber.description,
          status: chamber.status,
          currentTemperature: chamber.currentTemperature,
          currentHumidity: chamber.currentHumidity,
          dimensions: chamber.dimensions
        },
        occupancy: {
          totalLocations,
          occupiedLocations,
          availableLocations: totalLocations - occupiedLocations,
          occupancyRate: totalLocations > 0 ? Math.round((occupiedLocations / totalLocations) * 100) : 0
        },
        capacity: {
          totalCapacity,
          usedCapacity,
          availableCapacity: totalCapacity - usedCapacity,
          utilizationRate
        },
        products: {
          totalProducts: products.length,
          expiringProducts: expiringProducts.length,
          seedTypes: [...new Set(products.map(p => p.seedTypeId.name))].length
        },
        conditions: {
          temperature: temperatureStatus,
          humidity: humidityStatus
        },
        activity: {
          recentMovements,
          lastUpdate: new Date()
        },
        alerts: generateChamberAlerts(chamber, utilizationRate, expiringProducts.length, temperatureStatus, humidityStatus)
      };

      chamberStatusList.push(status);
    }

    // 3. Estatísticas consolidadas
    const consolidated = {
      totalChambers: chambers.length,
      activeChambers: chambers.filter(c => c.status === 'active').length,
      averageUtilization: chamberStatusList.reduce((sum, c) => sum + c.capacity.utilizationRate, 0) / chamberStatusList.length || 0,
      totalAlerts: chamberStatusList.reduce((sum, c) => sum + c.alerts.length, 0),
      criticalChambers: chamberStatusList.filter(c => c.alerts.some(a => a.severity === 'critical')).length
    };

    res.status(200).json({
      success: true,
      message: 'Status das câmaras obtido com sucesso',
      data: {
        consolidated,
        chambers: chamberStatusList,
        metadata: {
          generatedAt: new Date(),
          includeInactive: includeInactive === 'true',
          generatedBy: req.user?.name || 'Sistema'
        }
      }
    });

  } catch (error) {
    console.error('Erro ao obter status das câmaras:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/dashboard/storage-capacity
 * Análise detalhada de capacidade de armazenamento
 */
const getStorageCapacity = async (req, res) => {
  try {
    const { includeProjections = true, groupBy = 'chamber' } = req.query;
    
    // Corrigir conversão para garantir que funcione com boolean e string
    const shouldIncludeProjections = includeProjections === true || includeProjections === 'true';
    
    // 1. Usar reportService para relatório de capacidade
    const capacityReport = await reportService.generateCapacityReport({
      includeProjections: shouldIncludeProjections
    });

    // 2. Usar locationService para análise de ocupação
    const occupancyAnalysis = await locationService.analyzeOccupancy(null, {});

    // 3. Análise temporal de crescimento
    const growthAnalysis = await analyzeCapacityGrowth();

    // 4. Recomendações de otimização
    const optimizationRecommendations = await generateCapacityOptimizations(capacityReport.data);

    // 5. Métricas de eficiência
    const efficiencyMetrics = calculateCapacityEfficiency(capacityReport.data);

    const result = {
      summary: capacityReport.data.summary,
      analysis: {
        capacity: capacityReport.data.chamberAnalysis,
        occupancy: occupancyAnalysis.data,
        growth: growthAnalysis,
        efficiency: efficiencyMetrics
      },
      projections: capacityReport.data.projections,
      recommendations: optimizationRecommendations,
      alerts: capacityReport.data.alerts,
      metadata: {
        generatedAt: new Date(),
        groupBy,
        includeProjections: shouldIncludeProjections,
        generatedBy: req.user?.name || 'Sistema'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Análise de capacidade obtida com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro ao obter análise de capacidade:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * GET /api/dashboard/recent-movements
 * Movimentações recentes com análise
 */
const getRecentMovements = async (req, res) => {
  try {
    const { 
      limit = 50, 
      hours = 24, 
      includeAnalysis = true,
      type,
      chamberId 
    } = req.query;

    const startTime = new Date(Date.now() - parseInt(hours) * 60 * 60 * 1000);
    
    // 1. Query base para movimentações
    const baseQuery = {
      timestamp: { $gte: startTime },
      status: { $ne: 'cancelled' }
    };
    
    if (type) baseQuery.type = type;

    // 2. Filtro por câmara (se especificado)
    let locationIds = [];
    if (chamberId) {
      const locations = await Location.find({ chamberId }).select('_id');
      locationIds = locations.map(l => l._id);
      baseQuery.$or = [
        { fromLocationId: { $in: locationIds } },
        { toLocationId: { $in: locationIds } }
      ];
    }

    // 3. Buscar movimentações com dados completos
    const movements = await Movement.find(baseQuery)
      .populate('productId', 'name lot totalWeight status')
      .populate('userId', 'name role')
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
      .sort({ timestamp: -1 })
      .limit(parseInt(limit));

    // Validar que movements é um array
    if (!Array.isArray(movements)) {
      throw new Error('Erro interno: movements deve ser um array');
    }

    // 4. Análise das movimentações
    let analysis = {};
    if (includeAnalysis === 'true') {
      analysis = await analyzeRecentMovements(movements, startTime);
    }

    // 5. Agrupamento por tipo (apenas se há movimentações)
    const groupedByType = movements.length > 0 ? movements.reduce((acc, movement) => {
      if (!acc[movement.type]) acc[movement.type] = [];
      acc[movement.type].push(movement);
      return acc;
    }, {}) : {};

    // 6. Atividade por hora
    const hourlyActivity = generateHourlyActivity(movements, parseInt(hours));

    const result = {
      summary: {
        totalMovements: movements.length,
        period: { startTime, endTime: new Date(), hours: parseInt(hours) },
        byType: Object.keys(groupedByType).map(type => ({
          type,
          count: groupedByType[type].length,
          percentage: movements.length > 0 ? Math.round((groupedByType[type].length / movements.length) * 100) : 0
        }))
      },
      movements,
      analysis,
      activity: {
        groupedByType,
        hourlyActivity
      },
      metadata: {
        generatedAt: new Date(),
        limit: parseInt(limit),
        hours: parseInt(hours),
        filters: { type, chamberId },
        generatedBy: req.user?.name || 'Sistema'
      }
    };

    res.status(200).json({
      success: true,
      message: 'Movimentações recentes obtidas com sucesso',
      data: result
    });

  } catch (error) {
    console.error('Erro ao obter movimentações recentes:', error);
    res.status(500).json({
      success: false,
      message: 'Erro interno do servidor',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// ============ FUNÇÕES AUXILIARES ============

/**
 * Contagem de alertas críticos
 */
const getCriticalAlertsCount = async () => {
  const [expiredProducts, overloadedChambers, inactiveChambers] = await Promise.all([
    Product.countDocuments({
      status: { $in: ['stored', 'reserved'] },
      expirationDate: { $lt: new Date() }
    }),
    Location.aggregate([
      { $group: { 
          _id: '$chamberId', 
          totalCapacity: { $sum: '$maxCapacityKg' },
          usedCapacity: { $sum: '$currentWeightKg' }
        }
      },
      { $match: { $expr: { $gt: [{ $divide: ['$usedCapacity', '$totalCapacity'] }, 0.9] } } },
      { $count: 'count' }
    ]).then(result => result[0]?.count || 0),
    Chamber.countDocuments({ status: 'inactive' })
  ]);

  return {
    expiredProducts,
    overloadedChambers,
    inactiveChambers,
    total: expiredProducts + overloadedChambers + inactiveChambers
  };
};

/**
 * Status de temperatura
 */
const getTemperatureStatus = (temperature) => {
  if (!temperature) return { status: 'unknown', message: 'Temperatura não informada' };
  
  if (temperature < 0 || temperature > 10) {
    return { status: 'critical', message: `Temperatura fora do padrão: ${temperature}°C` };
  } else if (temperature < 2 || temperature > 8) {
    return { status: 'warning', message: `Temperatura próxima do limite: ${temperature}°C` };
  }
  return { status: 'normal', message: `Temperatura adequada: ${temperature}°C` };
};

/**
 * Status de umidade
 */
const getHumidityStatus = (humidity) => {
  if (!humidity) return { status: 'unknown', message: 'Umidade não informada' };
  
  if (humidity < 60 || humidity > 80) {
    return { status: 'critical', message: `Umidade fora do padrão: ${humidity}%` };
  } else if (humidity < 65 || humidity > 75) {
    return { status: 'warning', message: `Umidade próxima do limite: ${humidity}%` };
  }
  return { status: 'normal', message: `Umidade adequada: ${humidity}%` };
};

/**
 * Geração de alertas por câmara
 */
const generateChamberAlerts = (chamber, utilizationRate, expiringProducts, tempStatus, humidityStatus) => {
  const alerts = [];

  // Alertas de capacidade
  if (utilizationRate > 90) {
    alerts.push({
      type: 'capacity_critical',
      severity: 'critical',
      message: `Capacidade crítica: ${utilizationRate}%`
    });
  } else if (utilizationRate > 80) {
    alerts.push({
      type: 'capacity_warning',
      severity: 'medium',
      message: `Capacidade alta: ${utilizationRate}%`
    });
  }

  // Alertas de produtos vencendo
  if (expiringProducts > 0) {
    alerts.push({
      type: 'expiring_products',
      severity: expiringProducts > 5 ? 'high' : 'medium',
      message: `${expiringProducts} produtos próximos ao vencimento`
    });
  }

  // Alertas de condições ambientais
  if (tempStatus.status === 'critical') {
    alerts.push({
      type: 'temperature_critical',
      severity: 'critical',
      message: tempStatus.message
    });
  }

  if (humidityStatus.status === 'critical') {
    alerts.push({
      type: 'humidity_critical',
      severity: 'critical',
      message: humidityStatus.message
    });
  }

  // Alerta de status da câmara
  if (chamber.status !== 'active') {
    alerts.push({
      type: 'chamber_inactive',
      severity: 'high',
      message: `Câmara inativa: ${chamber.status}`
    });
  }

  return alerts;
};

/**
 * Análise de crescimento de capacidade
 */
const analyzeCapacityGrowth = async () => {
  // Análise simplificada dos últimos 30 dias
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  const recentMovements = await Movement.aggregate([
    { $match: { timestamp: { $gte: thirtyDaysAgo }, type: 'entry' } },
    { $group: { _id: null, totalWeight: { $sum: '$weight' } } }
  ]);

  const growthRate = recentMovements[0]?.totalWeight || 0;
  
  return {
    period: '30 days',
    newWeight: growthRate,
    trend: growthRate > 0 ? 'increasing' : 'stable',
    projectedMonthly: growthRate
  };
};

/**
 * Recomendações de otimização de capacidade
 */
const generateCapacityOptimizations = async (capacityData) => {
  const recommendations = [];
  
  if (capacityData.chamberAnalysis) {
    const overloadedChambers = capacityData.chamberAnalysis.filter(c => c.utilizationRate > 85);
    const underutilizedChambers = capacityData.chamberAnalysis.filter(c => c.utilizationRate < 30);
    
    if (overloadedChambers.length > 0) {
      recommendations.push({
        type: 'redistribution',
        priority: 'high',
        description: `${overloadedChambers.length} câmaras sobrecarregadas - redistribuir produtos`,
        chambers: overloadedChambers.map(c => c.name)
      });
    }
    
    if (underutilizedChambers.length > 0 && overloadedChambers.length > 0) {
      recommendations.push({
        type: 'balance',
        priority: 'medium',
        description: 'Otimizar distribuição entre câmaras subutilizadas e sobrecarregadas'
      });
    }
  }
  
  return recommendations;
};

/**
 * Métricas de eficiência de capacidade
 */
const calculateCapacityEfficiency = (capacityData) => {
  if (!capacityData.chamberAnalysis) return {};
  
  const chambers = capacityData.chamberAnalysis;
  const avgUtilization = chambers.reduce((sum, c) => sum + c.utilizationRate, 0) / chambers.length;
  const balanceScore = 100 - (Math.max(...chambers.map(c => c.utilizationRate)) - Math.min(...chambers.map(c => c.utilizationRate)));
  
  return {
    averageUtilization: Math.round(avgUtilization),
    balanceScore: Math.round(Math.max(0, balanceScore)),
    efficiencyRating: avgUtilization > 70 && balanceScore > 70 ? 'excellent' : 
                     avgUtilization > 50 && balanceScore > 50 ? 'good' : 'needs_improvement'
  };
};

/**
 * Análise de movimentações recentes
 */
const analyzeRecentMovements = async (movements, startTime) => {
  const userActivity = movements.reduce((acc, m) => {
    const userId = m.userId._id.toString();
    if (!acc[userId]) {
      acc[userId] = { user: m.userId, count: 0, weight: 0 };
    }
    acc[userId].count++;
    acc[userId].weight += m.weight;
    return acc;
  }, {});

  const mostActiveUser = Object.values(userActivity).sort((a, b) => b.count - a.count)[0];
  
  return {
    userActivity: Object.values(userActivity),
    mostActiveUser,
    averageWeight: movements.reduce((sum, m) => sum + m.weight, 0) / movements.length || 0,
    automaticMovements: movements.filter(m => m.metadata?.isAutomatic).length,
    automationRate: Math.round((movements.filter(m => m.metadata?.isAutomatic).length / movements.length) * 100) || 0
  };
};

/**
 * Atividade por hora
 */
const generateHourlyActivity = (movements, hours) => {
  const activity = Array(hours).fill(0);
  const now = new Date();
  
  movements.forEach(movement => {
    const hoursDiff = Math.floor((now - movement.timestamp) / (1000 * 60 * 60));
    if (hoursDiff < hours) {
      activity[hours - hoursDiff - 1]++;
    }
  });
  
  return activity.map((count, index) => ({
    hour: hours - index,
    count,
    timestamp: new Date(now.getTime() - (hours - index) * 60 * 60 * 1000)
  }));
};

module.exports = {
  getSummary,
  getChamberStatus,
  getStorageCapacity,
  getRecentMovements
}; 