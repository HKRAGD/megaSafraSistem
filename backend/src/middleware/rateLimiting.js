/**
 * MIDDLEWARE DE RATE LIMITING PARA PRODUÇÃO
 * Proteção contra ataques de força bruta e DoS
 */

const rateLimit = require('express-rate-limit');
const { logHelpers } = require('../config/logger');

/**
 * Rate limiting estrito para login endpoints
 * 5 tentativas por IP a cada 15 minutos
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 5, // máximo 5 tentativas por IP por janela
  message: {
    error: 'Muitas tentativas de login. Tente novamente em 15 minutos.',
    retryAfter: 15 * 60 // 15 minutos em segundos
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Identificar por IP + User-Agent para ser mais específico
  keyGenerator: (req) => {
    return `${req.ip}-${req.get('User-Agent')}`;
  },
  // Handler para quando rate limit é atingido
  handler: (req, res, next, options) => {
    logHelpers.rateLimit(req.ip, 'login', req.get('User-Agent'));
    res.status(options.statusCode).json(options.message);
  },
  // Aplicar apenas a falhas de login (will be configured per route)
  skip: (req, res) => {
    // Não aplicar rate limit se o login foi bem-sucedido
    return res.statusCode < 400;
  }
});

/**
 * Rate limiting para tentativas de criação de conta
 * 3 tentativas por IP a cada hora
 */
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3, // máximo 3 registros por IP por hora
  message: {
    error: 'Muitas tentativas de registro. Tente novamente em 1 hora.',
    retryAfter: 60 * 60 // 1 hora em segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logHelpers.rateLimit(req.ip, 'register');
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Rate limiting para refresh token
 * 20 tentativas por IP a cada 5 minutos
 */
const refreshLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 20, // máximo 20 refresh por IP por janela
  message: {
    error: 'Muitas tentativas de refresh token. Tente novamente em 5 minutos.',
    retryAfter: 5 * 60 // 5 minutos em segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logHelpers.rateLimit(req.ip, 'refresh-token');
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Rate limiting geral para API
 * 1000 requests por IP a cada hora
 */
const generalApiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 1000, // máximo 1000 requests por IP por hora
  message: {
    error: 'Limite de requisições da API excedido. Tente novamente em 1 hora.',
    retryAfter: 60 * 60 // 1 hora em segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logHelpers.rateLimit(req.ip, `api-general:${req.path}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Rate limiting para endpoints de segurança sensíveis
 * 10 tentativas por IP a cada 10 minutos
 */
const securityLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutos
  max: 10, // máximo 10 tentativas por IP por janela
  message: {
    error: 'Muitas tentativas para operação sensível. Tente novamente em 10 minutos.',
    retryAfter: 10 * 60 // 10 minutos em segundos
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logHelpers.rateLimit(req.ip, `security:${req.path}`);
    res.status(options.statusCode).json(options.message);
  }
});

/**
 * Rate limiting específico para tentativas de login com o mesmo email
 * Proteção adicional por email além do IP
 */
const createEmailLimiter = (maxAttempts = 5, windowMs = 15 * 60 * 1000) => {
  const emailAttempts = new Map();
  
  return (req, res, next) => {
    const email = req.body.email;
    if (!email) {
      return next();
    }
    
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Limpar tentativas antigas
    if (emailAttempts.has(email)) {
      const attempts = emailAttempts.get(email).filter(time => time > windowStart);
      emailAttempts.set(email, attempts);
    }
    
    // Verificar limite
    const attempts = emailAttempts.get(email) || [];
    
    if (attempts.length >= maxAttempts) {
      logHelpers.rateLimit(req.ip, `email-login:${email}`);
      return res.status(429).json({
        error: `Muitas tentativas de login para ${email}. Tente novamente em ${Math.ceil(windowMs / 60000)} minutos.`,
        retryAfter: Math.ceil(windowMs / 1000)
      });
    }
    
    // Se chegou até aqui, verificar se o login falhou para adicionar tentativa
    const originalSend = res.json;
    res.json = function(data) {
      // Se foi um erro de autenticação, registrar tentativa
      if (res.statusCode >= 400) {
        attempts.push(now);
        emailAttempts.set(email, attempts);
      }
      return originalSend.call(this, data);
    };
    
    next();
  };
};

/**
 * Middleware para log de rate limiting ativo
 */
const rateLimitLogger = (req, res, next) => {
  // Log estruturado para desenvolvimento e monitoramento
  if (process.env.NODE_ENV === 'development') {
    logHelpers.logger.debug('Rate limit check', {
      category: 'rate-limit-check',
      ip: req.ip,
      endpoint: req.path,
      method: req.method
    });
  }
  next();
};

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  generalApiLimiter,
  securityLimiter,
  createEmailLimiter,
  rateLimitLogger
};