/**
 * Controller de Autenticação
 * Objetivos: Sistema completo de autenticação JWT com roles e segurança
 * Baseado no planejamento: /api/auth com login, register, refresh, logout
 * 
 * REESTRUTURADO: Agora usa authService para funcionalidades avançadas de segurança
 */

const { generateToken, generateRefreshToken, verifyRefreshToken } = require('../config/auth');
const { AppError, asyncHandler } = require('../middleware/errorHandler');
const User = require('../models/User');
const authService = require('../services/authService');

/**
 * @desc    Login usuário
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  // 1. Verificar se email e senha foram fornecidos
  if (!email || !password) {
    return next(new AppError('Email e senha são obrigatórios', 400));
  }

  // 2. Preparar metadados para análise de segurança
  const metadata = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    endpoint: req.path,
    method: req.method
  };

  try {
    // 3. Usar authService para autenticação com análise de segurança
    const result = await authService.authenticateUser(email, password, { 
      metadata,
      auditFailures: true,
      checkSuspicious: true
    });

    // 4. Configurar cookie do refresh token (httpOnly para segurança)
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res.cookie('refreshToken', result.data.tokens.refreshToken, cookieOptions);

    // 5. Resposta de sucesso com dados de segurança
    res.status(200).json({
      success: true,
      message: 'Login realizado com sucesso',
      data: {
        user: result.data.user,
        accessToken: result.data.tokens.accessToken,
        expiresIn: result.data.tokens.expiresIn,
        security: result.data.security
      }
    });

  } catch (error) {
    // Tratamento de erro específico para autenticação
    return next(new AppError(error.message.replace('Erro na autenticação: ', ''), 401));
  }
});

/**
 * @desc    Registrar novo usuário (apenas admin)
 * @route   POST /api/auth/register
 * @access  Private (Admin only)
 */
const register = asyncHandler(async (req, res, next) => {
  const { name, email, password, role } = req.body;

  // 1. Verificar se o usuário que está criando é admin
  if (!req.user || !req.user.isAdmin()) {
    return next(new AppError('Apenas administradores podem criar usuários', 403));
  }

  // 2. Verificar se usuário já existe
  const existingUser = await User.findByEmail(email);
  
  if (existingUser) {
    return next(new AppError('Usuário com este email já existe', 400));
  }

  // 3. Validar role (se fornecido)
  const validRoles = ['admin', 'operator', 'viewer'];
  if (role && !validRoles.includes(role)) {
    return next(new AppError(`Role inválido. Deve ser um de: ${validRoles.join(', ')}`, 400));
  }

  // 4. Criar usuário
  const userData = {
    name: name.trim(),
    email: email.toLowerCase().trim(),
    password,
    role: role || 'viewer'
  };

  const newUser = await User.create(userData);

  // 5. Registrar evento de criação de usuário usando authService
  const metadata = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    createdBy: req.user._id,
    createdByEmail: req.user.email,
    timestamp: new Date()
  };

  await authService.trackSessionActivity(req.user._id, 'user_created', {
    ...metadata,
    targetUserId: newUser._id,
    targetUserEmail: newUser.email,
    targetUserRole: newUser.role
  });

  // 6. Remover senha da resposta
  newUser.password = undefined;

  // 7. Resposta de sucesso
  res.status(201).json({
    success: true,
    message: 'Usuário criado com sucesso',
    data: {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        isActive: newUser.isActive,
        createdAt: newUser.createdAt
      }
    }
  });
});

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (com refresh token válido)
 */
const refreshToken = asyncHandler(async (req, res, next) => {
  // 1. Obter refresh token do cookie ou body
  let token = req.cookies.refreshToken;
  
  if (!token && req.body.refreshToken) {
    token = req.body.refreshToken;
  }

  if (!token) {
    return next(new AppError('Refresh token não fornecido', 401));
  }

  try {
    // 2. Verificar refresh token
    const decoded = verifyRefreshToken(token);
    
    // 3. Verificar se usuário ainda existe e está ativo
    const user = await User.findById(decoded.id);
    
    if (!user) {
      return next(new AppError('Usuário não encontrado', 401));
    }
    
    if (!user.isActive) {
      return next(new AppError('Usuário desativado', 401));
    }

    // 4. Gerar novo access token
    const tokenPayload = {
      id: user._id,
      email: user.email,
      role: user.role
    };

    const newAccessToken = generateToken(tokenPayload);
    const newRefreshToken = generateRefreshToken({ id: user._id });

    // 5. Registrar atividade de refresh usando authService
    const metadata = {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      action: 'token_refresh'
    };

    await authService.trackSessionActivity(user._id, 'token_refresh', metadata);

    // 6. Atualizar cookie do refresh token
    const cookieOptions = {
      expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 dias
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    };
    
    res.cookie('refreshToken', newRefreshToken, cookieOptions);

    // 7. Resposta de sucesso
    res.status(200).json({
      success: true,
      message: 'Token renovado com sucesso',
      data: {
        accessToken: newAccessToken,
        expiresIn: process.env.JWT_EXPIRES_IN || '7d'
      }
    });

  } catch (error) {
    return next(new AppError('Refresh token inválido ou expirado', 401));
  }
});

/**
 * @desc    Logout usuário
 * @route   POST /api/auth/logout
 * @access  Private
 */
const logout = asyncHandler(async (req, res, next) => {
  // 1. Limpar cookie do refresh token
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  });

  // 2. Registrar atividade de logout usando authService
  const metadata = {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date(),
    action: 'logout'
  };

  if (req.user) {
    await authService.trackSessionActivity(req.user._id, 'logout', metadata);
  }

  // 3. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Logout realizado com sucesso'
  });
});

/**
 * @desc    Obter informações de segurança do usuário atual
 * @route   GET /api/auth/security-info
 * @access  Private
 */
const getSecurityInfo = asyncHandler(async (req, res, next) => {
  try {
    // Dados básicos do usuário para recuperação de sessão
    const user = {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt
    };

    // Informações básicas de segurança
    const securityInfo = {
      sessionId: req.sessionId || 'unknown',
      loginAttempts: 0,
      lastLogin: req.user.updatedAt || req.user.createdAt,
      activeSessions: 1
    };

    res.status(200).json({
      success: true,
      data: {
        user, // Incluir dados do usuário para recuperação de sessão
        ...securityInfo,
        lastUpdate: new Date()
      }
    });

  } catch (error) {
    return next(new AppError('Erro ao obter informações de segurança', 500));
  }
});

/**
 * @desc    Revogar todas as sessões do usuário
 * @route   POST /api/auth/revoke-sessions
 * @access  Private
 */
const revokeSessions = asyncHandler(async (req, res, next) => {
  const { reason } = req.body;

  try {
    // Usar authService para revogar sessões
    await authService.revokeUserSessions(req.user._id, reason || 'Manual por usuário');

    // Limpar cookie atual
    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    res.status(200).json({
      success: true,
      message: 'Todas as sessões foram revogadas com sucesso'
    });

  } catch (error) {
    return next(new AppError('Erro ao revogar sessões', 500));
  }
});

module.exports = {
  login,
  register,
  refreshToken,
  logout,
  getSecurityInfo,
  revokeSessions
}; 