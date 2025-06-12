import React from 'react';
import {
  Box,
  Typography,
  Alert,
  Chip,
  Stack,
} from '@mui/material';
import {
  CheckCircle as AvailableIcon,
  Error as OccupiedIcon,
} from '@mui/icons-material';
import { LocationWithChamber } from '../../../../types';

interface LocationStatusIndicatorProps {
  selectedLocation: LocationWithChamber | null;
  allLocations: LocationWithChamber[];
  locationId?: string;
}

export const LocationStatusIndicator: React.FC<LocationStatusIndicatorProps> = ({
  selectedLocation,
  allLocations,
  locationId
}) => {
  // Se não há localização selecionada
  if (!selectedLocation && !locationId) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Nenhuma localização selecionada. Use a navegação abaixo para escolher uma localização.
        </Typography>
      </Alert>
    );
  }

  // Buscar informações da localização se só temos o ID
  const location = selectedLocation || allLocations.find(loc => loc.id === locationId);
  
  if (!location) {
    return (
      <Alert severity="warning" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Localização não encontrada. Por favor, selecione uma localização válida.
        </Typography>
      </Alert>
    );
  }

  // Determinar status da localização
  const isOccupied = location.isOccupied;
  const availableCapacity = location.maxCapacityKg - location.currentWeightKg;

  if (isOccupied) {
    return (
      <Box
        sx={{
          p: 2,
          mb: 2,
          border: '2px solid',
          borderColor: 'error.main',
          borderRadius: 1,
          backgroundColor: 'error.50',
          display: 'flex',
          alignItems: 'center',
          gap: 1.5
        }}
      >
        <OccupiedIcon color="error" />
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1" fontWeight={600} color="error.main">
            ❌ Localização Ocupada
          </Typography>
          <Typography variant="body2" color="error.dark" fontWeight={500}>
            {location.code} - {location.chamber.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Esta localização já contém um produto. Escolha outra localização disponível.
          </Typography>
        </Box>
        <Chip 
          label="OCUPADA" 
          color="error" 
          variant="filled" 
          size="small"
        />
      </Box>
    );
  }

  // Localização disponível
  return (
    <Box
      sx={{
        p: 2,
        mb: 2,
        border: '2px solid',
        borderColor: 'success.main',
        borderRadius: 1,
        backgroundColor: 'success.50',
        display: 'flex',
        alignItems: 'center',
        gap: 1.5
      }}
    >
      <AvailableIcon color="success" />
      <Box sx={{ flex: 1 }}>
        <Typography variant="body1" fontWeight={600} color="success.main">
          ✅ Localização Selecionada
        </Typography>
        <Typography variant="body2" color="success.dark" fontWeight={500}>
          {location.code} - {location.chamber.name}
        </Typography>
        <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            Capacidade disponível: {availableCapacity.toFixed(0)}kg
          </Typography>
          <Typography variant="caption" color="text.secondary">
            •
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Capacidade total: {location.maxCapacityKg}kg
          </Typography>
        </Stack>
      </Box>
      <Chip 
        label="DISPONÍVEL" 
        color="success" 
        variant="filled" 
        size="small"
      />
    </Box>
  );
}; 