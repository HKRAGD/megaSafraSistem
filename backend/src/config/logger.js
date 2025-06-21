/**
 * SISTEMA DE LOGGING ESTRUTURADO PARA PRODUÇÃO
 * Winston Logger com configurações otimizadas para monitoramento
 */

const winston = require('winston');
const path = require('path');

// Definir níveis de log customizados
const logLevels = {
  error: 0,    // Erros críticos
  warn: 1,     // Avisos importantes
  info: 2,     // Informações gerais
  http: 3,     // Requisições HTTP
  debug: 4,    // Debug detalhado
  audit: 5     // Logs de auditoria (nível customizado)
};

// Cores para logs (desenvolvimento)
const logColors = {
  error: 'red',
  warn: 'yellow', 
  info: 'green',
  http: 'magenta',
  debug: 'white',
  audit: 'blue'
};

winston.addColors(logColors);

// Formatos de log
const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'stack'] })
);

// Formato para desenvolvimento (mais legível)
const devFormat = winston.format.combine(
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ level, message, timestamp, stack, ...meta }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    
    // Adicionar stack trace se for erro
    if (stack) {
      log += `\n${stack}`;
    }
    
    // Adicionar metadata se existir
    if (Object.keys(meta).length > 0) {
      log += `\n${JSON.stringify(meta, null, 2)}`;
    }
    
    return log;
  })
);

// Configurar transports baseado no ambiente
const transports = [];

// Console sempre ativo
transports.push(new winston.transports.Console({
  format: process.env.NODE_ENV === 'production' ? logFormat : devFormat,
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
}));

// Em produção, adicionar arquivos de log
if (process.env.NODE_ENV === 'production') {
  const logDir = path.join(__dirname, '../../logs');
  
  // Log de erros
  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'error.log'),
    level: 'error',
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 5,
    tailable: true
  }));
  
  // Log combinado
  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'combined.log'),
    format: logFormat,
    maxsize: 100 * 1024 * 1024, // 100MB
    maxFiles: 10,
    tailable: true
  }));
  
  // Log de auditoria (operações críticas)
  transports.push(new winston.transports.File({
    filename: path.join(logDir, 'audit.log'),
    level: 'audit',
    format: logFormat,
    maxsize: 50 * 1024 * 1024, // 50MB
    maxFiles: 20, // Manter mais logs de auditoria
    tailable: true
  }));
}

// Criar logger principal
const logger = winston.createLogger({
  levels: logLevels,
  format: logFormat,
  defaultMeta: {
    service: 'sistema-sementes-api',
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0'
  },
  transports,
  exitOnError: false, // Não sair em caso de erro de log
});

// Helpers para logs estruturados
const logHelpers = {
  /**
   * Log de autenticação/autorização
   */
  auth: (action, user, metadata = {}) => {
    logger.audit('Authentication/Authorization event', {
      category: 'auth',
      action,
      userId: user?.id || user?._id,
      userEmail: user?.email,
      userRole: user?.role,
      ...metadata
    });
  },

  /**
   * Log de operações de dados críticas
   */
  dataOperation: (operation, resource, user, metadata = {}) => {
    logger.audit('Data operation', {
      category: 'data',
      operation, // CREATE, UPDATE, DELETE, etc
      resource,  // Product, User, etc
      userId: user?.id || user?._id,
      userEmail: user?.email,
      ...metadata
    });
  },

  /**
   * Log de tentativas de segurança suspeitas
   */
  security: (threat, ip, metadata = {}) => {
    logger.warn('Security event', {
      category: 'security',
      threat,
      ip,
      timestamp: new Date().toISOString(),
      ...metadata
    });
  },

  /**
   * Log de erro estruturado
   */
  error: (message, error, metadata = {}) => {
    logger.error(message, {
      category: 'error',
      error: {
        message: error?.message,
        stack: error?.stack,
        name: error?.name,
        code: error?.code
      },
      ...metadata
    });
  },

  /**
   * Log de performance
   */
  performance: (operation, duration, metadata = {}) => {
    const level = duration > 5000 ? 'warn' : 'info'; // Warn se > 5s
    logger[level]('Performance metric', {
      category: 'performance',
      operation,
      duration,
      slow: duration > 5000,
      ...metadata
    });
  },

  /**
   * Log de requisições HTTP
   */
  http: (req, res, duration) => {
    logger.http('HTTP Request', {
      category: 'http',
      method: req.method,
      url: req.originalUrl,
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      userId: req.user?.id || req.user?._id,
      statusCode: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
  },

  /**
   * Log de rate limiting
   */
  rateLimit: (ip, endpoint, userAgent = null) => {
    logger.warn('Rate limit exceeded', {
      category: 'rate-limit',
      ip,
      endpoint,
      userAgent,
      timestamp: new Date().toISOString()
    });
  }
};

// Middleware de logging para Express
const httpLoggerMiddleware = (req, res, next) => {
  const start = Date.now();
  
  // Capturar o end da resposta
  const originalSend = res.send;
  res.send = function(data) {
    const duration = Date.now() - start;
    logHelpers.http(req, res, duration);
    return originalSend.call(this, data);
  };
  
  next();
};

// Substituir console.log/error por winston em produção
if (process.env.NODE_ENV === 'production') {
  console.log = (...args) => logger.info(args.join(' '));
  console.error = (...args) => logger.error(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
}

module.exports = {
  logger,
  logHelpers,
  httpLoggerMiddleware
};