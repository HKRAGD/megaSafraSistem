import React from 'react';
import { Grid, TextField, Typography, Box, Card, CardContent } from '@mui/material';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import { BatchFormData } from '../utils/batchFormValidation';

interface BatchProductQuantityWeightProps {
  form: UseFormReturn<BatchFormData>;
  productIndex: number;
  errors: FieldErrors<BatchFormData['products'][number]>;
}

export const BatchProductQuantityWeight: React.FC<BatchProductQuantityWeightProps> = React.memo(({
  form,
  productIndex,
  errors,
}) => {
  const { register, watch } = form;
  const quantity = watch(`products.${productIndex}.quantity`) || 0;
  const weightPerUnit = watch(`products.${productIndex}.weightPerUnit`) || 0;
  const totalWeight = quantity * weightPerUnit;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Quantidade e Peso
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Quantidade"
              {...register(`products.${productIndex}.quantity`)}
              error={!!errors.quantity}
              helperText={errors.quantity?.message}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <TextField
              fullWidth
              type="number"
              label="Peso por unidade (kg)"
              {...register(`products.${productIndex}.weightPerUnit`)}
              error={!!errors.weightPerUnit}
              helperText={errors.weightPerUnit?.message}
              inputProps={{ step: 0.01 }}
            />
          </Grid>
          <Grid size={{ xs: 12, md: 4 }}>
            <Box sx={{
              p: 2,
              border: '1px solid #e0e0e0',
              borderRadius: 1,
              backgroundColor: '#f5f5f5',
              display: 'flex',
              alignItems: 'center',
              minHeight: '56px'
            }}>
              <Typography variant="body1" sx={{ fontWeight: 500 }}>
                Total: {totalWeight.toFixed(2)} kg
              </Typography>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
});

BatchProductQuantityWeight.displayName = 'BatchProductQuantityWeight';