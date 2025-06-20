import React from 'react';
import {
  Box,
  TextField,
  MenuItem,
  Button,
  Typography,
  Alert,
  LinearProgress,
  Chip,
  CircularProgress,
  FormHelperText
} from '@mui/material';
import {
  Info as InfoIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon
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
import { LoadingState } from '../../../../components/common/LoadingState';
import { useToast } from '../../../../contexts/ToastContext';
import { SeedType, Chamber, LocationWithChamber, CreateProductFormData } from '../../../../types';
import { sanitizeChipProps } from '../../../../utils/chipUtils';
import { ClientSelector } from '../../../../components/ui/ClientSelector';

interface NewProductFormProps {
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations: LocationWithChamber[];
  isLoading: boolean;
  formLoading: boolean;
  handleSubmit: (data: CreateProductFormData) => Promise<void>;
  handleCancel: () => void;
  onLocationSelect?: (location: LocationWithChamber | null) => void;
}

// Esquema de validação aprimorado
const productSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .matches(/^[a-zA-Z0-9\s\-_.]+$/, 'Nome contém caracteres inválidos'),
  
  lot: yup
    .string()
    .required('Lote é obrigatório')
    .min(1, 'Lote deve ter pelo menos 1 caractere')
    .max(50, 'Lote deve ter no máximo 50 caracteres'),
  
  seedTypeId: yup
    .string()
    .required('Tipo de semente é obrigatório'),
  
  quantity: yup
    .number()
    .required('Quantidade é obrigatória')
    .min(1, 'Quantidade deve ser pelo menos 1')
    .max(10000, 'Quantidade máxima é 10.000 unidades')
    .integer('Quantidade deve ser um número inteiro'),
  
  storageType: yup
    .string()
    .required('Tipo de armazenamento é obrigatório')
    .oneOf(['saco', 'bag'], 'Tipo de armazenamento inválido'),
  
  weightPerUnit: yup
    .number()
    .required('Peso por unidade é obrigatório')
    .min(0.001, 'Peso deve ser positivo')
    .max(1000, 'Peso máximo por unidade é 1.000kg'),
  
  locationId: yup.string().optional(),
  
  clientId: yup.string().optional(),
  
  expirationDate: yup
    .date()
    .nullable()
    .optional()
    .min(new Date(), 'Data de validade deve ser futura'),
  
  notes: yup
    .string()
    .optional()
    .max(500, 'Observações devem ter no máximo 500 caracteres'),
});

