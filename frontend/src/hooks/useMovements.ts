import { useState, useEffect, useCallback } from 'react';
import { Movement, MovementFilters, CreateMovementFormData, UseDataState } from '../types';
import { movementService } from '../services/movementService';

// ============================================================================
// FUNÇÃO DE MAPEAMENTO DE DADOS DA API
// ============================================================================

/**
 * Converte os dados de movimentação da API para o formato Movement
 * API retorna: { userId: { _id, name, email, ... }, productId: { _id, name, lot, ... }, etc }
 * Frontend espera: formato compatível com displayHelpers
 */
const mapApiMovementToMovement = (apiMovement: any): Movement => {
  return {
    // Dados básicos da movimentação
    id: apiMovement._id || apiMovement.id,
    type: apiMovement.type,
    quantity: apiMovement.quantity,
    weight: apiMovement.weight,
    reason: apiMovement.reason,
    notes: apiMovement.notes,
    timestamp: apiMovement.timestamp,
    createdAt: apiMovement.createdAt,
    updatedAt: apiMovement.updatedAt,

    // Relacionamentos mapeados - manter compatibilidade com displayHelpers
    productId: apiMovement.productId && typeof apiMovement.productId === 'object' 
      ? {
          _id: apiMovement.productId._id,
          name: apiMovement.productId.name,
          lot: apiMovement.productId.lot,
          storageType: apiMovement.productId.storageType
        }
      : apiMovement.productId,

    userId: apiMovement.userId && typeof apiMovement.userId === 'object'
      ? {
          _id: apiMovement.userId._id,
          name: apiMovement.userId.name,
          email: apiMovement.userId.email
        }
      : apiMovement.userId,

    fromLocationId: apiMovement.fromLocationId && typeof apiMovement.fromLocationId === 'object'
      ? {
          _id: apiMovement.fromLocationId._id,
          code: apiMovement.fromLocationId.code,
          coordinates: apiMovement.fromLocationId.coordinates
        }
      : apiMovement.fromLocationId,

    toLocationId: apiMovement.toLocationId && typeof apiMovement.toLocationId === 'object'
      ? {
          _id: apiMovement.toLocationId._id,
          code: apiMovement.toLocationId.code,
          coordinates: apiMovement.toLocationId.coordinates
        }
      : apiMovement.toLocationId,
  };
};

interface UseMovementsOptions {
  autoFetch?: boolean;
  initialFilters?: MovementFilters;
}

interface UseMovementsReturn extends UseDataState<Movement> {
  selectedMovement: Movement | null;
  movements: Movement[]; // Getter conveniente para data
  filters: MovementFilters;
  
  fetchMovements: (newFilters?: MovementFilters) => Promise<void>;
  getMovementsByProduct: (productId: string) => Promise<void>;
  getMovementsByLocation: (locationId: string) => Promise<void>;
  createMovement: (data: CreateMovementFormData) => Promise<void>;
  getMovement: (id: string) => Promise<Movement | null>;
  
