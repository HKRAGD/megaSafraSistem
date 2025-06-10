require('dotenv').config();
const app = require('./src/app');
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Permitir acesso da rede local

// Conectar ao MongoDB
connectDB();

// Iniciar servidor com bind para todas as interfaces
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🌐 Host: ${HOST} (todas as interfaces de rede)`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL Local: http://localhost:${PORT}/api`);
  console.log(`🔗 API Base URL Rede: http://192.168.1.89:${PORT}/api`);
  console.log(`✅ Frontend permitido: ${process.env.CORS_ORIGIN}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 SIGTERM recebido. Fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🛑 SIGINT recebido. Fechando servidor...');
  server.close(() => {
    console.log('✅ Servidor fechado');
    process.exit(0);
  });
});

module.exports = server; 