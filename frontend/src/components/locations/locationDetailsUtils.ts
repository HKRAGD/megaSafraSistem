import { Location, Product } from '../../types';

/**
 * Calcular taxa de ocupação de uma localização
 */
export const calculateOccupancyRate = (location: Location): number => {
  if (!location || location.maxCapacityKg <= 0) return 0;
  return (location.currentWeightKg / location.maxCapacityKg) * 100;
};

/**
 * Obter cor da ocupação baseada na taxa
 */
export const getOccupancyColor = (occupancyRate: number): 'success' | 'warning' | 'error' => {
  if (occupancyRate >= 95) return 'error';
  if (occupancyRate >= 80) return 'warning';
  return 'success';
};

/**
 * Obter status textual da ocupação
 */
export const getOccupancyStatus = (occupancyRate: number): string => {
  if (occupancyRate >= 95) return 'Crítica';
  if (occupancyRate >= 80) return 'Alta';
  if (occupancyRate >= 50) return 'Média';
  return 'Baixa';
};

/**
 * Calcular capacidade disponível
 */
export const calculateAvailableCapacity = (location: Location): number => {
  return Math.max(0, location.maxCapacityKg - location.currentWeightKg);
};

/**
 * Verificar se localização precisa de alerta de capacidade
 */
export const shouldShowCapacityAlert = (occupancyRate: number): { show: boolean; severity: 'warning' | 'error'; message: string } | null => {
  if (occupancyRate >= 95) {
    return {
      show: true,
      severity: 'error',
      message: 'Capacidade crítica! A localização está praticamente cheia.'
    };
  }
  
  if (occupancyRate >= 80) {
    return {
      show: true,
      severity: 'warning',
      message: 'Atenção: A localização está com alta ocupação.'
    };
  }
  
  return null;
};

/**
 * Formatar data para exibição brasileira
 */
export const formatDateBR = (date: string | Date): string => {
  return new Date(date).toLocaleDateString('pt-BR');
};

/**
 * Validar capacidade editada
 */
export const validateCapacity = (capacity: number): { valid: boolean; message?: string } => {
  if (capacity <= 0) {
    return { valid: false, message: 'Capacidade deve ser maior que zero' };
  }
  
  if (capacity > 10000) {
    return { valid: false, message: 'Capacidade não pode exceder 10.000 kg' };
  }
  
  return { valid: true };
};

/**
 * Obter configuração do status da ocupação
 */
export interface OccupancyInfo {
  rate: number;
  color: 'success' | 'warning' | 'error';
  status: string;
  available: number;
  alert: { show: boolean; severity: 'warning' | 'error'; message: string } | null;
}

export const getOccupancyInfo = (location: Location): OccupancyInfo => {
  const rate = calculateOccupancyRate(location);
  const color = getOccupancyColor(rate);
  const status = getOccupancyStatus(rate);
  const available = calculateAvailableCapacity(location);
  const alert = shouldShowCapacityAlert(rate);

  return { rate, color, status, available, alert };
}; 