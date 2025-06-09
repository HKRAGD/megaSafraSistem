import { useState, useEffect, useMemo, useCallback } from 'react';
import { Product, Movement } from '../../../../types';
import { useMovements } from '../../../../hooks/useMovements';
import { 
  MovementFilters, 
  defaultMovementFilters, 
  filterMovements,
  calculateMovementStats
} from '../utils/movementHistoryUtils';

interface UseMovementHistoryLogicProps {
  open: boolean;
  product: Product | null;
}

export const useMovementHistoryLogic = ({ open, product }: UseMovementHistoryLogicProps) => {
  const {
    data: movements,
    loading,
    error,
    getMovementsByProduct: fetchMovementsByProduct,
  } = useMovements();

  const [filters, setFilters] = useState<MovementFilters>(defaultMovementFilters);

  // Carregar movimentações
  const loadMovements = useCallback(async () => {
    if (product) {
      try {
        await fetchMovementsByProduct(product.id);
      } catch (error) {
        console.error('Erro ao carregar histórico:', error);
      }
    }
  }, [product, fetchMovementsByProduct]);

  // Carregar movimentações quando modal abre
  useEffect(() => {
    if (open && product) {
      loadMovements();
    }
  }, [open, product, loadMovements]);

  // Movimentações filtradas com memoização
  const filteredMovements = useMemo(() => {
    return filterMovements(movements, filters);
  }, [movements, filters]);

  // Estatísticas calculadas
  const stats = useMemo(() => {
    return calculateMovementStats(filteredMovements);
  }, [filteredMovements]);

  // Alterar filtros
  const handleFilterChange = useCallback((field: string | number | symbol, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  }, []);

  // Reset filtros
  const resetFilters = useCallback(() => {
    setFilters(defaultMovementFilters);
  }, []);

  // Handler para refresh (alias para loadMovements)
  const handleRefresh = loadMovements;

  return {
    // Dados
    movements,
    filteredMovements,
    loading,
    error,
    stats,
    
    // Filtros
    filters,
    handleFilterChange,
    resetFilters,
    
    // Ações
    loadMovements,
    handleRefresh,
    
    // Estados derivados
    hasMovements: movements.length > 0,
    hasFilteredMovements: filteredMovements.length > 0,
    isEmpty: !loading && !error && movements.length === 0,
    isFiltered: !loading && !error && movements.length > 0 && filteredMovements.length === 0,
  };
}; 