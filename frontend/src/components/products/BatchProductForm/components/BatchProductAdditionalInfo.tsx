import React from 'react';
import { Grid, TextField, Typography, Card, CardContent } from '@mui/material';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import { BatchFormData } from '../utils/batchFormValidation';

interface BatchProductAdditionalInfoProps {
  form: UseFormReturn<BatchFormData>;
  productIndex: number;
  errors: FieldErrors<BatchFormData['products'][number]>;
}

export const BatchProductAdditionalInfo: React.FC<BatchProductAdditionalInfoProps> = React.memo(({
  form,
  productIndex,
  errors,
}) => {
  const { register } = form;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Informações Adicionais
        </Typography>
        <Grid container spacing={2}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField
              fullWidth
              type="date"
              label="Data de Validade"
              {...register(`products.${productIndex}.expirationDate`)}
              error={!!errors.expirationDate}
              helperText={errors.expirationDate?.message}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Observações adicionais"
              {...register(`products.${productIndex}.notes`)}
              error={!!errors.notes}
              helperText={errors.notes?.message}
              placeholder="Observações adicionais..."
            />
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
});

BatchProductAdditionalInfo.displayName = 'BatchProductAdditionalInfo';