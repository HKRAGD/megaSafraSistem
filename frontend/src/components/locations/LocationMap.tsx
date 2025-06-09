import React, { useState, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Tooltip,
  IconButton,
  Paper,
  Tabs,
  Tab,
  Button,
  Alert,
  LinearProgress,
} from '@mui/material';
import {
  ViewModule as GridIcon,
  ViewCompact as CompactIcon,
  Info as InfoIcon,
  CheckCircle as OccupiedIcon,
  RadioButtonUnchecked as AvailableIcon,
} from '@mui/icons-material';
import { Chamber, Location } from '../../types';

interface LocationMapProps {
  chamber: Chamber;
  locations: Location[];
  loading: boolean;
  viewMode: 'grid' | 'map';
  selectedLocation: Location | null;
  onLocationSelect: (location: Location) => void;
  onLocationUpdate?: (locationId: string, data: any) => void;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`location-tabpanel-${index}`}
      aria-labelledby={`location-tab-${index}`}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

export const LocationMap: React.FC<LocationMapProps> = ({
  chamber,
  locations,
  loading,
  viewMode,
  selectedLocation,
  onLocationSelect,
  onLocationUpdate,
}) => {
  const [selectedLevel, setSelectedLevel] = useState(1);
  const [selectedQuadra, setSelectedQuadra] = useState(1);

  // Organizar localizações por coordenadas
  const locationMap = useMemo(() => {
    const map = new Map<string, Location>();
    locations.forEach(location => {
      const key = `${location.coordinates.quadra}-${location.coordinates.lado}-${location.coordinates.fila}-${location.coordinates.andar}`;
      map.set(key, location);
    });
    return map;
  }, [locations]);

  // Calcular estatísticas
  const stats = useMemo(() => {
    const occupied = locations.filter(loc => loc.isOccupied).length;
    const available = locations.filter(loc => !loc.isOccupied).length;
    const total = locations.length;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    return { occupied, available, total, occupancyRate };
  }, [locations]);

  const getLocationKey = (quadra: number, lado: number, fila: number, andar: number) => {
    return `${quadra}-${lado}-${fila}-${andar}`;
  };

  const getLocationStatus = (location?: Location) => {
    if (!location) return 'not-generated';
    return location.isOccupied ? 'occupied' : 'available';
  };

  const getLocationColor = (status: string) => {
    switch (status) {
      case 'occupied':
        return '#f44336'; // Vermelho
      case 'available':
        return '#4caf50'; // Verde
      case 'not-generated':
        return '#e0e0e0'; // Cinza
      default:
        return '#e0e0e0';
    }
  };

  const renderGridView = () => {
    const { quadras, lados, filas, andares } = chamber.dimensions;
    
    return (
      <Box>
        {/* Controles de navegação */}
        <Box sx={{ mb: 3 }}>
          <Tabs
            value={selectedLevel - 1}
            onChange={(e, newValue) => setSelectedLevel(newValue + 1)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {Array.from({ length: andares }, (_, i) => (
              <Tab key={i} label={`Andar ${i + 1}`} />
            ))}
          </Tabs>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Quadra {selectedQuadra} - Andar {selectedLevel}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
            {Array.from({ length: quadras }, (_, i) => (
              <Button
                key={i}
                variant={selectedQuadra === i + 1 ? 'contained' : 'outlined'}
                size="small"
                onClick={() => setSelectedQuadra(i + 1)}
              >
                Q{i + 1}
              </Button>
            ))}
          </Box>
        </Box>

        {/* Grade de localizações */}
        <Paper sx={{ p: 2, overflow: 'auto' }}>
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: `repeat(${filas}, 1fr)`,
              gap: 1,
              minWidth: filas * 50,
            }}
          >
            {Array.from({ length: lados }, (_, ladoIndex) =>
              Array.from({ length: filas }, (_, filaIndex) => {
                const lado = ladoIndex + 1;
                const fila = filaIndex + 1;
                const key = getLocationKey(selectedQuadra, lado, fila, selectedLevel);
                const location = locationMap.get(key);
                const status = getLocationStatus(location);
                const isSelected = selectedLocation?.id === location?.id;

                return (
                  <Tooltip
                    key={key}
                    title={
                      location
                        ? `${location.code} - ${status === 'occupied' ? 'Ocupada' : 'Disponível'}`
                        : `Q${selectedQuadra}-L${lado}-F${fila}-A${selectedLevel} - Não gerada`
                    }
                  >
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        backgroundColor: getLocationColor(status),
                        border: isSelected ? 3 : 1,
                        borderColor: isSelected ? 'primary.main' : 'rgba(0,0,0,0.12)',
                        borderRadius: 1,
                        cursor: location ? 'pointer' : 'default',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        transition: 'all 0.2s',
                        '&:hover': location ? {
                          transform: 'scale(1.1)',
                          boxShadow: 2,
                        } : {},
                      }}
                      onClick={() => location && onLocationSelect(location)}
                    >
                      <Typography variant="caption" sx={{ color: 'white', fontWeight: 'bold' }}>
                        {lado}-{fila}
                      </Typography>
                    </Box>
                  </Tooltip>
                );
              })
            )}
          </Box>
        </Paper>
      </Box>
    );
  };

  const renderListView = () => {
    const { quadras, lados, filas, andares } = chamber.dimensions;
    
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
          gap: 2,
          maxHeight: 600,
          overflow: 'auto',
        }}
      >
        {Array.from({ length: quadras }, (_, quadraIndex) =>
          Array.from({ length: lados }, (_, ladoIndex) =>
            Array.from({ length: filas }, (_, filaIndex) =>
              Array.from({ length: andares }, (_, andarIndex) => {
                const quadra = quadraIndex + 1;
                const lado = ladoIndex + 1;
                const fila = filaIndex + 1;
                const andar = andarIndex + 1;
                const key = getLocationKey(quadra, lado, fila, andar);
                const location = locationMap.get(key);
                const status = getLocationStatus(location);
                const isSelected = selectedLocation?.id === location?.id;

                if (!location) return null;

                return (
                  <Card
                    key={key}
                    sx={{
                      cursor: 'pointer',
                      border: isSelected ? 2 : 1,
                      borderColor: isSelected ? 'primary.main' : 'divider',
                      transition: 'all 0.2s',
                      '&:hover': {
                        boxShadow: 2,
                        transform: 'translateY(-2px)',
                      },
                    }}
                    onClick={() => onLocationSelect(location)}
                  >
                    <CardContent sx={{ p: 2 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {location.code}
                        </Typography>
                        <Chip
                          size="small"
                          icon={status === 'occupied' ? <OccupiedIcon /> : <AvailableIcon />}
                          label={status === 'occupied' ? 'Ocupada' : 'Disponível'}
                          color={status === 'occupied' ? 'error' : 'success'}
                        />
                      </Box>
                      <Typography variant="caption" color="text.secondary">
                        Capacidade: {location.maxCapacityKg}kg
                      </Typography>
                      {location.isOccupied && (
                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Peso atual: {location.currentWeightKg}kg
                          </Typography>
                          <LinearProgress
                            variant="determinate"
                            value={(location.currentWeightKg / location.maxCapacityKg) * 100}
                            sx={{ mt: 1 }}
                          />
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )
          )
        )}
      </Box>
    );
  };

  if (loading) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body1" color="text.secondary">
          Carregando localizações...
        </Typography>
        <LinearProgress sx={{ mt: 2 }} />
      </Box>
    );
  }

  if (locations.length === 0) {
    return (
      <Alert severity="info">
        <Typography variant="body1">
          Nenhuma localização encontrada para esta câmara.
        </Typography>
        <Typography variant="body2" sx={{ mt: 1 }}>
          Use o botão "Gerar" na lista de câmaras para criar as localizações automaticamente.
        </Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Estatísticas */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Ocupação da Câmara
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Card sx={{ minWidth: 120 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="error.main">
                {stats.occupied}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Ocupadas
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 120 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="success.main">
                {stats.available}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Disponíveis
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 120 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="primary.main">
                {stats.total}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Total
              </Typography>
            </CardContent>
          </Card>
          <Card sx={{ minWidth: 150 }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Typography variant="h4" color="warning.main">
                {stats.occupancyRate.toFixed(1)}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Taxa de Ocupação
              </Typography>
            </CardContent>
          </Card>
        </Box>
        <LinearProgress
          variant="determinate"
          value={stats.occupancyRate}
          color={stats.occupancyRate > 90 ? 'error' : stats.occupancyRate > 70 ? 'warning' : 'primary'}
          sx={{ height: 8, borderRadius: 4 }}
        />
      </Box>

      {/* Legenda */}
      <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
        <Typography variant="subtitle2">Legenda:</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#4caf50', borderRadius: 1 }} />
          <Typography variant="caption">Disponível</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#f44336', borderRadius: 1 }} />
          <Typography variant="caption">Ocupada</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Box sx={{ width: 16, height: 16, backgroundColor: '#e0e0e0', borderRadius: 1 }} />
          <Typography variant="caption">Não gerada</Typography>
        </Box>
      </Box>

      {/* Conteúdo principal */}
      {viewMode === 'grid' ? renderGridView() : renderListView()}
    </Box>
  );
}; 