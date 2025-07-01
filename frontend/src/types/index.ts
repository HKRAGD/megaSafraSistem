// ============================================================================
// SISTEMA DE GERENCIAMENTO DE CÂMARAS REFRIGERADAS - TYPESCRIPTS DEFINITIONS
// ============================================================================

// ============================================================================
// BASE TYPES
// ============================================================================

export type UserRole = 'ADMIN' | 'OPERATOR';
export type ChamberStatus = 'active' | 'maintenance' | 'inactive';
export type ProductStatus = 'CADASTRADO' | 'AGUARDANDO_LOCACAO' | 'LOCADO' | 'AGUARDANDO_RETIRADA' | 'RETIRADO' | 'REMOVIDO';
export type ProductStorageType = 'saco' | 'bag';
export type WithdrawalRequestStatus = 'PENDENTE' | 'CONFIRMADO' | 'CANCELADO';
export type WithdrawalRequestType = 'TOTAL' | 'PARCIAL';
export type MovementType = 'entry' | 'exit' | 'transfer' | 'adjustment';
export type QualityGrade = 'A' | 'B' | 'C' | 'D';
export type EnvironmentalStatus = 'low' | 'normal' | 'high' | 'unknown';
export type ConditionsStatus = 'optimal' | 'normal' | 'alert' | 'unknown';
export type ExpirationStatus = 'expired' | 'critical' | 'warning' | 'good' | 'no-expiration';

