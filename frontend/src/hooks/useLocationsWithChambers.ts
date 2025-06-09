import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LocationWithChamber, 
  LocationFilters
} from '../types';
import { locationService } from '../services/locationService';
import { chamberService } from '../services/chamberService';

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
  fetchAvailableLocationsWithChambers: (filters?: LocationFilters) => Promise<void>;
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
  options: UseLocationsWithChambersOptions = {}
): UseLocationsWithChambersReturn => {
  const { autoFetch = true, initialFilters = {} } = options;

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
   * Buscar localizações disponíveis com informações de câmara
   * REGRA CRÍTICA: Uma localização = Um produto, Informações de câmara obrigatórias
   */
  const fetchAvailableLocationsWithChambers = useCallback(async (filters?: LocationFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar localizações disponíveis
      console.log('🔍 Buscando localizações disponíveis...');
      const locationsResponse = await locationService.getAvailable(filters);
      
      const apiLocations = locationsResponse.data.locations || [];
      console.log(`📦 ${apiLocations.length} localizações retornadas da API`);

      // 2. Verificar se as localizações já vêm com dados de câmara
      const locationsWithPopulatedChambers = apiLocations.filter(
        (loc: any) => typeof loc.chamberId === 'object' && loc.chamberId !== null
      );

      if (locationsWithPopulatedChambers.length === apiLocations.length) {
        // Todas as localizações já vêm com dados de câmara - ótimo!
        console.log('✅ Todas as localizações já têm dados de câmara populados');
        const processedLocations = processApiLocations(apiLocations);
        setAvailableLocationsWithChambers(processedLocations);
        console.log(`✅ ${processedLocations.length} localizações disponíveis processadas`);
      } else {
        // Algumas localizações não têm dados de câmara - precisamos buscar
        console.log('⚠️ Algumas localizações não têm dados de câmara, buscando câmaras...');
        
        // 3. Buscar informações de todas as câmaras
        const chambersResponse = await chamberService.getAll();
        const chambers = chambersResponse.data.chambers || [];
        console.log(`📦 ${chambers.length} câmaras carregadas`);
        
        // 4. Criar mapa de câmaras para lookup rápido
        const chambersMap = new Map(
          chambers.map((chamber: any) => [
            chamber._id || chamber.id, 
            {
              id: chamber._id || chamber.id,
              name: chamber.name || 'Unnamed Chamber'
            }
          ])
        );

        // 5. Processar localizações combinando com dados de câmara
        const processedLocations = apiLocations.map((apiLocation: any) => {
          const baseLocation = convertToLocationWithChamber(apiLocation);
          
          // Se não tem dados de câmara populados, buscar no mapa
          if (baseLocation.chamber.name === 'Chamber not found') {
            const chamberData = chambersMap.get(baseLocation.chamberId);
            if (chamberData) {
              baseLocation.chamber = chamberData;
            } else {
              console.warn(`⚠️ Câmara não encontrada para localização ${baseLocation.code}: ${baseLocation.chamberId}`);
            }
          }
          
          return baseLocation;
        });

        setAvailableLocationsWithChambers(processedLocations);
        console.log(`✅ ${processedLocations.length} localizações disponíveis processadas com dados de câmara`);
      }

    } catch (error: any) {
      handleError(error, 'carregar localizações com câmaras');
      setAvailableLocationsWithChambers([]);
    } finally {
      setLoading(false);
    }
  }, [clearError, handleError]);

  /**
   * Atualizar todos os dados
   */
  const refreshData = useCallback(async (): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // Usar uma versão simplificada sem filtros para evitar dependências
      const locationsResponse = await locationService.getAvailable();
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
      fetchAvailableLocationsWithChambers(initialFilters);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoFetch]); // Manter apenas autoFetch como dependência para evitar loops

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
    fetchAvailableLocationsWithChambers,
    refreshData,
    
    // Controle de estado
    clearError,
  };
};

export default useLocationsWithChambers; 