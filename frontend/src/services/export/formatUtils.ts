/**
 * FORMAT UTILITIES
 * Utilitários de formatação compartilhados para os serviços de exportação
 */

// Utilitários compartilhados
export const formatUtils = {
  formatDate: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleDateString('pt-BR');
  },

  formatDateTime: (date: string | Date): string => {
    const d = new Date(date);
    return d.toLocaleString('pt-BR');
  },

  formatNumber: (num: number): string => {
    return num.toLocaleString('pt-BR');
  },

  formatCurrency: (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  formatWeight: (weight: number): string => {
    return `${weight.toLocaleString('pt-BR')} kg`;
  },

  sanitizeFilename: (filename: string): string => {
    // Remove caracteres especiais e substitui espaços por underscores
    return filename
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, '_') // Substitui caracteres especiais por _
      .replace(/_+/g, '_') // Remove _ duplicados
      .replace(/^_|_$/g, ''); // Remove _ do início e fim
  },

  generateFilename: (reportType: string, format: 'pdf' | 'xlsx'): string => {
    const date = new Date().toISOString().split('T')[0];
    const sanitizedType = formatUtils.sanitizeFilename(reportType);
    return `relatorio_${sanitizedType}_${date}.${format}`;
  },

  formatStatus: (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'CADASTRADO': 'Cadastrado',
      'AGUARDANDO_LOCACAO': 'Aguardando Locação',
      'LOCADO': 'Locado',
      'AGUARDANDO_RETIRADA': 'Aguardando Retirada',
      'RETIRADO': 'Retirado',
      'REMOVIDO': 'Removido'
    };
    return statusMap[status] || status;
  },

  formatMovementType: (type: string): string => {
    const typeMap: { [key: string]: string } = {
      'entry': 'Entrada',
      'exit': 'Saída',
      'transfer': 'Transferência',
      'adjustment': 'Ajuste'
    };
    return typeMap[type] || type;
  },

  formatExpirationStatus: (status: string): string => {
    const statusMap: { [key: string]: string } = {
      'expired': 'Vencido',
      'critical': 'Crítico',
      'warning': 'Atenção',
      'good': 'Bom'
    };
    return statusMap[status] || status;
  }
};