const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@sistema-sementes.com',
  password: 'admin123456'
};

// Simular a função de mapeamento do frontend
const mapApiProductToProductWithRelations = (apiProduct) => {
  const mapped = {
    // Dados básicos do produto
    id: apiProduct._id || apiProduct.id,
    name: apiProduct.name,
    lot: apiProduct.lot,
    seedTypeId: (() => {
      const seedTypeData = apiProduct.seedType || apiProduct.seedTypeId;
      return typeof seedTypeData === 'object' ? (seedTypeData._id || seedTypeData.id) : seedTypeData;
    })(),
    quantity: apiProduct.quantity,
    storageType: apiProduct.storageType,
    weightPerUnit: apiProduct.weightPerUnit,
    totalWeight: apiProduct.totalWeight || apiProduct.calculatedTotalWeight,
    locationId: (() => {
      const locationData = apiProduct.location || apiProduct.locationId;
      return typeof locationData === 'object' ? (locationData._id || locationData.id) : locationData;
    })(),
    entryDate: apiProduct.entryDate,
    expirationDate: apiProduct.expirationDate,
    status: apiProduct.status,
    notes: apiProduct.notes,
    tracking: apiProduct.tracking,
    metadata: apiProduct.metadata,
    calculatedTotalWeight: apiProduct.calculatedTotalWeight || apiProduct.totalWeight,
    isNearExpiration: apiProduct.isNearExpiration || false,
    expirationStatus: apiProduct.expirationStatus || 'good',
    storageTimeDays: apiProduct.storageTimeDays || 0,
    createdAt: apiProduct.createdAt,
    updatedAt: apiProduct.updatedAt,

    // Relacionamentos mapeados - Lidar com diferentes estruturas da API
    seedType: (() => {
      // A API pode retornar tanto seedType quanto seedTypeId
      const seedTypeData = apiProduct.seedType || apiProduct.seedTypeId;
      if (seedTypeData && typeof seedTypeData === 'object') {
        return {
          id: seedTypeData._id || seedTypeData.id,
          name: seedTypeData.name,
        };
      }
      return undefined;
    })(),

    location: (() => {
      // A API pode retornar tanto location quanto locationId
      const locationData = apiProduct.location || apiProduct.locationId;
      if (locationData && typeof locationData === 'object') {
        return {
          id: locationData._id || locationData.id,
          code: locationData.code,
          maxCapacityKg: locationData.maxCapacityKg,
          currentWeightKg: locationData.currentWeightKg,
          chamber: (() => {
            // A câmara pode estar em chamberId ou diretamente em chamber
            const chamberData = locationData.chamberId || locationData.chamber;
            if (chamberData && typeof chamberData === 'object') {
              return {
                id: chamberData._id || chamberData.id,
                name: chamberData.name,
              };
            }
            return undefined;
          })(),
        };
      }
      return undefined;
    })(),
  };

  return mapped;
};

async function testFrontendIntegration() {
  console.log('🧪 Testando integração Frontend-Backend...\n');

  try {
    // 1. Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.data.accessToken;
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. GET produtos (simulando useProducts fetchProducts)
    console.log('📋 1️⃣ Testando fetchProducts (como useProducts)...');
    const listResponse = await axios.get(`${BASE_URL}/products`, { headers: authHeaders });
    
    const apiProducts = listResponse.data.data?.products || [];
    console.log(`✅ ${apiProducts.length} produtos recebidos da API`);
    
    if (apiProducts.length > 0) {
      const firstApiProduct = apiProducts[0];
      console.log('\n🔄 Testando mapeamento do primeiro produto da lista...');
      const mappedProductFromList = mapApiProductToProductWithRelations(firstApiProduct);
      
      console.log('📦 Produto da lista mapeado:');
      console.log('- id:', mappedProductFromList.id);
      console.log('- name:', mappedProductFromList.name);
      console.log('- seedType.name:', mappedProductFromList.seedType?.name);
      console.log('- location.code:', mappedProductFromList.location?.code);
      console.log('- location.chamber.name:', mappedProductFromList.location?.chamber?.name);
      
      // 3. GET produto específico (simulando useProducts getProduct)
      const productId = firstApiProduct._id || firstApiProduct.id;
      console.log(`\n🔍 2️⃣ Testando getProduct com ID: ${productId}`);
      
      const detailResponse = await axios.get(`${BASE_URL}/products/${productId}`, { headers: authHeaders });
      
      // Simular exatamente como o frontend faz
      const apiData = detailResponse.data;
      console.log('🔍 DEBUG getProduct - Resposta da API recebida');
      
      const apiProduct = apiData?.data?.product || apiData?.product || apiData;
      
      if (!apiProduct) {
        console.error('❌ Produto não encontrado na resposta da API');
        console.error('📋 Estrutura recebida:', JSON.stringify(apiData, null, 2));
        return;
      }
      
      console.log('📦 Produto da API antes do mapeamento encontrado');
      
      // Mapear produto
      const mappedProduct = mapApiProductToProductWithRelations(apiProduct);
      
      console.log('\n✅ Produto detalhado mapeado com sucesso:');
      console.log('- id:', mappedProduct.id);
      console.log('- name:', mappedProduct.name);
      console.log('- lot:', mappedProduct.lot);
      console.log('- quantity:', mappedProduct.quantity);
      console.log('- totalWeight:', mappedProduct.totalWeight);
      console.log('- seedType.id:', mappedProduct.seedType?.id);
      console.log('- seedType.name:', mappedProduct.seedType?.name);
      console.log('- location.id:', mappedProduct.location?.id);
      console.log('- location.code:', mappedProduct.location?.code);
      console.log('- location.chamber.id:', mappedProduct.location?.chamber?.id);
      console.log('- location.chamber.name:', mappedProduct.location?.chamber?.name);
      
      // 4. Verificar se ProductDetails receberia dados corretos
      console.log('\n🎯 3️⃣ Verificando se ProductDetails teria dados para exibir:');
      
      const productDetailsData = {
        hasBasicInfo: !!(mappedProduct.id && mappedProduct.name && mappedProduct.lot),
        hasQuantityData: !!(mappedProduct.quantity && mappedProduct.totalWeight),
        hasSeedType: !!(mappedProduct.seedType?.name),
        hasLocation: !!(mappedProduct.location?.code),
        hasChamber: !!(mappedProduct.location?.chamber?.name),
        hasStatus: !!mappedProduct.status,
      };
      
      console.log('Verificação ProductDetails:');
      Object.entries(productDetailsData).forEach(([key, value]) => {
        console.log(`${value ? '✅' : '❌'} ${key}: ${value}`);
      });
      
      if (Object.values(productDetailsData).every(Boolean)) {
        console.log('\n🎉 SUCESSO! Todos os dados necessários estão disponíveis!');
        console.log('🚀 Os modais de produtos devem funcionar corretamente agora!');
      } else {
        console.log('\n⚠️ Alguns dados ainda estão faltando para o ProductDetails');
      }
      
    } else {
      console.log('❌ Nenhum produto encontrado para testar');
    }
    
  } catch (error) {
    console.error('❌ Erro no teste:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

testFrontendIntegration(); 