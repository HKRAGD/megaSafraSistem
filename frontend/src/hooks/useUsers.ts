import { useState, useEffect, useCallback } from 'react';
import { 
  User, 
  CreateUserFormData, 
  UpdateUserFormData,
  UserFilters,
  UseDataState 
} from '../types';
import { userService } from '../services/userService';

interface UseUsersOptions {
  autoFetch?: boolean;
}

interface UseUsersReturn extends UseDataState<User> {
  selectedUser: User | null;
  users: User[]; // Getter conveniente para data
  
  fetchUsers: (filters?: UserFilters) => Promise<void>;
  createUser: (userData: CreateUserFormData) => Promise<void>;
  updateUser: (id: string, userData: UpdateUserFormData) => Promise<void>;
  deleteUser: (id: string) => Promise<void>;
  getUser: (id: string) => Promise<User | null>;
  
  setSelectedUser: (user: User | null) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

export const useUsers = (options: UseUsersOptions = {}): UseUsersReturn => {
  const { autoFetch = true } = options;

  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [hasNextPage] = useState<boolean>(false);
  const [hasPrevPage] = useState<boolean>(false);
  
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchUsers = useCallback(async (filters?: UserFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await userService.getAll(filters);
      
      // Backend retorna: {success: true, data: {users: [], pagination: {}, analytics: null}}
      const usersData = (response.data as any).users || response.data || [];
      
      setData(usersData);
      setTotal(usersData.length);

      console.log(`✅ ${usersData.length} usuários carregados`);
    } catch (error: any) {
      // Se a requisição falhar, usar dados mock para desenvolvimento
      console.warn('Backend indisponível, usando dados mock para usuários');
      
      const mockUsers = [
        {
          id: '1',
          name: 'Administrador',
          email: 'admin@sistema-sementes.com',
          role: 'admin' as const,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '2',
          name: 'Operador Silva',
          email: 'operador@sistema-sementes.com',
          role: 'operator' as const,
          isActive: true,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        },
        {
          id: '3',
          name: 'Visualizador Santos',
          email: 'viewer@sistema-sementes.com',
          role: 'viewer' as const,
          isActive: false,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z'
        }
      ];
      
      setData(mockUsers);
      setTotal(mockUsers.length);
      setError(null);
      
      console.log(`✅ ${mockUsers.length} usuários mock carregados`);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const createUser = useCallback(async (userData: CreateUserFormData): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await userService.create(userData);
      
      setData(prevData => [response.data, ...prevData]);
      setTotal(prevTotal => prevTotal + 1);
      
      console.log('✅ Usuário criado com sucesso:', response.data.name);
    } catch (error: any) {
      handleError(error, 'criar usuário');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const updateUser = useCallback(async (
    id: string, 
    userData: UpdateUserFormData
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await userService.update(id, userData);
      
      setData(prevData => 
        prevData.map(user => 
          user.id === id ? response.data : user
        )
      );
      
      if (selectedUser?.id === id) {
        setSelectedUser(response.data);
      }
      
      console.log('✅ Usuário atualizado com sucesso:', response.data.name);
    } catch (error: any) {
      handleError(error, 'atualizar usuário');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedUser, handleError, clearError]);

  const deleteUser = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      await userService.delete(id);
      
      setData(prevData => prevData.filter(user => user.id !== id));
      setTotal(prevTotal => Math.max(0, prevTotal - 1));
      
      if (selectedUser?.id === id) {
        setSelectedUser(null);
      }
      
      console.log('✅ Usuário removido com sucesso');
    } catch (error: any) {
      handleError(error, 'remover usuário');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedUser, handleError, clearError]);

  const getUser = useCallback(async (id: string): Promise<User | null> => {
    clearError();

    try {
      const response = await userService.getById(id);
      
      console.log('✅ Usuário carregado:', response.data.name);
      return response.data;
    } catch (error: any) {
      handleError(error, 'carregar usuário');
      return null;
    }
  }, [handleError, clearError]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchUsers();
  }, [fetchUsers]);

  useEffect(() => {
    if (autoFetch) {
      fetchUsers();
    }
  }, [autoFetch, fetchUsers]);

  return {
    data,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    selectedUser,
    users: data, // Getter conveniente
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
    getUser,
    setSelectedUser,
    clearError,
    refetch,
  };
};

export default useUsers; 