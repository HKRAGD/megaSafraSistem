const XLSX = require('xlsx');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config();

// Importar modelos
require('../src/models/User');
require('../src/models/SeedType');
require('../src/models/Chamber');
require('../src/models/Location');
require('../src/models/Product');
require('../src/models/Movement');
require('../src/models/Client');

// Importar constantes
const { PRODUCT_STATUS, USER_ROLES } = require('../src/utils/constants');

const User = mongoose.model('User');
const SeedType = mongoose.model('SeedType');
const Chamber = mongoose.model('Chamber');
const Location = mongoose.model('Location');
const Product = mongoose.model('Product');
// const Movement = mongoose.model('Movement'); // Não usado diretamente
const Client = mongoose.model('Client');

// Configuração do banco - usar as mesmas variáveis do projeto
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGODB_TEST_URI || 'mongodb://mongo:LNRONlHSRBOrWmtnGRPYffZFzdgJMzHp@switchback.proxy.rlwy.net:25486';

async function connectToDatabase() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado ao MongoDB - Banco: mega-safra-01');
  } catch (error) {
    console.error('❌ Erro ao conectar ao MongoDB:', error.message);
    process.exit(1);
  }
}

async function initializeSystem() {
  console.log('🚀 Inicializando sistema...');

  // Buscar admin
  const admin = await User.findOne({ role: USER_ROLES.ADMIN });
  if (!admin) {
    console.error('❌ Usuário admin não encontrado! Execute o script de setup primeiro.');
    process.exit(1);
  }
  console.log(`👤 Admin encontrado: ${admin.name} (${admin.email})`);

  // Buscar câmara principal
  const chamber = await Chamber.findOne().sort({ createdAt: 1 });
  if (!chamber) {
    console.error('❌ Nenhuma câmara encontrada! Crie uma câmara primeiro.');
    process.exit(1);
  }
  console.log(`🏢 Câmara encontrada: ${chamber.name}`);
  console.log(`   Dimensões: ${chamber.dimensions.quadras}x${chamber.dimensions.lados}x${chamber.dimensions.filas}x${chamber.dimensions.andares}`);

  // Buscar localizações
  let locations = await Location.find({ chamberId: chamber._id });
  console.log(`📍 ${locations.length} localizações encontradas na câmara`);

  // Gerar localizações se não existirem
  if (locations.length === 0) {
    console.log('🔧 Gerando localizações para a câmara...');
    const generatedLocations = await Location.generateForChamber(chamber._id);
    console.log(`✅ ${generatedLocations.length} localizações geradas com sucesso`);
    locations = generatedLocations;
  }

  // Buscar/criar tipos de sementes
  const seedTypes = await createSeedTypesFromData();

  console.log('✅ Sistema inicializado com dados existentes');
  
  return { admin, chamber, locations, seedTypes };
}

// Criar tipos de sementes baseados nos dados da planilha
async function createSeedTypesFromData() {
  const seedTypeNames = [
    'MILHO', 'SORGO', 'NUGRAIN', 'ENFORCE', 'NUSOL', 'FOX PREMIUM', 
    'SANY', 'MIX NUCLEAR', 'GIRASSO', 'PRINA ESPECIAL'
  ];

  const seedTypes = {};

  for (const name of seedTypeNames) {
    let seedType = await SeedType.findOne({ 
      name: { $regex: new RegExp(`^${name}`, 'i') } 
    });

    if (!seedType) {
      seedType = new SeedType({
        name: name,
        description: `Tipo de semente ${name}`,
        optimalTemperature: 18,
        optimalHumidity: 60,
        maxStorageTimeDays: 365,
        isActive: true
      });
      await seedType.save();
      console.log(`📦 Tipo de semente criado: ${name}`);
    }

    seedTypes[name] = seedType;
  }

  return seedTypes;
}

function readExcelFile(filePath) {
  console.log(`📄 Lendo arquivo Excel: ${path.basename(filePath)}`);
  
  const workbook = XLSX.readFile(filePath, { 
    cellText: false, 
    cellDates: true,
    raw: false,
    defval: null
  });
  
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: null,
    raw: false
  });

  console.log(`📊 ${data.length} linhas encontradas na planilha`);
  return data;
}

