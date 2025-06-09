import { apiGet } from './api';
import { DashboardApiResponse, ChamberStatusSummary, CapacityData, RecentMovementsResponse, ApiResponse } from '../types';

export const dashboardService = {
  getSummary: async (): Promise<ApiResponse<DashboardApiResponse>> => {
    return apiGet<ApiResponse<DashboardApiResponse>>('/dashboard/summary');
  },

  getChamberStatus: async (): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/dashboard/chamber-status');
  },

  getStorageCapacity: async (): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/dashboard/storage-capacity');
  },

  getRecentMovements: async (): Promise<ApiResponse<RecentMovementsResponse>> => {
    return apiGet<ApiResponse<RecentMovementsResponse>>('/dashboard/recent-movements');
  },
};

export default dashboardService; 