const mongoose = require('mongoose');
const User = require('../src/models/User');
const Chamber = require('../src/models/Chamber');

async function quickCheck() {
  try {
    await mongoose.connect('mongodb://localhost:27017/mega-safra-01');
    console.log('✅ Conectado ao banco mega-safra-01');
    
    const userCount = await User.countDocuments();
    const adminCount = await User.countDocuments({ role: 'admin' });
    const chamberCount = await Chamber.countDocuments();
    
    console.log('👥 Users total:', userCount);
    console.log('👤 Admins:', adminCount);
    console.log('🏭 Chambers:', chamberCount);
    
    if (adminCount > 0) {
      const admin = await User.findOne({ role: 'admin' });
      console.log('🔍 Admin encontrado:', admin.name, admin.email, 'Ativo:', admin.isActive);
    }
    
    if (chamberCount > 0) {
      const chamber = await Chamber.findOne();
      console.log('🔍 Chamber encontrada:', chamber.name, 'Status:', chamber.status);
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

quickCheck(); 