import React from 'react';
import {
  Box,
  Typography,
  Grid,
} from '@mui/material';

interface MovementHistorySummaryProps {
  stats: {
    total: number;
    entry: number;
    exit: number;
    transfer: number;
    adjustment: number;
    totalWeight: number;
    totalQuantity: number;
  };
}

export const MovementHistorySummary: React.FC<MovementHistorySummaryProps> = React.memo(({
  stats,
}) => {
  return (
    <Box sx={{ mt: 3, p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
      <Typography variant="subtitle2" gutterBottom>
        Resumo do período
      </Typography>
      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Total de movimentações
          </Typography>
          <Typography variant="h6">
            {stats.total}
          </Typography>
        </Grid>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Entradas
          </Typography>
          <Typography variant="h6" color="success.main">
            {stats.entry}
          </Typography>
        </Grid>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Saídas
          </Typography>
          <Typography variant="h6" color="error.main">
            {stats.exit}
          </Typography>
        </Grid>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Transferências
          </Typography>
          <Typography variant="h6" color="info.main">
            {stats.transfer}
          </Typography>
        </Grid>
      </Grid>
      {/* Segunda linha com totais */}
      <Grid container spacing={2} sx={{ mt: 1 }}>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Ajustes
          </Typography>
          <Typography variant="h6" color="warning.main">
            {stats.adjustment}
          </Typography>
        </Grid>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Peso Total
          </Typography>
          <Typography variant="h6">
            {stats.totalWeight.toFixed(2)} kg
          </Typography>
        </Grid>
        <Grid
          size={{
            xs: 6,
            sm: 3
          }}>
          <Typography variant="body2" color="text.secondary">
            Quantidade Total
          </Typography>
          <Typography variant="h6">
            {stats.totalQuantity} un
          </Typography>
        </Grid>
      </Grid>
    </Box>
  );
}); 