const mongoose = require('mongoose');
const Product = require('./src/models/Product');
const Location = require('./src/models/Location');

mongoose.connect('mongodb://localhost:27017/sistema-sementes-test')
  .then(async () => {
    console.log('🔍 Verificando dados existentes...');
    
    const products = await Product.find().populate('locationId');
    const locations = await Location.find();
    const occupiedLocations = await Location.find({ isOccupied: true });
    
    console.log('📊 Status atual do banco:');
    console.log('• Total de produtos:', products.length);
    console.log('• Total de localizações:', locations.length);
    console.log('• Localizações ocupadas:', occupiedLocations.length);
    
    if (products.length > 0) {
      console.log('\n🔴 Produtos encontrados:');
      products.slice(0, 3).forEach(p => {
        console.log('- Nome:', p.name, '| Localização:', p.locationId?.code || 'Sem localização');
      });
    }
    
    if (occupiedLocations.length > 0) {
      console.log('\n🟡 Localizações ocupadas:');
      occupiedLocations.slice(0, 5).forEach(loc => {
        console.log('- Código:', loc.code, '| Ocupada:', loc.isOccupied, '| Peso atual:', loc.currentWeightKg);
      });
    }
    
    mongoose.disconnect();
  })
  .catch(err => console.error('❌ Erro:', err.message)); 