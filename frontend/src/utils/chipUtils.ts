/**
 * Utilitários para garantir props válidas em componentes Chip
 */

/**
 * Sanitiza props de Chip para evitar erros de onClick inválido
 * @param props - Props originais do Chip
 * @returns Props sanitizadas e seguras
 */
export const sanitizeChipProps = (props: any) => {
  if (!props) return {};

  const {
    onClick,
    onDelete,
    ...restProps
  } = props;

  return {
    ...restProps,
    // Só inclui onClick se for uma função válida
    ...(typeof onClick === 'function' && { onClick }),
    // Só inclui onDelete se for uma função válida
    ...(typeof onDelete === 'function' && { onDelete }),
  };
};

/**
 * Sanitiza props retornadas por getTagProps do Autocomplete
 * @param getTagProps - Função getTagProps do Autocomplete
 * @param index - Índice do item
 * @returns Props sanitizadas e seguras para o Chip
 */
export const safeGetTagProps = (getTagProps: any, index: number) => {
  if (typeof getTagProps !== 'function') return {};
  
  try {
    const tagProps = getTagProps({ index });
    return sanitizeChipProps(tagProps);
  } catch (error) {
    console.warn('Erro ao obter tag props:', error);
    return {};
  }
};

/**
 * Cria props seguras para Chip com validação completa
 * @param props - Props originais
 * @returns Props validadas e seguras
 */
export const createSafeChipProps = (props: any = {}) => {
  const {
    onClick,
    onDelete,
    onKeyDown,
    onMouseDown,
    onMouseUp,
    onTouchStart,
    onTouchEnd,
    ...restProps
  } = props;

  const safeProps: any = { ...restProps };

  // Validar e incluir apenas funções válidas
  if (typeof onClick === 'function') {
    safeProps.onClick = onClick;
  }
  
  if (typeof onDelete === 'function') {
    safeProps.onDelete = onDelete;
  }
  
  if (typeof onKeyDown === 'function') {
    safeProps.onKeyDown = onKeyDown;
  }
  
  if (typeof onMouseDown === 'function') {
    safeProps.onMouseDown = onMouseDown;
  }
  
  if (typeof onMouseUp === 'function') {
    safeProps.onMouseUp = onMouseUp;
  }
  
  if (typeof onTouchStart === 'function') {
    safeProps.onTouchStart = onTouchStart;
  }
  
  if (typeof onTouchEnd === 'function') {
    safeProps.onTouchEnd = onTouchEnd;
  }

  return safeProps;
};

/**
 * Wrapper seguro para renderOption do Autocomplete
 * @param renderFunction - Função de render original
 * @returns Função de render protegida
 */
export const createSafeRenderOption = (renderFunction: (props: any, option: any) => React.ReactNode) => {
  return (props: any, option: any) => {
    const safeProps = sanitizeChipProps(props);
    return renderFunction(safeProps, option);
  };
};

/**
 * Função de debug para interceptar e logar erros de onClick
 * Adiciona logs detalhados para identificar a fonte do problema
 */
export const debugChipProps = (props: any, componentName: string = 'Unknown') => {
  if (!props) {
    console.warn(`[ChipDebug] ${componentName}: Props são null/undefined`);
    return {};
  }

  const { onClick, onDelete, ...restProps } = props;

  // Log detalhado das props
  console.log(`[ChipDebug] ${componentName}:`, {
    hasOnClick: onClick !== undefined,
    onClickType: typeof onClick,
    onClickValue: onClick,
    hasOnDelete: onDelete !== undefined,
    onDeleteType: typeof onDelete,
    onDeleteValue: onDelete,
    allProps: Object.keys(props)
  });

  // Verificar se onClick é inválido
  if (onClick !== undefined && typeof onClick !== 'function') {
    console.error(`[ChipDebug] ${componentName}: onClick inválido detectado!`, {
      onClick,
      type: typeof onClick,
      stack: new Error().stack
    });
  }

  // Verificar se onDelete é inválido
  if (onDelete !== undefined && typeof onDelete !== 'function') {
    console.error(`[ChipDebug] ${componentName}: onDelete inválido detectado!`, {
      onDelete,
      type: typeof onDelete,
      stack: new Error().stack
    });
  }

  return sanitizeChipProps(props);
};

// Variável para controlar se o interceptador está ativo
let errorHandlerInstalled = false;
let originalConsoleError: any = null;

/**
 * Interceptador global de erros para Chip
 * Instala um handler global para capturar erros de onClick
 */
