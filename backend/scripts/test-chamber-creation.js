const mongoose = require('mongoose');
const { createChamber } = require('../src/controllers/chamberController');

async function testChamberCreation() {
  try {
    console.log('🧪 Testando criação de câmara...\n');
    
    // Conectar ao MongoDB e aguardar conexão
    console.log('🔌 Conectando ao MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes-test');
    console.log('✅ Conectado ao MongoDB\n');

    // Mock request/response objects
    const req = {
      body: {
        name: 'Câmara Teste Nova',
        description: 'Câmara de teste para debug',
        dimensions: {
          quadras: 2,
          lados: 2,
          filas: 3,
          andares: 2
        },
        generateLocations: true,
        locationOptions: {
          defaultCapacity: 1000,
          capacityVariation: true
        }
      },
      user: { 
        name: 'Admin Test',
        id: '675a0b0c1d5dfe48c2ae9f85' // ID do admin do banco
      }
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
            console.log('📝 Response Data:', JSON.stringify(data, null, 2));
            return res;
          }
        };
      }
    };

    const next = (error) => {
      if (error) {
        console.error('❌ Erro no next():', error.message);
        console.error('🔍 Stack:', error.stack);
      }
    };

    // Executar criação de câmara
    console.log('🏗️ Executando createChamber...');
    console.log('📝 Request Body:', JSON.stringify(req.body, null, 2));
    
    try {
      await createChamber(req, res, next);
    } catch (error) {
      console.error('❌ Erro durante execução:', error.message);
      console.error('🔍 Stack:', error.stack);
    }

    console.log('\n✅ Teste concluído');

  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    console.error('🔍 Stack:', error.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Desconectado do MongoDB');
  }
}

testChamberCreation(); 