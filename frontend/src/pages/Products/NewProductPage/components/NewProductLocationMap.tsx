import React, { useState, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Chip,
  Alert,
  Paper,
  Stack
} from '@mui/material';
import {
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';

import { LocationMap3DAdvanced } from '../../../../components/ui/LocationMap3D/LocationMap3DAdvanced';
import { LocationTreeNavigation } from '../../../../components/ui/LocationTreeNavigation';
import { ViewToggle } from '../../../../components/ui/ViewToggle';
import { Chamber, LocationWithChamber } from '../../../../types';
import { ViewMode } from '../../../../components/ui/ViewToggle';

interface NewProductLocationMapProps {
  chambers: Chamber[];
  allLocations: LocationWithChamber[];
  availableLocations: LocationWithChamber[];
  selectedChamber: string | null;
  setSelectedChamber: (chamberId: string | null) => void;
  selectedFloor: number | null;
  setSelectedFloor: (floor: number | null) => void;
  onLocationSelect?: (location: LocationWithChamber | null) => void;
}

const LocationMapLegend: React.FC = () => (
  <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
    <Typography variant="body2" fontWeight={600} gutterBottom>
      Legenda
    </Typography>
    <Stack direction="row" spacing={2} flexWrap="wrap">
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'success.main',
            borderRadius: 1
          }}
        />
        <Typography variant="body2">Disponível</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'error.main',
            borderRadius: 1
          }}
        />
        <Typography variant="body2">Ocupada</Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 16,
            height: 16,
            backgroundColor: 'primary.main',
            borderRadius: 1
          }}
        />
        <Typography variant="body2">Selecionada</Typography>
      </Box>
    </Stack>
  </Paper>
);

