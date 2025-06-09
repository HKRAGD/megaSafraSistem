import React from 'react';
import {
  DialogTitle,
  Typography,
  Box,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import { Product } from '../../../../types';

interface MovementHistoryHeaderProps {
  product: Product | null;
  loading: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export const MovementHistoryHeader: React.FC<MovementHistoryHeaderProps> = React.memo(({
  product,
  loading,
  onClose,
  onRefresh,
}) => {
  return (
    <DialogTitle>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h6">Histórico de Movimentações</Typography>
          <Typography variant="body2" color="text.secondary">
            {product?.name || 'N/A'} - Lote: {product?.lot || 'N/A'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={onRefresh} disabled={loading} size="small">
            <RefreshIcon />
          </IconButton>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </Box>
    </DialogTitle>
  );
}); 