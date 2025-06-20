const mongoose = require('mongoose');
const reportService = require('../src/services/reportService');

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sistema-sementes-test', {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

async function testReports() {
  try {
    console.log('🧪 === TESTE DOS RELATÓRIOS ===');
    
    // 1. Teste do relatório de inventário
    console.log('\n📦 Testando relatório de inventário...');
    const inventoryReport = await reportService.generateInventoryReport();
    console.log('✅ Relatório de inventário gerado:');
    console.log('   - Total de produtos:', inventoryReport.data.summary.totalProducts);
    console.log('   - Peso total:', inventoryReport.data.summary.totalWeight, 'kg');
    console.log('   - Localizações ocupadas:', inventoryReport.data.summary.locationsOccupied);
    console.log('   - Total de localizações:', inventoryReport.data.summary.totalLocations);
    console.log('   - Taxa de ocupação:', inventoryReport.data.summary.occupancyRate, '%');
    
    // 2. Teste do relatório de movimentações
    console.log('\n📝 Testando relatório de movimentações...');
    const movementReport = await reportService.generateMovementReport();
    console.log('✅ Relatório de movimentações gerado:');
    console.log('   - Total de movimentações:', movementReport.data.summary.totalMovements);
    console.log('   - Distribuição por tipo:', movementReport.data.summary.typeDistribution);
    
    // 3. Teste do relatório de vencimentos
    console.log('\n⏰ Testando relatório de vencimentos...');
    const expirationReport = await reportService.generateExpirationReport();
    console.log('✅ Relatório de vencimentos gerado:');
    console.log('   - Produtos expirando:', expirationReport.data.summary.totalExpiring);
    console.log('   - Produtos vencidos:', expirationReport.data.summary.totalExpired);
    
    // 4. Teste do relatório executivo
    console.log('\n📊 Testando relatório executivo...');
    const executiveReport = await reportService.generateExecutiveDashboard();
    console.log('✅ Relatório executivo gerado:');
    console.log('   - KPIs:', executiveReport.data.kpis);
    
  } catch (error) {
    console.error('❌ Erro ao testar relatórios:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

testReports(); 