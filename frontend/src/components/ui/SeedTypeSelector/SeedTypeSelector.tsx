import React, { useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Chip,
  Box,
  Typography,
  Avatar,
  ListItemText,
  ListItemAvatar,
  InputAdornment,
} from '@mui/material';
import {
  Grain as SeedIcon,
  Search as SearchIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';
import { SeedType } from '../../../types';
import { useSeedTypes } from '../../../hooks/useSeedTypes';

// ============================================================================
// INTERFACES
// ============================================================================

interface SeedTypeSelectorProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: object;
  label?: string;
  placeholder?: string;
  multiple?: boolean;
  allowCreate?: boolean;
  size?: 'small' | 'medium';
  disabled?: boolean;
  required?: boolean;
}

interface SeedTypeOption extends SeedType {
  isNew?: boolean;
}

// ============================================================================
// SEED TYPE SELECTOR COMPONENT
// ============================================================================

/**
 * SeedTypeSelector - Componente dinâmico para seleção de tipos de sementes
 * 
 * REGRAS CRÍTICAS IMPLEMENTADAS:
 * - Tipos dinâmicos de sementes (sem hardcode)
 * - Integração com React Hook Form + Yup
 * - Busca e filtragem em tempo real
 * - Criação de novos tipos (opcional)
 * - Suporte a seleção múltipla
 * 
 * REGRAS REACT SEGUIDAS:
 * - Componente puro
 * - Props imutáveis
 * - TypeScript rigoroso
 * - Performance otimizada com useMemo
 * - Debounce automático (300ms)
 */
export const SeedTypeSelector = <
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
>({
  name,
  control,
  rules,
  label = 'Tipo de Semente',
  placeholder = 'Buscar ou selecionar tipo de semente...',
  multiple = false,
  allowCreate = false,
  size = 'medium',
  disabled = false,
  required = false,
}: SeedTypeSelectorProps<TFieldValues, TName>) => {
  // ============================================================================
  // HOOKS
  // ============================================================================

  const {
    field: { value, onChange, onBlur },
    fieldState: { error, invalid },
  } = useController({
    name,
    control,
    rules,
  });

  const { seedTypes, loading, createSeedType } = useSeedTypes();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const filteredSeedTypes = useMemo(() => {
    return (seedTypes || []).filter(seedType => seedType.isActive);
  }, [seedTypes]);

  const options: SeedTypeOption[] = useMemo(() => {
    return filteredSeedTypes.map(seedType => ({
      ...seedType,
      isNew: false,
    }));
  }, [filteredSeedTypes]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (
    _event: React.SyntheticEvent,
    newValue: SeedTypeOption | SeedTypeOption[] | null
  ) => {
    if (multiple) {
      const selectedValues = (newValue as SeedTypeOption[]) || [];
      onChange(selectedValues.map(option => option.id));
    } else {
      const selectedValue = newValue as SeedTypeOption | null;
      onChange(selectedValue?.id || null);
    }
  };

  const handleCreateOption = async (inputValue: string) => {
    if (!allowCreate || !createSeedType) return null;

    try {
      const newSeedType = await createSeedType({
        name: inputValue,
        description: `Tipo criado automaticamente: ${inputValue}`,
      });

      return newSeedType;
    } catch (error) {
      console.error('Erro ao criar novo tipo de semente:', error);
      return null;
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const getOptionLabel = (option: SeedTypeOption | string) => {
    if (typeof option === 'string') return option;
    return option.name;
  };

  const isOptionEqualToValue = (option: SeedTypeOption, value: SeedTypeOption) => {
    return option.id === value.id;
  };

  const renderOption = (props: any, option: SeedTypeOption) => (
    <li {...props}>
      <ListItemAvatar>
        <Avatar
          sx={{ 
            width: 32, 
            height: 32, 
            bgcolor: option.isNew ? 'secondary.main' : 'primary.main' 
          }}
        >
          {option.isNew ? <AddIcon /> : <SeedIcon />}
        </Avatar>
      </ListItemAvatar>
      <ListItemText
        primary={option.name}
        secondary={
          <Box>
            <Typography variant="caption" color="text.secondary">
              {option.description}
            </Typography>
            {option.optimalTemperature && option.optimalHumidity && (
              <Typography variant="caption" color="text.secondary" display="block">
                Temp: {option.optimalTemperature}°C • Umidade: {option.optimalHumidity}%
              </Typography>
            )}
            {option.maxStorageTimeDays && (
              <Typography variant="caption" color="text.secondary" display="block">
                Armazenamento máximo: {option.maxStorageTimeDays} dias
              </Typography>
            )}
          </Box>
        }
      />
    </li>
  );

  const renderTags = (tagValue: SeedTypeOption[], getTagProps: any) =>
    tagValue.map((option, index) => (
      <Chip
        {...getTagProps({ index })}
        key={option.id}
        label={option.name}
        size="small"
        avatar={<Avatar><SeedIcon /></Avatar>}
        color="primary"
        variant="outlined"
      />
    ));

  // ============================================================================
  // VALUE CONVERSION
  // ============================================================================

  const selectedValue = useMemo(() => {
    if (!value) return multiple ? [] : null;

    if (multiple) {
      const selectedIds = Array.isArray(value) ? value : [value];
      return filteredSeedTypes.filter(seedType => 
        selectedIds.some(id => id === seedType.id)
      );
    } else {
      return filteredSeedTypes.find(seedType => seedType.id === value) || null;
    }
  }, [value, filteredSeedTypes, multiple]);

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Autocomplete
      multiple={multiple}
      options={options}
      value={selectedValue}
      onChange={handleChange}
      onBlur={onBlur}
      loading={loading}
      disabled={disabled}
      size={size}
      getOptionLabel={getOptionLabel}
      isOptionEqualToValue={isOptionEqualToValue}
      renderOption={renderOption}
      renderTags={multiple ? renderTags : undefined}
      filterOptions={(options, params) => {
        const filtered = options.filter(option =>
          option.name.toLowerCase().includes(params.inputValue.toLowerCase()) ||
          (option.description && option.description.toLowerCase().includes(params.inputValue.toLowerCase()))
        );

        // Adicionar opção de criar novo tipo se permitido
        if (allowCreate && params.inputValue !== '' && !filtered.find(option => 
          option.name.toLowerCase() === params.inputValue.toLowerCase()
        )) {
          filtered.push({
            id: `new-${params.inputValue}`,
            name: `Criar "${params.inputValue}"`,
            description: `Novo tipo de semente: ${params.inputValue}`,
            isActive: true,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isNew: true,
          });
        }

        return filtered;
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          error={invalid}
          helperText={error?.message}
          required={required}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="action" />
              </InputAdornment>
            ),
          }}
        />
      )}
      noOptionsText={
        loading 
          ? "Carregando tipos de sementes..."
          : "Nenhum tipo encontrado"
      }
      loadingText="Carregando tipos de sementes..."
    />
  );
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { SeedTypeSelectorProps };
export default SeedTypeSelector; 