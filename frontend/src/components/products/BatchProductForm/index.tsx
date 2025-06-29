import React from 'react';
import { Box, Grid, Typography, Divider } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { SeedType, LocationWithChamber, Chamber } from '../../../types';
import { BatchFormData } from './utils/batchFormValidation';

// Sub-componentes modulares
import { BatchProductItem } from './components/BatchProductItem';
import { BatchClientSelector } from './components/BatchClientSelector';
import { BatchFormActions } from './components/BatchFormActions';

// Hook customizado com lógica de negócio
import { useBatchProductFormLogic } from './hooks/useBatchProductFormLogic';

interface BatchProductFormProps {
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[];
  onSubmit: (data: BatchFormData) => void;
  onCancel: () => void;
}

/**
 * Formulário de cadastro em lote de produtos seguindo as melhores práticas:
 * - Componente principal limpo e organizado
 * - Lógica de negócio extraída para hook customizado
 * - Sub-componentes modulares e reutilizáveis
 * - Performance otimizada com React.memo
 * - Validação robusta com yup + react-hook-form
 * - Array dinâmico de produtos com useFieldArray
 */
export const BatchProductForm: React.FC<BatchProductFormProps> = React.memo((props) => {
  // Toda a lógica de negócio centralizada no hook customizado
  const formLogic = useBatchProductFormLogic(props);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box component="form" onSubmit={formLogic.handleSubmit} noValidate>
        <Grid container spacing={3}>
          {/* Cabeçalho */}
          <Grid size={12}>
            <Box sx={{ mb: 2 }}>
              <Typography variant="h4" component="h1" gutterBottom>
                Cadastro em Lote de Produtos
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Cadastre múltiplos produtos simultaneamente com um cliente comum.
              </Typography>
            </Box>
            <Divider sx={{ mb: 3 }} />
          </Grid>

          {/* Lista de Produtos */}
          {formLogic.fields.map((field, index) => (
            <BatchProductItem
              key={field.id}
              form={formLogic.form}
              productIndex={index}
              seedTypes={formLogic.seedTypes}
              chambers={formLogic.chambers}
              availableLocations={formLogic.availableLocations}
              allLocations={formLogic.allLocations}
              onRemove={formLogic.handleRemoveProduct}
              canRemove={formLogic.canRemoveProduct}
            />
          ))}

          {/* Divisor */}
          <Grid size={12}>
            <Divider sx={{ my: 2 }} />
          </Grid>

          {/* Seleção de Cliente */}
          <BatchClientSelector
            form={formLogic.form}
            errors={formLogic.errors}
          />

          {/* Ações do Formulário */}
          <BatchFormActions
            isSubmitting={formLogic.isSubmitting}
            isFormValid={formLogic.isFormValid}
            totalProducts={formLogic.totalProducts}
            totalBatchWeight={formLogic.totalBatchWeight}
            canAddProduct={formLogic.canAddProduct}
            onAddProduct={formLogic.handleAddProduct}
            onCancel={formLogic.handleCancel}
          />
        </Grid>
      </Box>
    </LocalizationProvider>
  );
});

BatchProductForm.displayName = 'BatchProductForm';