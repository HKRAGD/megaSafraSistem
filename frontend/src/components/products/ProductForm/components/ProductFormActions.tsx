import React from 'react';
import {
  Grid,
  Box,
  Button,
} from '@mui/material';
import {
  Save as SaveIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import { CapacityInfo } from '../utils/productFormUtils';

interface ProductFormActionsProps {
  isSubmitting: boolean;
  isEditing: boolean;
  capacityInfo: CapacityInfo | null;
  onCancel: () => void;
}

export const ProductFormActions: React.FC<ProductFormActionsProps> = React.memo(({
  isSubmitting,
  isEditing,
  capacityInfo,
  onCancel,
}) => {
  return (
    <Grid size={12}>
      <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={isSubmitting}
          startIcon={<CancelIcon />}
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          variant="contained"
          disabled={isSubmitting || (capacityInfo?.exceedsCapacity ?? false)}
          startIcon={<SaveIcon />}
        >
          {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar' : 'Criar'} Produto
        </Button>
      </Box>
    </Grid>
  );
});

ProductFormActions.displayName = 'ProductFormActions'; 