import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Grid,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Typography,
  Alert,
  CircularProgress
} from '@mui/material';
import { useSeedTypes } from '../../hooks/useSeedTypes';
import { SeedType, CreateSeedTypeFormData } from '../../types';

interface SeedTypeFormProps {
  seedType?: SeedType | null;
  onClose: () => void;
}

interface FormData {
  name: string;
  description: string;
  optimalTemperature: number;
  optimalHumidity: number;
  maxStorageTimeDays: number;
  isActive: boolean;
}

const schema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(50, 'Nome deve ter no máximo 50 caracteres'),
  description: yup
    .string()
    .default('')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  optimalTemperature: yup
    .number()
    .default(18)
    .min(-50, 'Temperatura deve ser maior que -50°C')
    .max(50, 'Temperatura deve ser menor que 50°C'),
  optimalHumidity: yup
    .number()
    .default(50)
    .min(0, 'Umidade deve ser maior que 0%')
    .max(100, 'Umidade deve ser menor que 100%'),
  maxStorageTimeDays: yup
    .number()
    .default(365)
    .min(1, 'Tempo deve ser maior que 0 dias')
    .max(3650, 'Tempo deve ser menor que 10 anos'),
  isActive: yup
    .boolean()
    .default(true)
});

const SeedTypeForm: React.FC<SeedTypeFormProps> = ({ seedType, onClose }) => {
  const { createSeedType, updateSeedType, loading, error } = useSeedTypes();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      name: '',
      description: '',
      optimalTemperature: 0,
      optimalHumidity: 50,
      maxStorageTimeDays: 365,
      isActive: true
    }
  });

  const isActive = watch('isActive');

  useEffect(() => {
    if (seedType) {
      setValue('name', seedType.name);
      setValue('description', seedType.description || '');
      setValue('optimalTemperature', seedType.optimalTemperature || 0);
      setValue('optimalHumidity', seedType.optimalHumidity || 50);
      setValue('maxStorageTimeDays', seedType.maxStorageTimeDays || 365);
      setValue('isActive', seedType.isActive);
    }
  }, [seedType, setValue]);

  const onSubmit = async (data: FormData) => {
    try {
      const seedTypeData: CreateSeedTypeFormData = {
        name: data.name,
        description: data.description || undefined,
        optimalTemperature: data.optimalTemperature || undefined,
        optimalHumidity: data.optimalHumidity || undefined,
        maxStorageTimeDays: data.maxStorageTimeDays || undefined
      };

      if (seedType) {
        // Atualizar tipo existente - incluindo isActive
        const updateData = { ...seedTypeData, isActive: data.isActive };
        await updateSeedType(seedType.id, updateData);
      } else {
        // Criar novo tipo
        await createSeedType(seedTypeData);
      }
      
      reset();
      onClose();
    } catch (err) {
      console.error('Erro ao salvar tipo de semente:', err);
    }
  };

  return (
    <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Grid container spacing={3}>
        <Grid size={12}>
          <TextField
            {...register('name')}
            label="Nome do Tipo de Semente"
            fullWidth
            error={!!errors.name}
            helperText={errors.name?.message}
            placeholder="Ex: Milho, Soja, Trigo"
          />
        </Grid>

        <Grid size={12}>
          <TextField
            {...register('description')}
            label="Descrição"
            fullWidth
            multiline
            rows={3}
            error={!!errors.description}
            helperText={errors.description?.message}
            placeholder="Descrição detalhada do tipo de semente (opcional)"
          />
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <TextField
            {...register('optimalTemperature')}
            label="Temperatura Ótima (°C)"
            type="number"
            fullWidth
            error={!!errors.optimalTemperature}
            helperText={errors.optimalTemperature?.message}
            inputProps={{ step: 0.1, min: -50, max: 50 }}
          />
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 6
          }}>
          <TextField
            {...register('optimalHumidity')}
            label="Umidade Ótima (%)"
            type="number"
            fullWidth
            error={!!errors.optimalHumidity}
            helperText={errors.optimalHumidity?.message}
            inputProps={{ step: 1, min: 0, max: 100 }}
          />
        </Grid>

        <Grid size={12}>
          <TextField
            {...register('maxStorageTimeDays')}
            label="Tempo Máximo de Armazenamento (dias)"
            type="number"
            fullWidth
            error={!!errors.maxStorageTimeDays}
            helperText={errors.maxStorageTimeDays?.message}
            inputProps={{ step: 1, min: 1, max: 3650 }}
          />
        </Grid>

        {seedType && (
          <Grid size={12}>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive || false}
                  onChange={(e) => setValue('isActive', e.target.checked)}
                />
              }
              label="Tipo ativo"
            />
            <Typography variant="caption" color="textSecondary" display="block">
              Tipos inativos não aparecerão na seleção de novos produtos
            </Typography>
          </Grid>
        )}
      </Grid>
      <Box sx={{ mt: 3, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button 
          onClick={onClose}
          disabled={isSubmitting || loading}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || loading}
          startIcon={isSubmitting || loading ? <CircularProgress size={20} /> : null}
        >
          {seedType ? 'Atualizar' : 'Criar'} Tipo de Semente
        </Button>
      </Box>
    </Box>
  );
};

export default SeedTypeForm; 