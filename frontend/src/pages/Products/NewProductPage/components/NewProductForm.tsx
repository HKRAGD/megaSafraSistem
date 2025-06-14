import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Chip
} from '@mui/material';
import {
  Info as InfoIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Save as SaveIcon,
  Cancel as CancelIcon
} from '@mui/icons-material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';

import { FormSection } from './FormSection';
import { LocationStatusIndicator } from './LocationStatusIndicator';
import { LocationTreeNavigation } from '../../../../components/ui/LocationTreeNavigation';
import { SeedType, Chamber, LocationWithChamber, CreateProductFormData } from '../../../../types';
import { sanitizeChipProps } from '../../../../utils/chipUtils';

interface NewProductFormProps {
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations: LocationWithChamber[];
  handleSubmit: (data: CreateProductFormData) => Promise<void>;
  handleCancel: () => void;
  onLocationSelect?: (location: LocationWithChamber | null) => void;
}

// Esquema de validação
const productSchema = yup.object({
  name: yup.string().required('Nome é obrigatório').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  lot: yup.string().required('Lote é obrigatório'),
  seedTypeId: yup.string().required('Tipo de semente é obrigatório'),
  quantity: yup.number().required('Quantidade é obrigatória').min(1, 'Quantidade deve ser pelo menos 1'),
  storageType: yup.string().required('Tipo de armazenamento é obrigatório'),
  weightPerUnit: yup.number().required('Peso por unidade é obrigatório').min(0.001, 'Peso deve ser positivo'),
  locationId: yup.string().required('Localização é obrigatória'),
  expirationDate: yup.date().nullable(),
  notes: yup.string().optional(),
});

