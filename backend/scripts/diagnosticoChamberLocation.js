#!/usr/bin/env node

/**
 * Script de Diagnóstico: Correlação Câmaras x Localizações
 * Sistema de Gerenciamento de Câmaras Refrigeradas
 * 
 * Este script verifica:
 * 1. Dados das câmaras no banco
 * 2. Dados das localizações no banco
 * 3. Correlação correta entre chamberId das localizações e _id das câmaras
 * 4. Identifica problemas de correlação
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Conectar ao MongoDB
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes-test');
    console.log(`✅ MongoDB conectado: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
};

// Schema simplificado para consultas
const chamberSchema = new mongoose.Schema({
  name: String,
  dimensions: {
    quadras: Number,
    lados: Number,
    filas: Number,
    andares: Number
  },
  status: String
}, { timestamps: true });

const locationSchema = new mongoose.Schema({
  chamberId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chamber' },
  coordinates: {
    quadra: Number,
    lado: Number,
    fila: Number,
    andar: Number
  },
  code: String,
  isOccupied: Boolean,
  maxCapacityKg: Number,
  currentWeightKg: Number
}, { timestamps: true });

const Chamber = mongoose.model('Chamber', chamberSchema);
const Location = mongoose.model('Location', locationSchema);

const diagnosticar = async () => {
  console.log('\n🔍 DIAGNÓSTICO: Correlação Câmaras x Localizações');
  console.log('=' .repeat(60));

  try {
    // 1. Verificar câmaras
    console.log('\n📦 ANÁLISE DAS CÂMARAS:');
    const chambers = await Chamber.find({});
    console.log(`Total de câmaras: ${chambers.length}`);
    
    if (chambers.length === 0) {
      console.log('❌ Nenhuma câmara encontrada no banco!');
      return;
    }

    chambers.forEach((chamber, index) => {
      console.log(`\n${index + 1}. Câmara: "${chamber.name}"`);
      console.log(`   ID: ${chamber._id}`);
      console.log(`   Dimensões: ${chamber.dimensions.quadras}x${chamber.dimensions.lados}x${chamber.dimensions.filas}x${chamber.dimensions.andares}`);
      console.log(`   Total teórico de localizações: ${chamber.dimensions.quadras * chamber.dimensions.lados * chamber.dimensions.filas * chamber.dimensions.andares}`);
      console.log(`   Status: ${chamber.status}`);
    });

    // 2. Verificar localizações
    console.log('\n📍 ANÁLISE DAS LOCALIZAÇÕES:');
    const locations = await Location.find({});
    console.log(`Total de localizações: ${locations.length}`);

    if (locations.length === 0) {
      console.log('❌ Nenhuma localização encontrada no banco!');
      return;
    }

    // 3. Agrupar localizações por chamberId
    console.log('\n🔗 CORRELAÇÃO POR CÂMARA:');
    const locationsByChamber = {};
    const idsNaoEncontrados = new Set();

    locations.forEach(location => {
      const chamberIdStr = location.chamberId.toString();
      if (!locationsByChamber[chamberIdStr]) {
        locationsByChamber[chamberIdStr] = [];
      }
      locationsByChamber[chamberIdStr].push(location);
    });

    for (const [chamberIdStr, locs] of Object.entries(locationsByChamber)) {
      const chamber = chambers.find(c => c._id.toString() === chamberIdStr);
      
      if (chamber) {
        console.log(`\n✅ Câmara "${chamber.name}" (${chamber._id})`);
        console.log(`   Localizações relacionadas: ${locs.length}`);
        console.log(`   Ocupadas: ${locs.filter(l => l.isOccupied).length}`);
        console.log(`   Disponíveis: ${locs.filter(l => !l.isOccupied).length}`);
        
        // Verificar se o número bate com as dimensões
        const teorico = chamber.dimensions.quadras * chamber.dimensions.lados * chamber.dimensions.filas * chamber.dimensions.andares;
        if (locs.length === teorico) {
          console.log(`   ✅ Número correto de localizações (${locs.length}/${teorico})`);
        } else {
          console.log(`   ⚠️  Número incorreto de localizações (${locs.length}/${teorico})`);
        }
        
        // Mostrar algumas localizações como exemplo
        console.log(`   Exemplos: ${locs.slice(0, 3).map(l => l.code).join(', ')}${locs.length > 3 ? '...' : ''}`);
      } else {
        console.log(`\n❌ ID de câmara não encontrado: ${chamberIdStr}`);
        console.log(`   ${locs.length} localizações órfãs`);
        idsNaoEncontrados.add(chamberIdStr);
      }
    }

    // 4. Verificar IDs órfãos
    if (idsNaoEncontrados.size > 0) {
      console.log('\n🚨 PROBLEMAS ENCONTRADOS:');
      console.log(`${idsNaoEncontrados.size} IDs de câmara não encontrados:`);
      idsNaoEncontrados.forEach(id => {
        const count = locationsByChamber[id].length;
        console.log(`   - ${id} (${count} localizações órfãs)`);
      });
    }

    // 5. Verificar localizações com problemas
    console.log('\n🔍 VERIFICAÇÃO DETALHADA:');
    
    // Localizações populadas
    const locationsPopulated = await Location.find({}).populate('chamberId');
    const locationsComChamber = locationsPopulated.filter(loc => loc.chamberId);
    const locationsSemChamber = locationsPopulated.filter(loc => !loc.chamberId);
    
    console.log(`Localizações com câmara válida: ${locationsComChamber.length}`);
    console.log(`Localizações com câmara nula/inválida: ${locationsSemChamber.length}`);

    if (locationsSemChamber.length > 0) {
      console.log('\n❌ Localizações com problemas:');
      locationsSemChamber.slice(0, 5).forEach(loc => {
        console.log(`   - ${loc.code} (chamberId: ${loc.chamberId})`);
      });
    }

    // 6. Teste da API do frontend
    console.log('\n🌐 TESTE DE INTEGRAÇÃO COM FRONTEND:');
    const axios = require('axios');
    
    try {
      // Login
      console.log('Fazendo login...');
      const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
        email: 'admin@sistema-sementes.com',
        password: 'admin123456'
      });
      
      const token = loginResponse.data.data.accessToken;
      console.log('✅ Login realizado com sucesso');

      // Buscar câmaras
      console.log('Buscando câmaras via API...');
      const chambersResponse = await axios.get('http://localhost:3001/api/chambers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const chambersAPI = chambersResponse.data.data || chambersResponse.data;
      console.log(`✅ ${chambersAPI.length} câmaras encontradas via API`);

      // Buscar localizações
      console.log('Buscando localizações via API...');
      const locationsResponse = await axios.get('http://localhost:3001/api/locations', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const locationsAPI = locationsResponse.data.data || locationsResponse.data;
      console.log(`✅ ${locationsAPI.length} localizações encontradas via API`);

      // Buscar localizações disponíveis
      console.log('Buscando localizações disponíveis via API...');
      const availableResponse = await axios.get('http://localhost:3001/api/locations/available', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const availableAPI = availableResponse.data.data || availableResponse.data;
      console.log(`✅ ${availableAPI.length} localizações disponíveis via API`);

      // Teste específico: buscar localizações por câmara
      if (chambersAPI.length > 0) {
        const firstChamber = chambersAPI[0];
        console.log(`\nTestando localizações para câmara "${firstChamber.name}" (${firstChamber.id})...`);
        
        const chamberLocsResponse = await axios.get(`http://localhost:3001/api/locations/chamber/${firstChamber.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const chamberLocs = chamberLocsResponse.data.data || chamberLocsResponse.data;
        console.log(`✅ ${chamberLocs.length} localizações encontradas para esta câmara`);
        
        if (chamberLocs.length > 0) {
          console.log(`   Exemplos: ${chamberLocs.slice(0, 3).map(l => l.code).join(', ')}`);
        }
      }

    } catch (apiError) {
      console.log('❌ Erro na API:', apiError.response?.data?.message || apiError.message);
    }

    // 7. Resumo final
    console.log('\n📊 RESUMO FINAL:');
    console.log(`Total de câmaras: ${chambers.length}`);
    console.log(`Total de localizações: ${locations.length}`);
    console.log(`Localizações com câmara válida: ${locationsComChamber.length}`);
    console.log(`Localizações órfãs: ${locationsSemChamber.length}`);
    
    if (idsNaoEncontrados.size === 0 && locationsSemChamber.length === 0) {
      console.log('\n🎉 DIAGNÓSTICO: Sistema funcionando corretamente!');
    } else {
      console.log('\n⚠️  DIAGNÓSTICO: Problemas encontrados na correlação!');
    }

  } catch (error) {
    console.error('❌ Erro durante o diagnóstico:', error.message);
    console.error(error.stack);
  }
};

const main = async () => {
  await connectDB();
  await diagnosticar();
  await mongoose.disconnect();
  console.log('\n✅ Diagnóstico concluído!');
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { diagnosticar }; 