const LocationSelectionInfo: React.FC<{
  selectedLocation: LocationWithChamber | null;
  totalWeight?: number;
}> = ({ selectedLocation, totalWeight = 0 }) => {
  if (!selectedLocation) {
    return (
      <Alert severity="info" sx={{ mt: 2 }}>
        <Typography variant="body2">
          Selecione uma localização no mapa para ver os detalhes
        </Typography>
      </Alert>
    );
  }

  const availableWeight = selectedLocation.maxCapacityKg - selectedLocation.currentWeightKg;
  const wouldExceed = totalWeight > availableWeight;

  return (
    <Paper elevation={1} sx={{ p: 2, mt: 2 }}>
      <Typography variant="body2" fontWeight={600} gutterBottom>
        Localização Selecionada
      </Typography>
      
      <Box sx={{ mt: 1 }}>
        <Typography variant="body2">
          <strong>Código:</strong> {selectedLocation.code}
        </Typography>
        <Typography variant="body2">
          <strong>Câmara:</strong> {selectedLocation.chamber.name}
        </Typography>
        <Typography variant="body2">
          <strong>Capacidade:</strong> {selectedLocation.currentWeightKg}kg / {selectedLocation.maxCapacityKg}kg
        </Typography>
        <Typography variant="body2">
          <strong>Disponível:</strong> {availableWeight}kg
        </Typography>
        
        {totalWeight > 0 && (
          <Box sx={{ mt: 1 }}>
            <Chip
              icon={wouldExceed ? <CancelIcon /> : <CheckCircleIcon />}
              label={wouldExceed ? 'Capacidade insuficiente' : 'Capacidade adequada'}
              color={wouldExceed ? 'error' : 'success'}
              size="small"
            />
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export const NewProductLocationMap: React.FC<NewProductLocationMapProps> = ({
  chambers,
  allLocations,
  availableLocations,
  selectedChamber,
  setSelectedChamber,
  selectedFloor,
  setSelectedFloor,
  onLocationSelect
}) => {
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('tree'); // Default para novo modo tree

  // Filtrar localizações por câmara selecionada (usado pelo 3D map)
  const filteredLocations = useMemo(() => {
    let filtered = allLocations;
    
    if (selectedChamber) {
      filtered = filtered.filter(location => location.chamber.id === selectedChamber);
    }
    
    if (selectedFloor !== null) {
      filtered = filtered.filter(location => location.coordinates.andar === selectedFloor);
    }
    
    return filtered;
  }, [allLocations, selectedChamber, selectedFloor]);

  // Obter câmara selecionada
  const selectedChamberData = useMemo(() => {
    return chambers.find(chamber => chamber.id === selectedChamber) || null;
  }, [chambers, selectedChamber]);

  // Gerar opções de andares para a câmara selecionada
  const floorOptions = useMemo(() => {
    if (!selectedChamberData) return [];
    
    const floors = [];
    for (let i = 1; i <= selectedChamberData.dimensions.andares; i++) {
      floors.push(i);
    }
    return floors;
  }, [selectedChamberData]);

  // Localização selecionada
  const selectedLocation = useMemo(() => {
    return allLocations.find(loc => loc.id === selectedLocationId) || null;
  }, [allLocations, selectedLocationId]);

  // Handler para seleção de localização (unificado para ambos os modos)
  const handleLocationClick = useCallback((location: LocationWithChamber) => {
    // Só permite selecionar localizações disponíveis
    if (location.isOccupied) return;
    
    setSelectedLocationId(location.id);
    
    // Notificar o formulário
    if (onLocationSelect) {
      onLocationSelect(location);
    }
  }, [onLocationSelect]);

  // Handler para seleção no tree navigation (converte de locationId para objeto)
  const handleTreeLocationSelect = useCallback((locationId: string) => {
    const location = allLocations.find(loc => loc.id === locationId);
    if (location && !location.isOccupied) {
      handleLocationClick(location);
    }
  }, [allLocations, handleLocationClick]);

  const handleChamberChange = (chamberId: string) => {
    setSelectedChamber(chamberId || null);
    setSelectedFloor(null); // Reset floor quando trocar câmara
    setSelectedLocationId(null); // Reset seleção
    if (onLocationSelect) {
      onLocationSelect(null);
    }
  };

  return (
    <Box>
      {/* Header com ViewToggle */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" component="h3">
          Selecionar Localização
        </Typography>
        <ViewToggle 
          currentView={viewMode} 
          onViewChange={setViewMode}
        />
      </Box>

      {/* Controles de Filtro - Apenas para modo 3D */}
      {viewMode === 'list' && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
          <FormControl fullWidth size="small">
            <InputLabel>Câmara</InputLabel>
            <Select
              value={selectedChamber || ''}
              label="Câmara"
              onChange={(e) => handleChamberChange(e.target.value as string)}
            >
              <MenuItem value="">Todas as câmaras</MenuItem>
              {chambers.map((chamber) => (
                <MenuItem key={chamber.id} value={chamber.id}>
                  {chamber.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl fullWidth size="small" disabled={!selectedChamber}>
            <InputLabel>Andar</InputLabel>
            <Select
              value={selectedFloor || ''}
              label="Andar"
              onChange={(e) => setSelectedFloor(e.target.value ? Number(e.target.value) : null)}
            >
              <MenuItem value="">Todos os andares</MenuItem>
              {floorOptions.map((floor) => (
                <MenuItem key={floor} value={floor}>
                  Andar {floor}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Legenda - Apenas para modo 3D */}
      {viewMode === 'list' && <LocationMapLegend />}

      {/* Stats rápidas - Apenas para modo 3D */}
      {viewMode === 'list' && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center', flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
            <Typography variant="h6" color="text.primary">
              {filteredLocations.length}
            </Typography>
          </Paper>
          <Paper elevation={1} sx={{ p: 1, textAlign: 'center', flex: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Disponíveis
            </Typography>
            <Typography variant="h6" color="success.main">
              {filteredLocations.filter(loc => !loc.isOccupied).length}
            </Typography>
          </Paper>
        </Box>
      )}

      {/* Conteúdo baseado no modo de visualização */}
      {viewMode === 'tree' ? (
        // Modo Tree Navigation
        <LocationTreeNavigation
          onLocationSelect={handleTreeLocationSelect}
          selectedLocationId={selectedLocationId || undefined}
          showStats={true}
          allowModeToggle={false}
          sx={{ 
            minHeight: 400,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1
          }}
        />
      ) : (
        // Modo 3D Map (modo original)
        <Box sx={{ 
          minHeight: 400, 
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          overflow: 'hidden'
        }}>
          <LocationMap3DAdvanced
            allLocations={filteredLocations}
            chambers={chambers}
            onLocationSelect={handleLocationClick}
            availableOnly={false}
            height={400}
          />
        </Box>
      )}

      {/* Informações da seleção - Para ambos os modos */}
      <LocationSelectionInfo 
        selectedLocation={selectedLocation}
      />
    </Box>
  );
}; 