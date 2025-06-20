import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { SeedType, CreateSeedTypeFormData, ApiResponse, SeedTypesResponse } from '../types';

export const seedTypeService = {
  getAll: async (): Promise<ApiResponse<SeedTypesResponse>> => {
    return apiGet<ApiResponse<SeedTypesResponse>>('/seed-types');
  },

  getById: async (id: string): Promise<ApiResponse<SeedType>> => {
    return apiGet<ApiResponse<SeedType>>(`/seed-types/${id}`);
  },

  create: async (seedTypeData: CreateSeedTypeFormData): Promise<ApiResponse<SeedType>> => {
    return apiPost<ApiResponse<SeedType>>('/seed-types', seedTypeData);
  },

  update: async (id: string, seedTypeData: Partial<CreateSeedTypeFormData>): Promise<ApiResponse<SeedType>> => {
    return apiPut<ApiResponse<SeedType>>(`/seed-types/${id}`, seedTypeData);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiDelete<ApiResponse<void>>(`/seed-types/${id}`);
  },
};

export default seedTypeService; 