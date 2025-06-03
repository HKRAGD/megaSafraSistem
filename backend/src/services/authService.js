/**
 * Auth Service
 * Sistema de Autenticação Inteligente
 * 
 * Funcionalidades:
 * - Autenticação com análise de segurança
 * - Detecção de atividades suspeitas
 * - Análise de padrões de login
 * - Rastreamento de sessões
 * - Relatórios de segurança
 * 
 * Integrações:
 * - movementService (auditoria)
 * - reportService (relatórios)
 */

const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/auth');
const User = require('../models/User');
const movementService = require('./movementService');
const reportService = require('./reportService');

/**
 * Autentica usuário com análise de segurança
 * @param {string} email - Email do usuário
 * @param {string} password - Senha do usuário
 * @param {object} options - Opções de autenticação
 * @returns {object} Resultado da autenticação
 */
const authenticateUser = async (email, password, options = {}) => {
  try {
    // 1. Análise prévia do login
    const loginAnalysis = await analyzeLoginAttempt(email, options.metadata);
    
    // 2. Buscar usuário
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      // Registrar tentativa de login com email inexistente
      if (options.auditFailures !== false) {
        await movementService.registerSecurityEvent({
          type: 'failed_login',
          email,
          reason: 'user_not_found',
          metadata: {
            ...options.metadata,
            timestamp: new Date(),
            severity: 'medium'
          }
        });
      }
      
      throw new Error('Email ou senha incorretos');
    }

    // 3. Verificar se usuário está ativo
    if (!user.isActive) {
      await movementService.registerSecurityEvent({
        type: 'inactive_user_login',
        userId: user._id,
        email: user.email,
        metadata: options.metadata
      });
      
      throw new Error('Usuário desativado. Entre em contato com o administrador');
    }

    // 4. Verificar senha
    const isPasswordCorrect = await user.comparePassword(password);
    
    if (!isPasswordCorrect) {
      await movementService.registerSecurityEvent({
        type: 'failed_login',
        userId: user._id,
        email: user.email,
        reason: 'incorrect_password',
        metadata: options.metadata
      });
      
      throw new Error('Email ou senha incorretos');
    }

    // 5. Verificar se login é suspeito
    if (loginAnalysis.isSuspicious && options.checkSuspicious !== false) {
      await movementService.registerSecurityEvent({
        type: 'suspicious_login',
        userId: user._id,
        email: user.email,
        metadata: {
          ...options.metadata,
          suspiciousReasons: loginAnalysis.reasons,
          riskScore: loginAnalysis.riskScore
        }
      });
      
      // Se risco muito alto, bloquear
      if (loginAnalysis.riskScore >= 0.79) {
        throw new Error('Login bloqueado por atividade suspeita. Entre em contato com o administrador');
      }
    }

    // 6. Gerar tokens
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const accessToken = generateToken(tokenPayload);
    const refreshToken = generateRefreshToken({ id: user._id });

    // 7. Registrar login bem-sucedido
    await trackSessionActivity(user._id, 'login', {
      ...options.metadata,
      tokenGenerated: true,
      loginAnalysis
    });

    // 8. Remover senha da resposta
    user.password = undefined;

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
        tokens: {
          accessToken,
          refreshToken,
          expiresIn: process.env.JWT_EXPIRES_IN || '7d'
        },
        security: {
          riskScore: loginAnalysis.riskScore || 0,
          isSuspicious: loginAnalysis.isSuspicious || false,
          recommendedActions: loginAnalysis.recommendations || []
        }
      }
    };
  } catch (error) {
    throw new Error(`Erro na autenticação: ${error.message}`);
  }
};

/**
 * Analisa tentativa de login para detectar atividades suspeitas
 * @param {string} email - Email do usuário
 * @param {object} metadata - Metadados da requisição
 * @returns {object} Análise do login
 */
