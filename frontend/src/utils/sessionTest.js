// Teste simples da recuperação de sessão
// Para ser executado no console do navegador

const testSessionRecovery = async () => {
  console.log('🧪 Testando recuperação de sessão...');
  
  // 1. Verificar se há refresh token
  const refreshToken = localStorage.getItem('refreshToken');
  console.log('📄 Refresh token encontrado:', !!refreshToken);
  
  if (!refreshToken) {
    console.log('❌ Nenhum refresh token para testar');
    return;
  }
  
  // 2. Testar renovação direta
  try {
    const response = await fetch('http://localhost:3001/api/auth/refresh', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ refreshToken })
    });
    
    const data = await response.json();
    console.log('🔄 Resposta do refresh:', data);
    
    if (data.success) {
      const accessToken = data.data.accessToken;
      console.log('✅ Access token obtido');
      
      // 3. Testar security-info
      const securityResponse = await fetch('http://localhost:3001/api/auth/security-info', {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      const securityData = await securityResponse.json();
      console.log('👤 Dados do usuário:', securityData);
      
      if (securityData.success && securityData.data.user) {
        console.log('✅ TESTE PASSOU: Sessão pode ser recuperada');
        console.log('👤 Usuário:', securityData.data.user.name);
      } else {
        console.log('❌ TESTE FALHOU: Não conseguiu obter dados do usuário');
      }
    } else {
      console.log('❌ TESTE FALHOU: Não conseguiu renovar token');
    }
    
  } catch (error) {
    console.error('❌ ERRO NO TESTE:', error);
  }
};

// Executar o teste
window.testSessionRecovery = testSessionRecovery;
console.log('🧪 Função testSessionRecovery() disponível. Execute no console: testSessionRecovery()'); 