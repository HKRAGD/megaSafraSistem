import { LocationWithChamber } from '../../../../types';

// Interface para informações de capacidade
export interface CapacityInfo {
  currentWeight: number;
  maxCapacity: number;
  newWeight: number;
  percentage: number;
  color: 'success' | 'warning' | 'error';
  exceedsCapacity: boolean;
}

/**
 * Calcula o peso total baseado na quantidade e peso por unidade
 */
export const calculateTotalWeight = (quantity: number, weightPerUnit: number): number => {
  if (!quantity || !weightPerUnit) return 0;
  return quantity * weightPerUnit;
};

/**
 * Calcula informações de capacidade para uma localização
 */
export const calculateCapacityInfo = (
  selectedLocation: LocationWithChamber | null | undefined,
  totalWeight: number
): CapacityInfo | null => {
  if (!selectedLocation) return null;

  const currentWeight = selectedLocation.currentWeightKg || 0;
  const maxCapacity = selectedLocation.maxCapacityKg;
  const newWeight = currentWeight + totalWeight;
  const percentage = (newWeight / maxCapacity) * 100;

  const getColor = (): 'success' | 'warning' | 'error' => {
    if (percentage > 100) return 'error';
    if (percentage > 90) return 'warning';
    return 'success';
  };

  return {
    currentWeight,
    maxCapacity,
    newWeight,
    percentage: Math.min(percentage, 100),
    color: getColor(),
    exceedsCapacity: newWeight > maxCapacity,
  };
};

/**
 * Encontra uma localização pelo ID na lista de localizações disponíveis
 */
export const findLocationById = (
  locations: LocationWithChamber[],
  locationId: string | undefined
): LocationWithChamber | undefined => {
  if (!locationId) return undefined;
  return locations.find(loc => loc.id === locationId);
};

/**
 * Formata os dados do formulário para submissão
 */
export const formatFormDataForSubmission = (data: any, totalWeight: number) => {
  return {
    ...data,
    totalWeight,
    expirationDate: data.expirationDate?.toISOString(),
  };
}; 