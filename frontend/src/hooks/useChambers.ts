import { useState, useEffect, useCallback } from 'react';
import { 
  Chamber, 
  CreateChamberFormData,
  UseDataState 
} from '../types';
import { chamberService } from '../services/chamberService';

// ============================================================================
// CONSTANTES ESTÁVEIS PARA PREVENIR LOOPS INFINITOS
// ============================================================================
const DEFAULT_CHAMBERS_OPTIONS = {};

// ============================================================================
// FUNÇÕES DE MAPEAMENTO DE DADOS
// ============================================================================

/**
 * Mapeia câmara da API para estrutura do frontend
 * CORREÇÃO: API retorna _id, frontend espera id
 */
const mapApiChamberToChamber = (apiChamber: any): Chamber => {
  return {
    ...apiChamber,
    id: apiChamber._id || apiChamber.id,
  };
};

// ============================================================================
// INTERFACE DO HOOK
// ============================================================================

interface UsChambersOptions {
  autoFetch?: boolean;
}

interface UseChambersReturn extends UseDataState<Chamber> {
  // Estado adicional específico
  selectedChamber: Chamber | null;
  chambers: Chamber[]; // Getter conveniente para data
  
  // Operações CRUD
  fetchChambers: () => Promise<void>;
  createChamber: (chamberData: CreateChamberFormData) => Promise<void>;
  updateChamber: (id: string, chamberData: Partial<CreateChamberFormData>) => Promise<void>;
  deleteChamber: (id: string) => Promise<void>;
  
  // Operações especiais
  getChamber: (id: string) => Promise<Chamber | null>;
  getChamberLocations: (chamberId: string) => Promise<any>;
  getChamberSummary: (chamberId: string) => Promise<any>;
  generateLocations: (id: string) => Promise<void>;
  
