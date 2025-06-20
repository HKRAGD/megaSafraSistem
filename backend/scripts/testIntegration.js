const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testIntegration() {
  console.log('🔍 Testando integração Backend/Frontend...\n');

  try {
    // 1. Testar se o servidor está rodando
    console.log('1. Testando conexão com o servidor...');
    const healthResponse = await axios.get(`${API_BASE_URL}/health`);
    console.log('✅ Servidor rodando:', healthResponse.data.message);
    
    // 2. Testar login (usar dados padrão)
    console.log('\n2. Testando login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@sistema-sementes.com',
      password: 'admin123456'
    });
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso');
    
    // Headers para requests autenticados
    const headers = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
    
    // 3. Testar câmaras
    console.log('\n3. Testando endpoint de câmaras...');
    const chambersResponse = await axios.get(`${API_BASE_URL}/chambers`, { headers });
    const chambers = chambersResponse.data.data.chambers || [];
    console.log(`✅ Câmaras encontradas: ${chambers.length}`);
    
    if (chambers.length > 0) {
      console.log('📋 Primeira câmara:', {
        id: chambers[0]._id || chambers[0].id,
        name: chambers[0].name,
        dimensions: chambers[0].dimensions
      });
    } else {
      console.log('⚠️ Nenhuma câmara encontrada! Criando uma câmara de teste...');
      
      const newChamber = await axios.post(`${API_BASE_URL}/chambers`, {
        name: 'Câmara Teste Frontend',
        description: 'Câmara criada para testar o frontend',
        dimensions: {
          quadras: 2,
          lados: 3,
          filas: 4,
          andares: 2
        }
      }, { headers });
      
      console.log('✅ Câmara criada:', newChamber.data.data.name);
      
      // Gerar localizações para a nova câmara
      const chamberId = newChamber.data.data._id || newChamber.data.data.id;
      await axios.post(`${API_BASE_URL}/chambers/${chamberId}/generate-locations`, {}, { headers });
      console.log('✅ Localizações geradas para a câmara');
    }
    
    // 4. Testar localizações
    console.log('\n4. Testando endpoint de localizações...');
    const locationsResponse = await axios.get(`${API_BASE_URL}/locations`, { headers });
    const locations = locationsResponse.data.data.locations || [];
    console.log(`✅ Localizações encontradas: ${locations.length}`);
    
    if (locations.length > 0) {
      console.log('📋 Primeira localização:', {
        id: locations[0]._id || locations[0].id,
        code: locations[0].code,
        chamberId: locations[0].chamberId,
        isOccupied: locations[0].isOccupied,
        maxCapacityKg: locations[0].maxCapacityKg
      });
    }
    
    // 5. Testar localizações disponíveis
    console.log('\n5. Testando endpoint de localizações disponíveis...');
    const availableResponse = await axios.get(`${API_BASE_URL}/locations/available`, { headers });
    const availableLocations = availableResponse.data.data.locations || [];
    console.log(`✅ Localizações disponíveis: ${availableLocations.length}`);
    
    // 6. Testar tipos de sementes
    console.log('\n6. Testando endpoint de tipos de sementes...');
    const seedTypesResponse = await axios.get(`${API_BASE_URL}/seed-types`, { headers });
    const seedTypes = seedTypesResponse.data.data.seedTypes || [];
    console.log(`✅ Tipos de sementes: ${seedTypes.length}`);
    
    if (seedTypes.length === 0) {
      console.log('⚠️ Nenhum tipo de semente encontrado! Criando tipos de teste...');
      
      const testSeedTypes = [
        { name: 'Soja Premium', description: 'Semente de soja de alta qualidade' },
        { name: 'Milho Híbrido', description: 'Semente de milho híbrido' },
        { name: 'Trigo Inverno', description: 'Semente de trigo para plantio de inverno' }
      ];
      
      for (const seedType of testSeedTypes) {
        await axios.post(`${API_BASE_URL}/seed-types`, seedType, { headers });
      }
      
      console.log('✅ Tipos de sementes criados');
    }
    
    // 7. Resumo da situação
    console.log('\n🎯 RESUMO DA INTEGRAÇÃO:');
    console.log(`✅ Câmaras: ${chambers.length > 0 ? chambers.length : '1 (criada)'}`);
    console.log(`✅ Localizações: ${locations.length}`);
    console.log(`✅ Localizações disponíveis: ${availableLocations.length}`);
    console.log(`✅ Tipos de sementes: ${seedTypes.length > 0 ? seedTypes.length : '3 (criados)'}`);
    
    console.log('\n🔧 TESTE DA CORRELAÇÃO CÂMARA-LOCALIZAÇÃO:');
    if (chambers.length > 0 && locations.length > 0) {
      const firstChamber = chambers[0];
      const chamberLocations = locations.filter(loc => loc.chamberId === (firstChamber._id || firstChamber.id));
      console.log(`📍 Câmara "${firstChamber.name}" tem ${chamberLocations.length} localizações`);
      
      if (chamberLocations.length > 0) {
        console.log('✅ Correlação funcionando corretamente!');
      } else {
        console.log('❌ PROBLEMA: Localização não está sendo correlacionada com câmara!');
      }
    }
    
    console.log('\n🎉 Teste de integração concluído!');
    
  } catch (error) {
    console.error('❌ Erro durante o teste:', error.response?.data || error.message);
  }
}

testIntegration(); 