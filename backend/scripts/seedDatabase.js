const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../src/models/User');
const SeedType = require('../src/models/SeedType');
const Chamber = require('../src/models/Chamber');
const Location = require('../src/models/Location');
const Product = require('../src/models/Product');
const Movement = require('../src/models/Movement');

async function seedDatabase() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes-test');
    console.log('✅ Conectado ao MongoDB\n');

    // ============================================================================
    // LIMPAR DADOS EXISTENTES COMPLETAMENTE
    // ============================================================================
    
    console.log('🧹 Limpando banco de dados completamente...');
    await Movement.deleteMany({});
    await Product.deleteMany({});
    await Location.deleteMany({});
    await Chamber.deleteMany({});
    await SeedType.deleteMany({});
    await User.deleteMany({});
    console.log('✅ Banco de dados limpo completamente\n');

    // ============================================================================
    // CRIAR USUÁRIO ADMIN
    // ============================================================================
    
    console.log('👤 Criando usuário administrador...');
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    
    const adminUser = await User.create({
      name: 'Administrador Sistema',
      email: 'admin@sistema-sementes.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    console.log('✅ Usuário admin criado');

    // ============================================================================
    // CRIAR TIPOS DE SEMENTES
    // ============================================================================
    
    console.log('🌱 Criando tipos de sementes...');
    
    const seedTypesData = [
      {
        name: 'Milho',
        description: 'Milho doce para alimentação',
        optimalTemperature: 15,
        optimalHumidity: 60,
        maxStorageTimeDays: 365
      },
      {
        name: 'Soja',
        description: 'Soja para produção de óleo',
        optimalTemperature: 12,
        optimalHumidity: 55,
        maxStorageTimeDays: 400
      },
      {
        name: 'Trigo',
        description: 'Trigo para produção de farinha',
        optimalTemperature: 10,
        optimalHumidity: 50,
        maxStorageTimeDays: 300
      },
      {
        name: 'Arroz',
        description: 'Arroz para alimentação',
        optimalTemperature: 14,
        optimalHumidity: 65,
        maxStorageTimeDays: 350
      }
    ];

    const seedTypes = await SeedType.insertMany(seedTypesData);
    console.log(`✅ ${seedTypes.length} tipos de sementes criados`);

    // ============================================================================
    // CRIAR CÂMARAS
    // ============================================================================
    
    console.log('🏭 Criando câmaras...');
    
    const chambersData = [
      {
        name: 'Câmara A - Principal',
        description: 'Câmara principal para armazenamento de grãos',
        currentTemperature: 15,
        currentHumidity: 60,
        dimensions: {
          quadras: 3,
          lados: 4,
          filas: 5,
          andares: 2
        },
        status: 'active',
        settings: {
          targetTemperature: 15,
          targetHumidity: 60,
          alertThresholds: {
            temperatureMin: 10,
            temperatureMax: 20,
            humidityMin: 50,
            humidityMax: 70
          }
        }
      },
      {
        name: 'Câmara B - Secundária',
        description: 'Câmara secundária para overflow',
        currentTemperature: 12,
        currentHumidity: 55,
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 2
        },
        status: 'active',
        settings: {
          targetTemperature: 12,
          targetHumidity: 55
        }
      },
      {
        name: 'Câmara C - Teste',
        description: 'Câmara para testes e produtos especiais',
        currentTemperature: 10,
        currentHumidity: 50,
        dimensions: {
          quadras: 2,
          lados: 2,
          filas: 3,
          andares: 1
        },
        status: 'maintenance'
      }
    ];

    const chambers = await Chamber.insertMany(chambersData);
    console.log(`✅ ${chambers.length} câmaras criadas`);

    // ============================================================================
    // GERAR LOCALIZAÇÕES AUTOMATICAMENTE
    // ============================================================================
    
    console.log('📍 Gerando localizações automaticamente...');
    
    let totalLocations = 0;
    const locationsToCreate = [];

    for (let chamberIndex = 0; chamberIndex < chambers.length; chamberIndex++) {
      const chamber = chambers[chamberIndex];
      const { quadras, lados, filas, andares } = chamber.dimensions;
      const chamberCode = String.fromCharCode(65 + chamberIndex); // A, B, C...
      
      for (let q = 1; q <= quadras; q++) {
        for (let l = 1; l <= lados; l++) {
          for (let f = 1; f <= filas; f++) {
            for (let a = 1; a <= andares; a++) {
              const code = `${chamberCode}-Q${q}-L${l}-F${f}-A${a}`;
              
              locationsToCreate.push({
                chamberId: chamber._id,
                coordinates: { quadra: q, lado: l, fila: f, andar: a },
                code,
                isOccupied: false,
                maxCapacityKg: Math.floor(Math.random() * 500) + 500, // 500-1000kg
                currentWeightKg: 0
              });
              
              totalLocations++;
            }
          }
        }
      }
    }

    await Location.insertMany(locationsToCreate);
    console.log(`✅ ${totalLocations} localizações criadas`);

    // ============================================================================
    // CRIAR PRODUTOS DE TESTE
    // ============================================================================
    
    console.log('📦 Criando produtos de teste...');
    
    // Buscar algumas localizações disponíveis
    const availableLocations = await Location.find({ isOccupied: false }).limit(15);
    
    if (availableLocations.length === 0) {
      console.log('❌ Nenhuma localização disponível para produtos');
      return;
    }

    const productsData = [];
    const movements = [];

    for (let i = 0; i < Math.min(15, availableLocations.length); i++) {
      const seedType = seedTypes[Math.floor(Math.random() * seedTypes.length)];
      const location = availableLocations[i];
      const quantity = Math.floor(Math.random() * 50) + 10; // 10-60 unidades
      const weightPerUnit = Math.floor(Math.random() * 30) + 20; // 20-50kg por unidade
      const totalWeight = quantity * weightPerUnit;
      
      // Calcular data de expiração baseada no tipo de semente
      const entryDate = new Date();
      entryDate.setDate(entryDate.getDate() - Math.floor(Math.random() * 30)); // 0-30 dias atrás
      
      const expirationDate = new Date(entryDate);
      if (seedType.maxStorageTimeDays) {
        expirationDate.setDate(expirationDate.getDate() + seedType.maxStorageTimeDays);
      }

      const product = {
        name: `${seedType.name} Lote ${(i + 1).toString().padStart(3, '0')}`,
        lot: `${seedType.name.substring(0, 3).toUpperCase()}-2024-${(i + 1).toString().padStart(3, '0')}`,
        seedTypeId: seedType._id,
        quantity,
        storageType: Math.random() > 0.5 ? 'saco' : 'bag',
        weightPerUnit,
        totalWeight,
        locationId: location._id,
        entryDate,
        expirationDate: seedType.maxStorageTimeDays ? expirationDate : undefined,
        status: 'stored',
        notes: `Produto de teste ${i + 1}`,
        tracking: {
          batchNumber: `BATCH-${Date.now()}-${i + 1}`,
          origin: ['Fazenda São João', 'Fazenda Santa Maria', 'Cooperativa Central'][Math.floor(Math.random() * 3)],
          supplier: ['Sementes Ltda', 'AgroMax', 'Campo Verde'][Math.floor(Math.random() * 3)],
          qualityGrade: ['A', 'B', 'C'][Math.floor(Math.random() * 3)]
        },
        metadata: {
          lastMovementDate: entryDate,
          createdBy: adminUser._id,
          lastModifiedBy: adminUser._id
        }
      };

      productsData.push(product);
    }

    const products = await Product.insertMany(productsData);
    console.log(`✅ ${products.length} produtos criados`);

    // ============================================================================
    // ATUALIZAR LOCALIZAÇÕES OCUPADAS
    // ============================================================================
    
    console.log('🔄 Atualizando status das localizações...');
    
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      await Location.findByIdAndUpdate(product.locationId, {
        isOccupied: true,
        currentWeightKg: product.totalWeight
      });
    }
    
    console.log('✅ Localizações atualizadas');

    // ============================================================================
    // CRIAR MOVIMENTAÇÕES AUTOMÁTICAS DE ENTRADA
    // ============================================================================
    
    console.log('📝 Criando movimentações de entrada...');
    
    const movementsData = products.map(product => ({
      productId: product._id,
      type: 'entry',
      toLocationId: product.locationId,
      quantity: product.quantity,
      weight: product.totalWeight,
      userId: adminUser._id,
      reason: 'Entrada inicial do produto',
      notes: 'Movimentação automática de entrada',
      timestamp: product.entryDate
    }));

    await Movement.insertMany(movementsData);
    console.log(`✅ ${movementsData.length} movimentações de entrada criadas`);

    // ============================================================================
    // CRIAR ALGUMAS MOVIMENTAÇÕES ADICIONAIS
    // ============================================================================
    
    console.log('🔄 Criando movimentações adicionais...');
    
    // Mover alguns produtos para simular atividade
    const productsToMove = products.slice(0, 3);
    const moreAvailableLocations = await Location.find({ 
      isOccupied: false,
      _id: { $nin: products.map(p => p.locationId) }
    }).limit(3);

    if (moreAvailableLocations.length >= 3) {
      for (let i = 0; i < 3; i++) {
        const product = productsToMove[i];
        const oldLocation = product.locationId;
        const newLocation = moreAvailableLocations[i];
        
        // Criar movimentação de transferência
        await Movement.create({
          productId: product._id,
          type: 'transfer',
          fromLocationId: oldLocation,
          toLocationId: newLocation._id,
          quantity: product.quantity,
          weight: product.totalWeight,
          userId: adminUser._id,
          reason: 'Otimização de espaço',
          notes: 'Movimentação de teste',
          timestamp: new Date()
        });

        // Atualizar produto
        await Product.findByIdAndUpdate(product._id, {
          locationId: newLocation._id,
          'metadata.lastMovementDate': new Date()
        });

        // Atualizar localizações
        await Location.findByIdAndUpdate(oldLocation, {
          isOccupied: false,
          currentWeightKg: 0
        });
        
        await Location.findByIdAndUpdate(newLocation._id, {
          isOccupied: true,
          currentWeightKg: product.totalWeight
        });
      }
      
      console.log('✅ 3 movimentações de transferência criadas');
    }

    // ============================================================================
    // RELATÓRIO FINAL
    // ============================================================================
    
    console.log('\n🎯 === BANCO DE DADOS POPULADO COM SUCESSO ===');
    
    const finalCounts = await Promise.all([
      User.countDocuments(),
      SeedType.countDocuments(),
      Chamber.countDocuments(),
      Location.countDocuments(),
      Product.countDocuments(),
      Movement.countDocuments()
    ]);

    console.log(`👥 Usuários: ${finalCounts[0]}`);
    console.log(`🌱 Tipos de Sementes: ${finalCounts[1]}`);
    console.log(`🏭 Câmaras: ${finalCounts[2]}`);
    console.log(`📍 Localizações: ${finalCounts[3]}`);
    console.log(`📦 Produtos: ${finalCounts[4]}`);
    console.log(`📝 Movimentações: ${finalCounts[5]}`);
    
    const occupiedLocations = await Location.countDocuments({ isOccupied: true });
    const availableLocationsCount = finalCounts[3] - occupiedLocations;
    
    console.log(`\n📊 Status das localizações:`);
    console.log(`🔴 Ocupadas: ${occupiedLocations}`);
    console.log(`🟢 Disponíveis: ${availableLocationsCount}`);
    
    console.log(`\n✅ Frontend agora deve funcionar completamente!`);
    console.log(`🔐 Login: admin@sistema-sementes.com / admin123`);

    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
    process.exit(0);

  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

seedDatabase(); 