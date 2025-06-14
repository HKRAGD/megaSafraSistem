import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
}

class ChipErrorBoundary extends React.Component<React.PropsWithChildren<{}>, ErrorBoundaryState> {
  constructor(props: React.PropsWithChildren<{}>) {
    super(props);
    this.state = { 
      hasError: false, 
      errorCount: 0 
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error,
      errorCount: 1
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Só interceptar erros de onClick
    if (error.message.includes('onClick is not a function')) {
      console.error('🚨 [CHIP ERROR BOUNDARY] onClick error interceptado!', {
        error: error.message,
        stack: error.stack,
        componentStack: errorInfo.componentStack,
        errorBoundary: 'ChipErrorBoundary',
        timestamp: new Date().toISOString(),
        errorCount: this.state.errorCount
      });

      // Tentar identificar o componente específico
      const componentStack = errorInfo.componentStack;
      if (componentStack) {
        const lines = componentStack.split('\n');
        const chipRelatedLines = lines.filter(line => 
          line.includes('Chip') || 
          line.includes('LocationHierarchy') ||
          line.includes('LocationLevel') ||
          line.includes('LocationCard')
        );
        
        console.error('🎯 [CHIP ERROR BOUNDARY] Componentes relacionados a Chip:', chipRelatedLines);
        
        // Identificar componente do projeto
        const projectLines = lines.filter(line => 
          line.includes('src/') && !line.includes('node_modules')
        );
        
        if (projectLines.length > 0) {
          console.error('🔍 [CHIP ERROR BOUNDARY] Componentes do projeto envolvidos:', projectLines);
        }
      }
    }
    
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ 
          padding: '20px', 
          border: '2px solid red', 
          borderRadius: '8px',
          backgroundColor: '#ffe6e6',
          color: 'red',
          margin: '10px 0'
        }}>
          <h3>🚨 Erro no Componente Chip</h3>
          <p><strong>Erro:</strong> {this.state.error?.message}</p>
          <p><strong>Componente:</strong> Verifique o console para detalhes</p>
          <button 
            onClick={() => this.setState({ hasError: false, error: undefined, errorInfo: undefined })}
            style={{ marginTop: '10px', padding: '8px 16px' }}
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