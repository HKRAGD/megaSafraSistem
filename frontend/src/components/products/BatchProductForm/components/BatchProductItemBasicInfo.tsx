import React from 'react';
import {
  Grid,
  TextField,
  MenuItem,
  Typography,
  Card,
  CardContent,
} from '@mui/material';
import { Controller, UseFormReturn, FieldErrors } from 'react-hook-form';
import { SeedType } from '../../../../types';
import { BatchFormData } from '../utils/batchFormValidation';

interface BatchProductItemBasicInfoProps {
  form: UseFormReturn<BatchFormData>;
  seedTypes: SeedType[];
  errors: any; // Simplified for now
  productIndex: number; // Added for useFieldArray
}

export const BatchProductItemBasicInfo: React.FC<BatchProductItemBasicInfoProps> = React.memo(({
  form,
  seedTypes,
  errors,
  productIndex,
}) => {
  const { register, control } = form;

  return (
    <Grid size={12}>
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Informações Básicas do Produto #{productIndex + 1}
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
                {...register(`products.${productIndex}.name`)}
                error={!!errors?.name}
                helperText={errors?.name?.message}
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
                {...register(`products.${productIndex}.lot`)}
                error={!!errors?.lot}
                helperText={errors?.lot?.message}
                placeholder="Ex: LOT-2024-001"
              />
            </Grid>
            
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Controller
                name={`products.${productIndex}.seedTypeId`}
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label="Tipo de Semente"
                    {...field}
                    error={!!errors?.seedTypeId}
                    helperText={errors?.seedTypeId?.message}
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
                name={`products.${productIndex}.storageType`}
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    label="Tipo de Armazenamento"
                    {...field}
                    error={!!errors?.storageType}
                    helperText={errors?.storageType?.message}
                  >
                    <MenuItem value="saco">Saco</MenuItem>
                    <MenuItem value="bag">Bag</MenuItem>
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

BatchProductItemBasicInfo.displayName = 'BatchProductItemBasicInfo';