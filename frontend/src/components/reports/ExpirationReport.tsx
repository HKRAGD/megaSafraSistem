import React, { useState } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Paper,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { useReports } from '../../hooks/useReports';

export const ExpirationReport: React.FC = () => {
  const { 
    loading, 
    error, 
    expirationData: reportData, 
    generateExpirationReport, 
    exportToPDF, 
    exportToExcel 
  } = useReports();

  const handleGenerateReport = async () => {
    console.log('🔍 DEBUG ExpirationReport - Generating report...');
    const result = await generateExpirationReport({ expirationDays: 30 });
    console.log('🔍 DEBUG ExpirationReport - Result:', result);
  };

  const getExpirationColor = (days: number) => {
    if (days <= 7) return 'error';
    if (days <= 15) return 'warning';
    return 'info';
  };

  // Funções auxiliares para mapear dados relacionais
  const getLocationCode = (product: any) => {
    if (product.locationId && typeof product.locationId === 'object') {
      return product.locationId.code || 'N/A';
    }
    if (product.location && typeof product.location === 'object') {
      return product.location.code || 'N/A';
    }
    return 'N/A';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Produtos Próximos ao Vencimento
        </Typography>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleGenerateReport}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            startIcon={<PdfIcon />}
            disabled={!reportData || loading}
            color="error"
            onClick={() => reportData && exportToPDF(reportData, 'expiration')}
          >
            PDF
          </Button>
          <Button
            startIcon={<ExcelIcon />}
            disabled={!reportData || loading}
            color="success"
            onClick={() => reportData && exportToExcel(reportData, 'expiration')}
          >
            Excel
          </Button>
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {!reportData && !loading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Clique em "Atualizar" para gerar o relatório de vencimentos
        </Alert>
      )}

      {reportData && !loading && (
        <Card>
          <CardContent>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Localização</TableCell>
                    <TableCell>Data de Vencimento</TableCell>
                    <TableCell>Dias para Vencer</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Peso (kg)</TableCell>
                    <TableCell>Status</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.lot}</TableCell>
                      <TableCell>{getLocationCode(product)}</TableCell>
                      <TableCell>
                        {new Date(product.expirationDate).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={`${product.daysToExpire} dias`}
                          color={getExpirationColor(product.daysToExpire) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{product.quantity}</TableCell>
                      <TableCell align="right">{product.totalWeight || product.weight || 0}</TableCell>
                      <TableCell>
                        <Chip 
                          label={product.daysToExpire <= 7 ? 'Crítico' : 'Atenção'}
                          color={product.daysToExpire <= 7 ? 'error' : 'warning'}
                          size="small"
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 