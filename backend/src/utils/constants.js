/**
 * Constantes do Sistema - Estados FSM e Tipos
 * Centraliza todas as constantes para evitar erros de digitação
 */

// Estados FSM dos Produtos
const PRODUCT_STATUS = {
  CADASTRADO: 'CADASTRADO',
  AGUARDANDO_LOCACAO: 'AGUARDANDO_LOCACAO', 
  LOCADO: 'LOCADO',
  AGUARDANDO_RETIRADA: 'AGUARDANDO_RETIRADA',
  RETIRADO: 'RETIRADO',
  REMOVIDO: 'REMOVIDO'
};

// Estados das Solicitações de Retirada
const WITHDRAWAL_STATUS = {
  PENDENTE: 'PENDENTE',
  CONFIRMADO: 'CONFIRMADO', 
  CANCELADO: 'CANCELADO'
};

// Tipos de Retirada
const WITHDRAWAL_TYPE = {
  TOTAL: 'TOTAL',
  PARCIAL: 'PARCIAL'
};

// Tipos de Movimento
const MOVEMENT_TYPE = {
  ENTRY: 'entry',
  EXIT: 'exit', 
  MOVE: 'move',
  ADJUSTMENT: 'adjustment'
};

// Roles de Usuário
const USER_ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR'
};

// Tipos de Armazenamento
const STORAGE_TYPE = {
  SACO: 'saco',
  BAG: 'bag'
};

// Status de Vencimento
const EXPIRATION_STATUS = {
  GOOD: 'good',
  WARNING: 'warning', 
  CRITICAL: 'critical',
  EXPIRED: 'expired',
  NO_EXPIRATION: 'no-expiration'
};

// Validação de Transições FSM
const VALID_TRANSITIONS = {
  [PRODUCT_STATUS.CADASTRADO]: [PRODUCT_STATUS.AGUARDANDO_LOCACAO, PRODUCT_STATUS.LOCADO],
  [PRODUCT_STATUS.AGUARDANDO_LOCACAO]: [PRODUCT_STATUS.LOCADO, PRODUCT_STATUS.REMOVIDO],
  [PRODUCT_STATUS.LOCADO]: [PRODUCT_STATUS.AGUARDANDO_RETIRADA, PRODUCT_STATUS.REMOVIDO],
  [PRODUCT_STATUS.AGUARDANDO_RETIRADA]: [PRODUCT_STATUS.RETIRADO, PRODUCT_STATUS.LOCADO], // Inclui cancelamento
  [PRODUCT_STATUS.RETIRADO]: [], // Estado final
  [PRODUCT_STATUS.REMOVIDO]: [] // Estado final
};

module.exports = {
  PRODUCT_STATUS,
  WITHDRAWAL_STATUS,
  WITHDRAWAL_TYPE,
  MOVEMENT_TYPE,
  USER_ROLES,
  STORAGE_TYPE,
  EXPIRATION_STATUS,
  VALID_TRANSITIONS
}; 