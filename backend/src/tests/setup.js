/**
 * Setup para testes unitários dos models
 * Configura MongoDB Memory Server e helpers globais
 */

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const path = require('path');

// Configurar variáveis de ambiente para testes
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key-for-models-tests';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-key-for-models-tests';
process.env.BCRYPT_ROUNDS = '4'; // Rounds baixos para testes rápidos

let mongod;

// Setup global antes de todos os testes
beforeAll(async () => {
  try {
    // Criar instância do MongoDB Memory Server com configuração simples
    mongod = await MongoMemoryServer.create();
    
    const uri = mongod.getUri();
    
    // Conectar mongoose ao banco de teste
    await mongoose.connect(uri);
    
    console.log('\n🧪 MongoDB Memory Server conectado para testes\n');
  } catch (error) {
    console.error('❌ Erro ao configurar MongoDB Memory Server:', error);
    throw error;
  }
}, 30000); // 30 segundos timeout

// Cleanup após todos os testes
afterAll(async () => {
  try {
    await mongoose.connection.dropDatabase();
    await mongoose.connection.close();
    await mongod.stop();
    console.log('🧹 MongoDB Memory Server desconectado');
  } catch (error) {
    console.error('❌ Erro ao desconectar MongoDB Memory Server:', error);
  }
}, 30000);

// Limpar dados entre testes
afterEach(async () => {
  try {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  } catch (error) {
    console.error('❌ Erro ao limpar dados entre testes:', error);
  }
});

// Contador para garantir unicidade
let testCounter = 0;

// Helpers globais para criação de dados de teste
global.createTestUser = async (overrides = {}) => {
  const User = require(path.join(__dirname, '../models/User'));
  testCounter++;
  const userData = {
    name: `Usuário Teste ${testCounter}`,
    email: `test${testCounter}@test.com`,
    password: 'password123',
    role: 'admin',
    ...overrides
  };
  return await User.create(userData);
};

global.createTestSeedType = async (overrides = {}) => {
  const SeedType = require(path.join(__dirname, '../models/SeedType'));
  testCounter++;
  const seedTypeData = {
    name: `Tipo Semente ${testCounter}`,
    description: 'Tipo de semente para testes',
    optimalTemperature: 15,
    optimalHumidity: 50,
    storageDuration: 365,
    ...overrides
  };
  return await SeedType.create(seedTypeData);
};

global.createTestChamber = async (overrides = {}) => {
  const Chamber = require(path.join(__dirname, '../models/Chamber'));
  testCounter++;
  const chamberData = {
    name: `Câmara Teste ${testCounter}`,
    dimensions: { quadras: 5, lados: 4, filas: 6, andares: 3 },
    status: 'active',
    ...overrides
  };
  return await Chamber.create(chamberData);
};

global.createTestLocation = async (overrides = {}) => {
  const Location = require(path.join(__dirname, '../models/Location'));
  testCounter++;
  
  let chamber;
  if (overrides.chamberId) {
    chamber = { _id: overrides.chamberId };
  } else {
    chamber = await global.createTestChamber();
  }
  
  const locationData = {
    chamberId: chamber._id,
    code: `T${testCounter}-Q1-L1-F1-A1`,
    coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
    maxCapacityKg: 1000,
    currentWeightKg: 0,
    isOccupied: false,
    ...overrides
  };
  return await Location.create(locationData);
};

global.createTestProduct = async (overrides = {}) => {
  const Product = require(path.join(__dirname, '../models/Product'));
  testCounter++;
  
  let seedType, location;
  
  if (overrides.seedTypeId) {
    seedType = { _id: overrides.seedTypeId };
  } else {
    seedType = await global.createTestSeedType();
  }
  
  if (overrides.locationId) {
    location = { _id: overrides.locationId };
  } else {
    location = await global.createTestLocation();
  }
  
  const productData = {
    name: `Produto Teste ${testCounter}`,
    lot: `LOT-${testCounter}`,
    seedTypeId: seedType._id,
    quantity: 10,
    storageType: 'saco',
    weightPerUnit: 50,
    locationId: location._id,
    status: 'stored',
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 ano
    ...overrides
  };
  return await Product.create(productData);
};

global.createTestMovement = async (overrides = {}) => {
  const Movement = require(path.join(__dirname, '../models/Movement'));
  testCounter++;
  
  let user, product, fromLocation, toLocation;
  
  if (overrides.userId) {
    user = { _id: overrides.userId };
  } else {
    user = await global.createTestUser();
  }
  
  if (overrides.productId) {
    product = { _id: overrides.productId };
  } else {
    product = await global.createTestProduct();
  }
  
  if (overrides.fromLocationId) {
    fromLocation = { _id: overrides.fromLocationId };
  }
  
  if (overrides.toLocationId) {
    toLocation = { _id: overrides.toLocationId };
  } else {
    toLocation = await global.createTestLocation();
  }
  
  const movementData = {
    type: 'entry',
    productId: product._id,
    userId: user._id,
    toLocationId: toLocation._id,
    quantity: 10,
    weight: 500,
    reason: 'Movimento de teste',
    timestamp: new Date(),
    metadata: {
      verified: true,
      confidence: 90
    },
    ...overrides
  };
  
  if (fromLocation) {
    movementData.fromLocationId = fromLocation._id;
  }
  
  return await Movement.create(movementData);
};

console.log('✅ Setup de testes configurado com sucesso!'); 