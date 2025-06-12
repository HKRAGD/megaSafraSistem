import { Chamber, LocationWithChamber } from './index';

// Tipos de níveis hierárquicos do warehouse
export type TreeLevel = 'chamber' | 'quadra' | 'lado' | 'fila' | 'andar';

// Modo de visualização
export type ViewMode = 'list' | 'tree';

// Item genérico da árvore para cada nível
export interface LocationTreeItem {
  id: string;
  level: TreeLevel;
  label: string;
  value: string | number;
  
  // Hierarquia
  parentId?: string;
  childrenCount: number;
  hasChildren: boolean;
  
  // Estatísticas
  stats: LevelStats;
  
  // Estado
  isSelected?: boolean;
  isExpanded?: boolean;
  isOccupied?: boolean;
  
  // Dados originais dependendo do nível
  chamber?: Chamber;
  location?: LocationWithChamber;
  
  // Coordenadas específicas
  coordinates?: {
    quadra?: number;
    lado?: string;
    fila?: number;
    andar?: number;
  };
}

// Estatísticas por nível
export interface LevelStats {
  total: number;
  occupied: number;
  available: number;
  occupancyRate: number; // 0-100
  totalCapacityKg: number;
  usedCapacityKg: number;
  capacityRate: number; // 0-100
  productsCount?: number;
  
  // Status visual baseado em thresholds
  status: 'optimal' | 'normal' | 'warning' | 'critical' | 'unknown';
}

// Item do breadcrumb
export interface BreadcrumbItem {
  level: TreeLevel;
  label: string;
  value: string | number;
  path: string;
  isActive: boolean;
  isClickable: boolean;
  icon?: React.ReactNode;
}

// Filtros aplicáveis por nível
export interface LocationTreeFilters {
  // Filtros gerais
  search?: string;
  status?: 'available' | 'occupied' | 'all';
  
  // Filtros por capacidade
  minCapacity?: number;
  maxCapacity?: number;
  capacityThreshold?: number; // 0-100
  
  // Filtros específicos
  chamberId?: string;
  quadra?: number;
  lado?: string;
  fila?: number;
  andar?: number;
  
  // Filtros de produto
  seedTypeId?: string;
  hasProduct?: boolean;
  nearExpiration?: boolean; // produtos próximos ao vencimento
}

// Estado da navegação hierárquica
export interface TreeNavigationState {
  currentLevel: TreeLevel;
  currentData: LocationTreeItem[];
  breadcrumb: BreadcrumbItem[];
  
  // Seleção atual
  selectedChamber?: string;
  selectedQuadra?: number;
  selectedLado?: string;
  selectedFila?: number;
  selectedAndar?: number;
  
  // Estado da UI
  loading: boolean;
  error: string | null;
  
  // Histórico de navegação
  navigationHistory: string[];
  canGoBack: boolean;
  canGoForward: boolean;
}

// Contexto de cache por nível
export interface CachedLevel {
  level: TreeLevel;
  data: LocationTreeItem[];
  timestamp: number;
  filters: LocationTreeFilters;
  stats: LevelStats;
  ttl: number; // Time to live em ms
}

// Props para componentes de grid
export interface LevelGridProps {
  level: TreeLevel;
  data: LocationTreeItem[];
  loading?: boolean;
  
  // Handlers
  onItemClick: (item: LocationTreeItem) => void;
  onItemSelect?: (item: LocationTreeItem) => void;
  
  // Estado
  selectedItemId?: string;
  expandedItems?: string[];
  
  // Configuração
  columns?: number | { xs?: number; sm?: number; md?: number; lg?: number };
  showStats?: boolean;
  showTooltips?: boolean;
  enableHover?: boolean;
}

// Props para estatísticas
export interface LocationStatsProps {
  stats: LevelStats;
  level: TreeLevel;
  loading?: boolean;
  compact?: boolean;
  showTrends?: boolean;
}

// Props para breadcrumb
export interface LocationBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  onNavigate: (path: string, level: TreeLevel) => void;
  loading?: boolean;
  maxItems?: number; // Para collapse em mobile
}

// Interface principal do hook useLocationTree
export interface UseLocationTreeResult {
  // Estados
  state: TreeNavigationState;
  stats: LevelStats;
  filters: LocationTreeFilters;
  
  // Navegação
  navigateToLevel: (level: TreeLevel, id?: string) => Promise<void>;
  goBack: () => void;
  goHome: () => void;
  goToPath: (path: string) => void;
  
  // Filtros
  setFilters: (filters: Partial<LocationTreeFilters>) => void;
  clearFilters: () => void;
  
  // Seleção
  selectedLocationId: string | null;
  selectLocation: (locationId: string) => void;
  clearSelection: () => void;
  
  // Dados
  refreshLevel: () => Promise<void>;
  invalidateCache: () => void;
  
  // Configuração
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
}

// Utilitários para conversão de dados
export interface DataTransformOptions {
  includeEmpty?: boolean;
  groupBy?: keyof LocationWithChamber;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  limit?: number;
}

// Thresholds para status visual
export interface StatusThresholds {
  optimal: { min: number; max: number }; // 0-70%
  normal: { min: number; max: number };  // 71-85%
  warning: { min: number; max: number }; // 86-95%
  critical: { min: number; max: number }; // 96-100%
}

export const DEFAULT_STATUS_THRESHOLDS: StatusThresholds = {
  optimal: { min: 0, max: 70 },
  normal: { min: 71, max: 85 },
  warning: { min: 86, max: 95 },
  critical: { min: 96, max: 100 }
};

// Configuração do cache
export interface CacheConfig {
  ttl: number; // Time to live em ms (default: 5 minutos)
  maxSize: number; // Máximo de itens no cache (default: 100)
  prefetchNextLevel: boolean; // Prefetch do próximo nível (default: true)
  invalidateOnUpdate: boolean; // Invalidar cache em updates (default: true)
}

// Props para o componente principal LocationTreeNavigation
export interface LocationTreeNavigationProps {
  // Controle de seleção
  onLocationSelect?: (locationId: string) => void;
  selectedLocationId?: string;
  
  // Configuração de exibição
  showStats?: boolean;
  allowModeToggle?: boolean;
  hideViewToggle?: boolean;
  
  // Controle de filtros (externo)
  filters?: Partial<LocationTreeFilters>;
  onFiltersChange?: (filters: LocationTreeFilters) => void;
  
  // Props de container
  className?: string;
  sx?: any;
} 