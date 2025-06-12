import { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  LocationTreeItem, 
  TreeLevel, 
  TreeNavigationState, 
  LocationTreeFilters, 
  LevelStats, 
  UseLocationTreeResult,
  ViewMode,
  CachedLevel,
  StatusThresholds,
  CacheConfig
} from '../types/locationTree';
import { LocationWithChamber, Chamber } from '../types';
import { useAllLocationsWithChambers } from './useAllLocationsWithChambers';
import { useChambers } from './useChambers';

// ============================================================================
// CONFIGURAÇÕES E CONSTANTES
// ============================================================================

const STATUS_THRESHOLDS: StatusThresholds = {
  optimal: { min: 0, max: 70 },   // Verde
  normal:  { min: 71, max: 85 },  // Azul  
  warning: { min: 86, max: 95 },  // Amarelo
  critical: { min: 96, max: 100 } // Vermelho
};

const CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000,        // 5 minutos
  maxSize: 100,              // 100 itens max
  prefetchNextLevel: true,   // Prefetch automático
  invalidateOnUpdate: true   // Invalidar em mudanças
};

const DEFAULT_FILTERS: LocationTreeFilters = {
  status: 'all',
  search: '',
};

// ============================================================================
// HELPER FUNCTIONS - TRANSFORMAÇÃO DE DADOS
// ============================================================================

/**
 * Determina o status baseado na taxa de ocupação
 */
const getStatusFromRate = (rate: number): LevelStats['status'] => {
  if (rate <= STATUS_THRESHOLDS.optimal.max) return 'optimal';
  if (rate <= STATUS_THRESHOLDS.normal.max) return 'normal';
  if (rate <= STATUS_THRESHOLDS.warning.max) return 'warning';
  if (rate <= STATUS_THRESHOLDS.critical.max) return 'critical';
  return 'unknown';
};

/**
 * Calcula estatísticas para um conjunto de localizações
 */
const calculateLevelStats = (locations: LocationWithChamber[]): LevelStats => {
  const total = locations.length;
  const occupied = locations.filter(loc => loc.isOccupied).length;
  const available = total - occupied;
  const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;
  
  const totalCapacityKg = locations.reduce((sum, loc) => sum + loc.maxCapacityKg, 0);
  const usedCapacityKg = locations.reduce((sum, loc) => sum + loc.currentWeightKg, 0);
  const capacityRate = totalCapacityKg > 0 ? (usedCapacityKg / totalCapacityKg) * 100 : 0;
  
  // Contar produtos únicos
  const productsCount = locations.filter(loc => loc.isOccupied).length; // Simplificado: 1 produto por localização ocupada
  
  return {
    total,
    occupied,
    available,
    occupancyRate,
    totalCapacityKg,
    usedCapacityKg,
    capacityRate,
    productsCount,
    status: getStatusFromRate(occupancyRate)
  };
};

/**
 * Transforma dados flat em estrutura hierárquica por nível
 */
