import { apiGet, apiPost } from './api';
import { Movement, CreateMovementFormData, MovementFilters, ApiResponse } from '../types';

export const movementService = {
  getAll: async (filters?: MovementFilters): Promise<ApiResponse<Movement[]>> => {
    return apiGet<ApiResponse<Movement[]>>('/movements', { params: filters });
  },

  getByProduct: async (productId: string): Promise<ApiResponse<Movement[]>> => {
    return apiGet<ApiResponse<Movement[]>>(`/movements/product/${productId}`);
  },

  getByLocation: async (locationId: string): Promise<ApiResponse<Movement[]>> => {
    return apiGet<ApiResponse<Movement[]>>(`/movements/location/${locationId}`);
  },

  create: async (movementData: CreateMovementFormData): Promise<ApiResponse<Movement>> => {
    return apiPost<ApiResponse<Movement>>('/movements', movementData);
  },
};

export default movementService;

 