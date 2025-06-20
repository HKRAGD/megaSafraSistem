/**
 * Hook customizado para solicitações de retirada
 * Gerencia fluxo completo de withdrawal requests
 */

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from './useAuth';
import { withdrawalService } from '../services/withdrawalService';
import { WithdrawalRequest, WithdrawalRequestWithRelations } from '../types';

interface WithdrawalFilters {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  productId?: string;
  requestedBy?: string;
}

interface WithdrawalStats {
  total: number;
  pending: number;
  confirmed: number;
  canceled: number;
  byType: {
    TOTAL: number;
    PARCIAL: number;
  };
}

interface UseWithdrawalRequestsReturn {
  // Estado
  loading: boolean;
  error: string | null;
  withdrawals: WithdrawalRequestWithRelations[];
  pendingWithdrawals: WithdrawalRequestWithRelations[];
  myWithdrawals: WithdrawalRequestWithRelations[];
  stats: WithdrawalStats | null;
  
  // Paginação
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  
  // Ações ADMIN
  createWithdrawalRequest: (
    productId: string, 
    type: 'TOTAL' | 'PARCIAL', 
    quantityRequested?: number, 
    reason?: string
  ) => Promise<WithdrawalRequest | null>;
  cancelWithdrawalRequest: (withdrawalId: string, reason?: string) => Promise<boolean>;
  updateWithdrawalRequest: (
    withdrawalId: string, 
    data: { type?: string; quantityRequested?: number; reason?: string }
  ) => Promise<WithdrawalRequest | null>;
  
  // Ações OPERATOR
  confirmWithdrawalRequest: (withdrawalId: string, notes?: string) => Promise<boolean>;
  
  // Consultas
  fetchWithdrawals: (filters?: WithdrawalFilters) => Promise<void>;
  fetchPendingWithdrawals: () => Promise<void>;
  fetchMyWithdrawals: (role?: 'requested' | 'confirmed' | 'canceled') => Promise<void>;
  fetchWithdrawalById: (withdrawalId: string) => Promise<WithdrawalRequestWithRelations | null>;
  fetchWithdrawalsByProduct: (productId: string) => Promise<WithdrawalRequest[]>;
  fetchWithdrawalsStats: () => Promise<void>;
  
  // Relatórios
  generateWithdrawalsReport: (
    startDate?: string, 
    endDate?: string, 
    options?: {
      includeStats?: boolean;
      includeByType?: boolean;
      includeByStatus?: boolean;
    }
  ) => Promise<any>;
  
  // Utilitários
  refreshData: () => Promise<void>;
  clearError: () => void;
  
  // Helpers
  canCreateWithdrawal: () => boolean;
  canConfirmWithdrawal: () => boolean;
  canCancelWithdrawal: () => boolean;
  canViewStats: () => boolean;
}

