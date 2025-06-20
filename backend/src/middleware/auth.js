const { verifyToken } = require('../config/auth');
const { AppError, asyncHandler } = require('./errorHandler');
const User = require('../models/User');

/**
 * Middleware para verificar token JWT
 * Extrai e valida o token do cabeçalho Authorization
 */
const authenticateToken = asyncHandler(async (req, res, next) => {
  // 1. Extrair token do cabeçalho
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    // Suporte a token via cookie (opcional)
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(new AppError('Token de acesso requerido', 401));
  }

  try {
    // 2. Verificar e decodificar token
    const decoded = verifyToken(token);
    
    // 3. Verificar se o usuário ainda existe
    const currentUser = await User.findById(decoded.id).select('+password');
    if (!currentUser) {
      return next(new AppError('O usuário do token não existe mais', 401));
    }

    // 4. Verificar se usuário está ativo
    if (!currentUser.isActive) {
      return next(new AppError('Usuário desativado', 401));
    }

    // 5. Verificar se a senha foi alterada após o token ser emitido
    if (currentUser.passwordChangedAfter && currentUser.passwordChangedAfter(decoded.iat)) {
      return next(new AppError('Senha alterada recentemente. Faça login novamente', 401));
    }

    // 6. Adicionar usuário à requisição
    req.user = currentUser;
    req.userId = currentUser._id;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(new AppError('Token inválido', 401));
    } else if (error.name === 'TokenExpiredError') {
      return next(new AppError('Token expirado', 401));
    }
    return next(new AppError('Erro na autenticação', 401));
  }
});

/**
 * Middleware para verificar roles do usuário
 * @param {string|Array} roles - Role ou array de roles permitidos
 */
const authorizeRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return next(new AppError('Usuário não autenticado', 401));
    }

    // Converter roles para array se for string
    const allowedRoles = Array.isArray(roles[0]) ? roles[0] : roles;
    
    if (!allowedRoles.includes(req.user.role)) {
      return next(new AppError(
        `Acesso negado. Requer uma das seguintes permissões: ${allowedRoles.join(', ')}`,
        403
      ));
    }

    next();
  };
};

/**
 * Middleware para verificar se é admin
 */
const requireAdmin = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.isAdmin()) {
    return next(new AppError('Acesso restrito a administradores', 403));
  }

  next();
};

/**
 * Middleware para verificar se é operador
 */
const requireOperator = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.isOperator()) {
    return next(new AppError('Acesso restrito a operadores', 403));
  }

  next();
};

/**
 * Middleware para verificar permissões específicas de produto
 */
const canCreateProduct = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canCreateProduct()) {
    return next(new AppError('Apenas administradores podem cadastrar produtos', 403));
  }

  next();
};

const canLocateProduct = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canLocateProduct()) {
    return next(new AppError('Apenas operadores podem localizar produtos', 403));
  }

  next();
};

const canMoveProduct = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canMoveProduct()) {
    return next(new AppError('Apenas operadores podem mover produtos', 403));
  }

  next();
};

const canRemoveProduct = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canRemoveProduct()) {
    return next(new AppError('Apenas administradores podem remover produtos', 403));
  }

  next();
};

const canRequestWithdrawal = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canRequestWithdrawal()) {
    return next(new AppError('Apenas administradores podem solicitar retiradas', 403));
  }

  next();
};

const canConfirmWithdrawal = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canConfirmWithdrawal()) {
    return next(new AppError('Apenas operadores podem confirmar retiradas', 403));
  }

  next();
};

const canManageUsers = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canManageUsers()) {
    return next(new AppError('Apenas administradores podem gerenciar usuários', 403));
  }

  next();
};

const canAccessReports = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  if (!req.user.canAccessReports()) {
    return next(new AppError('Apenas administradores podem acessar relatórios completos', 403));
  }

  next();
};

/**
 * Middleware opcional de autenticação
 * Não falha se não houver token, apenas adiciona o usuário se existir
 */
const optionalAuth = asyncHandler(async (req, res, next) => {
  let token;
  
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (token) {
    try {
      const decoded = verifyToken(token);
      const currentUser = await User.findById(decoded.id);
      
      if (currentUser && currentUser.isActive) {
        req.user = currentUser;
        req.userId = currentUser._id;
      }
    } catch (error) {
      // Falha silenciosa - apenas não define req.user
    }
  }

  next();
});

/**
 * Middleware para verificar se o usuário pode acessar seus próprios dados
 * ou se é admin
 */
const canAccessUser = (req, res, next) => {
  if (!req.user) {
    return next(new AppError('Usuário não autenticado', 401));
  }

  const targetUserId = req.params.id || req.params.userId || req.body.userId;
  
  if (req.user.isAdmin() || req.user._id.toString() === targetUserId) {
    return next();
  }

  return next(new AppError('Acesso negado aos dados deste usuário', 403));
};

/**
 * Middleware para rate limiting por usuário
 * Implementação básica - em produção usar redis
 */
const userRateLimit = (maxRequests = 100, windowMs = 15 * 60 * 1000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    if (!req.user) {
      return next();
    }

    const userId = req.user._id.toString();
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Limpar requests antigos
    if (requests.has(userId)) {
      const userRequests = requests.get(userId).filter(time => time > windowStart);
      requests.set(userId, userRequests);
    }
    
    // Verificar limite
    const userRequests = requests.get(userId) || [];
    
    if (userRequests.length >= maxRequests) {
      return next(new AppError('Limite de requisições excedido. Tente novamente em alguns minutos', 429));
    }
    
    // Adicionar requisição atual
    userRequests.push(now);
    requests.set(userId, userRequests);
    
    next();
  };
};

/**
 * Middleware para log de auditoria
 */
const auditLogger = (req, res, next) => {
  // Capturar dados da requisição
  const originalSend = res.json;
  
  res.json = function(data) {
    // Log da operação
    if (req.user && process.env.NODE_ENV !== 'test') {
      console.log(`📝 Auditoria: ${req.user.email} - ${req.method} ${req.originalUrl} - Status: ${res.statusCode}`);
    }
    
    return originalSend.call(this, data);
  };
  
  next();
};

module.exports = {
  authenticateToken,
  authorizeRole,
  requireAdmin,
  requireOperator,
  optionalAuth,
  canAccessUser,
  userRateLimit,
  auditLogger,
  // Novos middlewares específicos por funcionalidade
  canCreateProduct,
  canLocateProduct,
  canMoveProduct,
  canRemoveProduct,
  canRequestWithdrawal,
  canConfirmWithdrawal,
  canManageUsers,
  canAccessReports
}; 