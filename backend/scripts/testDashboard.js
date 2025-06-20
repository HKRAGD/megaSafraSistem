const mongoose = require('mongoose');
const { getChamberStatus } = require('../src/controllers/dashboardController');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testDashboard() {
  try {
    console.log('🔍 Testando dashboard - controller getChamberStatus...\n');

    // Mock request/response objects
    const req = { 
      query: {},
      user: { name: 'Admin Test' }
    };
    
    let responseData = null;
    let statusCode = null;
    
    const res = {
      status: (code) => {
        statusCode = code;
        return {
          json: (data) => {
            responseData = data;
            console.log(`📊 Status Code: ${statusCode}`);
            console.log('✅ Dados retornados:', JSON.stringify(data, null, 2));
            return res;
          }
        };
      }
    };

    // Testar getChamberStatus controller
    console.log('📊 Executando getChamberStatus controller...');
    await getChamberStatus(req, res);

  } catch (error) {
    console.error('❌ Erro no teste de dashboard:', error);
  } finally {
    mongoose.connection.close();
  }
}

testDashboard(); 