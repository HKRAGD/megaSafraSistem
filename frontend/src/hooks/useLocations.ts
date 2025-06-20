import { useState, useEffect, useCallback } from 'react';
import { 
  Location, 
  LocationFilters,
  UseDataState,
  LocationWithChamber 
} from '../types';
import locationService from '../services/locationService';
import { letraParaNumero } from '../utils/locationUtils';

// ============================================================================
// INTERFACE DO HOOK
// ============================================================================

interface UseLocationsOptions {
  autoFetch?: boolean;
  initialFilters?: LocationFilters;
}

interface UseLocationsReturn extends UseDataState<Location> {
  // Estado adicional específico
  selectedLocation: Location | null;
  filters: LocationFilters;
  availableLocations: LocationWithChamber[];
  locations: Location[]; // Getter conveniente para data
  
  // Operações principais
  fetchLocations: (newFilters?: LocationFilters) => Promise<void>;
  fetchAvailableLocations: (filters?: LocationFilters) => Promise<void>;
  getLocationsByChamber: (chamberId: string) => Promise<void>;
  fetchLocationsByChamber: (chamberId: string) => Promise<void>; // Alias para getLocationsByChamber
  getLocation: (id: string) => Promise<Location | null>;
  updateLocation: (id: string, data: Partial<Location>) => Promise<void>;
  
  // Validações críticas
  validateLocationCapacity: (locationId: string, weightKg: number) => Promise<boolean>;
  findOptimalLocation: (weightKg: number, chamberId?: string) => Location | null;
  
