const mongoose = require('mongoose');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

// Models
const User = require('../src/models/User');
const SeedType = require('../src/models/SeedType');
const Chamber = require('../src/models/Chamber');
const Location = require('../src/models/Location');
const Product = require('../src/models/Product');
const Movement = require('../src/models/Movement');

// Configurações
const DATABASE_NAME = 'mega-safra-01';
const DEFAULT_STORAGE_TYPE = 'saco';

// Configurações de planilha personalizada
const CUSTOM_HEADER_ROW = 1; // Linha onde estão os cabeçalhos (base 1)
const REQUIRED_FIELDS = ['quadra', 'lado', 'fila', 'andar', 'produto', 'lote', 'quantidade']; // Campos obrigatórios (KG é opcional)
const DEFAULT_WEIGHT_PER_UNIT = 1; // Peso padrão quando KG não está informado

class ExcelImporter {
  constructor() {
    this.stats = {
      processedRows: 0,
      successfulImports: 0,
      skippedRows: 0,
      errors: [],
      warnings: [],
      createdSeedTypes: [],
      foundProducts: [],
      updatedLocations: []
    };
    this.chamber = null;
    this.seedTypeCache = new Map();
    this.locationCache = new Map();
    this.adminUser = null;
  }

  // ============================================================================
  // MÉTODOS DE CONEXÃO E INICIALIZAÇÃO
  // ============================================================================

  async connect() {
    try {
      const connectionString = process.env.MONGODB_URI || `mongodb://localhost:27017/${DATABASE_NAME}`;
      await mongoose.connect(connectionString);
      console.log(`✅ Conectado ao MongoDB - Banco: ${DATABASE_NAME}`);
      return true;
    } catch (error) {
      console.error('❌ Erro ao conectar MongoDB:', error);
      return false;
    }
  }

  async initialize() {
    console.log('🔧 Inicializando sistema...');
    
    // Buscar usuário admin
    this.adminUser = await User.findOne({ role: 'admin', isActive: true });
    if (!this.adminUser) {
      throw new Error('Usuário administrador não encontrado no banco.');
    }
    console.log(`👤 Admin encontrado: ${this.adminUser.name} (${this.adminUser.email})`);

    // Buscar câmara existente
    this.chamber = await Chamber.findOne({ status: 'active' });
    if (!this.chamber) {
      throw new Error('Nenhuma câmara ativa encontrada no banco.');
    }
    console.log(`🏭 Câmara encontrada: ${this.chamber.name}`);
    console.log(`   Dimensões: ${this.chamber.dimensions.quadras}x${this.chamber.dimensions.lados}x${this.chamber.dimensions.filas}x${this.chamber.dimensions.andares}`);

    // Verificar localizações existentes
    const locationCount = await Location.countDocuments({ chamberId: this.chamber._id });
    console.log(`📍 ${locationCount} localizações encontradas na câmara`);
    
    if (locationCount === 0) {
      throw new Error('Nenhuma localização encontrada na câmara. Execute a geração de localizações primeiro.');
    }
    
    console.log('✅ Sistema inicializado com dados existentes');
  }

  // ============================================================================
  // MÉTODOS DE LEITURA E PROCESSAMENTO DA PLANILHA
  // ============================================================================

