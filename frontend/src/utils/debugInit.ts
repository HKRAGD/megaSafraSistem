/**
 * Inicialização do Sistema de Debug para Chips
 * 
 * Este arquivo ativa automaticamente o sistema de debug avançado para
 * componentes Chip do Material-UI em ambiente de desenvolvimento.
 * 
 * FUNCIONALIDADES:
 * - Interceptador global de erros "onClick is not a function"
 * - Monitoramento de DOM em tempo real
 * - Funções de debug disponíveis no console
 * - Logs detalhados para identificar problemas
 */

import { 
  installChipErrorHandler, 
  startChipMonitoring, 
  testChipIssues,
  isChipErrorHandlerInstalled 
} from './chipUtils';

/**
 * Ativa o sistema de debug completo para Chips
 * Só é executado em ambiente de desenvolvimento
 */
export const initializeChipDebugSystem = () => {
  // Só ativar em desenvolvimento
  if (process.env.NODE_ENV !== 'development') {
    return;
  }

  console.log('🔧 [ChipDebug] Inicializando sistema de debug para Material-UI Chips...');

  try {
    // 1. Instalar interceptador de erros
    if (!isChipErrorHandlerInstalled()) {
      installChipErrorHandler();
      console.log('✅ [ChipDebug] Interceptador de erros instalado');
    } else {
      console.log('ℹ️ [ChipDebug] Interceptador já estava instalado');
    }

    // 2. Iniciar monitoramento de DOM
    const stopMonitoring = startChipMonitoring();
    console.log('✅ [ChipDebug] Monitoramento de DOM iniciado');

    // 3. Disponibilizar função de teste no console global
    if (typeof window !== 'undefined') {
      (window as any).testChipIssues = testChipIssues;
      (window as any).debugChips = () => {
        console.log('🧪 [ChipDebug] Executando diagnóstico completo...');
        testChipIssues();
      };
      console.log('✅ [ChipDebug] Funções de debug disponíveis no console:');
      console.log('   - testChipIssues() : Executa diagnóstico completo');
      console.log('   - debugChips() : Alias para testChipIssues()');
    }

    // 4. Log de status final
    console.log('🎯 [ChipDebug] Sistema de debug completamente ativo!');
    console.log('📋 [ChipDebug] Para diagnosticar problemas, execute: testChipIssues()');
    
    // 5. Sistema pronto - teste disponível manualmente
    console.log('🔍 [ChipDebug] Sistema pronto! Execute testChipIssues() manualmente se necessário.');

    // 6. Retornar função de cleanup (opcional)
    return {
      stop: () => {
        if (stopMonitoring) stopMonitoring();
        console.log('🛑 [ChipDebug] Sistema de debug desativado');
      }
    };

  } catch (error) {
    console.error('❌ [ChipDebug] Erro ao inicializar sistema de debug:', error);
  }
};

/**
 * Configuração automática para projetos React
 * Detecta se está em ambiente React e inicializa automaticamente
 */
export const autoInitializeIfDevelopment = () => {
  if (process.env.NODE_ENV === 'development') {
    // Aguardar um pouco para garantir que o DOM está pronto
    if (typeof window !== 'undefined') {
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeChipDebugSystem);
      } else {
        // DOM já está pronto
        setTimeout(initializeChipDebugSystem, 100);
      }
    }
  }
};

/**
 * Informações do sistema de debug
 */
export const getDebugSystemInfo = () => {
  return {
    isProduction: process.env.NODE_ENV === 'production',
    isDevelopment: process.env.NODE_ENV === 'development',
    isHandlerInstalled: isChipErrorHandlerInstalled(),
    hasTestFunction: typeof (window as any)?.testChipIssues === 'function',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  };
};

// Auto-inicialização para ambientes de desenvolvimento
autoInitializeIfDevelopment(); 