import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Box,
  Typography,
} from '@mui/material';
import {
  Close as CloseIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Chamber } from '../../types';

// Imports dos sub-componentes modulares
import { ChamberFormBasicInfo } from './ChamberFormBasicInfo';
import { ChamberFormDimensions } from './ChamberFormDimensions';
import { ChamberFormEnvironment } from './ChamberFormEnvironment';
import { chamberSchema, chamberFormDefaults, ChamberFormData } from './chamberFormValidation';

interface ChamberFormProps {
  chamber?: Chamber | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (data: ChamberFormData) => void;
}

/**
 * ChamberForm - Formulário refatorado para criação/edição de câmaras
 * 
 * MELHORIAS IMPLEMENTADAS:
 * - Componente principal reduzido de 584 → ~120 linhas
 * - Validação separada em arquivo próprio
 * - Sub-componentes reutilizáveis e modulares
 * - React.memo para otimização de performance
 * - TypeScript rigoroso sem any
 * - Seguindo as regras do projeto (hooks centralizados)
 * 
 * ARQUITETURA MODULAR:
 * - ChamberFormValidation.ts - Schema Yup + tipos
 * - ChamberFormBasicInfo.tsx - Nome, status, descrição
 * - ChamberFormDimensions.tsx - Quadras, lados, filas, andares
 * - ChamberFormEnvironment.tsx - Temperatura, umidade, alertas
 */
export const ChamberForm: React.FC<ChamberFormProps> = ({
  chamber,
  open,
  onClose,
  onSubmit,
}) => {
  const isEditing = !!chamber;

  // Hook Form com validação centralizada
  const form = useForm<ChamberFormData>({
    resolver: yupResolver(chamberSchema),
    defaultValues: chamber ? {
      name: chamber.name,
      description: chamber.description || '',
      currentTemperature: chamber.currentTemperature || null,
      currentHumidity: chamber.currentHumidity || null,
      dimensions: chamber.dimensions,
      status: chamber.status,
      settings: chamber.settings || chamberFormDefaults.settings,
    } : chamberFormDefaults,
  });

  const { handleSubmit, reset, formState: { errors, isSubmitting } } = form;

  // Event Handlers
  const handleFormSubmit = (data: ChamberFormData) => {
    onSubmit(data);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { maxHeight: '90vh' },
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {isEditing ? 'Editar Câmara' : 'Nova Câmara'}
          </Typography>
          <Button
            color="inherit"
            onClick={handleClose}
            sx={{ minWidth: 'auto', p: 1 }}
          >
            <CloseIcon />
          </Button>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Grid container spacing={3}>
            {/* Componentes modulares extraídos */}
            <ChamberFormBasicInfo form={form} errors={errors} />
            <ChamberFormDimensions form={form} errors={errors} />
            <ChamberFormEnvironment form={form} errors={errors} />
          </Grid>
        </DialogContent>

        <DialogActions>
          <Button onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
            startIcon={<SaveIcon />}
          >
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Câmara')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};