export const NewProductForm: React.FC<NewProductFormProps> = ({
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  handleSubmit,
  handleCancel,
  onLocationSelect
}) => {
  const form = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      name: '',
      lot: '',
      seedTypeId: '',
      quantity: 1,
      storageType: 'saco',
      weightPerUnit: 50,
      locationId: '',
      expirationDate: null,
      notes: '',
    },
  });

  // Watch para cálculos
  const quantity = form.watch('quantity');
  const weightPerUnit = form.watch('weightPerUnit');
  const locationId = form.watch('locationId');

  // Cálculo do peso total
  const totalWeight = React.useMemo(() => {
    return (quantity || 0) * (weightPerUnit || 0);
  }, [quantity, weightPerUnit]);

  // Localização selecionada
  const selectedLocation = React.useMemo(() => {
    return allLocations.find(loc => loc.id === locationId) || null;
  }, [allLocations, locationId]);

  // Informações de capacidade
  const capacityInfo = React.useMemo(() => {
    if (!selectedLocation || !totalWeight) return null;

    const newWeight = selectedLocation.currentWeightKg + totalWeight;
    const exceedsCapacity = newWeight > selectedLocation.maxCapacityKg;
    const usageAfterStorage = (newWeight / selectedLocation.maxCapacityKg) * 100;

    return {
      exceedsCapacity,
      usageAfterStorage,
      newWeight,
      maxCapacity: selectedLocation.maxCapacityKg
    };
  }, [selectedLocation, totalWeight]);

  // Handler para seleção via LocationTreeNavigation
  const handleLocationSelectFromTree = React.useCallback((locationId: string) => {
    // Garantir que apenas o ObjectId seja usado
    const cleanLocationId = locationId.includes('-') ? locationId.split('-')[0] : locationId;
    
    // Encontrar a localização usando o ID limpo ou o ID original
    const location = allLocations.find(loc => 
      loc.id === cleanLocationId || loc.id === locationId
    );
    
    // Sempre permitir a seleção para mostrar feedback visual
    form.setValue('locationId', cleanLocationId);
    
    if (location && onLocationSelect) {
      onLocationSelect(location);
    }
  }, [form, allLocations, onLocationSelect]);

  // Notificar mudança de localização
  React.useEffect(() => {
    if (onLocationSelect && selectedLocation) {
      onLocationSelect(selectedLocation);
    }
  }, [selectedLocation, onLocationSelect]);

  const onSubmit = async (data: any) => {
    try {
      const formattedData: CreateProductFormData = {
        ...data,
        totalWeight,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      };
      await handleSubmit(formattedData);
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        
        {/* Seção: Informações Básicas */}
        <FormSection 
          title="Informações Básicas" 
          icon={<InfoIcon />}
          elevation={0}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <TextField
              {...form.register('name')}
              label="Nome do Produto"
              fullWidth
              error={!!form.formState.errors.name}
              helperText={form.formState.errors.name?.message}
              placeholder="Ex: Soja Premium Lote 2024-001"
            />
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                {...form.register('lot')}
                label="Lote"
                fullWidth
                error={!!form.formState.errors.lot}
                helperText={form.formState.errors.lot?.message}
                placeholder="Ex: 2024-001"
              />
              
              <TextField
                {...form.register('seedTypeId')}
                label="Tipo de Semente"
                select
                fullWidth
                error={!!form.formState.errors.seedTypeId}
                helperText={form.formState.errors.seedTypeId?.message}
              >
                <MenuItem value="">Selecione o tipo</MenuItem>
                {seedTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Box>
          </Box>
        </FormSection>

        {/* Seção: Quantidade e Armazenamento */}
        <FormSection 
          title="Armazenamento" 
          icon={<InventoryIcon />}
          elevation={0}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                {...form.register('quantity', { valueAsNumber: true })}
                label="Quantidade"
                type="number"
                fullWidth
                error={!!form.formState.errors.quantity}
                helperText={form.formState.errors.quantity?.message}
                inputProps={{ min: 1 }}
              />
              
              <TextField
                {...form.register('storageType')}
                label="Tipo de Armazenamento"
                select
                fullWidth
                error={!!form.formState.errors.storageType}
                helperText={form.formState.errors.storageType?.message}
              >
                <MenuItem value="saco">Saco</MenuItem>
                <MenuItem value="bag">Big Bag</MenuItem>
              </TextField>
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' }, alignItems: 'center' }}>
              <TextField
                {...form.register('weightPerUnit', { valueAsNumber: true })}
                label="Peso por Unidade (kg)"
                type="number"
                fullWidth
                error={!!form.formState.errors.weightPerUnit}
                helperText={form.formState.errors.weightPerUnit?.message}
                inputProps={{ min: 0.001, step: 0.001 }}
              />
              
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Peso Total Calculado
                </Typography>
                <Chip 
                  {...sanitizeChipProps({
                    label: `${totalWeight.toFixed(3)} kg`,
                    color: "primary",
                    variant: "outlined",
                    size: "medium"
                  })}
                />
              </Box>
            </Box>
            
            <TextField
              {...form.register('expirationDate')}
              label="Data de Validade (Opcional)"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              error={!!form.formState.errors.expirationDate}
              helperText={form.formState.errors.expirationDate?.message}
            />
          </Box>
        </FormSection>

        {/* Seção: Localização - Substituída por LocationTreeNavigation */}
        <FormSection 
          title="Localização" 
          icon={<LocationIcon />}
          elevation={0}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Indicador de Status da Localização */}
            <LocationStatusIndicator
              selectedLocation={selectedLocation}
              allLocations={allLocations}
              locationId={locationId}
            />

            {/* Erro de validação */}
            {form.formState.errors.locationId && (
              <Alert severity="error">
                {form.formState.errors.locationId.message}
              </Alert>
            )}

            {/* LocationTreeNavigation integrado */}
            <Box sx={{ 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              minHeight: 400,
              backgroundColor: 'background.paper'
            }}>
              <LocationTreeNavigation
                onLocationSelect={handleLocationSelectFromTree}
                selectedLocationId={locationId || undefined}
                showStats={true}
                allowModeToggle={true}
                hideViewToggle={false}
                filters={{
                  status: 'all' // Mostrar todas as localizações para feedback visual
                }}
              />
            </Box>
            
            {/* Feedback da Capacidade */}
            {capacityInfo && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Informações de Capacidade
                </Typography>
                
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2">
                    Capacidade após armazenamento: {capacityInfo.usageAfterStorage.toFixed(1)}%
                  </Typography>
                  <LinearProgress 
                    variant="determinate" 
                    value={capacityInfo.usageAfterStorage}
                    color={capacityInfo.usageAfterStorage > 90 ? 'warning' : 'primary'}
                    sx={{ mt: 0.5 }}
                  />
                </Box>
                
                {capacityInfo.exceedsCapacity && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    O peso total excede a capacidade da localização!
                  </Alert>
                )}
                
                {capacityInfo.usageAfterStorage > 90 && !capacityInfo.exceedsCapacity && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    A localização ficará quase cheia após o armazenamento.
                  </Alert>
                )}
              </Box>
            )}
            
            <TextField
              {...form.register('notes')}
              label="Observações (Opcional)"
              multiline
              rows={3}
              fullWidth
              error={!!form.formState.errors.notes}
              helperText={form.formState.errors.notes?.message}
              placeholder="Informações adicionais sobre o produto..."
            />
          </Box>
        </FormSection>

        {/* Botões de Ação */}
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          justifyContent: 'flex-end',
          pt: 2,
          borderTop: '1px solid',
          borderColor: 'divider'
        }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            disabled={form.formState.isSubmitting}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={
              form.formState.isSubmitting || 
              (capacityInfo?.exceedsCapacity ?? false) ||
              (selectedLocation?.isOccupied ?? false)
            }
            sx={{ minWidth: 140 }}
          >
            {form.formState.isSubmitting ? 'Cadastrando...' : 'Cadastrar Produto'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}; 