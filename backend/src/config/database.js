const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.NODE_ENV === 'development' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    if (!uri) {
      console.log('⚠️  MONGODB_URI não definida - rodando sem banco de dados');
      return;
    }

    const conn = await mongoose.connect(uri, {
      // Opções recomendadas
      serverSelectionTimeoutMS: 5000, // 5 segundos
      socketTimeoutMS: 45000, // 45 segundos
      maxPoolSize: 10, // Pool máximo de conexões
      retryWrites: true,
      w: 'majority'
    });

    console.log(`🗄️  MongoDB conectado: ${conn.connection.host}`);
    console.log(`📊 Database: ${conn.connection.name}`);

    // Eventos de conexão
    mongoose.connection.on('error', (err) => {
      console.error('❌ Erro de conexão MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('🔌 MongoDB desconectado');
    });

    // Graceful close
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('🔐 Conexão MongoDB fechada devido ao encerramento da aplicação');
      process.exit(0);
    });

  } catch (error) {
    console.error('❌ Erro ao conectar no MongoDB:', error.message);
    console.log('⚠️  Continuando sem banco de dados...');
  }
};

// Função para limpar database (útil para testes)
const clearDatabase = async () => {
  if (process.env.NODE_ENV === 'test') {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      const collection = collections[key];
      await collection.deleteMany({});
    }
  }
};

// Função para fechar conexão
const closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

module.exports = {
  connectDB,
  clearDatabase,
  closeDatabase
}; 