  // Controle de estado
  setSelectedChamber: (chamber: Chamber | null) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook para gerenciar todos os dados e operações relacionadas a câmaras
 * 
 * REGRA CRÍTICA: Este é o ÚNICO lugar onde requisições de câmaras devem ser feitas!
 */
export const useChambers = (options: UsChambersOptions = DEFAULT_CHAMBERS_OPTIONS): UseChambersReturn => {
  const { autoFetch = true } = options;

  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================

  const [data, setData] = useState<Chamber[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);
  
  // Estado específico de câmaras
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(null);

  // ============================================================================
  // FUNÇÕES AUXILIARES
  // ============================================================================

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // OPERAÇÕES CRUD
  // ============================================================================

  /**
   * Buscar todas as câmaras
   */
  const fetchChambers = useCallback(async (): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await chamberService.getAll();
      
      // Estrutura correta: response.data.chambers (array) + response.data.pagination
      const apiChambers = response.data.chambers || [];
      const pagination = response.data.pagination || {};
      
      // CORREÇÃO: Mapear _id para id
      const chambers = apiChambers.map(mapApiChamberToChamber);
      
      setData(chambers);
      setTotal(pagination.totalItems || chambers.length);
      setCurrentPage(pagination.currentPage || 1);
      setTotalPages(pagination.totalPages || 1);
      setHasNextPage(pagination.hasNextPage || false);
      setHasPrevPage(pagination.hasPrevPage || false);

      console.log(`✅ ${chambers.length} câmaras carregadas`);
    } catch (error: any) {
      console.error('❌ Erro ao carregar câmaras:', error);
      handleError(error, 'carregar câmaras');
      // Garantir sempre que data seja um array vazio em caso de erro
      setData([]);
      setTotal(0);
      setCurrentPage(1);
      setTotalPages(1);
      setHasNextPage(false);
      setHasPrevPage(false);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Criar nova câmara
   * REGRA CRÍTICA: Hierarquia de localizações deve ser validada
   */
  const createChamber = useCallback(async (chamberData: CreateChamberFormData): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Validar dimensões da câmara
      const { quadras, lados, filas, andares } = chamberData.dimensions;
      if (quadras < 1 || lados < 1 || filas < 1 || andares < 1) {
        throw new Error('Todas as dimensões da câmara devem ser pelo menos 1');
      }

      // 2. Criar câmara
      const response = await chamberService.create(chamberData);
      
      // Estrutura correta da API: { success: true, data: Chamber }
      // CORREÇÃO: Mapear _id para id
      const chamber = mapApiChamberToChamber(response.data);
      
      // 3. Adicionar câmara à lista local
      setData(prevData => [chamber, ...prevData]);
      setTotal(prevTotal => prevTotal + 1);
      
      console.log('✅ Câmara criada com sucesso:', chamber.name);
      console.log('📐 Dimensões:', chamber.dimensions);
      console.log('📍 Total de localizações:', chamber.totalLocations);
    } catch (error: any) {
      handleError(error, 'criar câmara');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Atualizar câmara existente
   */
  const updateChamber = useCallback(async (
    id: string, 
    chamberData: Partial<CreateChamberFormData>
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await chamberService.update(id, chamberData);
      
      // CORREÇÃO: Mapear _id para id
      const updatedChamber = mapApiChamberToChamber(response.data);
      
      // Atualizar câmara na lista local
      setData(prevData => 
        prevData.map(chamber => 
          chamber.id === id ? updatedChamber : chamber
        )
      );
      
      // Atualizar câmara selecionada se for a mesma
      if (selectedChamber?.id === id) {
        setSelectedChamber(updatedChamber);
      }
      
      console.log('✅ Câmara atualizada com sucesso:', updatedChamber.name);
    } catch (error: any) {
      handleError(error, 'atualizar câmara');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedChamber, handleError, clearError]);

  /**
   * Deletar câmara
   */
  const deleteChamber = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      await chamberService.delete(id);
      
      // Remover câmara da lista local
      setData(prevData => prevData.filter(chamber => chamber.id !== id));
      setTotal(prevTotal => Math.max(0, prevTotal - 1));
      
      // Limpar seleção se for a câmara deletada
      if (selectedChamber?.id === id) {
        setSelectedChamber(null);
      }
      
      console.log('✅ Câmara removida com sucesso');
    } catch (error: any) {
      handleError(error, 'remover câmara');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [selectedChamber, handleError, clearError]);

  // ============================================================================
  // OPERAÇÕES ESPECIAIS
  // ============================================================================

  /**
   * Obter câmara específica por ID
   */
  const getChamber = useCallback(async (id: string): Promise<Chamber | null> => {
    clearError();

    try {
      const response = await chamberService.getById(id);
      
      // CORREÇÃO: Mapear _id para id
      const chamber = mapApiChamberToChamber(response.data);
      
      console.log('✅ Câmara carregada:', chamber.name);
      return chamber;
    } catch (error: any) {
      handleError(error, 'carregar câmara');
      return null;
    }
  }, [handleError, clearError]);

  /**
   * Obter localizações de uma câmara
   */
  const getChamberLocations = useCallback(async (chamberId: string) => {
    clearError();

    try {
      // TODO: Implementar quando a API tiver esse endpoint
      console.warn('Endpoint de localizações da câmara ainda não implementado');
      return null;
    } catch (error: any) {
      handleError(error, 'carregar localizações da câmara');
      return null;
    }
  }, [handleError, clearError]);

  /**
   * Obter resumo de uma câmara
   */
  const getChamberSummary = useCallback(async (chamberId: string) => {
    clearError();

    try {
      // TODO: Implementar quando a API tiver esse endpoint
      console.warn('Endpoint de resumo da câmara ainda não implementado');
      return null;
    } catch (error: any) {
      handleError(error, 'carregar resumo da câmara');
      return null;
    }
  }, [handleError, clearError]);

  /**
   * Gerar localizações para uma câmara
   * REGRA CRÍTICA: Hierarquia de localizações (quadra, lado, fila, andar)
   */
  const generateLocations = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar câmara para validar dimensões
      const chamber = data.find(c => c.id === id);
      if (!chamber) {
        throw new Error('Câmara não encontrada na lista local');
      }

      // 2. Calcular total de localizações esperadas
      const { quadras, lados, filas, andares } = chamber.dimensions;
      const expectedLocations = quadras * lados * filas * andares;
      
      console.log(`🏗️ Gerando localizações para câmara: ${chamber.name}`);
      console.log(`📐 Dimensões: ${quadras}Q × ${lados}L × ${filas}F × ${andares}A`);
      console.log(`📍 Total esperado: ${expectedLocations} localizações`);

      // 3. Gerar localizações via API com parâmetros otimizados
      const response = await chamberService.generateLocations(id, {
        maxCapacityKg: 1500,
        overwrite: true, // Sempre permitir sobrescrever para regenerar
        optimizeAccess: true,
        capacityVariation: true
      });
      
      // Estrutura correta da API: { success: true, data: { generated: { count: number } } }
      const locationsCreated = response.data.generated?.count || response.data.locationsCreated || 0;
      
      // 4. Atualizar câmara na lista local
      setData(prevData => 
        prevData.map(c => 
          c.id === id ? { ...c, totalLocations: locationsCreated } : c
        )
      );
      
      // 5. Recarregar dados das câmaras para garantir sincronização
      await fetchChambers();
      
      console.log('✅ Localizações geradas com sucesso:', locationsCreated);
      console.log('🎯 Hierarquia respeitada: Q1-L1-F1-A1 até Q' + quadras + '-L' + lados + '-F' + filas + '-A' + andares);
    } catch (error: any) {
      handleError(error, 'gerar localizações');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, handleError, clearError, fetchChambers]);

  // ============================================================================
  // FUNÇÃO DE REFETCH
  // ============================================================================

  const refetch = useCallback(async (): Promise<void> => {
    await fetchChambers();
  }, [fetchChambers]);

  // ============================================================================
  // EFEITO DE INICIALIZAÇÃO
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      fetchChambers();
    }
  }, [autoFetch, fetchChambers]); // Apenas na montagem inicial

  // ============================================================================
  // RETORNO DO HOOK
  // ============================================================================

  return {
    // Estado dos dados
    data,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    
    // Estado específico
    selectedChamber,
    chambers: Array.isArray(data) ? data : [], // Garantir sempre array
    
    // Operações CRUD
    fetchChambers,
    createChamber,
    updateChamber,
    deleteChamber,
    
    // Operações especiais
    getChamber,
    getChamberLocations,
    getChamberSummary,
    generateLocations,
    
    // Controle de estado
    setSelectedChamber,
    clearError,
    refetch,
  };
};

export default useChambers; 