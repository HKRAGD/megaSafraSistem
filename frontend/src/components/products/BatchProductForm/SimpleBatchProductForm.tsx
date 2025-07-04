import React from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Card,
  CardContent,
  TextField
} from '@mui/material';
import { Controller } from 'react-hook-form';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { SeedType, LocationWithChamber, Chamber } from '../../../types';
import { BatchProductFormInput, useBatchProducts, MAX_BATCH_PRODUCTS } from '../../../hooks/useBatchProducts';
import { ClientSelector } from '../../ui/ClientSelector/ClientSelector';
import { BatchProductItem } from '../BatchProductItem';
import { BatchFormActionsActive } from './components/BatchFormActionsActive';
import { BatchWeightDisplay } from './components/BatchWeightDisplay';

interface SimpleBatchProductFormProps {
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[];
  onSubmit?: (data: BatchProductFormInput) => void;
  onCancel: () => void;
  batchForm: ReturnType<typeof useBatchProducts>;
}

export const SimpleBatchProductForm: React.FC<SimpleBatchProductFormProps> = ({
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  onSubmit,
  onCancel,
  batchForm
}) => {
  const { form, fields, addProduct, removeProduct, submitBatch, loading, error, totalProductsInBatch } = 
    batchForm;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box component="form" onSubmit={submitBatch} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Cliente e Nome do Grupo */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informações do Lote
            </Typography>
            
            {/* Cliente Selector */}
            <Box sx={{ mb: 3 }}>
              <Controller
                name="clientId"
                control={form.control}
                render={({ field, fieldState }) => (
                  <ClientSelector
                    value={field.value}
                    onChange={field.onChange}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    required
                  />
                )}
              />
            </Box>

            {/* Nome do Grupo */}
            <Controller
              name="batchName"
              control={form.control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Nome do Grupo (Opcional)"
                  placeholder="Ex: Fornecedor A - Pedido #123"
                  fullWidth
                  variant="outlined"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message || 'Se não especificado, será usado um nome padrão'}
                  inputProps={{
                    maxLength: 100
                  }}
                />
              )}
            />
          </CardContent>
        </Card>

        {/* Lista de Produtos */}
        <Typography variant="h6" gutterBottom>
          Produtos ({totalProductsInBatch})
        </Typography>

        {fields.map((field, index) => (
          <BatchProductItem
            key={field.id}
            control={form.control}
            productIndex={index}
            seedTypes={seedTypes}
            onRemove={removeProduct}
            canRemove={fields.length > 1}
          />
        ))}

        {/* Ações do Formulário */}
        <BatchWeightDisplay
          control={form.control}
          render={(totalBatchWeight) => (
            <BatchFormActionsActive
              loading={loading}
              isFormValid={form.formState.isValid && fields.length > 0}
              totalProducts={totalProductsInBatch}
              totalBatchWeight={totalBatchWeight}
              canAddProduct={fields.length < MAX_BATCH_PRODUCTS}
              maxProducts={MAX_BATCH_PRODUCTS}
              onAddProduct={addProduct}
              onCancel={onCancel}
            />
          )}
        />
      </Box>
    </LocalizationProvider>
  );
};