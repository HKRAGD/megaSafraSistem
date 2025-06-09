import React from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Button,
} from '@mui/material';

interface MovementHistoryEmptyProps {
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  isFiltered: boolean;
  onRetry: () => void;
}

export const MovementHistoryEmpty: React.FC<MovementHistoryEmptyProps> = React.memo(({
  loading,
  error,
  isEmpty,
  isFiltered,
  onRetry,
}) => {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button size="small" onClick={onRetry}>
            Tentar novamente
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  if (isEmpty) {
    return (
      <Alert severity="info">
        Nenhuma movimentação encontrada para este produto
      </Alert>
    );
  }

  if (isFiltered) {
    return (
      <Alert severity="info">
        Nenhuma movimentação encontrada com os filtros aplicados
      </Alert>
    );
  }

  return null;
}); 