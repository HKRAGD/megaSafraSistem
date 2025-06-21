const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const uri = process.env.NODE_ENV === 'development' 
      ? process.env.MONGODB_TEST_URI 
      : process.env.MONGODB_URI;

    if (!uri) {
      console.error('❌ ERRO CRÍTICO: MONGODB_URI não definida nas variáveis de ambiente.');
      console.error('💡 O sistema não pode operar sem banco de dados. Configure MONGODB_URI e reinicie.');
      
      // Em produção, falhar imediatamente é a opção mais segura
      if (process.env.NODE_ENV === 'production') {
        console.error('🚨 SAINDO: Sistema não pode iniciar sem banco de dados em produção.');
        process.exit(1);
      }
      
      // Em desenvolvimento/test, também falhar mas com mensagem mais clara
      throw new Error('Database URI não configurada - sistema não pode operar sem banco de dados');
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
    console.error('❌ ERRO FATAL ao conectar no MongoDB:', error.message);
    
    // Em produção, qualquer falha de conexão deve parar o sistema
    if (process.env.NODE_ENV === 'production') {
      console.error('🚨 SAINDO: Falha na conexão com banco de dados em produção.');
      process.exit(1);
    }
    
    // Em desenvolvimento/test, re-throw o erro para parar a aplicação
    console.error('🚨 Sistema não pode continuar sem banco de dados.');
    throw error;
  }
};

// Função para limpar database (PERIGOSA - APENAS para testes)
const clearDatabase = async () => {
  // PROTEÇÃO CRÍTICA: Apenas em ambiente de teste
  if (process.env.NODE_ENV !== 'test') {
    throw new Error(`clearDatabase() só permitida em NODE_ENV=test. Atual: ${process.env.NODE_ENV}`);
  }
  
  console.warn('⚠️ ATENÇÃO: Limpando todas as collections do banco de dados (TEST MODE)');
  
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// Função para fechar conexão (PERIGOSA - só para testes e desenvolvimento)
const closeDatabase = async () => {
  // PROTEÇÃO CRÍTICA: Nunca permitir em produção
  if (process.env.NODE_ENV === 'production') {
    throw new Error('closeDatabase() não permitida em produção - operação destrutiva bloqueada');
  }
  
  // Aviso em desenvolvimento
  console.warn('⚠️ ATENÇÃO: Executando operação destrutiva closeDatabase()');
  
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
};

module.exports = {
  connectDB,
  clearDatabase,
  closeDatabase
}; 