/**
 * Script de Migração: Sistema de Roles e FSM
 * 
 * Este script migra dados existentes para o novo sistema:
 * 1. Atualiza status dos produtos para o novo FSM
 * 2. Atualiza roles dos usuários para ADMIN/OPERATOR
 * 3. Adiciona campo version aos produtos
 * 4. Corrige referências de status em aggregations
 * 
 * IMPORTANTE: Execute em ambiente de desenvolvimento primeiro!
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Importar modelos
const Product = require('../src/models/Product');
const User = require('../src/models/User');

/**
 * Conectar ao banco de dados
 */
const connectDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/mega-safra-01', {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ Conectado ao MongoDB');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error);
    process.exit(1);
  }
};

/**
 * Migrar produtos para novo FSM
 */
const migrateProducts = async () => {
  console.log('\n🔄 Iniciando migração de produtos...');
  
  try {
    // Mapear status antigos para novos
    const statusMapping = {
      'stored': 'LOCADO',
      'reserved': 'AGUARDANDO_RETIRADA', 
      'removed': 'REMOVIDO'
    };

    // Buscar todos os produtos
    const products = await Product.find({}).select('_id status locationId');
    console.log(`📊 Encontrados ${products.length} produtos para migrar`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      try {
        let newStatus;

        // Determinar novo status
        if (product.status && statusMapping[product.status]) {
          // Status antigo conhecido
          newStatus = statusMapping[product.status];
        } else if (product.locationId) {
          // Produto com localização -> LOCADO
          newStatus = 'LOCADO';
        } else {
          // Produto sem localização -> AGUARDANDO_LOCACAO
          newStatus = 'AGUARDANDO_LOCACAO';
        }

        // Atualizar produto
        await Product.findByIdAndUpdate(product._id, {
          status: newStatus,
          version: 0 // Inicializar campo version
        });

        migratedCount++;

        if (migratedCount % 10 === 0) {
          console.log(`  📈 Migrados ${migratedCount}/${products.length} produtos...`);
        }

      } catch (error) {
        console.error(`❌ Erro ao migrar produto ${product._id}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`✅ Migração de produtos concluída:`);
    console.log(`  - Migrados: ${migratedCount}`);
    console.log(`  - Pulados: ${skippedCount}`);

    // Verificar migração
    const statusCounts = await Product.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Status dos produtos após migração:');
    statusCounts.forEach(item => {
      console.log(`  - ${item._id}: ${item.count}`);
    });

  } catch (error) {
    console.error('❌ Erro na migração de produtos:', error);
    throw error;
  }
};

/**
 * Migrar usuários para novos roles
 */
const migrateUsers = async () => {
  console.log('\n🔄 Iniciando migração de usuários...');
  
  try {
    // Buscar todos os usuários
    const users = await User.find({}).select('_id email role');
    console.log(`📊 Encontrados ${users.length} usuários para migrar`);

    let migratedCount = 0;
    let skippedCount = 0;

    for (const user of users) {
      try {
        let newRole;

        // Determinar novo role baseado no email ou role atual
        if (user.email.includes('admin') || user.role === 'admin') {
          newRole = 'ADMIN';
        } else {
          newRole = 'OPERATOR'; // Default para operadores
        }

        // Atualizar usuário
        await User.findByIdAndUpdate(user._id, {
          role: newRole
        });

        migratedCount++;

      } catch (error) {
        console.error(`❌ Erro ao migrar usuário ${user._id}:`, error.message);
        skippedCount++;
      }
    }

    console.log(`✅ Migração de usuários concluída:`);
    console.log(`  - Migrados: ${migratedCount}`);
    console.log(`  - Pulados: ${skippedCount}`);

    // Verificar migração
    const roleCounts = await User.aggregate([
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      }
    ]);

    console.log('\n📊 Roles dos usuários após migração:');
    roleCounts.forEach(item => {
      console.log(`  - ${item._id}: ${item.count}`);
    });

  } catch (error) {
    console.error('❌ Erro na migração de usuários:', error);
    throw error;
  }
};

/**
 * Verificar integridade dos dados após migração
 */
const verifyMigration = async () => {
  console.log('\n🔍 Verificando integridade dos dados...');
  
  try {
    // Verificar produtos sem status válido
    const invalidProducts = await Product.find({
      status: { $nin: ['CADASTRADO', 'AGUARDANDO_LOCACAO', 'LOCADO', 'AGUARDANDO_RETIRADA', 'RETIRADO', 'REMOVIDO'] }
    });

    if (invalidProducts.length > 0) {
      console.warn(`⚠️  ${invalidProducts.length} produtos com status inválido encontrados`);
    } else {
      console.log('✅ Todos os produtos têm status válidos');
    }

    // Verificar usuários sem role válido
    const invalidUsers = await User.find({
      role: { $nin: ['ADMIN', 'OPERATOR'] }
    });

    if (invalidUsers.length > 0) {
      console.warn(`⚠️  ${invalidUsers.length} usuários com role inválido encontrados`);
    } else {
      console.log('✅ Todos os usuários têm roles válidos');
    }

    // Verificar produtos sem version
    const productsWithoutVersion = await Product.countDocuments({
      version: { $exists: false }
    });

    if (productsWithoutVersion > 0) {
      console.warn(`⚠️  ${productsWithoutVersion} produtos sem campo version`);
    } else {
      console.log('✅ Todos os produtos têm campo version');
    }

    // Verificar produtos sem localização que deveriam ter status AGUARDANDO_LOCACAO
    const productsWaitingLocation = await Product.countDocuments({
      locationId: { $exists: false },
      status: 'AGUARDANDO_LOCACAO'
    });

    const productsWithLocation = await Product.countDocuments({
      locationId: { $exists: true, $ne: null },
      status: 'LOCADO'
    });

    console.log('\n📊 Verificação de consistência:');
    console.log(`  - Produtos aguardando locação: ${productsWaitingLocation}`);
    console.log(`  - Produtos locados: ${productsWithLocation}`);

  } catch (error) {
    console.error('❌ Erro na verificação:', error);
    throw error;
  }
};

/**
 * Criar usuário admin padrão se não existir
 */
const createDefaultAdmin = async () => {
  console.log('\n👤 Verificando usuário admin padrão...');
  
  try {
    const adminExists = await User.findOne({ role: 'ADMIN' });
    
    if (!adminExists) {
      console.log('🔧 Criando usuário admin padrão...');
      
      const adminUser = new User({
        name: 'Administrador',
        email: 'admin@sistemasementes.com',
        password: 'admin123', // Será hasheada automaticamente
        role: 'ADMIN',
        isActive: true
      });

      await adminUser.save();
      console.log('✅ Usuário admin criado com sucesso');
      console.log('📧 Email: admin@sistemasementes.com');
      console.log('🔑 Senha: admin123');
      console.log('⚠️  IMPORTANTE: Altere a senha após o primeiro login!');
    } else {
      console.log('✅ Usuário admin já existe');
    }

  } catch (error) {
    console.error('❌ Erro ao criar admin padrão:', error);
  }
};

/**
 * Executar migração completa
 */
const runMigration = async () => {
  console.log('🚀 INICIANDO MIGRAÇÃO DO SISTEMA DE ROLES E FSM');
  console.log('================================================');
  
  const startTime = Date.now();

  try {
    await connectDatabase();
    
    // Fazer backup (log dos dados atuais)
    console.log('\n📋 Estado atual do sistema:');
    const currentProductCount = await Product.countDocuments();
    const currentUserCount = await User.countDocuments();
    console.log(`  - Produtos: ${currentProductCount}`);
    console.log(`  - Usuários: ${currentUserCount}`);

    // Executar migrações
    await migrateProducts();
    await migrateUsers();
    await createDefaultAdmin();
    await verifyMigration();

    const endTime = Date.now();
    const duration = Math.round((endTime - startTime) / 1000);

    console.log('\n🎉 MIGRAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(`⏱️  Tempo total: ${duration}s`);
    console.log('\n📋 Próximos passos:');
    console.log('1. Testar funcionalidades básicas');
    console.log('2. Verificar login com usuários migrados');
    console.log('3. Testar criação de produtos sem localização');
    console.log('4. Testar fluxo de solicitação/confirmação de retirada');

  } catch (error) {
    console.error('\n💥 MIGRAÇÃO FALHOU:', error);
    process.exit(1);
  }
};

/**
 * Executar rollback (reverter mudanças)
 */
const runRollback = async () => {
  console.log('🔄 EXECUTANDO ROLLBACK...');
  console.log('========================');

  try {
    await connectDatabase();

    // Reverter status dos produtos
    console.log('\n🔄 Revertendo status dos produtos...');
    await Product.updateMany(
      { status: 'LOCADO' },
      { status: 'stored' }
    );
    await Product.updateMany(
      { status: 'AGUARDANDO_RETIRADA' },
      { status: 'reserved' }
    );
    await Product.updateMany(
      { status: 'REMOVIDO' },
      { status: 'removed' }
    );
    await Product.updateMany(
      { status: 'AGUARDANDO_LOCACAO' },
      { status: 'stored' }
    );

    // Reverter roles dos usuários
    console.log('🔄 Revertendo roles dos usuários...');
    await User.updateMany(
      { role: 'ADMIN' },
      { role: 'admin' }
    );
    await User.updateMany(
      { role: 'OPERATOR' },
      { role: 'operator' }
    );

    console.log('✅ Rollback concluído');

  } catch (error) {
    console.error('❌ Erro no rollback:', error);
  }
};

// Executar baseado no argumento da linha de comando
const command = process.argv[2];

if (command === 'rollback') {
  runRollback().then(() => process.exit(0));
} else if (command === 'verify') {
  connectDatabase().then(() => verifyMigration()).then(() => process.exit(0));
} else {
  runMigration().then(() => process.exit(0));
}

module.exports = {
  migrateProducts,
  migrateUsers,
  verifyMigration,
  createDefaultAdmin
};