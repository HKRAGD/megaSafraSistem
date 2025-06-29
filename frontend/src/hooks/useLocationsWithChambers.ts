import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LocationWithChamber, 
  LocationFilters
} from '../types';
import { locationService } from '../services/locationService';
import { chamberService } from '../services/chamberService';

// ============================================================================
// CONSTANTES ESTÁVEIS PARA PREVENIR LOOPS INFINITOS
// ============================================================================
const DEFAULT_OPTIONS = {};
const DEFAULT_INITIAL_FILTERS = {};

// ============================================================================
// INTERFACE DO HOOK
// ============================================================================

interface UseLocationsWithChambersOptions {
  autoFetch?: boolean;
  initialFilters?: LocationFilters;
}

interface UseLocationsWithChambersReturn {
  // Estado dos dados
  locationsWithChambers: LocationWithChamber[];
  availableLocationsWithChambers: LocationWithChamber[];
  loading: boolean;
  error: string | null;
  
  // Operações principais
  fetchAvailableLocations: (filters?: LocationFilters) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Controle de estado
  clearError: () => void;
}

// ============================================================================
// HELPER FUNCTIONS - CONVERSÃO DE DADOS
// ============================================================================

/**
 * Converte dados da API para LocationWithChamber
 * CRÍTICO: Garantir que todas as localizações tenham informações da câmara
 */
const convertToLocationWithChamber = (apiLocation: any): LocationWithChamber => {
  // Converter _id para id e normalizar estrutura
  const baseLocation = {
    id: apiLocation._id || apiLocation.id,
    chamberId: typeof apiLocation.chamberId === 'object' 
      ? (apiLocation.chamberId._id || apiLocation.chamberId.id)
      : apiLocation.chamberId,
    coordinates: apiLocation.coordinates,
    code: apiLocation.code,
    isOccupied: apiLocation.isOccupied,
    maxCapacityKg: apiLocation.maxCapacityKg,
    currentWeightKg: apiLocation.currentWeightKg,
    createdAt: apiLocation.createdAt,
    updatedAt: apiLocation.updatedAt,
  };

  // Extrair informações da câmara
  let chamber = { id: '', name: 'Chamber not found' };
  
  if (typeof apiLocation.chamberId === 'object' && apiLocation.chamberId !== null) {
    // Câmara populada na API
    chamber = {
      id: apiLocation.chamberId._id || apiLocation.chamberId.id,
      name: apiLocation.chamberId.name || 'Unnamed Chamber',
    };
  }

  return {
    ...baseLocation,
    chamber,
  } as LocationWithChamber;
};

/**
 * Processa array de localizações da API
 */
const processApiLocations = (apiLocations: any[]): LocationWithChamber[] => {
  if (!Array.isArray(apiLocations)) {
    console.warn('⚠️ API retornou localizações em formato inválido:', apiLocations);
    return [];
  }
  
  return apiLocations.map(convertToLocationWithChamber);
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useLocationsWithChambers = (
  options: UseLocationsWithChambersOptions = DEFAULT_OPTIONS
): UseLocationsWithChambersReturn => {
  const { autoFetch = true, initialFilters: propInitialFilters } = options;

  // ============================================================================
  // REFERÊNCIA ESTÁVEL PARA INITIAL_FILTERS
  // ============================================================================
  const stableInitialFilters = useMemo(() => {
    return propInitialFilters || DEFAULT_INITIAL_FILTERS;
  }, [propInitialFilters]);

  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================

  const [locationsWithChambers, setLocationsWithChambers] = useState<LocationWithChamber[]>([]);
  const [availableLocationsWithChambers, setAvailableLocationsWithChambers] = useState<LocationWithChamber[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

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
  // OPERAÇÕES PRINCIPAIS
  // ============================================================================

  /**
   * Buscar localizações disponíveis
   * REGRA CRÍTICA: Uma localização = Um produto, Validação de capacidade
   */
  const fetchAvailableLocations = useCallback(async (newFilters?: LocationFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const appliedFilters = {
        ...newFilters,
        limit: 1000 // ✅ CORREÇÃO: Aumentar limite para pegar todas as localizações disponíveis
      };
      
      const response = await locationService.getAvailable(appliedFilters);
      
      // Estrutura correta da API: { success: true, data: { locations: [...] } }
      const apiLocations = response.data.locations || [];
      
      console.log(`📦 ${apiLocations.length} localizações disponíveis retornadas da API`);

      // NORMALIZAR DADOS: Converter todos para LocationWithChamber
      const normalizedLocations = processApiLocations(apiLocations);
      
      // Validar que todas as localizações estão realmente disponíveis
      const validAvailableLocations = normalizedLocations.filter((location: LocationWithChamber) => {
        if (location.isOccupied) {
          console.warn(`⚠️ Localização ${location.code} marcada como disponível mas está ocupada`);
          return false;
        }
        return true;
      });
      
      setAvailableLocationsWithChambers(validAvailableLocations);
      
      console.log(`✅ ${validAvailableLocations.length} localizações disponíveis carregadas e normalizadas`);
      console.log(`📊 Capacidade total disponível: ${validAvailableLocations.reduce((sum: number, loc: LocationWithChamber) => sum + (loc.maxCapacityKg - loc.currentWeightKg), 0)}kg`);
    } catch (error: any) {
      handleError(error, 'carregar localizações disponíveis');
      setAvailableLocationsWithChambers([]);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Atualizar todos os dados
   */
  const refreshData = useCallback(async (): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // Usar limite alto para pegar todas as localizações
      const locationsResponse = await locationService.getAvailable({ limit: 1000 });
      const apiLocations = locationsResponse.data.locations || [];
      
      const processedLocations = processApiLocations(apiLocations);
      setAvailableLocationsWithChambers(processedLocations);
      console.log(`✅ RefreshData: ${processedLocations.length} localizações carregadas`);
    } catch (error: any) {
      handleError(error, 'atualizar localizações com câmaras');
      setAvailableLocationsWithChambers([]);
    } finally {
      setLoading(false);
    }
  }, [clearError, handleError]);

  // ============================================================================
  // EFEITO DE INICIALIZAÇÃO
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      fetchAvailableLocations(stableInitialFilters);
    }
  }, [autoFetch, fetchAvailableLocations, stableInitialFilters]);

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const memoizedAvailableLocations = useMemo(() => {
    // Garantir que temos dados válidos
    return availableLocationsWithChambers.filter(location => 
      location.chamber && 
      location.chamber.id && 
      location.chamber.name !== 'Chamber not found'
    );
  }, [availableLocationsWithChambers]);

  // ============================================================================
  // RETORNO DO HOOK
  // ============================================================================

  return {
    // Estado dos dados
    locationsWithChambers,
    availableLocationsWithChambers: memoizedAvailableLocations,
    loading,
    error,
    
    // Operações principais
    fetchAvailableLocations,
    refreshData,
    
    // Controle de estado
    clearError,
  };
};

export default useLocationsWithChambers; 