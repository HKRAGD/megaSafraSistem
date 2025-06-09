import React from 'react';

/**
 * Utilidades para tratar objetos populados vs IDs simples
 * Resolve problemas "Objects are not valid as a React child"
 */

/**
 * Extrai o display apropriado de um campo que pode ser string ID ou objeto populado
 */
export const getDisplayValue = (
  value: any, 
  fallback: string = 'N/A',
  preferredFields: string[] = ['name', 'code', 'email', '_id', 'id']
): string => {
  if (!value) return fallback;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  
  // Se é um objeto, tentar achar um campo apropriado para display
  if (typeof value === 'object') {
    for (const field of preferredFields) {
      if (value[field] && typeof value[field] === 'string') {
        return value[field];
      }
    }
  }
  
  return fallback;
};

/**
 * Específico para produtos - retorna nome do produto ou ID
 */
export const getProductDisplay = (productId: any): string => {
  return getDisplayValue(productId, 'N/A', ['name', 'lot', '_id', 'id']);
};

/**
 * Específico para localizações - retorna código da localização ou ID
 */
export const getLocationDisplay = (locationId: any): string => {
  return getDisplayValue(locationId, 'N/A', ['code', '_id', 'id']);
};

/**
 * Específico para usuários - retorna nome do usuário ou email ou ID
 */
export const getUserDisplay = (userId: any): string => {
  return getDisplayValue(userId, 'N/A', ['name', 'email', '_id', 'id']);
};

/**
 * Específico para tipos de sementes - retorna nome do tipo ou ID
 */
export const getSeedTypeDisplay = (seedTypeId: any): string => {
  return getDisplayValue(seedTypeId, 'N/A', ['name', '_id', 'id']);
};

/**
 * Específico para câmaras - retorna nome da câmara ou ID
 */
export const getChamberDisplay = (chamberId: any): string => {
  return getDisplayValue(chamberId, 'N/A', ['name', '_id', 'id']);
};

/**
 * Tratamento específico para transferências - mostra origem → destino
 */
export const getTransferDisplay = (fromLocationId: any, toLocationId: any): string => {
  const from = getLocationDisplay(fromLocationId);
  const to = getLocationDisplay(toLocationId);
  return `${from} → ${to}`;
};

/**
 * Verifica se um valor é um objeto React renderizável (string, number, elemento React)
 */
export const isSafeReactChild = (value: any): boolean => {
  return typeof value === 'string' || 
         typeof value === 'number' || 
         value === null || 
         value === undefined ||
         React.isValidElement(value);
};

/**
 * Converte qualquer valor para um React child seguro
 */
export const toSafeReactChild = (value: any, fallback: string = 'N/A'): React.ReactNode => {
  if (isSafeReactChild(value)) return value;
  if (typeof value === 'object') return getDisplayValue(value, fallback);
  return String(value);
}; 