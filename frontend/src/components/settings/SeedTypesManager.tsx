import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  InputAdornment,
  Chip,
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Thermostat as TempIcon,
  Opacity as HumidityIcon,
  Schedule as TimeIcon,
  Nature as SeedIcon,
  Restore as RestoreIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useSeedTypes } from '../../hooks/useSeedTypes';
import { SeedType, CreateSeedTypeFormData, UpdateSeedTypeFormData } from '../../types';

// Schema de validação
const seedTypeSchema = yup.object().shape({
  name: yup.string().required('Nome é obrigatório').min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: yup.string().optional(),
  optimalTemperature: yup.number().nullable().optional(),
  optimalHumidity: yup.number().nullable().min(0, 'Umidade deve ser positiva').max(100, 'Umidade não pode exceder 100%').optional(),
  maxStorageTimeDays: yup.number().nullable().min(1, 'Tempo de armazenamento deve ser positivo').optional()
});

export const SeedTypesManager: React.FC = () => {
  const {
    seedTypes,
    loading,
    error,
    fetchSeedTypes,
    createSeedType,
    updateSeedType,
    deleteSeedType,
  } = useSeedTypes();

  const [showForm, setShowForm] = useState(false);
  const [editingSeedType, setEditingSeedType] = useState<SeedType | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [seedTypeToDelete, setSeedTypeToDelete] = useState<SeedType | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CreateSeedTypeFormData>({
    resolver: yupResolver(seedTypeSchema) as any,
    defaultValues: {
      name: '',
      description: '',
      optimalTemperature: null,
      optimalHumidity: null,
      maxStorageTimeDays: null
    }
  });

  useEffect(() => {
    fetchSeedTypes();
  }, [fetchSeedTypes]);

  useEffect(() => {
    if (editingSeedType) {
      reset({
        name: editingSeedType.name,
        description: editingSeedType.description || '',
        optimalTemperature: editingSeedType.optimalTemperature || null,
        optimalHumidity: editingSeedType.optimalHumidity || null,
        maxStorageTimeDays: editingSeedType.maxStorageTimeDays || null,
      });
    } else {
      reset({
        name: '',
        description: '',
        optimalTemperature: null,
        optimalHumidity: null,
        maxStorageTimeDays: null,
      });
    }
  }, [editingSeedType, reset]);

  const handleCreateNew = () => {
    setEditingSeedType(null);
    setShowForm(true);
  };

  const handleEdit = (seedType: SeedType) => {
    setEditingSeedType(seedType);
    setShowForm(true);
  };

  const handleDelete = (seedType: SeedType) => {
    setSeedTypeToDelete(seedType);
    setDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (seedTypeToDelete) {
      try {
        await deleteSeedType(seedTypeToDelete.id);
        setDeleteConfirmOpen(false);
        setSeedTypeToDelete(null);
        await fetchSeedTypes();
      } catch (error) {
        console.error('Erro ao excluir tipo de semente:', error);
      }
    }
  };

  const handleFormSubmit = async (data: CreateSeedTypeFormData) => {
    try {
      if (editingSeedType) {
        await updateSeedType(editingSeedType.id, data as UpdateSeedTypeFormData);
      } else {
        await createSeedType(data as CreateSeedTypeFormData);
      }
      setShowForm(false);
      setEditingSeedType(null);
      await fetchSeedTypes();
    } catch (error) {
      console.error('Erro ao salvar tipo de semente:', error);
    }
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSeedType(null);
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <Typography>Carregando tipos de sementes...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">
            Tipos de Sementes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie os tipos de sementes disponíveis no sistema
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleCreateNew}
        >
          Novo Tipo
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {seedTypes.map((seedType) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={seedType.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <SeedIcon sx={{ mr: 1, color: 'primary.main' }} />
                  <Typography variant="h6" component="div">
                    {seedType.name}
                  </Typography>
                  <Chip 
                    label={seedType.isActive ? 'Ativo' : 'Inativo'} 
                    color={seedType.isActive ? 'success' : 'default'}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                </Box>

                {seedType.description && (
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {seedType.description}
                  </Typography>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {seedType.optimalTemperature && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TempIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="caption">
                        {seedType.optimalTemperature}°C
                      </Typography>
                    </Box>
                  )}

                  {seedType.optimalHumidity && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <HumidityIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="caption">
                        {seedType.optimalHumidity}%
                      </Typography>
                    </Box>
                  )}

                  {seedType.maxStorageTimeDays && (
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <TimeIcon fontSize="small" sx={{ mr: 1, color: 'info.main' }} />
                      <Typography variant="caption">
                        {seedType.maxStorageTimeDays} dias
                      </Typography>
                    </Box>
                  )}
                </Box>
              </CardContent>

              <CardActions>
                <IconButton
                  size="small"
                  onClick={() => handleEdit(seedType)}
                  color="primary"
                >
                  <EditIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleDelete(seedType)}
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </CardActions>
            </Card>
          </Grid>
        ))}

        {seedTypes.length === 0 && (
          <Grid size={12}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 6 }}>
                <SeedIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  Nenhum tipo de semente cadastrado
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Clique em "Novo Tipo" para começar
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        )}
      </Grid>

      {/* Formulário de Criação/Edição */}
      <Dialog open={showForm} onClose={handleCloseForm} maxWidth="sm" fullWidth>
        {/* @ts-ignore - Type compatibility issue with react-hook-form */}
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogTitle>
            {editingSeedType ? 'Editar Tipo de Semente' : 'Novo Tipo de Semente'}
          </DialogTitle>
          
          <DialogContent>
            <Grid container spacing={3} sx={{ mt: 1 }}>
              <Grid size={12}>
                <TextField
                  {...register('name')}
                  label="Nome"
                  fullWidth
                  error={!!errors.name}
                  helperText={errors.name?.message}
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
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('optimalTemperature')}
                  label="Temperatura Ideal"
                  type="number"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">°C</InputAdornment>,
                  }}
                  error={!!errors.optimalTemperature}
                  helperText={errors.optimalTemperature?.message}
                />
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  {...register('optimalHumidity')}
                  label="Umidade Ideal"
                  type="number"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">%</InputAdornment>,
                  }}
                  error={!!errors.optimalHumidity}
                  helperText={errors.optimalHumidity?.message}
                />
              </Grid>

              <Grid size={12}>
                <TextField
                  {...register('maxStorageTimeDays')}
                  label="Tempo Máximo de Armazenamento"
                  type="number"
                  fullWidth
                  InputProps={{
                    endAdornment: <InputAdornment position="end">dias</InputAdornment>,
                  }}
                  error={!!errors.maxStorageTimeDays}
                  helperText={errors.maxStorageTimeDays?.message}
                />
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={handleCloseForm}>
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Confirmação de Exclusão */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o tipo de semente "{seedTypeToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 