const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camara-refrigerada')
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

// Import the User model
const User = require('./src/models/User');

async function createTestUser() {
  try {
    console.log('🔧 Criando usuário de teste...\n');
    
    // Verificar se o usuário já existe
    const existingUser = await User.findOne({ email: 'admin@test.com' });
    
    if (existingUser) {
      console.log('⚠️ Usuário admin@test.com já existe!');
      console.log('🗑️ Removendo usuário existente...');
      await User.deleteOne({ email: 'admin@test.com' });
    }
    
    // Hash da senha
    const hashedPassword = await bcrypt.hash('admin123', 12);
    
    // Criar novo usuário
    const adminUser = new User({
      name: 'Admin Teste',
      email: 'admin@test.com',
      password: hashedPassword,
      role: 'admin',
      isActive: true
    });
    
    await adminUser.save();
    
    console.log('✅ Usuário de teste criado com sucesso!');
    console.log('📧 Email: admin@test.com');
    console.log('🔑 Senha: admin123');
    console.log('👑 Role: admin');
    
    // Verificar se foi criado corretamente
    const createdUser = await User.findOne({ email: 'admin@test.com' }).select('name email role isActive');
    console.log('\n🔍 Verificação:', createdUser);
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

createTestUser(); 