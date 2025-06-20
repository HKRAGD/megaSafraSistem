const XLSX = require('xlsx');
const path = require('path');

// Dados de exemplo para a planilha
const exampleData = [
  // Cabeçalho
  ['quadra', 'lado', 'fila', 'andar', 'produto', 'lote', 'quantidade', 'kg'],
  
  // Dados de exemplo (capacidade máxima por localização: 1000kg)
  [1, 1, 1, 1, 'Soja Premium', 'LOT-2024-001', 10, 500],
  [1, 1, 1, 2, 'Milho Híbrido', 'LOT-2024-002', 20, 800],
  [1, 1, 2, 1, 'Trigo Comum', 'LOT-2024-003', 15, 750],
  [1, 1, 2, 2, 'Soja Convencional', 'LOT-2024-004', 12, 600],
  [1, 2, 1, 1, 'Milho Doce', 'LOT-2024-005', 8, 400],
  [1, 2, 1, 2, 'Feijão Preto', 'LOT-2024-006', 25, 950],
  [1, 2, 2, 1, 'Arroz Parboilizado', 'LOT-2024-007', 30, 900],
  [1, 2, 2, 2, 'Soja Premium', 'LOT-2024-008', 18, 720],
  [2, 1, 1, 1, 'Trigo Integral', 'LOT-2024-009', 22, 880],
  [2, 1, 1, 2, 'Milho Pipoca', 'LOT-2024-010', 14, 700],
  
  // Linha com erro intencional para testar validação
  [99, 99, 99, 99, 'Produto Inválido', 'LOT-ERR-001', 5, 250], // Coordenadas fora dos limites
  
  // Linha incompleta para testar tratamento de erros
  [2, 2, 1, '', 'Produto Incompleto', '', 10, 500], // Andar e lote vazios
  
  // Mais produtos válidos
  [2, 1, 2, 1, 'Cevada', 'LOT-2024-011', 16, 800],
  [2, 1, 2, 2, 'Aveia', 'LOT-2024-012', 11, 550],
  [2, 2, 1, 1, 'Centeio', 'LOT-2024-013', 19, 950],
];

function createExampleSheet() {
  try {
    console.log('📄 Criando planilha Excel de exemplo...');
    
    // Criar workbook
    const workbook = XLSX.utils.book_new();
    
    // Criar worksheet com os dados
    const worksheet = XLSX.utils.aoa_to_sheet(exampleData);
    
    // Definir larguras das colunas
    worksheet['!cols'] = [
      { wch: 8 },  // quadra
      { wch: 8 },  // lado
      { wch: 8 },  // fila
      { wch: 8 },  // andar
      { wch: 20 }, // produto
      { wch: 15 }, // lote
      { wch: 12 }, // quantidade
      { wch: 8 },  // kg
    ];
    
    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Produtos');
    
    // Definir caminho do arquivo
    const filePath = path.join(__dirname, 'exemplo-produtos.xlsx');
    
    // Salvar arquivo
    XLSX.writeFile(workbook, filePath);
    
    console.log(`✅ Planilha de exemplo criada: ${filePath}`);
    console.log('\n📋 Conteúdo da planilha:');
    console.log('   • 15 produtos de exemplo');
    console.log('   • Diferentes tipos de sementes');
    console.log('   • Coordenadas variadas');
    console.log('   • 2 linhas com erros intencionais para teste');
    console.log('\n💡 Para testar a importação:');
    console.log(`   node importFromExcel.js "${filePath}"`);
    console.log('\n🔍 Estrutura da planilha:');
    console.log('   • quadra: Número da quadra (1-N)');
    console.log('   • lado: Número do lado (1-N)');
    console.log('   • fila: Número da fila (1-N)');
    console.log('   • andar: Número do andar (1-N)');
    console.log('   • produto: Nome do produto/semente');
    console.log('   • lote: Código do lote');
    console.log('   • quantidade: Quantidade de unidades');
    console.log('   • kg: Peso total em quilogramas');
    
    return filePath;
    
  } catch (error) {
    console.error('❌ Erro ao criar planilha:', error.message);
    throw error;
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  createExampleSheet();
}

module.exports = createExampleSheet; 