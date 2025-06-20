# Frontend - Sistema de Gerenciamento de Câmaras Refrigeradas

## 🚀 Stack Tecnológico
- **Framework**: React.js 18+
- **TypeScript**: Para tipagem estática
- **Roteamento**: React Router DOM v6
- **Estado Global**: Context API + useReducer
- **UI Library**: Material-UI (MUI) ou Tailwind CSS
- **Formulários**: React Hook Form + Yup
- **HTTP Client**: Axios
- **Testes**: Jest + React Testing Library

## 📁 Estrutura de Pastas
```
frontend/
├── public/
├── src/
│   ├── components/
│   │   ├── common/
│   │   ├── forms/
│   │   └── layout/
│   ├── hooks/
│   ├── pages/
│   ├── services/
│   ├── contexts/
│   ├── utils/
│   ├── types/
│   └── styles/
├── package.json
└── README.md
```

## 🎯 Páginas Principais

### 1. Dashboard (`/dashboard`)
**Componentes:**
- `DashboardSummary` - Cards com métricas gerais
- `ChamberStatusGrid` - Status de todas as câmaras
- `RecentMovements` - Últimas movimentações
- `CapacityChart` - Gráfico de capacidade de armazenamento
- `AlertsPanel` - Alertas e notificações

**Hooks utilizados:**
- `useDashboard()` - Dados do dashboard
- `useRealTimeUpdates()` - Atualizações em tempo real

### 2. Gerenciar Produtos (`/products`)
**Componentes:**
- `ProductList` - Tabela de produtos com filtros
- `ProductForm` - Formulário de cadastro/edição
- `ProductDetails` - Modal com detalhes do produto
- `LocationSelector` - Componente para selecionar localização
- `MovementHistory` - Histórico de movimentações do produto

**Hooks utilizados:**
- `useProducts()` - CRUD de produtos
- `useLocations()` - Localizações disponíveis
- `useSeedTypes()` - Tipos de sementes

### 3. Gerenciar Localizações (`/locations`)
**Componentes:**
- `ChamberGrid` - Grid visual das câmaras
- `LocationMap` - Mapa 3D da câmara selecionada
- `LocationList` - Lista de localizações com filtros
- `LocationDetails` - Detalhes e histórico da localização
- `ChamberForm` - Formulário para criar/editar câmaras

**Hooks utilizados:**
- `useChambers()` - CRUD de câmaras
- `useLocations()` - Localizações e ocupação
- `useLocationMap()` - Dados para visualização 3D

### 4. Gerenciar Usuários (`/users`)
**Componentes:**
- `UserList` - Tabela de usuários
- `UserForm` - Formulário de cadastro/edição
- `UserPermissions` - Gerenciamento de permissões
- `UserActivity` - Log de atividades do usuário

**Hooks utilizados:**
- `useUsers()` - CRUD de usuários
- `useAuth()` - Verificar permissões

### 5. Relatórios (`/reports`)
**Componentes:**
- `ReportFilters` - Filtros avançados para relatórios
- `InventoryReport` - Relatório de estoque atual
- `MovementReport` - Relatório de movimentações
- `ExpirationReport` - Produtos próximos do vencimento
- `CapacityReport` - Relatório de capacidade
- `ExportButtons` - Botões para exportar (PDF, Excel)

**Hooks utilizados:**
- `useReports()` - Geração de relatórios
- `useExport()` - Exportação de dados

### 6. Histórico (`/history`)
**Componentes:**
- `MovementTimeline` - Timeline de movimentações
- `FilterPanel` - Filtros por data, usuário, produto
- `MovementDetails` - Detalhes da movimentação
- `BulkOperations` - Operações em lote no histórico

**Hooks utilizados:**
- `useMovements()` - Histórico de movimentações
- `useFilters()` - Gerenciamento de filtros

### 7. Configurações (`/settings`)
**Componentes:**
- `SystemSettings` - Configurações gerais do sistema
- `SeedTypeManager` - Gerenciar tipos de sementes
- `UserPreferences` - Preferências do usuário
- `BackupSettings` - Configurações de backup
- `NotificationSettings` - Configurações de notificações

**Hooks utilizados:**
- `useSettings()` - Configurações do sistema
- `useSeedTypes()` - Tipos de sementes

## 🎣 Hooks Customizados (Centralizados)

### useAuth()
```typescript
interface AuthHook {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  refreshToken: () => Promise<void>;
  hasPermission: (permission: string) => boolean;
}
```

### useProducts()
```typescript
interface ProductsHook {
  products: Product[];
  loading: boolean;
  error: string | null;
  totalPages: number;
  currentPage: number;
  fetchProducts: (filters?: ProductFilters) => Promise<void>;
  createProduct: (product: CreateProductData) => Promise<void>;
  updateProduct: (id: string, product: UpdateProductData) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  moveProduct: (id: string, locationId: string) => Promise<void>;
  getProduct: (id: string) => Promise<Product>;
}
```

### useChambers()
```typescript
interface ChambersHook {
  chambers: Chamber[];
  loading: boolean;
  error: string | null;
  fetchChambers: () => Promise<void>;
  createChamber: (chamber: CreateChamberData) => Promise<void>;
  updateChamber: (id: string, chamber: UpdateChamberData) => Promise<void>;
  deleteChamber: (id: string) => Promise<void>;
  generateLocations: (id: string) => Promise<void>;
}
```

