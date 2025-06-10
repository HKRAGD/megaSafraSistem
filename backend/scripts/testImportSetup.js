const mongoose = require('mongoose');

// Models
const User = require('../src/models/User');
const Chamber = require('../src/models/Chamber');
const Location = require('../src/models/Location');
const SeedType = require('../src/models/SeedType');
const Product = require('../src/models/Product');

const DATABASE_NAME = 'mega-safra-01';

async function testImportSetup() {
  try {
    // Conectar ao banco
    const connectionString = process.env.MONGODB_URI || `mongodb://localhost:27017/${DATABASE_NAME}`;
    await mongoose.connect(connectionString);
    console.log(`✅ Conectado ao MongoDB - Banco: ${DATABASE_NAME}`);

    console.log('\n🔍 VERIFICANDO CONFIGURAÇÃO DO BANCO...\n');

    // 1. Verificar usuários admin
    const adminUsers = await User.find({ role: 'admin', isActive: true });
    console.log(`👤 USUÁRIOS ADMIN ENCONTRADOS: ${adminUsers.length}`);
    adminUsers.forEach(user => {
      console.log(`   • ${user.name} (${user.email})`);
    });

    if (adminUsers.length === 0) {
      console.log('❌ ERRO: Nenhum usuário admin encontrado!');
      return false;
    }

    // 2. Verificar câmaras ativas
    const chambers = await Chamber.find({ status: 'active' });
    console.log(`\n🏭 CÂMARAS ATIVAS ENCONTRADAS: ${chambers.length}`);
    chambers.forEach(chamber => {
      console.log(`   • ${chamber.name}`);
      console.log(`     Dimensões: ${chamber.dimensions.quadras}x${chamber.dimensions.lados}x${chamber.dimensions.filas}x${chamber.dimensions.andares}`);
      console.log(`     Total de localizações possíveis: ${chamber.dimensions.quadras * chamber.dimensions.lados * chamber.dimensions.filas * chamber.dimensions.andares}`);
    });

    if (chambers.length === 0) {
      console.log('❌ ERRO: Nenhuma câmara ativa encontrada!');
      return false;
    }

    const mainChamber = chambers[0];

    // 3. Verificar localizações existentes
    const locationCount = await Location.countDocuments({ chamberId: mainChamber._id });
    const availableLocationCount = await Location.countDocuments({ 
      chamberId: mainChamber._id, 
      isOccupied: false 
    });
    const occupiedLocationCount = await Location.countDocuments({ 
      chamberId: mainChamber._id, 
      isOccupied: true 
    });

    console.log(`\n📍 LOCALIZAÇÕES NA CÂMARA "${mainChamber.name}":`);
    console.log(`   • Total: ${locationCount}`);
    console.log(`   • Disponíveis: ${availableLocationCount}`);
    console.log(`   • Ocupadas: ${occupiedLocationCount}`);

    if (locationCount === 0) {
      console.log('❌ ERRO: Nenhuma localização encontrada na câmara!');
      console.log('💡 Execute: POST /api/chambers/:id/generate-locations');
      return false;
    }

    // 4. Verificar alguns exemplos de localizações
    const sampleLocations = await Location.find({ chamberId: mainChamber._id }).limit(5);
    console.log(`\n📋 EXEMPLOS DE LOCALIZAÇÕES:`);
    sampleLocations.forEach(location => {
      console.log(`   • ${location.code} - Ocupada: ${location.isOccupied ? 'Sim' : 'Não'} - Capacidade: ${location.maxCapacityKg}kg`);
    });

    // 5. Verificar tipos de sementes existentes
    const seedTypeCount = await SeedType.countDocuments({ isActive: true });
    console.log(`\n🌱 TIPOS DE SEMENTES CADASTRADOS: ${seedTypeCount}`);
    
    if (seedTypeCount > 0) {
      const sampleSeedTypes = await SeedType.find({ isActive: true }).limit(5);
      sampleSeedTypes.forEach(seedType => {
        console.log(`   • ${seedType.name}`);
      });
    }

    // 6. Verificar produtos existentes
    const productCount = await Product.countDocuments({ status: 'stored' });
    console.log(`\n📦 PRODUTOS ATUALMENTE ARMAZENADOS: ${productCount}`);

    // 7. Verificar algumas coordenadas específicas para teste
    console.log(`\n🎯 TESTANDO COORDENADAS PARA IMPORTAÇÃO:`);
    const testCoordinates = [
      { quadra: 1, lado: 1, fila: 1, andar: 1 },
      { quadra: 1, lado: 1, fila: 1, andar: 2 },
      { quadra: 1, lado: 1, fila: 2, andar: 1 },
      { quadra: 2, lado: 1, fila: 1, andar: 1 },
    ];

    for (const coords of testCoordinates) {
      const location = await Location.findOne({
        chamberId: mainChamber._id,
        'coordinates.quadra': coords.quadra,
        'coordinates.lado': coords.lado,
        'coordinates.fila': coords.fila,
        'coordinates.andar': coords.andar
      });

      if (location) {
        console.log(`   ✅ Q${coords.quadra}-L${coords.lado}-F${coords.fila}-A${coords.andar}: ${location.code} (${location.isOccupied ? 'Ocupada' : 'Disponível'})`);
      } else {
        console.log(`   ❌ Q${coords.quadra}-L${coords.lado}-F${coords.fila}-A${coords.andar}: Não encontrada`);
      }
    }

    console.log('\n✅ CONFIGURAÇÃO DO BANCO VERIFICADA COM SUCESSO!');
    console.log('\n🚀 PRÓXIMOS PASSOS:');
    console.log('   1. Gerar planilha de exemplo:');
    console.log('      node createExampleSheet.js');
    console.log('   2. Testar importação:');
    console.log('      node importFromExcel.js exemplo-produtos.xlsx');

    return true;

  } catch (error) {
    console.error('❌ ERRO:', error.message);
    return false;
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Desconectado do MongoDB');
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  testImportSetup().then(success => {
    process.exit(success ? 0 : 1);
  });
}

module.exports = testImportSetup; 