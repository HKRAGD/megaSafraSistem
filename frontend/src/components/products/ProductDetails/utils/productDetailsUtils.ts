import { differenceInDays, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Product } from '../../../../types';

/**
 * Tipo de dados para informações de status
 */
export interface StatusInfo {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info';
  variant: 'filled' | 'outlined';
}

/**
 * Tipo de dados para informações de expiração
 */
export interface ExpirationInfo {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info';
  daysRemaining: number;
  isExpired: boolean;
  isNearExpiration: boolean;
}

/**
 * Obter informações de status do produto
 */
export const getStatusInfo = (status: string): StatusInfo => {
  switch (status) {
    case 'stored':
      return {
        label: 'Armazenado',
        color: 'success',
        variant: 'filled',
      };
    case 'reserved':
      return {
        label: 'Reservado',
        color: 'warning',
        variant: 'filled',
      };
    case 'removed':
      return {
        label: 'Removido',
        color: 'error',
        variant: 'outlined',
      };
    default:
      return {
        label: 'Desconhecido',
        color: 'info',
        variant: 'outlined',
      };
  }
};

/**
 * Obter informações de expiração do produto
 */
export const getExpirationInfo = (expirationDate: Date): ExpirationInfo => {
  const now = new Date();
  const expDate = new Date(expirationDate);
  const daysRemaining = differenceInDays(expDate, now);
  
  const isExpired = daysRemaining < 0;
  const isNearExpiration = daysRemaining <= 30 && daysRemaining >= 0;

  if (isExpired) {
    return {
      label: `Vencido há ${Math.abs(daysRemaining)} dias`,
      color: 'error',
      daysRemaining,
      isExpired: true,
      isNearExpiration: false,
    };
  }

  if (isNearExpiration) {
    return {
      label: `Vence em ${daysRemaining} dias`,
      color: 'warning',
      daysRemaining,
      isExpired: false,
      isNearExpiration: true,
    };
  }

  return {
    label: `Vence em ${daysRemaining} dias`,
    color: 'success',
    daysRemaining,
    isExpired: false,
    isNearExpiration: false,
  };
};

/**
 * Formatar peso em kg
 */
export const formatWeight = (weight: number): string => {
  if (weight < 1) {
    return `${(weight * 1000).toFixed(0)}g`;
  }
  return `${weight.toFixed(2)}kg`;
};

/**
 * Calcular porcentagem de capacidade
 */
export const calculateCapacityPercentage = (currentWeight: number, maxCapacity: number): number => {
  if (maxCapacity <= 0) return 0;
  return Math.min((currentWeight / maxCapacity) * 100, 100);
};

/**
 * Gerar código de localização
 */
export const generateLocationCode = (coordinates: {
  quadra: number;
  lado: string | number;
  fila: number;
  andar: number;
}): string => {
  return `Q${coordinates.quadra}-L${coordinates.lado}-F${coordinates.fila}-A${coordinates.andar}`;
};

/**
 * Formatar data para exibição
 */
export const formatDate = (date: Date): string => {
  return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR });
};

/**
 * Formatar data e hora para exibição
 */
export const formatDateTime = (date: Date): string => {
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
};

/**
 * Obter cor da progress bar de capacidade
 */
export const getCapacityColor = (percentage: number): 'success' | 'warning' | 'error' => {
  if (percentage >= 95) return 'error';
  if (percentage >= 80) return 'warning';
  return 'success';
};

/**
 * Calcular dias de armazenamento
 */
export const calculateStorageDays = (entryDate: Date): number => {
  return differenceInDays(new Date(), new Date(entryDate));
};

/**
 * Verificar se produto está próximo do vencimento
 */
export const isNearExpiration = (expirationDate: Date | null): boolean => {
  if (!expirationDate) return false;
  const daysRemaining = differenceInDays(new Date(expirationDate), new Date());
  return daysRemaining <= 30 && daysRemaining >= 0;
};

/**
 * Verificar se produto está vencido
 */
export const isExpired = (expirationDate: Date | null): boolean => {
  if (!expirationDate) return false;
  return differenceInDays(new Date(expirationDate), new Date()) < 0;
};

/**
 * Tipo de dados para informações de qualidade
 */
export interface QualityGradeInfo {
  label: string;
  color: 'success' | 'warning' | 'error' | 'info';
  value: string;
}

/**
 * Obter informações de grau de qualidade
 */
export const getQualityGradeInfo = (grade?: 'A' | 'B' | 'C' | 'D'): QualityGradeInfo => {
  switch (grade) {
    case 'A':
      return { label: 'Excelente', color: 'success', value: 'A' };
    case 'B':
      return { label: 'Boa', color: 'success', value: 'B' };
    case 'C':
      return { label: 'Regular', color: 'warning', value: 'C' };
    case 'D':
      return { label: 'Inferior', color: 'error', value: 'D' };
    default:
      return { label: 'Não avaliada', color: 'info', value: '-' };
  }
};

/**
 * Obter rótulo do tipo de armazenamento
 */
export const getStorageTypeLabel = (storageType: string): string => {
  switch (storageType) {
    case 'saco':
      return 'Saco';
    case 'bag':
      return 'Big Bag';
    default:
      return storageType;
  }
};

/**
 * Alias para formatDate (compatibilidade)
 */
export const formatDateOnly = formatDate;

/**
 * Alias para calculateStorageDays (compatibilidade)
 */
export const calculateStorageTime = calculateStorageDays;

/**
 * Alias para generateLocationCode (compatibilidade)
 */
export const getLocationCode = (location?: { coordinates: { quadra: number; lado: string | number; fila: number; andar: number; } }): string => {
  if (!location?.coordinates) return 'N/A';
  return generateLocationCode(location.coordinates);
}; 