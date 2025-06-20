/**
 * Configuração Jest para testes com banco real
 * Evita conflitos com MongoDB Memory Server do setup.js
 */

module.exports = {
  testEnvironment: 'node',
  
  // Especificar todos os arquivos de teste com banco real
  testMatch: [
    '**/tests/integration/routes/*realdb*.test.js'
  ],
  
  // Não usar setupFilesAfterEnv para evitar conflito com MongoDB Memory Server
  // setupFilesAfterEnv: [],
  
  // Configurações de timeout
  testTimeout: 30000,
  
  // Variáveis de ambiente específicas para testes com banco real
  setupFiles: ['<rootDir>/src/tests/realdb.env.js'],
  
  // Configurações de cobertura desabilitadas para testes de banco real
  collectCoverage: false,
  
  // Detectar handles abertos
  detectOpenHandles: false,
  
  // Forçar saída para evitar handles pendentes
  forceExit: true,
  
  // Configurações do Mongoose para testes
  globals: {
    NODE_ENV: 'test'
  },
  
  // Não usar cache para evitar problemas entre execuções
  cache: false,
  
  // Configuração para imports ES6 se necessário
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  
  // Ignorar node_modules exceto alguns pacotes se necessário
  transformIgnorePatterns: [
    'node_modules/(?!(supertest)/)'
  ]
}; 