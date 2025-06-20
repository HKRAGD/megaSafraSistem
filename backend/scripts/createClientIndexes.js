/**
 * Script para criar índices de performance para consultas de cliente
 * Execução: node scripts/createClientIndexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

async function createClientIndexes() {
  try {
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes');
    console.log('✅ Conectado ao MongoDB');

    const db = mongoose.connection.db;

    // Criar índice para clientId na collection products
    console.log('🔄 Criando índice products.clientId...');
    await db.collection('products').createIndex({ clientId: 1 });
    console.log('✅ Índice products.clientId criado com sucesso');

    // Verificar índices existentes na collection clients
    console.log('🔍 Verificando índices na collection clients...');
    const clientIndexes = await db.collection('clients').indexes();
    console.log('📋 Índices existentes em clients:', clientIndexes.map(i => i.name));

    // Verificar índices existentes na collection products  
    console.log('🔍 Verificando índices na collection products...');
    const productIndexes = await db.collection('products').indexes();
    console.log('📋 Índices existentes em products:', productIndexes.map(i => i.name));

    console.log('✅ Todos os índices criados com sucesso!');
    
  } catch (error) {
    console.error('❌ Erro ao criar índices:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado do MongoDB');
  }
}

// Executar apenas se chamado diretamente
if (require.main === module) {
  createClientIndexes();
}

module.exports = createClientIndexes;