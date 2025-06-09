import React, { useMemo, useState } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  Paper,
  Grid,
  Tooltip,
  Alert,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CheckCircle as AvailableIcon,
  Block as UnavailableIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import { Location } from '../../../types';
import { useLocations } from '../../../hooks/useLocations';
import { LocationHierarchyDisplay } from '../LocationHierarchyDisplay';

// ============================================================================
// INTERFACES
// ============================================================================

interface LocationSelectorProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  /** Nome do campo no formulário */
  name: TName;
  
  /** Controlador do React Hook Form */
  control: Control<TFieldValues>;
  
  /** Label do campo */
  label?: string;
  
  /** Texto de ajuda */
  helperText?: string;
  
  /** Campo obrigatório */
  required?: boolean;
  
  /** Campo desabilitado */
  disabled?: boolean;
  
  /** Filtrar apenas localizações disponíveis */
  onlyAvailable?: boolean;
  
  /** Filtrar por câmara específica */
  chamberId?: string;
  
  /** Peso do produto (para validação de capacidade) */
  productWeight?: number;
  
  /** Quantidade do produto (para validação de capacidade) */
  productQuantity?: number;
  
  /** Callback quando localização é selecionada */
  onLocationSelect?: (location: Location | null) => void;
  
  /** Mostrar informações de capacidade */
  showCapacityInfo?: boolean;
  
  /** Tamanho do campo */
  size?: 'small' | 'medium';
  
  /** Variante do campo */
  variant?: 'outlined' | 'filled' | 'standard';
}

// ============================================================================
// LOCATION SELECTOR COMPONENT
// ============================================================================

/**
 * LocationSelector - Componente para seleção de localizações
 * 
 * CARACTERÍSTICAS IMPLEMENTADAS:
 * - Autocomplete com busca inteligente
 * - Validação de capacidade em tempo real
 * - Filtros por disponibilidade e câmara
 * - Visualização da hierarquia Q-L-F-A
 * - Indicadores visuais de status
 * - Integração com React Hook Form
 * - Acessibilidade completa
 * 
 * REGRAS DE NEGÓCIO:
 * - Uma localização = um produto
 * - Validação de capacidade máxima
 * - Hierarquia de localizações obrigatória
 * - Apenas localizações ativas
 */
