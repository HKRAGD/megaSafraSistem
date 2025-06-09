import { Location, LocationFilters, ApiResponse, LocationsResponse } from '../types';
import { apiGet, apiPost, apiPut } from './api';

/**
 * Service para operações com localizações
 */
export const locationService = {
  getAll: async (filters?: LocationFilters): Promise<ApiResponse<LocationsResponse>> => {
    return apiGet<ApiResponse<LocationsResponse>>('/locations', { params: filters });
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