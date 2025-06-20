const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camara-refrigerada')
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

// Import the User model
const User = require('./src/models/User');

async function getUserCredentials() {
  try {
    console.log('🔍 Buscando usuários no sistema...\n');
    
    const users = await User.find({}).select('name email role isActive');
    
    if (users.length === 0) {
      console.log('❌ Nenhum usuário encontrado!');
      console.log('🔧 Criando usuário admin padrão...');
      
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash('admin123456', 12);
      
      const adminUser = new User({
        name: 'Administrador',
        email: 'admin@test.com',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      
      await adminUser.save();
      console.log('✅ Usuário admin criado com sucesso!');
      console.log('📧 Email: admin@test.com');
      console.log('🔑 Senha: admin123');
      
    } else {
      console.log(`✅ ${users.length} usuário(s) encontrado(s):\n`);
      
      users.forEach((user, index) => {
        console.log(`👤 Usuário ${index + 1}:`);
        console.log(`   Nome: ${user.name}`);
        console.log(`   Email: ${user.email}`);
        console.log(`   Role: ${user.role}`);
        console.log(`   Ativo: ${user.isActive ? 'Sim' : 'Não'}`);
        console.log('');
      });
      
      console.log('🔑 Para testar o frontend, use as credenciais acima.');
      console.log('💡 Se não souber a senha, ela provavelmente é: admin123');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    mongoose.connection.close();
    console.log('🔌 Conexão fechada');
  }
}

getUserCredentials(); 