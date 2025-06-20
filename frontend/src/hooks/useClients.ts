import { useState, useEffect, useCallback } from 'react';
import { 
  Client, 
  CreateClientFormData, 
  UpdateClientFormData,
  ClientFilters,
  UseDataState 
} from '../types';
import { clientService } from '../services/clientService';

interface UseClientsOptions {
  autoFetch?: boolean;
}

interface UseClientsReturn extends UseDataState<Client> {
  selectedClient: Client | null;
  clients: Client[]; // Getter conveniente para data
  
  fetchClients: (filters?: ClientFilters) => Promise<void>;
  createClient: (clientData: CreateClientFormData) => Promise<void>;
  updateClient: (id: string, clientData: UpdateClientFormData) => Promise<void>;
  deleteClient: (id: string) => Promise<void>;
  getClient: (id: string) => Promise<Client | null>;
  searchClients: (query: string) => Promise<Client[]>;
  getStats: () => Promise<any>;
  
  setSelectedClient: (client: Client | null) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

export const useClients = (options: UseClientsOptions = {}): UseClientsReturn => {
  const { autoFetch = true } = options;

  const [data, setData] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);
  
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchClients = useCallback(async (filters?: ClientFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await clientService.getAll(filters);
      
      // Backend retorna: {success: true, data: [], pagination: {}, meta: {}}
      const clientsData = Array.isArray(response.data) ? response.data : [];
      const pagination = (response as any).pagination;
      
      setData(clientsData);
      setTotal(pagination?.total || pagination?.totalItems || clientsData.length);
      setCurrentPage(pagination?.current || pagination?.currentPage || 1);
      setTotalPages(pagination?.pages || pagination?.totalPages || 1);
      setHasNextPage(pagination?.hasNextPage || false);
      setHasPrevPage(pagination?.hasPrevPage || false);

      console.log(`✅ ${clientsData.length} clientes carregados do backend`);
    } catch (error: any) {
      console.error('❌ Erro ao carregar clientes do backend:', {
        status: error.response?.status,
        message: error.response?.data?.message || error.message,
        url: error.config?.url,
        method: error.config?.method
      });
      
      setData([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
      setHasNextPage(false);
      setHasPrevPage(false);
      handleError(error, 'carregar clientes do backend');
      
      console.warn('🚨 API de clientes falhando - verifique o backend');
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const createClient = useCallback(async (clientData: CreateClientFormData): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await clientService.create(clientData);
      
      setData(prevData => [response.data, ...prevData]);
      setTotal(prevTotal => prevTotal + 1);
      
      console.log('✅ Cliente criado com sucesso:', response.data.name);
    } catch (error: any) {
      handleError(error, 'criar cliente');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const updateClient = useCallback(async (
    id: string, 
    clientData: UpdateClientFormData
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await clientService.update(id, clientData);
      
      setData(prevData => 
        prevData.map(client => 
          client.id === id ? response.data : client
        )
      );
      
      if (selectedClient?.id === id) {
        setSelectedClient(response.data);
      }
      
      console.log('✅ Cliente atualizado com sucesso:', response.data.name);
    } catch (error: any) {
      handleError(error, 'atualizar cliente');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedClient, handleError, clearError]);

  const deleteClient = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      await clientService.delete(id);
      
      setData(prevData => prevData.filter(client => client.id !== id));
      setTotal(prevTotal => Math.max(0, prevTotal - 1));
      
      if (selectedClient?.id === id) {
        setSelectedClient(null);
      }
      
      console.log('✅ Cliente removido com sucesso');
    } catch (error: any) {
      handleError(error, 'remover cliente');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedClient, handleError, clearError]);

  const getClient = useCallback(async (id: string): Promise<Client | null> => {
    clearError();

    try {
      const response = await clientService.getById(id);
      
      console.log('✅ Cliente carregado:', response.data.name);
      return response.data;
    } catch (error: any) {
      handleError(error, 'carregar cliente');
      return null;
    }
  }, [handleError, clearError]);

  const searchClients = useCallback(async (query: string): Promise<Client[]> => {
    clearError();

    try {
      const response = await clientService.search(query);
      
      console.log(`✅ ${response.data.length} clientes encontrados na busca`);
      return response.data;
    } catch (error: any) {
      handleError(error, 'buscar clientes');
      return [];
    }
  }, [handleError, clearError]);

  const getStats = useCallback(async () => {
    clearError();

    try {
      const response = await clientService.getStats();
      
      console.log('✅ Estatísticas de clientes carregadas');
      return response.data;
    } catch (error: any) {
      handleError(error, 'carregar estatísticas de clientes');
      return null;
    }
  }, [handleError, clearError]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchClients();
  }, [fetchClients]);

  useEffect(() => {
    if (autoFetch) {
      fetchClients();
    }
  }, [autoFetch, fetchClients]);

  return {
    data,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    selectedClient,
    clients: data, // Getter conveniente
    fetchClients,
    createClient,
    updateClient,
    deleteClient,
    getClient,
    searchClients,
    getStats,
    setSelectedClient,
    clearError,
    refetch,
  };
};

export default useClients;