import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  LinearProgress,
  Chip,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { getCapacityColor } from '../utils/productDetailsUtils';

interface ProductDetailsLocationProps {
  locationInfo: {
    code: string | null;
    chamber: string;
    capacity: string;
    currentWeight: string;
    capacityPercentage: number;
    isNearCapacity: boolean;
    isAtCapacity: boolean;
  } | null;
}

export const ProductDetailsLocation: React.FC<ProductDetailsLocationProps> = React.memo(({
  locationInfo,
}) => {
  if (!locationInfo) return null;

  const progressColor = getCapacityColor(locationInfo.capacityPercentage);

  return (
    <Grid item xs={12} md={6}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <LocationIcon color="primary" sx={{ mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Localização
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Coordenadas
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {locationInfo.code}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Câmara
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {locationInfo.chamber}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Capacidade da Localização
                  </Typography>
                  
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Typography variant="body2">
                      {locationInfo.currentWeight} / {locationInfo.capacity}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      ({locationInfo.capacityPercentage.toFixed(1)}%)
                    </Typography>
                    {(locationInfo.isNearCapacity || locationInfo.isAtCapacity) && (
                      <WarningIcon 
                        color={locationInfo.isAtCapacity ? 'error' : 'warning'} 
                        fontSize="small" 
                      />
                    )}
                  </Box>
                  
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(locationInfo.capacityPercentage, 100)}
                    color={progressColor}
                    sx={{ height: 8, borderRadius: 4 }}
                  />
                  
                  {locationInfo.isAtCapacity && (
                    <Chip
                      label="Capacidade máxima atingida"
                      color="error"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                  
                  {locationInfo.isNearCapacity && !locationInfo.isAtCapacity && (
                    <Chip
                      label="Próximo da capacidade máxima"
                      color="warning"
                      size="small"
                      sx={{ mt: 1 }}
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}); 