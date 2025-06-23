const mongoose = require('mongoose');
require('dotenv').config();
require('../src/models/Product');
require('../src/models/Location');
require('../src/models/Movement');
require('../src/models/SeedType');

const Product = mongoose.model('Product');
const SeedType = mongoose.model('SeedType');
const Location = mongoose.model('Location');
const Movement = mongoose.model('Movement');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_TEST_URI || 'mongodb://mongo:LNRONlHSRBOrWmtnGRPYffZFzdgJMzHp@switchback.proxy.rlwy.net:25486';

async function testNewProduct() {
  await mongoose.connect(MONGODB_URI);
  
  console.log('=== TESTANDO PRODUTO NOVO ===');
  
  // Interceptar erros críticos do middleware
  const originalError = console.error;
  let criticalErrors = [];
  console.error = (...args) => {
    const message = args.join(' ');
    if (message.includes('CRITICAL ERROR')) {
      criticalErrors.push(message);
    }
    originalError(...args);
  };
  
  try {
    // Buscar dados necessários
    const seedType = await SeedType.findOne();
    const location = await Location.findOne({ isOccupied: false });
    
    if (!seedType || !location) {
      console.log('❌ Não há seedType ou location disponível');
      await mongoose.disconnect();
      return;
    }
    
    console.log('📦 Criando produto de teste...');
    console.log(`SeedType: ${seedType.name}`);
    console.log(`Location: ${location.code}`);
    
    // Criar produto novo (deve triggear middleware)
    const testProduct = new Product({
      name: 'TESTE - Produto Middleware',
      lot: 'TEST001',
      seedTypeId: seedType._id,
      quantity: 10,
      storageType: 'saco',
      weightPerUnit: 50,
      locationId: location._id,
      entryDate: new Date(),
      metadata: {
        createdBy: new mongoose.Types.ObjectId()
      }
    });
    
    // Salvar (vai triggear middleware)
    console.log('💾 Salvando produto novo...');
    console.log(`isNew antes do save: ${testProduct.isNew}`);
    
    await testProduct.save();
    
    console.log('✅ Produto criado:', testProduct._id);
    console.log('Status:', testProduct.status);
    console.log(`isNew após save: ${testProduct.isNew}`);
    
    // Aguardar um pouco para middleware assíncrono
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Verificar movimentações
    const movements = await Movement.find({ productId: testProduct._id });
    console.log(`Movimentações criadas: ${movements.length}`);
    
    if (movements.length > 0) {
      movements.forEach((mov, i) => {
        console.log(`  ${i+1}. Tipo: ${mov.type}, Razão: ${mov.reason}`);
      });
    }
    
    // Limpar teste
    await Product.deleteOne({ _id: testProduct._id });
    if (movements.length > 0) {
      await Movement.deleteMany({ productId: testProduct._id });
    }
    console.log('🧹 Produto de teste removido');
    
  } catch (error) {
    console.error('❌ Erro geral:', error.message);
    console.error('Stack completo:', error.stack);
  }
  
  // Restaurar console.error
  console.error = originalError;
  
  if (criticalErrors.length > 0) {
    console.log('\n🚨 ERROS CRÍTICOS DO MIDDLEWARE:');
    criticalErrors.forEach(err => console.log('  ', err));
  } else {
    console.log('\n✅ Nenhum erro crítico detectado');
  }
  
  await mongoose.disconnect();
  console.log('📡 Desconectado do MongoDB');
}

testNewProduct().catch(console.error);