const analyzeLoginAttempt = async (email, metadata = {}) => {
  try {
    const analysis = {
      isSuspicious: false,
      riskScore: 0,
      reasons: [],
      recommendations: []
    };

    // 1. Verificar tentativas recentes falhas
    try {
      const recentFailures = await movementService.getSecurityEvents({
        type: 'failed_login',
        email,
        timeframe: '1h'
      });

      if (recentFailures && recentFailures.length >= 3) {
        analysis.isSuspicious = true;
        analysis.riskScore += 0.4;
        analysis.reasons.push('multiple_failed_attempts');
        analysis.recommendations.push('Verificar identidade do usuário');
      }
    } catch (error) {
      // **CORREÇÃO**: Não falhar se service não disponível
      console.warn('Falha ao verificar tentativas recentes:', error.message);
    }

    // 2. Verificar horário incomum
    const hour = new Date().getHours();
    if (hour < 6 || hour > 22) {
      analysis.riskScore += 0.1;
      analysis.reasons.push('unusual_time');
      analysis.recommendations.push('Verificar horário de acesso');
    }

    // 3. **CORREÇÃO**: Verificar IP diferente (mais robusto)
    if (metadata.ip) {
      try {
        const recentLogins = await getRecentUserLogins(email, '7d');
        const knownIPs = recentLogins
          .map(login => login.metadata?.ip)
          .filter(Boolean);
        
        if (knownIPs.length > 0 && !knownIPs.includes(metadata.ip)) {
          analysis.riskScore += 0.2;
          analysis.reasons.push('new_ip_address');
          analysis.recommendations.push('Verificar localização do acesso');
        }
      } catch (error) {
        // **CORREÇÃO**: Log mas continuar análise
        console.warn('Falha na verificação de IP:', error.message);
      }
    }

    // 4. **CORREÇÃO**: Verificar User-Agent diferente (mais robusto)
    if (metadata.userAgent) {
      try {
        const recentLogins = await getRecentUserLogins(email, '30d');
        const knownUserAgents = recentLogins
          .map(login => login.metadata?.userAgent)
          .filter(Boolean);
        
        if (knownUserAgents.length > 0 && !knownUserAgents.includes(metadata.userAgent)) {
          analysis.riskScore += 0.1;
          analysis.reasons.push('new_device');
          analysis.recommendations.push('Verificar dispositivo utilizado');
        }
      } catch (error) {
        // **CORREÇÃO**: Log mas continuar análise
        console.warn('Falha na verificação de device:', error.message);
      }
    }

    // 5. **CORREÇÃO**: Determinar se é suspeito com threshold mais baixo
    if (analysis.riskScore >= 0.2) {
      analysis.isSuspicious = true;
    }

    return analysis;
  } catch (error) {
    // **CORREÇÃO**: Em caso de erro na análise, retornar análise com info do erro
    console.error('Erro na análise de login:', error.message);
    return {
      isSuspicious: false,
      riskScore: 0,
      reasons: [],
      recommendations: [],
      error: error.message
    };
  }
};

/**
 * Analisa padrões de login de um usuário
 * @param {string} userId - ID do usuário
 * @param {string} timeframe - Período de análise
 * @returns {object} Análise de padrões
 */
