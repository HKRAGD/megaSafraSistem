/**
 * User Service
 * Gestão Inteligente de Usuários
 * 
 * Funcionalidades:
 * - Análise completa de atividade do usuário
 * - Sugestões de mudança de role baseadas em uso
 * - Relatórios de produtividade
 * - Detecção de usuários inativos
 * - Validação avançada de permissões
 * - Análise de padrões de comportamento
 * 
 * Integrações com TODOS os Services:
 * - authService (segurança e sessões)
 * - movementService (atividades e auditoria)
 * - locationService (atividade por localização)
 * - productService (gestão de produtos)
 * - chamberService (acesso a câmaras)
 * - seedTypeService (trabalho com tipos)
 * - reportService (relatórios personalizados)
 */

const User = require('../models/User');
const bcrypt = require('bcryptjs');
const movementService = require('./movementService');
const locationService = require('./locationService');
const productService = require('./productService');
const authService = require('./authService');
const reportService = require('./reportService');

/**
 * Analisa atividade completa de um usuário
 * @param {string} userId - ID do usuário
 * @param {object} options - Opções da análise
 * @returns {object} Análise completa de atividade
 */
const analyzeUserActivity = async (userId, options = {}) => {
  try {
    const timeframe = options.timeframe || '30d';
    const includeDetails = options.includeDetails !== false;
    
    // 1. Buscar dados básicos do usuário
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // 2. **INTEGRAÇÃO PARALELA** com múltiplos services
    const [movements, locationActivity, productActivity, sessionActivity] = await Promise.all([
      movementService.getUserMovements(userId, timeframe),
      locationService.getUserLocationActivity(userId, timeframe),
      productService.getUserProductActivity(userId, timeframe),
      authService.analyzeLoginPatterns(userId, timeframe)
    ]);

    // 3. Calcular métricas de produtividade
    const productivityMetrics = calculateProductivityScore(
      movements, 
      locationActivity, 
      productActivity, 
      sessionActivity
    );

    // 4. Detectar padrões de uso
    const usagePatterns = detectUsagePatterns(movements, locationActivity, productActivity);

    // 5. Analisar eficiência comparativa
    const efficiencyComparison = await analyzeEfficiencyComparison(
      userId, 
      user.role, 
      productivityMetrics
    );

    // 6. Gerar insights e recomendações
    const insights = generateUserInsights(
      productivityMetrics, 
      usagePatterns, 
      efficiencyComparison
    );

    // 7. **REGISTRO AUTOMÁTICO DE ATIVIDADE** (Alinhamento com objetivos)
    await movementService.registerUserActivity({
      userId,
      action: 'activity_analysis',
      timestamp: new Date(),
      metadata: {
        timeframe,
        productivityScore: productivityMetrics.overallScore
      }
    });

    return {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt
        },
        timeframe,
        summary: {
          totalMovements: movements.length,
          locationsUsed: locationActivity.uniqueLocations,
          productsManaged: productActivity.uniqueProducts,
          sessionsCount: sessionActivity.totalLogins,
          avgSessionTime: sessionActivity.averageLoginsPerDay
        },
        productivity: productivityMetrics,
        patterns: usagePatterns,
        efficiency: efficiencyComparison,
        insights,
        details: includeDetails ? {
          movements: movements.slice(0, 50), // Últimas 50 movimentações
          locations: locationActivity.details,
          products: productActivity.details
        } : null,
        analyzedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na análise de atividade: ${error.message}`);
  }
};

/**
 * Sugere mudanças de role baseadas no uso
 * @param {string} userId - ID do usuário
 * @param {object} options - Opções da sugestão
 * @returns {object} Sugestões de role
 */
const suggestRoleChanges = async (userId, options = {}) => {
  try {
    const analysisTimeframe = options.analysisTimeframe || '90d';
    const minActivityThreshold = options.minActivityThreshold || 50;
    
    // 1. Analisar atividade extensa do usuário
    const activityAnalysis = await analyzeUserActivity(userId, { 
      timeframe: analysisTimeframe,
      includeDetails: true 
    });

    // 2. Buscar usuários similares para comparação
    const similarUsers = await findUsersWithSimilarPatterns(
      userId, 
      activityAnalysis.data.patterns
    );

    // 3. Analisar capacidades demonstradas
    const demonstratedCapabilities = analyzeDemonstratedCapabilities(
      activityAnalysis.data.details,
      activityAnalysis.data.productivity
    );

    // 4. Calcular adequação aos roles
    const roleAdequacy = calculateRoleAdequacy(
      activityAnalysis.data,
      demonstratedCapabilities,
      similarUsers.data
    );

    // 5. Gerar sugestões específicas
    const suggestions = generateRoleSuggestions(
      activityAnalysis.data.user.role,
      roleAdequacy,
      demonstratedCapabilities,
      activityAnalysis.data.productivity
    );

    return {
      success: true,
      data: {
        user: activityAnalysis.data.user,
        currentRole: activityAnalysis.data.user.role,
        analysis: {
          activityLevel: activityAnalysis.data.productivity.overallScore,
          capabilities: demonstratedCapabilities,
          roleAdequacy: roleAdequacy
        },
        suggestions: suggestions,
        comparison: {
          similarUsers: similarUsers.data.summary,
          benchmarks: similarUsers.data.benchmarks
        },
        implementation: {
          recommended: suggestions.recommended,
          timeline: suggestions.timeline,
          requirements: suggestions.requirements
        },
        confidence: calculateSuggestionConfidence(
          activityAnalysis.data,
          roleAdequacy,
          suggestions
        ),
        analyzedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro ao sugerir mudanças de role: ${error.message}`);
  }
};

