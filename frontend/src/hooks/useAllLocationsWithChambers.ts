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
  const { autoFetch = true, initialFilters: propInitialFilters = {} } = options;

  // Estabilizar initialFilters para evitar loops infinitos
  const stableInitialFilters = useMemo(() => propInitialFilters, [JSON.stringify(propInitialFilters)]);

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
      // ✅ CORREÇÃO: Remover setState duplicado que causa loop infinito

      // ✅ CORREÇÃO CRÍTICA: Usar getAllUnpaginated para carregar TODAS as localizações
      // Isso resolve o problema das localizações brancas no mapa 3D
      console.log('🔄 Carregando TODAS as localizações (sem limitação de paginação)...');
      
      const [locationsResponse, chambersResponse] = await Promise.all([
        locationService.getAllUnpaginated(), // ✅ Nova função que busca todas as páginas
        chamberService.getAll()
      ]);

      console.log(`📦 ${locationsResponse.data.locations.length} localizações retornadas da API (todas as páginas)`);
      
      if (!locationsResponse.success || !chambersResponse.success) {
        throw new Error('Falha ao carregar dados');
      }

      const locations = locationsResponse.data.locations;
      const chambers = chambersResponse.data.chambers || chambersResponse.data; // ✅ Ajuste para diferentes formatos de resposta

      // 2. Verificar se as localizações já vêm com dados de câmara
      const locationsWithPopulatedChambers = locations.filter(
        (loc: any) => typeof loc.chamberId === 'object' && loc.chamberId !== null
      );

      if (locationsWithPopulatedChambers.length === locations.length) {
        // Todas as localizações já vêm com dados de câmara - ótimo!
        console.log('✅ Todas as localizações já têm dados de câmara populados');
        const processedLocations = processApiLocations(locations);
        setAllLocationsWithChambers(processedLocations);
        console.log(`✅ ${processedLocations.length} localizações processadas`);
        
        // ✅ DEBUG: Contar ocupadas vs disponíveis
        const occupied = processedLocations.filter(loc => loc.isOccupied);
        const available = processedLocations.filter(loc => !loc.isOccupied);
        console.log(`🔴 ${occupied.length} localizações ocupadas | 🟢 ${available.length} localizações disponíveis`);
        
        // ✅ DEBUG: Mostrar alguns exemplos de localizações ocupadas
        if (occupied.length > 0) {
          console.log('📝 Exemplos de localizações ocupadas:', occupied.slice(0, 3).map(loc => ({
            code: loc.code,
            isOccupied: loc.isOccupied,
            currentWeight: loc.currentWeightKg,
            chamber: loc.chamber?.name
          })));
        }
        
        return; // Sair da função aqui
      }

      // 3. Se chegou aqui, precisa buscar dados das câmaras manualmente
      console.log('⚠️ Localizações sem dados de câmara - buscando dados das câmaras...');
      
      // Garantir que chambers é um array
      const chambersArray = Array.isArray(chambers) ? chambers : [];
      console.log(`📦 ${chambersArray.length} câmaras carregadas`);
      
      // 4. Criar mapa de câmaras para lookup rápido
      const chambersMap = new Map(
        chambersArray.map((chamber: any) => [
          chamber.id || chamber._id, 
          { 
            id: chamber.id || chamber._id, 
            name: chamber.name || 'Câmara sem nome' 
          }
        ])
      );

      // 4. Processar localizações combinando com dados de câmara
      const processedLocations = locations.map((apiLocation: any) => {
        const baseLocation = convertToLocationWithChamber(apiLocation);
        
        // Buscar dados da câmara
        const chamberId = typeof apiLocation.chamberId === 'object' 
          ? apiLocation.chamberId.id || apiLocation.chamberId._id
          : apiLocation.chamberId;
          
        const chamberData = chambersMap.get(chamberId) || { 
          id: chamberId, 
          name: 'Câmara não encontrada' 
        };
        
        baseLocation.chamber = chamberData;
        
        return baseLocation;
      });

      setAllLocationsWithChambers(processedLocations);
      console.log(`✅ ${processedLocations.length} localizações processadas com dados de câmara`);
      
      // ✅ DEBUG: Contar ocupadas vs disponíveis
      const occupied = processedLocations.filter(loc => loc.isOccupied);
      const available = processedLocations.filter(loc => !loc.isOccupied);
      console.log(`🔴 ${occupied.length} localizações ocupadas | 🟢 ${available.length} localizações disponíveis`);
      
      // ✅ DEBUG: Mostrar alguns exemplos de localizações ocupadas
      if (occupied.length > 0) {
        console.log('📝 Exemplos de localizações ocupadas:', occupied.slice(0, 3).map(loc => ({
          code: loc.code,
          isOccupied: loc.isOccupied,
          currentWeight: loc.currentWeightKg,
          chamber: loc.chamber?.name
        })));
      }

    } catch (error: any) {
      handleError(error, 'carregar todas as localizações com câmaras');
      setAllLocationsWithChambers([]);
    } finally {
      setLoading(false);
    }
  }, []); // Removido clearError e handleError das dependências para evitar loop

  /**
   * Atualizar todos os dados
   */
  const refreshData = useCallback(async (): Promise<void> => {
    await fetchAllLocationsWithChambers();
  }, [fetchAllLocationsWithChambers]);

  // ============================================================================
  // EFEITOS
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      fetchAllLocationsWithChambers(stableInitialFilters);
    }
  }, [autoFetch]); // Removido fetchAllLocationsWithChambers e stableInitialFilters para evitar loop

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