const analyzeLoginPatterns = async (userId, timeframe = '7d') => {
  try {
    // **CORREÇÃO**: Usar função auxiliar robusta
    const loginEvents = await getRecentUserLogins(userId, timeframe);
    
    const patterns = {
      totalLogins: loginEvents ? loginEvents.length : 0,
      averageLoginsPerDay: '0',
      commonHours: [],
      uniqueIPs: [],
      uniqueDevices: [],
      suspiciousActivity: [],
      recommendations: []
    };

    if (!loginEvents || loginEvents.length === 0) {
      return patterns;
    }

    // 1. **CORREÇÃO**: Calcular média de logins por dia
    const days = calculateDaysFromTimeframe(timeframe);
    patterns.averageLoginsPerDay = (patterns.totalLogins / days).toFixed(1);

    // 2. **CORREÇÃO**: Analisar horários comuns (mais robusto)
    const hourCounts = {};
    loginEvents.forEach(event => {
      if (event.timestamp) {
        const hour = new Date(event.timestamp).getHours();
        hourCounts[hour] = (hourCounts[hour] || 0) + 1;
      }
    });
    
    patterns.commonHours = Object.entries(hourCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 3)
      .map(([hour, count]) => ({ hour: parseInt(hour), count }));

    // 3. **CORREÇÃO**: Analisar IPs únicos (mais robusto)
    const ips = loginEvents
      .map(event => event.metadata?.ip)
      .filter(Boolean);
    patterns.uniqueIPs = [...new Set(ips)];

    // 4. **CORREÇÃO**: Analisar dispositivos únicos (mais robusto)
    const devices = loginEvents
      .map(event => event.metadata?.userAgent)
      .filter(Boolean);
    patterns.uniqueDevices = [...new Set(devices)];

    // 5. **CORREÇÃO**: Detectar atividade suspeita com thresholds corretos
    if (patterns.uniqueIPs.length > 5) {
      patterns.suspiciousActivity.push({
        type: 'multiple_ips',
        description: `Login de ${patterns.uniqueIPs.length} IPs diferentes`,
        severity: 'medium'
      });
    }

    if (patterns.uniqueDevices.length > 3) {
      patterns.suspiciousActivity.push({
        type: 'multiple_devices',
        description: `Login de ${patterns.uniqueDevices.length} dispositivos diferentes`,
        severity: 'low'
      });
    }

    // 6. **CORREÇÃO**: Gerar recomendações baseadas em atividade suspeita
    if (patterns.suspiciousActivity.length > 0) {
      patterns.recommendations.push('Revisar logs de segurança do usuário');
      patterns.recommendations.push('Considerar verificação adicional');
    }

    return patterns;
  } catch (error) {
    // **CORREÇÃO**: Retorno mais robusto em caso de erro
    console.error('Erro na análise de padrões:', error.message);
    return {
      totalLogins: 0,
      averageLoginsPerDay: '0',
      commonHours: [],
      uniqueIPs: [],
      uniqueDevices: [],
      suspiciousActivity: [],
      recommendations: [],
      error: error.message
    };
  }
};

/**
 * Detecta atividades suspeitas no sistema
 * @param {object} filters - Filtros da análise
 * @returns {object} Atividades suspeitas detectadas
 */
const detectSuspiciousActivity = async (filters = {}) => {
  try {
    const timeframe = filters.timeframe || '24h';
    
    // **CORREÇÃO**: Buscar eventos com tratamento de erro robusto
    let allSecurityEvents = [];
    try {
      allSecurityEvents = await movementService.getSecurityEvents({
        timeframe,
        ...filters
      });
    } catch (error) {
      console.warn('Falha ao buscar eventos de segurança:', error.message);
      allSecurityEvents = [];
    }

    // **CORREÇÃO**: Análise mais robusta dos eventos
    const analysis = {
      totalEvents: allSecurityEvents.length,
      eventsByType: {},
      affectedUsers: [],
      recommendations: []
    };

    // Agrupar por tipo
    allSecurityEvents.forEach(event => {
      const type = event.type || 'unknown';
      analysis.eventsByType[type] = (analysis.eventsByType[type] || 0) + 1;
    });

    // **CORREÇÃO**: Identificar usuários afetados
    const uniqueUsers = [...new Set(
      allSecurityEvents
        .map(event => event.userId)
        .filter(Boolean)
    )];
    analysis.affectedUsers = uniqueUsers;

    // **CORREÇÃO**: Gerar recomendações baseadas nos dados
    const failedLogins = analysis.eventsByType.failed_login || 0;
    
    if (failedLogins > 50) {
      analysis.recommendations.push('Implementar CAPTCHA ou rate limiting');
    }
    
    if (failedLogins > 20) {
      analysis.recommendations.push('Monitorar tentativas de força bruta');
    }
    
    if (analysis.eventsByType.suspicious_login > 10) {
      analysis.recommendations.push('Revisar políticas de segurança');
    }

    return {
      success: true,
      data: analysis
    };
  } catch (error) {
    throw new Error(`Erro na detecção de atividades suspeitas: ${error.message}`);
  }
};

/**
 * Revoga todas as sessões de um usuário
 * @param {string} userId - ID do usuário
 * @param {string} reason - Motivo da revogação
 * @returns {object} Resultado da operação
 */
