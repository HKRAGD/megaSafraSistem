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
import { formatWeight } from '../../utils/displayHelpers';
import { exportExpirationPdf, exportExpirationExcel } from '../../services/export/expirationExport';

export const ExpirationReport: React.FC = () => {
  const { 
    loading, 
    error, 
    expirationData: reportData, 
    generateExpirationReport
  } = useReports();
  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const handleGenerateReport = async () => {
    console.log('🔍 DEBUG ExpirationReport - Generating report...');
    const result = await generateExpirationReport({ expirationDays: 30 });
    console.log('🔍 DEBUG ExpirationReport - Result:', result);
  };

  const getExpirationColor = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'error'; // Vencido
    if (diffDays <= 7) return 'error'; // Crítico
    if (diffDays <= 15) return 'warning'; // Atenção
    return 'info'; // Normal
  };

  const getDaysToExpire = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return `Vencido há ${Math.abs(diffDays)} dias`;
    if (diffDays === 0) return 'Vence hoje';
    return `${diffDays} dias`;
  };

  const getStatusLabel = (expirationDate: string) => {
    const today = new Date();
    const expDate = new Date(expirationDate);
    const diffTime = expDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return 'Vencido';
    if (diffDays <= 7) return 'Crítico';
    if (diffDays <= 15) return 'Atenção';
    return 'Normal';
  };


  const handleExportPDF = async () => {
    if (!reportData?.products?.length) {
      showSnackbar('Não há dados para exportar', 'error');
      return;
    }
    
    setExportLoading(true);
    try {
      await exportExpirationPdf(reportData.products, {
        reportTitle: 'Relatório de Produtos Próximos ao Vencimento',
        filtersApplied: 'Produtos com vencimento em até 30 dias',
        author: 'Sistema de Câmaras Refrigeradas',
        includeMetadata: true
      });
      showSnackbar('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      showSnackbar('Erro ao gerar relatório PDF. Tente novamente.', 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData?.products?.length) {
      showSnackbar('Não há dados para exportar', 'error');
      return;
    }
    
    setExportLoading(true);
    try {
      await exportExpirationExcel(reportData.products, {
        reportTitle: 'Relatório de Produtos Próximos ao Vencimento',
        filtersApplied: 'Produtos com vencimento em até 30 dias',
        author: 'Sistema de Câmaras Refrigeradas',
        excelSheetName: 'Expiração'
      });
      showSnackbar('Planilha Excel gerada com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      showSnackbar('Erro ao gerar planilha Excel. Tente novamente.', 'error');
    } finally {
      setExportLoading(false);
    }
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
            startIcon={exportLoading ? <CircularProgress size={16} /> : <PdfIcon />}
            disabled={!reportData || loading || exportLoading}
            color="error"
            onClick={handleExportPDF}
          >
            PDF
          </Button>
          <Button
            startIcon={exportLoading ? <CircularProgress size={16} /> : <ExcelIcon />}
            disabled={!reportData || loading || exportLoading}
            color="success"
            onClick={handleExportExcel}
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
                          label={getDaysToExpire(product.expirationDate)}
                          color={getExpirationColor(product.expirationDate) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell align="right">{product.quantity}</TableCell>
                      <TableCell align="right">{formatWeight(product.totalWeight || product.weight || 0)}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(product.expirationDate)}
                          color={getExpirationColor(product.expirationDate) as any}
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