const XLSX = require('xlsx');
const path = require('path');

// Criar planilha simples com cabeçalhos na linha 1
function createSimpleSheet() {
  const worksheetData = [
    // Linha 1: Cabeçalhos
    ['Quadra', 'Lado', 'Fila', 'Andar', 'Produto', 'Lote', 'Quantidade', 'KG'],
    
    // Dados válidos
    [1, 1, 1, 1, 'Soja Premium', 'SOJ-2024-001', 50, 2500],
    [1, 1, 1, 2, 'Milho Híbrido', 'MIL-2024-002', 30, 1500],
    [1, 1, 2, 1, 'Trigo Comum', 'TRI-2024-003', 25, 1250],
    
    // Linha com informações faltando (sem fila)
    [1, 2, '', 1, 'Soja Convencional', 'SOJ-2024-004', 40, 2000],
    
    // Linha válida
    [1, 2, 1, 1, 'Milho Doce', 'MIL-2024-005', 20, 1000],
    
    // Linha com informações faltando (sem produto)
    [1, 2, 2, 1, '', 'FEJ-2024-006', 35, 1750],
    
    // Linha com informações faltando (sem lote)
    [1, 2, 2, 2, 'Feijão Preto', '', 15, 750],
    
    // Linhas válidas
    [1, 3, 1, 1, 'Arroz Parboilizado', 'ARR-2024-007', 60, 3000],
    [1, 3, 1, 2, 'Trigo Integral', 'TRI-2024-008', 45, 2250],
    
    // Linha com informações faltando (sem quantidade)
    [1, 3, 2, 1, 'Milho Pipoca', 'MIL-2024-009', '', 500],
    
    // Linha com informações faltando (sem peso)
    [1, 3, 2, 2, 'Cevada', 'CEV-2024-010', 25, ''],
    
    // Linha válida final
    [1, 4, 1, 1, 'Centeio', 'CEN-2024-011', 30, 1500]
  ];

  // Criar workbook e worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Adicionar estilo aos cabeçalhos (linha 1)
  const headerRange = XLSX.utils.decode_range('A1:H1');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col }); // Linha 1 (índice 0)
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "366092" } },
      alignment: { horizontal: "center" }
    };
  }

  // Definir largura das colunas
  worksheet['!cols'] = [
    { wch: 8 },  // Quadra
    { wch: 6 },  // Lado
    { wch: 6 },  // Fila
    { wch: 8 },  // Andar
    { wch: 20 }, // Produto
    { wch: 15 }, // Lote
    { wch: 12 }, // Quantidade
    { wch: 8 }   // KG
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');

  // Salvar arquivo
  const fileName = 'planilha-simples-linha1.xlsx';
  const filePath = path.join(__dirname, fileName);
  
  XLSX.writeFile(workbook, filePath);
  
  console.log(`📊 Planilha simples criada: ${filePath}`);
  console.log(`\n📋 Características da planilha:`);
  console.log(`   • Cabeçalhos na linha 1`);
  console.log(`   • ${worksheetData.length - 1} linhas de dados`);
  console.log(`   • Algumas linhas com informações faltando que serão puladas`);
  console.log(`   • Linhas válidas que serão importadas`);
  
  console.log(`\n⚠️ Linhas que serão puladas por falta de informações:`);
  console.log(`   • Linha 5: sem fila`);
  console.log(`   • Linha 7: sem produto`);
  console.log(`   • Linha 8: sem lote`);
  console.log(`   • Linha 11: sem quantidade`);
  console.log(`   • Linha 12: sem peso`);
  
  console.log(`\n✅ Linhas válidas que serão importadas:`);
  console.log(`   • 7 produtos válidos deverão ser importados`);
  
  return filePath;
}

// Executar se chamado diretamente
if (require.main === module) {
  try {
    const filePath = createSimpleSheet();
    console.log(`\n🚀 Para testar a importação, execute:`);
    console.log(`   node importFromExcel.js "${filePath}"`);
  } catch (error) {
    console.error('❌ Erro ao criar planilha:', error.message);
    process.exit(1);
  }
}

module.exports = { createSimpleSheet }; 