const revokeUserSessions = async (userId, reason = 'Manual revocation') => {
  try {
    // 1. Atualizar campo de mudança de senha para invalidar tokens
    const user = await User.findByIdAndUpdate(
      userId,
      { passwordChangedAt: new Date() },
      { new: true }
    );

    if (!user) {
      throw new Error('Usuário não encontrado');
    }

    // 2. Registrar evento de revogação
    await trackSessionActivity(userId, 'session_revoked', {
      reason,
      revokedBy: 'system',
      timestamp: new Date()
    });

    // 3. Registrar evento de segurança
    await movementService.registerSecurityEvent({
      type: 'session_revoked',
      userId,
      metadata: {
        reason,
        timestamp: new Date()
      }
    });

    return {
      success: true,
      message: 'Todas as sessões do usuário foram revogadas',
      data: {
        userId,
        revokedAt: new Date(),
        reason
      }
    };
  } catch (error) {
    throw new Error(`Erro ao revogar sessões: ${error.message}`);
  }
};

/**
 * Gera relatório de segurança
 * @param {object} filters - Filtros do relatório
 * @returns {object} Relatório de segurança
 */
const generateSecurityReport = async (filters = {}) => {
  try {
    const timeframe = filters.timeframe || '7d';
    
    // 1. Usar reportService para gerar relatório base
    const baseReport = await reportService.generateSecurityReport(filters);
    
    // 2. Adicionar análises específicas de autenticação
    const [loginPatterns, suspiciousActivity, userRisks] = await Promise.all([
      analyzeSystemLoginPatterns(timeframe),
      detectSuspiciousActivity({ timeframe }),
      analyzeUserRisks(timeframe)
    ]);

    return {
      success: true,
      data: {
        ...baseReport.data,
        authentication: {
          loginPatterns,
          suspiciousActivity: suspiciousActivity.data,
          userRisks,
          generatedAt: new Date(),
          timeframe
        }
      }
    };
  } catch (error) {
    throw new Error(`Erro na geração do relatório de segurança: ${error.message}`);
  }
};

/**
 * Rastreia atividade de sessão
 * @param {string} userId - ID do usuário
 * @param {string} action - Ação realizada
 * @param {object} metadata - Metadados da ação
 * @returns {Promise<void>}
 */
const trackSessionActivity = async (userId, action, metadata = {}) => {
  try {
    // **CORREÇÃO**: Verificar se movementService está disponível
    if (!movementService || !movementService.registerSecurityEvent) {
      console.warn('MovementService não disponível para trackSessionActivity');
      return;
    }
    
    await movementService.registerSecurityEvent({
      type: 'session_activity',
      userId,
      action,
      metadata: {
        ...metadata,
        timestamp: new Date()
      }
    });
  } catch (error) {
    // **CORREÇÃO**: Log do erro, mas não falhar a operação principal
    console.error('Erro ao rastrear atividade de sessão:', error.message);
  }
};

// ========== MÉTODOS AUXILIARES ==========

/**
 * Obtém logins recentes de um usuário
 * @param {string} userIdOrEmail - ID ou email do usuário
 * @param {string} timeframe - Período
 * @returns {Array} Lista de logins
 */
const getRecentUserLogins = async (userIdOrEmail, timeframe) => {
  try {
    // **CORREÇÃO**: Verificar se movementService está disponível
    if (!movementService || !movementService.getSecurityEvents) {
      console.warn('MovementService não disponível para getRecentUserLogins');
      return [];
    }
    
    const events = await movementService.getSecurityEvents({
      type: 'session_activity',
      userId: userIdOrEmail.includes('@') ? undefined : userIdOrEmail,
      email: userIdOrEmail.includes('@') ? userIdOrEmail : undefined,
      action: 'login',
      timeframe
    });
    
    return events || [];
  } catch (error) {
    console.warn('Erro ao buscar logins recentes:', error.message);
    return [];
  }
};

/**
 * Calcula score de risco do usuário
 * @param {Array} events - Eventos do usuário
 * @returns {number} Score de risco (0-1)
 */
const calculateUserRiskScore = (events) => {
  let score = 0;
  
  events.forEach(event => {
    switch (event.type) {
      case 'failed_login':
        score += 0.1;
        break;
      case 'suspicious_login':
        score += 0.3;
        break;
      case 'inactive_user_login':
        score += 0.5;
        break;
    }
  });
  
  return Math.min(score, 1); // Máximo 1
};