/**
 * Gera relatório de produtividade do usuário
 * @param {string} userId - ID do usuário
 * @param {object} options - Opções do relatório
 * @returns {object} Relatório de produtividade
 */
const generateUserProductivityReport = async (userId, options = {}) => {
  try {
    const timeframe = options.timeframe || '30d';
    const includeComparison = options.includeComparison !== false;
    
    // 1. Analisar atividade do usuário
    const activityAnalysis = await analyzeUserActivity(userId, { 
      timeframe,
      includeDetails: true 
    });

    // 2. **INTEGRAÇÃO COM REPORTSERVICE**
    const reportData = await reportService.generateUserReport(userId, {
      timeframe,
      includeMetrics: true,
      includeTrends: true
    });

    // 3. Calcular métricas avançadas
    const advancedMetrics = calculateAdvancedMetrics(
      activityAnalysis.data,
      reportData.data
    );

    // 4. Análise comparativa (se solicitado)
    let comparison = null;
    if (includeComparison) {
      const user = activityAnalysis.data.user;
      const peers = await User.find({ 
        role: user.role, 
        isActive: true, 
        _id: { $ne: userId } 
      });
      
      comparison = await generateComparativeAnalysis(userId, peers, activityAnalysis.data);
    }

    // 5. Gerar recomendações personalizadas
    const recommendations = generateProductivityRecommendations(
      activityAnalysis.data,
      advancedMetrics,
      comparison
    );

    return {
      success: true,
      data: {
        user: activityAnalysis.data.user,
        timeframe,
        report: reportData.data,
        metrics: advancedMetrics,
        trends: reportData.data.trends,
        recommendations,
        comparison,
        generatedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro ao gerar relatório de produtividade: ${error.message}`);
  }
};

/**
 * Busca usuários com padrões similares
 * @param {string} userId - ID do usuário de referência
 * @param {object} options - Opções da busca
 * @returns {object} Usuários similares
 */
const findUsersWithSimilarPatterns = async (userId, options = {}) => {
  try {
    const similarityThreshold = options.similarityThreshold || 0.7;
    const maxResults = options.maxResults || 10;
    
    // Implementar busca de usuários similares
    const allUsers = await User.find({ 
      isActive: true, 
      _id: { $ne: userId } 
    });

    // Mock para demonstração - implementar algoritmo de similaridade real
    const similarUsers = allUsers.slice(0, 3).map(user => ({
      id: user._id,
      name: user.name,
      role: user.role,
      similarityScore: Math.random() * 0.3 + 0.7 // Mock score
    }));

    return {
      success: true,
      data: {
        similar: similarUsers,
        summary: {
          totalFound: similarUsers.length,
          averageScore: similarUsers.reduce((sum, u) => sum + u.similarityScore, 0) / similarUsers.length,
          threshold: similarityThreshold
        },
        benchmarks: {
          adminThreshold: 90,
          operatorAverage: 75,
          viewerAverage: 60
        }
      }
    };
  } catch (error) {
    throw new Error(`Erro ao buscar usuários similares: ${error.message}`);
  }
};

/**
 * Detecta usuários inativos
 * @param {object} options - Opções da detecção
 * @returns {object} Usuários inativos
 */
const detectInactiveUsers = async (options = {}) => {
  try {
    const inactivityThreshold = options.inactivityThreshold || 30; // dias
    const activityThreshold = options.activityThreshold || 5; // movimentações mínimas
    const period = options.period || '30d';
    
    // 1. **CORREÇÃO**: Buscar todos os usuários ativos
    const users = await User.find({ isActive: true });
    
    // 2. Analisar atividade de cada usuário
    const inactivityAnalysis = [];
    for (const user of users) {
      try {
        const [movements, loginData] = await Promise.all([
          movementService.getUserMovements(user._id, period),
          authService.analyzeLoginPatterns(user._id, period)
        ]);

        const activityData = {
          summary: {
            totalMovements: movements.length,
            lastLogin: loginData.lastLogin,
            totalLogins: loginData.totalLogins
          }
        };

        const inactivity = calculateInactivityLevel(
          user, 
          activityData, 
          period, 
          activityThreshold
        );

        inactivityAnalysis.push({
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            lastLogin: user.lastLogin || user.createdAt
          },
          inactivity,
          activity: activityData.summary
        });
      } catch (userError) {
        // Log do erro e continuar com próximo usuário
        console.warn(`Erro ao analisar usuário ${user._id}:`, userError.message);
      }
    }

    // 3. Categorizar usuários por nível de inatividade
    const categories = categorizeInactiveUsers(inactivityAnalysis);

    // 4. **ANÁLISE POR ROLE** (Alinhamento com hierarquia)
    const byRole = {
      admin: inactivityAnalysis.filter(u => u.user.role === 'admin'),
      operator: inactivityAnalysis.filter(u => u.user.role === 'operator'),
      viewer: inactivityAnalysis.filter(u => u.user.role === 'viewer')
    };

    // 5. Gerar recomendações
    const recommendations = generateInactivityRecommendations(categories, byRole);

    return {
      success: true,
      data: {
        summary: {
          totalUsers: users.length,
          inactiveUsers: inactivityAnalysis.filter(u => u.inactivity.isInactive).length,
          lowActivityUsers: inactivityAnalysis.filter(u => u.inactivity.isLowActivity).length,
          analyzedAt: new Date()
        },
        categories: {
          critical: categories.critical,
          warning: categories.high,
          moderate: categories.medium
        },
        byRole,
        recommendations,
        analysis: inactivityAnalysis
      }
    };
  } catch (error) {
    throw new Error(`Erro na detecção de usuários inativos: ${error.message}`);
  }
};

/**
 * Valida permissões do usuário
 * @param {string} userId - ID do usuário
 * @param {array} permissions - Lista de permissões
 * @param {object} context - Contexto da operação
 * @returns {object} Validação de permissões
 */
const validateUserPermissions = async (userId, permissions, context = {}) => {
  try {
    // 1. Buscar dados do usuário
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // 2. **INTEGRAÇÃO COM AUTHSERVICE** para análise de segurança
    const securityAnalysis = await authService.checkUserSecurity(userId, context);

    // 3. Analisar contexto da operação
    const operationContext = analyzeOperationContext(context, user);

    // 4. Validar cada permissão
    const permissionValidation = validatePermissionList(
      permissions, 
      user.role, 
      operationContext,
      securityAnalysis
    );

    // 5. Gerar recomendações de segurança
    const securityRecommendations = generateSecurityRecommendations(
      permissionValidation,
      operationContext,
      securityAnalysis
    );

    return {
      success: true,
      data: {
        user: {
          id: user._id,
          name: user.name,
          role: user.role,
          isActive: user.isActive
        },
        permissions: permissions,
        context: operationContext,
        validation: permissionValidation,
        security: securityAnalysis,
        recommendations: securityRecommendations,
        validatedAt: new Date()
      }
    };
  } catch (error) {
    throw new Error(`Erro na validação de permissões: ${error.message}`);
  }
};

// ========== MÉTODOS AUXILIARES ==========

/**
 * Calcula score de produtividade
 */
const calculateProductivityScore = (movements, locationActivity, productActivity, sessionActivity) => {
  const scores = {
    movementEfficiency: calculateMovementEfficiency(movements),
    locationUtilization: calculateLocationUtilization(locationActivity),
    productManagement: calculateProductManagement(productActivity),
    systemUsage: calculateSystemUsage(sessionActivity)
  };

  const overallScore = (
    scores.movementEfficiency * 0.3 +
    scores.locationUtilization * 0.25 +
    scores.productManagement * 0.25 +
    scores.systemUsage * 0.2
  );

  // **CORREÇÃO**: Garantir que overallScore nunca seja NaN
  const finalScore = isNaN(overallScore) ? 0 : overallScore;

  return {
    overallScore: Math.round(finalScore),
    breakdown: scores,
    level: getProductivityLevel(finalScore),
    ...scores
  };
};

/**
 * **FUNÇÃO FALTANTE**: Determina nível de produtividade
 */
const getProductivityLevel = (score) => {
  if (isNaN(score)) return 'poor';
  if (score >= 90) return 'excellent';
  if (score >= 80) return 'good';
  if (score >= 60) return 'average';
  if (score >= 40) return 'below_average';
  return 'poor';
};

/**
 * Detecta padrões de uso
 */
const detectUsagePatterns = (movements, locationActivity, productActivity) => {
  return {
    peakHours: analyzeWorkingHours(movements),
    preferredOperations: analyzeOperationTypes(movements),
    workingDays: analyzeWorkingDays(movements),
    preferredLocations: identifyPreferredLocations(locationActivity),
    productTypes: analyzeProductTypePreferences(productActivity),
    consistency: calculateConsistencyPattern(movements)
  };
};

/**
 * **FUNÇÃO FALTANTE**: Analisa contexto da operação
 */
const analyzeOperationContext = (context, user) => {
  return {
    chamber: context.chamber || null,
    operation: context.operation || 'unknown',
    timeOfDay: context.timeOfDay || new Date().getHours(),
    ipAddress: context.ipAddress || 'unknown',
    userRole: user.role,
    riskLevel: calculateRiskLevel(context, user),
    restrictions: identifyRestrictions(context, user)
  };
};

/**
 * Analisa eficiência comparativa
 */
const analyzeEfficiencyComparison = async (userId, role, productivityMetrics) => {
  // Mock implementation - implementar comparação real
  return {
    roleAverage: 75,
    userScore: productivityMetrics.overallScore,
    ranking: Math.floor(Math.random() * 10) + 1,
    percentile: Math.min(95, productivityMetrics.overallScore + 10)
  };
};

/**
 * Gera insights do usuário
 */
const generateUserInsights = (productivityMetrics, usagePatterns, efficiencyComparison) => {
  const insights = [];

  if (productivityMetrics.overallScore < 60) {
    insights.push({
      type: 'performance',
      message: 'Produtividade abaixo da média - considerar treinamento',
      priority: 'high'
    });
  }

  if (usagePatterns.consistency < 70) {
    insights.push({
      type: 'consistency',
      message: 'Padrões de uso inconsistentes detectados',
      priority: 'medium'
    });
  }

  if (efficiencyComparison.ranking <= 3) {
    insights.push({
      type: 'recognition',
      message: 'Usuário entre os mais eficientes do grupo',
      priority: 'low'
    });
  }

  // **CORREÇÃO**: Garantir que sempre retorne pelo menos um insight
  if (insights.length === 0) {
    insights.push({
      type: 'general',
      message: 'Usuário apresenta atividade regular no sistema',
      priority: 'low'
    });
  }

  return insights;
};

/**
 * Analisa capacidades demonstradas
 */
const analyzeDemonstratedCapabilities = (details, productivity) => {
  const capabilities = {
    leadership: calculateLeadershipCapability(details),
    technical: calculateTechnicalCapability(details),
    efficiency: productivity.overallScore || 50,
    management: calculateManagementCapability(details)
  };

  return capabilities;
};

/**
 * Calcula adequação aos roles
 */
const calculateRoleAdequacy = (activityData, capabilities, similarUsers) => {
  const roles = ['viewer', 'operator', 'admin'];
  const adequacy = {};

  roles.forEach(role => {
    adequacy[role] = {
      score: calculateRoleScore(role, capabilities, activityData),
      reasoning: generateRoleReasoning(role, capabilities, activityData),
      requirements: getRoleRequirements(role),
      met: checkRoleRequirements(role, capabilities, activityData)
    };
  });

  return adequacy;
};

/**
 * Gera sugestões de role
 */
const generateRoleSuggestions = (currentRole, roleAdequacy, capabilities, productivity) => {
  const suggestions = {
    recommended: null,
    alternatives: [],
    timeline: null,
    requirements: []
  };

  // Encontrar melhor role baseado nos scores
  const roleScores = Object.entries(roleAdequacy)
    .map(([role, data]) => ({ role, score: data.score, met: data.met }))
    .sort((a, b) => b.score - a.score);

  const bestRole = roleScores[0];
  
  if (bestRole.role !== currentRole && bestRole.score > 75) {
    suggestions.recommended = {
      role: bestRole.role,
      confidence: bestRole.score,
      reasoning: roleAdequacy[bestRole.role].reasoning
    };
    
    suggestions.timeline = estimateTransitionTimeline(currentRole, bestRole.role);
    suggestions.requirements = roleAdequacy[bestRole.role].requirements;
  }

  suggestions.alternatives = roleScores
    .filter(r => r.role !== currentRole && r.role !== bestRole.role && r.score > 60)
    .slice(0, 2);

  return suggestions;
};

/**
 * Calcula nível de inatividade
 */
const calculateInactivityLevel = (user, activityData, period, threshold) => {
  const totalMovements = activityData.summary.totalMovements;
  const daysInactive = calculateDaysInactive(user.lastLogin || user.createdAt);
  
  return {
    isInactive: totalMovements === 0 || daysInactive > parseTimeframeToDays(period),
    isLowActivity: totalMovements > 0 && totalMovements < threshold,
    level: totalMovements === 0 ? 'critical' : 
           totalMovements < threshold / 2 ? 'high' :
           totalMovements < threshold ? 'medium' : 'low',
    daysInactive,
    movementCount: totalMovements,
    reason: totalMovements === 0 ? 'no_activity' : 'low_activity'
  };
};

/**
 * Categoriza usuários inativos
 */
const categorizeInactiveUsers = (inactivityAnalysis) => {
  return {
    critical: inactivityAnalysis.filter(u => u.inactivity.level === 'critical'),
    high: inactivityAnalysis.filter(u => u.inactivity.level === 'high'),
    medium: inactivityAnalysis.filter(u => u.inactivity.level === 'medium'),
    low: inactivityAnalysis.filter(u => u.inactivity.level === 'low')
  };
};

/**
 * Calcula dias de inatividade
 */
const calculateDaysInactive = (lastDate) => {
  if (!lastDate) return 999;
  const now = new Date();
  const last = new Date(lastDate);
  return Math.floor((now - last) / (1000 * 60 * 60 * 24));
};

/**
 * Converte timeframe para dias
 */
const parseTimeframeToDays = (timeframe) => {
  const unit = timeframe.slice(-1);
  const value = parseInt(timeframe.slice(0, -1));
  
  switch (unit) {
    case 'd': return value;
    case 'M': return value * 30;
    case 'h': return Math.ceil(value / 24);
    default: return 30;
  }
};

/**
 * Calcula confiança da sugestão
 */
const calculateSuggestionConfidence = (activityData, roleAdequacy, suggestions) => {
  let confidence = 50; // Base
  
  if (activityData.productivity.overallScore > 80) confidence += 20;
  if (suggestions.recommended && suggestions.recommended.confidence > 85) confidence += 15;
  
  return Math.min(95, confidence);
};

// Implementar outros métodos auxiliares necessários...
const calculateMovementEfficiency = (movements) => {
  if (!movements || !Array.isArray(movements)) return 0;
  return movements.length > 0 ? Math.min(100, movements.length * 2) : 0;
};

const calculateLocationUtilization = (locationActivity) => {
  if (!locationActivity || typeof locationActivity.uniqueLocations !== 'number') return 0;
  return locationActivity.uniqueLocations > 0 ? Math.min(100, locationActivity.uniqueLocations * 10) : 0;
};

const calculateProductManagement = (productActivity) => {
  if (!productActivity || typeof productActivity.uniqueProducts !== 'number') return 0;
  return productActivity.uniqueProducts > 0 ? Math.min(100, productActivity.uniqueProducts * 5) : 0;
};

const calculateSystemUsage = (sessionActivity) => {
  if (!sessionActivity || typeof sessionActivity.totalLogins !== 'number') return 0;
  
  // **CORREÇÃO**: Tratar averageLoginsPerDay quando undefined
  const avgLogins = sessionActivity.averageLoginsPerDay || 0;
  const totalLogins = sessionActivity.totalLogins || 0;
  
  // Usar totalLogins se averageLoginsPerDay não estiver disponível
  const scoreBase = avgLogins > 0 ? avgLogins * 30 : totalLogins * 2;
  
  return Math.min(100, scoreBase);
};

const analyzeWorkingHours = (movements) => {
  if (!movements.length) return [];
  
  const hours = movements.map(m => new Date(m.timestamp).getHours());
  const hourCounts = {};
  hours.forEach(h => hourCounts[h] = (hourCounts[h] || 0) + 1);
  
  return Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour]) => `${hour}:00-${parseInt(hour)+1}:00`);
};

const analyzeOperationTypes = (movements) => {
  if (!movements.length) return [];
  
  const types = {};
  movements.forEach(m => types[m.type] = (types[m.type] || 0) + 1);
  
  return Object.entries(types)
    .sort(([,a], [,b]) => b - a)
    .map(([type]) => type);
};

const analyzeWorkingDays = (movements) => {
  if (!movements.length) return [];
  
  const days = movements.map(m => new Date(m.timestamp).getDay());
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab'];
  const dayCounts = {};
  
  days.forEach(d => dayCounts[dayNames[d]] = (dayCounts[dayNames[d]] || 0) + 1);
  
  return Object.entries(dayCounts)
    .sort(([,a], [,b]) => b - a)
    .map(([day]) => day);
};

const identifyPreferredLocations = (locationActivity) => {
  return locationActivity.details ? locationActivity.details.slice(0, 5) : [];
};

const analyzeProductTypePreferences = (productActivity) => {
  return productActivity.details ? productActivity.details.slice(0, 3) : [];
};

const calculateConsistencyPattern = (movements) => {
  return movements.length > 10 ? 80 : Math.max(20, movements.length * 8);
};

const calculateAdvancedMetrics = (activityData, reportData) => {
  return {
    efficiency: reportData.metrics?.efficiency || activityData.productivity.overallScore,
    quality: reportData.metrics?.quality || 85,
    growth: calculateGrowthMetrics(activityData),
    consistency: calculateConsistencyMetrics(activityData)
  };
};

const generateComparativeAnalysis = async (userId, peers, activityData) => {
  return {
    roleAverage: 75,
    ranking: Math.floor(Math.random() * peers.length) + 1,
    benchmark: {
      topPerformer: peers[0]?.name || 'N/A',
      averageScore: 75,
      yourScore: activityData.productivity.overallScore
    }
  };
};

const generateProductivityRecommendations = (activityData, metrics, comparison) => {
  const recommendations = [];
  
  if (metrics.efficiency < 70) {
    recommendations.push('Focar em melhorar eficiência das operações');
  }
  
  if (comparison && comparison.ranking > 5) {
    recommendations.push('Considerar treinamento adicional');
  }
  
  return recommendations;
};

const generateInactivityRecommendations = (categories, byRole) => {
  const recommendations = [];
  
  if (categories.critical && categories.critical.length > 0) {
    recommendations.push({
      action: 'immediate_contact',
      priority: 'high',
      description: `Contatar ${categories.critical.length} usuários críticos imediatamente`
    });
  }
  
  if (categories.high && categories.high.length > 0) {
    recommendations.push({
      action: 'send_reminder',
      priority: 'medium',
      description: `Enviar lembrete para ${categories.high.length} usuários com baixa atividade`
    });
  }
  
  if (categories.medium && categories.medium.length > 0) {
    recommendations.push({
      action: 'monitor_closely',
      priority: 'low',
      description: `Monitorar de perto ${categories.medium.length} usuários com atividade moderada`
    });
  }
  
  if (byRole) {
    Object.entries(byRole).forEach(([role, users]) => {
      if (users && users.length > 0) {
        const inactiveInRole = users.filter(u => u.inactivity.isInactive).length;
        if (inactiveInRole > 0) {
          recommendations.push({
            action: 'role_specific_training',
            priority: 'medium',
            description: `${inactiveInRole} usuários ${role} precisam de atenção específica`
          });
        }
      }
    });
  }
  
  return recommendations;
};

const validatePermissionList = (permissions, userRole, context, securityAnalysis) => {
  const rolePermissions = {
    admin: ['read', 'write', 'delete', 'manage'],
    operator: ['read', 'write', 'create_movements'],
    viewer: ['read']
  };
  
  const userPermissions = rolePermissions[userRole] || [];
  
  return {
    allowed: permissions.filter(p => userPermissions.includes(p) || userPermissions.includes(p.split('_')[0])),
    denied: permissions.filter(p => !userPermissions.includes(p) && !userPermissions.includes(p.split('_')[0]))
  };
};

const generateSecurityRecommendations = (validation, context, securityAnalysis) => {
  const recommendations = [];
  
  if (validation.denied.length > 0) {
    recommendations.push('Operação negada por restrições de segurança');
  }
  
  if (context.riskLevel === 'high') {
    recommendations.push('Operação de alto risco - requerer aprovação adicional');
  }
  
  if (securityAnalysis.alerts && securityAnalysis.alerts.length > 0) {
    recommendations.push('Alertas de segurança detectados');
  }
  
  return recommendations;
};

// Funções auxiliares adicionais
const calculateRiskLevel = (context, user) => {
  let risk = 'low';
  
  if (context.timeOfDay && (context.timeOfDay < 6 || context.timeOfDay > 22)) {
    risk = 'medium';
  }
  
  if (context.operation === 'bulk_delete' || context.operation === 'mass_transfer') {
    risk = 'high';
  }
  
  return risk;
};

const identifyRestrictions = (context, user) => {
  const restrictions = [];
  
  if (user.role === 'viewer' && context.operation !== 'read') {
    restrictions.push('role_limitation');
  }
  
  return restrictions;
};

const calculateLeadershipCapability = (details) => {
  return details?.movements?.filter(m => m.metadata?.supervisorApproved).length * 10 || 50;
};

const calculateTechnicalCapability = (details) => {
  return details?.movements?.filter(m => m.complexity === 'high').length * 15 || 60;
};

const calculateManagementCapability = (details) => {
  return details?.movements?.filter(m => m.type === 'complex_transfer').length * 20 || 40;
};

const calculateRoleScore = (role, capabilities, activityData) => {
  const weights = {
    admin: { leadership: 0.4, management: 0.3, technical: 0.2, efficiency: 0.1 },
    operator: { technical: 0.4, efficiency: 0.3, management: 0.2, leadership: 0.1 },
    viewer: { efficiency: 0.6, technical: 0.3, management: 0.1, leadership: 0 }
  };
  
  const roleWeights = weights[role];
  if (!roleWeights) return 50;
  
  return Math.round(
    capabilities.leadership * roleWeights.leadership +
    capabilities.management * roleWeights.management +
    capabilities.technical * roleWeights.technical +
    capabilities.efficiency * roleWeights.efficiency
  );
};

const generateRoleReasoning = (role, capabilities, activityData) => {
  return `Análise baseada em atividade de ${activityData.timeframe} e capacidades demonstradas`;
};

const getRoleRequirements = (role) => {
  const requirements = {
    admin: ['Liderança', 'Gestão avançada', 'Experiência técnica'],
    operator: ['Conhecimento técnico', 'Eficiência operacional'],
    viewer: ['Conhecimento básico do sistema']
  };
  
  return requirements[role] || [];
};

const checkRoleRequirements = (role, capabilities, activityData) => {
  const thresholds = {
    admin: { leadership: 70, management: 70, technical: 60 },
    operator: { technical: 60, efficiency: 70 },
    viewer: { efficiency: 40 }
  };
  
  const roleThresholds = thresholds[role];
  if (!roleThresholds) return false;
  
  return Object.entries(roleThresholds).every(([cap, threshold]) => 
    capabilities[cap] >= threshold
  );
};

const estimateTransitionTimeline = (currentRole, targetRole) => {
  const transitions = {
    'viewer-operator': '2-4 semanas',
    'operator-admin': '1-3 meses',
    'viewer-admin': '3-6 meses'
  };
  
  return transitions[`${currentRole}-${targetRole}`] || '1-2 meses';
};

const calculateGrowthMetrics = (activityData) => {
  return {
    trend: 'stable',
    rate: 5,
    projection: 'positive'
  };
};

const calculateConsistencyMetrics = (activityData) => {
  return {
    score: activityData.patterns.consistency,
    trend: 'improving',
    variation: 'low'
  };
};

module.exports = {
  analyzeUserActivity,
  suggestRoleChanges,
  generateUserProductivityReport,
  findUsersWithSimilarPatterns,
  detectInactiveUsers,
  validateUserPermissions,
  calculateProductivityScore,
  detectUsagePatterns,
  analyzeDemonstratedCapabilities,
  calculateRoleAdequacy,
  generateRoleSuggestions,
  calculateInactivityLevel,
  categorizeInactiveUsers,
  calculateDaysInactive,
  parseTimeframeToDays,
  // Funções auxiliares exportadas para testes
  getProductivityLevel,
  analyzeOperationContext,
  analyzeEfficiencyComparison,
  generateUserInsights,
  calculateSuggestionConfidence
}; 