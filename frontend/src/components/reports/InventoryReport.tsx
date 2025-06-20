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
import { useDashboard } from '../../hooks/useDashboard';
import { useChambers } from '../../hooks/useChambers';
import { useClients } from '../../hooks/useClients';
import { useSeedTypes } from '../../hooks/useSeedTypes';
import { ProductStatus } from '../../types';
import { formatWeightWithUnit, formatWeight, formatWeightSmart } from '../../utils/displayHelpers';

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

  const { 
    loading, 
    error, 
    inventoryData: reportData, 
    generateInventoryReport, 
    exportToPDF, 
    exportToExcel 
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
            onClick={() => {
              handleGenerateReport();
              refreshDashboard();
            }}
            disabled={loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading}
          >
            Atualizar
          </Button>
          <Button
            startIcon={<PdfIcon />}
            onClick={handleExportPDF}
            disabled={!reportData || loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading}
            color="error"
          >
            PDF
          </Button>
          <Button
            startIcon={<ExcelIcon />}
            onClick={handleExportExcel}
            disabled={!reportData || loading || dashboardLoading || chambersLoading || clientsLoading || seedTypesLoading}
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
            <Grid item xs={12} md={3}>
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

            <Grid item xs={12} md={3}>
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

            <Grid item xs={12} md={3}>
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

            <Grid item xs={12} md={3}>
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
              <Grid item xs={12} sm={6} md={3}>
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

              <Grid item xs={12} sm={6} md={3}>
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

              <Grid item xs={12} sm={6} md={3}>
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

              <Grid item xs={12} sm={6} md={3}>
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
    </Box>
  );
}; 