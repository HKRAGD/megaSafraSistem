const mongoose = require('mongoose');
const User = require('../src/models/User');
const SeedType = require('../src/models/SeedType');
const Chamber = require('../src/models/Chamber');
const Location = require('../src/models/Location');
const Product = require('../src/models/Product');
const Movement = require('../src/models/Movement');

async function checkData() {
  try {
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes-test');
    console.log('✅ Conectado ao MongoDB\n');
    
    // ============================================================================
    // CONTAGEM GERAL DE DADOS
    // ============================================================================
    
    console.log('📊 === CONTAGEM GERAL DOS DADOS ===');
    const [userCount, seedTypeCount, chamberCount, locationCount, productCount, movementCount] = await Promise.all([
      User.countDocuments(),
      SeedType.countDocuments(),
      Chamber.countDocuments(),
      Location.countDocuments(),
      Product.countDocuments(),
      Movement.countDocuments()
    ]);
    
    console.log(`👥 Usuários: ${userCount}`);
    console.log(`🌱 Tipos de Sementes: ${seedTypeCount}`);
    console.log(`🏭 Câmaras: ${chamberCount}`);
    console.log(`📍 Localizações: ${locationCount}`);
    console.log(`📦 Produtos: ${productCount}`);
    console.log(`📝 Movimentações: ${movementCount}\n`);
    
    // ============================================================================
    // TESTE DETALHADO POR MODEL
    // ============================================================================
    
    // USUARIOS
    console.log('👥 === USUÁRIOS ===');
    if (userCount > 0) {
      const users = await User.find().limit(3).select('name email role isActive');
      users.forEach(user => console.log(` - ${user.name} (${user.email}) - Role: ${user.role}`));
    } else {
      console.log(' ⚠️  Nenhum usuário encontrado');
    }
    console.log();
    
    // TIPOS DE SEMENTES  
    console.log('🌱 === TIPOS DE SEMENTES ===');
    if (seedTypeCount > 0) {
      const seedTypes = await SeedType.find().limit(3);
      seedTypes.forEach(st => console.log(` - ${st.name} (Temp: ${st.optimalTemperature}°C, Umidade: ${st.optimalHumidity}%)`));
    } else {
      console.log(' ⚠️  Nenhum tipo de semente encontrado');
    }
    console.log();
    
    // CÂMARAS
    console.log('🏭 === CÂMARAS ===');
    if (chamberCount > 0) {
      const chambers = await Chamber.find().limit(3);
      chambers.forEach(chamber => {
        const { quadras, lados, filas, andares } = chamber.dimensions;
        const totalLocations = quadras * lados * filas * andares;
        console.log(` - ${chamber.name} (${quadras}x${lados}x${filas}x${andares} = ${totalLocations} localizações)`);
      });
    } else {
      console.log(' ⚠️  Nenhuma câmara encontrada');
    }
    console.log();
    
    // LOCALIZAÇÕES
    console.log('📍 === LOCALIZAÇÕES ===');
    if (locationCount > 0) {
      const locations = await Location.find().limit(5).populate('chamberId', 'name');
      const occupiedCount = await Location.countDocuments({ isOccupied: true });
      const availableCount = locationCount - occupiedCount;
      
      console.log(` 📊 Total: ${locationCount} | Ocupadas: ${occupiedCount} | Disponíveis: ${availableCount}`);
      locations.forEach(loc => {
        const chamber = loc.chamberId?.name || 'Câmara desconhecida';
        const status = loc.isOccupied ? '🔴 Ocupada' : '🟢 Livre';
        console.log(` - ${loc.code} (${chamber}) - ${status}`);
      });
    } else {
      console.log(' ⚠️  Nenhuma localização encontrada');
    }
    console.log();
    
    // PRODUTOS
    console.log('📦 === PRODUTOS ===');
    if (productCount > 0) {
      const products = await Product.find()
        .limit(5)
        .populate('seedTypeId', 'name')
        .populate('locationId', 'code')
        .select('name lot quantity totalWeight status');
        
      const productsByStatus = await Product.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      console.log(' 📊 Por Status:');
      productsByStatus.forEach(stat => console.log(`   - ${stat._id}: ${stat.count}`));
      
      console.log(' 📦 Produtos:');
      products.forEach(product => {
        const seedType = product.seedTypeId?.name || 'Tipo desconhecido';
        const location = product.locationId?.code || 'Local desconhecido';
        console.log(` - ${product.name} (${seedType}) - ${product.quantity}un/${product.totalWeight}kg - ${location} - Status: ${product.status}`);
      });
    } else {
      console.log(' ⚠️  Nenhum produto encontrado');
    }
    console.log();
    
    // MOVIMENTAÇÕES
    console.log('📝 === MOVIMENTAÇÕES ===');
    if (movementCount > 0) {
      const movements = await Movement.find()
        .limit(5)
        .populate('productId', 'name')
        .populate('userId', 'name')
        .populate('toLocationId', 'code')
        .sort({ timestamp: -1 });
        
      const movementsByType = await Movement.aggregate([
        { $group: { _id: '$type', count: { $sum: 1 } } }
      ]);
      
      console.log(' 📊 Por Tipo:');
      movementsByType.forEach(mov => console.log(`   - ${mov._id}: ${mov.count}`));
      
      console.log(' 📝 Últimas Movimentações:');
      movements.forEach(movement => {
        const product = movement.productId?.name || 'Produto desconhecido';
        const user = movement.userId?.name || 'Usuário desconhecido';
        const location = movement.toLocationId?.code || 'Local desconhecido';
        const date = new Date(movement.timestamp).toLocaleDateString('pt-BR');
        console.log(` - ${movement.type} | ${product} → ${location} | por ${user} (${date})`);
      });
    } else {
      console.log(' ⚠️  Nenhuma movimentação encontrada');
    }
    console.log();
    
    // ============================================================================
    // TESTE DE CONSULTAS SIMILARES ÀS DO FRONTEND
    // ============================================================================
    
    console.log('🧪 === TESTE DE CONSULTAS DO FRONTEND ===');
    
    // Simular consulta de listagem de produtos (como o frontend faz)
    console.log('📦 Teste: Listagem de produtos (simulando frontend)');
    try {
      const productsQuery = await Product.find({})
        .populate('seedTypeId', 'name optimalTemperature optimalHumidity maxStorageTimeDays')
        .populate('locationId', 'code coordinates chamberId')
        .populate({
          path: 'locationId',
          populate: {
            path: 'chamberId',
            select: 'name status'
          }
        })
        .sort({ createdAt: -1 })
        .limit(3)
        .lean();
        
      console.log(`✅ Consulta de produtos funcionando: ${productsQuery.length} produtos retornados`);
      
      // Testar estrutura da resposta
      if (productsQuery.length > 0) {
        const firstProduct = productsQuery[0];
        console.log(`   - Produto: ${firstProduct.name}`);
        console.log(`   - Tipo de Semente: ${firstProduct.seedTypeId?.name || 'N/A'}`);
        console.log(`   - Localização: ${firstProduct.locationId?.code || 'N/A'}`);
        console.log(`   - Câmara: ${firstProduct.locationId?.chamberId?.name || 'N/A'}`);
      }
    } catch (error) {
      console.log(`❌ Erro na consulta de produtos: ${error.message}`);
    }
    
    // Simular consulta de listagem de câmaras
    console.log('\n🏭 Teste: Listagem de câmaras (simulando frontend)');
    try {
      const chambersQuery = await Chamber.find({})
        .sort({ name: 1 })
        .limit(3);
        
      console.log(`✅ Consulta de câmaras funcionando: ${chambersQuery.length} câmaras retornadas`);
      
      if (chambersQuery.length > 0) {
        const firstChamber = chambersQuery[0];
        console.log(`   - Câmara: ${firstChamber.name}`);
        console.log(`   - Status: ${firstChamber.status}`);
        console.log(`   - Dimensões: ${firstChamber.dimensions.quadras}x${firstChamber.dimensions.lados}x${firstChamber.dimensions.filas}x${firstChamber.dimensions.andares}`);
      }
    } catch (error) {
      console.log(`❌ Erro na consulta de câmaras: ${error.message}`);
    }
    
    // Simular consulta de localizações disponíveis
    console.log('\n📍 Teste: Localizações disponíveis (simulando frontend)');
    try {
      const availableLocations = await Location.find({ isOccupied: false })
        .populate('chamberId', 'name')
        .sort({ code: 1 })
        .limit(5);
        
      console.log(`✅ Consulta de localizações disponíveis funcionando: ${availableLocations.length} localizações disponíveis`);
      
      if (availableLocations.length > 0) {
        availableLocations.forEach(loc => {
          console.log(`   - ${loc.code} (${loc.chamberId?.name || 'N/A'}) - Capacidade: ${loc.maxCapacityKg}kg`);
        });
      }
    } catch (error) {
      console.log(`❌ Erro na consulta de localizações disponíveis: ${error.message}`);
    }
    
    // ============================================================================
    // TESTE DE INTEGRIDADE DOS DADOS
    // ============================================================================
    
    console.log('\n🔍 === TESTE DE INTEGRIDADE DOS DADOS ===');
    
    // Verificar produtos órfãos (sem seedType ou location)
    const orphanProducts = await Product.countDocuments({
      $or: [
        { seedTypeId: { $exists: false } },
        { locationId: { $exists: false } }
      ]
    });
    
    if (orphanProducts > 0) {
      console.log(`⚠️  ${orphanProducts} produtos órfãos encontrados (sem seedType ou location)`);
    } else {
      console.log('✅ Todos os produtos têm seedType e location válidos');
    }
    
    // Verificar localizações órfãs (sem câmara)
    const orphanLocations = await Location.countDocuments({
      chamberId: { $exists: false }
    });
    
    if (orphanLocations > 0) {
      console.log(`⚠️  ${orphanLocations} localizações órfãs encontradas (sem câmara)`);
    } else {
      console.log('✅ Todas as localizações têm câmara válida');
    }
    
    // Verificar consistência de ocupação
    const productsStored = await Product.countDocuments({ status: 'stored' });
    const locationsOccupied = await Location.countDocuments({ isOccupied: true });
    
    if (productsStored === locationsOccupied) {
      console.log(`✅ Consistência de ocupação: ${productsStored} produtos armazenados = ${locationsOccupied} localizações ocupadas`);
    } else {
      console.log(`⚠️  Inconsistência de ocupação: ${productsStored} produtos armazenados ≠ ${locationsOccupied} localizações ocupadas`);
    }
    
    // ============================================================================
    // RESUMO FINAL
    // ============================================================================
    
    console.log('\n🎯 === RESUMO FINAL ===');
    console.log(`📊 Total de documentos: ${userCount + seedTypeCount + chamberCount + locationCount + productCount + movementCount}`);
    
    if (seedTypeCount > 0 && productCount > 0 && locationCount > 0) {
      console.log('✅ Banco de dados com dados suficientes para testar o frontend');
    } else if (seedTypeCount > 0) {
      console.log('⚠️  Apenas tipos de sementes encontrados - frontend parcialmente funcional');
    } else {
      console.log('❌ Banco de dados vazio - frontend não funcionará');
    }
    
    await mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  }
}

checkData(); 