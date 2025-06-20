import React from 'react';
import {
  Grid,
  TextField,
  Typography,
  FormControl,
  FormLabel,
  FormControlLabel,
  RadioGroup,
  Radio,
} from '@mui/material';
import { Controller, UseFormReturn, FieldErrors } from 'react-hook-form';
import { ChamberFormData } from './chamberFormValidation';

interface ChamberFormBasicInfoProps {
  form: UseFormReturn<ChamberFormData>;
  errors: FieldErrors<ChamberFormData>;
}

export const ChamberFormBasicInfo: React.FC<ChamberFormBasicInfoProps> = React.memo(({
  form,
  errors,
}) => {
  const { control } = form;

  return (
    <>
      <Grid item xs={12}>
        <Typography variant="h6" gutterBottom>
          Informações Básicas
        </Typography>
      </Grid>

      <Grid
        item xs={12} sm={8}
      >
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Nome da Câmara"
              fullWidth
              error={!!errors.name}
              helperText={errors.name?.message}
              required
              placeholder="Ex: Câmara A1, Armazém Norte..."
            />
          )}
        />
      </Grid>

      <Grid
        item xs={12} sm={4}
      >
        <Controller
          name="status"
          control={control}
          render={({ field }) => (
            <FormControl fullWidth error={!!errors.status}>
              <FormLabel component="legend">Status da Câmara</FormLabel>
              <RadioGroup {...field} row>
                <FormControlLabel
                  value="active"
                  control={<Radio />}
                  label="Ativa"
                />
                <FormControlLabel
                  value="maintenance"
                  control={<Radio />}
                  label="Manutenção"
                />
                <FormControlLabel
                  value="inactive"
                  control={<Radio />}
                  label="Inativa"
                />
              </RadioGroup>
              {errors.status && (
                <Typography variant="caption" color="error">
                  {errors.status.message}
                </Typography>
              )}
            </FormControl>
          )}
        />
      </Grid>

      <Grid item xs={12}>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Descrição"
              fullWidth
              multiline
              rows={3}
              error={!!errors.description}
              helperText={errors.description?.message || 'Descrição opcional da câmara (máx. 500 caracteres)'}
              placeholder="Ex: Câmara para armazenamento de sementes de milho e soja..."
            />
          )}
        />
      </Grid>
    </>
  );
}); 