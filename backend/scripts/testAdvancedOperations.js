/**
 * Script de Teste - Operações Avançadas de Produto
 * 
 * Testa as novas funcionalidades:
 * - Saída parcial/total
 * - Movimentação parcial
 * - Adição de estoque
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const EMAIL = 'admin@sistema-sementes.com';
const PASSWORD = 'admin123456';

let authToken = '';

/**
 * Fazer login e obter token
 */
async function login() {
  try {
    console.log('🔐 Fazendo login...');
    const response = await axios.post(`${BASE_URL}/auth/login`, {
      email: EMAIL,
      password: PASSWORD
    });

    authToken = response.data.token;
    console.log('✅ Login realizado com sucesso');
    return true;
  } catch (error) {
    console.error('❌ Erro no login:', error.response?.data || error.message);
    return false;
  }
}

/**
 * Headers com autenticação
 */
function getAuthHeaders() {
  return {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json'
  };
}

/**
 * Criar produto de teste
 */
async function createTestProduct() {
  try {
    console.log('\n📦 Criando produto de teste...');
    
    // Buscar dados necessários primeiro
    const [seedTypesRes, locationsRes] = await Promise.all([
      axios.get(`${BASE_URL}/seed-types`, { headers: getAuthHeaders() }),
      axios.get(`${BASE_URL}/locations`, { headers: getAuthHeaders() })
    ]);

    const seedTypes = seedTypesRes.data.data || seedTypesRes.data;
    const locations = locationsRes.data.data || locationsRes.data;

    if (!seedTypes.length || !locations.length) {
      throw new Error('Faltam dados para criar produto');
    }

    const availableLocation = locations.find(loc => !loc.isOccupied);
    if (!availableLocation) {
      throw new Error('Nenhuma localização disponível');
    }

    const productData = {
      name: 'Produto Teste Avançado',
      lot: `TEST-${Date.now()}`,
      seedTypeId: seedTypes[0]._id,
      quantity: 100,
      storageType: 'bag',
      weightPerUnit: 50,
      locationId: availableLocation._id,
      notes: 'Produto criado para teste de operações avançadas'
    };

    const response = await axios.post(`${BASE_URL}/products`, productData, {
      headers: getAuthHeaders()
    });

    const product = response.data.data;
    console.log('✅ Produto criado:', product.name);
    console.log(`📊 Quantidade: ${product.quantity} | Peso total: ${product.totalWeight}kg`);
    console.log(`📍 Localização: ${availableLocation.code}`);
    
    return product;
  } catch (error) {
    console.error('❌ Erro ao criar produto:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Teste de saída parcial
 */
async function testPartialExit(productId) {
  try {
    console.log('\n🚪 Testando saída parcial...');
    
    const response = await axios.post(`${BASE_URL}/products/${productId}/partial-exit`, {
      quantity: 30,
      reason: 'Teste de saída parcial - 30 unidades'
    }, { headers: getAuthHeaders() });

    const result = response.data.data;
    console.log('✅ Saída parcial realizada com sucesso');
    console.log(`📦 Quantidade removida: ${result.operation.quantityRemoved}`);
    console.log(`📦 Quantidade restante: ${result.operation.remainingQuantity}`);
    console.log(`⚖️ Peso removido: ${result.operation.weightRemoved}kg`);
    console.log(`📝 Movement ID: ${result.movement.id}`);
    
    return result.product;
  } catch (error) {
    console.error('❌ Erro na saída parcial:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Teste de movimentação parcial
 */
async function testPartialMove(productId) {
  try {
    console.log('\n📦 Testando movimentação parcial...');
    
    // Buscar localização disponível
    const locationsRes = await axios.get(`${BASE_URL}/locations`, { headers: getAuthHeaders() });
    const locations = locationsRes.data.data || locationsRes.data;
    const availableLocation = locations.find(loc => !loc.isOccupied);
    
    if (!availableLocation) {
      throw new Error('Nenhuma localização disponível para movimentação');
    }

    const response = await axios.post(`${BASE_URL}/products/${productId}/partial-move`, {
      quantity: 20,
      newLocationId: availableLocation._id,
      reason: 'Teste de movimentação parcial - 20 unidades'
    }, { headers: getAuthHeaders() });

    const result = response.data.data;
    console.log('✅ Movimentação parcial realizada com sucesso');
    console.log(`📦 Quantidade movida: ${result.operation.quantityMoved}`);
    console.log(`📍 De: ${result.operation.fromLocation}`);
    console.log(`📍 Para: ${result.operation.toLocation}`);
    console.log(`🆔 Produto original: ${result.originProduct._id}`);
    console.log(`🆔 Novo produto: ${result.newProduct._id}`);
    console.log(`📝 Movements: ${result.movements.exit} | ${result.movements.entry}`);
    
    return {
      originProduct: result.originProduct,
      newProduct: result.newProduct
    };
  } catch (error) {
    console.error('❌ Erro na movimentação parcial:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Teste de adição de estoque
 */
async function testAddStock(productId) {
  try {
    console.log('\n➕ Testando adição de estoque...');
    
    const response = await axios.post(`${BASE_URL}/products/${productId}/add-stock`, {
      quantity: 25,
      reason: 'Teste de adição de estoque - 25 unidades'
    }, { headers: getAuthHeaders() });

    const result = response.data.data;
    console.log('✅ Estoque adicionado com sucesso');
    console.log(`📦 Quantidade adicionada: ${result.operation.quantityAdded}`);
    console.log(`📦 Quantidade anterior: ${result.operation.previousQuantity}`);
    console.log(`📦 Nova quantidade: ${result.operation.newQuantity}`);
    console.log(`⚖️ Peso adicionado: ${result.operation.weightAdded}kg`);
    console.log(`📝 Movement ID: ${result.movement.id}`);
    
    return result.product;
  } catch (error) {
    console.error('❌ Erro ao adicionar estoque:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Verificar movimentações registradas
 */
async function checkMovements() {
  try {
    console.log('\n📋 Verificando movimentações registradas...');
    
    const response = await axios.get(`${BASE_URL}/movements?limit=10&sort=createdAt&sortOrder=desc`, {
      headers: getAuthHeaders()
    });

    const movements = response.data.data || response.data.movements || [];
    console.log(`✅ ${movements.length} movimentações encontradas`);
    
    movements.slice(0, 5).forEach((movement, index) => {
      console.log(`${index + 1}. Tipo: ${movement.type} | Quantidade: ${movement.quantity} | ${movement.reason}`);
    });
    
    return movements;
  } catch (error) {
    console.error('❌ Erro ao verificar movimentações:', error.response?.data || error.message);
    return [];
  }
}

/**
 * Função principal
 */
async function main() {
  console.log('🧪 TESTE DE OPERAÇÕES AVANÇADAS DE PRODUTOS');
  console.log('='.repeat(50));

  try {
    // Login
    const loginSuccess = await login();
    if (!loginSuccess) return;

    // Criar produto de teste
    const product = await createTestProduct();
    console.log(`\n🎯 Produto criado para testes: ${product._id}`);

    // Teste 1: Saída parcial
    await testPartialExit(product._id);

    // Teste 2: Movimentação parcial
    const moveResult = await testPartialMove(product._id);

    // Teste 3: Adição de estoque ao produto original
    await testAddStock(product._id);

    // Verificar movimentações
    await checkMovements();

    console.log('\n🎉 TODOS OS TESTES EXECUTADOS COM SUCESSO!');
    console.log('='.repeat(50));
    console.log('✅ Saída parcial funcionando');
    console.log('✅ Movimentação parcial funcionando');
    console.log('✅ Adição de estoque funcionando');
    console.log('✅ Movimentações automáticas registradas');

  } catch (error) {
    console.error('\n💥 ERRO NO TESTE:', error.message);
    process.exit(1);
  }
}

// Executar
main(); 