  readExcelFile(filePath) {
    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`Arquivo não encontrado: ${filePath}`);
      }

      console.log(`📄 Lendo arquivo Excel: ${filePath}`);
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0]; // Primeira aba
      const worksheet = workbook.Sheets[sheetName];
      
      // Converter para JSON
      const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
      
      if (rawData.length === 0) {
        throw new Error('Planilha está vazia');
      }

      console.log(`📊 ${rawData.length} linhas encontradas na planilha`);
      return this.processRawData(rawData);
    } catch (error) {
      throw new Error(`Erro ao ler arquivo Excel: ${error.message}`);
    }
  }

  processRawData(rawData) {
    console.log('🔍 Processando dados da planilha...');
    
    // Verificar se temos linhas suficientes
    if (rawData.length < CUSTOM_HEADER_ROW) {
      throw new Error(`Planilha deve ter pelo menos ${CUSTOM_HEADER_ROW} linhas para encontrar os cabeçalhos`);
    }
    
    // Buscar cabeçalhos na linha específica (índice base 0)
    const headerRowIndex = CUSTOM_HEADER_ROW - 1;
    const headers = rawData[headerRowIndex].map(header => 
      typeof header === 'string' ? header.toLowerCase().trim() : ''
    );
    
    console.log(`📋 Cabeçalhos encontrados na linha ${CUSTOM_HEADER_ROW}:`, headers);
    
    // Mapear índices das colunas relevantes
    const columnMap = this.identifyColumns(headers);
    console.log('🗺️ Mapeamento de colunas:', columnMap);

    // Processar linhas de dados (após o cabeçalho)
    const processedData = [];
    let skippedDueToMissingInfo = 0;
    
    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const row = rawData[i];
      const processedRow = this.processRow(row, columnMap, i + 1);
      
      if (processedRow) {
        processedData.push(processedRow);
      } else if (this.isRowWithMissingEssentialInfo(row, columnMap)) {
        skippedDueToMissingInfo++;
      }
    }

    console.log(`✅ ${processedData.length} linhas válidas processadas`);
    if (skippedDueToMissingInfo > 0) {
      console.log(`⚠️ ${skippedDueToMissingInfo} linhas puladas por falta de informações essenciais`);
    }
    return processedData;
  }

  identifyColumns(headers) {
    const columnMap = {};
    
    // Mapear colunas baseado em palavras-chave (flexível para diferentes nomes)
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

    // Verificar se todas as colunas essenciais foram encontradas (KG é opcional)
    const requiredColumns = ['quadra', 'lado', 'fila', 'andar', 'produto', 'lote', 'quantidade'];
    const missingColumns = requiredColumns.filter(col => !(col in columnMap));
    
    if (missingColumns.length > 0) {
      throw new Error(`Colunas obrigatórias não encontradas: ${missingColumns.join(', ')}\nCabeçalhos disponíveis: ${headers.join(', ')}`);
    }

    return columnMap;
  }

  // Verificar se linha tem informações essenciais faltando
  isRowWithMissingEssentialInfo(row, columnMap) {
    const missingFields = [];
    
    // Verificar cada campo obrigatório (KG não está na lista)
    REQUIRED_FIELDS.forEach(field => {
      const columnIndex = columnMap[field];
      if (columnIndex !== undefined) {
        const value = this.parseValue(row[columnIndex]);
        if (!value) {
          missingFields.push(field);
        }
      }
    });

    return missingFields.length > 0;
  }

  // Helper para extrair valor de célula
  parseValue(cellValue) {
    if (cellValue === null || cellValue === undefined || cellValue === '') {
      return null;
    }
    return String(cellValue).trim();
  }

  processRow(row, columnMap, rowNumber) {
    try {
      // Verificar se linha tem informações essenciais faltando ANTES de processar
      if (this.isRowWithMissingEssentialInfo(row, columnMap)) {
        const missingFields = [];
        REQUIRED_FIELDS.forEach(field => {
          const columnIndex = columnMap[field];
          if (columnIndex !== undefined) {
            const value = this.parseValue(row[columnIndex]);
            if (!value) missingFields.push(field);
          }
        });
        
        console.log(`⚠️ Linha ${rowNumber}: Campos obrigatórios faltando [${missingFields.join(', ')}] - pulando`);
        this.stats.skippedRows++;
        return null;
      }

      // Extrair valores das colunas
      const quadra = this.parseNumber(row[columnMap.quadra]);
      const lado = this.parseNumber(row[columnMap.lado]);
      const fila = this.parseNumber(row[columnMap.fila]);
      const andar = this.parseNumber(row[columnMap.andar]);
      const produto = this.parseString(row[columnMap.produto]);
      const lote = this.parseString(row[columnMap.lote]);
      const quantidade = this.parseNumber(row[columnMap.quantidade]);
      
      // KG é opcional - usar peso padrão se não informado
      let kg = this.parseNumber(row[columnMap.kg]);
      if (!kg || kg <= 0) {
        kg = quantidade * DEFAULT_WEIGHT_PER_UNIT; // 1kg por unidade como padrão
        console.log(`🔧 Linha ${rowNumber}: KG não informado, usando peso padrão de ${kg}kg (${quantidade} x ${DEFAULT_WEIGHT_PER_UNIT}kg)`);
      }

      // Validar dados essenciais (após verificar que não estão vazios)
      const errors = [];
      
      if (!quadra || quadra < 1 || quadra > this.chamber.dimensions.quadras) {
        errors.push(`Quadra inválida (deve estar entre 1 e ${this.chamber.dimensions.quadras})`);
      }
      if (!lado || lado < 1 || lado > this.chamber.dimensions.lados) {
        errors.push(`Lado inválido (deve estar entre 1 e ${this.chamber.dimensions.lados})`);
      }
      if (!fila || fila < 1 || fila > this.chamber.dimensions.filas) {
        errors.push(`Fila inválida (deve estar entre 1 e ${this.chamber.dimensions.filas})`);
      }
      if (!andar || andar < 1 || andar > this.chamber.dimensions.andares) {
        errors.push(`Andar inválido (deve estar entre 1 e ${this.chamber.dimensions.andares})`);
      }
      if (quantidade < 1) errors.push('Quantidade inválida');
      // Remover validação de KG já que agora é calculado automaticamente se não informado

      if (errors.length > 0) {
        this.stats.errors.push(`Linha ${rowNumber}: ${errors.join(', ')}`);
        this.stats.skippedRows++;
        return null;
      }

      // Calcular peso por unidade
      const weightPerUnit = kg / quantidade;

      if (weightPerUnit <= 0 || weightPerUnit > 1000) {
        this.stats.errors.push(`Linha ${rowNumber}: Peso por unidade inválido (${weightPerUnit.toFixed(3)}kg)`);
        this.stats.skippedRows++;
        return null;
      }

      this.stats.processedRows++;

      return {
        coordinates: { quadra, lado, fila, andar },
        product: {
          name: produto,
          lot: lote,
          quantity: quantidade,
          weightPerUnit,
          totalWeight: kg
        },
        rowNumber
      };

    } catch (error) {
      this.stats.errors.push(`Linha ${rowNumber}: Erro no processamento - ${error.message}`);
      this.stats.skippedRows++;
      return null;
    }
  }

  parseNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const num = typeof value === 'number' ? value : parseFloat(value);
    return isNaN(num) ? null : num;
  }

  parseString(value) {
    if (value === null || value === undefined) return '';
    return String(value).trim();
  }

  // ============================================================================
  // MÉTODOS DE BUSCA DE DEPENDÊNCIAS EXISTENTES
  // ============================================================================

  async findOrCreateSeedType(productName) {
    // Usar cache para evitar consultas repetidas
    if (this.seedTypeCache.has(productName)) {
      return this.seedTypeCache.get(productName);
    }

    // Buscar tipo existente (busca flexível por nome)
    let seedType = await SeedType.findOne({
      name: { $regex: new RegExp(productName, 'i') },
      isActive: true
    });

    if (!seedType) {
      // Criar novo tipo de semente
      seedType = await SeedType.create({
        name: productName,
        description: `Tipo criado automaticamente a partir da importação Excel`,
        isActive: true
      });
      
      this.stats.createdSeedTypes.push(seedType.name);
      console.log(`🌱 Novo tipo de semente criado: ${seedType.name}`);
    }

    this.seedTypeCache.set(productName, seedType);
    return seedType;
  }

  async findExistingLocation(coordinates) {
    const { quadra, lado, fila, andar } = coordinates;
    const locationKey = `${quadra}-${lado}-${fila}-${andar}`;

    // Usar cache para evitar consultas repetidas
    if (this.locationCache.has(locationKey)) {
      return this.locationCache.get(locationKey);
    }

    // Buscar localização existente
    const location = await Location.findOne({
      chamberId: this.chamber._id,
      'coordinates.quadra': quadra,
      'coordinates.lado': lado,
      'coordinates.fila': fila,
      'coordinates.andar': andar
    });

    if (!location) {
      throw new Error(`Localização ${locationKey} não encontrada no banco. Verifique se as coordenadas estão corretas.`);
    }

    this.locationCache.set(locationKey, location);
    return location;
  }

  // ============================================================================
  // MÉTODOS DE IMPORTAÇÃO DE PRODUTOS
  // ============================================================================

  async importProducts(productData) {
    console.log(`🚀 Iniciando importação de ${productData.length} produtos...`);

    for (const data of productData) {
      try {
        await this.importSingleProduct(data);
      } catch (error) {
        this.stats.errors.push(`Linha ${data.rowNumber}: ${error.message}`);
      }
    }

    console.log('✅ Importação concluída');
  }

  async importSingleProduct(data) {
    const { coordinates, product, rowNumber } = data;

    // 1. Criar/buscar tipo de semente
    const seedType = await this.findOrCreateSeedType(product.name);

    // 2. Buscar localização existente
    const location = await this.findExistingLocation(coordinates);

    // 3. Verificar se localização está disponível (REGRA CRÍTICA)
    if (location.isOccupied) {
      // Buscar produto existente na localização
      const existingProduct = await Product.findOne({
        locationId: location._id,
        status: 'stored'
      });

      if (existingProduct) {
        throw new Error(`Localização ${location.code} já ocupada pelo produto: ${existingProduct.name} (Lote: ${existingProduct.lot})`);
      }
    }

    // 4. Verificar capacidade (REGRA CRÍTICA)
    const availableCapacity = location.maxCapacityKg - location.currentWeightKg;
    if (product.totalWeight > availableCapacity) {
      throw new Error(`Localização ${location.code} não suporta ${product.totalWeight}kg. Capacidade disponível: ${availableCapacity}kg`);
    }

    // 5. Executar operações sem transação (MongoDB standalone)
    try {
      // Criar produto
      const newProduct = await Product.create({
        name: product.name,
        lot: product.lot,
        seedTypeId: seedType._id,
        quantity: product.quantity,
        storageType: DEFAULT_STORAGE_TYPE,
        weightPerUnit: product.weightPerUnit,
        locationId: location._id,
        entryDate: new Date(),
        status: 'stored',
        notes: `Importado via Excel - Linha ${rowNumber}`,
        metadata: {
          createdBy: this.adminUser._id,
          lastModifiedBy: this.adminUser._id
        }
      });

      // Atualizar localização
      await Location.updateOne(
        { _id: location._id },
        {
          $set: { isOccupied: true },
          $inc: { currentWeightKg: product.totalWeight }
        }
      );

      // Registrar movimentação (REGRA CRÍTICA)
      await Movement.create({
        productId: newProduct._id,
        type: 'entry',
        toLocationId: location._id,
        quantity: product.quantity,
        weight: product.totalWeight,
        userId: this.adminUser._id,
        reason: 'Importação via Excel',
        notes: `Produto importado da planilha Excel - Linha ${rowNumber}`
      });

      this.stats.foundProducts.push({
        name: product.name,
        lot: product.lot,
        location: location.code,
        weight: product.totalWeight
      });

      this.stats.successfulImports++;
      console.log(`✅ Produto importado: ${product.name} (${product.lot}) → ${location.code} [${product.totalWeight}kg]`);

    } catch (error) {
      throw new Error(`Erro ao salvar produto: ${error.message}`);
    }
  }

  // ============================================================================
  // MÉTODOS DE RELATÓRIO E ESTATÍSTICAS
  // ============================================================================

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('📊 RELATÓRIO DE IMPORTAÇÃO EXCEL - MEGA SAFRA');
    console.log('='.repeat(80));
    
    console.log(`\n🏭 BANCO DE DADOS: ${DATABASE_NAME}`);
    console.log(`📍 CÂMARA: ${this.chamber.name}`);
    console.log(`👤 USUÁRIO: ${this.adminUser.name}`);
    
    console.log(`\n📈 ESTATÍSTICAS GERAIS:`);
    console.log(`   • Linhas processadas: ${this.stats.processedRows}`);
    console.log(`   • Produtos importados: ${this.stats.successfulImports}`);
    console.log(`   • Linhas ignoradas: ${this.stats.skippedRows}`);
    console.log(`   • Taxa de sucesso: ${this.stats.processedRows > 0 ? Math.round((this.stats.successfulImports / this.stats.processedRows) * 100) : 0}%`);

    if (this.stats.createdSeedTypes.length > 0) {
      console.log(`\n🌱 TIPOS DE SEMENTES CRIADOS (${this.stats.createdSeedTypes.length}):`);
      this.stats.createdSeedTypes.forEach(name => console.log(`   • ${name}`));
    }

    if (this.stats.foundProducts.length > 0) {
      console.log(`\n📦 PRODUTOS IMPORTADOS (${this.stats.foundProducts.length}):`);
      this.stats.foundProducts.forEach(product => {
        console.log(`   • ${product.name} (${product.lot}) → ${product.location} [${product.weight}kg]`);
      });
    }

    if (this.stats.warnings.length > 0) {
      console.log(`\n⚠️ AVISOS (${this.stats.warnings.length}):`);
      this.stats.warnings.forEach(warning => console.log(`   • ${warning}`));
    }

    if (this.stats.errors.length > 0) {
      console.log(`\n❌ ERROS (${this.stats.errors.length}):`);
      this.stats.errors.forEach(error => console.log(`   • ${error}`));
    }

    console.log('\n' + '='.repeat(80));
    
    // Resumo final
    if (this.stats.successfulImports > 0) {
      console.log(`🎉 SUCESSO! ${this.stats.successfulImports} produtos foram importados com sucesso!`);
    } else {
      console.log(`⚠️ Nenhum produto foi importado. Verifique os erros acima.`);
    }
    
    console.log('='.repeat(80));
  }

  async disconnect() {
    await mongoose.disconnect();
    console.log('✅ Desconectado do MongoDB');
  }
}

