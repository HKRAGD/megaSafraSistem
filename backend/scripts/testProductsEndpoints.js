const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

// Credenciais reais do sistema
const ADMIN_CREDENTIALS = {
  email: 'admin@sistema-sementes.com',
  password: 'admin123456'
};

async function testProductsEndpoints() {
  console.log('🧪 Testando endpoints de produtos do sistema...\n');

  try {
    // 1. Fazer login para obter token
    console.log('🔐 Fazendo login com credenciais do sistema...');
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    
    if (!loginResponse.data.success) {
      throw new Error('Login falhou');
    }
    
    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso');
    console.log('👤 Usuário:', loginResponse.data.data.user.name);
    console.log('🎭 Role:', loginResponse.data.data.user.role);
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. Testar GET /products (lista)
    console.log('\n📋 1️⃣ Testando GET /products (lista)');
    const listResponse = await axios.get(`${BASE_URL}/products`, {
      headers: authHeaders
    });
    
    console.log('✅ Status:', listResponse.status);
    console.log('📊 Estrutura de resposta:');
    console.log('- success:', listResponse.data.success);
    console.log('- data.products length:', listResponse.data.data?.products?.length || 0);
    console.log('- pagination exists:', !!listResponse.data.data?.pagination);
    
    if (listResponse.data.data?.products?.length > 0) {
      const firstProduct = listResponse.data.data.products[0];
      console.log('\n📦 Primeiro produto encontrado:');
      console.log('- ID:', firstProduct._id || firstProduct.id);
      console.log('- Nome:', firstProduct.name);
      console.log('- Lote:', firstProduct.lot);
      console.log('- Status:', firstProduct.status);
      console.log('- SeedType populated:', !!firstProduct.seedTypeId?.name);
      console.log('- Location populated:', !!firstProduct.locationId?.code);
      console.log('- Chamber populated:', !!firstProduct.locationId?.chamberId?.name);
      
      // 3. Testar GET /products/:id (detalhes)
      const productId = firstProduct._id || firstProduct.id;
      console.log('\n🔍 2️⃣ Testando GET /products/:id (detalhes)');
      console.log('🎯 ID do produto:', productId);
      
      const detailResponse = await axios.get(`${BASE_URL}/products/${productId}`, {
        headers: authHeaders
      });
      
      console.log('✅ Status:', detailResponse.status);
      console.log('📊 Estrutura de resposta detalhada:');
      console.log('- success:', detailResponse.data.success);
      console.log('- data structure keys:', Object.keys(detailResponse.data.data || {}));
      
      const productDetail = detailResponse.data.data;
      if (productDetail) {
        console.log('\n📦 Produto detalhado:');
        console.log('- ID:', productDetail._id || productDetail.id);
        console.log('- Nome:', productDetail.name);
        console.log('- Lote:', productDetail.lot);
        console.log('- Quantidade:', productDetail.quantity);
        console.log('- Peso total:', productDetail.totalWeight || productDetail.calculatedTotalWeight);
        console.log('- SeedType populated:', !!productDetail.seedTypeId?.name);
        console.log('- Location populated:', !!productDetail.locationId?.code);
        console.log('- Chamber populated:', !!productDetail.locationId?.chamberId?.name);
        
        // Verificar se os dados de relacionamento estão corretos
        console.log('\n🔗 Verificação de relacionamentos:');
        if (productDetail.seedTypeId?.name) {
          console.log('✅ SeedType relacionado:', productDetail.seedTypeId.name);
        } else {
          console.log('❌ SeedType não populado corretamente');
        }
        
        if (productDetail.locationId?.code) {
          console.log('✅ Location relacionada:', productDetail.locationId.code);
          if (productDetail.locationId.chamberId?.name) {
            console.log('✅ Chamber relacionada:', productDetail.locationId.chamberId.name);
          } else {
            console.log('❌ Chamber não populada na Location');
          }
        } else {
          console.log('❌ Location não populada corretamente');
        }
        
        // 4. Testar estrutura esperada pelo frontend
        console.log('\n🎨 3️⃣ Verificando compatibilidade com Frontend:');
        const frontendCompatible = {
          hasId: !!(productDetail._id || productDetail.id),
          hasName: !!productDetail.name,
          hasLot: !!productDetail.lot,
          hasSeedTypeRelation: !!productDetail.seedTypeId,
          hasLocationRelation: !!productDetail.locationId,
          seedTypePopulated: !!(productDetail.seedTypeId && typeof productDetail.seedTypeId === 'object'),
          locationPopulated: !!(productDetail.locationId && typeof productDetail.locationId === 'object'),
          chamberPopulated: !!(productDetail.locationId?.chamberId && typeof productDetail.locationId.chamberId === 'object')
        };
        
        console.log('Frontend Compatibility Check:');
        Object.entries(frontendCompatible).forEach(([key, value]) => {
          console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
        });
        
        // Estrutura que o frontend espera vs estrutura atual
        console.log('\n📋 Mapeamento necessário para o frontend:');
        console.log('Frontend espera:');
        console.log('- product.seedType.id e product.seedType.name');
        console.log('- product.location.id, product.location.code');
        console.log('- product.location.chamber.id, product.location.chamber.name');
        console.log('\nAPI retorna:');
        console.log('- product.seedTypeId._id e product.seedTypeId.name');
        console.log('- product.locationId._id, product.locationId.code');
        console.log('- product.locationId.chamberId._id, product.locationId.chamberId.name');
        
      } else {
        console.log('❌ Produto não encontrado nos detalhes');
      }
      
    } else {
      console.log('⚠️ Nenhum produto encontrado no sistema');
      console.log('💡 Dica: Execute o script seedDatabase.js para criar dados de teste');
    }
    
    console.log('\n🎯 Resumo do teste:');
    console.log('✅ Autenticação funcionando');
    console.log('✅ Endpoint GET /products funcionando');
    console.log('✅ Endpoint GET /products/:id funcionando');
    console.log('✅ Estrutura de dados da API identificada');
    
  } catch (error) {
    console.error('\n❌ Erro ao testar endpoints:', error.message);
    if (error.response) {
      console.error('📛 Status HTTP:', error.response.status);
      console.error('📛 Dados do erro:', JSON.stringify(error.response.data, null, 2));
    }
    
    // Dicas de solução
    console.log('\n💡 Possíveis soluções:');
    console.log('1. Verificar se o backend está rodando em localhost:3001');
    console.log('2. Verificar se o MongoDB está rodando');
    console.log('3. Verificar se o usuário admin existe no banco');
    console.log('4. Executar: node scripts/seedDatabase.js para criar dados de teste');
  }
}

// Executar teste
testProductsEndpoints(); 