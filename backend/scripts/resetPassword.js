/**
 * Script para redefinir senha de usuário
 * Execute: node scripts/resetPassword.js email@exemplo.com novaSenha
 */

require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../src/models/User');

/**
 * Função para redefinir senha
 */
async function resetPassword(email, newPassword) {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    
    // Conectar ao MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado ao MongoDB com sucesso!');
    
    // Buscar usuário
    const user = await User.findByEmail(email);
    
    if (!user) {
      console.log(`❌ Usuário com email '${email}' não encontrado!`);
      return;
    }
    
    console.log(`👤 Usuário encontrado: ${user.name} (${user.role})`);
    console.log('🔄 Alterando senha...');
    
    // Alterar senha
    user.password = newPassword;
    await user.save();
    
    console.log('✅ Senha alterada com sucesso!');
    console.log('\n📋 INFORMAÇÕES DE ACESSO:');
    console.log(`   📧 Email: ${user.email}`);
    console.log(`   👤 Nome: ${user.name}`);
    console.log(`   🔐 Role: ${user.role}`);
    console.log(`   🔑 Nova Senha: ${newPassword}`);
    console.log('\n⚠️  IMPORTANTE:');
    console.log('   🔴 Mantenha a nova senha em local seguro!');
    console.log('   🔴 Considere alterar a senha novamente após o login!');
    
  } catch (error) {
    console.error('❌ Erro ao redefinir senha:', error.message);
    
    if (error.name === 'ValidationError') {
      console.log('\n📝 Detalhes dos erros de validação:');
      Object.keys(error.errors).forEach(key => {
        console.log(`   • ${key}: ${error.errors[key].message}`);
      });
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
 * Função para listar usuários
 */
async function listUsers() {
  try {
    console.log('🔗 Conectando ao MongoDB...');
    
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    
    console.log('✅ Conectado ao MongoDB com sucesso!');
    
    const users = await User.find({}, 'name email role isActive createdAt').sort({ createdAt: -1 });
    
    if (users.length === 0) {
      console.log('📋 Nenhum usuário encontrado no sistema.');
      return;
    }
    
    console.log(`\n📋 USUÁRIOS NO SISTEMA (${users.length} encontrado(s)):`);
    console.log('='.repeat(60));
    
    users.forEach((user, index) => {
      const status = user.isActive ? '🟢 Ativo' : '🔴 Inativo';
      const roleIcon = user.role === 'admin' ? '👑' : user.role === 'operator' ? '⚙️' : '👁️';
      
      console.log(`\n${index + 1}. ${roleIcon} ${user.name}`);
      console.log(`   📧 Email: ${user.email}`);
      console.log(`   🔐 Role: ${user.role}`);
      console.log(`   ${status}`);
      console.log(`   📅 Criado: ${user.createdAt.toLocaleDateString('pt-BR')}`);
    });
    
  } catch (error) {
    console.error('❌ Erro ao listar usuários:', error.message);
  } finally {
    await mongoose.connection.close();
    process.exit(0);
  }
}

/**
 * Função principal
 */
function main() {
  const args = process.argv.slice(2);
  
  console.log('🔑 SCRIPT DE REDEFINIÇÃO DE SENHA');
  console.log('================================\n');
  
  if (args.length === 0 || args[0] === 'list') {
    listUsers();
    return;
  }
  
  if (args.length !== 2) {
    console.log('❌ Uso incorreto do script!\n');
    console.log('📝 Para redefinir senha:');
    console.log('   node scripts/resetPassword.js email@exemplo.com novaSenha\n');
    console.log('📝 Para listar usuários:');
    console.log('   node scripts/resetPassword.js list\n');
    console.log('💡 Exemplos:');
    console.log('   node scripts/resetPassword.js admin@sistema-sementes.com novasenha123');
    console.log('   node scripts/resetPassword.js list');
    process.exit(1);
  }
  
  const [email, newPassword] = args;
  
  // Validações básicas
  if (!email.includes('@')) {
    console.log('❌ Email inválido!');
    process.exit(1);
  }
  
  if (newPassword.length < 6) {
    console.log('❌ A senha deve ter pelo menos 6 caracteres!');
    process.exit(1);
  }
  
  resetPassword(email, newPassword);
}

if (require.main === module) {
  main();
}

module.exports = { resetPassword, listUsers }; 