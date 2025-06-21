const { logger } = require('../config/logger');

/**
 * Validador de variáveis de ambiente obrigatórias
 * Garante que todas as configurações críticas estejam presentes
 */

// Variáveis obrigatórias para funcionamento básico
const REQUIRED_VARS = [
  'NODE_ENV',
  'MONGODB_URI',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

// Variáveis recomendadas para produção
const PRODUCTION_RECOMMENDED_VARS = [
  'PORT',
  'HOST',
  'CORS_ORIGIN',
  'BCRYPT_ROUNDS',
  'API_URL_PUBLIC'
];

// Variáveis opcionais mas úteis
const OPTIONAL_VARS = [
  'PUBLIC_IP',
  'LOCAL_IP',
  'API_URL_LOCAL',
  'JWT_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN'
];

/**
 * Valida se todas as variáveis obrigatórias estão definidas
 */
function validateRequiredVars() {
  console.log('\n🔍 ================ VALIDAÇÃO DE VARIÁVEIS ================');
  
  const missing = [];
  const present = [];
  
  // Verificar variáveis obrigatórias
  REQUIRED_VARS.forEach(varName => {
    if (!process.env[varName]) {
      missing.push(varName);
    } else {
      present.push(varName);
    }
  });
  
  // Log das variáveis obrigatórias
  console.log('📋 VARIÁVEIS OBRIGATÓRIAS:');
  present.forEach(varName => {
    console.log(`   ✅ ${varName}: Configurado`);
  });
  
  missing.forEach(varName => {
    console.log(`   ❌ ${varName}: NÃO CONFIGURADO`);
  });
  
  // Se há variáveis faltando, encerrar aplicação
  if (missing.length > 0) {
    logger.error('Environment validation failed', {
      category: 'startup',
      missingVars: missing,
      requiredVars: REQUIRED_VARS
    });
    
    console.log('\n🚨 ERRO CRÍTICO: Variáveis de ambiente obrigatórias não configuradas!');
    console.log('📝 Configure as seguintes variáveis antes de iniciar o servidor:');
    missing.forEach(varName => {
      console.log(`   • ${varName}`);
    });
    console.log('\n💡 Exemplo de configuração no Railway:');
    console.log('   NODE_ENV=production');
    console.log('   MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname');
    console.log('   JWT_SECRET=[GERAR_SECRET_FORTE_64_CHARS]');
    console.log('   JWT_REFRESH_SECRET=[GERAR_REFRESH_SECRET_FORTE_64_CHARS]');
    console.log('\n🔧 Encerrando aplicação...\n');
    
    process.exit(1);
  }
  
  // Verificar variáveis recomendadas para produção
  if (process.env.NODE_ENV === 'production') {
    console.log('\n📋 VARIÁVEIS RECOMENDADAS PARA PRODUÇÃO:');
    
    const missingProd = [];
    
    PRODUCTION_RECOMMENDED_VARS.forEach(varName => {
      if (!process.env[varName]) {
        missingProd.push(varName);
        console.log(`   ⚠️ ${varName}: NÃO CONFIGURADO (recomendado)`);
      } else {
        console.log(`   ✅ ${varName}: Configurado`);
      }
    });
    
    if (missingProd.length > 0) {
      logger.warn('Production environment missing recommended variables', {
        category: 'startup',
        missingRecommended: missingProd
      });
    }
  }
  
  // Log das variáveis opcionais
  console.log('\n📋 VARIÁVEIS OPCIONAIS:');
  OPTIONAL_VARS.forEach(varName => {
    if (process.env[varName]) {
      console.log(`   ✅ ${varName}: Configurado`);
    } else {
      console.log(`   ➖ ${varName}: Não configurado (opcional)`);
    }
  });
  
  console.log('=======================================================\n');
  
  logger.info('Environment validation completed successfully', {
    category: 'startup',
    requiredVarsCount: REQUIRED_VARS.length,
    presentVarsCount: present.length,
    environment: process.env.NODE_ENV
  });
  
  return true;
}

/**
 * Valida configurações específicas de produção
 */
function validateProductionConfig() {
  if (process.env.NODE_ENV !== 'production') {
    return true;
  }
  
  console.log('\n🔒 ============= VALIDAÇÃO DE PRODUÇÃO =============');
  
  const warnings = [];
  
  // Verificar se JWT secrets são diferentes dos de desenvolvimento
  const devJwtPattern = /_dev$|development|teste|test/i;
  
  if (devJwtPattern.test(process.env.JWT_SECRET || '')) {
    warnings.push('JWT_SECRET parece ser de desenvolvimento');
  }
  
  if (devJwtPattern.test(process.env.JWT_REFRESH_SECRET || '')) {
    warnings.push('JWT_REFRESH_SECRET parece ser de desenvolvimento');
  }
  
  // Verificar se MongoDB URI é de produção
  if (process.env.MONGODB_URI && process.env.MONGODB_URI.includes('localhost')) {
    warnings.push('MONGODB_URI aponta para localhost (deveria ser MongoDB Atlas)');
  }
  
  // Verificar CORS configuration
  if (!process.env.CORS_ORIGIN) {
    warnings.push('CORS_ORIGIN não configurado - pode causar problemas de conectividade');
  } else if (process.env.CORS_ORIGIN.includes('localhost')) {
    warnings.push('CORS_ORIGIN inclui localhost em produção');
  }
  
  // Log dos warnings
  if (warnings.length > 0) {
    console.log('⚠️ AVISOS DE PRODUÇÃO:');
    warnings.forEach(warning => {
      console.log(`   • ${warning}`);
    });
    
    logger.warn('Production configuration warnings detected', {
      category: 'startup',
      warnings
    });
  } else {
    console.log('✅ Configuração de produção válida');
  }
  
  console.log('===============================================\n');
  
  return warnings.length === 0;
}

/**
 * Executa validação completa do ambiente
 */
function validateEnvironment() {
  try {
    validateRequiredVars();
    validateProductionConfig();
    return true;
  } catch (error) {
    logger.error('Environment validation error', {
      category: 'startup',
      error: error.message
    });
    console.error('🚨 Erro na validação do ambiente:', error.message);
    process.exit(1);
  }
}

module.exports = {
  validateEnvironment,
  validateRequiredVars,
  validateProductionConfig,
  REQUIRED_VARS,
  PRODUCTION_RECOMMENDED_VARS,
  OPTIONAL_VARS
};