const transformToTreeLevel = (
  allLocations: LocationWithChamber[],
  chambers: Chamber[],
  level: TreeLevel,
  parentId?: string,
  filters?: LocationTreeFilters
): LocationTreeItem[] => {
  let filteredLocations = allLocations;
  
  // Aplicar filtros
  if (filters) {
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      filteredLocations = filteredLocations.filter(loc => 
        loc.code.toLowerCase().includes(searchTerm) ||
        loc.chamber.name.toLowerCase().includes(searchTerm)
      );
    }
    
    if (filters.status === 'available') {
      filteredLocations = filteredLocations.filter(loc => !loc.isOccupied);
    } else if (filters.status === 'occupied') {
      filteredLocations = filteredLocations.filter(loc => loc.isOccupied);
    }
    
    if (filters.chamberId) {
      filteredLocations = filteredLocations.filter(loc => loc.chamberId === filters.chamberId);
    }
  }

  switch (level) {
    case 'chamber': {
      // Agrupar por câmara
      const chamberGroups = new Map<string, LocationWithChamber[]>();
      
      filteredLocations.forEach(location => {
        const chamberId = location.chamberId;
        if (!chamberGroups.has(chamberId)) {
          chamberGroups.set(chamberId, []);
        }
        chamberGroups.get(chamberId)!.push(location);
      });

      return Array.from(chamberGroups.entries()).map(([chamberId, locations]) => {
        const chamber = chambers.find(c => c.id === chamberId);
        const stats = calculateLevelStats(locations);
        
        return {
          id: chamberId,
          level: 'chamber',
          label: chamber?.name || 'Câmara Desconhecida',
          value: chamberId,
          childrenCount: locations.length,
          hasChildren: locations.length > 0,
          stats,
          isOccupied: stats.occupied > 0,
          chamber,
        };
      });
    }

    case 'quadra': {
      // Filtrar por câmara se especificada
      if (parentId) {
        filteredLocations = filteredLocations.filter(loc => loc.chamberId === parentId);
      }

      // Agrupar por quadra
      const quadraGroups = new Map<number, LocationWithChamber[]>();
      
      filteredLocations.forEach(location => {
        const quadra = location.coordinates.quadra;
        if (!quadraGroups.has(quadra)) {
          quadraGroups.set(quadra, []);
        }
        quadraGroups.get(quadra)!.push(location);
      });

      return Array.from(quadraGroups.entries()).map(([quadra, locations]) => {
        const stats = calculateLevelStats(locations);
        
        return {
          id: `${parentId}-Q${quadra}`,
          level: 'quadra',
          label: `Quadra ${quadra}`,
          value: quadra,
          parentId,
          childrenCount: locations.length,
          hasChildren: locations.length > 0,
          stats,
          isOccupied: stats.occupied > 0,
          coordinates: { quadra },
        };
      });
    }

    case 'lado': {
      // Extrair câmara e quadra do parentId (formato: "chamberId-Q1")
      if (!parentId) return [];
      
      const [chamberId, quadraPart] = parentId.split('-Q');
      const quadra = parseInt(quadraPart);
      
      filteredLocations = filteredLocations.filter(loc => 
        loc.chamberId === chamberId && loc.coordinates.quadra === quadra
      );

      // Agrupar por lado
      const ladoGroups = new Map<string, LocationWithChamber[]>();
      
      filteredLocations.forEach(location => {
        const lado = location.coordinates.lado;
        if (!ladoGroups.has(lado)) {
          ladoGroups.set(lado, []);
        }
        ladoGroups.get(lado)!.push(location);
      });

      return Array.from(ladoGroups.entries()).map(([lado, locations]) => {
        const stats = calculateLevelStats(locations);
        
        return {
          id: `${parentId}-L${lado}`,
          level: 'lado',
          label: `Lado ${lado}`,
          value: lado,
          parentId,
          childrenCount: locations.length,
          hasChildren: locations.length > 0,
          stats,
          isOccupied: stats.occupied > 0,
          coordinates: { quadra, lado },
        };
      });
    }

    case 'fila': {
      // Extrair dados do parentId (formato: "chamberId-Q1-LA")
      if (!parentId) return [];
      
      const parts = parentId.split('-');
      if (parts.length < 3) return [];
      
      const chamberId = parts[0];
      const quadra = parseInt(parts[1].substring(1)); // Remove 'Q'
      const lado = parts[2].substring(1); // Remove 'L'
      
      filteredLocations = filteredLocations.filter(loc => 
        loc.chamberId === chamberId && 
        loc.coordinates.quadra === quadra &&
        loc.coordinates.lado === lado
      );

      // Agrupar por fila
      const filaGroups = new Map<number, LocationWithChamber[]>();
      
      filteredLocations.forEach(location => {
        const fila = location.coordinates.fila;
        if (!filaGroups.has(fila)) {
          filaGroups.set(fila, []);
        }
        filaGroups.get(fila)!.push(location);
      });

      return Array.from(filaGroups.entries()).map(([fila, locations]) => {
        const stats = calculateLevelStats(locations);
        
        return {
          id: `${parentId}-F${fila}`,
          level: 'fila',
          label: `Fila ${fila}`,
          value: fila,
          parentId,
          childrenCount: locations.length,
          hasChildren: locations.length > 0,
          stats,
          isOccupied: stats.occupied > 0,
          coordinates: { quadra, lado, fila },
        };
      });
    }

    case 'andar': {
      // Extrair dados do parentId (formato: "chamberId-Q1-LA-F1")
      if (!parentId) return [];
      
      const parts = parentId.split('-');
      if (parts.length < 4) return [];
      
      const chamberId = parts[0];
      const quadra = parseInt(parts[1].substring(1));
      const lado = parts[2].substring(1);
      const fila = parseInt(parts[3].substring(1));
      
      filteredLocations = filteredLocations.filter(loc => 
        loc.chamberId === chamberId && 
        loc.coordinates.quadra === quadra &&
        loc.coordinates.lado === lado &&
        loc.coordinates.fila === fila
      );

      // Criar item para cada andar
      return filteredLocations.map(location => {
        const andar = location.coordinates.andar;
        const stats: LevelStats = {
          total: 1,
          occupied: location.isOccupied ? 1 : 0,
          available: location.isOccupied ? 0 : 1,
          occupancyRate: location.isOccupied ? 100 : 0,
          totalCapacityKg: location.maxCapacityKg,
          usedCapacityKg: location.currentWeightKg,
          capacityRate: (location.currentWeightKg / location.maxCapacityKg) * 100,
          productsCount: location.isOccupied ? 1 : 0,
          status: getStatusFromRate(location.isOccupied ? 100 : 0)
        };
        
        return {
          id: `${parentId}-A${andar}`,
          level: 'andar',
          label: `Andar ${andar}`,
          value: andar,
          parentId,
          childrenCount: 0,
          hasChildren: false,
          stats,
          isOccupied: location.isOccupied,
          location,
          coordinates: { quadra, lado, fila, andar },
        };
      });
    }

    default:
      return [];
  }
};

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

