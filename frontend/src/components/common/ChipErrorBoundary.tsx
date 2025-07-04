import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
  lastErrorTime?: number;
  isInfiniteLoop: boolean;
  isCircuitBreakerActive: boolean;
  circuitBreakerActivatedAt?: number;
}

class ChipErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { 
      hasError: false, 
      errorCount: 0,
      isInfiniteLoop: false,
      isCircuitBreakerActive: false
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    const now = Date.now();
    const isInfiniteLoop = error.message.includes('Maximum update depth exceeded') || 
                          error.message.includes('setState inside componentWillUpdate') ||
                          error.message.includes('setState inside componentDidUpdate');
    
    return { 
      hasError: true, 
      error,
      errorCount: 1,
      lastErrorTime: now,
      isInfiniteLoop
    };
  }

  private readonly CIRCUIT_BREAKER_THRESHOLD = 5; // 5 erros para ativar circuit breaker
  private readonly CIRCUIT_BREAKER_COOLDOWN = 10000; // 10 segundos de cooldown
  private readonly INFINITE_LOOP_THRESHOLD = 3; // 3 loops infinitos consecutivos

  private shouldActivateCircuitBreaker(): boolean {
    const { errorCount, isInfiniteLoop, lastErrorTime } = this.state;
    const now = Date.now();
    const timeSinceLastError = lastErrorTime ? now - lastErrorTime : Infinity;
    
    // Ativação por muitos erros gerais
    if (errorCount >= this.CIRCUIT_BREAKER_THRESHOLD) {
      return true;
    }
    
    // Ativação por loops infinitos consecutivos
    if (isInfiniteLoop && errorCount >= this.INFINITE_LOOP_THRESHOLD) {
      return true;
    }
    
    // Ativação por erros muito rápidos (indica loop)
    if (timeSinceLastError < 50 && errorCount >= 2) {
      return true;
    }
    
    return false;
  }

  private isCircuitBreakerCooledDown(): boolean {
    const { circuitBreakerActivatedAt } = this.state;
    if (!circuitBreakerActivatedAt) return true;
    
    const now = Date.now();
    return (now - circuitBreakerActivatedAt) >= this.CIRCUIT_BREAKER_COOLDOWN;
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const now = Date.now();
    const timeSinceLastError = this.state.lastErrorTime ? now - this.state.lastErrorTime : Infinity;
    const isRapidError = timeSinceLastError < 100; // Erros em menos de 100ms indicam loop
    
    // Verificar se circuit breaker deve ser ativado
    const shouldActivate = this.shouldActivateCircuitBreaker();
    
    // Detectar diferentes tipos de erro
    const isOnClickError = error.message.includes('onClick is not a function');
    const isInfiniteLoopError = this.state.isInfiniteLoop;
    const isFormControlError = error.stack?.includes('FormControl') || error.stack?.includes('InputBase');
    
    // Circuit Breaker Logic
    if (shouldActivate && !this.state.isCircuitBreakerActive) {
      console.error('🛑 [CIRCUIT BREAKER] ATIVADO! Sistema entrando em modo seguro', {
        errorCount: this.state.errorCount,
        lastErrorType: isInfiniteLoopError ? 'INFINITE_LOOP' : 'OTHER',
        timeSinceLastError,
        timestamp: new Date().toISOString()
      });
    }
    
    if (isInfiniteLoopError) {
      console.error('🔥 [CHIP ERROR BOUNDARY] INFINITE LOOP DETECTADO!', {
        error: error.message,
        errorType: 'INFINITE_LOOP',
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ChipErrorBoundary',
        timestamp: new Date().toISOString(),
        errorCount: this.state.errorCount,
        timeSinceLastError,
        isRapidError,
        circuitBreakerWillActivate: shouldActivate
      });
      
      // Identificar componentes problemáticos
      this.identifyProblematicComponents(errorInfo.componentStack || '', 'INFINITE_LOOP');
      
    } else if (isOnClickError) {
      console.error('🚨 [CHIP ERROR BOUNDARY] onClick error interceptado!', {
        error: error.message,
        errorType: 'ONCLICK_ERROR',
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ChipErrorBoundary',
        timestamp: new Date().toISOString(),
        errorCount: this.state.errorCount
      });
      
      this.identifyProblematicComponents(errorInfo.componentStack || '', 'ONCLICK_ERROR');
      
    } else if (isFormControlError) {
      console.error('⚠️ [CHIP ERROR BOUNDARY] FormControl/InputBase error detectado!', {
        error: error.message,
        errorType: 'FORM_ERROR',
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ChipErrorBoundary',
        timestamp: new Date().toISOString(),
        errorCount: this.state.errorCount,
        isRapidError
      });
      
      this.identifyProblematicComponents(errorInfo.componentStack || '', 'FORM_ERROR');
    } else {
      console.error('❓ [CHIP ERROR BOUNDARY] Erro genérico interceptado!', {
        error: error.message,
        errorType: 'GENERIC_ERROR',
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ChipErrorBoundary',
        timestamp: new Date().toISOString(),
        errorCount: this.state.errorCount
      });
    }
    
    this.setState({ 
      errorInfo, 
      errorCount: this.state.errorCount + 1,
      lastErrorTime: now,
      isCircuitBreakerActive: shouldActivate || this.state.isCircuitBreakerActive,
      circuitBreakerActivatedAt: shouldActivate && !this.state.isCircuitBreakerActive ? now : this.state.circuitBreakerActivatedAt
    });
  }
  
  private identifyProblematicComponents(componentStack: string | null | undefined, errorType: string) {
    if (!componentStack) return;
    
    const lines = componentStack.split('\n');
    
    // Identificar componentes relacionados ao erro específico
    let relevantComponents: string[] = [];
    
    if (errorType === 'INFINITE_LOOP') {
      relevantComponents = lines.filter(line => 
        line.includes('ClientSelector') || 
        line.includes('FormControl') ||
        line.includes('InputBase') ||
        line.includes('Autocomplete') ||
        line.includes('Controller')
      );
    } else if (errorType === 'ONCLICK_ERROR') {
      relevantComponents = lines.filter(line => 
        line.includes('Chip') || 
        line.includes('LocationHierarchy') ||
        line.includes('LocationLevel') ||
        line.includes('LocationCard')
      );
    } else if (errorType === 'FORM_ERROR') {
      relevantComponents = lines.filter(line => 
        line.includes('FormControl') ||
        line.includes('InputBase') ||
        line.includes('TextField') ||
        line.includes('BatchProduct')
      );
    }
    
    if (relevantComponents.length > 0) {
      console.error(`🎯 [CHIP ERROR BOUNDARY] Componentes relevantes para ${errorType}:`, relevantComponents);
    }
    
    // Identificar componentes do projeto (não node_modules)
    const projectLines = lines.filter(line => 
      line.includes('src/') && !line.includes('node_modules')
    );
    
    if (projectLines.length > 0) {
      console.error(`🔍 [CHIP ERROR BOUNDARY] Componentes do projeto envolvidos (${errorType}):`, projectLines);
    }
  }

  private renderCircuitBreakerUI() {
    const isCircuitBreakerActive = this.state.isCircuitBreakerActive;
    const canReset = this.isCircuitBreakerCooledDown();
    const { circuitBreakerActivatedAt } = this.state;
    
    const timeRemaining = circuitBreakerActivatedAt 
      ? Math.max(0, this.CIRCUIT_BREAKER_COOLDOWN - (Date.now() - circuitBreakerActivatedAt))
      : 0;
    
    const secondsRemaining = Math.ceil(timeRemaining / 1000);
    
    return (
      <div style={{ 
        padding: '20px', 
        border: '3px solid #dc3545', 
        borderRadius: '8px',
        backgroundColor: '#f8d7da',
        color: '#721c24',
        margin: '10px 0',
        textAlign: 'center'
      }}>
        <h2>🛑 Circuit Breaker Ativado</h2>
        <p><strong>Sistema em Modo Seguro</strong></p>
        <p>Muitos erros foram detectados consecutivamente. O componente foi isolado para prevenir instabilidade.</p>
        
        {!canReset && (
          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: '#f5c6cb', 
            borderRadius: '4px' 
          }}>
            <p><strong>⏱️ Aguarde {secondsRemaining}s para tentar novamente</strong></p>
            <div style={{ 
              width: '100%', 
              height: '8px', 
              backgroundColor: '#dee2e6', 
              borderRadius: '4px',
              marginTop: '8px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${((this.CIRCUIT_BREAKER_COOLDOWN - timeRemaining) / this.CIRCUIT_BREAKER_COOLDOWN) * 100}%`,
                height: '100%',
                backgroundColor: '#dc3545',
                transition: 'width 1s ease'
              }} />
            </div>
          </div>
        )}
        
        {canReset && (
          <button 
            onClick={() => this.setState({ 
              hasError: false, 
              error: undefined, 
              errorInfo: undefined, 
              errorCount: 0,
              isInfiniteLoop: false,
              isCircuitBreakerActive: false,
              circuitBreakerActivatedAt: undefined
            })}
            style={{ 
              marginTop: '15px', 
              padding: '12px 24px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '16px',
              fontWeight: 'bold'
            }}
          >
            🔄 Resetar Sistema
          </button>
        )}
        
        <div style={{ 
          marginTop: '15px', 
          fontSize: '12px', 
          color: '#6c757d' 
        }}>
          <p>Erros detectados: {this.state.errorCount} | Último erro: {this.state.error?.message}</p>
        </div>
      </div>
    );
  }

  render() {
    if (this.state.hasError) {
      // Circuit Breaker tem prioridade sobre erro normal
      if (this.state.isCircuitBreakerActive) {
        return this.renderCircuitBreakerUI();
      }
      
      const errorTitle = this.state.isInfiniteLoop 
        ? '🔥 Loop Infinito Detectado' 
        : '🚨 Erro no Componente';
      
      const errorDescription = this.state.isInfiniteLoop
        ? 'Um loop infinito foi detectado. Isso geralmente indica dependencies instáveis em useEffect ou useState.' 
        : 'Um erro foi interceptado pelo Error Boundary.';
      
      const backgroundColor = this.state.isInfiniteLoop ? '#fff3cd' : '#ffe6e6';
      const borderColor = this.state.isInfiniteLoop ? '#ffc107' : '#dc3545';
      const textColor = this.state.isInfiniteLoop ? '#856404' : '#721c24';
      
      return (
        <div style={{ 
          padding: '20px', 
          border: `2px solid ${borderColor}`, 
          borderRadius: '8px',
          backgroundColor,
          color: textColor,
          margin: '10px 0'
        }}>
          <h3>{errorTitle}</h3>
          <p><strong>Erro:</strong> {this.state.error?.message}</p>
          <p><strong>Descrição:</strong> {errorDescription}</p>
          <p><strong>Contagem de erros:</strong> {this.state.errorCount}</p>
          {this.state.isInfiniteLoop && (
            <div style={{ 
              marginTop: '10px', 
              padding: '10px', 
              backgroundColor: '#fff3e0', 
              borderRadius: '4px',
              fontSize: '14px'
            }}>
              <strong>💡 Possíveis causas:</strong>
              <ul style={{ margin: '5px 0', paddingLeft: '20px' }}>
                <li>Dependencies instáveis em useEffect</li>
                <li>Funções recriadas constantemente</li>
                <li>setState em loops de renderização</li>
                <li>Dependencies circulares em hooks</li>
              </ul>
            </div>
          )}
          <p><strong>Detalhes:</strong> Verifique o console para mais informações</p>
          <button 
            onClick={() => this.setState({ 
              hasError: false, 
              error: undefined, 
              errorInfo: undefined, 
              errorCount: 0,
              isInfiniteLoop: false,
              isCircuitBreakerActive: false,
              circuitBreakerActivatedAt: undefined
            })}
            style={{ 
              marginTop: '10px', 
              padding: '8px 16px',
              backgroundColor: borderColor,
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Tentar Novamente
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ChipErrorBoundary; 