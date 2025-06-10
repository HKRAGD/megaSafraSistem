import React, { useMemo, useState } from 'react';
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
} from '@mui/material';
import {
  Layers as LayersIcon,
  ViewInAr as ViewInArIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { Chamber, LocationWithChamber } from '../../../types';
import { numeroParaLetra, letraParaNumero } from '../../../utils/locationUtils';

interface LocationMap3DProps {
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[]; // Para mostrar o grid completo
  selectedLocation?: LocationWithChamber | null;
  onLocationSelect: (location: LocationWithChamber) => void;
}

interface LocationCube {
  location: LocationWithChamber;
  isAvailable: boolean;
  isSelected: boolean;
  coordinates: {
    quadra: number;
    lado: string | number;
    fila: number;
    andar: number;
  };
}

export const LocationMap3D: React.FC<LocationMap3DProps> = ({
  chambers,
  availableLocations,
  allLocations,
  selectedLocation,
  onLocationSelect,
}) => {
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(
    chambers.length > 0 ? chambers[0] : null
  );
  const [selectedAndar, setSelectedAndar] = useState<number>(1);

  // Filtrar localizações da câmara selecionada
  const chamberLocations = useMemo(() => {
    if (!selectedChamber) return [];
    
    // Use allLocations se disponível (mostra ocupadas e disponíveis), senão use availableLocations
    const locationsToUse = allLocations || availableLocations;
    
    return locationsToUse.filter(
      loc => loc.chamberId === selectedChamber.id
    );
  }, [allLocations, availableLocations, selectedChamber]);

  // Criar grid 3D de localizações
  const locationGrid = useMemo(() => {
    if (!selectedChamber) return [];

    const { quadras, lados, filas } = selectedChamber.dimensions;
    const grid: LocationCube[][][] = [];

    // Inicializar grid vazio
    for (let q = 1; q <= quadras; q++) {
      grid[q] = [];
      for (let l = 1; l <= lados; l++) {
        grid[q][l] = [];
        for (let f = 1; f <= filas; f++) {
          // Buscar localização correspondente
          const location = chamberLocations.find(loc => {
            const locLado = typeof loc.coordinates.lado === 'string' 
              ? letraParaNumero(loc.coordinates.lado)
              : loc.coordinates.lado;
            
            return loc.coordinates.quadra === q &&
              locLado === l &&
              loc.coordinates.fila === f &&
              loc.coordinates.andar === selectedAndar;
          });

          if (location) {
            // Para localizações ocupadas, só permita seleção se estiver na lista de disponíveis
            const isActuallyAvailable = !location.isOccupied && 
              availableLocations.some(avail => avail.id === location.id);
            
            grid[q][l][f] = {
              location,
              isAvailable: isActuallyAvailable,
              isSelected: selectedLocation?.id === location.id,
              coordinates: location.coordinates,
            };
          }
        }
      }
    }

    return grid;
  }, [selectedChamber, chamberLocations, selectedAndar, selectedLocation]);

  // Estatísticas do andar atual
  const floorStats = useMemo(() => {
    if (!selectedChamber) return { total: 0, available: 0, occupied: 0 };

    const { quadras, lados, filas } = selectedChamber.dimensions;
    const total = quadras * lados * filas;
    
    const floorLocations = chamberLocations.filter(
      loc => loc.coordinates.andar === selectedAndar
    );
    
    const available = floorLocations.filter(loc => !loc.isOccupied).length;
    const occupied = floorLocations.filter(loc => loc.isOccupied).length;

    return { total, available, occupied };
  }, [selectedChamber, chamberLocations, selectedAndar]);

  const handleLocationClick = (locationCube: LocationCube) => {
    if (locationCube.isAvailable) {
      onLocationSelect(locationCube.location);
    }
  };

  if (!selectedChamber) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Mapa 3D das Localizações
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Nenhuma câmara disponível para visualização.
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <ViewInArIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Mapa 3D das Localizações
            </Typography>
          </Box>

          {/* Seleção de Câmara */}
          <Grid container spacing={2} sx={{ mb: 2 }}>
            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Câmara</InputLabel>
                <Select
                  value={selectedChamber.id}
                  onChange={(e) => {
                    const chamber = chambers.find(c => c.id === e.target.value);
                    setSelectedChamber(chamber || null);
                    setSelectedAndar(1);
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

            <Grid size={{ xs: 12, md: 6 }}>
              <FormControl fullWidth>
                <InputLabel>Andar</InputLabel>
                <Select
                  value={selectedAndar}
                  onChange={(e) => setSelectedAndar(Number(e.target.value))}
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
          </Grid>

          {/* Estatísticas do Andar */}
          <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
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
          </Box>
        </Box>

        {/* Grid Visual das Localizações */}
        <Paper sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            {selectedChamber.name} - Andar {selectedAndar}
          </Typography>
          
          <Box sx={{ 
            display: 'grid',
            gridTemplateColumns: `repeat(${selectedChamber.dimensions.filas}, 1fr)`,
            gap: 1,
            maxWidth: '100%',
            overflow: 'auto'
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
                          width: 40,
                          height: 40,
                          border: '1px dashed #ccc',
                          borderRadius: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '10px',
                          color: 'text.disabled',
                        }}
                      >
                        --
                      </Box>
                    );
                  }

                  const { location, isAvailable, isSelected } = locationCube;
                  
                  return (
                    <Tooltip
                      key={location.id}
                      title={
                        <Box>
                          <Typography variant="subtitle2">
                            {location.code}
                          </Typography>
                          <Typography variant="caption">
                            Capacidade: {location.currentWeightKg}kg / {location.maxCapacityKg}kg
                          </Typography>
                          <Typography variant="caption" display="block">
                            Status: {isAvailable ? 'Disponível' : 'Ocupada'}
                          </Typography>
                        </Box>
                      }
                    >
                      <Box
                        sx={{
                          width: 40,
                          height: 40,
                          borderRadius: 1,
                          border: isSelected ? '2px solid' : '1px solid',
                          borderColor: isSelected 
                            ? 'primary.main' 
                            : isAvailable 
                              ? 'success.main' 
                              : 'error.main',
                          bgcolor: isSelected
                            ? 'primary.light'
                            : isAvailable
                              ? 'success.light'
                              : 'error.light',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: isAvailable ? 'pointer' : 'not-allowed',
                          fontSize: '8px',
                          fontWeight: 'bold',
                          color: isSelected
                            ? 'primary.contrastText'
                            : isAvailable
                              ? 'success.contrastText'
                              : 'error.contrastText',
                          transition: 'all 0.2s',
                          '&:hover': isAvailable ? {
                            transform: 'scale(1.1)',
                            boxShadow: 2,
                          } : {},
                        }}
                        onClick={() => handleLocationClick(locationCube)}
                      >
                        Q{quadra}
                        <br />
                        L{lado}F{fila}
                      </Box>
                    </Tooltip>
                  );
                })
              ).flat()
            ).flat()}
          </Box>

          {/* Legenda */}
          <Box sx={{ mt: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: 'success.light',
                  border: '1px solid',
                  borderColor: 'success.main',
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption">Disponível</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: 'error.light',
                  border: '1px solid',
                  borderColor: 'error.main',
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption">Ocupada</Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box
                sx={{
                  width: 16,
                  height: 16,
                  bgcolor: 'primary.light',
                  border: '2px solid',
                  borderColor: 'primary.main',
                  borderRadius: 0.5,
                }}
              />
              <Typography variant="caption">Selecionada</Typography>
            </Box>
          </Box>
        </Paper>

        {/* Informações da Localização Selecionada */}
        {selectedLocation && (
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Localização Selecionada
            </Typography>
                         <Paper sx={{ p: 2, bgcolor: 'primary.50' }}>
               <Grid container spacing={2}>
                 <Grid size={{ xs: 6 }}>
                   <Typography variant="caption" display="block">
                     Código
                   </Typography>
                   <Typography variant="body2" fontWeight="medium">
                     {selectedLocation.code}
                   </Typography>
                 </Grid>
                 <Grid size={{ xs: 6 }}>
                   <Typography variant="caption" display="block">
                     Capacidade
                   </Typography>
                   <Typography variant="body2">
                     {selectedLocation.currentWeightKg}kg / {selectedLocation.maxCapacityKg}kg
                   </Typography>
                 </Grid>
               </Grid>
            </Paper>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default LocationMap3D; 