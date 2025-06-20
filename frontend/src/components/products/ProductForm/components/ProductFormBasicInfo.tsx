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
import { SeedType } from '../../../../types';
import { ClientSelector } from '../../../ui/ClientSelector';

interface ProductFormBasicInfoProps {
  form: UseFormReturn<any>;
  seedTypes: SeedType[];
  errors: any;
}

export const ProductFormBasicInfo: React.FC<ProductFormBasicInfoProps> = React.memo(({
  form,
  seedTypes,
  errors,
}) => {
  const { register, control } = form;

  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações Básicas
          </Typography>
          
          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                md: 8
              }}>
              <TextField
                fullWidth
                label="Nome do Produto"
                {...register('name')}
                error={!!errors.name}
                helperText={errors.name?.message}
                placeholder="Ex: Soja Premium Safra 2024"
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 4
              }}>
              <TextField
                fullWidth
                label="Lote"
                {...register('lot')}
                error={!!errors.lot}
                helperText={errors.lot?.message}
                placeholder="Ex: LOT-2024-001"
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Controller
                name="seedTypeId"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label="Tipo de Semente"
                    {...field}
                    error={!!errors.seedTypeId}
                    helperText={errors.seedTypeId?.message}
                  >
                    {seedTypes.map((type) => (
                      <MenuItem key={type.id} value={type.id}>
                        {type.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Controller
                name="storageType"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label="Tipo de Armazenamento"
                    {...field}
                    error={!!errors.storageType}
                    helperText={errors.storageType?.message}
                  >
                    <MenuItem value="saco">Saco</MenuItem>
                    <MenuItem value="bag">Bag</MenuItem>
                  </TextField>
                )}
              />
            </Grid>
            
            <Grid size={12}>
              <Controller
                name="clientId"
                control={control}
                render={({ field }) => (
                  <ClientSelector
                    value={field.value}
                    onChange={field.onChange}
                    error={!!errors.clientId}
                    helperText={errors.clientId?.message}
                    label="Cliente (Opcional)"
                    placeholder="Selecione um cliente..."
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Grid>
  );
});

ProductFormBasicInfo.displayName = 'ProductFormBasicInfo'; 