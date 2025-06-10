import React from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Tooltip,
  IconButton,
  Paper,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  ToggleButton,
  ToggleButtonGroup,
  Alert,
  Divider,
  Stack,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  Layers as LayersIcon,
  ViewInAr as ViewInArIcon,
  Info as InfoIcon,
  GridOn as GridOnIcon,
  Palette as PaletteIcon,
  ThreeDRotation as ThreeDIcon,
  ViewCompact as TwoDIcon,
  ViewModule as IsometricIcon,
} from '@mui/icons-material';
import { Chamber, LocationWithChamber } from '../../../types';
import { useLocationMap3D, ViewMode, MapMode } from './hooks/useLocationMap3D';

interface LocationMap3DAdvancedProps {
  chambers: Chamber[];
  allLocations: LocationWithChamber[];
  mode: MapMode;
  onLocationSelect?: (location: LocationWithChamber | null) => void;
  selectedLocation?: LocationWithChamber | null;
  availableOnly?: boolean;
  title?: string;
  showControls?: boolean;
  height?: number | string;
}

export const LocationMap3DAdvanced: React.FC<LocationMap3DAdvancedProps> = ({
  chambers,
  allLocations,
  mode,
  onLocationSelect,
  selectedLocation,
  availableOnly = false,
  title = "Mapa 3D das Localizações",
  showControls = true,
  height = 600,
}) => {
  const {
    selectedChamber,
    selectedFloor,
    viewMode,
    showGrid,
    showCapacityColors,
    locationGrid,
    floorStats,
    chamberAnalysis,
    chamberLocations,
    handleLocationSelect,
    handleChamberChange,
    handleFloorChange,
    setViewMode,
    setShowGrid,
    setShowCapacityColors,
    getCapacityColor,
    getTooltipInfo,
    hasData,
  } = useLocationMap3D({
    chambers,
    allLocations,
    mode,
    onLocationSelect,
    selectedLocation,
    availableOnly,
  });

  // Função para gerar o estilo 3D baseado no modo de visualização
  const get3DStyle = (viewMode: ViewMode) => {
    const baseStyle = {
      transformStyle: 'preserve-3d' as const,
      perspective: '800px',
    };

    switch (viewMode) {
      case '3d':
        return {
          ...baseStyle,
          transform: 'rotateX(5deg) rotateY(-5deg)',
        };
      case 'isometric':
        return {
          ...baseStyle,
          transform: 'rotateX(15deg) rotateY(15deg)',
        };
      case '2d':
      default:
        return {};
    }
  };

  if (!hasData || !selectedChamber) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {title}
          </Typography>
          <Alert severity="info" icon={<InfoIcon />}>
            <Typography variant="subtitle2">
              {chambers.length === 0 ? 'Nenhuma Câmara Disponível' : 'Carregando Dados'}
            </Typography>
            <Typography variant="body2">
              {chambers.length === 0 
                ? 'Não há câmaras configuradas no sistema.'
                : 'Por favor, aguarde enquanto carregamos as informações das localizações...'
              }
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Cabeçalho */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <ViewInArIcon color="primary" sx={{ mr: 1 }} />
          <Typography variant="h6" sx={{ flex: 1 }}>
            {title}
          </Typography>
          
          {/* Indicador do modo */}
          <Chip
            label={
              mode === 'selection' ? 'Seleção' :
              mode === 'transfer' ? 'Movimentação' : 'Visualização'
            }
            color={
              mode === 'selection' ? 'primary' :
              mode === 'transfer' ? 'warning' : 'default'
            }
            size="small"
          />
        </Box>

        {/* Controles */}
        {showControls && (
          <Box sx={{ mb: 3 }}>
            <Grid container spacing={2} sx={{ mb: 2 }}>
              {/* Seleção de Câmara */}
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Câmara</InputLabel>
                  <Select
                    value={selectedChamber.id}
                    onChange={(e) => {
                      const chamber = chambers.find(c => c.id === e.target.value);
                      handleChamberChange(chamber || null);
                    }}
                    label="Câmara"
                  >
                    {chambers.map((chamber) => (
                      <MenuItem key={chamber.id} value={chamber.id}>
                        {chamber.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Seleção de Andar */}
              <Grid size={{ xs: 12, md: 4 }}>
                <FormControl fullWidth size="small">
                  <InputLabel>Andar</InputLabel>
                  <Select
                    value={selectedFloor}
                    onChange={(e) => handleFloorChange(Number(e.target.value))}
                    label="Andar"
                  >
                    {Array.from(
                      { length: selectedChamber.dimensions.andares },
                      (_, i) => i + 1
                    ).map((andar) => (
                      <MenuItem key={andar} value={andar}>
                        Andar {andar}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              {/* Modo de Visualização */}
              <Grid size={{ xs: 12, md: 4 }}>
                <ToggleButtonGroup
                  value={viewMode}
                  exclusive
                  onChange={(e, newMode) => newMode && setViewMode(newMode)}
                  size="small"
                  sx={{ width: '100%' }}
                >
                  <ToggleButton value="2d" sx={{ flex: 1 }}>
                    <TwoDIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="3d" sx={{ flex: 1 }}>
                    <ThreeDIcon fontSize="small" />
                  </ToggleButton>
                  <ToggleButton value="isometric" sx={{ flex: 1 }}>
                    <IsometricIcon fontSize="small" />
                  </ToggleButton>
                </ToggleButtonGroup>
              </Grid>
            </Grid>

            {/* Controles Adicionais */}
            <Stack direction="row" spacing={2} alignItems="center">
              <FormControlLabel
                control={
                  <Switch
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    size="small"
                  />
                }
                label="Grade"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={showCapacityColors}
                    onChange={(e) => setShowCapacityColors(e.target.checked)}
                    size="small"
                  />
                }
                label="Cores por Capacidade"
              />
            </Stack>
          </Box>
        )}

        {/* Estatísticas */}
        <Box sx={{ mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip
              icon={<LayersIcon />}
              label={`Total: ${floorStats.total}`}
              color="default"
              size="small"
            />
            <Chip
              label={`Disponíveis: ${floorStats.available}`}
              color="success"
              size="small"
            />
            <Chip
              label={`Ocupadas: ${floorStats.occupied}`}
              color="error"
              size="small"
            />
            <Chip
              label={`Ocupação: ${floorStats.occupancyRate.toFixed(1)}%`}
              color={floorStats.occupancyRate > 80 ? 'warning' : 'info'}
              size="small"
            />
            <Chip
              label={`Capacidade: ${floorStats.capacityPercentage.toFixed(1)}%`}
              color={floorStats.capacityPercentage > 80 ? 'error' : 'info'}
              size="small"
            />
          </Stack>
        </Box>

        {/* Análise da Câmara */}
        {chamberAnalysis && mode === 'visualization' && (
          <Box sx={{ mb: 2 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              <Typography variant="subtitle2">
                Análise da Câmara (Eficiência: {chamberAnalysis.efficiency.toFixed(1)}%)
              </Typography>
              {chamberAnalysis.recommendations.length > 0 && (
                <Typography variant="body2">
                  • {chamberAnalysis.recommendations.join(' • ')}
                </Typography>
              )}
            </Alert>
          </Box>
        )}

        <Divider sx={{ my: 1 }} />

        {/* Grid Visual das Localizações */}
        <Paper 
          sx={{ 
            flex: 1,
            p: 2, 
            bgcolor: 'grey.50', 
            borderRadius: 2,
            overflow: 'auto',
            minHeight: 350,
            maxHeight: height ? (typeof height === 'number' ? height - 120 : 450) : 450,
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            width: '100%',
            boxSizing: 'border-box'
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {selectedChamber.name} - Andar {selectedFloor}
          </Typography>
          
          {/* Container do Grid com Scroll Próprio */}
          <Box sx={{ 
            flex: 1,
            overflow: 'auto',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1,
            bgcolor: 'background.paper'
          }}>
            <Box sx={{ 
              display: 'grid',
              gridTemplateColumns: `repeat(${selectedChamber.dimensions.filas}, 1fr)`,
              gap: showGrid ? 1 : 0.5,
              minWidth: selectedChamber.dimensions.filas * 60,
              width: 'max-content',
              justifyContent: 'center',
              padding: viewMode === '3d' ? 2 : 1,
              margin: 'auto',
              transform: 'translateZ(0)',
              ...(viewMode !== '2d' ? get3DStyle(viewMode) : {})
            }}>
              {Array.from({ length: selectedChamber.dimensions.quadras }, (_, q) => 
                Array.from({ length: selectedChamber.dimensions.lados }, (_, l) =>
                  Array.from({ length: selectedChamber.dimensions.filas }, (_, f) => {
                    const quadra = q + 1;
                    const lado = l + 1;
                    const fila = f + 1;
                    
                    const locationCube = locationGrid[quadra]?.[lado]?.[fila];
                    
                    if (!locationCube) {
                      return (
                        <Box
                          key={`${quadra}-${lado}-${fila}`}
                          sx={{
                            width: { xs: 30, sm: 40, md: 50 },
                            height: { xs: 30, sm: 40, md: 50 },
                            border: showGrid ? '1px dashed #ccc' : 'none',
                            borderRadius: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '10px',
                            color: 'text.disabled',
                            bgcolor: 'grey.200',
                          }}
                        >
                          --
                        </Box>
                      );
                    }

                    const { location, isAvailable, isOccupied, canSelect, capacityPercentage } = locationCube;
                    const tooltipInfo = getTooltipInfo(locationCube);
                    const isSelected = selectedLocation?.id === location.id;
                    const color = getCapacityColor(capacityPercentage, isOccupied);
                    
                    // ✅ DEBUG: Log para verificar se localizações ocupadas estão sendo processadas
                    if (isOccupied) {
                      console.log(`🔴 Localização ocupada encontrada: ${location.code}, cor: ${color}, isOccupied: ${isOccupied}`);
                    }
                    
                    return (
                      <Tooltip
                        key={location.id}
                        title={
                          <Box>
                            <Typography variant="subtitle2">
                              {tooltipInfo.code}
                            </Typography>
                            <Typography variant="body2">
                              Câmara: {tooltipInfo.chamber}
                            </Typography>
                            <Typography variant="body2">
                              Status: <span style={{ color: tooltipInfo.statusColor === 'error' ? '#f44336' : '#4caf50' }}>
                                {tooltipInfo.status}
                              </span>
                            </Typography>
                            <Typography variant="body2">
                              Capacidade: {tooltipInfo.capacity} ({tooltipInfo.capacityPercentage}%)
                            </Typography>
                            <Typography variant="body2">
                              Coordenadas: {tooltipInfo.coordinates}
                            </Typography>
                            {!tooltipInfo.canSelect && (
                              <Typography variant="caption" color="warning.main">
                                ⚠️ Não selecionável neste modo
                              </Typography>
                            )}
                          </Box>
                        }
                        placement="top"
                      >
                        <Box
                          sx={{
                            width: { xs: 30, sm: 40, md: 50 },
                            height: { xs: 30, sm: 40, md: 50 },
                            backgroundColor: color,
                            border: isSelected ? 3 : showGrid ? 1 : 0,
                            borderColor: isSelected ? 'primary.main' : 'rgba(0,0,0,0.12)',
                            borderRadius: 1,
                            cursor: canSelect ? 'pointer' : 'default',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: viewMode !== '2d' ? 'translateZ(10px)' : 'none',
                            boxShadow: isSelected ? 4 : 1,
                            opacity: canSelect ? 1 : 0.7,
                            '&:hover': canSelect ? {
                              transform: viewMode !== '2d' ? 'translateZ(20px) scale(1.1)' : 'scale(1.1)',
                              boxShadow: 6,
                              zIndex: 10,
                            } : {},
                          }}
                          onClick={() => handleLocationSelect(locationCube)}
                        >
                          <Typography 
                            variant="caption" 
                            sx={{ 
                              color: 'white', 
                              fontWeight: 'bold',
                              textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
                              fontSize: { xs: '8px', sm: '10px', md: '12px' }
                            }}
                          >
                            {lado}-{fila}
                          </Typography>
                        </Box>
                      </Tooltip>
                    );
                  })
                )
              )}
            </Box>
          </Box>

          {/* Legenda */}
          <Box sx={{ mt: 2, pt: 1, borderTop: '1px solid', borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              Legenda: L-F (Lado-Fila) • 
              <span style={{ color: '#4caf50' }}> Verde: 0-30% </span> • 
              <span style={{ color: '#ff9800' }}> Laranja: 31-70% </span> • 
              <span style={{ color: '#ff5722' }}> Vermelho claro: 71-90% </span> • 
              <span style={{ color: '#f44336' }}> Vermelho: Ocupado/91-100% </span>
            </Typography>
          </Box>
        </Paper>
      </CardContent>
    </Card>
  );
};

export default LocationMap3DAdvanced; 