function parseExcelData(data) {
  console.log('🔄 Processando dados da planilha...');

  if (data.length < 2) {
    throw new Error('Planilha vazia ou sem dados válidos');
  }

  // Primeira linha são os cabeçalhos
  const headers = data[0].map(h => h ? h.toString().toLowerCase().trim() : '');
  console.log('📋 Cabeçalhos encontrados:', headers);

  // Mapear colunas
  const columnMap = {
    quadra: headers.indexOf('quadra'),
    lado: headers.indexOf('lado'),
    fila: headers.indexOf('fila'),
    andar: headers.indexOf('andar'),
    produto: headers.indexOf('produto'),
    lote: headers.indexOf('lote'),
    quantidade: headers.indexOf('quantidade'),
    kg: headers.indexOf('kg'),
    cliente: headers.indexOf('cliente') // Nova coluna para cliente
  };

  console.log('🗺️ Mapeamento de colunas:', columnMap);

  // Verificar se todas as colunas essenciais foram encontradas
  const missingColumns = Object.entries(columnMap)
    .filter(([key, index]) => index === -1 && !['kg', 'cliente'].includes(key)) // kg e cliente podem estar ausentes
    .map(([key]) => key);

  if (missingColumns.length > 0) {
    throw new Error(`Colunas não encontradas: ${missingColumns.join(', ')}`);
  }

  const products = [];
  let validCount = 0;
  let skippedCount = 0;

  // Processar dados (começando da linha 2)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const lineNumber = i + 1;

    if (!row || row.length === 0) {
      skippedCount++;
      continue;
    }

    try {
      // Extrair dados da linha
      const quadra = getValue(row, columnMap.quadra);
      const lado = getValue(row, columnMap.lado);
      const fila = getValue(row, columnMap.fila);
      const andar = getValue(row, columnMap.andar);
      const produto = getValue(row, columnMap.produto);
      const lote = getValue(row, columnMap.lote);
      const quantidade = getValue(row, columnMap.quantidade);
      const kg = getValue(row, columnMap.kg);
      const cliente = getValue(row, columnMap.cliente);

      // Validações básicas - localização agora é opcional
      const errors = [];
      if (!produto) errors.push('produto');
      if (!lote) errors.push('lote');
      if (!quantidade || isNaN(quantidade)) errors.push('quantidade');
      
      // Validar coordenadas apenas se alguma foi fornecida
      const hasLocationData = quadra || lado || fila || andar;
      if (hasLocationData) {
        if (!quadra || isNaN(quadra)) errors.push('quadra');
        if (!lado) errors.push('lado');
        if (!fila || isNaN(fila)) errors.push('fila');
        if (!andar || isNaN(andar)) errors.push('andar');
      }

      if (errors.length > 0) {
        console.log(`⚠️ Linha ${lineNumber}: Campos inválidos [${errors.join(', ')}] - pulando`);
        skippedCount++;
        continue;
      }

      // Converter valores
      const productData = {
        quadra: quadra ? parseInt(quadra) : null,
        lado: lado ? lado.toString().toUpperCase().trim() : null,
        fila: fila ? parseInt(fila) : null,
        andar: andar ? parseInt(andar) : null,
        produto: produto.toString().trim(),
        lote: lote.toString().trim(),
        quantidade: parseInt(quantidade),
        kgUnitario: kg ? parseFloat(kg) : null,
        cliente: cliente ? cliente.toString().trim() : null
      };

      // Definir peso unitário padrão se não informado
      if (!productData.kgUnitario) {
        productData.kgUnitario = 1; // 1kg por unidade como padrão
        console.log(`💡 Linha ${lineNumber}: Peso unitário definido como padrão: ${productData.kgUnitario}kg/unidade`);
      } else {
        console.log(`📊 Linha ${lineNumber}: ${productData.quantidade} unidades × ${productData.kgUnitario}kg = ${productData.quantidade * productData.kgUnitario}kg total`);
      }

      products.push({
        ...productData,
        lineNumber
      });

      validCount++;

    } catch (error) {
      console.log(`❌ Linha ${lineNumber}: Erro ao processar - ${error.message}`);
      skippedCount++;
    }
  }

  console.log(`✅ ${validCount} linhas válidas processadas`);
  console.log(`⚠️ ${skippedCount} linhas puladas por problemas`);

  return products;
}

