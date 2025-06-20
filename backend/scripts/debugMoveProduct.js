const mongoose = require('mongoose');
const Product = require('../src/models/Product');
const Location = require('../src/models/Location');
const Movement = require('../src/models/Movement');
const Chamber = require('../src/models/Chamber');
const SeedType = require('../src/models/SeedType');
const User = require('../src/models/User');
const productService = require('../src/services/productService');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/sistema-sementes-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const debugMoveProduct = async () => {
  try {
    console.log('\n🔍 INICIANDO DEBUG DO PROBLEMA DE MOVIMENTAÇÃO\n');

    // 1. Buscar um produto existente
    const products = await Product.find({ status: 'stored' })
      .populate('locationId')
      .limit(1);

    if (products.length === 0) {
      console.log('❌ Nenhum produto encontrado para testar');
      return;
    }

    const product = products[0];
    console.log('📦 Produto selecionado:', {
      id: product._id,
      name: product.name,
      lot: product.lot,
      currentLocation: product.locationId.code,
      status: product.status
    });

    // 2. Buscar localização disponível
    const availableLocation = await Location.findOne({
      isOccupied: false,
      _id: { $ne: product.locationId._id }
    });

    if (!availableLocation) {
      console.log('❌ Nenhuma localização disponível para teste');
      return;
    }

    console.log('📍 Localização destino:', {
      id: availableLocation._id,
      code: availableLocation.code,
      isOccupied: availableLocation.isOccupied,
      maxCapacity: availableLocation.maxCapacityKg,
      currentWeight: availableLocation.currentWeightKg
    });

    // 3. Buscar usuário para fazer a movimentação
    const user = await User.findOne({ role: 'admin' });
    if (!user) {
      console.log('❌ Nenhum usuário admin encontrado');
      return;
    }

    console.log('👤 Usuário:', user.name);

    // 4. PRIMEIRA MOVIMENTAÇÃO (deveria funcionar)
    console.log('\n🚀 PRIMEIRA MOVIMENTAÇÃO (TESTE)');
    
    try {
      const result1 = await productService.moveProduct(
        product._id,
        availableLocation._id,
        user._id,
        {
          reason: 'Teste de debug - primeira movimentação',
          validateCapacity: true,
          analyzeOptimization: true
        }
      );

      console.log('✅ PRIMEIRA MOVIMENTAÇÃO SUCESSO');
      console.log('Produto movido para:', result1.data.product.locationId.code);
      
      // Verificar estado após primeira movimentação
      const productAfterFirst = await Product.findById(product._id).populate('locationId');
      const locationAfterFirst = await Location.findById(availableLocation._id);
      
      console.log('📍 Estado pós-primeira movimentação:');
      console.log('- Produto localização:', productAfterFirst.locationId.code);
      console.log('- Localização ocupada:', locationAfterFirst.isOccupied);
      console.log('- Peso na localização:', locationAfterFirst.currentWeightKg);

    } catch (error) {
      console.log('❌ ERRO NA PRIMEIRA MOVIMENTAÇÃO:', error.message);
      return;
    }

    // 5. Aguardar um momento para evitar problemas de timing
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 6. Buscar outra localização para SEGUNDA MOVIMENTAÇÃO
    const secondLocation = await Location.findOne({
      isOccupied: false,
      _id: { 
        $ne: product.locationId._id,
        $ne: availableLocation._id 
      }
    });

    if (!secondLocation) {
      console.log('❌ Nenhuma segunda localização disponível');
      return;
    }

    console.log('\n🔄 SEGUNDA MOVIMENTAÇÃO (REPRODUZIR ERRO)');
    console.log('📍 Segunda localização destino:', {
      id: secondLocation._id,
      code: secondLocation.code,
      isOccupied: secondLocation.isOccupied
    });

    // Verificar estado do produto antes da segunda movimentação
    const productBeforeSecond = await Product.findById(product._id).populate('locationId');
    console.log('📦 Estado do produto antes da segunda movimentação:');
    console.log('- ID do produto:', productBeforeSecond._id);
    console.log('- Status:', productBeforeSecond.status);
    console.log('- Localização atual:', productBeforeSecond.locationId.code);
    console.log('- Localização atual ID:', productBeforeSecond.locationId._id);

    try {
      const result2 = await productService.moveProduct(
        product._id,
        secondLocation._id,
        user._id,
        {
          reason: 'Teste de debug - segunda movimentação',
          validateCapacity: true,
          analyzeOptimization: true
        }
      );

      console.log('✅ SEGUNDA MOVIMENTAÇÃO SUCESSO');
      console.log('Produto movido para:', result2.data.product.locationId.code);

    } catch (error) {
      console.log('❌ ERRO NA SEGUNDA MOVIMENTAÇÃO (REPRODUZIDO):', error.message);
      
      // Verificar estado após erro
      const productAfterError = await Product.findById(product._id).populate('locationId');
      const firstLocationAfterError = await Location.findById(availableLocation._id);
      const secondLocationAfterError = await Location.findById(secondLocation._id);
      
      console.log('\n🔍 ANÁLISE DO ESTADO PÓS-ERRO:');
      console.log('📦 Produto:');
      console.log('- Localização do produto:', productAfterError.locationId.code);
      console.log('- Status do produto:', productAfterError.status);
      
      console.log('📍 Primeira localização:');
      console.log('- Código:', firstLocationAfterError.code);
      console.log('- Ocupada:', firstLocationAfterError.isOccupied);
      console.log('- Peso atual:', firstLocationAfterError.currentWeightKg);
      
      console.log('📍 Segunda localização:');
      console.log('- Código:', secondLocationAfterError.code);
      console.log('- Ocupada:', secondLocationAfterError.isOccupied);
      console.log('- Peso atual:', secondLocationAfterError.currentWeightKg);

      // Verificar histórico de movimentações
      const movements = await Movement.find({ productId: product._id })
        .populate('fromLocationId', 'code')
        .populate('toLocationId', 'code')
        .sort({ createdAt: -1 })
        .limit(5);

      console.log('\n📋 HISTÓRICO DE MOVIMENTAÇÕES (últimas 5):');
      movements.forEach((mov, index) => {
        console.log(`${index + 1}. ${mov.type} - ${mov.reason}`);
        console.log(`   De: ${mov.fromLocationId?.code || 'N/A'} → Para: ${mov.toLocationId?.code || 'N/A'}`);
        console.log(`   Data: ${mov.createdAt}`);
        console.log(`   Automática: ${mov.metadata?.isAutomatic || false}`);
      });
    }

    // 7. Verificar se existem produtos duplicados na mesma localização
    console.log('\n🔍 VERIFICAÇÃO DE PRODUTOS DUPLICADOS POR LOCALIZAÇÃO:');
    const duplicates = await Product.aggregate([
      { $match: { status: 'stored' } },
      { $group: { _id: '$locationId', products: { $push: { id: '$_id', name: '$name', lot: '$lot' } }, count: { $sum: 1 } } },
      { $match: { count: { $gt: 1 } } }
    ]);

    if (duplicates.length > 0) {
      console.log('⚠️ PRODUTOS DUPLICADOS ENCONTRADOS:');
      for (const dup of duplicates) {
        const location = await Location.findById(dup._id);
        console.log(`Localização ${location.code}:`);
        dup.products.forEach(p => {
          console.log(`  - ${p.name} (${p.lot}) - ID: ${p.id}`);
        });
      }
    } else {
      console.log('✅ Nenhum produto duplicado encontrado');
    }

  } catch (error) {
    console.error('❌ ERRO GERAL NO DEBUG:', error);
  } finally {
    mongoose.connection.close();
  }
};

// Executar debug
debugMoveProduct(); 