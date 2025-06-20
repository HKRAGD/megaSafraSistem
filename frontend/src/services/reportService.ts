import { apiGet } from './api';
import { ReportFilters, ApiResponse } from '../types';

export const reportService = {
  getInventoryReport: async (filters?: ReportFilters): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/reports/inventory', { params: filters });
  },

  getMovementReport: async (filters?: ReportFilters): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/reports/movements', { params: filters });
  },

  getExpirationReport: async (days: number): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/reports/expiration', { params: { days } });
  },

  getCapacityReport: async (): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/reports/capacity');
  },

  getExecutiveReport: async (): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/reports/executive');
  },
};

export default reportService; 