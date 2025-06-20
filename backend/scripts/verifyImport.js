const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const SeedType = require('../src/models/SeedType');
const Location = require('../src/models/Location');
const Movement = require('../src/models/Movement');

async function verifyImport() {
  try {
    await mongoose.connect('mongodb://localhost:27017/mega-safra-01');
    
    const productCount = await Product.countDocuments({ status: 'stored' });
    const seedTypeCount = await SeedType.countDocuments({ isActive: true });
    const occupiedLocationCount = await Location.countDocuments({ isOccupied: true });
    const movementCount = await Movement.countDocuments({ type: 'entry' });
    
    console.log('✅ VERIFICAÇÃO PÓS-IMPORTAÇÃO:');
    console.log('   📦 Produtos armazenados:', productCount);
    console.log('   🌱 Tipos de sementes:', seedTypeCount);
    console.log('   📍 Localizações ocupadas:', occupiedLocationCount);
    console.log('   📝 Movimentações de entrada:', movementCount);
    
    if (productCount > 0) {
      console.log('\n📋 PRODUTOS IMPORTADOS:');
      const products = await Product.find({ status: 'stored' })
        .populate('seedTypeId')
        .populate('locationId')
        .sort({ createdAt: -1 });
        
      products.forEach((product, index) => {
        console.log(`   ${index + 1}. ${product.name} (${product.lot}) → ${product.locationId?.code} [${product.calculatedTotalWeight}kg]`);
      });
    }
    
    if (seedTypeCount > 0) {
      console.log('\n🌱 TIPOS DE SEMENTES CRIADOS:');
      const seedTypes = await SeedType.find({ isActive: true }).sort({ createdAt: -1 });
      seedTypes.forEach((seedType, index) => {
        console.log(`   ${index + 1}. ${seedType.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

verifyImport(); 