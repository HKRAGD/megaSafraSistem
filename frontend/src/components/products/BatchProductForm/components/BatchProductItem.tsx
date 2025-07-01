import React from 'react';
import { Box, Grid, IconButton, Typography } from '@mui/material';
import { Controller } from 'react-hook-form';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { SeedType, LocationWithChamber, Chamber } from '../../../../types';
import { getProductItemErrors, BatchFormData } from '../utils/batchFormValidation';

// Componente customizado para informações básicas sem cliente
import { BatchProductItemBasicInfo } from './BatchProductItemBasicInfo';
import { BatchProductQuantityWeight } from './BatchProductQuantityWeight';
import { BatchProductAdditionalInfo } from './BatchProductAdditionalInfo';

interface BatchProductItemProps {
  form: UseFormReturn<BatchFormData>;
  productIndex: number;
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[];
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export const BatchProductItem: React.FC<BatchProductItemProps> = React.memo(({
  form,
  productIndex,
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  onRemove,
  canRemove,
}) => {
  const { register } = form;
  const errors = form.formState.errors;
  const productErrors = getProductItemErrors(errors, productIndex);

  // Watch values for this specific product
  const quantity = form.watch(`products.${productIndex}.quantity`) || 0;
  const weightPerUnit = form.watch(`products.${productIndex}.weightPerUnit`) || 0;
  const totalWeight = quantity * weightPerUnit;

  return (
    <Grid size={12}>
      <Box sx={{ 
        border: '1px solid', 
        borderColor: 'divider', 
        borderRadius: 2, 
        p: 2, 
        mb: 3, 
        position: 'relative',
        backgroundColor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Produto #{productIndex + 1}
          </Typography>
          {canRemove && (
            <IconButton
              aria-label="remover produto"
              onClick={() => onRemove(productIndex)}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Informações Básicas (sem cliente) */}
          <BatchProductItemBasicInfo
            form={form}
            seedTypes={seedTypes}
            errors={productErrors}
            productIndex={productIndex}
          />

          {/* Quantidade e Peso */}
          <Grid size={12}>
            <BatchProductQuantityWeight
              form={form}
              productIndex={productIndex}
              errors={productErrors}
            />
          </Grid>

          {/* Informações Adicionais */}
          <Grid size={12}>
            <BatchProductAdditionalInfo
              form={form}
              productIndex={productIndex}
              errors={productErrors}
            />
          </Grid>

          {/* Seção de Rastreamento removida para compatibilidade com API */}
        </Grid>
      </Box>
    </Grid>
  );
});

BatchProductItem.displayName = 'BatchProductItem';