### useLocations()
```typescript
interface LocationsHook {
  locations: Location[];
  availableLocations: Location[];
  loading: boolean;
  error: string | null;
  fetchLocations: (chamberId?: string) => Promise<void>;
  fetchAvailableLocations: (filters?: LocationFilters) => Promise<void>;
  getLocationsByChamber: (chamberId: string) => Location[];
  updateLocation: (id: string, location: UpdateLocationData) => Promise<void>;
}
```

### useDashboard()
```typescript
interface DashboardHook {
  summary: DashboardSummary;
  chamberStatus: ChamberStatus[];
  recentMovements: Movement[];
  capacityData: CapacityData[];
  loading: boolean;
  error: string | null;
  refreshDashboard: () => Promise<void>;
}
```

### useReports()
```typescript
interface ReportsHook {
  loading: boolean;
  error: string | null;
  generateInventoryReport: (filters: ReportFilters) => Promise<ReportData>;
  generateMovementReport: (filters: ReportFilters) => Promise<ReportData>;
  generateExpirationReport: (days: number) => Promise<ReportData>;
  generateCapacityReport: () => Promise<ReportData>;
  exportToPDF: (data: ReportData, type: string) => Promise<void>;
  exportToExcel: (data: ReportData, type: string) => Promise<void>;
}
```

## 🎨 Componentes Reutilizáveis

### Layout Components
- `AppLayout` - Layout principal com sidebar e header
- `PageHeader` - Cabeçalho das páginas com breadcrumb
- `Sidebar` - Menu lateral com navegação
- `TopBar` - Barra superior com notificações e user menu

### Form Components
- `FormInput` - Input customizado com validação
- `FormSelect` - Select customizado com search
- `FormDatePicker` - Date picker customizado
- `FormTextArea` - TextArea com contador de caracteres
- `LocationPicker` - Seletor visual de localização

### Data Display Components
- `DataTable` - Tabela com paginação, filtros e ordenação
- `StatsCard` - Card para exibir métricas
- `ProgressBar` - Barra de progresso customizada
- `StatusBadge` - Badge de status colorido
- `Timeline` - Timeline para histórico

### UI Components
- `Button` - Botão customizado com variações
- `Modal` - Modal reutilizável
- `ConfirmDialog` - Dialog de confirmação
- `Loading` - Componente de loading
- `EmptyState` - Estado vazio com ilustração

## 🔧 Services (Camada de API)

### api.js (Configuração Base)
```typescript
// Configuração do Axios com interceptors
export const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptors para token e tratamento de erros
```

### Services Específicos
- `authService.js` - Autenticação
- `productService.js` - Produtos
- `chamberService.js` - Câmaras
- `locationService.js` - Localizações
- `userService.js` - Usuários
- `movementService.js` - Movimentações
- `reportService.js` - Relatórios
- `dashboardService.js` - Dashboard

## 🎭 Contexts

### AuthContext
```typescript
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}
```

### NotificationContext
```typescript
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
}
```

### ThemeContext
```typescript
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  colors: ThemeColors;
}
```

## 📱 Responsividade e UX

### Design System
- Grid system responsivo (12 colunas)
- Breakpoints: mobile (768px), tablet (1024px), desktop (1280px)
- Componentes com variações de tamanho
- Paleta de cores consistente
- Tipografia padronizada

### Navegação
- Menu hambúrguer no mobile
- Breadcrumb em todas as páginas
- Navegação por tabs quando aplicável
- Botão "Voltar" nas páginas de detalhes

### Performance
- Lazy loading de componentes
- Virtualização em listas grandes
- Debounce em campos de busca
- Cache de dados frequentemente acessados
- Otimização de re-renders

## 🧪 Estratégia de Testes

### Testes de Componentes
- Render correto dos componentes
- Interações do usuário (cliques, inputs)
- Estados de loading e erro
- Formulários e validações

### Testes de Hooks
- Lógica de estado dos hooks customizados
- Chamadas de API e tratamento de erros
- Efeitos colaterais e cleanup

### Testes de Integração
- Fluxos completos (login → navegação → ações)
- Integração entre componentes
- Roteamento e navegação

## 📋 Cronograma de Desenvolvimento

### Semana 1: Base e Autenticação
- [ ] Setup inicial do projeto React + TypeScript
- [ ] Configuração do roteamento
- [ ] Layout base (AppLayout, Sidebar, TopBar)
- [ ] Sistema de autenticação completo
- [ ] Context de autenticação

### Semana 2: Hooks e Services
- [ ] Configuração do Axios e interceptors
- [ ] Todos os services de API
- [ ] Hooks customizados principais
- [ ] Context de notificações
- [ ] Componentes base reutilizáveis

### Semana 3: Páginas Principais
- [ ] Dashboard com métricas
- [ ] Página de produtos (lista + formulário)
- [ ] Página de localizações
- [ ] Seletor visual de localizações
- [ ] Integração completa entre pages e hooks

### Semana 4: Páginas Secundárias
- [ ] Página de usuários
- [ ] Página de histórico/movimentações
- [ ] Página de configurações
- [ ] Gerenciamento de tipos de sementes

### Semana 5: Relatórios e Refinamentos
- [ ] Página de relatórios com filtros
- [ ] Exportação para PDF/Excel
- [ ] Responsividade completa
- [ ] Testes automatizados
- [ ] Otimizações de performance