import React from 'react';
import { Controller, Control } from 'react-hook-form';
import { 
  Box, 
  Grid, 
  Typography, 
  Card, 
  CardContent, 
  IconButton, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  TextField 
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers';
import { SeedType } from '../../../types';
import { BatchProductFormInput } from '../../../hooks/useBatchProducts';

interface BatchProductItemProps {
  control: Control<BatchProductFormInput>;
  productIndex: number;
  seedTypes: SeedType[];
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export const BatchProductItem: React.FC<BatchProductItemProps> = React.memo(
  ({ control, productIndex, seedTypes, onRemove, canRemove }) => {
    return (
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">
              Produto {productIndex + 1}
            </Typography>
            {canRemove && (
              <IconButton 
                onClick={() => onRemove(productIndex)}
                color="error"
                size="small"
              >
                <DeleteIcon />
              </IconButton>
            )}
          </Box>

          <Grid container spacing={2}>
            {/* Nome */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.name`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Nome do Produto"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>

            {/* Lote */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.lot`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Lote"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Grid>

            {/* Tipo de Semente */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.seedTypeId`}
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error} required>
                    <InputLabel>Tipo de Semente</InputLabel>
                    <Select
                      {...field}
                      label="Tipo de Semente"
                    >
                      {seedTypes.map((seedType) => (
                        <MenuItem key={seedType.id} value={seedType.id}>
                          {seedType.name}
                        </MenuItem>
                      ))}
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Quantidade */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.quantity`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Quantidade"
                    type="number"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                    inputProps={{ min: 1, step: 1 }}
                  />
                )}
              />
            </Grid>

            {/* Peso por Unidade */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.weightPerUnit`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Peso por Unidade (kg)"
                    type="number"
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                    inputProps={{ min: 0.001, step: 0.1 }}
                  />
                )}
              />
            </Grid>

            {/* Tipo de Armazenamento */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.storageType`}
                control={control}
                render={({ field, fieldState }) => (
                  <FormControl fullWidth error={!!fieldState.error} required>
                    <InputLabel>Tipo de Armazenamento</InputLabel>
                    <Select
                      {...field}
                      label="Tipo de Armazenamento"
                    >
                      <MenuItem value="saco">Saco</MenuItem>
                      <MenuItem value="bag">Bag</MenuItem>
                    </Select>
                    {fieldState.error && (
                      <Typography variant="caption" color="error">
                        {fieldState.error.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Data de Expiração */}
            <Grid size={{ xs: 12, md: 6 }}>
              <Controller
                name={`products.${productIndex}.expirationDate`}
                control={control}
                render={({ field, fieldState }) => (
                  <DatePicker
                    {...field}
                    label="Data de Expiração"
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        error: !!fieldState.error,
                        helperText: fieldState.error?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Observações */}
            <Grid size={12}>
              <Controller
                name={`products.${productIndex}.notes`}
                control={control}
                render={({ field, fieldState }) => (
                  <TextField
                    {...field}
                    label="Observações"
                    multiline
                    rows={2}
                    fullWidth
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    );
  }
);

BatchProductItem.displayName = 'BatchProductItem';