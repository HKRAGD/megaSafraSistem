import { useState, useEffect, useCallback } from 'react';
import { ProductWithRelations } from '../types';
import { apiGet, extractErrorMessage } from '../services/api';
import { AxiosError } from 'axios';

interface ProductGroupDetails {
  batchId: string;
  clientId: string;
  clientName: string;
  products: ProductWithRelations[];
  totalProducts: number;
  allocatedProducts: number;
  createdAt: string;
}

interface UseProductGroupDetailsResult {
  data: ProductGroupDetails | null;
  loading: boolean;
  error: string | null;
  allocatedCount: number;
  totalCount: number;
  progressPercentage: number;
  refreshGroup: () => Promise<void>;
  clearError: () => void;
}

export const useProductGroupDetails = (batchId: string | undefined): UseProductGroupDetailsResult => {
  const [data, setData] = useState<ProductGroupDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchGroupDetails = useCallback(async (showLoading = true) => {
    if (!batchId) {
      setError('ID do lote não fornecido');
      return;
    }

    try {
      if (showLoading) setLoading(true);
      setError(null);

      const result = await apiGet<{success: boolean; data: ProductGroupDetails; message?: string}>(`/products/by-batch/${batchId}`);

      if (result.success && result.data) {
        setData(result.data);
      } else {
        throw new Error(result.message || 'Erro ao carregar detalhes do grupo');
      }
    } catch (err) {
      const errorMessage = err instanceof AxiosError 
        ? extractErrorMessage(err)
        : err instanceof Error 
          ? err.message 
          : 'Erro desconhecido ao carregar detalhes do grupo';
      
      console.error('Erro ao carregar detalhes do grupo:', err);
      setError(errorMessage);
      setData(null);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [batchId]);

  const refreshGroup = useCallback(async () => {
    await fetchGroupDetails(false); // Refresh sem loading para não interferir na UX
  }, [fetchGroupDetails]);

  // Fetch inicial quando o batchId muda
  useEffect(() => {
    if (batchId) {
      fetchGroupDetails(true);
    } else {
      setData(null);
      setError(null);
      setLoading(false);
    }
  }, [batchId, fetchGroupDetails]);

  // Cálculos derivados
  const allocatedCount = data?.allocatedProducts || 0;
  const totalCount = data?.totalProducts || 0;
  const progressPercentage = totalCount > 0 ? (allocatedCount / totalCount) * 100 : 0;

  return {
    data,
    loading,
    error,
    allocatedCount,
    totalCount,
    progressPercentage,
    refreshGroup,
    clearError,
  };
};