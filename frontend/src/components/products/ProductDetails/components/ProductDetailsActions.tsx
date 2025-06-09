import React from 'react';
import {
  Button,
  Box,
} from '@mui/material';
import {
  Edit as EditIcon,
  SwapHoriz as MoveIcon,
  History as HistoryIcon,
  Delete as DeleteIcon,
} from '@mui/icons-material';

interface ProductDetailsActionsProps {
  handleEdit: () => void;
  handleMove: () => void;
  handleViewHistory: () => void;
  handleDelete: () => void;
  product: any; // Pode ser null
}

export const ProductDetailsActions: React.FC<ProductDetailsActionsProps> = React.memo(({
  handleEdit,
  handleMove,
  handleViewHistory,
  handleDelete,
  product,
}) => {
  if (!product) return null;

  return (
    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
      <Button
        onClick={handleEdit}
        startIcon={<EditIcon />}
        variant="outlined"
        color="primary"
      >
        Editar
      </Button>
      
      <Button
        onClick={handleMove}
        startIcon={<MoveIcon />}
        variant="outlined"
        color="info"
      >
        Mover
      </Button>
      
      <Button
        onClick={handleViewHistory}
        startIcon={<HistoryIcon />}
        variant="outlined"
        color="secondary"
      >
        Histórico
      </Button>
      
      <Button
        onClick={handleDelete}
        startIcon={<DeleteIcon />}
        variant="outlined"
        color="error"
      >
        Remover
      </Button>
    </Box>
  );
}); 