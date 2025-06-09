import React from 'react';
import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Controller, UseFormReturn } from 'react-hook-form';

interface ProductFormTrackingProps {
  form: UseFormReturn<any>;
  errors: any;
}

export const ProductFormTracking: React.FC<ProductFormTrackingProps> = React.memo(({
  form,
  errors,
}) => {
  const { register, control } = form;

  return (
    <Grid size={{ xs: 12 }}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Rastreamento
          </Typography>
          
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Número do Lote"
                {...register('tracking.batchNumber')}
                error={!!errors.tracking?.batchNumber}
                helperText={errors.tracking?.batchNumber?.message}
                placeholder="Ex: BATCH-2023-001"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Origem"
                {...register('tracking.origin')}
                error={!!errors.tracking?.origin}
                helperText={errors.tracking?.origin?.message}
                placeholder="Ex: Fazenda São João"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="Fornecedor"
                {...register('tracking.supplier')}
                error={!!errors.tracking?.supplier}
                helperText={errors.tracking?.supplier?.message}
                placeholder="Ex: Sementes Premium Ltda"
              />
            </Grid>
            
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name="tracking.qualityGrade"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label="Grau de Qualidade"
                    {...field}
                    error={!!errors.tracking?.qualityGrade}
                    helperText={errors.tracking?.qualityGrade?.message}
                  >
                    <MenuItem value="A">A - Excelente</MenuItem>
                    <MenuItem value="B">B - Boa</MenuItem>
                    <MenuItem value="C">C - Regular</MenuItem>
                    <MenuItem value="D">D - Baixa</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
});

ProductFormTracking.displayName = 'ProductFormTracking'; 