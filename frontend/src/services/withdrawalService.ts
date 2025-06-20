/**
 * Service para solicitações de retirada
 * Gerencia fluxo completo de withdrawal requests
 */

import { WithdrawalRequest, WithdrawalRequestWithRelations, ApiResponse } from '../types';
import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from './api';

interface CreateWithdrawalRequestData {
  productId: string;
  type: 'TOTAL' | 'PARCIAL';
  quantityRequested?: number;
  reason?: string;
}

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

export const withdrawalService = {
  // ============================================================================
  // AÇÕES ADMIN
  // ============================================================================

  /**
   * Criar solicitação de retirada
   * POST /api/withdrawal-requests
   */
  createWithdrawalRequest: async (data: CreateWithdrawalRequestData): Promise<WithdrawalRequest> => {
    try {
      const response = await apiPost<ApiResponse<{ withdrawal: WithdrawalRequest }>>(
        '/withdrawal-requests',
        data
      );
      
      console.log('✅ Solicitação de retirada criada com sucesso');
      
      return response.data.withdrawal;
    } catch (error: any) {
      console.error('❌ Erro ao criar solicitação de retirada:', error);
      throw error;
    }
  },

  /**
   * Cancelar solicitação de retirada
   * PATCH /api/withdrawal-requests/:id/cancel
   */
  cancelWithdrawalRequest: async (withdrawalId: string, reason?: string): Promise<boolean> => {
    try {
      await apiPatch<ApiResponse<any>>(`/withdrawal-requests/${withdrawalId}/cancel`, {
        reason
      });
      
      console.log('✅ Solicitação cancelada com sucesso');
      
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao cancelar solicitação:', error);
      throw error;
    }
  },

  /**
   * Atualizar solicitação de retirada
   * PUT /api/withdrawal-requests/:id
   */
  updateWithdrawalRequest: async (
    withdrawalId: string,
    data: { type?: string; quantityRequested?: number; reason?: string }
  ): Promise<WithdrawalRequest> => {
    try {
      const response = await apiPut<ApiResponse<{ withdrawal: WithdrawalRequest }>>(
        `/withdrawal-requests/${withdrawalId}`,
        data
      );
      
      console.log('✅ Solicitação atualizada com sucesso');
      
      return response.data.withdrawal;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar solicitação:', error);
      throw error;
    }
  },

  // ============================================================================
  // AÇÕES OPERATOR
  // ============================================================================

  /**
   * Confirmar solicitação de retirada
   * PATCH /api/withdrawal-requests/:id/confirm
   */
  confirmWithdrawalRequest: async (withdrawalId: string, notes?: string): Promise<boolean> => {
    try {
      await apiPatch<ApiResponse<any>>(`/withdrawal-requests/${withdrawalId}/confirm`, {
        notes
      });
      
      console.log('✅ Retirada confirmada com sucesso');
      
      return true;
    } catch (error: any) {
      console.error('❌ Erro ao confirmar retirada:', error);
      throw error;
    }
  },

  // ============================================================================
  // CONSULTAS
  // ============================================================================

  /**
   * Buscar todas as solicitações
   * GET /api/withdrawal-requests
   */
  getWithdrawals: async (filters: WithdrawalFilters = {}): Promise<{
    withdrawals: WithdrawalRequestWithRelations[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    try {
      const response = await apiGet<ApiResponse<{
        withdrawals: WithdrawalRequestWithRelations[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      }>>('/withdrawal-requests', {
        params: filters
      });
      
      console.log(`✅ ${response.data.withdrawals.length} solicitações carregadas`);
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao carregar solicitações:', error);
      throw error;
    }
  },

  /**
   * Buscar solicitações pendentes
   * GET /api/withdrawal-requests/pending
   */
  getPendingWithdrawals: async (): Promise<WithdrawalRequestWithRelations[]> => {
    try {
      const response = await apiGet<ApiResponse<{ withdrawals: WithdrawalRequestWithRelations[] }>>(
        '/withdrawal-requests/pending'
      );
      
      console.log(`✅ ${response.data.withdrawals.length} solicitações pendentes`);
      
      return response.data.withdrawals;
    } catch (error: any) {
      console.error('❌ Erro ao carregar solicitações pendentes:', error);
      throw error;
    }
  },

  /**
   * Buscar minhas solicitações
   * GET /api/withdrawal-requests/my-requests
   */
  getMyWithdrawals: async (role: 'requested' | 'confirmed' | 'canceled' = 'requested'): Promise<WithdrawalRequestWithRelations[]> => {
    try {
      const response = await apiGet<ApiResponse<{ withdrawals: WithdrawalRequestWithRelations[] }>>(
        '/withdrawal-requests/my-requests',
        {
          params: { role }
        }
      );
      
      console.log(`✅ ${response.data.withdrawals.length} minhas solicitações (${role})`);
      
      return response.data.withdrawals;
    } catch (error: any) {
      console.error('❌ Erro ao carregar minhas solicitações:', error);
      throw error;
    }
  },

  /**
   * Buscar solicitação por ID
   * GET /api/withdrawal-requests/:id
   */
  getWithdrawalById: async (withdrawalId: string): Promise<WithdrawalRequestWithRelations> => {
    try {
      const response = await apiGet<ApiResponse<{ withdrawal: WithdrawalRequestWithRelations }>>(
        `/withdrawal-requests/${withdrawalId}`
      );
      
      console.log('✅ Solicitação carregada');
      
      return response.data.withdrawal;
    } catch (error: any) {
      console.error('❌ Erro ao carregar solicitação:', error);
      throw error;
    }
  },

  /**
   * Buscar solicitações por produto
   * GET /api/withdrawal-requests/product/:productId
   */
  getWithdrawalsByProduct: async (productId: string): Promise<WithdrawalRequest[]> => {
    try {
      const response = await apiGet<ApiResponse<{ withdrawals: WithdrawalRequest[] }>>(
        `/withdrawal-requests/product/${productId}`
      );
      
      console.log(`✅ ${response.data.withdrawals.length} solicitações para o produto`);
      
      return response.data.withdrawals;
    } catch (error: any) {
      console.error('❌ Erro ao carregar solicitações do produto:', error);
      throw error;
    }
  },

  /**
   * Buscar estatísticas de solicitações
   * GET /api/withdrawal-requests/stats
   */
  getWithdrawalsStats: async (): Promise<WithdrawalStats> => {
    try {
      const response = await apiGet<ApiResponse<WithdrawalStats>>('/withdrawal-requests/stats');
      
      console.log('✅ Estatísticas carregadas');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao carregar estatísticas:', error);
      throw error;
    }
  },

  // ============================================================================
  // RELATÓRIOS
  // ============================================================================

  /**
   * Gerar relatório de solicitações
   * GET /api/withdrawal-requests/report
   */
  getWithdrawalsReport: async (
    startDate?: string,
    endDate?: string,
    options: {
      includeStats?: boolean;
      includeByType?: boolean;
      includeByStatus?: boolean;
    } = {}
  ): Promise<any> => {
    try {
      const params: any = {};
      
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      if (options.includeStats !== undefined) params.includeStats = options.includeStats;
      if (options.includeByType !== undefined) params.includeByType = options.includeByType;
      if (options.includeByStatus !== undefined) params.includeByStatus = options.includeByStatus;

      const response = await apiGet<ApiResponse<any>>('/withdrawal-requests/report', {
        params
      });
      
      console.log('✅ Relatório gerado com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao gerar relatório:', error);
      throw error;
    }
  },

  // ============================================================================
  // FUNÇÕES DE CONVENIÊNCIA
  // ============================================================================

  /**
   * Buscar solicitações por usuário
   */
  getWithdrawalsByUser: async (
    userId: string,
    options: {
      role: 'requested' | 'confirmed' | 'canceled';
      page?: number;
      limit?: number;
    }
  ): Promise<{
    withdrawals: WithdrawalRequestWithRelations[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      pages: number;
    };
  }> => {
    try {
      // Como não temos endpoint específico para usuário, usar minhas solicitações
      const withdrawals = await withdrawalService.getMyWithdrawals(options.role);
      
      // Simular paginação básica
      const page = options.page || 1;
      const limit = options.limit || 20;
      const startIndex = (page - 1) * limit;
      const endIndex = startIndex + limit;
      
      const paginatedWithdrawals = withdrawals.slice(startIndex, endIndex);
      
      return {
        withdrawals: paginatedWithdrawals,
        pagination: {
          page,
          limit,
          total: withdrawals.length,
          pages: Math.ceil(withdrawals.length / limit)
        }
      };
    } catch (error: any) {
      console.error('❌ Erro ao buscar solicitações do usuário:', error);
      throw error;
    }
  }
};

export default withdrawalService;