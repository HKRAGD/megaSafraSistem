import React, { useMemo, useCallback } from 'react';
import { Box, Paper, Skeleton, Alert, Fade, useTheme } from '@mui/material';
import { 
  LocationTreeNavigationProps, 
  LocationTreeItem, 
  TreeLevel, 
  ViewMode 
} from '../../../types/locationTree';
import { useLocationTree } from '../../../hooks/useLocationTree';
import { LocationBreadcrumb } from '../LocationBreadcrumb';
import { LocationStats } from '../LocationStats';
import { LocationLevelGrid } from '../LocationLevelGrid';
import { ViewToggle } from '../ViewToggle';

/**
 * 🌳 LocationTreeNavigation - Componente principal que orquestra a navegação hierárquica
 * 
 * Este componente funciona como o maestro da tree-navigation, coordenando:
 * - Breadcrumb para navegação hierárquica
 * - Stats em tempo real por nível
 * - Grid responsivo com drill-down navigation
 * - Toggle entre modos Tree/List
 * - Estados de loading coordenados
 * 
 * @example
 * ```tsx
 * <LocationTreeNavigation
 *   onLocationSelect={(locationId) => setSelectedLocation(locationId)}
 *   selectedLocationId={selectedLocationId}
 *   showStats={true}
 *   allowModeToggle={true}
 * />
 * ```
 */
