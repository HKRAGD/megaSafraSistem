import { Movement } from '../../../../types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Interface para filtros de movimentação
 */
export interface MovementFilters {
  type: string; // 'all' | 'entry' | 'exit' | 'transfer' | 'adjustment'
  period: string; // 'all' | '7' | '30' | '90' | '365'
}

/**
 * Filtros padrão
 */
export const defaultMovementFilters: MovementFilters = {
  type: 'all',
  period: 'all',
};

/**
 * Tipo para períodos de movimentação
 */
export type MovementPeriod = '7' | '30' | '90' | '365' | 'all';

/**
 * Configurações de tipos e períodos de movimentação
 */
export const MovementConfig = {
  types: {
    all: {
      label: 'Todos os tipos',
      color: 'default' as const,
    },
    entry: {
      label: 'Entrada',
      color: 'success' as const,
    },
    exit: {
      label: 'Saída',
      color: 'error' as const,
    },
    transfer: {
      label: 'Transferência',
      color: 'info' as const,
    },
    adjustment: {
      label: 'Ajuste',
      color: 'warning' as const,
    },
  },
  periods: {
    '7': {
      label: 'Últimos 7 dias',
      days: 7,
    },
    '30': {
      label: 'Últimos 30 dias',
      days: 30,
    },
    '90': {
      label: 'Últimos 3 meses',
      days: 90,
    },
    '365': {
      label: 'Último ano',
      days: 365,
    },
    'all': {
      label: 'Tudo',
      days: null,
    },
  },
};

/**
 * Obter configuração de tipo de movimentação
 */
export const getMovementConfig = (type: string) => {
  return MovementConfig.types[type as keyof typeof MovementConfig.types] || MovementConfig.types.all;
};

/**
 * Formatar data para exibição
 */
export const formatDate = (date: Date | string): string => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

/**
 * Formatar data e hora para exibição
 */
export const formatDateTime = (date: Date | string): string => {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

/**
 * Formatar apenas hora para exibição
 */
export const formatTime = (date: Date | string): string => {
  return format(new Date(date), 'HH:mm', { locale: ptBR });
};

/**
 * Filtrar movimentações baseado nos filtros
 */
export const filterMovements = (movements: Movement[], filters: MovementFilters): Movement[] => {
  let filtered = [...movements];

  // Filtrar por tipo
  if (filters.type !== 'all') {
    filtered = filtered.filter(movement => movement.type === filters.type);
  }

  // Filtrar por período
  if (filters.period !== 'all') {
    const periodConfig = MovementConfig.periods[filters.period as MovementPeriod];
    if (periodConfig && periodConfig.days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - periodConfig.days);
      filtered = filtered.filter(movement => 
        new Date(movement.timestamp) >= cutoffDate
      );
    }
  }

  // Ordenar por data (mais recente primeiro)
  filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return filtered;
};

/**
 * Calcular estatísticas das movimentações
 */
export const calculateMovementStats = (movements: Movement[]) => {
  const stats = {
    total: movements.length,
    entry: 0,
    exit: 0,
    transfer: 0,
    adjustment: 0,
    totalWeight: 0,
    totalQuantity: 0,
  };

  movements.forEach(movement => {
    // Contar por tipo
    switch (movement.type) {
      case 'entry':
        stats.entry++;
        break;
      case 'exit':
        stats.exit++;
        break;
      case 'transfer':
        stats.transfer++;
        break;
      case 'adjustment':
        stats.adjustment++;
        break;
    }

    // Somar peso e quantidade
    stats.totalWeight += movement.weight || 0;
    stats.totalQuantity += movement.quantity || 0;
  });

  return stats;
}; 