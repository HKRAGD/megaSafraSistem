/**
 * Script para criar usuário administrador inicial
 * Execute: node scripts/createAdmin.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

// Configuração do usuário admin
const ADMIN_CONFIG = {
  name: 'Administrador Sistema',
  email: 'admin@sistema-sementes.com',
  password: 'admin123456', // ALTERE ESTA SENHA APÓS O PRIMEIRO LOGIN!
  role: 'ADMIN'
};

/**
 * Função principal para criar admin
 */
async function createAdminUser() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB - usar banco de produção
    const mongoUri = "mongodb://mongo:LNRONlHSRBOrWmtnGRPYffZFzdgJMzHp@switchback.proxy.rlwy.net:25486/mega-safra-01";
    if (!mongoUri) {
      throw new Error('MONGODB_URI não configurado no .env');
    }
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado ao MongoDB com sucesso!');
    
    // Verificar se já existe um admin
    const existingAdmin = await User.findOne({ role: 'ADMIN' });
    
    if (existingAdmin) {
      console.log('⚠️  Já existe um usuário administrador no sistema:');
      console.log(`   📧 Email: ${existingAdmin.email}`);
      console.log(`   👤 Nome: ${existingAdmin.name}`);
      console.log(`   📅 Criado em: ${existingAdmin.createdAt}`);
      console.log('\n💡 Se você esqueceu a senha, use o script resetPassword.js');
      return;
    }
    
    // Verificar se já existe usuário com este email
    const existingUser = await User.findByEmail(ADMIN_CONFIG.email);
    
    if (existingUser) {
      console.log('❌ Já existe um usuário com este email no sistema!');
      console.log(`   📧 Email: ${existingUser.email}`);
      console.log(`   👤 Nome: ${existingUser.name}`);
      console.log(`   🔐 Role: ${existingUser.role}`);
      
      // Se for operator, promover para admin
      if (existingUser.role !== 'ADMIN') {
        console.log('\n🔄 Promovendo usuário existente para administrador...');
        existingUser.role = 'ADMIN';
        await existingUser.save();
        
        console.log('✅ Usuário promovido para administrador com sucesso!');
        console.log('\n📋 INFORMAÇÕES DE ACESSO:');
        console.log(`   📧 Email: ${existingUser.email}`);
        console.log(`   👤 Nome: ${existingUser.name}`);
        console.log(`   🔐 Role: ${existingUser.role}`);
        console.log(`   🔑 Senha: (use a senha atual do usuário)`);
      }
      
      return;
    }
    
    console.log('👤 Criando usuário administrador...');
    
    // Criar usuário admin
    const adminUser = await User.create(ADMIN_CONFIG);
    
    console.log('✅ Usuário administrador criado com sucesso!');
    console.log('\n📋 INFORMAÇÕES DE ACESSO:');
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   👤 Nome: ${adminUser.name}`);
    console.log(`   🔐 Role: ${adminUser.role}`);
    console.log(`   🔑 Senha: ${ADMIN_CONFIG.password}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   🔴 ALTERE A SENHA APÓS O PRIMEIRO LOGIN!');
    console.log('   🔴 Mantenha essas credenciais em local seguro!');
    console.log('\n🌐 Para acessar o sistema:');
    console.log(`   🔗 Backend: ${mongoUri.includes('localhost') ? 'http://localhost:3001' : 'https://megasafrasistem-megasafra.up.railway.app'}`);
    console.log(`   🔗 Frontend: ${mongoUri.includes('localhost') ? 'http://localhost:3000' : 'https://mega-safra-sistem.vercel.app'}`);
    console.log('   📝 Use as credenciais acima para fazer login no sistema');
    
  } catch (error) {
    console.error('❌ Erro ao criar usuário administrador:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('\n📝 Detalhes dos erros de validação:');
      Object.keys(error.errors).forEach(key => {
        console.log(`   • ${key}: ${error.errors[key].message}`);
      });
    }
    
    if (error.code === 11000) {
      console.log('   • Email já existe no sistema');
    }
    
  } finally {
    // Fechar conexão
    console.log('\n🔌 Fechando conexão com MongoDB...');
    await mongoose.connection.close();
    console.log('✅ Conexão fechada.');
    process.exit(0);
  }
}

/**
 * Verificar se o script está sendo executado diretamente
 */
if (require.main === module) {
  console.log('🌱 SCRIPT DE CRIAÇÃO DE USUÁRIO ADMINISTRADOR');
  console.log('==========================================\n');
  
  createAdminUser();
}

module.exports = { createAdminUser, ADMIN_CONFIG }; 