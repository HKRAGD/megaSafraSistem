import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Paper,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useReports } from '../../hooks/useReports';
import { ProductStatus } from '../../types';

// Funções auxiliares para mapear dados relacionais
const getSeedTypeName = (product: any) => {
  if (product.seedTypeId && typeof product.seedTypeId === 'object') {
    return product.seedTypeId.name || 'N/A';
  }
  if (product.seedType && typeof product.seedType === 'object') {
    return product.seedType.name || 'N/A';
  }
  return 'N/A';
};

const getLocationCode = (product: any) => {
  if (product.locationId && typeof product.locationId === 'object') {
    return product.locationId.code || 'N/A';
  }
  if (product.location && typeof product.location === 'object') {
    return product.location.code || 'N/A';
  }
  return 'N/A';
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'stored': return 'Armazenado';
    case 'reserved': return 'Reservado';
    case 'removed': return 'Removido';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'stored': return 'success';
    case 'reserved': return 'warning';
    case 'removed': return 'error';
    default: return 'default';
  }
};

export const InventoryReport: React.FC = () => {
  const [filters, setFilters] = useState({
    chamberId: '',
    seedTypeId: '',
    status: '',
  });

  const { 
    loading, 
    error, 
    inventoryData: reportData, 
    generateInventoryReport, 
    exportToPDF, 
    exportToExcel 
  } = useReports();

  // Carregar dados automaticamente quando o componente for montado
  useEffect(() => {
    handleGenerateReport();
  }, []);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateReport = async () => {
    const reportFilters = {
      chamberId: filters.chamberId || undefined,
      seedTypeId: filters.seedTypeId || undefined,
      status: (filters.status as ProductStatus) || undefined,
    };
    await generateInventoryReport(reportFilters);
  };

  const handleExportPDF = () => {
    console.log('Exportar PDF - Feature será implementada');
    alert('Funcionalidade de exportação será implementada em breve');
  };

  const handleExportExcel = () => {
    console.log('Exportar Excel - Feature será implementada');
    alert('Funcionalidade de exportação será implementada em breve');
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Relatório de Inventário
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
            onClick={handleExportPDF}
            disabled={!reportData || loading}
            color="error"
          >
            PDF
          </Button>
          <Button
            startIcon={<ExcelIcon />}
            onClick={handleExportExcel}
            disabled={!reportData || loading}
            color="success"
          >
            Excel
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon fontSize="small" />
            Filtros
          </Typography>
          
          <Grid container spacing={3}>
            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Câmara</InputLabel>
                <Select
                  value={filters.chamberId}
                  label="Câmara"
                  onChange={(e) => handleFilterChange('chamberId', e.target.value)}
                >
                  <MenuItem value="">Todas as câmaras</MenuItem>
                  <MenuItem value="1">Câmara A</MenuItem>
                  <MenuItem value="2">Câmara B</MenuItem>
                  <MenuItem value="3">Câmara C</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Semente</InputLabel>
                <Select
                  value={filters.seedTypeId}
                  label="Tipo de Semente"
                  onChange={(e) => handleFilterChange('seedTypeId', e.target.value)}
                >
                  <MenuItem value="">Todos os tipos</MenuItem>
                  <MenuItem value="1">Milho</MenuItem>
                  <MenuItem value="2">Soja</MenuItem>
                  <MenuItem value="3">Trigo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid size={{ xs: 12, md: 4 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">Todos os status</MenuItem>
                  <MenuItem value="stored">Armazenado</MenuItem>
                  <MenuItem value="reserved">Reservado</MenuItem>
                  <MenuItem value="removed">Removido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!reportData && !loading && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Clique em "Atualizar" para gerar o relatório de inventário
        </Alert>
      )}

      {reportData && !loading && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resumo do Inventário
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {reportData.summary?.totalProducts || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Produtos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {reportData.summary?.totalWeight || 0}kg
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Peso Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {reportData.summary?.locationsOccupied || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Localizações Ocupadas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {reportData.summary?.occupancyRate || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taxa de Ocupação
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Detalhes do Inventário
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Produto</TableCell>
                    <TableCell>Lote</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Localização</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Peso (kg)</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Vencimento</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.products?.map((product: any) => (
                    <TableRow key={product.id}>
                      <TableCell>{product.name}</TableCell>
                      <TableCell>{product.lot}</TableCell>
                      <TableCell>{getSeedTypeName(product)}</TableCell>
                      <TableCell>{getLocationCode(product)}</TableCell>
                      <TableCell align="right">{product.quantity}</TableCell>
                      <TableCell align="right">{product.totalWeight}</TableCell>
                      <TableCell>
                        <Chip 
                          label={getStatusLabel(product.status)}
                          color={getStatusColor(product.status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {product.expirationDate 
                          ? new Date(product.expirationDate).toLocaleDateString()
                          : '-'
                        }
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {(!reportData.products || reportData.products.length === 0) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nenhum produto encontrado com os filtros aplicados.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 