export const useWithdrawalRequests = (): UseWithdrawalRequestsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequestWithRelations[]>([]);
  const [pendingWithdrawals, setPendingWithdrawals] = useState<WithdrawalRequestWithRelations[]>([]);
  const [myWithdrawals, setMyWithdrawals] = useState<WithdrawalRequestWithRelations[]>([]);
  const [stats, setStats] = useState<WithdrawalStats | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  
  // Store last applied filters to preserve them after operations
  const [lastAppliedFilters, setLastAppliedFilters] = useState<WithdrawalFilters>({});

  const { user, isAdmin, isOperator } = useAuth();

  const handleAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await operation();
      
      if (successMessage) {
        console.log(successMessage);
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro inesperado';
      setError(errorMessage);
      console.error('Erro na operação:', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // HELPERS DE PERMISSÃO
  // ============================================================================

  const canCreateWithdrawal = useCallback(() => isAdmin(), [isAdmin]);
  const canConfirmWithdrawal = useCallback(() => isOperator(), [isOperator]);
  const canCancelWithdrawal = useCallback(() => isAdmin(), [isAdmin]);
  const canViewStats = useCallback(() => isAdmin(), [isAdmin]);

  // ============================================================================
  // AÇÕES ADMIN
  // ============================================================================

  const createWithdrawalRequest = useCallback(async (
    productId: string,
    type: 'TOTAL' | 'PARCIAL',
    quantityRequested?: number,
    reason?: string
  ): Promise<WithdrawalRequest | null> => {
    if (!canCreateWithdrawal()) {
      setError('Apenas administradores podem criar solicitações de retirada');
      return null;
    }

    const result = await handleAsync(
      () => withdrawalService.createWithdrawalRequest({
        productId,
        type,
        quantityRequested,
        reason
      }),
      'Solicitação de retirada criada com sucesso'
    );

    if (result) {
      // Atualizar listas locais
      await Promise.all([
        fetchPendingWithdrawals(),
        fetchMyWithdrawals('requested')
      ]);
    }

    return result;
  }, [canCreateWithdrawal, handleAsync]);

  const cancelWithdrawalRequest = useCallback(async (
    withdrawalId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!canCancelWithdrawal()) {
      setError('Apenas administradores podem cancelar solicitações');
      return false;
    }

    const result = await handleAsync(
      () => withdrawalService.cancelWithdrawalRequest(withdrawalId, reason),
      'Solicitação cancelada com sucesso'
    );

    if (result) {
      // Atualizar listas locais preservando filtros aplicados
      await Promise.all([
        fetchWithdrawals(lastAppliedFilters), // Usar filtros preservados
        fetchPendingWithdrawals(),
        fetchMyWithdrawals('requested')
      ]);
    }

    return result !== null;
  }, [canCancelWithdrawal, handleAsync, lastAppliedFilters]);

  const updateWithdrawalRequest = useCallback(async (
    withdrawalId: string,
    data: { type?: string; quantityRequested?: number; reason?: string }
  ): Promise<WithdrawalRequest | null> => {
    if (!canCreateWithdrawal()) {
      setError('Apenas administradores podem atualizar solicitações');
      return null;
    }

    const result = await handleAsync(
      () => withdrawalService.updateWithdrawalRequest(withdrawalId, data),
      'Solicitação atualizada com sucesso'
    );

    if (result) {
      // Atualizar listas locais
      await Promise.all([
        fetchPendingWithdrawals(),
        fetchMyWithdrawals('requested')
      ]);
    }

    return result;
  }, [canCreateWithdrawal, handleAsync]);

  // ============================================================================
  // AÇÕES OPERATOR
  // ============================================================================

  const confirmWithdrawalRequest = useCallback(async (
    withdrawalId: string,
    notes?: string
  ): Promise<boolean> => {
    if (!canConfirmWithdrawal()) {
      setError('Apenas operadores podem confirmar solicitações');
      return false;
    }

    const result = await handleAsync(
      () => withdrawalService.confirmWithdrawalRequest(withdrawalId, notes),
      'Retirada confirmada com sucesso'
    );

    if (result) {
      // Atualizar listas locais preservando filtros aplicados
      await Promise.all([
        fetchWithdrawals(lastAppliedFilters), // Usar filtros preservados
        fetchPendingWithdrawals(),
        fetchMyWithdrawals('confirmed')
      ]);
    }

    return result !== null;
  }, [canConfirmWithdrawal, handleAsync, lastAppliedFilters]);

  // ============================================================================
  // CONSULTAS
  // ============================================================================

  const fetchWithdrawals = useCallback(async (filters: WithdrawalFilters = {}) => {
    // Store applied filters for later use
    setLastAppliedFilters(filters);
    
    const result = await handleAsync(
      () => withdrawalService.getWithdrawals(filters)
    );

    if (result) {
      // FIX: Garantir novas instâncias de objeto para cada withdrawal
      setWithdrawals(result.withdrawals ? result.withdrawals.map(w => ({ ...w })) : []);
      setPagination(result.pagination || {
        page: 1,
        limit: 20,
        total: 0,
        pages: 0
      });
    }
  }, [handleAsync]);

  const fetchPendingWithdrawals = useCallback(async () => {
    const result = await handleAsync(
      () => withdrawalService.getPendingWithdrawals()
    );

    if (result) {
      // FIX: Garantir novas instâncias de objeto para cada pending withdrawal
      setPendingWithdrawals(result ? result.map(w => ({ ...w })) : []);
    }
  }, [handleAsync]);

  const fetchMyWithdrawals = useCallback(async (role: 'requested' | 'confirmed' | 'canceled' = 'requested') => {
    const result = await handleAsync(
      () => withdrawalService.getMyWithdrawals(role)
    );

    if (result) {
      // FIX: Garantir novas instâncias de objeto para cada my withdrawal
      setMyWithdrawals(result ? result.map(w => ({ ...w })) : []);
    }
  }, [handleAsync]);

  const fetchWithdrawalById = useCallback(async (withdrawalId: string): Promise<WithdrawalRequestWithRelations | null> => {
    return handleAsync(
      () => withdrawalService.getWithdrawalById(withdrawalId)
    );
  }, [handleAsync]);

  const fetchWithdrawalsByProduct = useCallback(async (productId: string): Promise<WithdrawalRequest[]> => {
    const result = await handleAsync(
      () => withdrawalService.getWithdrawalsByProduct(productId)
    );

    return result || [];
  }, [handleAsync]);

  const fetchWithdrawalsStats = useCallback(async () => {
    if (!canViewStats()) {
      setError('Você não tem permissão para ver estatísticas');
      return;
    }

    const result = await handleAsync(
      () => withdrawalService.getWithdrawalsStats()
    );

    if (result) {
      setStats(result);
    }
  }, [canViewStats, handleAsync]);

  // ============================================================================
  // RELATÓRIOS
  // ============================================================================

  const generateWithdrawalsReport = useCallback(async (
    startDate?: string,
    endDate?: string,
    options: {
      includeStats?: boolean;
      includeByType?: boolean;
      includeByStatus?: boolean;
    } = {}
  ): Promise<any> => {
    if (!canViewStats()) {
      setError('Você não tem permissão para gerar relatórios');
      return null;
    }

    return handleAsync(
      () => withdrawalService.getWithdrawalsReport(startDate, endDate, options)
    );
  }, [canViewStats, handleAsync]);

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  const refreshData = useCallback(async () => {
    const promises = [fetchWithdrawals(lastAppliedFilters)];

    if (isAdmin() || isOperator()) {
      promises.push(fetchPendingWithdrawals());
    }

    if (user) {
      promises.push(fetchMyWithdrawals());
    }

    if (isAdmin()) {
      promises.push(fetchWithdrawalsStats());
    }

    await Promise.all(promises);
  }, [fetchWithdrawals, fetchPendingWithdrawals, fetchMyWithdrawals, fetchWithdrawalsStats, isAdmin, isOperator, user, lastAppliedFilters]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // EFEITOS
  // ============================================================================

  // Carregar dados iniciais
  useEffect(() => {
    if (user && (isAdmin() || isOperator())) {
      refreshData();
    }
  }, [user, isAdmin, isOperator, refreshData]);

  return {
    // Estado
    loading,
    error,
    withdrawals,
    pendingWithdrawals,
    myWithdrawals,
    stats,
    pagination,
    
    // Ações ADMIN
    createWithdrawalRequest,
    cancelWithdrawalRequest,
    updateWithdrawalRequest,
    
    // Ações OPERATOR
    confirmWithdrawalRequest,
    
    // Consultas
    fetchWithdrawals,
    fetchPendingWithdrawals,
    fetchMyWithdrawals,
    fetchWithdrawalById,
    fetchWithdrawalsByProduct,
    fetchWithdrawalsStats,
    
    // Relatórios
    generateWithdrawalsReport,
    
    // Utilitários
    refreshData,
    clearError,
    
    // Helpers
    canCreateWithdrawal,
    canConfirmWithdrawal,
    canCancelWithdrawal,
    canViewStats
  };
};