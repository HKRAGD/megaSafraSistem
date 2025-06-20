const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Importar todos os models
const User = require('../../../../models/User');
const SeedType = require('../../../../models/SeedType');
const Chamber = require('../../../../models/Chamber');
const Location = require('../../../../models/Location');
const Product = require('../../../../models/Product');
const Movement = require('../../../../models/Movement');

class TestDatabase {
  constructor() {
    this.isConnected = false;
    this.fixtures = null;
  }

  /**
   * Conectar ao banco de dados de teste
   */
  async connect() {
    if (this.isConnected) return;

    const testDbUrl = process.env.TEST_DATABASE_URL || 'mongodb://localhost:27017/sementes_test';
    
    // Desconectar conexão existente se houver
    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    await mongoose.connect(testDbUrl, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    this.isConnected = true;
    console.log('✅ Conectado ao banco de teste:', testDbUrl);
  }

  /**
   * Limpar todas as collections
   */
  async clean() {
    await Movement.deleteMany({});
    await Product.deleteMany({});
    await Location.deleteMany({});
    await Chamber.deleteMany({});
    await SeedType.deleteMany({});
    await User.deleteMany({});
  }

  /**
   * Popular banco com dados fixture
   */
  async populate() {
    await this.clean();

    // 1. Criar usuários com diferentes roles
    const users = await this.createUsers();
    
    // 2. Criar tipos de sementes
    const seedTypes = await this.createSeedTypes();
    
    // 3. Criar câmaras
    const chambers = await this.createChambers();
    
    // 4. Criar localizações
    const locations = await this.createLocations(chambers);
    
    // 5. Criar produtos
    const products = await this.createProducts(seedTypes, locations);
    
    // 6. Criar movimentações
    const movements = await this.createMovements(products, users, locations);

    this.fixtures = {
      users,
      seedTypes,
      chambers,
      locations,
      products,
      movements
    };

    console.log('✅ Banco de teste populado com sucesso');
    return this.fixtures;
  }

  /**
   * Criar usuários de teste
   */
  async createUsers() {
    const hashedPassword = await bcrypt.hash('teste123', 10);
    
    const usersData = [
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7d8'),
        name: 'Admin Teste',
        email: 'admin@teste.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7d9'),
        name: 'Operator Teste',
        email: 'operator@teste.com',
        password: hashedPassword,
        role: 'operator',
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7da'),
        name: 'Viewer Teste',
        email: 'viewer@teste.com',
        password: hashedPassword,
        role: 'viewer',
        isActive: true
      }
    ];

