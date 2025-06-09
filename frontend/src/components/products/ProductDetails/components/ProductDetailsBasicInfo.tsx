import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import {
  Inventory as ProductIcon,
} from '@mui/icons-material';

interface ProductDetailsBasicInfoProps {
  basicInfo: {
    name: string;
    lot: string;
    seedTypeName: string;
    status: {
      label: string;
      color: 'success' | 'warning' | 'error' | 'info';
      variant: 'filled' | 'outlined';
    } | null;
    id: string;
  } | null;
}

export const ProductDetailsBasicInfo: React.FC<ProductDetailsBasicInfoProps> = React.memo(({
  basicInfo,
}) => {
  if (!basicInfo) return null;

  return (
    <Grid size={12}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <ProductIcon color="primary" sx={{ mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                {basicInfo.name}
              </Typography>
              
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Lote
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {basicInfo.lot}
                  </Typography>
                </Grid>
                
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Typography variant="body2" color="text.secondary">
                    Tipo de Semente
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {basicInfo.seedTypeName}
                  </Typography>
                </Grid>
                
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  {basicInfo.status && (
                    <Chip
                      label={basicInfo.status.label}
                      color={basicInfo.status.color}
                      variant={basicInfo.status.variant}
                      size="small"
                    />
                  )}
                </Grid>
              </Grid>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}); 