  setSelectedMovement: (movement: Movement | null) => void;
  setFilters: (filters: MovementFilters) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

export const useMovements = (options: UseMovementsOptions = {}): UseMovementsReturn => {
  const { autoFetch = true, initialFilters = {} } = options;

  const [data, setData] = useState<Movement[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [hasNextPage] = useState<boolean>(false);
  const [hasPrevPage] = useState<boolean>(false);
  
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [filters, setFilters] = useState<MovementFilters>(initialFilters);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchMovements = useCallback(async (newFilters?: MovementFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const appliedFilters = newFilters || filters;
      const response = await movementService.getAll(appliedFilters);
      
      // Garantir que response.data é sempre um array - tratar diferentes estruturas de resposta
      let rawMovementsData: any[] = [];
      
      if (Array.isArray((response as any)?.data)) {
        rawMovementsData = (response as any).data;
      } else if (Array.isArray((response as any)?.data?.data)) {
        rawMovementsData = (response as any).data.data;
      } else if (Array.isArray(response)) {
        rawMovementsData = response as any;
      } else if ((response as any)?.data?.movements && Array.isArray((response as any).data.movements)) {
        rawMovementsData = (response as any).data.movements;
      } else {
        console.warn('Estrutura de resposta inesperada para movimentações:', response);
        rawMovementsData = [];
      }
      
      // 🔄 MAPEAR dados da API para formato Movement com relacionamentos corretos
      const movementsData = rawMovementsData.map(mapApiMovementToMovement);
      
      setData(movementsData);
      setTotal(movementsData.length);
      
      if (newFilters) {
        setFilters(appliedFilters);
      }

      console.log(`✅ ${movementsData.length} movimentações carregadas e mapeadas`);
    } catch (error: any) {
      handleError(error, 'carregar movimentações');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]); // Removido 'filters' das dependências para evitar loop

  const getMovementsByProduct = useCallback(async (productId: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await movementService.getByProduct(productId);
      
      // Garantir que response.data é sempre um array
      let rawMovementsData: any[] = [];
      
      if (Array.isArray((response as any)?.data)) {
        rawMovementsData = (response as any).data;
      } else if (Array.isArray((response as any)?.data?.data)) {
        rawMovementsData = (response as any).data.data;
      } else if (Array.isArray(response)) {
        rawMovementsData = response as any;
      } else {
        console.warn('Estrutura de resposta inesperada para movimentações do produto:', response);
        rawMovementsData = [];
      }
      
      // 🔄 MAPEAR dados da API para formato Movement com relacionamentos corretos
      const movementsData = rawMovementsData.map(mapApiMovementToMovement);
      
      setData(movementsData);
      setTotal(movementsData.length);
      console.log(`✅ ${movementsData.length} movimentações do produto carregadas`);
    } catch (error: any) {
      handleError(error, 'carregar movimentações do produto');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const getMovementsByLocation = useCallback(async (locationId: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await movementService.getByLocation(locationId);
      
      // Garantir que response.data é sempre um array
      let rawMovementsData: any[] = [];
      
      if (Array.isArray((response as any)?.data)) {
        rawMovementsData = (response as any).data;
      } else if (Array.isArray((response as any)?.data?.data)) {
        rawMovementsData = (response as any).data.data;
      } else if (Array.isArray(response)) {
        rawMovementsData = response as any;
      } else {
        console.warn('Estrutura de resposta inesperada para movimentações da localização:', response);
        rawMovementsData = [];
      }
      
      // 🔄 MAPEAR dados da API para formato Movement com relacionamentos corretos
      const movementsData = rawMovementsData.map(mapApiMovementToMovement);
      
      setData(movementsData);
      setTotal(movementsData.length);
      console.log(`✅ ${movementsData.length} movimentações da localização carregadas`);
    } catch (error: any) {
      handleError(error, 'carregar movimentações da localização');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const createMovement = useCallback(async (movementData: CreateMovementFormData): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await movementService.create(movementData);
      // 🔄 MAPEAR nova movimentação da API
      const mappedMovement = mapApiMovementToMovement(response.data);
      setData(prevData => [mappedMovement, ...prevData]);
      setTotal(prevTotal => prevTotal + 1);
      console.log('✅ Movimentação criada com sucesso');
    } catch (error: any) {
      handleError(error, 'criar movimentação');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const getMovement = useCallback(async (id: string): Promise<Movement | null> => {
    clearError();

    try {
      // Buscar na lista local primeiro
      const localMovement = data.find(movement => movement.id === id);
      if (localMovement) {
        return localMovement;
      }

      // TODO: Implementar endpoint específico se necessário
      console.warn('Endpoint específico para movimento não implementado');
      return null;
    } catch (error: any) {
      handleError(error, 'carregar movimentação');
      return null;
    }
  }, [data, handleError, clearError]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchMovements(filters);
  }, [fetchMovements, filters]);

  useEffect(() => {
    if (autoFetch) {
      fetchMovements(filters);
    }
  }, [autoFetch]); // Removido fetchMovements das dependências para evitar loop

  return {
    data,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    selectedMovement,
    movements: data, // Getter conveniente
    filters,
    fetchMovements,
    getMovementsByProduct,
    getMovementsByLocation,
    createMovement,
    getMovement,
    setSelectedMovement,
    setFilters,
    clearError,
    refetch,
  };
};

export default useMovements; 