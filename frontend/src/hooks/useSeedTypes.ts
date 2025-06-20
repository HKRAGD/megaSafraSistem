import { useState, useEffect, useCallback } from 'react';
import { SeedType, CreateSeedTypeFormData, UseDataState } from '../types';
import { seedTypeService } from '../services/seedTypeService';

interface UseSeedTypesReturn extends UseDataState<SeedType> {
  selectedSeedType: SeedType | null;
  seedTypes: SeedType[]; // Getter conveniente para data
  
  fetchSeedTypes: () => Promise<void>;
  createSeedType: (data: CreateSeedTypeFormData) => Promise<void>;
  updateSeedType: (id: string, data: Partial<CreateSeedTypeFormData>) => Promise<void>;
  deleteSeedType: (id: string) => Promise<void>;
  getSeedType: (id: string) => Promise<SeedType | null>;
  
  setSelectedSeedType: (seedType: SeedType | null) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

export const useSeedTypes = (): UseSeedTypesReturn => {
  const [data, setData] = useState<SeedType[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [hasNextPage] = useState<boolean>(false);
  const [hasPrevPage] = useState<boolean>(false);
  
  const [selectedSeedType, setSelectedSeedType] = useState<SeedType | null>(null);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const fetchSeedTypes = useCallback(async (): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await seedTypeService.getAll();
      
      // A API retorna { success: true, data: { seedTypes: [], pagination: {...} } }
      const seedTypesArray = response.data.seedTypes || [];
      setData(seedTypesArray);
      setTotal(seedTypesArray.length);
      console.log(`✅ ${seedTypesArray.length} tipos de sementes carregados`);
    } catch (error: any) {
      console.error('❌ Erro ao carregar seedTypes:', error);
      handleError(error, 'carregar tipos de sementes');
      // Garantir sempre que data seja um array vazio em caso de erro
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const createSeedType = useCallback(async (seedTypeData: CreateSeedTypeFormData): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await seedTypeService.create(seedTypeData);
      setData(prevData => [response.data, ...prevData]);
      setTotal(prevTotal => prevTotal + 1);
      console.log('✅ Tipo de semente criado com sucesso:', response.data.name);
    } catch (error: any) {
      handleError(error, 'criar tipo de semente');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const updateSeedType = useCallback(async (
    id: string, 
    seedTypeData: Partial<CreateSeedTypeFormData>
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await seedTypeService.update(id, seedTypeData);
      setData(prevData => 
        prevData.map(seedType => 
          seedType.id === id ? response.data : seedType
        )
      );
      
      if (selectedSeedType?.id === id) {
        setSelectedSeedType(response.data);
      }
      
      console.log('✅ Tipo de semente atualizado com sucesso:', response.data.name);
    } catch (error: any) {
      handleError(error, 'atualizar tipo de semente');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedSeedType, handleError, clearError]);

  const deleteSeedType = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      await seedTypeService.delete(id);
      setData(prevData => prevData.filter(seedType => seedType.id !== id));
      setTotal(prevTotal => Math.max(0, prevTotal - 1));
      
      if (selectedSeedType?.id === id) {
        setSelectedSeedType(null);
      }
      
      console.log('✅ Tipo de semente removido com sucesso');
    } catch (error: any) {
      handleError(error, 'remover tipo de semente');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedSeedType, handleError, clearError]);

  const getSeedType = useCallback(async (id: string): Promise<SeedType | null> => {
    clearError();

    try {
      const response = await seedTypeService.getById(id);
      console.log('✅ Tipo de semente carregado:', response.data.name);
      return response.data;
    } catch (error: any) {
      handleError(error, 'carregar tipo de semente');
      return null;
    }
  }, [handleError, clearError]);

  const refetch = useCallback(async (): Promise<void> => {
    await fetchSeedTypes();
  }, [fetchSeedTypes]);

  useEffect(() => {
    fetchSeedTypes();
  }, [fetchSeedTypes]);

  return {
    data,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    selectedSeedType,
    seedTypes: Array.isArray(data) ? data : [], // Garantir sempre array
    fetchSeedTypes,
    createSeedType,
    updateSeedType,
    deleteSeedType,
    getSeedType,
    setSelectedSeedType,
    clearError,
    refetch,
  };
};

export default useSeedTypes; 