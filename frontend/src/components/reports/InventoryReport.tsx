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
  Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { useReports } from '../../hooks/useReports';
import { useDashboard } from '../../hooks/useDashboard';
import { useChambers } from '../../hooks/useChambers';
import { useClients } from '../../hooks/useClients';
import { useSeedTypes } from '../../hooks/useSeedTypes';
import { ProductStatus } from '../../types';
import { formatWeightWithUnit, formatWeight, formatWeightSmart } from '../../utils/displayHelpers';
import { exportInventoryPdf, exportInventoryExcel } from '../../services/export';

// Funções auxiliares para mapear dados relacionais
const getSeedTypeName = (product: any) => {
  if (product.seedTypeId && typeof product.seedTypeId === 'object') {
    return product.seedTypeId.name || 'N/A';
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

const getClientName = (product: any) => {
  if (product.clientId && typeof product.clientId === 'object') {
    return product.clientId.name || 'N/A';
  }
  return 'N/A';
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'LOCADO': return 'Armazenado';
    case 'AGUARDANDO_RETIRADA': return 'Aguardando Retirada';
    case 'REMOVIDO': return 'Removido';
    case 'CADASTRADO': return 'Cadastrado';
    case 'AGUARDANDO_LOCACAO': return 'Aguardando Locação';
    case 'RETIRADO': return 'Retirado';
    default: return status;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'LOCADO': return 'success';
    case 'AGUARDANDO_RETIRADA': return 'warning';
    case 'REMOVIDO': return 'error';
    case 'CADASTRADO': return 'info';
    case 'AGUARDANDO_LOCACAO': return 'warning';
    case 'RETIRADO': return 'default';
    default: return 'default';
  }
};

export const InventoryReport: React.FC = () => {
  const [filters, setFilters] = useState({
    chamberId: '',
    seedTypeId: '',
    clientId: '',
    status: '',
  });

  // Estados para controle de exportação
  const [exportLoading, setExportLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success' as 'success' | 'error'
  });

  const { 
    loading, 
    error, 
    inventoryData: reportData, 
    generateInventoryReport
  } = useReports();

  // Use useDashboard para dados de resumo
  const { 
    summary: dashboardSummary, 
    refreshDashboard, 
    loading: dashboardLoading 
  } = useDashboard();

  // Carregar dados reais das câmaras, clientes e tipos de semente
  const { chambers, loading: chambersLoading } = useChambers();
  const { clients, loading: clientsLoading } = useClients();
  const { seedTypes, loading: seedTypesLoading } = useSeedTypes();

  // Carregar dados automaticamente quando o componente for montado
  useEffect(() => {
    handleGenerateReport(); // Para lista detalhada de produtos
    refreshDashboard(); // Para dados de resumo
  }, [refreshDashboard]);

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateReport = async () => {
    const reportFilters = {
      chamberId: filters.chamberId || undefined,
      seedTypeId: filters.seedTypeId || undefined,
      clientId: filters.clientId || undefined,
      status: (filters.status as ProductStatus) || undefined,
    };
    await generateInventoryReport(reportFilters);
  };

  const showSnackbar = (message: string, severity: 'success' | 'error' = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const closeSnackbar = () => {
    setSnackbar(prev => ({ ...prev, open: false }));
  };

  const buildFiltersDescription = () => {
    const appliedFilters = [];
    
    if (filters.chamberId) {
      const chamber = chambers.find(c => c.id === filters.chamberId);
      appliedFilters.push(`Câmara: ${chamber?.name || filters.chamberId}`);
    }
    
    if (filters.seedTypeId) {
      const seedType = seedTypes.find(s => s.id === filters.seedTypeId);
      appliedFilters.push(`Tipo: ${seedType?.name || filters.seedTypeId}`);
    }
    
    if (filters.clientId) {
      const client = clients.find(c => c.id === filters.clientId);
      appliedFilters.push(`Cliente: ${client?.name || filters.clientId}`);
    }
    
    if (filters.status) {
      appliedFilters.push(`Status: ${getStatusLabel(filters.status)}`);
    }
    
    return appliedFilters.length > 0 ? appliedFilters.join(', ') : 'Nenhum filtro aplicado';
  };

  const handleExportPDF = async () => {
    if (!reportData?.products?.length) {
      showSnackbar('Não há dados para exportar', 'error');
      return;
    }

    setExportLoading(true);
    try {
      await exportInventoryPdf(
        reportData.products,
        {
          reportTitle: 'Relatório de Inventário',
          filtersApplied: buildFiltersDescription(),
          author: 'Sistema de Câmaras Refrigeradas',
          includeMetadata: true
        }
      );
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
      await exportInventoryExcel(
        reportData.products,
        {
          reportTitle: 'Relatório de Inventário',
          filtersApplied: buildFiltersDescription(),
          author: 'Sistema de Câmaras Refrigeradas',
          excelSheetName: 'Inventário',
          includeMetadata: true
        }
      );
      showSnackbar('Relatório Excel gerado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      showSnackbar('Erro ao gerar relatório Excel. Tente novamente.', 'error');
    } finally {
      setExportLoading(false);
    }
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
            onClick={() => {
              handleGenerateReport();
              refreshDashboard();
            }}
            disabled={loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading}
          >
            Atualizar
          </Button>
          <Button
            startIcon={exportLoading ? <CircularProgress size={16} /> : <PdfIcon />}
            onClick={handleExportPDF}
            disabled={!reportData || loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading || exportLoading}
            color="error"
          >
            PDF
          </Button>
          <Button
            startIcon={exportLoading ? <CircularProgress size={16} /> : <ExcelIcon />}
            onClick={handleExportExcel}
            disabled={!reportData || loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading || exportLoading}
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
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Câmara</InputLabel>
                <Select
                  value={filters.chamberId}
                  label="Câmara"
                  onChange={(e) => handleFilterChange('chamberId', e.target.value)}
                  disabled={chambersLoading}
                >
                  <MenuItem value="">Todas as câmaras</MenuItem>
                  {chambers.map((chamber) => (
                    <MenuItem key={chamber.id} value={chamber.id}>
                      {chamber.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Semente</InputLabel>
                <Select
                  value={filters.seedTypeId}
                  label="Tipo de Semente"
                  onChange={(e) => handleFilterChange('seedTypeId', e.target.value)}
                  disabled={seedTypesLoading}
                >
                  <MenuItem value="">Todos os tipos</MenuItem>
                  {seedTypes.map((seedType) => (
                    <MenuItem key={seedType.id} value={seedType.id}>
                      {seedType.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Cliente</InputLabel>
                <Select
                  value={filters.clientId}
                  label="Cliente"
                  onChange={(e) => handleFilterChange('clientId', e.target.value)}
                  disabled={clientsLoading}
                >
                  <MenuItem value="">Todos os clientes</MenuItem>
                  {clients.map((client) => (
                    <MenuItem key={client.id} value={client.id}>
                      {client.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.status}
                  label="Status"
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                >
                  <MenuItem value="">Todos os status</MenuItem>
                  <MenuItem value="CADASTRADO">Cadastrado</MenuItem>
                  <MenuItem value="AGUARDANDO_LOCACAO">Aguardando Locação</MenuItem>
                  <MenuItem value="LOCADO">Armazenado</MenuItem>
                  <MenuItem value="AGUARDANDO_RETIRADA">Aguardando Retirada</MenuItem>
                  <MenuItem value="RETIRADO">Retirado</MenuItem>
                  <MenuItem value="REMOVIDO">Removido</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
      {(loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      {!reportData && !loading && !dashboardLoading && !chambersLoading && !clientsLoading && !seedTypesLoading && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Clique em "Atualizar" para gerar o relatório de inventário
        </Alert>
      )}
      {dashboardSummary && !loading && !dashboardLoading && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resumo do Inventário
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {dashboardSummary.totalProducts || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Produtos
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {formatWeightSmart(dashboardSummary.totalWeight || 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Peso Total
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {dashboardSummary.occupiedLocations || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Localizações Ocupadas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  sm: 6,
                  md: 3
                }}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="warning.main">
                      {dashboardSummary.totalLocations > 0 
                        ? ((dashboardSummary.occupiedLocations / dashboardSummary.totalLocations) * 100).toFixed(2) 
                        : 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Taxa de Ocupação
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

          </CardContent>
        </Card>
      )}
      {/* Tabela de produtos independente */}
      {reportData && !loading && (
        <Card sx={{ mt: 3 }}>
          <CardContent>
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
                    <TableCell>Cliente</TableCell>
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
                      <TableCell>{getClientName(product)}</TableCell>
                      <TableCell>{getLocationCode(product)}</TableCell>
                      <TableCell align="right">{product.quantity}</TableCell>
                      <TableCell align="right">{formatWeight(product.totalWeight)}</TableCell>
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
      {/* Snackbar para feedback de exportação */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={closeSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert 
          onClose={closeSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}; 