require('dotenv').config();
const { validateEnvironment } = require('./src/utils/envValidator');
const app = require('./src/app');
const { connectDB } = require('./src/config/database');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0'; // Permitir acesso da rede local

// Validar variáveis de ambiente antes de iniciar
validateEnvironment();

// Conectar ao MongoDB
connectDB();

// Log detalhado das variáveis de ambiente
console.log('\n🔧 =================== CONFIGURAÇÃO DO SERVIDOR ===================');
console.log(`📍 NODE_ENV: ${process.env.NODE_ENV || 'development'}`);
console.log(`🌐 HOST: ${HOST} (todas as interfaces de rede)`);
console.log(`🔌 PORT: ${PORT}`);
console.log(`📊 MONGODB_URI: ${process.env.MONGODB_URI ? 'Configurado ✅' : 'NÃO CONFIGURADO ❌'}`);
console.log(`🔐 JWT_SECRET: ${process.env.JWT_SECRET ? 'Configurado ✅' : 'NÃO CONFIGURADO ❌'}`);
console.log(`🔑 JWT_REFRESH_SECRET: ${process.env.JWT_REFRESH_SECRET ? 'Configurado ✅' : 'NÃO CONFIGURADO ❌'}`);
console.log(`🌍 PUBLIC_IP: ${process.env.PUBLIC_IP || 'NÃO CONFIGURADO'}`);
console.log(`🏠 LOCAL_IP: ${process.env.LOCAL_IP || 'NÃO CONFIGURADO'}`);
console.log(`🔒 BCRYPT_ROUNDS: ${process.env.BCRYPT_ROUNDS || 'Padrão (12)'}`);
console.log(`🌐 CORS_ORIGIN: ${process.env.CORS_ORIGIN || 'NÃO CONFIGURADO'}`);
console.log(`🔗 API_URL_LOCAL: ${process.env.API_URL_LOCAL || 'NÃO CONFIGURADO'}`);
console.log(`🌍 API_URL_PUBLIC: ${process.env.API_URL_PUBLIC || 'NÃO CONFIGURADO'}`);
console.log('================================================================\n');

// Iniciar servidor com bind para todas as interfaces
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Servidor INICIADO com sucesso!`);
  console.log(`🌐 Host: ${HOST} | Porta: ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL Local: http://localhost:${PORT}/api`);
  console.log(`🔗 API Base URL Rede: http://192.168.1.89:${PORT}/api`);
  if (process.env.API_URL_PUBLIC) {
    console.log(`🌍 API Base URL Produção: ${process.env.API_URL_PUBLIC}`);
  }
  console.log(`✅ Frontend permitido: ${process.env.CORS_ORIGIN || 'localhost:3000 (padrão)'}`);
  console.log('🎯 Servidor pronto para receber requisições!\n');
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