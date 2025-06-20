import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
} from '@mui/material';
import {
  Scale as WeightIcon,
} from '@mui/icons-material';

interface ProductDetailsQuantityWeightProps {
  quantityInfo: {
    quantity: number;
    storageType: string;
    weightPerUnit: string;
    totalWeight: string;
  } | null;
}

export const ProductDetailsQuantityWeight: React.FC<ProductDetailsQuantityWeightProps> = React.memo(({
  quantityInfo,
}) => {
  if (!quantityInfo) return null;

  return (
    <Grid item xs={12} md={6}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <WeightIcon color="primary" sx={{ mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Quantidade e Peso
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Quantidade
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {quantityInfo.quantity} {quantityInfo.storageType}
                  </Typography>
                </Grid>
                
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Peso por Unidade
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {quantityInfo.weightPerUnit}
                  </Typography>
                </Grid>
                
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Peso Total
                  </Typography>
                  <Typography variant="h6" color="primary">
                    {quantityInfo.totalWeight}
                  </Typography>
                </Grid>
              </Grid>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}); 