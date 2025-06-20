const XLSX = require('xlsx');
const path = require('path');

// Criar planilha de exemplo personalizada
function createCustomExampleSheet() {
  const worksheetData = [
    // Linhas 1-6: Informações irrelevantes/cabeçalhos falsos
    ['Relatório de Estoque - Empresa XYZ', '', '', '', '', '', '', ''],
    ['Data: ' + new Date().toLocaleDateString(), '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    ['Câmara Refrigerada #1', '', '', '', '', '', '', ''],
    ['Temperatura: -18°C', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', ''],
    
    // Linha 7: Cabeçalhos reais
    ['QUADRA', 'LADO', 'FILA', 'ANDAR', 'PRODUTO', 'LOTE', 'QUANTIDADE', 'KG'],
    
    // Dados válidos
    [1, 1, 1, 1, 'Soja Premium', 'SOJ-2024-001', 50, 2500],
    [1, 1, 1, 2, 'Milho Híbrido', 'MIL-2024-002', 30, 1800],
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
    [1, 3, 2, 1, 'Milho Pipoca', 'MIL-2024-009', 10, 500],
    
    // Linha com informações faltando (sem quantidade)
    [1, 3, 2, 2, 'Cevada', 'CEV-2024-010', '', 900],
    
    // Linha com informações faltando (sem peso)
    [1, 4, 1, 1, 'Aveia', 'AVE-2024-011', 25, ''],
    
    // Linhas válidas finais
    [1, 4, 1, 2, 'Centeio', 'CEN-2024-012', 30, 1500],
    [2, 1, 1, 1, 'Quinoa', 'QUI-2024-013', 12, 600],
    
    // Linha completamente vazia
    ['', '', '', '', '', '', '', ''],
    
    // Linha final válida
    [2, 1, 1, 2, 'Amaranto', 'AMA-2024-014', 8, 400]
  ];

  // Criar workbook e worksheet
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
  
  // Adicionar estilo aos cabeçalhos (linha 7)
  const headerRange = XLSX.utils.decode_range('A7:H7');
  for (let col = headerRange.s.c; col <= headerRange.e.c; col++) {
    const cellAddress = XLSX.utils.encode_cell({ r: 6, c: col }); // Linha 7 (índice 6)
    if (!worksheet[cellAddress]) continue;
    worksheet[cellAddress].s = {
      font: { bold: true, color: { rgb: "FFFFFF" } },
      fill: { fgColor: { rgb: "366092" } },
      alignment: { horizontal: "center" }
    };
  }

  // Definir largura das colunas
  worksheet['!cols'] = [
    { wch: 8 },  // QUADRA
    { wch: 6 },  // LADO
    { wch: 6 },  // FILA
    { wch: 8 },  // ANDAR
    { wch: 20 }, // PRODUTO
    { wch: 15 }, // LOTE
    { wch: 12 }, // QUANTIDADE
    { wch: 8 }   // KG
  ];

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Estoque');

  // Salvar arquivo
  const fileName = 'planilha-personalizada-exemplo.xlsx';
  const filePath = path.join(__dirname, fileName);
  
  XLSX.writeFile(workbook, filePath);
  
  console.log(`📊 Planilha personalizada criada: ${filePath}`);
  console.log(`\n📋 Características da planilha:`);
  console.log(`   • Cabeçalhos na linha 7 (não na linha 1)`);
  console.log(`   • ${worksheetData.length - 7} linhas de dados`);
  console.log(`   • Algumas linhas com informações faltando que serão puladas`);
  console.log(`   • Linhas válidas que serão importadas`);
  
  console.log(`\n⚠️ Linhas que serão puladas por falta de informações:`);
  console.log(`   • Linha 11: sem fila`);
  console.log(`   • Linha 13: sem produto`);
  console.log(`   • Linha 14: sem lote`);
  console.log(`   • Linha 18: sem quantidade`);
  console.log(`   • Linha 19: sem peso`);
  console.log(`   • Linha 22: linha vazia`);
  
  console.log(`\n✅ Linhas válidas que serão importadas:`);
  console.log(`   • 10 produtos válidos deverão ser importados`);
  
  return filePath;
}

// Executar se chamado diretamente
if (require.main === module) {
  try {
    const filePath = createCustomExampleSheet();
    console.log(`\n🚀 Para testar a importação, execute:`);
    console.log(`   node importFromExcel.js "${filePath}"`);
  } catch (error) {
    console.error('❌ Erro ao criar planilha:', error.message);
    process.exit(1);
  }
}

module.exports = { createCustomExampleSheet }; 