import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Divider,
  Box,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Thermostat as ThermostatIcon,
  Opacity as HumidityIcon,
  Warning as AlertIcon,
  Sensors as SensorsIcon,
} from '@mui/icons-material';
import { Controller, UseFormReturn, FieldErrors } from 'react-hook-form';
import { ChamberFormData } from './chamberFormValidation';

interface ChamberFormEnvironmentProps {
  form: UseFormReturn<ChamberFormData>;
  errors: FieldErrors<ChamberFormData>;
}

export const ChamberFormEnvironment: React.FC<ChamberFormEnvironmentProps> = React.memo(({
  form,
  errors,
}) => {
  const { control, watch } = form;

  const settings = watch('settings');
  const targetTemp = settings?.targetTemperature || 18;
  const targetHumidity = settings?.targetHumidity || 60;
  const currentTemp = watch('currentTemperature');
  const currentHumidity = watch('currentHumidity');

  return (
    <>
      {/* Condições Atuais da Câmara */}
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <SensorsIcon />
          <Typography variant="h6">
            Condições Atuais
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Registre as condições ambientais atuais da câmara (leituras dos sensores)
        </Typography>
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}
      >
        <Controller
          name="currentTemperature"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Temperatura Atual"
              type="number"
              fullWidth
              error={!!errors.currentTemperature}
              helperText={errors.currentTemperature?.message || 'Temperatura atual lida pelos sensores (opcional)'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ThermostatIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">°C</InputAdornment>,
              }}
              inputProps={{ min: -50, max: 50, step: 0.1 }}
            />
          )}
        />
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}
      >
        <Controller
          name="currentHumidity"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              value={field.value ?? ''}
              label="Umidade Atual"
              type="number"
              fullWidth
              error={!!errors.currentHumidity}
              helperText={errors.currentHumidity?.message || 'Umidade relativa atual (opcional)'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HumidityIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
            />
          )}
        />
      </Grid>

      {/* Configurações de Ambiente */}
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <ThermostatIcon />
          <Typography variant="h6">
            Configurações Ambientais
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Defina as condições ideais de temperatura e umidade para a câmara
        </Typography>
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}
      >
        <Controller
          name="settings.targetTemperature"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Temperatura Alvo"
              type="number"
              fullWidth
              error={!!errors.settings?.targetTemperature}
              helperText={errors.settings?.targetTemperature?.message || 'Temperatura ideal para armazenamento'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <ThermostatIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">°C</InputAdornment>,
              }}
              inputProps={{ min: -50, max: 50, step: 0.1 }}
            />
          )}
        />
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6
        }}
      >
        <Controller
          name="settings.targetHumidity"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Umidade Alvo"
              type="number"
              fullWidth
              error={!!errors.settings?.targetHumidity}
              helperText={errors.settings?.targetHumidity?.message || 'Umidade relativa ideal'}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <HumidityIcon />
                  </InputAdornment>
                ),
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
            />
          )}
        />
      </Grid>

      {/* Configurações de Alertas */}
      <Grid size={12}>
        <Divider sx={{ my: 2 }} />
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <AlertIcon />
          <Typography variant="h6">
            Alertas e Monitoramento
          </Typography>
        </Box>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Configure os limites que disparam alertas automáticos
        </Typography>
      </Grid>

      <Grid size={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          <Typography variant="subtitle2" gutterBottom>
            Valores configurados:
          </Typography>
          <Typography variant="body2">
            • Temperatura Atual: {currentTemp ?? 'Não informada'} | Alvo: {targetTemp}°C
          </Typography>
          <Typography variant="body2">
            • Umidade Atual: {currentHumidity ?? 'Não informada'} | Alvo: {targetHumidity}%
          </Typography>
        </Alert>
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3
        }}
      >
        <Controller
          name="settings.alertThresholds.temperatureMin"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Temp. Mínima"
              type="number"
              fullWidth
              error={!!errors.settings?.alertThresholds?.temperatureMin}
              helperText={errors.settings?.alertThresholds?.temperatureMin?.message || 'Limite inferior'}
              InputProps={{
                endAdornment: <InputAdornment position="end">°C</InputAdornment>,
              }}
              inputProps={{ min: -50, max: 50, step: 0.1 }}
            />
          )}
        />
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3
        }}
      >
        <Controller
          name="settings.alertThresholds.temperatureMax"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Temp. Máxima"
              type="number"
              fullWidth
              error={!!errors.settings?.alertThresholds?.temperatureMax}
              helperText={errors.settings?.alertThresholds?.temperatureMax?.message || 'Limite superior'}
              InputProps={{
                endAdornment: <InputAdornment position="end">°C</InputAdornment>,
              }}
              inputProps={{ min: -50, max: 50, step: 0.1 }}
            />
          )}
        />
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3
        }}
      >
        <Controller
          name="settings.alertThresholds.humidityMin"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Umidade Mínima"
              type="number"
              fullWidth
              error={!!errors.settings?.alertThresholds?.humidityMin}
              helperText={errors.settings?.alertThresholds?.humidityMin?.message || 'Limite inferior'}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
            />
          )}
        />
      </Grid>

      <Grid
        size={{
          xs: 12,
          sm: 6,
          md: 3
        }}
      >
        <Controller
          name="settings.alertThresholds.humidityMax"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Umidade Máxima"
              type="number"
              fullWidth
              error={!!errors.settings?.alertThresholds?.humidityMax}
              helperText={errors.settings?.alertThresholds?.humidityMax?.message || 'Limite superior'}
              InputProps={{
                endAdornment: <InputAdornment position="end">%</InputAdornment>,
              }}
              inputProps={{ min: 0, max: 100, step: 1 }}
            />
          )}
        />
      </Grid>
    </>
  );
}); 