const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/camara-refrigerada')
  .then(() => console.log('✅ Conectado ao MongoDB'))
  .catch(err => console.error('❌ Erro ao conectar:', err));

// Import models
const Chamber = require('./src/models/Chamber');
const Location = require('./src/models/Location');

async function debugCorrelation() {
  try {
    console.log('🔍 Investigando correlação Câmara x Localização...\n');
    
    // 1. Buscar câmaras
    console.log('1️⃣ CÂMARAS BRUTAS:');
    const chambersRaw = await Chamber.find({});
    chambersRaw.forEach((chamber, i) => {
      console.log(`   Câmara ${i + 1}:`);
      console.log(`     _id: ${chamber._id}`);
      console.log(`     id: ${chamber.id}`);
      console.log(`     name: ${chamber.name}`);
      console.log('');
    });
    
    // 2. Buscar localizações
    console.log('2️⃣ LOCALIZAÇÕES BRUTAS:');
    const locationsRaw = await Location.find({}).limit(5);
    locationsRaw.forEach((location, i) => {
      console.log(`   Localização ${i + 1}:`);
      console.log(`     _id: ${location._id}`);
      console.log(`     id: ${location.id}`);
      console.log(`     code: ${location.code}`);
      console.log(`     chamberId: ${location.chamberId}`);
      console.log(`     chamberId type: ${typeof location.chamberId}`);
      console.log('');
    });
    
    // 3. Testar correlação manual
    console.log('3️⃣ TESTE DE CORRELAÇÃO:');
    if (chambersRaw.length > 0 && locationsRaw.length > 0) {
      const firstChamber = chambersRaw[0];
      const chamberIdStr = firstChamber._id.toString();
      
      console.log(`   Câmara ID (string): ${chamberIdStr}`);
      
      const matchingLocations = await Location.find({ 
        chamberId: firstChamber._id 
      });
      
      console.log(`   Localizações encontradas: ${matchingLocations.length}`);
      
      if (matchingLocations.length > 0) {
        console.log('   ✅ Correlação funcionando!');
      } else {
        console.log('   ❌ Correlação quebrada!');
        
        // Tentar diferentes tipos de consulta
        const byStringId = await Location.find({ 
          chamberId: chamberIdStr 
        });
        console.log(`   Teste com string ID: ${byStringId.length}`);
        
        const byObjectId = await Location.find({ 
          chamberId: new mongoose.Types.ObjectId(chamberIdStr)
        });
        console.log(`   Teste com ObjectId: ${byObjectId.length}`);
      }
    }
    
    // 4. Testar com população
    console.log('\n4️⃣ TESTE COM POPULATE:');
    const locationsWithChamber = await Location.find({})
      .populate('chamberId', 'name')
      .limit(3);
      
    locationsWithChamber.forEach((location, i) => {
      console.log(`   Localização ${i + 1}:`);
      console.log(`     code: ${location.code}`);
      console.log(`     chamberId: ${location.chamberId}`);
      console.log(`     chamber populated: ${location.chamberId?.name || 'ERRO'}`);
      console.log('');
    });
    
    // 5. Simulação da consulta do frontend
    console.log('5️⃣ SIMULAÇÃO DO FRONTEND:');
    
    // Como o frontend busca câmaras
    const chambersForFrontend = await Chamber.find({});
    console.log(`   Câmaras para frontend: ${chambersForFrontend.length}`);
    
    // Como o frontend busca localizações
    const locationsForFrontend = await Location.find({ isOccupied: false });
    console.log(`   Localizações disponíveis: ${locationsForFrontend.length}`);
    
    // Teste de mapeamento
    if (chambersForFrontend.length > 0 && locationsForFrontend.length > 0) {
      const firstChamber = chambersForFrontend[0];
      const mappedLocations = locationsForFrontend.map(location => {
        const chamber = chambersForFrontend.find(c => 
          c._id.toString() === location.chamberId.toString()
        );
        
        return {
          ...location.toObject(),
          chamber: chamber ? { 
            id: chamber._id.toString(), 
            name: chamber.name 
          } : null
        };
      });
      
      const withChamber = mappedLocations.filter(loc => loc.chamber !== null);
      console.log(`   Localizações com câmara mapeada: ${withChamber.length}`);
      
      if (withChamber.length > 0) {
        console.log('   ✅ Mapeamento funcionando!');
        console.log(`   Exemplo: ${withChamber[0].code} -> ${withChamber[0].chamber.name}`);
      } else {
        console.log('   ❌ Mapeamento quebrado!');
      }
    }
    
  } catch (error) {
    console.error('❌ Erro:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Conexão fechada');
  }
}

debugCorrelation(); 