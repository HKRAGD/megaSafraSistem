import { Location, LocationFilters, ApiResponse, LocationsResponse } from '../types';
import { apiGet, apiPost, apiPut } from './api';

/**
 * Service para operações com localizações
 */
export const locationService = {
  getAll: async (filters?: LocationFilters): Promise<ApiResponse<LocationsResponse>> => {
    return apiGet<ApiResponse<LocationsResponse>>('/locations', { params: filters });
  },

  /**
   * Busca TODAS as localizações sem limitação de paginação
   * Útil para o mapa 3D que precisa mostrar todas as localizações
   */
  getAllUnpaginated: async (filters?: LocationFilters): Promise<ApiResponse<{ locations: Location[] }>> => {
    const allFilters = {
      ...filters,
      limit: 10000, // Limite alto para garantir que pegue todas
      page: 1
    };
    
    try {
      console.log('🔍 locationService.getAllUnpaginated: Iniciando busca de todas as localizações...');
      
      const response = await apiGet<ApiResponse<LocationsResponse>>('/locations', { params: allFilters });
      
      console.log(`📦 Primeira página: ${response.data.locations.length} localizações`);
      console.log(`📊 Paginação:`, response.data.pagination);
      
      // Se ainda há mais páginas, buscar todas
      if (response.data.pagination && response.data.pagination.hasNextPage) {
        console.log(`🔄 Detectadas múltiplas páginas! Buscando todas as ${response.data.pagination.totalItems} localizações...`);
        
        const allLocations: Location[] = [...response.data.locations];
        const totalPages = response.data.pagination.totalPages;
        
        console.log(`📄 Total de páginas a buscar: ${totalPages}`);
        
        // Buscar páginas restantes
        const remainingRequests = [];
        for (let page = 2; page <= totalPages; page++) {
          remainingRequests.push(
            apiGet<ApiResponse<LocationsResponse>>('/locations', { 
              params: { ...allFilters, page } 
            })
          );
        }
        
        console.log(`🚀 Executando ${remainingRequests.length} requisições em paralelo...`);
        
        // Executar todas as requisições em paralelo
        const remainingResponses = await Promise.all(remainingRequests);
        
        // Concatenar todas as localizações
        remainingResponses.forEach((pageResponse, index) => {
          console.log(`📄 Página ${index + 2}: ${pageResponse.data.locations.length} localizações`);
          allLocations.push(...pageResponse.data.locations);
        });
        
        console.log(`✅ SUCESSO: ${allLocations.length} localizações carregadas de ${totalPages} páginas`);
        
        return {
          success: true,
          data: { locations: allLocations },
          message: `${allLocations.length} localizações carregadas (${totalPages} páginas)`
        };
      }
      
      // Se tem apenas uma página, retornar diretamente
      console.log(`✅ Página única: ${response.data.locations.length} localizações carregadas`);
      return {
        success: true,
        data: { locations: response.data.locations },
        message: `${response.data.locations.length} localizações carregadas (1 página)`
      };
      
    } catch (error) {
      console.error('❌ Erro ao buscar todas as localizações:', error);
      throw error;
    }
  },

  getByChamber: async (chamberId: string): Promise<ApiResponse<LocationsResponse>> => {
    return apiGet<ApiResponse<LocationsResponse>>(`/locations/chamber/${chamberId}`);
  },

  getAvailable: async (filters?: LocationFilters): Promise<ApiResponse<LocationsResponse>> => {
    return apiGet<ApiResponse<LocationsResponse>>('/locations/available', { params: filters });
  },

  getById: async (id: string): Promise<ApiResponse<Location>> => {
    return apiGet<ApiResponse<Location>>(`/locations/${id}`);
  },

  update: async (id: string, data: Partial<Location>): Promise<ApiResponse<Location>> => {
    return apiPut<ApiResponse<Location>>(`/locations/${id}`, data);
  }
};

export default locationService; 