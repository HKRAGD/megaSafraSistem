const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
require('../src/models/Product');
require('../src/models/Location');
require('../src/models/Movement');

const Product = mongoose.model('Product');
const Location = mongoose.model('Location');
const Movement = mongoose.model('Movement');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_TEST_URI || 'mongodb://mongo:LNRONlHSRBOrWmtnGRPYffZFzdgJMzHp@switchback.proxy.rlwy.net:25486';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
}

async function fixImportedProducts() {
  console.log('🔧 Corrigindo produtos importados...');
  
  // Buscar produtos LOCADO que não têm peso nas localizações
  const products = await Product.find({ status: 'LOCADO' }).populate('locationId');
  
  let fixedCount = 0;
  let movementsCreated = 0;
  let locationsUpdated = 0;
  
  for (const product of products) {
    if (!product.locationId) continue;
    
    const location = product.locationId;
    
    try {
      // Verificar se a localização já tem peso do produto
      if (location.currentWeightKg === 0) {
        console.log(`📍 Corrigindo localização ${location.code} para produto ${product.name}`);
        
        // Atualizar peso da localização
        await location.addWeight(product.totalWeight);
        locationsUpdated++;
        
        console.log(`   ✅ Peso atualizado: ${product.totalWeight}kg`);
      }
      
      // Verificar se há registro de movimentação
      const existingMovement = await Movement.findOne({ productId: product._id });
      if (!existingMovement) {
        console.log(`📋 Criando movimentação para produto ${product.name}`);
        
        // Criar movimentação de entrada
        await Movement.create({
          productId: product._id,
          type: 'entry',
          toLocationId: product.locationId._id,
          fromLocationId: null,
          quantity: product.quantity,
          weight: product.totalWeight,
          userId: product.metadata?.createdBy,
          reason: 'Entrada de produto (correção automática)',
          notes: 'Movimentação criada automaticamente para corrigir produtos importados',
          metadata: {
            isAutomatic: true,
            verified: true,
            isCorrection: true
          }
        });
        
        movementsCreated++;
        console.log(`   ✅ Movimentação criada`);
      }
      
      fixedCount++;
      
    } catch (error) {
      console.error(`❌ Erro ao corrigir produto ${product.name}:`, error.message);
    }
  }
  
  // Resumo
  console.log('\n================================================================================');
  console.log('📊 RESUMO DA CORREÇÃO');
  console.log('================================================================================');
  console.log(`✅ Produtos processados: ${fixedCount}`);
  console.log(`📍 Localizações atualizadas: ${locationsUpdated}`);
  console.log(`📋 Movimentações criadas: ${movementsCreated}`);
  
  // Verificar resultado
  const totalOccupied = await Location.countDocuments({ isOccupied: true });
  const totalProducts = await Product.countDocuments({ status: 'LOCADO' });
  
  console.log('\n📈 ESTADO ATUAL:');
  console.log(`   Produtos LOCADO: ${totalProducts}`);
  console.log(`   Localizações ocupadas: ${totalOccupied}`);
  
  if (totalProducts === totalOccupied) {
    console.log('🎉 SISTEMA CORRIGIDO COM SUCESSO!');
  } else {
    console.log('⚠️ Ainda há inconsistências. Verifique manualmente.');
  }
}

async function main() {
  try {
    await connectToDatabase();
    await fixImportedProducts();
  } catch (error) {
    console.error('❌ Erro na correção:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('📡 Desconectado do MongoDB');
  }
}

// Executar script
main().catch(console.error);