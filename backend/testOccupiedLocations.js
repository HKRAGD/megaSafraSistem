const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Location = require('./src/models/Location');

mongoose.connect('mongodb://localhost:27017/sistema-sementes')
  .then(async () => {
    console.log('🔍 Verificando dados no banco...');
    
    const products = await Product.find().populate('locationId');
    const locations = await Location.find();
    const occupiedLocations = await Location.find({ isOccupied: true });
    
    console.log('📊 Status do banco:');
    console.log('• Total de produtos:', products.length);
    console.log('• Total de localizações:', locations.length);
    console.log('• Localizações ocupadas:', occupiedLocations.length);
    
    if (occupiedLocations.length > 0) {
      console.log('🔴 Localizações ocupadas encontradas:');
      occupiedLocations.forEach(loc => {
        console.log(`  - ${loc.code}: ocupada=${loc.isOccupied}, peso=${loc.currentWeightKg}kg`);
      });
    } else {
      console.log('⚠️ Nenhuma localização ocupada - vamos criar algumas...');
      
      // Pegar algumas localizações disponíveis
      const availableLocations = await Location.find({ isOccupied: false }).limit(3);
      
      if (availableLocations.length > 0) {
        for (let loc of availableLocations) {
          loc.isOccupied = true;
          loc.currentWeightKg = Math.floor(Math.random() * 800) + 200; // 200-1000kg
          await loc.save();
          console.log(`✅ Localização ${loc.code} marcada como ocupada com ${loc.currentWeightKg}kg`);
        }
      }
    }
    
    console.log('🏁 Teste concluído!');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Erro:', err.message);
    process.exit(1);
  }); 