  // Controle de estado
  setSelectedLocation: (location: Location | null) => void;
  setFilters: (filters: LocationFilters) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

// ============================================================================
// HELPER FUNCTIONS - NORMALIZAÇÃO DE DADOS
// ============================================================================

/**
 * Normaliza dados da API para formato do frontend
 * CRÍTICO: A API retorna _id mas o frontend espera id
 */
const normalizeLocationData = (apiLocation: any): Location => {
  // Converter _id para id
  const normalized: Location = {
    id: apiLocation._id || apiLocation.id,
    chamberId: apiLocation.chamberId,
    coordinates: apiLocation.coordinates,
    code: apiLocation.code,
    isOccupied: apiLocation.isOccupied,
    maxCapacityKg: apiLocation.maxCapacityKg,
    currentWeightKg: apiLocation.currentWeightKg,
    createdAt: apiLocation.createdAt,
    updatedAt: apiLocation.updatedAt,
  };

  // Se chamberId é um objeto (populado), extrair apenas o ID
  if (typeof apiLocation.chamberId === 'object' && apiLocation.chamberId !== null) {
    normalized.chamberId = apiLocation.chamberId._id || apiLocation.chamberId.id;
  }

  return normalized;
};

/**
 * Converte localização para LocationWithChamber quando dados da câmara estão disponíveis
 */
const convertToLocationWithChamber = (apiLocation: any): LocationWithChamber => {
  const baseLocation = normalizeLocationData(apiLocation);
  
  // Se chamberId é um objeto (populado), extrair informações da câmara
  if (typeof apiLocation.chamberId === 'object' && apiLocation.chamberId !== null) {
    const chamberData = apiLocation.chamberId;
    
    return {
      ...baseLocation,
      chamber: {
        id: chamberData._id || chamberData.id,
        name: chamberData.name,
      },
    } as LocationWithChamber;
  }
  
  // Se não tem dados da câmara, retornar como Location normal
  return baseLocation as LocationWithChamber;
};

/**
 * Normaliza array de localizações
 */
const normalizeLocationsArray = (apiLocations: any[]): Location[] => {
  if (!Array.isArray(apiLocations)) {
    console.warn('⚠️ API retornou localizações em formato inválido:', apiLocations);
    return [];
  }
  
  return apiLocations.map(normalizeLocationData);
};

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useLocations = (options: UseLocationsOptions = {}): UseLocationsReturn => {
  const { autoFetch = true, initialFilters = {} } = options;

  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================

  const [data, setData] = useState<Location[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage] = useState<number>(1);
  const [totalPages] = useState<number>(1);
  const [hasNextPage] = useState<boolean>(false);
  const [hasPrevPage] = useState<boolean>(false);
  
  // Estado específico de localizações
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [filters, setFilters] = useState<LocationFilters>(initialFilters);
  const [availableLocations, setAvailableLocations] = useState<LocationWithChamber[]>([]);

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
   * Buscar localizações com filtros
   */
  const fetchLocations = useCallback(async (newFilters?: LocationFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const appliedFilters = newFilters || filters;
      const response = await locationService.getAll(appliedFilters);
      
      // Estrutura correta: response.data.locations (array) + response.data.pagination
      const apiLocations = response.data.locations || [];
      const pagination = response.data.pagination || {};
      
      // NORMALIZAR DADOS: Converter _id para id e tratar chamberId
      const normalizedLocations = normalizeLocationsArray(apiLocations);
      
      setData(normalizedLocations);
      setTotal(pagination.totalItems || normalizedLocations.length);
      
      if (newFilters) {
        setFilters(appliedFilters);
      }

      console.log(`✅ ${normalizedLocations.length} localizações carregadas e normalizadas`);
    } catch (error: any) {
      handleError(error, 'carregar localizações');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [filters, handleError, clearError]);

  /**
   * Buscar localizações disponíveis
   * REGRA CRÍTICA: Uma localização = Um produto, Validação de capacidade
   */
  const fetchAvailableLocations = useCallback(async (newFilters?: LocationFilters): Promise<void> => {
    clearError();

    try {
      const response = await locationService.getAvailable(newFilters);
      
      // Estrutura correta da API: { success: true, data: { locations: [...] } }
      const apiLocations = response.data.locations || [];
      
      // FILTRAR e NORMALIZAR: Apenas localizações com dados da câmara populados
      const validAvailableLocations = apiLocations
        .filter((apiLocation: any) => typeof apiLocation.chamberId === 'object' && apiLocation.chamberId !== null)
        .map((apiLocation: any) => convertToLocationWithChamber(apiLocation))
        .filter((location: LocationWithChamber) => {
          if (location.isOccupied) {
            console.warn(`⚠️ Localização ${location.code} marcada como disponível mas está ocupada`);
            return false;
          }
          return true;
        });
      
      setAvailableLocations(validAvailableLocations);
      
      console.log(`✅ ${validAvailableLocations.length} localizações disponíveis carregadas e normalizadas`);
      console.log(`📊 Capacidade total disponível: ${validAvailableLocations.reduce((sum: number, loc: Location) => sum + (loc.maxCapacityKg - loc.currentWeightKg), 0)}kg`);
    } catch (error: any) {
      handleError(error, 'carregar localizações disponíveis');
      setAvailableLocations([]);
    }
  }, [handleError, clearError]);

  /**
   * Buscar localizações por câmara
   */
  const getLocationsByChamber = useCallback(async (chamberId: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await locationService.getByChamber(chamberId);
      
      // Estrutura correta: response.data.locations (array) + response.data.pagination
      const apiLocations = response.data.locations || [];
      const pagination = response.data.pagination || {};
      
      // NORMALIZAR DADOS: Converter _id para id e tratar chamberId
      const normalizedLocations = normalizeLocationsArray(apiLocations);
      
      setData(normalizedLocations);
      setTotal(pagination.totalItems || normalizedLocations.length);

      console.log(`✅ ${normalizedLocations.length} localizações da câmara carregadas e normalizadas`);
    } catch (error: any) {
      handleError(error, 'carregar localizações da câmara');
      setData([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Obter localização específica por ID
   */
  const getLocation = useCallback(async (id: string): Promise<Location | null> => {
    clearError();

    try {
      const response = await locationService.getById(id);
      
      // NORMALIZAR DADOS: Converter _id para id e tratar chamberId
      const normalizedLocation = normalizeLocationData(response.data);
      
      console.log('✅ Localização carregada:', normalizedLocation.code);
      return normalizedLocation;
    } catch (error: any) {
      handleError(error, 'carregar localização');
      return null;
    }
  }, [handleError, clearError]);

  /**
   * Atualizar localização existente
   */
  const updateLocation = useCallback(async (id: string, data: Partial<Location>): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await locationService.update(id, data);
      
      // NORMALIZAR DADOS: Converter _id para id e tratar chamberId
      const normalizedLocation = normalizeLocationData(response.data);
      
      // Atualizar na lista local se encontrada
      setData(prevData => 
        prevData.map(location => 
          location.id === id ? normalizedLocation : location
        )
      );
      
      // Atualizar na lista de disponíveis se aplicável (apenas se a localização está na lista)
      setAvailableLocations(prevData => {
        const locationExists = prevData.some(loc => loc.id === id);
        if (locationExists && response.data.chamberId && typeof response.data.chamberId === 'object') {
          // Converter para LocationWithChamber se tem dados de câmara
          const locationWithChamber = convertToLocationWithChamber(response.data);
          return prevData.map(location => 
            location.id === id ? locationWithChamber : location
          );
        }
        return prevData; // Não atualizar se não tem dados de câmara ou não está na lista
      });
      
      console.log('✅ Localização atualizada:', normalizedLocation.code);
    } catch (error: any) {
      handleError(error, 'atualizar localização');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Alias para getLocationsByChamber para compatibilidade
   */
  const fetchLocationsByChamber = useCallback(async (chamberId: string): Promise<void> => {
    await getLocationsByChamber(chamberId);
  }, [getLocationsByChamber]);

  // ============================================================================
  // VALIDAÇÕES CRÍTICAS
  // ============================================================================

  /**
   * Validar se uma localização suporta determinado peso
   * REGRA CRÍTICA: Validação de capacidade
   */
  const validateLocationCapacity = useCallback(async (locationId: string, weightKg: number): Promise<boolean> => {
    try {
      // 1. Buscar localização na lista local primeiro
      let location = data.find(loc => loc.id === locationId) || 
                    availableLocations.find(loc => loc.id === locationId);
      
      // 2. Se não encontrou, buscar na API
      if (!location) {
        const fetchedLocation = await getLocation(locationId);
        if (!fetchedLocation) {
          console.error('❌ Localização não encontrada:', locationId);
          return false;
        }
        location = fetchedLocation;
      }

      // 3. Verificar se está ocupada
      if (location.isOccupied) {
        console.warn('⚠️ Localização já está ocupada:', location.code);
        return false;
      }

      // 4. Verificar capacidade
      const availableCapacity = location.maxCapacityKg - location.currentWeightKg;
      const isValid = weightKg <= availableCapacity;
      
      if (!isValid) {
        console.warn(`⚠️ Peso ${weightKg}kg excede capacidade disponível ${availableCapacity}kg na localização ${location.code}`);
      } else {
        console.log(`✅ Localização ${location.code} suporta ${weightKg}kg (disponível: ${availableCapacity}kg)`);
      }

      return isValid;
    } catch (error: any) {
      console.error('❌ Erro ao validar capacidade da localização:', error);
      return false;
    }
  }, [data, availableLocations, getLocation]);

  /**
   * Encontrar localização ótima para determinado peso
   * REGRA CRÍTICA: Otimização de espaço e hierarquia
   */
  const findOptimalLocation = useCallback((weightKg: number, chamberId?: string): Location | null => {
    // 1. Filtrar localizações disponíveis
    let candidates = availableLocations.filter(location => {
      // Deve estar disponível
      if (location.isOccupied) return false;
      
      // Deve ter capacidade suficiente
      const availableCapacity = location.maxCapacityKg - location.currentWeightKg;
      if (weightKg > availableCapacity) return false;
      
      // Filtrar por câmara se especificado
      if (chamberId && location.chamberId !== chamberId) return false;
      
      return true;
    });

    if (candidates.length === 0) {
      console.warn('⚠️ Nenhuma localização disponível encontrada para peso:', weightKg);
      return null;
    }

    // 2. Ordenar por critérios de otimização
    candidates.sort((a, b) => {
      // Prioridade 1: Menor desperdício de espaço (melhor aproveitamento)
      const wasteA = (a.maxCapacityKg - a.currentWeightKg) - weightKg;
      const wasteB = (b.maxCapacityKg - b.currentWeightKg) - weightKg;
      
      if (wasteA !== wasteB) {
        return wasteA - wasteB; // Menor desperdício primeiro
      }
      
      // Prioridade 2: Hierarquia (quadra, lado, fila, andar)
      if (a.coordinates.quadra !== b.coordinates.quadra) {
        return a.coordinates.quadra - b.coordinates.quadra;
      }
      if (a.coordinates.lado !== b.coordinates.lado) {
        // Converter lados para números para comparação
        const ladoA = typeof a.coordinates.lado === 'string' 
          ? letraParaNumero(a.coordinates.lado) 
          : a.coordinates.lado;
        const ladoB = typeof b.coordinates.lado === 'string' 
          ? letraParaNumero(b.coordinates.lado) 
          : b.coordinates.lado;
        return ladoA - ladoB;
      }
      if (a.coordinates.fila !== b.coordinates.fila) {
        return a.coordinates.fila - b.coordinates.fila;
      }
      return a.coordinates.andar - b.coordinates.andar;
    });

    const optimal = candidates[0];
    console.log(`🎯 Localização ótima encontrada: ${optimal.code} (capacidade: ${optimal.maxCapacityKg}kg, disponível: ${optimal.maxCapacityKg - optimal.currentWeightKg}kg)`);
    
    return optimal;
  }, [availableLocations]);

  // ============================================================================
  // FUNÇÃO DE REFETCH
  // ============================================================================

  const refetch = useCallback(async (): Promise<void> => {
    await fetchLocations();
  }, [fetchLocations]);

  // ============================================================================
  // EFEITO DE INICIALIZAÇÃO
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      fetchLocations();
    }
  }, [autoFetch, fetchLocations]);

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
    selectedLocation,
    filters,
    availableLocations,
    
    // Operações principais
    fetchLocations,
    fetchAvailableLocations,
    getLocationsByChamber,
    fetchLocationsByChamber,
    getLocation,
    updateLocation,
    locations: Array.isArray(data) ? data : [], // Garantir sempre array
    
    // Validações críticas
    validateLocationCapacity,
    findOptimalLocation,
    
    // Controle de estado
    setSelectedLocation,
    setFilters,
    clearError,
    refetch,
  };
};

export default useLocations; 