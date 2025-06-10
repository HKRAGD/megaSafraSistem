const XLSX = require('xlsx');
const path = require('path');

// Configurações
const REQUIRED_FIELDS = ['quadra', 'lado', 'fila', 'andar', 'produto', 'lote', 'quantidade'];

class ExcelAnalyzer {
  constructor() {
    this.stats = {
      totalRows: 0,
      validRows: 0,
      rowsWithMissingKgOnly: 0,
      rowsWithOtherMissing: 0,
      validRowsData: []
    };
  }

  analyzeFile(filePath) {
    if (!filePath) {
      console.log('❌ Por favor, forneça o caminho da planilha Excel');
      console.log('💡 Uso: node analyzeExcel.js "caminho/para/planilha.xlsx"');
      return;
    }

    console.log(`📄 Analisando planilha: ${filePath}`);
    
    try {
      // Ler arquivo Excel
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const rawData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1 });
      
      console.log(`📊 ${rawData.length} linhas encontradas na planilha`);
      
      // Processar dados
      this.processData(rawData);
      this.generateReport();
      
    } catch (error) {
      console.error('❌ Erro ao analisar planilha:', error.message);
    }
  }

  processData(rawData) {
    if (rawData.length === 0) return;

    // Identificar cabeçalhos na linha 1
    const headers = rawData[0].map(header => 
      typeof header === 'string' ? header.toLowerCase().trim() : ''
    );
    
    console.log('📋 Cabeçalhos encontrados:', headers);
    
    // Mapear colunas
    const columnMap = this.identifyColumns(headers);
    console.log('🗺️ Mapeamento de colunas:', columnMap);

    // Analisar cada linha de dados
    for (let i = 1; i < rawData.length; i++) {
      const row = rawData[i];
      this.analyzeRow(row, columnMap, i + 1);
    }
  }

  identifyColumns(headers) {
    const columnMap = {};
    
    headers.forEach((header, index) => {
      const lowerHeader = header.toLowerCase();
      if (lowerHeader.includes('quadra')) columnMap.quadra = index;
      else if (lowerHeader.includes('lado')) columnMap.lado = index;
      else if (lowerHeader.includes('fila')) columnMap.fila = index;
      else if (lowerHeader.includes('andar')) columnMap.andar = index;
      else if (lowerHeader.includes('produto') && !lowerHeader.includes('tipo')) columnMap.produto = index;
      else if (lowerHeader.includes('lote')) columnMap.lote = index;
      else if (lowerHeader.includes('quantidade')) columnMap.quantidade = index;
      else if (lowerHeader.includes('kg') || lowerHeader.includes('peso')) columnMap.kg = index;
    });

    return columnMap;
  }

  analyzeRow(row, columnMap, rowNumber) {
    this.stats.totalRows++;
    
    const missingFields = [];
    const hasKg = this.hasValue(row[columnMap.kg]);
    
    // Verificar campos obrigatórios
    REQUIRED_FIELDS.forEach(field => {
      if (!this.hasValue(row[columnMap[field]])) {
        missingFields.push(field);
      }
    });

    if (missingFields.length === 0) {
      // Linha completamente válida ou só falta KG
      if (hasKg) {
        this.stats.validRows++;
        this.stats.validRowsData.push({
          rowNumber,
          quadra: row[columnMap.quadra],
          lado: row[columnMap.lado],
          fila: row[columnMap.fila],
          andar: row[columnMap.andar],
          produto: row[columnMap.produto],
          lote: row[columnMap.lote],
          quantidade: row[columnMap.quantidade],
          kg: row[columnMap.kg],
          status: 'VÁLIDA'
        });
        console.log(`✅ Linha ${rowNumber}: VÁLIDA - Todos os campos preenchidos`);
      } else {
        this.stats.validRows++;
        this.stats.rowsWithMissingKgOnly++;
        this.stats.validRowsData.push({
          rowNumber,
          quadra: row[columnMap.quadra],
          lado: row[columnMap.lado],
          fila: row[columnMap.fila],
          andar: row[columnMap.andar],
          produto: row[columnMap.produto],
          lote: row[columnMap.lote],
          quantidade: row[columnMap.quantidade],
          kg: 'PESO PADRÃO',
          status: 'VÁLIDA (peso padrão)'
        });
        console.log(`🔧 Linha ${rowNumber}: VÁLIDA - KG será calculado automaticamente`);
      }
    } else {
      // Linha inválida
      this.stats.rowsWithOtherMissing++;
      console.log(`❌ Linha ${rowNumber}: INVÁLIDA - Faltando: ${missingFields.join(', ')}`);
    }
  }

  hasValue(value) {
    return value !== null && value !== undefined && value !== '';
  }

  generateReport() {
    console.log('\n================================================================================');
    console.log('📊 RELATÓRIO DE ANÁLISE DA PLANILHA EXCEL');
    console.log('================================================================================');
    
    console.log('\n📈 ESTATÍSTICAS GERAIS:');
    console.log(`   • Total de linhas analisadas: ${this.stats.totalRows}`);
    console.log(`   • Linhas válidas para importação: ${this.stats.validRows}`);
    console.log(`   • Linhas com apenas KG faltando: ${this.stats.rowsWithMissingKgOnly}`);
    console.log(`   • Linhas com outros campos faltando: ${this.stats.rowsWithOtherMissing}`);
    console.log(`   • Taxa de sucesso potencial: ${((this.stats.validRows / this.stats.totalRows) * 100).toFixed(1)}%`);

    if (this.stats.validRows > 0) {
      console.log('\n✅ LINHAS VÁLIDAS PARA IMPORTAÇÃO:');
      console.log('================================================================================');
      console.log('Linha | Quadra | Lado | Fila | Andar | Produto | Lote | Qtd | KG | Status');
      console.log('------|--------|------|------|-------|---------|------|-----|----|---------');
      
      this.stats.validRowsData.forEach(row => {
        const kg = row.kg === 'PESO PADRÃO' ? 'AUTO' : row.kg;
        console.log(`${String(row.rowNumber).padStart(5)} | ${String(row.quadra).padStart(6)} | ${String(row.lado).padStart(4)} | ${String(row.fila).padStart(4)} | ${String(row.andar).padStart(5)} | ${String(row.produto).substring(0, 7).padEnd(7)} | ${String(row.lote).substring(0, 4).padEnd(4)} | ${String(row.quantidade).padStart(3)} | ${String(kg).padStart(4)} | ${row.status}`);
      });
    }

    console.log('\n================================================================================');
    if (this.stats.validRows > 0) {
      console.log(`🎉 CONCLUSÃO: ${this.stats.validRows} produtos podem ser importados!`);
      console.log('\n💡 Para importar, execute:');
      console.log(`   node importFromExcel.js "sua-planilha.xlsx"`);
    } else {
      console.log('❌ CONCLUSÃO: Nenhum produto pode ser importado.');
      console.log('\n💡 DICAS PARA CORRIGIR:');
      console.log('   • Verifique se os campos obrigatórios estão preenchidos: quadra, lado, fila, andar, produto, lote, quantidade');
      console.log('   • O campo KG é opcional - será calculado automaticamente como 1kg por unidade');
      console.log('   • Remova linhas em branco ou incompletas');
    }
    console.log('================================================================================');
  }
}

// Executar análise
const analyzer = new ExcelAnalyzer();
const filePath = process.argv[2];
analyzer.analyzeFile(filePath); 