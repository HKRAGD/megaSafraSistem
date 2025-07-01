/**
 * Script para corrigir produtos com batchId='undefined' no banco de dados
 * Execução: node scripts/fix-batch-ids.js
 */

const mongoose = require('mongoose');
const Product = require('../src/models/Product');
require('dotenv').config();

async function fixBatchIds() {
  try {
    console.log('🔧 Iniciando correção de batchIds inconsistentes...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Conectado ao MongoDB');

    // 1. Identificar produtos com batchId problemático
    const problematicProducts = await Product.find({
      $or: [
        { batchId: 'undefined' },
        { batchId: '' },
        { batchId: 'null' }
      ]
    });

    console.log(`📊 Encontrados ${problematicProducts.length} produtos com batchId problemático`);

    if (problematicProducts.length === 0) {
      console.log('✅ Nenhum produto problemático encontrado!');
      await mongoose.disconnect();
      return;
    }

    // 2. Mostrar exemplos dos produtos problemáticos
    console.log('\n📋 Exemplos de produtos problemáticos:');
    problematicProducts.slice(0, 3).forEach((product, index) => {
      console.log(`  ${index + 1}. ID: ${product._id}`);
      console.log(`     Nome: ${product.name}`);
      console.log(`     batchId: '${product.batchId}'`);
      console.log(`     clientId: ${product.clientId}`);
      console.log(`     Status: ${product.status}`);
      console.log('');
    });

    // 3. Perguntar confirmação (em produção, remover este prompt)
    console.log('⚠️  ATENÇÃO: Este script irá definir batchId como undefined (null) para estes produtos.');
    console.log('⚠️  Isso fará com que sejam tratados como produtos individuais.');
    console.log('⚠️  Pressione Ctrl+C para cancelar ou aguarde 5 segundos para continuar...\n');
    
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 4. Corrigir os produtos
    console.log('🔄 Iniciando correção...');
    
    const updateResult = await Product.updateMany(
      {
        $or: [
          { batchId: 'undefined' },
          { batchId: '' },
          { batchId: 'null' }
        ]
      },
      {
        $unset: { batchId: "" } // Remove o campo completamente (equivale a undefined)
      }
    );

    console.log(`✅ Correção concluída!`);
    console.log(`   - Produtos afetados: ${updateResult.modifiedCount}`);
    console.log(`   - Produtos correspondentes: ${updateResult.matchedCount}`);

    // 5. Verificar resultado
    const remainingProblematic = await Product.countDocuments({
      $or: [
        { batchId: 'undefined' },
        { batchId: '' },
        { batchId: 'null' }
      ]
    });

    if (remainingProblematic === 0) {
      console.log('✅ Todos os produtos problemáticos foram corrigidos!');
    } else {
      console.log(`⚠️  Ainda existem ${remainingProblematic} produtos problemáticos`);
    }

    // 6. Estatísticas finais
    const totalProducts = await Product.countDocuments();
    const productsWithValidBatchId = await Product.countDocuments({
      batchId: { $exists: true, $ne: null, $ne: '', $ne: 'undefined' }
    });
    const individualProducts = await Product.countDocuments({
      $or: [
        { batchId: { $exists: false } },
        { batchId: null },
        { batchId: undefined }
      ]
    });

    console.log('\n📊 Estatísticas finais:');
    console.log(`   - Total de produtos: ${totalProducts}`);
    console.log(`   - Produtos em grupo (batchId válido): ${productsWithValidBatchId}`);
    console.log(`   - Produtos individuais: ${individualProducts}`);

    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');

  } catch (error) {
    console.error('❌ Erro durante a correção:', error.message);
    console.error(error);
  }
}

// Executar apenas se for chamado diretamente
if (require.main === module) {
  fixBatchIds();
}

module.exports = fixBatchIds;