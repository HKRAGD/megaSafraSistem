const mongoose = require('mongoose');
const Chamber = require('../src/models/Chamber');
const Location = require('../src/models/Location');
const Product = require('../src/models/Product');

// Conectar ao MongoDB
mongoose.connect('mongodb://localhost:27017/sistema-sementes-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

const debugLocationMap3D = async () => {
  try {
    console.log('\n🔍 DEBUG DO MAPA 3D - INVESTIGANDO LOCALIZAÇÕES CINZAS\n');

    // 1. Buscar todas as câmaras
    console.log('1️⃣ CÂMARAS NO SISTEMA:');
    const chambers = await Chamber.find({ status: 'active' }).sort({ createdAt: 1 });
    
    for (const chamber of chambers) {
      console.log(`📦 ${chamber.name}:`);
      console.log(`   ID: ${chamber._id}`);
      console.log(`   Dimensões: ${chamber.dimensions.quadras}x${chamber.dimensions.lados}x${chamber.dimensions.filas}x${chamber.dimensions.andares}`);
      console.log(`   Total localizações: ${chamber.dimensions.quadras * chamber.dimensions.lados * chamber.dimensions.filas * chamber.dimensions.andares}`);
      console.log('');
    }

    // 2. Para cada câmara, verificar localizações
    for (const chamber of chambers) {
      console.log(`\n2️⃣ ANÁLISE DETALHADA - ${chamber.name.toUpperCase()}:`);
      
      // Buscar todas as localizações desta câmara
      const allLocations = await Location.find({ chamberId: chamber._id }).sort({ 
        'coordinates.quadra': 1,
        'coordinates.lado': 1,
        'coordinates.fila': 1,
        'coordinates.andar': 1
      });
      
      console.log(`📍 Total de localizações criadas: ${allLocations.length}`);
      
      // Verificar localizações esperadas vs criadas
      const expectedTotal = chamber.dimensions.quadras * chamber.dimensions.lados * chamber.dimensions.filas * chamber.dimensions.andares;
      console.log(`🎯 Localizações esperadas: ${expectedTotal}`);
      console.log(`⚖️ Diferença: ${expectedTotal - allLocations.length} (${allLocations.length < expectedTotal ? 'FALTANDO' : 'OK'})`);
      
      // Verificar disponibilidade
      const availableLocations = allLocations.filter(loc => !loc.isOccupied);
      const occupiedLocations = allLocations.filter(loc => loc.isOccupied);
      
      console.log(`✅ Disponíveis: ${availableLocations.length}`);
      console.log(`🔴 Ocupadas: ${occupiedLocations.length}`);
      
      // Verificar produtos
      const productsInChamber = await Product.find({ 
        locationId: { $in: allLocations.map(loc => loc._id) },
        status: 'stored'
      }).populate('locationId');
      
      console.log(`📦 Produtos armazenados: ${productsInChamber.length}`);
      
      // Analisar primeiro andar em detalhes
      console.log(`\n📋 ANÁLISE DO ANDAR 1:`);
      const firstFloorLocations = allLocations.filter(loc => loc.coordinates.andar === 1);
      console.log(`📍 Localizações no andar 1: ${firstFloorLocations.length}`);
      
      const firstFloorExpected = chamber.dimensions.quadras * chamber.dimensions.lados * chamber.dimensions.filas;
      console.log(`🎯 Esperadas no andar 1: ${firstFloorExpected}`);
      
      // Mapear grid do andar 1
      console.log(`\n🗺️ GRID DO ANDAR 1 (${chamber.name}):`);
      console.log('Legenda: ✅ = Disponível, 🔴 = Ocupada, ⚪ = Não existe');
      console.log('');
      
      for (let q = 1; q <= chamber.dimensions.quadras; q++) {
        let row = `Q${q}: `;
        for (let l = 1; l <= chamber.dimensions.lados; l++) {
          for (let f = 1; f <= chamber.dimensions.filas; f++) {
            const location = firstFloorLocations.find(loc => 
              loc.coordinates.quadra === q &&
              loc.coordinates.lado === l &&
              loc.coordinates.fila === f
            );
            
            if (!location) {
              row += '⚪ ';
            } else if (location.isOccupied) {
              row += '🔴 ';
            } else {
              row += '✅ ';
            }
          }
          row += ' | ';
        }
        console.log(row);
      }
      
      // Verificar se há localizações faltando
      const missingLocations = [];
      for (let q = 1; q <= chamber.dimensions.quadras; q++) {
        for (let l = 1; l <= chamber.dimensions.lados; l++) {
          for (let f = 1; f <= chamber.dimensions.filas; f++) {
            for (let a = 1; a <= chamber.dimensions.andares; a++) {
              const exists = allLocations.find(loc => 
                loc.coordinates.quadra === q &&
                loc.coordinates.lado === l &&
                loc.coordinates.fila === f &&
                loc.coordinates.andar === a
              );
              
              if (!exists) {
                missingLocations.push({ q, l, f, a });
              }
            }
          }
        }
      }
      
      if (missingLocations.length > 0) {
        console.log(`\n⚠️ LOCALIZAÇÕES FALTANDO (${missingLocations.length}):`);
        missingLocations.slice(0, 10).forEach(({ q, l, f, a }) => {
          console.log(`   Q${q}-L${l}-F${f}-A${a}`);
        });
        if (missingLocations.length > 10) {
          console.log(`   ... e mais ${missingLocations.length - 10} localizações`);
        }
      }
      
      console.log('\n' + '='.repeat(80));
    }

    // 3. Testar endpoint da API
    console.log('\n3️⃣ TESTANDO ENDPOINT /api/locations/available:');
    
    // Simular chamada da API
    const availableLocations = await Location.find({ isOccupied: false })
      .populate('chamberId', 'name dimensions')
      .sort({ 'coordinates.quadra': 1, 'coordinates.lado': 1, 'coordinates.fila': 1, 'coordinates.andar': 1 });
    
    console.log(`📊 Total de localizações disponíveis: ${availableLocations.length}`);
    
    // Agrupar por câmara
    const locationsByChamber = {};
    availableLocations.forEach(loc => {
      const chamberName = loc.chamberId ? loc.chamberId.name : 'Câmara desconhecida';
      if (!locationsByChamber[chamberName]) {
        locationsByChamber[chamberName] = [];
      }
      locationsByChamber[chamberName].push(loc);
    });
    
    Object.keys(locationsByChamber).forEach(chamberName => {
      const locs = locationsByChamber[chamberName];
      console.log(`📦 ${chamberName}: ${locs.length} localizações disponíveis`);
      
      // Mostrar algumas localizações de exemplo
      locs.slice(0, 5).forEach(loc => {
        console.log(`   ${loc.code} - Ocupado: ${loc.isOccupied} - Capacidade: ${loc.currentWeightKg}/${loc.maxCapacityKg}kg`);
      });
      if (locs.length > 5) {
        console.log(`   ... e mais ${locs.length - 5} localizações`);
      }
    });

    // 4. Verificar produtos órfãos
    console.log('\n4️⃣ VERIFICANDO CONSISTÊNCIA:');
    
    const allProducts = await Product.find({ status: 'stored' }).populate('locationId');
    const orphanProducts = allProducts.filter(product => !product.locationId);
    
    if (orphanProducts.length > 0) {
      console.log(`⚠️ ${orphanProducts.length} produtos sem localização encontrados!`);
    } else {
      console.log(`✅ Todos os produtos têm localização válida`);
    }
    
    // Verificar localizações inconsistentes
    const inconsistentLocations = await Location.find({
      $expr: {
        $ne: ['$isOccupied', { $gt: ['$currentWeightKg', 0] }]
      }
    });
    
    if (inconsistentLocations.length > 0) {
      console.log(`⚠️ ${inconsistentLocations.length} localizações com estado inconsistente!`);
      inconsistentLocations.forEach(loc => {
        console.log(`   ${loc.code}: isOccupied=${loc.isOccupied}, currentWeight=${loc.currentWeightKg}kg`);
      });
    } else {
      console.log(`✅ Todas as localizações têm estado consistente`);
    }

    console.log('\n✅ DEBUG COMPLETO!');
    console.log('\n💡 POSSÍVEIS CAUSAS DAS LOCALIZAÇÕES CINZAS:');
    console.log('1. Localizações não foram criadas (gerar localizações para a câmara)');
    console.log('2. Problema no filtro de localizações disponíveis');
    console.log('3. Dados inconsistentes entre isOccupied e currentWeight');
    console.log('4. Problema na API que não está populando dados da câmara');
    console.log('5. Filtro de capacidade muito restritivo no frontend');

  } catch (error) {
    console.error('❌ Erro no debug:', error);
  } finally {
    mongoose.connection.close();
  }
};

debugLocationMap3D(); 