/**
 * Formata descrição de evento
 * @param {object} event - Evento
 * @returns {string} Descrição formatada
 */
const formatEventDescription = (event) => {
  const descriptions = {
    'failed_login': 'Tentativa de login falhada',
    'suspicious_login': 'Login suspeito detectado',
    'inactive_user_login': 'Tentativa de login com usuário inativo',
    'session_revoked': 'Sessões revogadas',
    'session_activity': `Atividade de sessão: ${event.action}`
  };
  
  return descriptions[event.type] || event.type;
};

/**
 * Calcula dias a partir de timeframe
 * @param {string} timeframe - Período (ex: '7d', '24h')
 * @returns {number} Número de dias
 */
const calculateDaysFromTimeframe = (timeframe) => {
  if (!timeframe || typeof timeframe !== 'string') {
    return 7; // Default
  }
  
  if (timeframe.endsWith('d')) {
    const days = parseInt(timeframe.replace('d', ''));
    return isNaN(days) ? 7 : days;
  } else if (timeframe.endsWith('h')) {
    const hours = parseInt(timeframe.replace('h', ''));
    return isNaN(hours) ? 7 : hours / 24;
  }
  
  return 7; // Default para formatos inválidos
};

/**
 * Analisa padrões de login do sistema
 * @param {string} timeframe - Período
 * @returns {object} Padrões do sistema
 */
const analyzeSystemLoginPatterns = async (timeframe) => {
  try {
    const allLogins = await movementService.getSecurityEvents({
      type: 'session_activity',
      action: 'login',
      timeframe
    });

    return {
      totalLogins: allLogins.length,
      uniqueUsers: [...new Set(allLogins.map(login => login.userId))].length,
      peakHours: calculatePeakHours(allLogins),
      averageLoginsPerDay: (allLogins.length / calculateDaysFromTimeframe(timeframe)).toFixed(1)
    };
  } catch (error) {
    return {
      totalLogins: 0,
      uniqueUsers: 0,
      peakHours: [],
      averageLoginsPerDay: '0'
    };
  }
};

/**
 * Analisa riscos dos usuários
 * @param {string} timeframe - Período
 * @returns {object} Análise de riscos
 */
const analyzeUserRisks = async (timeframe) => {
  try {
    const users = await User.find({ isActive: true }).select('_id name email role');
    const userRisks = [];

    for (const user of users) {
      const patterns = await analyzeLoginPatterns(user._id, timeframe);
      const riskScore = calculateUserRiskFromPatterns(patterns);
      
      if (riskScore > 0.3) {
        userRisks.push({
          userId: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          riskScore,
          patterns
        });
      }
    }

    return userRisks.sort((a, b) => b.riskScore - a.riskScore);
  } catch (error) {
    return [];
  }
};

/**
 * Calcula risco baseado em padrões
 * @param {object} patterns - Padrões do usuário
 * @returns {number} Score de risco
 */
const calculateUserRiskFromPatterns = (patterns) => {
  let risk = 0;
  
  if (patterns.uniqueIPs.length > 5) risk += 0.3;
  if (patterns.uniqueDevices.length > 3) risk += 0.2;
  if (patterns.suspiciousActivity.length > 0) risk += 0.4;
  
  return Math.min(risk, 1);
};

/**
 * Calcula horários de pico
 * @param {Array} logins - Lista de logins
 * @returns {Array} Horários de pico
 */
const calculatePeakHours = (logins) => {
  const hourCounts = {};
  
  logins.forEach(login => {
    const hour = new Date(login.timestamp).getHours();
    hourCounts[hour] = (hourCounts[hour] || 0) + 1;
  });
  
  return Object.entries(hourCounts)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 3)
    .map(([hour, count]) => ({ hour: parseInt(hour), count }));
};

module.exports = {
  authenticateUser,
  analyzeLoginAttempt,
  analyzeLoginPatterns,
  detectSuspiciousActivity,
  revokeUserSessions,
  generateSecurityReport,
  trackSessionActivity,
  getRecentUserLogins,
  calculateUserRiskScore,
  formatEventDescription,
  calculateDaysFromTimeframe,
  analyzeSystemLoginPatterns,
  analyzeUserRisks,
  calculateUserRiskFromPatterns,
  calculatePeakHours
}; 