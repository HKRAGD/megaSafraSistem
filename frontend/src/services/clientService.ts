import { apiGet, apiPost, apiPut, apiDelete } from './api';
import { 
  Client, 
  CreateClientFormData, 
  UpdateClientFormData, 
  ClientFilters, 
  ApiResponse,
  ClientsResponse 
} from '../types';

export const clientService = {
  getAll: async (filters?: ClientFilters): Promise<ApiResponse<ClientsResponse>> => {
    const queryParams = new URLSearchParams();
    
    if (filters?.search) queryParams.append('search', filters.search);
    if (filters?.documentType) queryParams.append('documentType', filters.documentType);
    if (filters?.isActive !== undefined) queryParams.append('isActive', String(filters.isActive));
    if (filters?.page) queryParams.append('page', String(filters.page));
    if (filters?.limit) queryParams.append('limit', String(filters.limit));
    if (filters?.sort) queryParams.append('sort', filters.sort);
    if (filters?.sortOrder) queryParams.append('sortOrder', filters.sortOrder);

    const queryString = queryParams.toString();
    const url = queryString ? `/clients?${queryString}` : '/clients';
    
    return apiGet<ApiResponse<ClientsResponse>>(url);
  },

  getById: async (id: string): Promise<ApiResponse<Client>> => {
    return apiGet<ApiResponse<Client>>(`/clients/${id}`);
  },

  create: async (clientData: CreateClientFormData): Promise<ApiResponse<Client>> => {
    return apiPost<ApiResponse<Client>>('/clients', clientData);
  },

  update: async (id: string, clientData: UpdateClientFormData): Promise<ApiResponse<Client>> => {
    return apiPut<ApiResponse<Client>>(`/clients/${id}`, clientData);
  },

  delete: async (id: string): Promise<ApiResponse<void>> => {
    return apiDelete<ApiResponse<void>>(`/clients/${id}`);
  },

  search: async (query: string): Promise<ApiResponse<Client[]>> => {
    return apiGet<ApiResponse<Client[]>>(`/clients/search?q=${encodeURIComponent(query)}`);
  },

  getStats: async (): Promise<ApiResponse<any>> => {
    return apiGet<ApiResponse<any>>('/clients/stats');
  },

  // Método conveniente para validar documento
  validateDocument: (document: string, type: 'CPF' | 'CNPJ'): boolean => {
    const cleaned = document.replace(/\D/g, '');
    
    if (type === 'CPF') {
      return cleaned.length === 11;
    } else if (type === 'CNPJ') {
      return cleaned.length === 14;
    }
    
    return false;
  },

  // Método para formatar documento
  formatDocument: (document: string, type: 'CPF' | 'CNPJ'): string => {
    // Verificar se o documento existe e não é null/undefined
    if (!document || typeof document !== 'string') {
      return document || '';
    }
    
    const cleaned = document.replace(/\D/g, '');
    
    if (type === 'CPF' && cleaned.length === 11) {
      return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    } else if (type === 'CNPJ' && cleaned.length === 14) {
      return cleaned.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
    }
    
    return document;
  }
};

export default clientService;