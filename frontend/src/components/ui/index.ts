// ============================================================================
// UI COMPONENTS INDEX
// ============================================================================

/**
 * Componentes UI reutilizáveis do sistema de câmaras refrigeradas
 * 
 * CARACTERÍSTICAS:
 * - FormInput: Input integrado com React Hook Form + Yup
 * - LocationHierarchyDisplay: Visualização da hierarquia Q-L-F-A
 * - SeedTypeSelector: Seletor dinâmico de tipos de sementes
 * 
 * REGRAS SEGUIDAS:
 * - TypeScript rigoroso
 * - Material-UI consistency
 * - React Hook Form integration
 * - Acessibilidade (ARIA)
 * - Performance otimizada
 */

// Form Components
export { default as FormInput } from './FormInput';
export type { FormInputProps } from './FormInput';

// Location Components  
export { default as LocationHierarchyDisplay } from './LocationHierarchyDisplay';
export type { LocationHierarchyDisplayProps } from './LocationHierarchyDisplay';

// Seed Type Components
export { default as SeedTypeSelector } from './SeedTypeSelector';
export type { SeedTypeSelectorProps } from './SeedTypeSelector';

// Client Components
export { ClientSelector } from './ClientSelector';
export type { ClientSelectorProps } from './ClientSelector';

// Stats Components
export { default as StatsCard } from './StatsCard';
export type { StatsCardProps } from './StatsCard';

// Location Components (continued)
export { default as LocationSelector } from './LocationSelector';

// Status Components
export { StatusBadge, ProductStatusBadge, WithdrawalStatusBadge, WithdrawalTypeBadge, StatusBadgeGroup } from './StatusBadge'; 