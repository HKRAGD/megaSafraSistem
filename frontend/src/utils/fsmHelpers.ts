/**
 * Utilitários centralizados para visualização do FSM
 * Cores e ícones padronizados para todos os status do sistema
 */

import React from 'react';
import {
  Inventory as InventoryIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Assignment as RequestIcon,
  Done as ConfirmIcon,
  Error as ErrorIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';

// ============================================================================
// TIPOS
// ============================================================================

export type ProductStatus = 
  | 'CADASTRADO' 
  | 'AGUARDANDO_LOCACAO' 
  | 'LOCADO' 
  | 'AGUARDANDO_RETIRADA' 
  | 'RETIRADO' 
  | 'REMOVIDO';

export type WithdrawalStatus = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO' | 'PENDING' | 'CONFIRMED' | 'CANCELED';

export type WithdrawalType = 'TOTAL' | 'PARCIAL';

export interface StatusConfig {
  label: string;
  color: 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning';
  icon: React.ReactElement;
  description: string;
}

// ============================================================================
// CONFIGURAÇÕES DE STATUS DE PRODUTOS (FSM)
// ============================================================================

export const PRODUCT_STATUS_CONFIG: Record<ProductStatus, StatusConfig> = {
  CADASTRADO: {
    label: 'Cadastrado',
    color: 'default',
    icon: React.createElement(InventoryIcon, { fontSize: 'small' }),
    description: 'Produto cadastrado no sistema, aguardando localização',
  },
  AGUARDANDO_LOCACAO: {
    label: 'Aguardando Locação',
    color: 'warning',
    icon: React.createElement(ScheduleIcon, { fontSize: 'small' }),
    description: 'Produto aguardando ser localizado por um operador',
  },
  LOCADO: {
    label: 'Locado',
    color: 'success',
    icon: React.createElement(CheckCircleIcon, { fontSize: 'small' }),
    description: 'Produto localizado e armazenado corretamente',
  },
  AGUARDANDO_RETIRADA: {
    label: 'Aguardando Retirada',
    color: 'info',
    icon: React.createElement(RequestIcon, { fontSize: 'small' }),
    description: 'Retirada solicitada, aguardando confirmação do operador',
  },
  RETIRADO: {
    label: 'Retirado',
    color: 'secondary',
    icon: React.createElement(ConfirmIcon, { fontSize: 'small' }),
    description: 'Produto retirado do estoque com sucesso',
  },
  REMOVIDO: {
    label: 'Removido',
    color: 'error',
    icon: React.createElement(ErrorIcon, { fontSize: 'small' }),
    description: 'Produto removido do sistema permanentemente',
  },
};

// ============================================================================
// CONFIGURAÇÕES DE STATUS DE SOLICITAÇÕES DE RETIRADA
// ============================================================================

export const WITHDRAWAL_STATUS_CONFIG: Partial<Record<WithdrawalStatus, StatusConfig>> = {
  // Backend português
  PENDENTE: {
    label: 'Pendente',
    color: 'warning',
    icon: React.createElement(ScheduleIcon, { fontSize: 'small' }),
    description: 'Solicitação criada, aguardando confirmação do operador',
  },
  CONFIRMADO: {
    label: 'Confirmada',
    color: 'success',
    icon: React.createElement(CheckCircleIcon, { fontSize: 'small' }),
    description: 'Retirada confirmada e executada com sucesso',
  },
  CANCELADO: {
    label: 'Cancelada',
    color: 'error',
    icon: React.createElement(ErrorIcon, { fontSize: 'small' }),
    description: 'Solicitação cancelada pelo administrador',
  },
  // Compatibilidade inglês
  PENDING: {
    label: 'Pendente',
    color: 'warning',
    icon: React.createElement(ScheduleIcon, { fontSize: 'small' }),
    description: 'Solicitação criada, aguardando confirmação do operador',
  },
  CONFIRMED: {
    label: 'Confirmada',
    color: 'success',
    icon: React.createElement(CheckCircleIcon, { fontSize: 'small' }),
    description: 'Retirada confirmada e executada com sucesso',
  },
  CANCELED: {
    label: 'Cancelada',
    color: 'error',
    icon: React.createElement(ErrorIcon, { fontSize: 'small' }),
    description: 'Solicitação cancelada pelo administrador',
  },
};

// ============================================================================
// CONFIGURAÇÕES DE TIPOS DE RETIRADA
// ============================================================================

export const WITHDRAWAL_TYPE_CONFIG: Record<WithdrawalType, StatusConfig> = {
  TOTAL: {
    label: 'Retirada Total',
    color: 'primary',
    icon: React.createElement(ConfirmIcon, { fontSize: 'small' }),
    description: 'Retirada de todo o produto do estoque',
  },
  PARCIAL: {
    label: 'Retirada Parcial',
    color: 'secondary',
    icon: React.createElement(RequestIcon, { fontSize: 'small' }),
    description: 'Retirada de uma quantidade específica do produto',
  },
};

// ============================================================================
// FUNÇÕES HELPER PARA OBTER CONFIGURAÇÕES
// ============================================================================

/**
 * Obtém a configuração de um status de produto
 */
export const getProductStatusConfig = (status: string): StatusConfig => {
  return PRODUCT_STATUS_CONFIG[status as ProductStatus] || PRODUCT_STATUS_CONFIG.CADASTRADO;
};

/**
 * Obtém a configuração de um status de retirada
 */
export const getWithdrawalStatusConfig = (status: string): StatusConfig => {
  const config = WITHDRAWAL_STATUS_CONFIG[status as WithdrawalStatus];
  if (config) return config;
  
  // Fallback para status pendente
  return WITHDRAWAL_STATUS_CONFIG.PENDENTE || {
    label: 'Desconhecido',
    color: 'default',
    icon: React.createElement(WarningIcon, { fontSize: 'small' }),
    description: 'Status desconhecido',
  };
};

/**
 * Obtém a configuração de um tipo de retirada
 */
export const getWithdrawalTypeConfig = (type: string): StatusConfig => {
  return WITHDRAWAL_TYPE_CONFIG[type as WithdrawalType] || WITHDRAWAL_TYPE_CONFIG.TOTAL;
};

// ============================================================================
// FUNÇÕES PARA ANÁLISE DO FSM
// ============================================================================

/**
 * Verifica se uma transição de status é válida
 */
export const isValidTransition = (fromStatus: ProductStatus, toStatus: ProductStatus): boolean => {
  const validTransitions: Record<ProductStatus, ProductStatus[]> = {
    CADASTRADO: ['AGUARDANDO_LOCACAO', 'REMOVIDO'],
    AGUARDANDO_LOCACAO: ['LOCADO', 'REMOVIDO'],
    LOCADO: ['AGUARDANDO_RETIRADA', 'REMOVIDO'],
    AGUARDANDO_RETIRADA: ['RETIRADO', 'LOCADO'], // Pode voltar para LOCADO se cancelar
    RETIRADO: ['REMOVIDO'],
    REMOVIDO: [], // Estado final
  };

  return validTransitions[fromStatus]?.includes(toStatus) || false;
};

/**
 * Obtém as próximas transições possíveis para um status
 */
export const getNextPossibleStatuses = (currentStatus: ProductStatus): ProductStatus[] => {
  const transitions: Record<ProductStatus, ProductStatus[]> = {
    CADASTRADO: ['AGUARDANDO_LOCACAO', 'REMOVIDO'],
    AGUARDANDO_LOCACAO: ['LOCADO', 'REMOVIDO'],
    LOCADO: ['AGUARDANDO_RETIRADA', 'REMOVIDO'],
    AGUARDANDO_RETIRADA: ['RETIRADO', 'LOCADO'],
    RETIRADO: ['REMOVIDO'],
    REMOVIDO: [],
  };

  return transitions[currentStatus] || [];
};

/**
 * Verifica se um status é final (não permite mais transições)
 */
export const isFinalStatus = (status: ProductStatus): boolean => {
  return status === 'REMOVIDO' || status === 'RETIRADO';
};

/**
 * Verifica se um status indica que o produto está fisicamente no estoque
 */
export const isProductInStock = (status: ProductStatus): boolean => {
  return status === 'LOCADO' || status === 'AGUARDANDO_RETIRADA';
};

/**
 * Verifica se um status indica que o produto precisa de ação do operador
 */
export const needsOperatorAction = (status: ProductStatus): boolean => {
  return status === 'AGUARDANDO_LOCACAO' || status === 'AGUARDANDO_RETIRADA';
};

/**
 * Verifica se um status indica que o produto precisa de ação do admin
 */
export const needsAdminAction = (status: ProductStatus): boolean => {
  return status === 'CADASTRADO' || status === 'LOCADO';
};

// ============================================================================
// FUNÇÕES PARA ESTATÍSTICAS
// ============================================================================

/**
 * Agrupa produtos por status para estatísticas
 */
export const groupProductsByStatus = (products: Array<{ status: string }>): Record<ProductStatus, number> => {
  const grouped = Object.keys(PRODUCT_STATUS_CONFIG).reduce((acc, status) => {
    acc[status as ProductStatus] = 0;
    return acc;
  }, {} as Record<ProductStatus, number>);

  products.forEach(product => {
    const status = product.status as ProductStatus;
    if (grouped[status] !== undefined) {
      grouped[status]++;
    }
  });

  return grouped;
};

/**
 * Calcula métricas úteis baseadas nos status dos produtos
 */
export const calculateProductMetrics = (products: Array<{ status: string }>) => {
  const grouped = groupProductsByStatus(products);
  
  return {
    total: products.length,
    inStock: grouped.LOCADO + grouped.AGUARDANDO_RETIRADA,
    pendingLocation: grouped.AGUARDANDO_LOCACAO,
    pendingWithdrawal: grouped.AGUARDANDO_RETIRADA,
    completed: grouped.RETIRADO + grouped.REMOVIDO,
    needsAction: grouped.AGUARDANDO_LOCACAO + grouped.AGUARDANDO_RETIRADA,
    byStatus: grouped,
  };
};

// ============================================================================
// EXPORTAÇÕES PARA CONVENIÊNCIA
// ============================================================================

// Lista de todos os status possíveis
export const ALL_PRODUCT_STATUSES: ProductStatus[] = Object.keys(PRODUCT_STATUS_CONFIG) as ProductStatus[];
export const ALL_WITHDRAWAL_STATUSES: WithdrawalStatus[] = ['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'PENDING', 'CONFIRMED', 'CANCELED'] as WithdrawalStatus[];
export const ALL_WITHDRAWAL_TYPES: WithdrawalType[] = Object.keys(WITHDRAWAL_TYPE_CONFIG) as WithdrawalType[];

// Status que indicam diferentes estados do workflow
export const ACTIVE_STATUSES: ProductStatus[] = ['CADASTRADO', 'AGUARDANDO_LOCACAO', 'LOCADO', 'AGUARDANDO_RETIRADA'];
export const FINAL_STATUSES: ProductStatus[] = ['RETIRADO', 'REMOVIDO'];
export const ACTIONABLE_STATUSES: ProductStatus[] = ['AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA'];