class TreeCache {
  private cache = new Map<string, CachedLevel>();
  
  getCacheKey(level: TreeLevel, parentId?: string, filters?: LocationTreeFilters): string {
    const filterStr = filters ? JSON.stringify(filters) : '';
    return `${level}-${parentId || 'root'}-${filterStr}`;
  }
  
  get(level: TreeLevel, parentId?: string, filters?: LocationTreeFilters): LocationTreeItem[] | null {
    const key = this.getCacheKey(level, parentId, filters);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Verificar TTL
    if (Date.now() - cached.timestamp > CACHE_CONFIG.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
  
  set(level: TreeLevel, data: LocationTreeItem[], parentId?: string, filters?: LocationTreeFilters): void {
    const key = this.getCacheKey(level, parentId, filters);
    
    // Limpar cache se exceder tamanho máximo
    if (this.cache.size >= CACHE_CONFIG.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, {
      level,
      data,
      timestamp: Date.now(),
      filters: filters || {},
      stats: data.length > 0 ? data[0].stats : {
        total: 0, occupied: 0, available: 0, occupancyRate: 0,
        totalCapacityKg: 0, usedCapacityKg: 0, capacityRate: 0,
        status: 'unknown'
      },
      ttl: CACHE_CONFIG.ttl
    });
  }
  
  invalidate(): void {
    this.cache.clear();
  }
  
  invalidateLevel(level: TreeLevel): void {
    const keysToDelete = Array.from(this.cache.keys()).filter(key => key.startsWith(level));
    keysToDelete.forEach(key => this.cache.delete(key));
  }
}

// Cache global para reutilização entre instâncias do hook
const treeCache = new TreeCache();

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

export const useLocationTree = (): UseLocationTreeResult => {
  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================
  
  const [state, setState] = useState<TreeNavigationState>({
    currentLevel: 'chamber',
    currentData: [],
    breadcrumb: [],
    loading: false,
    error: null,
    navigationHistory: [],
    canGoBack: false,
    canGoForward: false,
  });
  
  const [filters, setFiltersState] = useState<LocationTreeFilters>(DEFAULT_FILTERS);
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    return (localStorage.getItem('tree-navigation-view-mode') as ViewMode) || 'tree';
  });

  // ============================================================================
  // HOOKS DE DADOS
  // ============================================================================
  
  const { 
    allLocationsWithChambers, 
    loading: locationsLoading, 
    error: locationsError,
    fetchAllLocationsWithChambers
  } = useAllLocationsWithChambers();
  
  const { 
    chambers, 
    loading: chambersLoading,
    error: chambersError
  } = useChambers();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const loading = locationsLoading || chambersLoading;
  const error = locationsError || chambersError;
  
  const stats = useMemo((): LevelStats => {
    if (state.currentData.length === 0) {
      return {
        total: 0, occupied: 0, available: 0, occupancyRate: 0,
        totalCapacityKg: 0, usedCapacityKg: 0, capacityRate: 0,
        status: 'unknown'
      };
    }
    
    // Agregar estatísticas de todos os itens do nível atual
    const aggregated = state.currentData.reduce((acc, item) => ({
      total: acc.total + item.stats.total,
      occupied: acc.occupied + item.stats.occupied,
      available: acc.available + item.stats.available,
      totalCapacityKg: acc.totalCapacityKg + item.stats.totalCapacityKg,
      usedCapacityKg: acc.usedCapacityKg + item.stats.usedCapacityKg,
      productsCount: (acc.productsCount || 0) + (item.stats.productsCount || 0)
    }), {
      total: 0, occupied: 0, available: 0,
      totalCapacityKg: 0, usedCapacityKg: 0, productsCount: 0
    });
    
    const occupancyRate = aggregated.total > 0 ? (aggregated.occupied / aggregated.total) * 100 : 0;
    const capacityRate = aggregated.totalCapacityKg > 0 ? (aggregated.usedCapacityKg / aggregated.totalCapacityKg) * 100 : 0;
    
    return {
      ...aggregated,
      occupancyRate,
      capacityRate,
      status: getStatusFromRate(occupancyRate)
    };
  }, [state.currentData]);

