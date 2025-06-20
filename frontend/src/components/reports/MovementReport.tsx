import React, { useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { useReports } from '../../hooks/useReports';
import { useChambers } from '../../hooks/useChambers';
import { formatWeight } from '../../utils/displayHelpers';

// Funções auxiliares para mapear dados relacionais
const getProductName = (movement: any) => {
  if (movement.productId && typeof movement.productId === 'object') {
    return movement.productId.name || 'N/A';
  }
  if (movement.product && typeof movement.product === 'object') {
    return movement.product.name || 'N/A';
  }
  return 'N/A';
};

const getProductLot = (movement: any) => {
  if (movement.productId && typeof movement.productId === 'object') {
    return movement.productId.lot || 'N/A';
  }
  if (movement.product && typeof movement.product === 'object') {
    return movement.product.lot || 'N/A';
  }
  return 'N/A';
};

const getFromLocationCode = (movement: any) => {
  if (movement.fromLocationId && typeof movement.fromLocationId === 'object') {
    return movement.fromLocationId.code || 'N/A';
  }
  if (movement.fromLocation && typeof movement.fromLocation === 'object') {
    return movement.fromLocation.code || 'N/A';
  }
  return '-';
};

const getToLocationCode = (movement: any) => {
  if (movement.toLocationId && typeof movement.toLocationId === 'object') {
    return movement.toLocationId.code || 'N/A';
  }
  if (movement.toLocation && typeof movement.toLocation === 'object') {
    return movement.toLocation.code || 'N/A';
  }
  return '-';
};

const getUserName = (movement: any) => {
  if (movement.userId && typeof movement.userId === 'object') {
    return movement.userId.name || 'N/A';
  }
  if (movement.user && typeof movement.user === 'object') {
    return movement.user.name || 'N/A';
  }
  return 'N/A';
};

export const MovementReport: React.FC = () => {
  const { loading, movementData, generateMovementReport, exportToPDF, exportToExcel } = useReports();
  const { chambers, loading: chambersLoading } = useChambers();
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    type: '',
    chamberId: '',
  });

  const reportData = movementData;

  const handleFilterChange = (field: string, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleGenerateReport = async () => {
    const reportFilters = {
      startDate: filters.startDate || undefined,
      endDate: filters.endDate || undefined,
      movementType: filters.type || undefined,
      chamberId: filters.chamberId || undefined,
    };
    console.log('🔍 DEBUG MovementReport - Generating with filters:', reportFilters);
    const result = await generateMovementReport(reportFilters);
    console.log('🔍 DEBUG MovementReport - Result:', result);
  };

  const handleExportPDF = () => {
    if (reportData) {
      exportToPDF(reportData, 'movements');
    }
  };

  const handleExportExcel = () => {
    if (reportData) {
      exportToExcel(reportData, 'movements');
    }
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      entry: 'Entrada',
      exit: 'Saída',
      transfer: 'Transferência',
      adjustment: 'Ajuste',
    };
    return labels[type] || type;
  };

  const getMovementTypeColor = (type: string) => {
    const colors: { [key: string]: string } = {
      entry: 'success',
      exit: 'error',
      transfer: 'info',
      adjustment: 'warning',
    };
    return colors[type] || 'default';
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Relatório de Movimentações
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleGenerateReport}
            disabled={loading || chambersLoading}
          >
            Atualizar
          </Button>
          
          {reportData && (
            <>
              <Button
                variant="outlined"
                startIcon={<PdfIcon />}
                onClick={handleExportPDF}
                disabled={loading || chambersLoading}
              >
                PDF
              </Button>
              
              <Button
                variant="outlined"
                startIcon={<ExcelIcon />}
                onClick={handleExportExcel}
                disabled={loading || chambersLoading}
              >
                Excel
              </Button>
            </>
          )}
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          
          <Grid container spacing={3}>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="Data Inicial"
                fullWidth
                size="small"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="Data Final"
                fullWidth
                size="small"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Movimentação</InputLabel>
                <Select
                  value={filters.type}
                  label="Tipo de Movimentação"
                  onChange={(e) => handleFilterChange('type', e.target.value)}
                >
                  <MenuItem value="">Todos os tipos</MenuItem>
                  <MenuItem value="entry">Entrada</MenuItem>
                  <MenuItem value="exit">Saída</MenuItem>
                  <MenuItem value="transfer">Transferência</MenuItem>
                  <MenuItem value="adjustment">Ajuste</MenuItem>
                </Select>
              </FormControl>
            </Grid>

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
          </Grid>
        </CardContent>
      </Card>

      {(loading || chambersLoading) && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      )}

      {!reportData && !loading && !chambersLoading && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Clique em "Atualizar" para gerar o relatório de movimentações
        </Alert>
      )}

      {reportData && !loading && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Resumo das Movimentações
            </Typography>
            
            <Grid container spacing={3} sx={{ mb: 3 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="primary">
                      {reportData.summary?.totalMovements || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total de Movimentações
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="success.main">
                      {reportData.summary?.entryCount || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Entradas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="error.main">
                      {reportData.summary?.exitCount || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Saídas
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} sm={6} md={3}>
                <Card variant="outlined">
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Typography variant="h4" color="info.main">
                      {reportData.summary?.transferCount || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Transferências
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>
              Detalhes das Movimentações
            </Typography>

            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Data/Hora</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Produto</TableCell>
                    <TableCell>Origem</TableCell>
                    <TableCell>Destino</TableCell>
                    <TableCell align="right">Quantidade</TableCell>
                    <TableCell align="right">Peso (kg)</TableCell>
                    <TableCell>Usuário</TableCell>
                    <TableCell>Motivo</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reportData.movements?.map((movement: any) => (
                    <TableRow key={movement._id || movement.id}>
                      <TableCell>
                        {new Date(movement.timestamp || movement.createdAt).toLocaleDateString()} {' '}
                        {new Date(movement.timestamp || movement.createdAt).toLocaleTimeString()}
                      </TableCell>
                      <TableCell>
                        <Chip 
                          label={getMovementTypeLabel(movement.type)}
                          color={getMovementTypeColor(movement.type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {getProductName(movement)}
                        <br />
                        <Typography variant="caption" color="text.secondary">
                          Lote: {getProductLot(movement)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {getFromLocationCode(movement)}
                      </TableCell>
                      <TableCell>
                        {getToLocationCode(movement)}
                      </TableCell>
                      <TableCell align="right">{movement.quantity}</TableCell>
                      <TableCell align="right">{formatWeight(movement.weight)}</TableCell>
                      <TableCell>{getUserName(movement)}</TableCell>
                      <TableCell>{movement.reason}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>

            {(!reportData.movements || reportData.movements.length === 0) && (
              <Alert severity="info" sx={{ mt: 2 }}>
                Nenhuma movimentação encontrada com os filtros aplicados.
              </Alert>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}; 