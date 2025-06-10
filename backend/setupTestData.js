const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Importar models
const User = require('./src/models/User');
const SeedType = require('./src/models/SeedType');
const Chamber = require('./src/models/Chamber');
const Location = require('./src/models/Location');

async function setupTestData() {
  try {
    console.log('🚀 Conectando ao MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/sistema-sementes-test');
    console.log('✅ Conectado ao MongoDB');

    // Limpar dados existentes
    console.log('🧹 Limpando dados existentes...');
    await User.deleteMany({});
    await SeedType.deleteMany({});
    await Chamber.deleteMany({});
    await Location.deleteMany({});

    // 1. Criar usuário admin
    console.log('👤 Criando usuário admin...');
    const hashedPassword = await bcrypt.hash('admin123456', 12);
    const adminUser = await User.create({
      name: 'Administrador',
      email: 'admin@sistema-sementes.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    console.log('✅ Usuário admin criado:', adminUser.email);

    // 2. Criar tipos de sementes
    console.log('🌱 Criando tipos de sementes...');
    const seedTypes = await SeedType.create([
      {
        name: 'Soja Premium',
        description: 'Semente de soja de alta qualidade',
        optimalTemperature: 18,
        optimalHumidity: 60,
        maxStorageTimeDays: 365,
        isActive: true
      },
      {
        name: 'Milho Híbrido',
        description: 'Milho híbrido para alta produtividade',
        optimalTemperature: 16,
        optimalHumidity: 55,
        maxStorageTimeDays: 300,
        isActive: true
      },
      {
        name: 'Trigo Especial',
        description: 'Trigo especial para panificação',
        optimalTemperature: 15,
        optimalHumidity: 50,
        maxStorageTimeDays: 400,
        isActive: true
      }
    ]);
    console.log('✅ Tipos de sementes criados:', seedTypes.length);

    // 3. Criar câmaras
    console.log('🏢 Criando câmaras...');
    const chambers = await Chamber.create([
      {
        name: 'Câmara Principal',
        description: 'Câmara principal para armazenamento de sementes',
        currentTemperature: 18,
        currentHumidity: 60,
        dimensions: {
          quadras: 3,
          lados: 4,
          filas: 5,
          andares: 2
        },
        status: 'active'
      },
      {
        name: 'Câmara Secundária',
        description: 'Câmara secundária para overflow',
        currentTemperature: 17,
        currentHumidity: 58,
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 3
        },
        status: 'active'
      },
      {
        name: 'Câmara de Quarentena',
        description: 'Câmara para quarentena e testes',
        currentTemperature: 16,
        currentHumidity: 55,
        dimensions: {
          quadras: 1,
          lados: 2,
          filas: 3,
          andares: 1
        },
        status: 'active'
      }
    ]);
    console.log('✅ Câmaras criadas:', chambers.length);

    // 4. Gerar localizações para todas as câmaras
    console.log('📍 Gerando localizações...');
    let totalLocations = 0;

    for (const chamber of chambers) {
      const { quadras, lados, filas, andares } = chamber.dimensions;
      const locations = [];

      for (let q = 1; q <= quadras; q++) {
        for (let l = 1; l <= lados; l++) {
          for (let f = 1; f <= filas; f++) {
            for (let a = 1; a <= andares; a++) {
              const code = `Q${q}-L${l}-F${f}-A${a}`;
              locations.push({
                chamberId: chamber._id,
                coordinates: { quadra: q, lado: l, fila: f, andar: a },
                code,
                isOccupied: false,
                maxCapacityKg: 1000 + Math.floor(Math.random() * 500), // 1000-1500kg
                currentWeightKg: 0
              });
            }
          }
        }
      }

      await Location.insertMany(locations);
      totalLocations += locations.length;
      console.log(`  ✅ ${locations.length} localizações criadas para ${chamber.name}`);
    }

    console.log('✅ Total de localizações criadas:', totalLocations);

    // 5. Marcar algumas localizações como ocupadas (para teste das cores)
    console.log('🔴 Criando localizações ocupadas para teste...');
    const availableLocations = await Location.find({ isOccupied: false }).limit(8);
    
    for (let i = 0; i < availableLocations.length; i++) {
      const loc = availableLocations[i];
      loc.isOccupied = true;
      
      // Diferentes níveis de ocupação para teste
      if (i < 2) {
        loc.currentWeightKg = Math.floor(loc.maxCapacityKg * 0.2); // 20% - Verde
      } else if (i < 4) {
        loc.currentWeightKg = Math.floor(loc.maxCapacityKg * 0.5); // 50% - Laranja
      } else if (i < 6) {
        loc.currentWeightKg = Math.floor(loc.maxCapacityKg * 0.8); // 80% - Vermelho claro
      } else {
        loc.currentWeightKg = Math.floor(loc.maxCapacityKg * 0.95); // 95% - Vermelho
      }
      
      await loc.save();
      console.log(`  🔴 ${loc.code}: ocupada com ${loc.currentWeightKg}kg/${loc.maxCapacityKg}kg (${((loc.currentWeightKg/loc.maxCapacityKg)*100).toFixed(1)}%)`);
    }

    // 6. Resumo final
    console.log('\n📊 RESUMO DOS DADOS CRIADOS:');
    console.log(`👥 Usuários: ${await User.countDocuments()}`);
    console.log(`🌱 Tipos de sementes: ${await SeedType.countDocuments()}`);
    console.log(`🏢 Câmaras: ${await Chamber.countDocuments()}`);
    console.log(`📍 Total de localizações: ${await Location.countDocuments()}`);
    console.log(`🔴 Localizações ocupadas: ${await Location.countDocuments({ isOccupied: true })}`);
    console.log(`🟢 Localizações disponíveis: ${await Location.countDocuments({ isOccupied: false })}`);

    console.log('\n🎉 Dados de teste criados com sucesso!');
    console.log('\n📝 Credenciais do admin:');
    console.log('Email: admin@sistema-sementes.com');
    console.log('Senha: admin123456');

  } catch (error) {
    console.error('❌ Erro ao criar dados de teste:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
    process.exit(0);
  }
}

setupTestData(); 