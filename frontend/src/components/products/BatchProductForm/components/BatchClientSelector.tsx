import React from 'react';
import {
  Grid,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Controller, UseFormReturn, FieldErrors } from 'react-hook-form';
import { ClientSelector } from '../../../ui/ClientSelector';
import { BatchFormData } from '../utils/batchFormValidation';

interface BatchClientSelectorProps {
  form: UseFormReturn<BatchFormData>;
  errors: FieldErrors<BatchFormData>;
}

export const BatchClientSelector: React.FC<BatchClientSelectorProps> = React.memo(({
  form,
  errors,
}) => {
  const { control } = form;

  return (
    <Grid size={12}>
      <Card sx={{ border: '2px solid', borderColor: 'primary.main', mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ color: 'primary.main', fontWeight: 600 }}>
            Cliente do Lote
          </Typography>
          
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecione o cliente que receberá todos os produtos deste lote.
          </Typography>
          
          <Controller
            name="clientId"
            control={control}
            render={({ field }) => (
              <ClientSelector
                value={field.value}
                onChange={field.onChange}
                error={!!errors.clientId}
                helperText={errors.clientId?.message}
                label="Cliente"
                placeholder="Selecione o cliente para este lote..."
                required
              />
            )}
          />
        </CardContent>
      </Card>
    </Grid>
  );
});

BatchClientSelector.displayName = 'BatchClientSelector';