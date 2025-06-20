import React from 'react';
import {
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
} from '@mui/material';
import {
  TrackChanges as TrackingIcon,
  Star as QualityIcon,
} from '@mui/icons-material';

interface ProductDetailsTrackingProps {
  trackingInfo: {
    tracking?: {
      batchNumber?: string;
      origin?: string;
      supplier?: string;
      qualityGrade?: 'A' | 'B' | 'C' | 'D';
    };
    notes?: string;
  } | null;
}

const getQualityColor = (grade: string): 'success' | 'warning' | 'error' | 'info' => {
  switch (grade) {
    case 'A': return 'success';
    case 'B': return 'info';
    case 'C': return 'warning';
    case 'D': return 'error';
    default: return 'info';
  }
};

export const ProductDetailsTracking: React.FC<ProductDetailsTrackingProps> = React.memo(({
  trackingInfo,
}) => {
  if (!trackingInfo) return null;

  const { tracking, notes } = trackingInfo;

  return (
    <Grid
      size={{
        xs: 12,
        md: 6
      }}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <TrackingIcon color="primary" sx={{ mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Rastreamento
              </Typography>
              
              <Grid container spacing={2}>
                {tracking?.batchNumber && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      Número do Lote
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {tracking.batchNumber}
                    </Typography>
                  </Grid>
                )}
                
                {tracking?.origin && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      Origem
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {tracking.origin}
                    </Typography>
                  </Grid>
                )}
                
                {tracking?.supplier && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      Fornecedor
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {tracking.supplier}
                    </Typography>
                  </Grid>
                )}
                
                {tracking?.qualityGrade && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Grau de Qualidade
                    </Typography>
                    <Chip
                      label={`Grau ${tracking.qualityGrade}`}
                      color={getQualityColor(tracking.qualityGrade)}
                      size="small"
                      icon={<QualityIcon fontSize="small" />}
                    />
                  </Grid>
                )}
                
                {notes && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      Observações
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {notes}
                    </Typography>
                  </Grid>
                )}
                
                {!tracking?.batchNumber && !tracking?.origin && !tracking?.supplier && 
                 !tracking?.qualityGrade && !notes && (
                  <Grid size={12}>
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma informação de rastreamento disponível
                    </Typography>
                  </Grid>
                )}
              </Grid>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Grid>
  );
}); 