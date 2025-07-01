import React from 'react';
import {
  Button,
  Box,
  Typography,
  Chip,
  Stack,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
  Add as AddIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';

interface BatchFormActionsActiveProps {
  loading: boolean;
  isFormValid: boolean;
  totalProducts: number;
  totalBatchWeight: number;
  canAddProduct: boolean;
  maxProducts: number;
  onAddProduct: () => void;
  onCancel: () => void;
}

export const BatchFormActionsActive: React.FC<BatchFormActionsActiveProps> = React.memo(({
  loading,
  isFormValid,
  totalProducts,
  totalBatchWeight,
  canAddProduct,
  maxProducts,
  onAddProduct,
  onCancel,
}) => {
  return (
    <Box sx={{ 
      p: 3, 
      backgroundColor: 'grey.50', 
      borderRadius: 2,
      border: '1px solid',
      borderColor: 'grey.200'
    }}>
      {/* Resumo do Lote */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Resumo do Lote
        </Typography>
        
        <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
          <Chip 
            label={`${totalProducts} produto${totalProducts !== 1 ? 's' : ''}`}
            color="primary" 
            variant="outlined"
          />
          <Chip 
            label={`${totalBatchWeight.toFixed(2)} kg total`}
            color="secondary" 
            variant="outlined"
          />
        </Stack>
        
        {!isFormValid && (
          <Box sx={{ display: 'flex', alignItems: 'center', color: 'warning.main', mb: 2 }}>
            <WarningIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="body2">
              Preencha todos os campos obrigatórios e selecione um cliente
            </Typography>
          </Box>
        )}
      </Box>

      {/* Botão Adicionar Produto */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={onAddProduct}
          disabled={!canAddProduct || loading}
          fullWidth
          sx={{ py: 1.5 }}
        >
          {canAddProduct 
            ? `Adicionar Produto (${totalProducts}/${maxProducts})`
            : `Limite máximo de ${maxProducts} produtos atingido`
          }
        </Button>
      </Box>

      {/* Botões de Ação */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          startIcon={<CancelIcon />}
          onClick={onCancel}
          disabled={loading}
          sx={{ minWidth: 120 }}
        >
          Cancelar
        </Button>
        
        <LoadingButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          loading={loading}
          disabled={!isFormValid}
          sx={{ minWidth: 180 }}
        >
          {loading ? 'Cadastrando...' : `Cadastrar Lote (${totalProducts} produtos)`}
        </LoadingButton>
      </Stack>
    </Box>
  );
});

BatchFormActionsActive.displayName = 'BatchFormActionsActive';