export const LocationSelector = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  label = 'Localização',
  helperText,
  required = false,
  disabled = false,
  onlyAvailable = true,
  chamberId,
  productWeight = 0,
  productQuantity = 1,
  onLocationSelect,
  showCapacityInfo = true,
  size = 'medium',
  variant = 'outlined',
}: LocationSelectorProps<TFieldValues, TName>) => {
  const [inputValue, setInputValue] = useState('');
  const [open, setOpen] = useState(false);

  // ============================================================================
  // REACT HOOK FORM INTEGRATION
  // ============================================================================

  const {
    field: { value, onChange, onBlur },
    fieldState: { error, invalid },
  } = useController({
    name,
    control,
    rules: {
      required: required ? 'Localização é obrigatória' : undefined,
    },
  });

  // ============================================================================
  // DATA FETCHING
  // ============================================================================

  const {
    locations,
    loading,
    error: locationsError,
    validateLocationCapacity,
  } = useLocations();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredLocations = useMemo(() => {
    if (!locations) return [];

    let filtered = locations.filter(location => {
      // Filtrar por câmara se especificado
      if (chamberId && location.chamberId !== chamberId) {
        return false;
      }

      // Filtrar apenas disponíveis se especificado (não ocupadas)
      if (onlyAvailable && location.isOccupied) {
        return false;
      }

      return true;
    });

    // Validação de capacidade se peso fornecido
    if (productWeight > 0 && productQuantity > 0) {
      filtered = filtered.filter(location => {
        const totalWeight = productWeight * productQuantity;
        const remainingCapacity = location.maxCapacityKg - location.currentWeightKg;
        return totalWeight <= remainingCapacity;
      });
    }

    return filtered;
  }, [
    locations,
    chamberId,
    onlyAvailable,
    productWeight,
    productQuantity,
  ]);

  const selectedLocation = useMemo(() => {
    if (!value || !locations) return null;
    return locations.find(location => location.id === value) || null;
  }, [value, locations]);

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================

  const handleLocationChange = (_event: any, newValue: Location | null) => {
    const locationId = newValue?.id || '';
    onChange(locationId);
    onLocationSelect?.(newValue);
  };

  const getLocationDisplayName = (location: Location) => {
    return `${location.code} - Q${location.coordinates.quadra}L${location.coordinates.lado}F${location.coordinates.fila}A${location.coordinates.andar}`;
  };

  const getLocationSearchText = (location: Location) => {
    return `${location.code} ${location.coordinates.quadra} ${location.coordinates.lado} ${location.coordinates.fila} ${location.coordinates.andar}`.toLowerCase();
  };

  const getCapacityWarning = (location: Location) => {
    if (!productWeight || !productQuantity) return null;
    
    const totalWeight = productWeight * productQuantity;
    const remainingCapacity = location.maxCapacityKg - location.currentWeightKg;
    
    if (totalWeight > remainingCapacity) {
      return `Capacidade insuficiente. Necessário: ${totalWeight}kg, Disponível: ${remainingCapacity}kg`;
    }
    
    if (totalWeight > location.maxCapacityKg * 0.9) {
      return 'Atenção: Localização ficará próxima ao limite de capacidade';
    }
    
    return null;
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderLocationOption = (props: any, location: Location) => {
    const warning = getCapacityWarning(location);
    const capacityPercentage = (location.currentWeightKg / location.maxCapacityKg) * 100;
    
    return (
      <Box component="li" {...props} key={location.id}>
        <Box display="flex" alignItems="center" gap={2}>
          <Box>
            {!location.isOccupied ? (
              <AvailableIcon color="success" fontSize="small" />
            ) : (
              <UnavailableIcon color="error" fontSize="small" />
            )}
          </Box>
          
          <Box flex={1}>
            <Typography variant="body1" fontWeight={500}>
              {getLocationDisplayName(location)}
            </Typography>
            
            <LocationHierarchyDisplay
              location={location}
              variant="inline"
              size="small"
            />
            
            {showCapacityInfo && (
              <Typography variant="caption" color="text.secondary">
                Capacidade: {location.currentWeightKg}/{location.maxCapacityKg}kg ({capacityPercentage.toFixed(1)}%)
              </Typography>
            )}
            
            {warning && (
              <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                <WarningIcon fontSize="small" color="warning" />
                <Typography variant="caption" color="warning.main">
                  {warning}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>
    );
  };

  const renderSelectedValue = (location: Location) => {
    return (
      <Box display="flex" alignItems="center" gap={1}>
        <LocationIcon fontSize="small" color="primary" />
        <Typography variant="body2">
          {getLocationDisplayName(location)}
        </Typography>
      </Box>
    );
  };

  // ============================================================================
  // ERROR HANDLING
  // ============================================================================

  if (locationsError) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        Erro ao carregar localizações: {locationsError}
      </Alert>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Box>
      <Autocomplete
        open={open}
        onOpen={() => setOpen(true)}
        onClose={() => setOpen(false)}
        value={selectedLocation}
        onChange={handleLocationChange}
        onInputChange={(_event, newInputValue) => {
          setInputValue(newInputValue);
        }}
        inputValue={inputValue}
        options={filteredLocations}
        getOptionLabel={(option) => {
          if (typeof option === 'string') return option;
          return getLocationDisplayName(option);
        }}
        filterOptions={(options, { inputValue: filterInputValue }) => {
          const searchTerm = filterInputValue.toLowerCase();
          return options.filter(option => 
            getLocationSearchText(option).includes(searchTerm)
          );
        }}
        renderOption={renderLocationOption}
        renderInput={(params) => (
          <TextField
            {...params}
            label={label}
            variant={variant}
            size={size}
            required={required}
            disabled={disabled}
            error={invalid}
            helperText={error?.message || helperText}
            onBlur={onBlur}
            InputProps={{
              ...params.InputProps,
              startAdornment: selectedLocation ? (
                renderSelectedValue(selectedLocation)
              ) : (
                <LocationIcon color="action" sx={{ mr: 1 }} />
              ),
            }}
          />
        )}
        loading={loading}
        loadingText="Carregando localizações..."
        noOptionsText={
          onlyAvailable 
            ? "Nenhuma localização disponível encontrada"
            : "Nenhuma localização encontrada"
        }
        clearOnBlur
        selectOnFocus
        handleHomeEndKeys
        PaperComponent={({ children, ...paperProps }) => (
          <Paper {...paperProps} elevation={3}>
            {children}
          </Paper>
        )}
        slotProps={{
          popper: {
            modifiers: [
              {
                name: 'flip',
                enabled: true,
                options: {
                  altBoundary: true,
                  rootBoundary: 'document',
                  padding: 8,
                },
              },
            ],
          },
        }}
      />

      {/* Informações da localização selecionada */}
      {selectedLocation && showCapacityInfo && (
        <Box mt={2}>
          <LocationHierarchyDisplay
            location={selectedLocation}
            variant="card"
            showCapacity
          />
        </Box>
      )}
    </Box>
  );
};

export default LocationSelector; 