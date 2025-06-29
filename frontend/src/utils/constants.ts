/**
 * Constantes compartilhadas do sistema de gerenciamento de câmaras refrigeradas
 */

// Configurações de validade e urgência de produtos
export const URGENT_EXPIRATION_DAYS = 7; // Produtos próximos do vencimento em 7 dias são considerados urgentes
export const WARNING_EXPIRATION_DAYS = 30; // Produtos próximos do vencimento em 30 dias mostram warning

// Limites do sistema
export const MAX_PRODUCTS_PER_BATCH = 50; // Máximo de produtos por lote
export const MIN_PRODUCTS_PER_BATCH = 1; // Mínimo de produtos por lote

// Status de produtos
export const PRODUCT_STATUS = {
  CADASTRADO: 'CADASTRADO',
  AGUARDANDO_LOCACAO: 'AGUARDANDO_LOCACAO',
  LOCADO: 'LOCADO',
  AGUARDANDO_RETIRADA: 'AGUARDANDO_RETIRADA',
  RETIRADO: 'RETIRADO',
  REMOVIDO: 'REMOVIDO'
} as const;

// Tipos de armazenamento
export const STORAGE_TYPES = {
  SACO: 'saco',
  BAG: 'bag'
} as const;

// Graus de qualidade
export const QUALITY_GRADES = {
  A: 'A',
  B: 'B',
  C: 'C',
  D: 'D'
} as const;

// Roles de usuário
export const USER_ROLES = {
  ADMIN: 'ADMIN',
  OPERATOR: 'OPERATOR'
} as const;

// Status de expiração
export const EXPIRATION_STATUS = {
  EXPIRED: 'expired',
  CRITICAL: 'critical', // Vence em <= 7 dias
  WARNING: 'warning',   // Vence em <= 30 dias
  GOOD: 'good',
  NO_EXPIRATION: 'no-expiration'
} as const;

// Configurações de paginação
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 10,
  MAX_PAGE_SIZE: 100,
  DEFAULT_PAGE: 1
} as const;

// Timeouts e intervalos
export const TIMEOUTS = {
  DEBOUNCE_SEARCH: 300,     // ms - Para campos de busca
  AUTO_REFRESH: 30000,      // ms - Refresh automático de dados
  NOTIFICATION_DURATION: 5000 // ms - Duração das notificações
} as const;