  // ============================================================================
  // CORE FUNCTIONS
  // ============================================================================
  
  /**
   * Atualizar estado com dados de nível
   */
  const updateLevel = useCallback((
    level: TreeLevel, 
    data: LocationTreeItem[], 
    parentId?: string,
    addToHistory: boolean = true
  ) => {
    setState(prevState => {
      // Gerar breadcrumb baseado no parentId e level
      const breadcrumb = generateBreadcrumb(level, parentId, data);
      
      // Atualizar histórico de navegação
      let navigationHistory = [...prevState.navigationHistory];
      if (addToHistory) {
        const currentPath = generatePath(level, parentId);
        navigationHistory.push(currentPath);
        // Limitar histórico a 50 itens
        if (navigationHistory.length > 50) {
          navigationHistory = navigationHistory.slice(-50);
        }
      }
      
      return {
        ...prevState,
        currentLevel: level,
        currentData: data,
        breadcrumb,
        navigationHistory,
        canGoBack: navigationHistory.length > 1,
        canGoForward: false, // Reset forward quando navegar
        loading: false,
        error: null,
      };
    });
  }, []);

  /**
   * Navegar para um nível específico
   */
  const navigateToLevel = useCallback(async (level: TreeLevel, parentId?: string): Promise<void> => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    
    try {
      // Verificar cache primeiro
      const cached = treeCache.get(level, parentId, filters);
      if (cached) {
        updateLevel(level, cached, parentId);
        return;
      }
      
      // Transformar dados
      const data = transformToTreeLevel(allLocationsWithChambers, chambers, level, parentId, filters);
      
      // Salvar no cache
      treeCache.set(level, data, parentId, filters);
      
      // Atualizar estado
      updateLevel(level, data, parentId);
      
    } catch (error: any) {
      setState(prev => ({
        ...prev,
        loading: false,
        error: `Erro ao navegar para ${level}: ${error.message}`
      }));
    }
  }, [allLocationsWithChambers, chambers, filters, updateLevel]);

  /**
   * Aplicar filtros
   */
  const setFilters = useCallback((newFilters: Partial<LocationTreeFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFiltersState(updatedFilters);
    
    // Invalidar cache quando filtros mudarem
    treeCache.invalidate();
    
    // Re-navegar para o nível atual com novos filtros
    const currentParentId = getCurrentParentId(state.breadcrumb);
    if (currentParentId) {
      navigateToLevel(state.currentLevel, currentParentId);
    } else {
      navigateToLevel(state.currentLevel);
    }
  }, [filters, state.currentLevel, state.breadcrumb, navigateToLevel]);

  /**
   * Outras funções de navegação
   */
  const goBack = useCallback(() => {
    if (state.navigationHistory.length > 1) {
      const newHistory = [...state.navigationHistory];
      newHistory.pop(); // Remove atual
      const previousPath = newHistory[newHistory.length - 1];
      
      const { level, parentId } = parsePath(previousPath);
      setState(prev => ({
        ...prev,
        navigationHistory: newHistory,
        canGoBack: newHistory.length > 1,
        canGoForward: true
      }));
      
      // Conditional call para evitar TypeScript error
      if (parentId) {
        navigateToLevel(level, parentId);
      } else {
        navigateToLevel(level);
      }
    }
  }, [state.navigationHistory, navigateToLevel]);

  const goHome = useCallback(() => {
    navigateToLevel('chamber');
  }, [navigateToLevel]);

  const goToPath = useCallback((path: string) => {
    const { level, parentId } = parsePath(path);
    // Conditional call para evitar TypeScript error
    if (parentId) {
      navigateToLevel(level, parentId);
    } else {
      navigateToLevel(level);
    }
  }, [navigateToLevel]);

  const selectLocation = useCallback((locationId: string) => {
    setSelectedLocationId(locationId);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedLocationId(null);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, [setFilters]);

  const refreshLevel = useCallback(async (): Promise<void> => {
    treeCache.invalidateLevel(state.currentLevel);
    await fetchAllLocationsWithChambers();
    const currentParentId = getCurrentParentId(state.breadcrumb);
    await navigateToLevel(state.currentLevel, currentParentId || undefined);
  }, [state.currentLevel, state.breadcrumb, fetchAllLocationsWithChambers, navigateToLevel]);

  const invalidateCache = useCallback(() => {
    treeCache.invalidate();
  }, []);

  const setViewModeWithPersistence = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    localStorage.setItem('tree-navigation-view-mode', mode);
  }, []);

  // ============================================================================
  // EFFECTS
  // ============================================================================
  
  /**
   * Inicializar dados quando disponíveis
   */
  useEffect(() => {
    if (allLocationsWithChambers.length > 0 && chambers.length > 0 && state.currentData.length === 0) {
      navigateToLevel('chamber');
    }
  }, [allLocationsWithChambers, chambers, state.currentData.length, navigateToLevel]);

  /**
   * Invalidar cache quando dados mudarem
   */
  useEffect(() => {
    if (CACHE_CONFIG.invalidateOnUpdate) {
      treeCache.invalidate();
    }
  }, [allLocationsWithChambers, chambers]);

  // ============================================================================
  // RETURN VALUE
  // ============================================================================
  
  return {
    // Estados
    state: {
      ...state,
      loading,
      error: error || state.error
    },
    stats,
    filters,
    
    // Navegação
    navigateToLevel,
    goBack,
    goHome,
    goToPath,
    
    // Filtros
    setFilters,
    clearFilters,
    
    // Seleção
    selectedLocationId,
    selectLocation,
    clearSelection,
    
    // Dados
    refreshLevel,
    invalidateCache,
    
    // Configuração
    viewMode,
    setViewMode: setViewModeWithPersistence,
  };
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateBreadcrumb(level: TreeLevel, parentId?: string, data?: LocationTreeItem[]): any[] {
  const breadcrumb = [];
  
  // Sempre começar com Home (Câmaras)
  breadcrumb.push({
    level: 'chamber',
    label: 'Câmaras',
    value: 'root',
    path: 'chamber',
    isActive: level === 'chamber' && !parentId,
    isClickable: true
  });
  
  if (!parentId) return breadcrumb;
  
  // Parse do parentId para gerar breadcrumb hierárquico
  // Formato esperado: "chamberId-Q1-LA-F1"
  const parts = parentId.split('-');
  
  if (parts.length >= 1) {
    // Nível Chamber
    const chamberId = parts[0];
    breadcrumb.push({
      level: 'quadra',
      label: `Câmara ${chamberId}`,
      value: chamberId,
      path: `quadra:${chamberId}`,
      isActive: level === 'quadra',
      isClickable: true
    });
  }
  
  if (parts.length >= 2) {
    // Nível Quadra
    const quadra = parts[1].substring(1); // Remove 'Q'
    breadcrumb.push({
      level: 'lado',
      label: `Quadra ${quadra}`,
      value: quadra,
      path: `lado:${parts[0]}-${parts[1]}`,
      isActive: level === 'lado',
      isClickable: true
    });
  }
  
  if (parts.length >= 3) {
    // Nível Lado
    const lado = parts[2].substring(1); // Remove 'L'
    breadcrumb.push({
      level: 'fila',
      label: `Lado ${lado}`,
      value: lado,
      path: `fila:${parts[0]}-${parts[1]}-${parts[2]}`,
      isActive: level === 'fila',
      isClickable: true
    });
  }
  
  if (parts.length >= 4) {
    // Nível Fila
    const fila = parts[3].substring(1); // Remove 'F'
    breadcrumb.push({
      level: 'andar',
      label: `Fila ${fila}`,
      value: fila,
      path: `andar:${parts[0]}-${parts[1]}-${parts[2]}-${parts[3]}`,
      isActive: level === 'andar',
      isClickable: true
    });
  }
  
  return breadcrumb;
}

function generatePath(level: TreeLevel, parentId?: string): string {
  return parentId ? `${level}:${parentId}` : level;
}

function parsePath(path: string): { level: TreeLevel; parentId?: string } {
  const [level, parentId] = path.split(':');
  return { level: level as TreeLevel, parentId };
}

function getCurrentParentId(breadcrumb: any[]): string | undefined {
  if (breadcrumb.length <= 1) return undefined;
  
  // O último item do breadcrumb contém o path atual
  const currentPath = breadcrumb[breadcrumb.length - 1]?.path;
  if (!currentPath) return undefined;
  
  const { parentId } = parsePath(currentPath);
  return parentId;
}

export default useLocationTree; 