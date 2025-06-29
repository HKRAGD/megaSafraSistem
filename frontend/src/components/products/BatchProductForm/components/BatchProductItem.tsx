import React from 'react';
import { Box, Grid, IconButton, Typography, Card, CardContent, TextField, MenuItem } from '@mui/material';
import { Controller } from 'react-hook-form';
import { UseFormReturn, FieldErrors } from 'react-hook-form';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { SeedType, LocationWithChamber, Chamber } from '../../../../types';
import { getProductItemErrors, BatchFormData } from '../utils/batchFormValidation';

// Componente customizado para informações básicas sem cliente
import { BatchProductItemBasicInfo } from './BatchProductItemBasicInfo';

interface BatchProductItemProps {
  form: UseFormReturn<BatchFormData>;
  productIndex: number;
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[];
  onRemove: (index: number) => void;
  canRemove: boolean;
}

export const BatchProductItem: React.FC<BatchProductItemProps> = React.memo(({
  form,
  productIndex,
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  onRemove,
  canRemove,
}) => {
  const { register } = form;
  const errors = form.formState.errors;
  const productErrors = getProductItemErrors(errors, productIndex);

  // Watch values for this specific product
  const quantity = form.watch(`products.${productIndex}.quantity`) || 0;
  const weightPerUnit = form.watch(`products.${productIndex}.weightPerUnit`) || 0;
  const totalWeight = quantity * weightPerUnit;

  return (
    <Grid size={12}>
      <Box sx={{ 
        border: '1px solid', 
        borderColor: 'divider', 
        borderRadius: 2, 
        p: 2, 
        mb: 3, 
        position: 'relative',
        backgroundColor: 'background.paper'
      }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h3" gutterBottom>
            Produto #{productIndex + 1}
          </Typography>
          {canRemove && (
            <IconButton
              aria-label="remover produto"
              onClick={() => onRemove(productIndex)}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Box>

        <Grid container spacing={3}>
          {/* Informações Básicas (sem cliente) */}
          <BatchProductItemBasicInfo
            form={form}
            seedTypes={seedTypes}
            errors={productErrors}
            productIndex={productIndex}
          />

          {/* Quantidade e Peso - Inline devido à complexidade de adaptar o componente existente */}
          <Grid size={12}>
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
                      error={!!productErrors.quantity}
                      helperText={productErrors.quantity?.message}
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 4 }}>
                    <TextField
                      fullWidth
                      type="number"
                      label="Peso por unidade (kg)"
                      {...register(`products.${productIndex}.weightPerUnit`)}
                      error={!!productErrors.weightPerUnit}
                      helperText={productErrors.weightPerUnit?.message}
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
          </Grid>

          {/* Informações Adicionais */}
          <Grid size={12}>
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
                      error={!!productErrors.expirationDate}
                      helperText={productErrors.expirationDate?.message}
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
                      error={!!productErrors.notes}
                      helperText={productErrors.notes?.message}
                      placeholder="Observações adicionais..."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Rastreamento */}
          <Grid size={12}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações de Rastreamento
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Número do lote"
                      {...register(`products.${productIndex}.tracking.batchNumber`)}
                      placeholder="Número do lote"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Origem"
                      {...register(`products.${productIndex}.tracking.origin`)}
                      placeholder="Origem"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                      fullWidth
                      label="Fornecedor"
                      {...register(`products.${productIndex}.tracking.supplier`)}
                      placeholder="Fornecedor"
                    />
                  </Grid>
                  
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name={`products.${productIndex}.tracking.qualityGrade`}
                      control={form.control}
                      render={({ field }) => (
                        <TextField
                          select
                          fullWidth
                          label="Grau de Qualidade"
                          {...field}
                        >
                          <MenuItem value="A">Grau A</MenuItem>
                          <MenuItem value="B">Grau B</MenuItem>
                          <MenuItem value="C">Grau C</MenuItem>
                          <MenuItem value="D">Grau D</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Grid>
  );
});

BatchProductItem.displayName = 'BatchProductItem';