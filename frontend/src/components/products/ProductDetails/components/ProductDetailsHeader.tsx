import React from 'react';
import {
  DialogTitle,
  Typography,
  IconButton,
  Box,
} from '@mui/material';
import {
  Close as CloseIcon,
} from '@mui/icons-material';

interface ProductDetailsHeaderProps {
  onClose: () => void;
}

export const ProductDetailsHeader: React.FC<ProductDetailsHeaderProps> = React.memo(({
  onClose,
}) => {
  return (
    <DialogTitle>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h5" component="div">
          Detalhes do Produto
        </Typography>
        <IconButton
          edge="end"
          color="inherit"
          onClick={onClose}
          aria-label="Fechar"
          size="small"
        >
          <CloseIcon />
        </IconButton>
      </Box>
    </DialogTitle>
  );
}); 