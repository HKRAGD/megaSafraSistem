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

interface UseAllLocationsWithChambersOptions {
  autoFetch?: boolean;
  initialFilters?: LocationFilters;
}

interface UseAllLocationsWithChambersReturn {
  // Estado dos dados
  allLocationsWithChambers: LocationWithChamber[];
  loading: boolean;
  error: string | null;
  
  // Operações principais
  fetchAllLocationsWithChambers: (filters?: LocationFilters) => Promise<void>;
  refreshData: () => Promise<void>;
  
  // Controle de estado
  clearError: () => void;
}

// ============================================================================
// HELPER FUNCTIONS - CONVERSÃO DE DADOS
// ============================================================================

/**
 * Converte dados da API para LocationWithChamber
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

export const useAllLocationsWithChambers = (
  options: UseAllLocationsWithChambersOptions = {}
): UseAllLocationsWithChambersReturn => {
  const { autoFetch = true, initialFilters = {} } = options;

  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================

  const [allLocationsWithChambers, setAllLocationsWithChambers] = useState<LocationWithChamber[]>([]);
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
   * Buscar TODAS as localizações com informações de câmara
   * NOTA: Busca ocupadas E disponíveis para mostrar o grid completo no mapa 3D
   */
  const fetchAllLocationsWithChambers = useCallback(async (filters?: LocationFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar TODAS as localizações (não apenas disponíveis)
      console.log('🔍 Buscando TODAS as localizações...');
      const locationsResponse = await locationService.getAll(filters);
      
      const apiLocations = locationsResponse.data.locations || [];
      console.log(`📦 ${apiLocations.length} localizações retornadas da API (ocupadas + disponíveis)`);

      // 2. Verificar se as localizações já vêm com dados de câmara
      const locationsWithPopulatedChambers = apiLocations.filter(
        (loc: any) => typeof loc.chamberId === 'object' && loc.chamberId !== null
      );

      if (locationsWithPopulatedChambers.length === apiLocations.length) {
        // Todas as localizações já vêm com dados de câmara - ótimo!
        console.log('✅ Todas as localizações já têm dados de câmara populados');
        const processedLocations = processApiLocations(apiLocations);
        setAllLocationsWithChambers(processedLocations);
        console.log(`✅ ${processedLocations.length} localizações processadas`);
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

        setAllLocationsWithChambers(processedLocations);
        console.log(`✅ ${processedLocations.length} localizações processadas com dados de câmara`);
      }

    } catch (error: any) {
      handleError(error, 'carregar todas as localizações com câmaras');
      setAllLocationsWithChambers([]);
    } finally {
      setLoading(false);
    }
  }, [clearError, handleError]);

  /**
   * Atualizar todos os dados
   */
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchAllLocationsWithChambers(initialFilters);
  }, [fetchAllLocationsWithChambers, initialFilters]);

  // ============================================================================
  // EFEITOS
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      fetchAllLocationsWithChambers(initialFilters);
    }
  }, [autoFetch, fetchAllLocationsWithChambers, initialFilters]);

  // ============================================================================
  // RETURN
  // ============================================================================

  return {
    allLocationsWithChambers,
    loading,
    error,
    fetchAllLocationsWithChambers,
    refreshData,
    clearError,
  };
}; 