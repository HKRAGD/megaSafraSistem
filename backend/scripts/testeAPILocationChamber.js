#!/usr/bin/env node

/**
 * Teste da API de Localizações com Informações de Câmara
 * Sistema de Gerenciamento de Câmaras Refrigeradas
 * 
 * Este script testa se as APIs estão retornando as informações
 * de câmara nas localizações corretamente
 */

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

const testarAPILocationChamber = async () => {
  console.log('\n🔍 TESTE: API de Localizações com Informações de Câmara');
  console.log('=' .repeat(60));

  try {
    // 1. Fazer login
    console.log('\n1️⃣ Fazendo login...');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: 'admin@sistema-sementes.com',
      password: 'admin123456'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso');

    const headers = { Authorization: `Bearer ${token}` };

    // 2. Testar GET /api/chambers
    console.log('\n2️⃣ Testando GET /api/chambers...');
    const chambersResponse = await axios.get(`${API_BASE_URL}/chambers`, { headers });
    
    const chambersData = chambersResponse.data.data;
    const chambers = chambersData.chambers || [];
    
    console.log(`✅ ${chambers.length} câmaras encontradas`);
    if (chambers.length > 0) {
      const chamber = chambers[0];
      console.log(`   Primeira câmara: "${chamber.name}" (ID: ${chamber._id})`);
    }

    // 3. Testar GET /api/locations
    console.log('\n3️⃣ Testando GET /api/locations...');
    const locationsResponse = await axios.get(`${API_BASE_URL}/locations?limit=5`, { headers });
    
    const locationsData = locationsResponse.data.data;
    const locations = locationsData.locations || [];
    
    console.log(`✅ ${locations.length} localizações encontradas`);
    
    if (locations.length > 0) {
      const location = locations[0];
      console.log(`   Primeira localização: ${location.code}`);
      console.log(`   chamberId: ${location.chamberId}`);
      
      // Verificar se chamberId é um objeto ou string
      if (typeof location.chamberId === 'object') {
        console.log(`   ✅ chamberId é um objeto populado:`, location.chamberId);
      } else {
        console.log(`   ⚠️  chamberId é apenas uma string: ${location.chamberId}`);
      }
    }

    // 4. Testar GET /api/locations/available
    console.log('\n4️⃣ Testando GET /api/locations/available...');
    const availableResponse = await axios.get(`${API_BASE_URL}/locations/available?limit=3`, { headers });
    
    const availableData = availableResponse.data.data;
    const availableLocations = availableData.locations || [];
    
    console.log(`✅ ${availableLocations.length} localizações disponíveis encontradas`);
    
    if (availableLocations.length > 0) {
      const location = availableLocations[0];
      console.log(`   Primeira localização disponível: ${location.code}`);
      console.log(`   chamberId: ${location.chamberId}`);
      
      // Verificar se chamberId é um objeto ou string
      if (typeof location.chamberId === 'object') {
        console.log(`   ✅ chamberId é um objeto populado:`, location.chamberId);
        console.log(`   Nome da câmara: ${location.chamberId.name}`);
      } else {
        console.log(`   ⚠️  chamberId é apenas uma string: ${location.chamberId}`);
      }
    }

    // 5. Testar GET /api/locations/chamber/:chamberId (se temos câmaras)
    if (chambers.length > 0) {
      const chamberId = chambers[0]._id;
      console.log(`\n5️⃣ Testando GET /api/locations/chamber/${chamberId}...`);
      
      const chamberLocationsResponse = await axios.get(`${API_BASE_URL}/locations/chamber/${chamberId}?limit=3`, { headers });
      
      const chamberLocationsData = chamberLocationsResponse.data.data;
      const chamberLocations = chamberLocationsData.locations || [];
      
      console.log(`✅ ${chamberLocations.length} localizações da câmara encontradas`);
      
      if (chamberLocations.length > 0) {
        const location = chamberLocations[0];
        console.log(`   Primeira localização da câmara: ${location.code}`);
        console.log(`   chamberId: ${location.chamberId}`);
        
        // Verificar se chamberId é um objeto ou string
        if (typeof location.chamberId === 'object') {
          console.log(`   ✅ chamberId é um objeto populado:`, location.chamberId);
          console.log(`   Nome da câmara: ${location.chamberId.name}`);
        } else {
          console.log(`   ⚠️  chamberId é apenas uma string: ${location.chamberId}`);
        }
      }
    }

    // 6. Análise dos dados para o frontend
    console.log('\n6️⃣ ANÁLISE PARA O FRONTEND:');
    
    if (availableLocations.length > 0) {
      const location = availableLocations[0];
      
      console.log('Estrutura da localização retornada pela API:');
      console.log(JSON.stringify({
        id: location._id,
        chamberId: location.chamberId,
        code: location.code,
        coordinates: location.coordinates,
        isOccupied: location.isOccupied,
        maxCapacityKg: location.maxCapacityKg,
        currentWeightKg: location.currentWeightKg
      }, null, 2));
      
      // Verificar se precisa de conversão
      if (typeof location.chamberId === 'string') {
        console.log('\n⚠️  PROBLEMA IDENTIFICADO:');
        console.log('   - A API está retornando chamberId como string');
        console.log('   - O frontend precisa das informações da câmara');
        console.log('   - É necessário poplar as informações ou fazer conversão');
        
        // Sugerir solução
        console.log('\n💡 SOLUÇÕES POSSÍVEIS:');
        console.log('   1. Modificar a API para sempre retornar chamberId populado');
        console.log('   2. Criar um hook que converte os dados no frontend');
        console.log('   3. Usar o endpoint específico que já popula os dados');
      } else {
        console.log('\n✅ ESTRUTURA CORRETA:');
        console.log('   - A API está retornando chamberId populado');
        console.log('   - O frontend deve funcionar corretamente');
      }
    }

    // 7. Teste de correlação
    console.log('\n7️⃣ TESTE DE CORRELAÇÃO:');
    
    const allChamberIds = chambers.map(c => c._id);
    const allLocationChamberIds = locations.map(l => typeof l.chamberId === 'string' ? l.chamberId : l.chamberId._id);
    
    console.log(`IDs de câmaras: [${allChamberIds.join(', ')}]`);
    console.log(`IDs de câmaras nas localizações: [${[...new Set(allLocationChamberIds)].join(', ')}]`);
    
    const orphanIds = allLocationChamberIds.filter(id => !allChamberIds.includes(id));
    
    if (orphanIds.length === 0) {
      console.log('✅ Todas as localizações têm câmaras válidas');
    } else {
      console.log(`❌ ${orphanIds.length} IDs órfãos encontrados: [${orphanIds.join(', ')}]`);
    }

  } catch (error) {
    console.error('❌ Erro durante o teste:', error.response?.data?.message || error.message);
    
    if (error.response?.status === 401) {
      console.log('   💡 Verifique se o usuário admin@sistema-sementes.com existe e a senha está correta');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   💡 Verifique se o servidor backend está rodando na porta 3001');
    }
  }
};

const main = async () => {
  await testarAPILocationChamber();
  console.log('\n✅ Teste concluído!');
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testarAPILocationChamber }; 