// ============================================================================
// FUNÇÃO PRINCIPAL
// ============================================================================

async function main() {
  // Verificar argumentos da linha de comando
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.log('❌ Uso: node importFromExcel.js <caminho-para-planilha.xlsx>');
    console.log('   Exemplo: node importFromExcel.js ./produtos.xlsx');
    console.log('   Exemplo: node importFromExcel.js "C:\\Users\\Usuario\\Desktop\\planilha.xlsx"');
    process.exit(1);
  }

  const importer = new ExcelImporter();

  try {
    // Conectar e inicializar
    if (!(await importer.connect())) {
      throw new Error('Falha na conexão com o banco de dados');
    }

    await importer.initialize();

    // Ler e processar planilha
    const productData = importer.readExcelFile(filePath);
    
    if (productData.length === 0) {
      throw new Error('Nenhum produto válido encontrado na planilha');
    }

    // Importar produtos
    await importer.importProducts(productData);

    // Gerar relatório
    importer.generateReport();

  } catch (error) {
    console.error('\n❌ ERRO NA IMPORTAÇÃO:', error.message);
    console.error('\n💡 DICAS:');
    console.error('   • Verifique se o banco "mega-safra-01" está rodando');
    console.error('   • Verifique se a planilha tem as colunas: quadra, lado, fila, andar, produto, lote, quantidade, kg');
    console.error('   • Verifique se as coordenadas estão dentro dos limites da câmara');
    console.error('   • Verifique se as localizações já existem no banco');
    process.exit(1);
  } finally {
    await importer.disconnect();
  }
}

// Executar se chamado diretamente
if (require.main === module) {
  main();
}

module.exports = ExcelImporter;

