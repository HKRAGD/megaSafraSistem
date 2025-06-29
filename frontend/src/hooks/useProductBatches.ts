import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { URGENT_EXPIRATION_DAYS } from '../utils/constants';

interface ProductBatch {
  batchId: string | null;
  clientId: string;
  clientName: string;
  productCount: number;
  createdAt: string;
  products: any[]; // Usar ProductWithRelations em tipos reais
}

interface UseProductBatchesReturn {
  batches: ProductBatch[];
  loading: boolean;
  error: string | null;
  totalProducts: number;
  totalBatches: number;
  urgentBatches: number;
  fetchBatches: () => Promise<void>;
  refreshBatches: () => Promise<void>;
  clearError: () => void;
}

/**
 * Hook personalizado para gerenciar grupos de produtos (lotes) aguardando alocação.
 * 
 * Funcionalidades:
 * - Busca produtos agrupados por batchId
 * - Atualização automática e manual
 * - Estatísticas dos lotes
 * - Gerenciamento de estado de loading e erro
 * - Cache otimizado
 */
export const useProductBatches = (): UseProductBatchesReturn => {
  const [batches, setBatches] = useState<ProductBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.get('/api/products/pending-allocation-grouped');
      
      if (response.data?.success && response.data?.data?.batches) {
        setBatches(response.data.data.batches);
      } else {
        throw new Error('Formato de resposta inválido');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 
                          err.message || 
                          'Erro ao buscar grupos de produtos';
      
      setError(errorMessage);
      console.error('Erro ao buscar grupos de produtos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshBatches = useCallback(async () => {
    await fetchBatches();
  }, [fetchBatches]);

  // Fetch inicial
  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  // Estatísticas calculadas
  const statistics = useMemo(() => {
    const totalProducts = batches.reduce((sum, batch) => sum + batch.productCount, 0);
    const totalBatches = batches.length;
    
    // Contar lotes com produtos urgentes (validade próxima)
    const urgentBatches = batches.filter(batch => {
      const now = new Date();
      const urgentThreshold = new Date(now.getTime() + URGENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
      
      return batch.products.some(product => 
        product.expirationDate && new Date(product.expirationDate) < urgentThreshold
      );
    }).length;

    return {
      totalProducts,
      totalBatches,
      urgentBatches
    };
  }, [batches]);

  return {
    batches,
    loading,
    error,
    totalProducts: statistics.totalProducts,
    totalBatches: statistics.totalBatches,
    urgentBatches: statistics.urgentBatches,
    fetchBatches,
    refreshBatches,
    clearError,
  };
};