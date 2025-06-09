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
  Schedule as DateIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { formatDate } from '../utils/productDetailsUtils';

interface ProductDetailsExpirationProps {
  expirationData: {
    entryDate: Date;
    expirationDate: Date | null;
    expirationInfo: {
      label: string;
      color: 'success' | 'warning' | 'error' | 'info';
      daysRemaining: number;
      isExpired: boolean;
      isNearExpiration: boolean;
    } | null;
  } | null;
}

export const ProductDetailsExpiration: React.FC<ProductDetailsExpirationProps> = React.memo(({
  expirationData,
}) => {
  if (!expirationData) return null;

  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Card variant="outlined">
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <DateIcon color="primary" sx={{ mt: 0.5 }} />
            <Box sx={{ flex: 1 }}>
              <Typography variant="h6" gutterBottom>
                Datas
              </Typography>
              
              <Grid container spacing={2}>
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    Data de Entrada
                  </Typography>
                  <Typography variant="body1" fontWeight="medium">
                    {formatDate(expirationData.entryDate)}
                  </Typography>
                </Grid>
                
                <Grid size={12}>
                  <Typography variant="body2" color="text.secondary">
                    Data de Expiração
                  </Typography>
                  {expirationData.expirationDate ? (
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        {formatDate(expirationData.expirationDate)}
                      </Typography>
                      
                      {expirationData.expirationInfo && (
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Chip
                            label={expirationData.expirationInfo.label}
                            color={expirationData.expirationInfo.color}
                            size="small"
                            icon={
                              (expirationData.expirationInfo.isExpired || 
                               expirationData.expirationInfo.isNearExpiration) 
                                ? <WarningIcon fontSize="small" /> 
                                : undefined
                            }
                          />
                        </Box>
                      )}
                    </Box>
                  ) : (
                    <Typography variant="body1" color="text.secondary">
                      Não informada
                    </Typography>
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