function getValue(row, columnIndex) {
  if (columnIndex === -1 || !row[columnIndex]) return null;
  
  const value = row[columnIndex];
  if (value === null || value === undefined || value === '') return null;
  
  return value.toString().trim();
}

async function importProducts(productsData, { admin, locations, seedTypes }) {
  console.log(`🚀 Iniciando importação de ${productsData.length} produtos...`);

  let successCount = 0;
  let errorCount = 0;
  const errors = [];
  
  // Cache de clientes para evitar múltiplas consultas
  const clientCache = new Map();

  // Criar mapa de localizações por coordenadas
  const locationMap = {};
  locations.forEach(loc => {
    const key = `${loc.coordinates.quadra}-${loc.coordinates.lado}-${loc.coordinates.fila}-${loc.coordinates.andar}`;
    locationMap[key] = loc;
  });

  for (const productData of productsData) {
    try {
        const { lineNumber, quadra, lado, fila, andar, produto, lote, quantidade, kgUnitario, cliente } = productData;

        let location = null;
        let clientId = null;

        // Processar cliente se fornecido
        if (cliente) {
          if (clientCache.has(cliente)) {
            clientId = clientCache.get(cliente);
          } else {
            let clientDoc = await Client.findOne({ 
              name: { $regex: new RegExp(`^${cliente.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
              isActive: true
            });
            
            if (!clientDoc) {
              // Criar cliente automaticamente se não existir
              clientDoc = new Client({
                name: cliente,
                documentType: 'OUTROS',
                contactPerson: cliente,
                phone: '',
                address: {},
                notes: `Cliente criado automaticamente durante importação - Linha ${lineNumber}`,
                isActive: true,
                metadata: {
                  createdBy: admin._id,
                  lastModifiedBy: admin._id
                }
              });
              await clientDoc.save();
              console.log(`👤 Linha ${lineNumber}: Cliente "${cliente}" criado automaticamente`);
            }
            
            clientId = clientDoc._id;
            clientCache.set(cliente, clientId);
          }
        }

        // Processar localização se fornecida
        if (quadra && lado && fila && andar) {
          const locationKey = `${quadra}-${lado}-${fila}-${andar}`;
          location = locationMap[locationKey];

          if (!location) {
            const error = `Linha ${lineNumber}: Localização Q${quadra}-L${lado}-F${fila}-A${andar} não encontrada`;
            console.log(`❌ ${error}`);
            errors.push(error);
            errorCount++;
            continue;
          }

          // Verificar se localização está ocupada
          const existingProduct = await Product.findOne({ 
            locationId: location._id, 
            status: PRODUCT_STATUS.LOCADO
          });

          if (existingProduct) {
            const error = `Linha ${lineNumber}: Localização já ocupada por produto "${existingProduct.name}"`;
            console.log(`⚠️ ${error}`);
            errors.push(error);
            errorCount++;
            continue;
          }
        }

        // Determinar tipo de semente
        const seedType = findSeedType(produto, seedTypes);
        if (!seedType) {
          const error = `Linha ${lineNumber}: Tipo de semente não encontrado para "${produto}"`;
          console.log(`❌ ${error}`);
          errors.push(error);
          errorCount++;
          continue;
        }

        // Verificar capacidade apenas se há localização
        if (location && kgUnitario) {
          const totalWeight = quantidade * kgUnitario;
          if (totalWeight > location.maxCapacityKg) {
            const error = `Linha ${lineNumber}: Peso total (${totalWeight}kg) excede capacidade da localização (${location.maxCapacityKg}kg)`;
            console.log(`⚠️ ${error}`);
            errors.push(error);
            errorCount++;
            continue;
          }
        }

        // Criar produto - o modelo gerenciará automaticamente status, location updates e movements
        const productDoc = {
          name: `${produto} - Lote ${lote}`,
          lot: lote,
          seedTypeId: seedType._id,
          quantity: quantidade,
          storageType: 'saco',
          weightPerUnit: kgUnitario || 1, // Peso padrão se não informado
          entryDate: new Date(),
          notes: `Importado da planilha - Linha ${lineNumber}`,
          metadata: {
            createdBy: admin._id,
            lastModifiedBy: admin._id
          }
        };

        // Adicionar localização e cliente se fornecidos
        if (location) {
          productDoc.locationId = location._id;
        }
        if (clientId) {
          productDoc.clientId = clientId;
        }

        const product = new Product(productDoc);
        await product.save();

        const statusMsg = location ? 'LOCADO' : 'AGUARDANDO_LOCACAO';
        const locationMsg = location ? `na localização Q${quadra}-L${lado}-F${fila}-A${andar}` : 'sem localização (aguardando locação)';
        const clientMsg = cliente ? ` para cliente "${cliente}"` : '';
        
        console.log(`✅ Linha ${lineNumber}: Produto "${product.name}" importado com sucesso ${locationMsg}${clientMsg} - Status: ${statusMsg}`);
        successCount++;
    } catch (error) {
      const errorMsg = `Linha ${productData.lineNumber}: Erro ao salvar - ${error.message}`;
      console.log(`❌ ${errorMsg}`);
      errors.push(errorMsg);
      errorCount++;
    }
  }


  return { successCount, errorCount, errors };
}

function findSeedType(productName, seedTypes) {
  const name = productName.toUpperCase();
  
  // Tentar match exato primeiro
  for (const [key, seedType] of Object.entries(seedTypes)) {
    if (name.includes(key)) {
      return seedType;
    }
  }

  // Se não encontrou, usar um tipo genérico ou criar
  return seedTypes['MILHO']; // Fallback para MILHO
}

async function main() {
  const filePath = process.argv[2];

  if (!filePath) {
    console.error('❌ Uso: node importFromExcelFixed.js <caminho-da-planilha.xlsx>');
    process.exit(1);
  }

  if (!filePath.endsWith('.xlsx') && !filePath.endsWith('.xls')) {
    console.error('❌ Arquivo deve ser Excel (.xlsx ou .xls)');
    process.exit(1);
  }

  try {
    // Conectar ao banco
    await connectToDatabase();

    // Inicializar sistema
    const systemData = await initializeSystem();

    // Ler arquivo Excel
    const data = readExcelFile(filePath);

    // Processar dados
    const productsData = parseExcelData(data);

    if (productsData.length === 0) {
      console.log('❌ Nenhum produto válido encontrado na planilha');
      process.exit(1);
    }

    console.log(`\n🚀 Importando ${productsData.length} produtos...`);

    // Importar produtos
    const result = await importProducts(productsData, systemData);

    // Resumo final
    console.log('\n================================================================================');
    console.log('📊 RESUMO DA IMPORTAÇÃO');
    console.log('================================================================================');
    console.log(`✅ Produtos importados com sucesso: ${result.successCount}`);
    console.log(`❌ Produtos com erro: ${result.errorCount}`);
    console.log(`📈 Taxa de sucesso: ${((result.successCount / productsData.length) * 100).toFixed(1)}%`);

    if (result.errors.length > 0) {
      console.log('\n⚠️ ERROS ENCONTRADOS:');
      result.errors.slice(0, 10).forEach(error => console.log(`   • ${error}`));
      if (result.errors.length > 10) {
        console.log(`   ... e mais ${result.errors.length - 10} erros`);
      }
    }

    if (result.successCount > 0) {
      console.log('\n🎉 IMPORTAÇÃO CONCLUÍDA COM SUCESSO!');
      console.log('📱 Acesse o sistema para visualizar os produtos importados.');
    }

  } catch (error) {
    console.error('\n❌ ERRO NA IMPORTAÇÃO:', error.message);
    console.error('\n💡 DICAS:');
    console.error('   • Verifique se o MongoDB está rodando');
    console.error('   • Verifique se o arquivo Excel existe e está acessível');
    console.error('   • Verifique se a planilha tem as colunas corretas');
    console.error('   • Execute o script de setup do sistema primeiro');
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

// Executar script
main().catch(console.error); 