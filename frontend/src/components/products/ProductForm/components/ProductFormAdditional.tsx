import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Controller, UseFormReturn } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

interface ProductFormAdditionalProps {
  form: UseFormReturn<any>;
  errors: any;
}

export const ProductFormAdditional: React.FC<ProductFormAdditionalProps> = React.memo(({
  form,
  errors,
}) => {
  const { register, control } = form;

  return (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações Adicionais
          </Typography>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="expirationDate"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    label="Data de Expiração"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!errors.expirationDate,
                        helperText: errors.expirationDate?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                multiline
                rows={4}
                label="Observações"
                {...register('notes')}
                error={!!errors.notes}
                helperText={errors.notes?.message}
                placeholder="Informações adicionais sobre o produto..."
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
});

ProductFormAdditional.displayName = 'ProductFormAdditional'; 