/**
 * Configuração de ambiente para testes com banco real
 * Evita conflitos com o setup.js do MongoDB Memory Server
 */

// Configurar variáveis de ambiente para testes com banco real
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'teste-secret-key';
process.env.JWT_REFRESH_SECRET = 'teste-refresh-secret-key';
process.env.BCRYPT_ROUNDS = '4'; // Rounds baixos para testes rápidos
process.env.TEST_DATABASE_URL = 'mongodb://localhost:27017/sementes_test';

// Configurar timeout mais alto para operações de banco (apenas se jest estiver disponível)
if (typeof jest !== 'undefined') {
  jest.setTimeout(30000);
}

console.log('🔧 Configuração de ambiente para testes com banco real carregada'); 