export const NewProductForm: React.FC<NewProductFormProps> = ({
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  isLoading,
  formLoading,
  handleSubmit,
  handleCancel,
  onLocationSelect
}) => {
  const { showWarning, showInfo } = useToast();
  
  const form = useForm({
    resolver: yupResolver(productSchema),
    mode: 'onChange', // Validação em tempo real
    defaultValues: {
      name: '',
      lot: '',
      seedTypeId: '',
      quantity: 1,
      storageType: 'saco',
      weightPerUnit: 50,
      locationId: '',
      clientId: '',
      expirationDate: null,
      notes: '',
    },
  });

  // Watch para cálculos e validações em tempo real
  const quantity = form.watch('quantity');
  const weightPerUnit = form.watch('weightPerUnit');
  const locationId = form.watch('locationId');
  const seedTypeId = form.watch('seedTypeId');

  // Cálculo do peso total em tempo real
  const totalWeight = React.useMemo(() => {
    const qty = Number(quantity) || 0;
    const weight = Number(weightPerUnit) || 0;
    return qty * weight;
  }, [quantity, weightPerUnit]);

  // Localização selecionada
  const selectedLocation = React.useMemo(() => {
    return allLocations.find(loc => loc.id === locationId) || null;
  }, [allLocations, locationId]);

  // Tipo de semente selecionado
  const selectedSeedType = React.useMemo(() => {
    return seedTypes.find(type => type.id === seedTypeId) || null;
  }, [seedTypes, seedTypeId]);

  // Informações de capacidade em tempo real
  const capacityInfo = React.useMemo(() => {
    if (!selectedLocation || !totalWeight) return null;

    const newWeight = selectedLocation.currentWeightKg + totalWeight;
    const exceedsCapacity = newWeight > selectedLocation.maxCapacityKg;
    const usageAfterStorage = (newWeight / selectedLocation.maxCapacityKg) * 100;

    return {
      exceedsCapacity,
      usageAfterStorage,
      newWeight,
      maxCapacity: selectedLocation.maxCapacityKg,
      availableCapacity: selectedLocation.maxCapacityKg - selectedLocation.currentWeightKg
    };
  }, [selectedLocation, totalWeight]);

  // Validação de peso em tempo real
  React.useEffect(() => {
    if (capacityInfo && capacityInfo.exceedsCapacity) {
      showWarning(
        `Peso total (${totalWeight.toFixed(3)}kg) excede a capacidade disponível (${capacityInfo.availableCapacity.toFixed(3)}kg) da localização selecionada.`
      );
    }
  }, [capacityInfo, totalWeight, showWarning]);

  // Handler para seleção via LocationTreeNavigation
  const handleLocationSelectFromTree = React.useCallback((locationId: string) => {
    const cleanLocationId = locationId.includes('-') ? locationId.split('-')[0] : locationId;
    const location = allLocations.find(loc => 
      loc.id === cleanLocationId || loc.id === locationId
    );
    
    form.setValue('locationId', cleanLocationId, { shouldValidate: true });
    
    if (location) {
      if (location.isOccupied) {
        showWarning(`Localização ${location.code} está ocupada. Você pode prosseguir sem localização.`);
      } else {
        showInfo(`Localização ${location.code} selecionada com sucesso.`);
      }
      
      if (onLocationSelect) {
        onLocationSelect(location);
      }
    }
  }, [form, allLocations, onLocationSelect, showWarning, showInfo]);

  const onSubmit = async (data: any) => {
    try {
      const formattedData: CreateProductFormData = {
        ...data,
        expirationDate: data.expirationDate ? new Date(data.expirationDate) : undefined,
      };
      await handleSubmit(formattedData);
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  };

  // Estado de carregamento dos dados iniciais
  if (isLoading) {
    return (
      <LoadingState
        variant="form"
        rows={6}
        message="Carregando dados do formulário..."
      />
    );
  }

  // Verificar se temos dados necessários
  if (seedTypes.length === 0) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        <Typography variant="h6" gutterBottom>
          Dados insuficientes
        </Typography>
        <Typography>
          Não foi possível carregar os tipos de sementes. 
          Verifique sua conexão e tente novamente.
        </Typography>
        <Button 
          variant="outlined" 
          onClick={handleCancel} 
          sx={{ mt: 2 }}
        >
          Voltar
        </Button>
      </Alert>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} noValidate>
        
        {/* Indicador de loading do formulário */}
        {formLoading && (
          <Box sx={{ width: '100%', mb: 2 }}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
              Cadastrando produto...
            </Typography>
          </Box>
        )}
        
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
              disabled={formLoading}
              InputProps={{
                endAdornment: form.formState.errors.name ? (
                  <WarningIcon color="error" />
                ) : form.watch('name') && !form.formState.errors.name ? (
                  <CheckIcon color="success" />
                ) : null
              }}
            />
            
            <Box sx={{ display: 'flex', gap: 2, flexDirection: { xs: 'column', sm: 'row' } }}>
              <TextField
                {...form.register('lot')}
                label="Lote"
                fullWidth
                error={!!form.formState.errors.lot}
                helperText={form.formState.errors.lot?.message}
                placeholder="Ex: 2024-001"
                disabled={formLoading}
                InputProps={{
                  endAdornment: form.formState.errors.lot ? (
                    <WarningIcon color="error" />
                  ) : form.watch('lot') && !form.formState.errors.lot ? (
                    <CheckIcon color="success" />
                  ) : null
                }}
              />
              
              <TextField
                {...form.register('seedTypeId')}
                label="Tipo de Semente"
                select
                fullWidth
                error={!!form.formState.errors.seedTypeId}
                helperText={form.formState.errors.seedTypeId?.message}
                disabled={formLoading}
              >
                <MenuItem value="">Selecione o tipo</MenuItem>
                {seedTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography>{type.name}</Typography>
                      {type.description && (
                        <Typography variant="caption" color="text.secondary">
                          ({type.description})
                        </Typography>
                      )}
                    </Box>
                  </MenuItem>
                ))}
              </TextField>
            </Box>

            {/* Cliente (Opcional) */}
            <ClientSelector
              value={form.watch('clientId')}
              onChange={(clientId) => form.setValue('clientId', clientId || '', { shouldValidate: true })}
              error={!!form.formState.errors.clientId}
              helperText={form.formState.errors.clientId?.message}
              label="Cliente (Opcional)"
              placeholder="Selecione um cliente..."
              disabled={formLoading}
            />

            {/* Informações do tipo de semente selecionado */}
            {selectedSeedType && (
              <Alert severity="info" sx={{ mt: 1 }}>
                <Typography variant="body2">
                  <strong>Condições ótimas:</strong>{' '}
                  {selectedSeedType.optimalTemperature && (
                    <>Temperatura: {selectedSeedType.optimalTemperature}°C</>
                  )}
                  {selectedSeedType.optimalHumidity && (
                    <> | Umidade: {selectedSeedType.optimalHumidity}%</>
                  )}
                  {selectedSeedType.maxStorageTimeDays && (
                    <> | Tempo máximo: {selectedSeedType.maxStorageTimeDays} dias</>
                  )}
                </Typography>
              </Alert>
            )}
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
                inputProps={{ min: 1, max: 10000 }}
                disabled={formLoading}
                InputProps={{
                  endAdornment: form.formState.errors.quantity ? (
                    <WarningIcon color="error" />
                  ) : form.watch('quantity') > 0 && !form.formState.errors.quantity ? (
                    <CheckIcon color="success" />
                  ) : null
                }}
              />
              
              <TextField
                {...form.register('storageType')}
                label="Tipo de Armazenamento"
                select
                fullWidth
                error={!!form.formState.errors.storageType}
                helperText={form.formState.errors.storageType?.message}
                disabled={formLoading}
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
                inputProps={{ min: 0.001, step: 0.001, max: 1000 }}
                disabled={formLoading}
                InputProps={{
                  endAdornment: form.formState.errors.weightPerUnit ? (
                    <WarningIcon color="error" />
                  ) : form.watch('weightPerUnit') > 0 && !form.formState.errors.weightPerUnit ? (
                    <CheckIcon color="success" />
                  ) : null
                }}
              />
              
              <Box sx={{ minWidth: 180 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Peso Total Calculado
                </Typography>
                <Chip 
                  {...sanitizeChipProps({
                    label: `${totalWeight.toFixed(3)} kg`,
                    color: totalWeight > 0 ? "primary" : "default",
                    variant: "outlined",
                    size: "medium",
                    icon: totalWeight > 0 ? <CheckIcon fontSize="small" /> : undefined
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
              helperText={form.formState.errors.expirationDate?.message || 'Se não informada, produto não terá controle de validade'}
              disabled={formLoading}
            />
          </Box>
        </FormSection>

        {/* Seção: Localização - Agora Opcional */}
        <FormSection 
          title="Localização (Opcional)" 
          icon={<LocationIcon />}
          elevation={0}
        >
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            
            {/* Informação sobre localização opcional */}
            <Alert severity="info" sx={{ mb: 2 }}>
              A localização é opcional. Se não especificada, o produto ficará com status 
              "Aguardando Locação" e poderá ser localizado posteriormente por um operador.
            </Alert>
            
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
              backgroundColor: 'background.paper',
              opacity: formLoading ? 0.6 : 1,
              pointerEvents: formLoading ? 'none' : 'auto'
            }}>
              <LocationTreeNavigation
                onLocationSelect={handleLocationSelectFromTree}
                selectedLocationId={locationId || undefined}
                showStats={true}
                allowModeToggle={true}
                hideViewToggle={false}
                filters={{
                  status: 'all'
                }}
              />
            </Box>
            
            {/* Feedback da Capacidade */}
            {capacityInfo && (
              <Box sx={{ mt: 1 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Análise de Capacidade
                </Typography>
                
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                    <Typography variant="body2">
                      Uso após armazenamento: {capacityInfo.usageAfterStorage.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {capacityInfo.newWeight.toFixed(3)}kg / {capacityInfo.maxCapacity.toFixed(3)}kg
                    </Typography>
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={Math.min(capacityInfo.usageAfterStorage, 100)}
                    color={
                      capacityInfo.exceedsCapacity ? 'error' :
                      capacityInfo.usageAfterStorage > 90 ? 'warning' : 'primary'
                    }
                    sx={{ 
                      height: 8, 
                      borderRadius: 4,
                      backgroundColor: 'grey.200'
                    }}
                  />
                </Box>
                
                {capacityInfo.exceedsCapacity && (
                  <Alert severity="error" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Capacidade excedida!</strong> O peso total ({totalWeight.toFixed(3)}kg) 
                      excede a capacidade disponível ({capacityInfo.availableCapacity.toFixed(3)}kg).
                    </Typography>
                  </Alert>
                )}
                
                {capacityInfo.usageAfterStorage > 90 && !capacityInfo.exceedsCapacity && (
                  <Alert severity="warning" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      <strong>Atenção:</strong> A localização ficará {capacityInfo.usageAfterStorage.toFixed(1)}% 
                      ocupada após o armazenamento.
                    </Typography>
                  </Alert>
                )}

                {capacityInfo.usageAfterStorage <= 90 && (
                  <Alert severity="success" sx={{ mt: 1 }}>
                    <Typography variant="body2">
                      Capacidade adequada. Restará {(100 - capacityInfo.usageAfterStorage).toFixed(1)}% 
                      de espaço disponível.
                    </Typography>
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
              helperText={form.formState.errors.notes?.message || 'Informações adicionais sobre o produto, localização ou condições especiais'}
              placeholder="Ex: Produto sensível à umidade, armazenar preferencialmente no andar superior..."
              disabled={formLoading}
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
          borderColor: 'divider',
          position: 'sticky',
          bottom: 0,
          backgroundColor: 'background.paper',
          zIndex: 1
        }}>
          <Button
            variant="outlined"
            onClick={handleCancel}
            startIcon={<CancelIcon />}
            disabled={formLoading}
          >
            Cancelar
          </Button>
          
          <Button
            type="submit"
            variant="contained"
            startIcon={formLoading ? <CircularProgress size={20} /> : <SaveIcon />}
            disabled={
              formLoading || 
              !form.formState.isValid ||
              (capacityInfo?.exceedsCapacity ?? false) ||
              (selectedLocation?.isOccupied ?? false)
            }
            sx={{ minWidth: 180 }}
          >
            {formLoading ? 'Cadastrando...' : 
             locationId ? 'Cadastrar com Localização' : 'Cadastrar sem Localização'}
          </Button>
        </Box>
      </Box>
    </LocalizationProvider>
  );
}; 