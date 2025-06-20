import React, { useMemo } from 'react';
import {
  Grid,
  TextField,
  Typography,
  Divider,
  Alert,
  Box,
  Chip,
} from '@mui/material';
import {
  Grid3x3 as DimensionsIcon,
  Calculate as CalculateIcon,
} from '@mui/icons-material';
import { Controller, UseFormReturn, FieldErrors } from 'react-hook-form';
import { ChamberFormData } from './chamberFormValidation';

interface ChamberFormDimensionsProps {
  form: UseFormReturn<ChamberFormData>;
  errors: FieldErrors<ChamberFormData>;
}

export const ChamberFormDimensions: React.FC<ChamberFormDimensionsProps> = React.memo(({
  form,
  errors,
}) => {
  const { control, watch } = form;
  
  const watchedDimensions = watch('dimensions');
  
  const totalLocations = useMemo(() => {
    return (
      (watchedDimensions?.quadras || 0) * 
      (watchedDimensions?.lados || 0) * 
      (watchedDimensions?.filas || 0) * 
      (watchedDimensions?.andares || 0)
    );
  }, [watchedDimensions]);

  const getLocationEstimate = () => {
    if (totalLocations === 0) return 'Preencha as dimensões para calcular';
    if (totalLocations > 10000) return 'Muitas localizações! Considere reduzir as dimensões.';
    if (totalLocations > 1000) return `${totalLocations} localizações (câmara muito grande)`;
    return `${totalLocations} localizações`;
  };

  const getEstimateColor = () => {
    if (totalLocations === 0) return 'info';
    if (totalLocations > 10000) return 'error';
    if (totalLocations > 1000) return 'warning';
    return 'success';
  };

  return (
    <>
      <Grid item xs={12}>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <DimensionsIcon />
          <Typography variant="h6">
            Dimensões da Câmara
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Defina a estrutura hierárquica da câmara: Quadra → Lado → Fila → Andar
        </Typography>
      </Grid>

      <Grid
        item xs={12} sm={6} md={3}
      >
        <Controller
          name="dimensions.quadras"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Quadras"
              type="number"
              fullWidth
              error={!!errors.dimensions?.quadras}
              helperText={errors.dimensions?.quadras?.message || 'Seções principais'}
              required
              inputProps={{ min: 1, max: 100 }}
            />
          )}
        />
      </Grid>

      <Grid
        item xs={12} sm={6} md={3}
      >
        <Controller
          name="dimensions.lados"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Lados"
              type="number"
              fullWidth
              error={!!errors.dimensions?.lados}
              helperText={errors.dimensions?.lados?.message || 'Lados por quadra'}
              required
              inputProps={{ min: 1, max: 100 }}
            />
          )}
        />
      </Grid>

      <Grid
        item xs={12} sm={6} md={3}
      >
        <Controller
          name="dimensions.filas"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Filas"
              type="number"
              fullWidth
              error={!!errors.dimensions?.filas}
              helperText={errors.dimensions?.filas?.message || 'Filas por lado'}
              required
              inputProps={{ min: 1, max: 100 }}
            />
          )}
        />
      </Grid>

      <Grid
        item xs={12} sm={6} md={3}
      >
        <Controller
          name="dimensions.andares"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Andares"
              type="number"
              fullWidth
              error={!!errors.dimensions?.andares}
              helperText={errors.dimensions?.andares?.message || 'Andares por fila'}
              required
              inputProps={{ min: 1, max: 20 }}
            />
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Alert 
          severity={getEstimateColor()} 
          sx={{ mt: 2 }}
          icon={<CalculateIcon />}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
            <Typography>
              <strong>Total de localizações:</strong> {getLocationEstimate()}
            </Typography>
            {totalLocations > 0 && (
              <Chip 
                label={`${watchedDimensions?.quadras || 0} × ${watchedDimensions?.lados || 0} × ${watchedDimensions?.filas || 0} × ${watchedDimensions?.andares || 0}`}
                size="small"
                variant="outlined"
              />
            )}
          </Box>
          {totalLocations > 500 && (
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              💡 Dica: Câmaras muito grandes podem impactar a performance. Considere dividir em câmaras menores.
            </Typography>
          )}
        </Alert>
      </Grid>
    </>
  );
}); 