import React, { useState } from 'react';
import {
  Grid,
  TextField,
  Typography,
  Card,
  CardContent,
  Autocomplete,
  Box,
  Alert,
  Tabs,
  Tab,
  Switch,
  FormControlLabel,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Info as InfoIcon,
  ViewInAr as ViewInArIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { Controller, UseFormReturn } from 'react-hook-form';
import { LocationWithChamber, Chamber } from '../../../../types';
import { CapacityInfo } from '../utils/productFormUtils';
import LocationMap3D from '../../../ui/LocationMap';

interface ProductFormLocationProps {
  form: UseFormReturn<any>;
  availableLocations: LocationWithChamber[];
  chambers: Chamber[];
  selectedLocation: LocationWithChamber | undefined;
  capacityInfo: CapacityInfo | null;
  onLocationSelect: (location: LocationWithChamber | null) => void;
  errors: any;
}

export const ProductFormLocation: React.FC<ProductFormLocationProps> = React.memo(({
  form,
  availableLocations,
  chambers,
  selectedLocation,
  capacityInfo,
  onLocationSelect,
  errors,
}) => {
  const { control } = form;
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');

  // Debug: Log dos dados recebidos
  console.log('🔍 ProductFormLocation Debug:', {
    availableLocations: availableLocations.length,
    chambers: chambers.length,
    selectedLocation: selectedLocation?.code,
    viewMode,
  });

  return (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h6">
              Seleção de Localização
            </Typography>
            
            {/* Toggle entre Mapa 3D e Lista */}
            <Tabs
              value={viewMode}
              onChange={(_, newValue) => setViewMode(newValue)}
              sx={{ minHeight: 'auto' }}
            >
              <Tab
                icon={<ViewInArIcon />}
                label="Mapa 3D"
                value="map"
                sx={{ minHeight: 40, py: 1 }}
              />
              <Tab
                icon={<ListIcon />}
                label="Lista"
                value="list"
                sx={{ minHeight: 40, py: 1 }}
              />
            </Tabs>
          </Box>

          {/* Mapa 3D ou Lista dependendo do modo selecionado */}
          {viewMode === 'map' ? (
            <Box>
              {chambers.length > 0 ? (
                <LocationMap3D
                  chambers={chambers}
                  availableLocations={availableLocations}
                  selectedLocation={selectedLocation}
                  onLocationSelect={(location) => onLocationSelect(location)}
                />
              ) : (
                <Alert severity="warning" icon={<InfoIcon />}>
                  <Typography variant="subtitle2">
                    Carregando Câmaras
                  </Typography>
                  <Typography variant="body2">
                    Por favor, aguarde enquanto carregamos as informações das câmaras...
                  </Typography>
                </Alert>
              )}
            </Box>
          ) : (
            <Grid container spacing={2}>
              <Grid size={{ xs: 12 }}>
                <Controller
                  name="locationId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      options={availableLocations}
                      getOptionLabel={(option) => {
                        const chamberName = option.chamber?.name || 'Câmara não encontrada';
                        return `${option.code} - ${chamberName}`;
                      }}
                      value={selectedLocation || null}
                      onChange={(_, newValue) => onLocationSelect(newValue)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Buscar Localização"
                          error={!!errors.locationId}
                          helperText={errors.locationId?.message || 'Digite para buscar ou selecione uma localização'}
                          InputProps={{
                            ...params.InputProps,
                            startAdornment: <LocationIcon color="action" sx={{ mr: 1 }} />,
                          }}
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props}>
                          <Box>
                            <Typography variant="body2" fontWeight="medium">
                              {option.code}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.chamber?.name || 'Câmara não encontrada'} - Cap: {option.maxCapacityKg}kg - Usado: {option.currentWeightKg}kg
                            </Typography>
                          </Box>
                        </Box>
                      )}
                      noOptionsText={
                        availableLocations.length === 0 
                          ? "Nenhuma localização disponível"
                          : "Nenhuma localização encontrada"
                      }
                    />
                  )}
                />
              </Grid>
              
              {/* Informações sobre localizações disponíveis */}
              <Grid size={{ xs: 12 }}>
                <Alert severity="info" icon={<InfoIcon />}>
                  <Typography variant="subtitle2">
                    Localizações Disponíveis
                  </Typography>
                  <Typography variant="body2">
                    {availableLocations.length} localizações disponíveis encontradas
                  </Typography>
                  {availableLocations.length === 0 && (
                    <Typography variant="body2" color="warning.main">
                      ⚠️ Se não há localizações, verifique se existem câmaras criadas e se há localizações geradas.
                    </Typography>
                  )}
                </Alert>
              </Grid>
            </Grid>
          )}
          
          {/* Informações de Capacidade */}
          {capacityInfo && (
            <Box sx={{ mt: 2 }}>
              <Alert 
                severity={capacityInfo.exceedsCapacity ? 'error' : 'info'}
                icon={<InfoIcon />}
              >
                <Typography variant="subtitle2">
                  Análise de Capacidade
                </Typography>
                <Typography variant="body2">
                  Ocupação atual: {capacityInfo.currentWeight}kg / {capacityInfo.maxCapacity}kg
                </Typography>
                <Typography variant="body2">
                  Após adicionar produto: {capacityInfo.newWeight.toFixed(2)}kg 
                  ({capacityInfo.percentage.toFixed(1)}%)
                </Typography>
                {capacityInfo.exceedsCapacity ? (
                  <Typography variant="body2" color="error">
                    ❌ Capacidade excedida! Escolha outra localização.
                  </Typography>
                ) : (
                  <Typography variant="body2" color="success.main">
                    ✅ Localização tem capacidade suficiente.
                  </Typography>
                )}
              </Alert>
            </Box>
          )}
        </CardContent>
      </Card>
    </Grid>
  );
});

ProductFormLocation.displayName = 'ProductFormLocation'; 