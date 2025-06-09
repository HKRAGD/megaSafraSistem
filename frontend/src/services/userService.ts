import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { User, CreateUserFormData, UpdateUserFormData, UserFilters, ApiResponse } from '../types';

export const userService = {
  getAll: async (filters?: UserFilters): Promise<ApiResponse<User[]>> => {
    return apiGet<ApiResponse<User[]>>('/users');
  },

  getById: async (id: string): Promise<ApiResponse<User>> => {
    return apiGet<ApiResponse<User>>(`/users/${id}`);
  },

  create: async (userData: CreateUserFormData): Promise<ApiResponse<User>> => {
    return apiPost<ApiResponse<User>>('/users', userData);
  },

  update: async (id: string, userData: UpdateUserFormData): Promise<ApiResponse<User>> => {
    return apiPut<ApiResponse<User>>(`/users/${id}`, userData);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiDelete<ApiResponse<void>>(`/users/${id}`);
  },
};

export default userService; 