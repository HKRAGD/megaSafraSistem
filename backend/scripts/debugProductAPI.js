const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';
const ADMIN_CREDENTIALS = {
  email: 'admin@sistema-sementes.com',
  password: 'admin123456'
};

async function debugProductAPI() {
  console.log('🔍 DEBUG - Analisando resposta da API de produtos...\n');

  try {
    // 1. Login
    const loginResponse = await axios.post(`${BASE_URL}/auth/login`, ADMIN_CREDENTIALS);
    const token = loginResponse.data.data.accessToken;
    
    const authHeaders = {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };

    // 2. GET produtos para pegar ID
    const listResponse = await axios.get(`${BASE_URL}/products`, { headers: authHeaders });
    
    if (listResponse.data.data?.products?.length > 0) {
      const productId = listResponse.data.data.products[0]._id;
      console.log('🎯 Testando produto ID:', productId);
      
      // 3. GET produto específico
      const detailResponse = await axios.get(`${BASE_URL}/products/${productId}`, { headers: authHeaders });
      
      console.log('\n📋 RESPOSTA COMPLETA DA API:');
      console.log('=====================================');
      console.log(JSON.stringify(detailResponse.data, null, 2));
      console.log('=====================================');
      
      // 4. Analisar estrutura
      const { data } = detailResponse.data;
      
      console.log('\n🔍 ANÁLISE DA ESTRUTURA:');
      console.log('- success:', detailResponse.data.success);
      console.log('- data existe:', !!data);
      console.log('- data.product existe:', !!data?.product);
      console.log('- data.relatedData existe:', !!data?.relatedData);
      
      if (data?.product) {
        const product = data.product;
        console.log('\n📦 PRODUTO ENCONTRADO:');
        console.log('- id:', product.id);
        console.log('- name:', product.name);
        console.log('- lot:', product.lot);
        console.log('- seedType:', !!product.seedType);
        console.log('- location:', !!product.location);
        
        if (product.seedType) {
          console.log('  - seedType.id:', product.seedType.id || product.seedType._id);
          console.log('  - seedType.name:', product.seedType.name);
        }
        
        if (product.location) {
          console.log('  - location.id:', product.location.id || product.location._id);
          console.log('  - location.code:', product.location.code);
          if (product.location.chamber) {
            console.log('  - location.chamber.name:', product.location.chamber.name);
          }
        }
      } else {
        console.log('\n❌ PRODUTO NÃO ENCONTRADO NA ESTRUTURA ESPERADA');
      }
      
    } else {
      console.log('❌ Nenhum produto encontrado para testar');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
  }
}

debugProductAPI(); 