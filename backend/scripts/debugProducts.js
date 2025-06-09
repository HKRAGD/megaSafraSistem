const mongoose = require('mongoose');
const Product = require('../src/models/Product');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/sistema-sementes');

async function debugProducts() {
  try {
    console.log('🔍 === DEBUG DOS PRODUTOS ===');
    
    // 1. Contar todos os produtos
    const totalProducts = await Product.countDocuments();
    console.log('📦 Total de produtos no banco:', totalProducts);
    
    // 2. Contar por status
    const statusCounts = await Product.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    console.log('📊 Produtos por status:', statusCounts);
    
    // 3. Verificar produtos com status stored/reserved
    const activeProducts = await Product.find({ 
      status: { $in: ['stored', 'reserved'] } 
    }).select('name lot status');
    console.log('✅ Produtos ativos (stored/reserved):', activeProducts.length);
    activeProducts.forEach(p => {
      console.log(`   - ${p.name} (${p.lot}) - Status: ${p.status}`);
    });
    
    // 4. Verificar produtos com populate
    const productsWithLocation = await Product.find({ 
      status: { $in: ['stored', 'reserved'] } 
    })
    .populate('seedTypeId', 'name')
    .populate('locationId', 'code coordinates chamberId')
    .populate({
      path: 'locationId',
      populate: { path: 'chamberId', select: 'name' }
    });
    
    console.log('🏗️ Produtos com dados populados:', productsWithLocation.length);
    productsWithLocation.forEach(p => {
      console.log(`   - ${p.name}: ${p.seedTypeId?.name} em ${p.locationId?.code} (${p.locationId?.chamberId?.name})`);
    });
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

debugProducts(); 