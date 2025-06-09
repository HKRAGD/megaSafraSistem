const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Location = require('../src/models/Location');
const Movement = require('../src/models/Movement');
const User = require('../src/models/User');
const productService = require('../src/services/productService');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/sistema-sementes-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const testAllMovementOperations = async () => {
  try {
    console.log('\n🧪 TESTANDO TODAS AS OPERAÇÕES DE MOVIMENTAÇÃO APÓS CORREÇÃO\n');

    // Buscar usuário admin
    const user = await User.findOne({ role: 'admin' });
    if (!user) {
      console.log('❌ Nenhum usuário admin encontrado');
      return;
    }

    // Buscar produto para teste
    const product = await Product.findOne({ status: 'stored' }).populate('locationId');
    if (!product) {
      console.log('❌ Nenhum produto encontrado');
      return;
    }

    console.log('📦 Produto de teste:', {
      id: product._id,
      name: product.name,
      lot: product.lot,
      quantity: product.quantity,
      currentLocation: product.locationId.code
    });

    // Buscar localizações disponíveis
    const availableLocations = await Location.find({
      isOccupied: false,
      _id: { $ne: product.locationId._id }
    }).limit(3);

    if (availableLocations.length < 3) {
      console.log('❌ Não há localizações suficientes para teste');
      return;
    }

    console.log('📍 Localizações disponíveis:');
    availableLocations.forEach((loc, index) => {
      console.log(`  ${index + 1}. ${loc.code} (${loc.maxCapacityKg}kg)`);
    });

    // TESTE 1: Movimentação completa consecutiva
    console.log('\n🚀 TESTE 1: Movimentações consecutivas (movimentação completa)');
    
    try {
      // Primeira movimentação
      const move1 = await productService.moveProduct(
        product._id,
        availableLocations[0]._id,
        user._id,
        { reason: 'Teste 1.1 - Primeira movimentação' }
      );
      console.log('✅ Primeira movimentação: SUCESSO');
      console.log(`   → Movido para: ${move1.data.product.locationId.code}`);

      // Segunda movimentação (logo em seguida)
      const move2 = await productService.moveProduct(
        product._id,
        availableLocations[1]._id,
        user._id,
        { reason: 'Teste 1.2 - Segunda movimentação' }
      );
      console.log('✅ Segunda movimentação: SUCESSO');
      console.log(`   → Movido para: ${move2.data.product.locationId.code}`);

      // Terceira movimentação (logo em seguida)
      const move3 = await productService.moveProduct(
        product._id,
        availableLocations[2]._id,
        user._id,
        { reason: 'Teste 1.3 - Terceira movimentação' }
      );
      console.log('✅ Terceira movimentação: SUCESSO');
      console.log(`   → Movido para: ${move3.data.product.locationId.code}`);

    } catch (error) {
      console.log('❌ ERRO em movimentação completa:', error.message);
    }

    // TESTE 2: Movimentação parcial
    console.log('\n🔄 TESTE 2: Movimentação parcial');
    
    try {
      const partialMove = await productService.partialMove(
        product._id,
        Math.floor(product.quantity / 2), // Metade da quantidade
        availableLocations[0]._id,
        user._id,
        { reason: 'Teste 2 - Movimentação parcial' }
      );
      console.log('✅ Movimentação parcial: SUCESSO');
      console.log(`   → Produto original: ${partialMove.data.originalProduct.quantity} unidades`);
      console.log(`   → Novo produto: ${partialMove.data.newProduct.quantity} unidades`);
      console.log(`   → Localização nova: ${partialMove.data.newProduct.locationId.code}`);

    } catch (error) {
      console.log('❌ ERRO em movimentação parcial:', error.message);
    }

    // TESTE 3: Saída parcial
    console.log('\n📤 TESTE 3: Saída parcial');
    
    try {
      const currentProduct = await Product.findById(product._id);
      const exitQuantity = Math.min(2, currentProduct.quantity); // Máximo 2 unidades
      
      const partialExit = await productService.partialExit(
        product._id,
        exitQuantity,
        user._id,
        { reason: 'Teste 3 - Saída parcial' }
      );
      console.log('✅ Saída parcial: SUCESSO');
      console.log(`   → Quantidade retirada: ${exitQuantity} unidades`);
      
      if (partialExit.data.productRemoved) {
        console.log('   → Produto removido completamente (estoque zerado)');
      } else {
        console.log(`   → Quantidade restante: ${partialExit.data.updatedProduct.quantity} unidades`);
      }

    } catch (error) {
      console.log('❌ ERRO em saída parcial:', error.message);
    }

    // TESTE 4: Adição de estoque (se produto ainda existe)
    console.log('\n📥 TESTE 4: Adição de estoque');
    
    try {
      const currentProduct = await Product.findById(product._id);
      
      if (currentProduct && currentProduct.status === 'stored') {
        const addStock = await productService.addStock(
          product._id,
          5, // Adicionar 5 unidades
          user._id,
          { reason: 'Teste 4 - Adição de estoque' }
        );
        console.log('✅ Adição de estoque: SUCESSO');
        console.log(`   → Quantidade anterior: ${addStock.data.quantityBefore} unidades`);
        console.log(`   → Quantidade atual: ${addStock.data.quantityAfter} unidades`);
        console.log(`   → Peso anterior: ${addStock.data.weightBefore}kg`);
        console.log(`   → Peso atual: ${addStock.data.weightAfter}kg`);
      } else {
        console.log('⚠️ Produto foi removido, não é possível adicionar estoque');
      }

    } catch (error) {
      console.log('❌ ERRO em adição de estoque:', error.message);
    }

    // VERIFICAR HISTÓRICO
    console.log('\n📋 HISTÓRICO DE MOVIMENTAÇÕES DO PRODUTO:');
    const movements = await Movement.find({ productId: product._id })
      .populate('fromLocationId', 'code')
      .populate('toLocationId', 'code')
      .sort({ createdAt: -1 })
      .limit(10);

    movements.forEach((mov, index) => {
      console.log(`${index + 1}. ${mov.type.toUpperCase()} - ${mov.reason}`);
      console.log(`   De: ${mov.fromLocationId?.code || 'N/A'} → Para: ${mov.toLocationId?.code || 'N/A'}`);
      console.log(`   Quantidade: ${mov.quantity}, Peso: ${mov.weight}kg`);
      console.log(`   Data: ${mov.createdAt.toLocaleString('pt-BR')}`);
      console.log(`   Automática: ${mov.metadata?.isAutomatic || false}`);
      console.log('');
    });

    console.log('🎉 TODOS OS TESTES CONCLUÍDOS!');

  } catch (error) {
    console.error('❌ ERRO GERAL:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Executar testes
testAllMovementOperations(); 