export const installChipErrorHandler = () => {
  if (errorHandlerInstalled) {
    console.log('🔧 [ChipDebug] Error handler já está instalado');
    return;
  }

  originalConsoleError = console.error;
  
  console.error = (...args: any[]) => {
    const message = args[0];
    
    if (typeof message === 'string' && message.includes('onClick is not a function')) {
      // USAR originalConsoleError para evitar loop infinito
      originalConsoleError.call(console, '🚨 [CHIP ERROR INTERCEPTED] onClick is not a function detectado!');
      originalConsoleError.call(console, 'Stack trace completo:', new Error().stack);
      originalConsoleError.call(console, 'Argumentos do erro original:', args);
      
      // Tentar identificar o componente através do stack trace
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        const relevantLines = lines.filter(line => 
          line.includes('.tsx') || line.includes('.jsx') || line.includes('Chip')
        );
        originalConsoleError.call(console, '🔍 Possíveis componentes envolvidos:', relevantLines);
        
        // Tentar identificar especificamente componentes do projeto
        const projectLines = lines.filter(line => 
          line.includes('src/') && (line.includes('.tsx') || line.includes('.jsx'))
        );
        if (projectLines.length > 0) {
          originalConsoleError.call(console, '🎯 Componentes do projeto:', projectLines);
        }
      }
      
      // Adicionar informações sobre o DOM atual
      try {
        const activeElement = document.activeElement;
        if (activeElement) {
          originalConsoleError.call(console, '🎯 Elemento ativo no DOM:', {
            tagName: activeElement.tagName,
            className: activeElement.className,
            id: activeElement.id,
            innerHTML: activeElement.innerHTML?.substring(0, 100) + '...'
          });
        }
      } catch (e) {
        originalConsoleError.call(console, 'Erro ao obter elemento ativo:', e);
      }
    }
    
    // Chamar o console.error original
    originalConsoleError.apply(console, args);
  };
  
  errorHandlerInstalled = true;
  console.log('🔧 [ChipDebug] Error handler instalado para interceptar erros de onClick');
};

/**
 * Remove o interceptador de erros
 */
export const uninstallChipErrorHandler = () => {
  if (!errorHandlerInstalled || !originalConsoleError) {
    console.log('🔧 [ChipDebug] Error handler não está instalado');
    return;
  }

  console.error = originalConsoleError;
  errorHandlerInstalled = false;
  originalConsoleError = null;
  console.log('🔧 [ChipDebug] Error handler removido');
};

/**
 * Verifica se o interceptador está ativo
 */
export const isChipErrorHandlerInstalled = () => errorHandlerInstalled;

/**
 * Função de teste para identificar problemas com Chips
 * Executa uma série de testes para identificar onde está o problema
 */
export const testChipIssues = () => {
  console.log('🧪 [ChipTest] Iniciando testes de diagnóstico...');
  
  // Teste 1: Verificar se há elementos Chip no DOM
  const chipElements = document.querySelectorAll('[class*="MuiChip"]');
  console.log(`🧪 [ChipTest] Encontrados ${chipElements.length} elementos Chip no DOM`);
  
  // Teste 2: Verificar se há elementos com onClick problemático
  chipElements.forEach((element, index) => {
    const onClick = (element as any).onclick;
    if (onClick !== null && typeof onClick !== 'function') {
      console.error(`🧪 [ChipTest] Chip ${index} tem onClick inválido:`, {
        element,
        onClick,
        type: typeof onClick
      });
    }
  });
  
  // Teste 3: Verificar se há Autocomplete no DOM
  const autocompleteElements = document.querySelectorAll('[class*="MuiAutocomplete"]');
  console.log(`🧪 [ChipTest] Encontrados ${autocompleteElements.length} elementos Autocomplete no DOM`);
  
  // Teste 4: Verificar se o interceptador está funcionando
  console.log(`🧪 [ChipTest] Error handler instalado: ${errorHandlerInstalled}`);
  
  // Teste 5: Simular erro para testar interceptador
  try {
    const testError = new Error('onClick is not a function - TESTE');
    console.error(testError.message);
  } catch (e) {
    console.log('🧪 [ChipTest] Erro no teste de simulação:', e);
  }
  
  console.log('🧪 [ChipTest] Testes concluídos. Verifique os logs acima.');
};

/**
 * Monitora mudanças no DOM para detectar novos Chips problemáticos
 */
export const startChipMonitoring = () => {
  if (typeof window === 'undefined' || !window.MutationObserver) {
    console.warn('🔍 [ChipMonitor] MutationObserver não disponível');
    return;
  }

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Verificar se é um Chip ou contém Chips
            const chips = element.classList.contains('MuiChip-root') 
              ? [element] 
              : element.querySelectorAll('.MuiChip-root');
            
            chips.forEach((chip) => {
              const onClick = (chip as any).onclick;
              if (onClick !== null && typeof onClick !== 'function') {
                console.error('🔍 [ChipMonitor] Novo Chip com onClick inválido detectado:', {
                  chip,
                  onClick,
                  type: typeof onClick
                });
              }
            });
          }
        });
      }
    });
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  console.log('🔍 [ChipMonitor] Monitoramento de DOM iniciado');
  
  return () => {
    observer.disconnect();
    console.log('🔍 [ChipMonitor] Monitoramento de DOM parado');
  };
}; 