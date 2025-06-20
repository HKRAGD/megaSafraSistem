const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const { errorHandler } = require('./middleware/errorHandler');

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

console.log('🔒 CORS configurado para as origens:', corsOrigins);

app.use(cors({
  origin: (origin, callback) => {
    // Permitir requisições sem origin (ex: mobile apps, Postman)
    if (!origin) return callback(null, true);
    
    // Verificar se origin está na lista permitida
    if (corsOrigins.includes(origin)) {
      return callback(null, true);
    }
    
    // Log para debug
    console.log(`❌ CORS bloqueado para origem: ${origin}`);
    console.log(`✅ Origens permitidas: ${corsOrigins.join(', ')}`);
    
    const msg = `CORS: Origem ${origin} não permitida`;
    return callback(new Error(msg), false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Logging aprimorado
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('combined'));
}

// Parse JSON e cookies
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

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

// Rota de status da API
app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Sistema Mega Safra API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'mega-safra-01'
  });
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