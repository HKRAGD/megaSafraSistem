import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  Card,
  CardContent,
  InputAdornment,
} from '@mui/material';
import { Calculate as CalculateIcon } from '@mui/icons-material';
import { UseFormReturn } from 'react-hook-form';

interface ProductFormQuantityWeightProps {
  form: UseFormReturn<any>;
  totalWeight: number;
  errors: any;
}

export const ProductFormQuantityWeight: React.FC<ProductFormQuantityWeightProps> = React.memo(({
  form,
  totalWeight,
  errors,
}) => {
  const { register } = form;

  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Quantidade e Peso
          </Typography>
          
          <Grid container spacing={2} alignItems="center">
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <TextField
                fullWidth
                type="number"
                label="Quantidade"
                {...register('quantity')}
                error={!!errors.quantity}
                helperText={errors.quantity?.message}
                InputProps={{
                  endAdornment: <InputAdornment position="end">unidades</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <TextField
                fullWidth
                type="number"
                label="Peso por Unidade"
                {...register('weightPerUnit')}
                error={!!errors.weightPerUnit}
                helperText={errors.weightPerUnit?.message}
                InputProps={{
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                }}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <TextField
                fullWidth
                label="Peso Total"
                value={totalWeight.toFixed(2)}
                InputProps={{
                  readOnly: true,
                  endAdornment: <InputAdornment position="end">kg</InputAdornment>,
                  startAdornment: <CalculateIcon color="action" sx={{ mr: 1 }} />,
                }}
                sx={{ backgroundColor: 'grey.50' }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
});

ProductFormQuantityWeight.displayName = 'ProductFormQuantityWeight'; 