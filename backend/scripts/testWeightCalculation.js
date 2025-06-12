const mongoose = require('mongoose');

// Importar modelos
require('../src/models/User');
require('../src/models/SeedType');
require('../src/models/Chamber');
require('../src/models/Location');
require('../src/models/Product');
require('../src/models/Movement');

const User = mongoose.model('User');
const SeedType = mongoose.model('SeedType');
const Chamber = mongoose.model('Chamber');
const Location = mongoose.model('Location');
const Product = mongoose.model('Product');

const MONGODB_URI = 'mongodb://localhost:27017/mega-safra-01';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB - Banco: mega-safra-01');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
}

async function testWeightCalculation() {
  console.log('🧪 Testando cálculo de peso...');

  // Buscar dados necessários
  const admin = await User.findOne({ role: 'admin' });
  const seedType = await SeedType.findOne();
  const availableLocation = await Location.findOne({ isOccupied: false });

  if (!admin || !seedType || !availableLocation) {
    console.error('❌ Dados necessários não encontrados (admin, seedType ou location disponível)');
    return;
  }

  console.log('📋 Dados de teste:');
  console.log(`   Admin: ${admin.name}`);
  console.log(`   Tipo de semente: ${seedType.name}`);
  console.log(`   Localização: ${availableLocation.code}`);

  // Teste 1: Criar produto com peso unitário
  console.log('\n📦 Teste 1: Criando produto com peso unitário...');
  const quantidade = 17;
  const pesoUnitario = 15; // 15kg por unidade
  const pesoTotalEsperado = quantidade * pesoUnitario; // 17 × 15 = 255kg

  console.log(`   Quantidade: ${quantidade} unidades`);
  console.log(`   Peso unitário: ${pesoUnitario}kg`);
  console.log(`   Peso total esperado: ${pesoTotalEsperado}kg`);

  const product = new Product({
    name: 'Teste de Cálculo de Peso',
    lot: 'TEST-001',
    seedTypeId: seedType._id,
    quantity: quantidade,
    storageType: 'saco',
    weightPerUnit: pesoUnitario,
    locationId: availableLocation._id,
    entryDate: new Date(),
    status: 'stored',
    notes: 'Produto de teste para validar cálculo de peso',
    metadata: {
      createdBy: admin._id,
      lastModifiedBy: admin._id
    }
  });

  await product.save();

  console.log('\n✅ Produto criado! Verificando cálculos...');
  console.log(`   totalWeight (salvo no DB): ${product.totalWeight}kg`);
  console.log(`   calculatedTotalWeight (virtual): ${product.calculatedTotalWeight}kg`);
  console.log(`   Peso total esperado: ${pesoTotalEsperado}kg`);

  // Verificações
  const pesoCorreto = product.totalWeight === pesoTotalEsperado;
  const virtualCorreto = product.calculatedTotalWeight === pesoTotalEsperado;

  console.log('\n🔍 Resultados:');
  console.log(`   ✅ totalWeight correto: ${pesoCorreto ? 'SIM' : 'NÃO'}`);
  console.log(`   ✅ calculatedTotalWeight correto: ${virtualCorreto ? 'SIM' : 'NÃO'}`);

  if (pesoCorreto && virtualCorreto) {
    console.log('\n🎉 TESTE PASSOU! O cálculo de peso está funcionando corretamente.');
  } else {
    console.log('\n❌ TESTE FALHOU! Há problemas no cálculo de peso.');
  }

  // Limpar produto de teste
  await Product.findByIdAndDelete(product._id);
  console.log('\n🧹 Produto de teste removido.');

  // Teste 2: Simular importação
  console.log('\n📊 Teste 2: Simulando dados da planilha...');
  
  const dadosPlanilha = [
    { quantidade: 10, kgUnitario: 5, totalEsperado: 50 },
    { quantidade: 17, kgUnitario: 15, totalEsperado: 255 },
    { quantidade: 25, kgUnitario: 2.5, totalEsperado: 62.5 },
    { quantidade: 8, kgUnitario: 12.3, totalEsperado: 98.4 }
  ];

  console.log('\n📋 Simulando diferentes cenários:');
  
  for (let i = 0; i < dadosPlanilha.length; i++) {
    const dados = dadosPlanilha[i];
    console.log(`\n   Cenário ${i + 1}:`);
    console.log(`   Quantidade: ${dados.quantidade} unidades`);
    console.log(`   Peso unitário (coluna KG da planilha): ${dados.kgUnitario}kg`);
    console.log(`   Peso total calculado: ${dados.quantidade * dados.kgUnitario}kg`);
    console.log(`   Peso total esperado: ${dados.totalEsperado}kg`);
    
    const calculoCorreto = (dados.quantidade * dados.kgUnitario) === dados.totalEsperado;
    console.log(`   ✅ Cálculo correto: ${calculoCorreto ? 'SIM' : 'NÃO'}`);
  }

  console.log('\n🎯 Conclusão: A correção no script de importação fará com que:');
  console.log('   - A coluna "kg" da planilha seja interpretada como peso UNITÁRIO');
  console.log('   - O peso TOTAL seja calculado automaticamente: quantidade × peso unitário');
  console.log('   - O model Product calculará e salvará o totalWeight correto');
}

async function main() {
  try {
    await connectToDatabase();
    await testWeightCalculation();
  } catch (error) {
    console.error('❌ Erro:', error.message);
  } finally {
    await mongoose.connection.close();
    console.log('\n👋 Conexão fechada.');
  }
}

if (require.main === module) {
  main();
}

module.exports = { testWeightCalculation }; 