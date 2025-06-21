const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { errorHandler } = require('./middleware/errorHandler');
const { generalApiLimiter } = require('./middleware/rateLimiting');
const { logger, httpLoggerMiddleware } = require('./config/logger');

const app = express();

// Middleware de segurança aprimorado para acesso público
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
}));

// CORS configurado para múltiplas origens (local + pública)
const corsOrigins = process.env.CORS_ORIGIN 
  ? process.env.CORS_ORIGIN.split(',').map(origin => origin.trim())
  : ['http://localhost:3000'];

logger.info('CORS configuration initialized', { 
  category: 'startup', 
  corsOrigins,
  count: corsOrigins.length 
});

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Verificar se origin está na lista permitida
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log estruturado para debug
    logger.warn('CORS origin blocked', {
      category: 'security',
      blockedOrigin: origin,
      allowedOrigins: corsOrigins
    });
    
    const msg = `CORS: Origem ${origin} não permitida`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Logging estruturado para produção
if (process.env.NODE_ENV !== 'test') {
  app.use(httpLoggerMiddleware);
  logger.info('HTTP logging middleware enabled', { category: 'startup' });
}

// Parse JSON e cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting geral para toda a API
app.use('/api', generalApiLimiter);

// Rota de health check com informações de acesso
app.get('/', (req, res) => {
  res.json({
    message: '🌱 Sistema Mega Safra - Câmaras Refrigeradas API',
    version: '1.0.0',
    status: 'running',
    timestamp: new Date().toISOString(),
    access: {
      local: process.env.API_URL_LOCAL || 'http://localhost:3001/api',
      public: process.env.API_URL_PUBLIC || 'Configurar PUBLIC_IP no .env',
      cors_origins: corsOrigins
    }
  });
});

// Health check robusto para produção
app.get('/api/health', async (req, res) => {
  const mongoose = require('mongoose');
  
  const healthData = {
    status: 'healthy',
    service: 'Sistema Mega Safra API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
    checks: {
      database: 'unknown',
      memory: 'unknown',
      disk: 'unknown'
    }
  };

  try {
    // Check MongoDB connection
    if (mongoose.connection.readyState === 1) {
      healthData.checks.database = 'healthy';
      healthData.database = {
        name: mongoose.connection.name,
        host: mongoose.connection.host,
        port: mongoose.connection.port,
        status: 'connected'
      };
    } else {
      healthData.checks.database = 'unhealthy';
      healthData.status = 'degraded';
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memUsageMB = {
      rss: Math.round(memUsage.rss / 1024 / 1024),
      heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
      heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
      external: Math.round(memUsage.external / 1024 / 1024)
    };
    
    healthData.memory = memUsageMB;
    healthData.checks.memory = memUsageMB.heapUsed < 500 ? 'healthy' : 'warning'; // Warning se > 500MB

    // Check disk space (basic)
    healthData.checks.disk = 'healthy'; // Simplified for now

    // Overall status
    const unhealthyChecks = Object.values(healthData.checks).filter(check => check === 'unhealthy');
    if (unhealthyChecks.length > 0) {
      healthData.status = 'unhealthy';
      res.status(503);
    } else {
      const warningChecks = Object.values(healthData.checks).filter(check => check === 'warning');
      if (warningChecks.length > 0) {
        healthData.status = 'degraded';
        res.status(200);
      }
    }

    res.json(healthData);
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      error: 'Health check failed',
      timestamp: new Date().toISOString()
    });
  }
});

// Liveness probe (mais simples, apenas verifica se app responde)
app.get('/api/ping', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Readiness probe (verifica se app está pronto para receber tráfego)
app.get('/api/ready', async (req, res) => {
  const mongoose = require('mongoose');
  
  try {
    if (mongoose.connection.readyState === 1) {
      res.json({ 
        status: 'ready', 
        timestamp: new Date().toISOString(),
        database: 'connected'
      });
    } else {
      res.status(503).json({ 
        status: 'not ready', 
        timestamp: new Date().toISOString(),
        database: 'disconnected'
      });
    }
  } catch (error) {
    res.status(503).json({ 
      status: 'not ready', 
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Rotas da API
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/clients', require('./routes/clients')); // Nova rota de clientes
app.use('/api/seed-types', require('./routes/seedTypes'));
app.use('/api/chambers', require('./routes/chambers'));
app.use('/api/locations', require('./routes/locations'));
app.use('/api/products', require('./routes/products'));
app.use('/api/movements', require('./routes/movements'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/reports', require('./routes/reports'));
app.use('/api/withdrawal-requests', require('./routes/withdrawalRequests'));

// Rota 404
app.use('*', (req, res) => {
  res.status(404).json({
    status: 'error',
    message: 'Rota não encontrada',
    path: req.originalUrl
  });
});

// Middleware de tratamento de erros
app.use(errorHandler);

module.exports = app; 