export const LocationTreeNavigation: React.FC<LocationTreeNavigationProps> = ({
  onLocationSelect,
  selectedLocationId: externalSelectedLocationId,
  showStats = true,
  allowModeToggle = true,
  hideViewToggle = false,
  filters: externalFilters,
  onFiltersChange,
  className,
  ...containerProps
}) => {
  const theme = useTheme();
  
  // ============================================================================
  // HOOK CENTRAL - Toda a lógica de navegação
  // ============================================================================
  
  const {
    state,
    stats,
    filters,
    navigateToLevel,
    goBack,
    goHome,
    goToPath,
    setFilters,
    clearFilters,
    selectedLocationId: internalSelectedLocationId,
    selectLocation,
    clearSelection,
    refreshLevel,
    viewMode,
    setViewMode
  } = useLocationTree();

  // ============================================================================
  // CONTROLE DE SELEÇÃO (Externa vs Interna)
  // ============================================================================
  
  const currentSelectedLocationId = externalSelectedLocationId ?? internalSelectedLocationId;
  
  // Handler para seleção de localização
  const handleLocationSelect = useCallback((item: LocationTreeItem) => {
    if (item.level !== 'andar') return;
    
    // Permitir seleção de qualquer localização para feedback visual
    // O componente pai (LocationStatusIndicator) vai mostrar o status apropriado
    if (onLocationSelect) {
      // Converter para o formato esperado pelo backend (apenas o ObjectId)
      const locationId = item.location?.id || item.id.split('-')[0]; // Pegar apenas a parte do ObjectId
      
      // Callback sem alerts - feedback visual fica por conta do LocationStatusIndicator
      onLocationSelect(locationId);
    }
  }, [onLocationSelect]);

  // Handler para drill-down navigation
  const handleDrillDown = useCallback((item: LocationTreeItem) => {
    if (item.level === 'andar') {
      // Se for andar, pode ser selecionado diretamente
      handleLocationSelect(item);
    } else {
      // Para outros tipos, navegar para próximo nível
      const nextLevel = getNextLevel(item.level);
      if (nextLevel) {
        navigateToLevel(nextLevel, item.id);
      }
    }
  }, [navigateToLevel, handleLocationSelect]);

  // ============================================================================
  // SINCRONIZAÇÃO DE FILTROS (Externa vs Interna)
  // ============================================================================
  
  const currentFilters = externalFilters ?? filters;
  
  const handleFiltersChange = (newFilters: typeof filters) => {
    // Aplicar filtros internamente
    setFilters(newFilters);
    
    // Notificar componente pai se callback fornecido
    onFiltersChange?.(newFilters);
  };

  // ============================================================================
  // HANDLERS DE NAVEGAÇÃO
  // ============================================================================
  
  const handleBreadcrumbNavigation = (path: string, level: TreeLevel) => {
    goToPath(path);
  };

  const handleModeToggle = (newMode: ViewMode) => {
    setViewMode(newMode);
  };

  const handleItemClick = (item: LocationTreeItem) => {
    if (isTreeMode && state.currentLevel !== 'andar') {
      handleDrillDown(item);
    } else {
      handleLocationSelect(item);
    }
  };

  const handleItemSelect = (item: LocationTreeItem) => {
    handleLocationSelect(item);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================
  
  const isTreeMode = viewMode === 'tree';
  
  const showViewToggle = allowModeToggle && !hideViewToggle;
  
  const gridConfig = useMemo(() => {
    return {
      level: state.currentLevel,
      allowDrillDown: state.currentLevel !== 'andar', // Último nível não permite drill-down
      showOccupiedInfo: state.currentLevel === 'andar', // Apenas andares mostram produto
      selectedLocationId: currentSelectedLocationId,
      onLocationSelect: handleLocationSelect,
      onDrillDown: isTreeMode ? handleDrillDown : undefined
    };
  }, [state.currentLevel, currentSelectedLocationId, isTreeMode]);

  // ============================================================================
  // LOADING STATES COORDENADOS
  // ============================================================================
  
  if (state.loading && state.currentData.length === 0) {
    return (
      <Box className={className} {...containerProps}>
        {showViewToggle && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            <Skeleton variant="rectangular" width={120} height={40} />
            <Skeleton variant="rectangular" width={200} height={40} />
          </Box>
        )}
        
        <Skeleton variant="rectangular" width="100%" height={60} sx={{ mb: 2 }} />
        
        {showStats && (
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mb: 3 }}>
            {[1, 2, 3, 4].map(i => (
              <Skeleton key={i} variant="rectangular" height={120} />
            ))}
          </Box>
        )}
        
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 2 }}>
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} variant="rectangular" height={180} />
          ))}
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // ERROR STATE
  // ============================================================================
  
  if (state.error) {
    return (
      <Box className={className} {...containerProps}>
        <Alert 
          severity="error" 
          action={
            <button onClick={refreshLevel}>
              Tentar Novamente
            </button>
          }
        >
          {state.error}
        </Alert>
      </Box>
    );
  }

  // ============================================================================
  // RENDER PRINCIPAL
  // ============================================================================
  
  return (
    <Fade in timeout={300}>
      <Box 
        className={className}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          ...containerProps.sx
        }}
        {...containerProps}
      >
        {/* ===== HEADER: View Toggle + Filtros ===== */}
        {showViewToggle && (
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 2
          }}>
            <ViewToggle
              currentView={viewMode}
              onViewChange={handleModeToggle}
              disabled={state.loading}
            />
            
            {/* TODO: Implementar componente de filtros se necessário */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              {/* Filtros poderão ser adicionados aqui */}
            </Box>
          </Box>
        )}

        {/* ===== BREADCRUMB: Navegação Hierárquica ===== */}
        <Paper 
          variant="outlined" 
          sx={{ 
            p: { xs: 1, sm: 2 },
            bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
          }}
        >
          <LocationBreadcrumb
            breadcrumb={state.breadcrumb}
            onNavigate={handleBreadcrumbNavigation}
            loading={state.loading}
          />
        </Paper>

        {/* ===== STATS: Métricas do Nível Atual ===== */}
        {showStats && (
          <LocationStats
            stats={stats}
            level={state.currentLevel}
            loading={state.loading}
            compact={false}
          />
        )}

        {/* ===== GRID: Conteúdo Principal ===== */}
        <Box sx={{ position: 'relative' }}>
          {/* Loading overlay para mudanças de nível */}
          {state.loading && state.currentData.length > 0 && (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                bgcolor: 'rgba(255, 255, 255, 0.8)',
                backdropFilter: 'blur(1px)',
                zIndex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Box sx={{ textAlign: 'center' }}>
                <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width={120} />
              </Box>
            </Box>
          )}
          
          <LocationLevelGrid
            data={state.currentData}
            level={state.currentLevel}
            loading={false}
            onItemClick={handleItemClick}
            onItemSelect={handleItemSelect}
            selectedItemId={currentSelectedLocationId || undefined}
          />
        </Box>

        {/* ===== EMPTY STATE ===== */}
        {!state.loading && state.currentData.length === 0 && (
          <Paper 
            variant="outlined" 
            sx={{ 
              p: 4, 
              textAlign: 'center',
              bgcolor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.50'
            }}
          >
            <Box sx={{ opacity: 0.6 }}>
              📦
            </Box>
            <Box sx={{ mt: 2, fontSize: '1.1em', fontWeight: 500 }}>
              Nenhuma localização encontrada
            </Box>
            <Box sx={{ mt: 1, color: 'text.secondary' }}>
              Tente ajustar os filtros ou verifique se há dados disponíveis
            </Box>
            {Object.keys(currentFilters).length > 1 && (
              <button 
                onClick={clearFilters}
                style={{ marginTop: '16px', padding: '8px 16px' }}
              >
                Limpar Filtros
              </button>
            )}
          </Paper>
        )}
      </Box>
    </Fade>
  );
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Determina o próximo nível na hierarquia para drill-down
 */
function getNextLevel(currentLevel: TreeLevel): TreeLevel | null {
  const levelMap: Partial<Record<TreeLevel, TreeLevel>> = {
    'chamber': 'quadra',
    'quadra': 'lado', 
    'lado': 'fila',
    'fila': 'andar'
    // 'andar' não tem próximo nível
  };
  
  return levelMap[currentLevel] || null;
}

export default LocationTreeNavigation; 