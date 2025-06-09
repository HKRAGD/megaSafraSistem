import { 
  Chamber, 
  CreateChamberFormData,
  ApiResponse,
  PaginatedResponse,
  ChambersResponse 
} from '../types';
import { apiGet, apiPost, apiPut, apiDelete } from './api';

// ============================================================================
// CHAMBER SERVICE - CRUD de Câmaras
// ============================================================================

/**
 * Service responsável por todas as operações com câmaras
 * Endpoints baseados na documentação: /api/chambers/*
 */
export const chamberService = {
  /**
   * Listar todas as câmaras
   * GET /api/chambers
   */
  getAll: async (): Promise<ApiResponse<ChambersResponse>> => {
    try {
      // Buscar com mais itens por página para mostrar todas as câmaras
      const response = await apiGet<ApiResponse<ChambersResponse>>('/chambers?limit=100&page=1');
      console.log(`✅ ${response.data.chambers.length} câmaras carregadas`);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao carregar câmaras:', error);
      throw error;
    }
  },

  /**
   * Obter câmara específica por ID
   * GET /api/chambers/:id
   */
  getById: async (id: string): Promise<ApiResponse<Chamber>> => {
    try {
      const response = await apiGet<ApiResponse<Chamber>>(`/chambers/${id}`);
      console.log('✅ Câmara carregada:', response.data.name);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao carregar câmara:', error);
      throw error;
    }
  },

  /**
   * Criar nova câmara
   * POST /api/chambers
   */
  create: async (chamberData: CreateChamberFormData): Promise<ApiResponse<Chamber>> => {
    try {
      const response = await apiPost<ApiResponse<Chamber>>('/chambers', chamberData);
      console.log('✅ Câmara criada:', response.data.name);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao criar câmara:', error);
      throw error;
    }
  },

  /**
   * Atualizar câmara existente
   * PUT /api/chambers/:id
   */
  update: async (id: string, chamberData: Partial<CreateChamberFormData>): Promise<ApiResponse<Chamber>> => {
    try {
      const response = await apiPut<ApiResponse<Chamber>>(`/chambers/${id}`, chamberData);
      console.log('✅ Câmara atualizada:', response.data.name);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar câmara:', error);
      throw error;
    }
  },

  /**
   * Deletar câmara
   * DELETE /api/chambers/:id?permanent=true
   */
  delete: async (id: string, permanent: boolean = true): Promise<ApiResponse<void>> => {
    try {
      const queryParam = permanent ? '?permanent=true' : '';
      const response = await apiDelete<ApiResponse<void>>(`/chambers/${id}${queryParam}`);
      console.log(`✅ Câmara ${permanent ? 'removida permanentemente' : 'desativada'} com sucesso`);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao remover câmara:', error);
      throw error;
    }
  },

  /**
   * Gerar localizações para câmara
   * POST /api/chambers/:id/generate-locations
   */
  generateLocations: async (id: string, options: {
    maxCapacityKg?: number;
    overwrite?: boolean;
    optimizeAccess?: boolean;
    capacityVariation?: boolean;
  } = {}): Promise<ApiResponse<{ 
    locationsCreated?: number;
    generated?: { count: number; maxCapacityKg: number; overwrite: boolean; configuration: any };
  }>> => {
    try {
      const {
        maxCapacityKg = 1000,
        overwrite = true, // Por padrão permitir sobrescrever localizações existentes
        optimizeAccess = true,
        capacityVariation = true
      } = options;

      const response = await apiPost<ApiResponse<{ locationsCreated: number }>>(`/chambers/${id}/generate-locations`, {
        maxCapacityKg,
        overwrite,
        optimizeAccess,
        capacityVariation
      });
      console.log('✅ Localizações geradas:', response.data.locationsCreated);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao gerar localizações:', error);
      throw error;
    }
  },

  /**
   * Análise de capacidade da câmara
   * GET /api/chambers/:id/capacity-analysis
   */
  getCapacityAnalysis: async (id: string): Promise<ApiResponse<{
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    occupancyRate: number;
    locationsTotal: number;
    locationsOccupied: number;
    locationsAvailable: number;
  }>> => {
    try {
      const response = await apiGet<ApiResponse<{
        totalCapacity: number;
        usedCapacity: number;
        availableCapacity: number;
        occupancyRate: number;
        locationsTotal: number;
        locationsOccupied: number;
        locationsAvailable: number;
      }>>(`/chambers/${id}/capacity-analysis`);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao obter análise de capacidade:', error);
      throw error;
    }
  },

  /**
   * Monitoramento ambiental da câmara
   * GET /api/chambers/:id/environmental-monitoring
   */
  getEnvironmentalMonitoring: async (id: string): Promise<ApiResponse<{
    currentTemperature: number;
    currentHumidity: number;
    temperatureHistory: Array<{ timestamp: string; value: number }>;
    humidityHistory: Array<{ timestamp: string; value: number }>;
    alerts: Array<{ type: string; message: string; timestamp: string }>;
  }>> => {
    try {
      const response = await apiGet<ApiResponse<{
        currentTemperature: number;
        currentHumidity: number;
        temperatureHistory: Array<{ timestamp: string; value: number }>;
        humidityHistory: Array<{ timestamp: string; value: number }>;
        alerts: Array<{ type: string; message: string; timestamp: string }>;
      }>>(`/chambers/${id}/environmental-monitoring`);
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao obter monitoramento ambiental:', error);
      throw error;
    }
  }
};

export default chamberService; 