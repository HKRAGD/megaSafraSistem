const axios = require('axios');

async function testProductPriority() {
  try {
    console.log('🔍 Testando priorização de produtos...\n');

    // Login
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@megasafra.com',
      password: 'admin123'
    });

    const token = loginResponse.data.data.accessToken;
    console.log('✅ Login realizado com sucesso');

    // Buscar produtos
    const productsResponse = await axios.get('http://localhost:3001/api/products?limit=10', {
      headers: { 'Authorization': `Bearer ${token}` }
    });

    const products = productsResponse.data.data.products;
    console.log(`\n📦 Produtos encontrados: ${products.length}`);
    
    products.forEach((product, index) => {
      const priority = product.status === 'AGUARDANDO_LOCACAO' ? '🔴 ALTA' : 
                      product.status === 'AGUARDANDO_RETIRADA' ? '🟠 MÉDIA' : '🟢 BAIXA';
      console.log(`${index + 1}. ${product.name} | Status: ${product.status} | Prioridade: ${priority}`);
    });

    // Verificar se produtos aguardando estão primeiro
    const priorityProducts = products.filter(p => ['AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA'].includes(p.status));
    console.log(`\n✅ Produtos prioritários encontrados: ${priorityProducts.length}`);
    
    // Verificar ordem correta
    const firstNonPriority = products.findIndex(p => !['AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA'].includes(p.status));
    const lastPriority = products.map((p, i) => ({ ...p, index: i }))
                                  .filter(p => ['AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA'].includes(p.status))
                                  .pop();
    
    if (priorityProducts.length > 0) {
      if (firstNonPriority === -1 || (lastPriority && lastPriority.index < firstNonPriority)) {
        console.log('✅ PRIORIZAÇÃO FUNCIONANDO: Produtos aguardando aparecem primeiro!');
      } else {
        console.log('❌ PROBLEMA: Produtos aguardando NÃO estão em primeiro!');
      }
    } else {
      console.log('ℹ️  Nenhum produto aguardando localização/retirada encontrado no momento');
    }
    
  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
  }
}

testProductPriority(); 