    return await User.insertMany(usersData);
  }

  /**
   * Criar tipos de sementes de teste
   */
  async createSeedTypes() {
    const seedTypesData = [
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7e1'),
        name: 'Soja Premium',
        description: 'Soja de alta qualidade para armazenamento longo',
        optimalTemperature: 15,
        optimalHumidity: 50,
        storageDuration: 365,
        characteristics: {
          variety: 'Glycine max',
          origin: 'Brasil',
          resistance: ['drought', 'fungi'],
          nutritionalProfile: {
            protein: 38.5,
            oil: 20.2
          }
        },
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7e2'),
        name: 'Milho Híbrido',
        description: 'Milho híbrido para alta produtividade',
        optimalTemperature: 12,
        optimalHumidity: 45,
        storageDuration: 300,
        characteristics: {
          variety: 'Zea mays',
          origin: 'Brasil',
          resistance: ['insects', 'drought'],
          nutritionalProfile: {
            carbohydrates: 75.8,
            protein: 9.4
          }
        },
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7e3'),
        name: 'Algodão Transgênico',
        description: 'Algodão modificado geneticamente',
        optimalTemperature: 18,
        optimalHumidity: 55,
        storageDuration: 400,
        characteristics: {
          variety: 'Gossypium hirsutum',
          origin: 'Brasil',
          resistance: ['bollworm', 'fungi'],
          modifications: ['Bt', 'RR']
        },
        isActive: true
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7e4'),
        name: 'Feijão Carioca',
        description: 'Feijão tradicional brasileiro',
        optimalTemperature: 14,
        optimalHumidity: 48,
        storageDuration: 280,
        characteristics: {
          variety: 'Phaseolus vulgaris',
          origin: 'Brasil',
          resistance: ['anthracnose'],
          nutritionalProfile: {
            protein: 22.3,
            fiber: 8.7
          }
        },
        isActive: true
      }
    ];

    return await SeedType.insertMany(seedTypesData);
  }

  /**
   * Criar câmaras de teste
   */
  async createChambers() {
    const chambersData = [
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7f1'),
        name: 'Câmara Principal',
        description: 'Câmara principal de armazenamento',
        currentTemperature: 15.2,
        currentHumidity: 52.1,
        dimensions: {
          quadras: 3,
          lados: 4,
          filas: 5,
          andares: 3
        },
        status: 'active'
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c7f2'),
        name: 'Câmara Secundária',
        description: 'Câmara secundária para produtos especiais',
        currentTemperature: 12.8,
        currentHumidity: 47.3,
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 2
        },
        status: 'active'
      }
    ];

    return await Chamber.insertMany(chambersData);
  }

  /**
   * Criar localizações de teste
   */
  async createLocations(chambers) {
    const locations = [];
    let locationIdCounter = 1;

    // Câmara Principal: 3x4x5x3 = 180 localizações (criar apenas algumas para teste)
    const mainChamber = chambers[0];
    const mainChamberLocations = [
      // Localizações livres
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: mainChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        code: 'CAM1-Q1-L1-F1-A1',
        isOccupied: false,
        maxCapacityKg: 1000,
        currentWeightKg: 0
      },
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: mainChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 2 },
        code: 'CAM1-Q1-L1-F1-A2',
        isOccupied: false,
        maxCapacityKg: 1500,
        currentWeightKg: 0
      },
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: mainChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 },
        code: 'CAM1-Q1-L1-F2-A1',
        isOccupied: false,
        maxCapacityKg: 1200,
        currentWeightKg: 0
      },
      // Localizações que serão ocupadas
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: mainChamber._id,
        coordinates: { quadra: 1, lado: 2, fila: 1, andar: 1 },
        code: 'CAM1-Q1-L2-F1-A1',
        isOccupied: true,
        maxCapacityKg: 1000,
        currentWeightKg: 800
      },
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: mainChamber._id,
        coordinates: { quadra: 2, lado: 1, fila: 1, andar: 1 },
        code: 'CAM1-Q2-L1-F1-A1',
        isOccupied: true,
        maxCapacityKg: 1500,
        currentWeightKg: 1200
      },
      // Localização para testar capacidade limite
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: mainChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 3 },
        code: 'CAM1-Q1-L1-F1-A3',
        isOccupied: false,
        maxCapacityKg: 500, // Capacidade pequena para testes
        currentWeightKg: 0
      }
    ];

    // Câmara Secundária: 2x3x4x2 = 48 localizações (criar algumas)
    const secondaryChamber = chambers[1];
    const secondaryChamberLocations = [
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: secondaryChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        code: 'CAM2-Q1-L1-F1-A1',
        isOccupied: false,
        maxCapacityKg: 800,
        currentWeightKg: 0
      },
      {
        _id: new mongoose.Types.ObjectId(`64b1f1a1c1d2e3f4a5b6c8${String(locationIdCounter++).padStart(2, '0')}`),
        chamberId: secondaryChamber._id,
        coordinates: { quadra: 1, lado: 2, fila: 1, andar: 1 },
        code: 'CAM2-Q1-L2-F1-A1',
        isOccupied: true,
        maxCapacityKg: 1000,
        currentWeightKg: 600
      }
    ];

    locations.push(...mainChamberLocations, ...secondaryChamberLocations);
    return await Location.insertMany(locations);
  }

  /**
   * Criar produtos de teste
   */
  async createProducts(seedTypes, locations) {
    const now = new Date();
    const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
    const sixMonthsFromNow = new Date(now.getTime() + 180 * 24 * 60 * 60 * 1000);
    const oneMonthFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    // Localizar localizações ocupadas
    const occupiedLocations = locations.filter(loc => loc.isOccupied);

    const productsData = [
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c9a1'),
        name: 'Soja Lote 2024-001',
        lot: 'SOJ-2024-001',
        seedTypeId: seedTypes[0]._id, // Soja Premium
        quantity: 32, // 32 unidades de 25kg = 800kg
        storageType: 'saco',
        weightPerUnit: 25,
        totalWeight: 800,
        locationId: occupiedLocations[0]._id,
        entryDate: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000), // 30 dias atrás
        expirationDate: oneYearFromNow,
        status: 'stored',
        notes: 'Produto para teste de capacidade'
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c9a2'),
        name: 'Milho Híbrido LT-2024-002',
        lot: 'MIL-2024-002',
        seedTypeId: seedTypes[1]._id, // Milho Híbrido
        quantity: 60, // 60 unidades de 20kg = 1200kg
        storageType: 'bag',
        weightPerUnit: 20,
        totalWeight: 1200,
        locationId: occupiedLocations[1]._id,
        entryDate: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000), // 15 dias atrás
        expirationDate: sixMonthsFromNow,
        status: 'stored',
        notes: 'Produto de milho para teste'
      },
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6c9a3'),
        name: 'Algodão Especial LT-2024-003',
        lot: 'ALG-2024-003',
        seedTypeId: seedTypes[2]._id, // Algodão Transgênico
        quantity: 30, // 30 unidades de 20kg = 600kg
        storageType: 'saco',
        weightPerUnit: 20,
        totalWeight: 600,
        locationId: occupiedLocations[2]._id,
        entryDate: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000), // 5 dias atrás
        expirationDate: oneMonthFromNow, // Vencendo em breve
        status: 'stored',
        notes: 'Produto próximo ao vencimento'
      }
    ];

    return await Product.insertMany(productsData);
  }

  /**
   * Criar movimentações de teste
   */
  async createMovements(products, users, locations) {
    const now = new Date();
    const admin = users.find(u => u.role === 'admin');
    const operator = users.find(u => u.role === 'operator');

    const movementsData = [
      // Movimentação de entrada para o primeiro produto
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6caa1'),
        productId: products[0]._id,
        type: 'entry',
        toLocationId: products[0].locationId,
        quantity: products[0].quantity,
        weight: products[0].totalWeight,
        userId: admin._id,
        reason: 'Entrada inicial do produto',
        notes: 'Produto criado no sistema',
        timestamp: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      },
      // Movimentação de entrada para o segundo produto
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6caa2'),
        productId: products[1]._id,
        type: 'entry',
        toLocationId: products[1].locationId,
        quantity: products[1].quantity,
        weight: products[1].totalWeight,
        userId: operator._id,
        reason: 'Entrada inicial do produto',
        notes: 'Produto de milho adicionado',
        timestamp: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000)
      },
      // Movimentação de entrada para o terceiro produto
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6caa3'),
        productId: products[2]._id,
        type: 'entry',
        toLocationId: products[2].locationId,
        quantity: products[2].quantity,
        weight: products[2].totalWeight,
        userId: admin._id,
        reason: 'Entrada inicial do produto',
        notes: 'Produto de algodão especial',
        timestamp: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000)
      },
      // Movimentação de ajuste para teste
      {
        _id: new mongoose.Types.ObjectId('64b1f1a1c1d2e3f4a5b6caa4'),
        productId: products[0]._id,
        type: 'adjustment',
        toLocationId: products[0].locationId,
        quantity: 30, // Estado final após ajuste (eram 32, reduziu 2)
        weight: 750, // Estado final após ajuste (eram 800kg, reduziu 50kg)
        userId: operator._id,
        reason: 'Ajuste de inventário',
        notes: 'Correção após conferência física - redução de 2 unidades',
        timestamp: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000)
      }
    ];

    return await Movement.insertMany(movementsData);
  }

  /**
   * Obter fixtures criados
   */
  getFixtures() {
    return this.fixtures;
  }

  /**
   * Obter usuário por role
   */
  getUserByRole(role) {
    return this.fixtures?.users?.find(u => u.role === role);
  }

  /**
   * Obter localização livre
   */
  getFreeLocation() {
    return this.fixtures?.locations?.find(l => !l.isOccupied);
  }

  /**
   * Obter localização ocupada
   */
  getOccupiedLocation() {
    return this.fixtures?.locations?.find(l => l.isOccupied);
  }

  /**
   * Obter localização com pouca capacidade
   */
  getLowCapacityLocation() {
    return this.fixtures?.locations?.find(l => l.maxCapacityKg <= 500);
  }

  /**
   * Desconectar do banco
   */
  async disconnect() {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('✅ Desconectado do banco de teste');
    }
  }
}

// Singleton instance
const testDatabase = new TestDatabase();

module.exports = testDatabase; 