// ============================================================================
// MAIN ENTITIES
// ============================================================================

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SeedType {
  id: string;
  name: string;
  description?: string;
  optimalTemperature?: number;
  optimalHumidity?: number;
  maxStorageTimeDays?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Client {
  id: string;
  name: string;
  document: string;
  documentType: 'CPF' | 'CNPJ';
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  notes?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Chamber {
  id: string;
  name: string;
  description?: string;
  currentTemperature?: number;
  currentHumidity?: number;
  dimensions: {
    quadras: number;
    lados: number;
    filas: number;
    andares: number;
  };
  status: ChamberStatus;
  settings?: {
    targetTemperature?: number;
    targetHumidity?: number;
    alertThresholds?: {
      temperatureMin?: number;
      temperatureMax?: number;
      humidityMin?: number;
      humidityMax?: number;
    };
  };
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  totalLocations: number;
  temperatureStatus: EnvironmentalStatus;
  humidityStatus: EnvironmentalStatus;
  conditionsStatus: ConditionsStatus;
  createdAt: string;
  updatedAt: string;
}

export interface Location {
  id: string;
  chamberId: string;
  coordinates: {
    quadra: number;
    lado: string; // Agora aceita letras A-T
    fila: number;
    andar: number;
  };
  code: string;
  isOccupied: boolean;
  maxCapacityKg: number;
  currentWeightKg: number;
  createdAt: string;
  updatedAt: string;
}

export interface LocationWithChamber extends Location {
  chamber: {
    id: string;
    name: string;
  };
}

export interface ProductWithRelations extends Omit<Product, 'seedTypeId' | 'locationId' | 'clientId'> {
  seedTypeId?: {
    id: string;
    name: string;
    optimalTemperature?: number;
    optimalHumidity?: number;
    status?: string;
  };
  locationId?: {
    id: string;
    code: string;
    maxCapacityKg: number;
    currentWeightKg: number;
    chamberId?: {
      id: string;
      name: string;
    };
  };
  clientId?: {
    id: string;
    name: string;
    document: string;
    documentType: 'CPF' | 'CNPJ';
    contactPerson?: string;
  };
}

export interface Product {
  id: string;
  name: string;
  lot: string;
  seedTypeId: string;
  quantity: number;
  storageType: ProductStorageType;
  weightPerUnit: number;
  totalWeight: number;
  locationId?: string; // Agora é opcional conforme especificação
  clientId?: string; // Cliente associado (opcional)
  entryDate: string;
  expirationDate?: string;
  status: ProductStatus;
  notes?: string;
  version?: number; // Para optimistic locking
  tracking?: {
    batchNumber?: string;
    origin?: string;
    supplier?: string;
    qualityGrade?: QualityGrade;
  };
  metadata?: {
    lastMovementDate?: string;
    createdBy?: string;
    lastModifiedBy?: string;
  };
  calculatedTotalWeight: number;
  isNearExpiration: boolean;
  expirationStatus: ExpirationStatus;
  storageTimeDays: number;
  createdAt: string;
  updatedAt: string;
}

export interface Movement {
  id: string;
  productId: string;
  type: MovementType;
  fromLocationId?: string;
  toLocationId?: string;
  quantity: number;
  weight: number;
  userId: string;
  reason?: string;
  notes?: string;
  timestamp: string;
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  productId: string;
  requestedBy: string;
  status: WithdrawalRequestStatus;
  type: WithdrawalRequestType;
  quantityRequested?: number;
  reason?: string;
  requestedAt: string;
  confirmedAt?: string;
  confirmedBy?: string;
  canceledAt?: string;
  canceledBy?: string;
  notes?: string;
  metadata?: {
    originalProductData?: {
      name: string;
      lot: string;
      quantity: number;
      totalWeight: number;
      locationCode: string;
    };
    systemNotes?: string;
  };
  // Campos virtuais do modelo
  waitingTimeDays?: number;
  urgencyStatus?: 'resolved' | 'overdue' | 'urgent' | 'normal';
  createdAt: string;
  updatedAt: string;
}

export interface WithdrawalRequestWithRelations extends Omit<WithdrawalRequest, 'productId' | 'requestedBy' | 'confirmedBy' | 'canceledBy'> {
  productId?: ProductWithRelations; // Objeto populado ao invés de string
  requestedBy?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  confirmedBy?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
  canceledBy?: {
    id: string;
    name: string;
    email: string;
    role: UserRole;
  };
}

// ============================================================================
// DASHBOARD TYPES
// ============================================================================

export interface DashboardSummary {
  totalProducts: number;
  totalChambers: number;
  totalLocations: number;
  occupiedLocations: number;
  totalWeight: number;
  availableCapacity: number;
  productsNearExpiration: number;
  alertsCount: number;
  // Propriedades adicionais para o novo workflow
  totalUsers: number;
  productsCreatedToday: number;
  totalCapacity: number;
  productsAwaitingLocation: number;
  productsAwaitingWithdrawal: number;
  productsLocated: number;
  tasksCompletedToday: number;
}

export interface DashboardApiResponse {
  metadata: {
    generatedAt: string;
    reportType: string;
    period: {
      startDate: string;
      endDate: string;
      days: number;
    };
    generatedBy: string;
    userRole: string;
  };
  kpis: {
    totalProducts: number;
    totalWeight: number;
    totalMovements: number;
    activeChambers: number;
    totalLocations: number;
    occupiedLocations: number;
    totalCapacity: number;
    usedCapacity: number;
    availableCapacity: number;
    occupancyRate: number;
    expiringProducts: number;
    movementsToday?: number;
    period: {
      startDate: string;
      endDate: string;
    };
  };
  systemStatus: {
    totalUsers: number;
    totalSeedTypes: number;
    totalLocations: number;
    totalChambers: number;
    lastUpdate: string;
  };
  criticalAlerts: {
    expiredProducts: number;
    overloadedChambers: number;
    inactiveChambers: number;
    total: number;
  };
  productStatusBreakdown?: {
    totalActive: number;
    cadastrado: number;
    aguardandoLocacao: number;
    locado: number;
    aguardandoRetirada: number;
    retirado: number;
    removido: number;
  };
  comparisons?: any;
  trends?: any;
  alerts?: any[];
  topData?: any;
  quickStats?: any;
}

export interface ChamberStatusSummary {
  id: string;
  name: string;
  status: ChamberStatus;
  conditionsStatus: ConditionsStatus;
  currentTemperature?: number;
  currentHumidity?: number;
  occupancyRate: number;
  alertsCount: number;
}

export interface CapacityData {
  chamberId: string;
  chamberName: string;
  totalCapacity: number;
  usedCapacity: number;
  occupancyRate: number;
  totalLocations: number;
  occupiedLocations: number;
}

export interface RecentMovement {
  id: string;
  productName: string;
  type: MovementType;
  fromLocation?: string;
  toLocation?: string;
  weight: number;
  userName: string;
  timestamp: string;
}

export interface RecentMovementsResponse {
  summary: {
    totalMovements: number;
    period: {
      startTime: string;
      endTime: string;
      hours: number;
    };
    byType: any[];
  };
  movements: RecentMovement[];
  analysis: any;
  activity: {
    groupedByType: any;
    hourlyActivity: Array<{
      hour: number;
      count: number;
      timestamp: string;
    }>;
  };
  metadata: {
    generatedAt: string;
    limit: number;
    hours: number;
    filters: any;
    generatedBy: string;
  };
}

// ============================================================================
// API RESPONSE TYPES
// ============================================================================

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface ProductsResponse {
  products: Product[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export interface SeedTypesResponse {
  seedTypes: SeedType[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  analytics?: any;
}

export interface ClientsResponse {
  clients: Client[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  analytics?: any;
}

export interface ChambersResponse {
  chambers: Chamber[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  analytics?: any;
}

export interface LocationsResponse {
  locations: Location[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  analytics?: any;
}

export interface MovementsResponse {
  movements: Movement[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  analytics?: any;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: string;
  security: {
    sessionId: string;
    loginAttempts: number;
    lastLogin: string;
  };
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: string;
  security: {
    sessionId: string;
    loginAttempts: number;
    lastLogin: string;
  };
}

// ============================================================================
// FORM DATA TYPES
// ============================================================================

export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

export interface CreateUserFormData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface UpdateUserFormData {
  name?: string;
  email?: string;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateSeedTypeFormData {
  name: string;
  description?: string;
  optimalTemperature?: number | null;
  optimalHumidity?: number | null;
  maxStorageTimeDays?: number | null;
}

export interface UpdateSeedTypeFormData {
  name: string;
  description?: string;
  optimalTemperature?: number | null;
  optimalHumidity?: number | null;
  maxStorageTimeDays?: number | null;
}

export interface CreateChamberFormData {
  name: string;
  description?: string;
  dimensions: {
    quadras: number;
    lados: number;
    filas: number;
    andares: number;
  };
  settings?: {
    targetTemperature?: number;
    targetHumidity?: number;
    alertThresholds?: {
      temperatureMin?: number;
      temperatureMax?: number;
      humidityMin?: number;
      humidityMax?: number;
    };
  };
}

export interface CreateClientFormData {
  name: string;
  document: string;
  documentType: 'CPF' | 'CNPJ';
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  notes?: string;
}

export interface UpdateClientFormData {
  name?: string;
  document?: string;
  documentType?: 'CPF' | 'CNPJ';
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    number?: string;
    complement?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  notes?: string;
  isActive?: boolean;
}

export interface CreateProductFormData {
  name: string;
  lot: string;
  seedTypeId: string;
  quantity: number;
  storageType: ProductStorageType;
  weightPerUnit: number;
  locationId?: string; // Agora é opcional conforme especificação FSM
  clientId?: string; // Cliente associado (opcional)
  expirationDate?: string;
  notes?: string;
  tracking?: {
    batchNumber?: string;
    origin?: string;
    supplier?: string;
    qualityGrade?: QualityGrade;
  };
}

// Batch Products API Types
export type CreateBatchProductsPayload = {
  clientId: string;
  products: Array<Omit<CreateProductFormData, 'locationId' | 'clientId'>>;
};

export interface UpdateProductFormData {
  name?: string;
  lot?: string;
  seedTypeId?: string;
  quantity?: number;
  storageType?: ProductStorageType;
  weightPerUnit?: number;
  locationId?: string;
  clientId?: string;
  expirationDate?: string;
  notes?: string;
  tracking?: {
    batchNumber?: string;
    origin?: string;
    supplier?: string;
    qualityGrade?: QualityGrade;
  };
}

export interface MoveProductFormData {
  newLocationId: string;
  reason?: string;
  notes?: string;
}

export interface CreateMovementFormData {
  productId: string;
  type: MovementType;
  fromLocationId?: string;
  toLocationId?: string;
  quantity: number;
  weight: number;
  reason?: string;
  notes?: string;
}

// ============================================================================
// FILTER TYPES
// ============================================================================

export interface UserFilters {
  search?: string;
  role?: UserRole;
  isActive?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ClientFilters {
  search?: string;
  documentType?: 'CPF' | 'CNPJ';
  isActive?: boolean;
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: SortDirection;
}

export interface ProductFilters {
  search?: string;
  seedTypeId?: string;
  locationId?: string;
  chamberId?: string;
  clientId?: string;
  status?: ProductStatus;
  storageType?: ProductStorageType;
  isNearExpiration?: boolean;
  expirationStatus?: ExpirationStatus;
  page?: number;
  limit?: number;
  sort?: string;
  sortOrder?: SortDirection;
}

export interface LocationFilters {
  chamberId?: string;
  isOccupied?: boolean;
  available?: boolean;
  minCapacity?: number;
  maxCapacity?: number;
  coordinates?: {
    quadra?: number;
    lado?: string; // Aceita letras A-T
    fila?: number;
    andar?: number;
  };
  page?: number;
  limit?: number;
  sort?: string;
}

export interface MovementFilters {
  productId?: string;
  locationId?: string;
  type?: MovementType;
  userId?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ReportFilters {
  chamberId?: string;
  seedTypeId?: string;
  clientId?: string;
  startDate?: string;
  endDate?: string;
  status?: ProductStatus;
  expirationDays?: number;
  movementType?: string;
  userId?: string;
  productId?: string;
}

// ============================================================================
// HOOK STATE TYPES
// ============================================================================

export interface UseAuthState {
  user: User | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
}

export interface UseDataState<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  total: number;
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface UseDashboardState {
  summary: DashboardSummary | null;
  chamberStatus: ChamberStatusSummary[];
  recentMovements: RecentMovement[];
  capacityData: CapacityData[];
  loading: boolean;
  error: string | null;
}

// ============================================================================
// COMPONENT PROPS TYPES
// ============================================================================

export interface DataTableProps<T> {
  data: T[];
  loading: boolean;
  columns: TableColumn<T>[];
  onEdit?: (item: T) => void;
  onDelete?: (item: T) => void;
  onView?: (item: T) => void;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
  filters?: React.ReactNode;
  actions?: React.ReactNode;
}

export interface TableColumn<T> {
  id: string;
  key: keyof T | string;
  label: string;
  sortable?: boolean;
  render?: (value: any, item: T) => React.ReactNode;
  width?: string | number;
  align?: 'left' | 'center' | 'right';
}

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  actions?: React.ReactNode;
}

export interface StatsCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type Coordinates = {
  quadra: number;
  lado: string; // Letras A-T
  fila: number;
  andar: number;
};

export type LocationCode = string; // Format: "Q1-L2-F3-A4"

export type SortDirection = 'asc' | 'desc';

export type Theme = 'light' | 'dark';

export type Language = 'pt-BR' | 'en-US';

// ============================================================================
// ERROR TYPES
// ============================================================================

export interface ApiError {
  code: string;
  message: string;
  field?: string;
  details?: string;
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// ============================================================================
// END OF TYPES FILE
// ============================================================================ 