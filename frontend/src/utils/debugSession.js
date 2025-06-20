// Script de debug para testar sessão e conectividade
// Para ser executado no console do navegador

export const debugSession = async () => {
  console.log('🐛 INICIANDO DEBUG DE SESSÃO...');
  console.log('='.repeat(50));
  
  // 1. Verificar localStorage
  console.log('📦 VERIFICANDO LOCALSTORAGE:');
  const userSession = localStorage.getItem('userSession');
  const refreshToken = localStorage.getItem('refreshToken');
  
  console.log('userSession:', userSession ? 'EXISTS' : 'NOT_FOUND');
  console.log('refreshToken:', refreshToken ? 'EXISTS' : 'NOT_FOUND');
  
  if (userSession) {
    try {
      const parsed = JSON.parse(userSession);
      console.log('userSession parsed:', {
        hasUser: !!parsed.user,
        userName: parsed.user?.name,
        userEmail: parsed.user?.email,
        userRole: parsed.user?.role,
        hasAccessToken: !!parsed.accessToken,
        hasRefreshToken: !!parsed.refreshToken,
        loginTime: parsed.loginTime,
        expiresIn: parsed.expiresIn
      });
      
      // Calcular tempo desde login
      if (parsed.loginTime) {
        const loginTime = new Date(parsed.loginTime);
        const now = new Date();
        const timeDiff = now - loginTime;
        const minutes = Math.floor(timeDiff / (1000 * 60));
        console.log('⏱️ Tempo desde o login:', minutes, 'minutos');
      }
      
      console.log('🔑 Access Token (primeiros 50 chars):', parsed.accessToken?.substring(0, 50) + '...');
      console.log('📊 Tamanho dos dados:', JSON.stringify(parsed).length, 'caracteres');
    } catch (e) {
      console.error('❌ Erro ao fazer parse do userSession:', e);
    }
  }
  
  // Verificar todos os itens do localStorage
  console.log('\n🗄️ Todos os itens no localStorage:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key);
    console.log(`  ${key}: ${value ? `${value.length} caracteres` : 'null'}`);
  }
  
  console.log('='.repeat(50));
  
  // 2. Testar conectividade com backend
  console.log('🌐 TESTANDO CONECTIVIDADE:');
  try {
    const healthResponse = await fetch('http://localhost:3001/api/health');
    const healthData = await healthResponse.json();
    console.log('✅ Backend conectado:', healthData);
  } catch (error) {
    console.error('❌ Backend não conectado:', error);
    return;
  }
  
  console.log('='.repeat(50));
  
  // 3. Testar login manual
  console.log('🔐 TESTANDO LOGIN:');
  try {
    const loginResponse = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'admin@sistema-sementes.com',
        password: 'admin123456'
      })
    });
    
    const loginData = await loginResponse.json();
    console.log('✅ Login funcionando:', {
      success: loginData.success,
      hasUser: !!loginData.data?.user,
      userName: loginData.data?.user?.name,
      hasAccessToken: !!loginData.data?.accessToken,
      hasRefreshToken: !!loginData.data?.refreshToken || !!loginData.data?.security
    });
    
    // 4. Testar security-info com token
    const token = loginData.data?.accessToken;
    if (token) {
      console.log('='.repeat(50));
      console.log('🔍 TESTANDO SECURITY-INFO:');
      
      const securityResponse = await fetch('http://localhost:3001/api/auth/security-info', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const securityData = await securityResponse.json();
      console.log('✅ Security-info funcionando:', {
        success: securityData.success,
        hasUser: !!securityData.data?.user,
        userName: securityData.data?.user?.name
      });
    }
    
  } catch (error) {
    console.error('❌ Erro no teste de login:', error);
  }
  
  console.log('='.repeat(50));
  console.log('🐛 DEBUG CONCLUÍDO');
};

// Função para monitorar mudanças no localStorage
export const watchLocalStorage = () => {
  console.log('👁️ Iniciando monitoramento do localStorage...');
  
  // Override original localStorage methods
  const originalSetItem = localStorage.setItem;
  const originalRemoveItem = localStorage.removeItem;
  
  localStorage.setItem = function(key, value) {
    console.log('📝 localStorage.setItem:', key, `(${value.length} caracteres)`);
    originalSetItem.apply(this, arguments);
  };
  
  localStorage.removeItem = function(key) {
    console.log('🗑️ localStorage.removeItem:', key);
    originalRemoveItem.apply(this, arguments);
  };
  
  console.log('✅ Monitoramento ativo. Para parar, recarregue a página.');
};

// Função para testar login rápido
export const testLogin = async () => {
  console.log('🧪 Testando login com credenciais admin...');
  
  try {
    // Limpar localStorage antes do teste
    localStorage.removeItem('userSession');
    console.log('🗑️ localStorage limpo para teste');
    
    const response = await fetch('http://localhost:3001/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: 'admin@sistema-sementes.com',
        password: 'admin123456'
      })
    });
    
    const data = await response.json();
    console.log('📊 Resposta completa do login:', data);
    
    if (data.success) {
      console.log('✅ Login funcionando! Dados retornados:', {
        userName: data.data.user.name,
        userEmail: data.data.user.email,
        userRole: data.data.user.role,
        hasAccessToken: !!data.data.accessToken,
        accessTokenLength: data.data.accessToken?.length,
        hasRefreshToken: !!data.data.refreshToken,
        hasSecurityInfo: !!data.data.security
      });
      
      // Simular salvamento como o authService faria
      const sessionData = {
        user: {
          id: data.data.user.id,
          name: data.data.user.name,
          email: data.data.user.email,
          role: data.data.user.role,
          isActive: data.data.user.isActive
        },
        accessToken: data.data.accessToken,
        refreshToken: data.data.refreshToken || null,
        loginTime: new Date().toISOString(),
        expiresIn: data.data.expiresIn || '7d'
      };
      
      localStorage.setItem('userSession', JSON.stringify(sessionData));
      console.log('💾 Dados salvos no localStorage para teste');
      
      // Verificar se consegue recuperar
      const saved = localStorage.getItem('userSession');
      if (saved) {
        const parsed = JSON.parse(saved);
        console.log('✅ Recuperação teste bem-sucedida:', {
          hasUser: !!parsed.user,
          userName: parsed.user?.name,
          hasAccessToken: !!parsed.accessToken
        });
      }
      
    } else {
      console.log('❌ Login falhou:', data.message);
    }
  } catch (error) {
    console.log('❌ Erro no teste de login:', error);
  }
};

// Para usar no console
window.debugSession = debugSession; 
window.watchLocalStorage = watchLocalStorage;
window.testLogin = testLogin;

console.log('🛠️ Scripts de debug carregados:');
console.log('  - debugSession() - Debug completo');
console.log('  - watchLocalStorage() - Monitorar mudanças');
console.log('  - testLogin() - Testar login direto'); 