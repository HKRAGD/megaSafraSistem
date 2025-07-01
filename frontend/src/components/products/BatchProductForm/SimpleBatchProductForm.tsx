import React from 'react';
import {
  Box,
  Button,
  Typography,
  Alert,
  Card,
  CardContent
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
  const { form, fields, addProduct, removeProduct, submitBatch, loading, error, totalProductsInBatch, totalBatchWeight } = 
    batchForm;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box component="form" onSubmit={submitBatch} noValidate>
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Cliente Selector */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Cliente do Lote
            </Typography>
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
      </Box>
    </LocalizationProvider>
  );
};