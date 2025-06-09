import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  Chip,
  IconButton,
  Button,
  TextField,
  MenuItem,
  Alert
} from '@mui/material';
import {
  Visibility as ViewIcon,
  FileDownload as ExportIcon,
  FilterList as FilterIcon,
  History as HistoryIcon,
  TrendingUp as EntryIcon,
  TrendingDown as ExitIcon,
  SwapHoriz as TransferIcon,
  Build as AdjustmentIcon
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import PageHeader from '../../components/layout/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import Modal from '../../components/common/Modal';
import Loading from '../../components/common/Loading';
import { useMovements } from '../../hooks/useMovements';
import { useSearchDebounce } from '../../hooks/useDebounce';
import { Movement, MovementType } from '../../types';
import { 
  getProductDisplay, 
  getLocationDisplay, 
  getUserDisplay, 
  getTransferDisplay 
} from '../../utils/displayHelpers';

const HistoryPage: React.FC = () => {
  const [filters, setFilters] = useState<{
    type?: MovementType;
    startDate: string;
    endDate: string;
    search: string;
  }>({
    type: undefined,
    startDate: '',
    endDate: '',
    search: ''
  });
  
  const [selectedMovement, setSelectedMovement] = useState<Movement | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { debouncedSearch } = useSearchDebounce(filters.search);
  
  const { 
    movements, 
    loading, 
    error, 
    fetchMovements
  } = useMovements({ autoFetch: false }); // Desabilitar auto-fetch

  useEffect(() => {
    const currentFilters = {
      ...filters,
      search: debouncedSearch
    };
    
    console.log('🔄 Carregando movimentações com filtros:', currentFilters);
    fetchMovements(currentFilters);
  }, [debouncedSearch, filters.type, filters.startDate, filters.endDate]); // Dependências específicas sem fetchMovements

  const handleViewDetails = (movement: Movement) => {
    setSelectedMovement(movement);
    setDetailsOpen(true);
  };

  const handleExport = async () => {
    try {
      // TODO: Implementar funcionalidade de exportação
      console.log('Exportar movimentações:', filters);
    } catch (err) {
      console.error('Erro ao exportar movimentações:', err);
    }
  };

  const getMovementIcon = (type: MovementType) => {
    switch (type) {
      case 'entry': return <EntryIcon color="success" />;
      case 'exit': return <ExitIcon color="error" />;
      case 'transfer': return <TransferIcon color="primary" />;
      case 'adjustment': return <AdjustmentIcon color="warning" />;
      default: return <HistoryIcon />;
    }
  };

  const getMovementTypeLabel = (type: MovementType): string => {
    const labels = {
      'entry': 'Entrada',
      'exit': 'Saída', 
      'transfer': 'Transferência',
      'adjustment': 'Ajuste'
    };
    return labels[type] || type;
  };

  const getMovementColor = (type: MovementType) => {
    const colors = {
      'entry': 'success',
      'exit': 'error',
      'transfer': 'primary', 
      'adjustment': 'warning'
    } as const;
    return colors[type] || 'default';
  };

  const columns = [
    {
      id: 'timestamp',
      label: 'Data/Hora',
      sortable: true,
      render: (item: Movement) => (
        <Typography variant="body2">
          {format(new Date(item.timestamp), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
        </Typography>
      )
    },
    {
      id: 'type',
      label: 'Tipo',
      render: (item: Movement) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {getMovementIcon(item.type)}
          <Chip
            label={getMovementTypeLabel(item.type)}
            color={getMovementColor(item.type)}
            size="small"
          />
        </Box>
      )
    },
    {
      id: 'productId',
      label: 'Produto',
      render: (item: Movement) => (
        <Typography variant="body2" fontWeight={500}>
          {getProductDisplay(item.productId)}
        </Typography>
      )
    },
    {
      id: 'quantity',
      label: 'Quantidade',
      render: (item: Movement) => (
        <Typography variant="body2">
          {item.quantity} ({item.weight}kg)
        </Typography>
      )
    },
    {
      id: 'toLocationId',
      label: 'Localização',
      render: (item: Movement) => {
        if (item.type === 'transfer') {
          return (
            <Typography variant="body2">
              {getTransferDisplay(item.fromLocationId, item.toLocationId)}
            </Typography>
          );
        }
        return (
          <Typography variant="body2">
            {getLocationDisplay(item.toLocationId)}
          </Typography>
        );
      }
    },
    {
      id: 'userId',
      label: 'Usuário',
      render: (item: Movement) => (
        <Typography variant="body2">
          {getUserDisplay(item.userId)}
        </Typography>
      )
    },
    {
      id: 'actions',
      label: 'Ações',
      render: (item: Movement) => (
        <IconButton
          size="small"
          onClick={() => handleViewDetails(item)}
          color="primary"
        >
          <ViewIcon fontSize="small" />
        </IconButton>
      )
    }
  ];

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <Loading />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      <PageHeader 
        title="Histórico de Movimentações" 
        subtitle="Consulte e analise todas as movimentações realizadas no sistema"
        actions={
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Button
              variant="outlined"
              startIcon={<FilterIcon />}
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              Filtros
            </Button>
            <Button
              variant="contained"
              startIcon={<ExportIcon />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          </Box>
        }
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      {/* Painel de Filtros */}
      {filtersOpen && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros Avançados
          </Typography>
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <TextField
                label="Buscar"
                fullWidth
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Produto, lote, usuário..."
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <TextField
                select
                label="Tipo de Movimentação"
                fullWidth
                value={filters.type}
                onChange={(e) => setFilters({ ...filters, type: e.target.value as MovementType | undefined })}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="entry">Entrada</MenuItem>
                <MenuItem value="exit">Saída</MenuItem>
                <MenuItem value="transfer">Transferência</MenuItem>
                <MenuItem value="adjustment">Ajuste</MenuItem>
              </TextField>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <TextField
                type="date"
                label="Data Inicial"
                fullWidth
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <TextField
                type="date"
                label="Data Final"
                fullWidth
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </Paper>
      )}
      {/* Timeline/Tabela de Movimentações */}
      <Card>
        <CardContent>
          <DataTable
            data={movements}
            columns={columns}
            loading={loading}
          />
        </CardContent>
      </Card>
      {/* Modal de Detalhes da Movimentação */}
      <Modal
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        title="Detalhes da Movimentação"
        maxWidth="md"
      >
        {selectedMovement && (
          <Box>
            <Grid container spacing={3}>
              <Grid size={12}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
                  {getMovementIcon(selectedMovement.type)}
                  <Typography variant="h6">
                    {getMovementTypeLabel(selectedMovement.type)}
                  </Typography>
                  <Chip
                    label={getMovementTypeLabel(selectedMovement.type)}
                    color={getMovementColor(selectedMovement.type)}
                  />
                </Box>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Data e Hora
                </Typography>
                <Typography variant="body1">
                  {format(new Date(selectedMovement.timestamp), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR })}
                </Typography>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Produto
                </Typography>
                <Typography variant="body1">
                  {getProductDisplay(selectedMovement.productId)}
                </Typography>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Quantidade
                </Typography>
                <Typography variant="body1">
                  {selectedMovement.quantity} unidades
                </Typography>
              </Grid>

              <Grid
                size={{
                  xs: 12,
                  md: 6
                }}>
                <Typography variant="subtitle2" color="textSecondary">
                  Peso
                </Typography>
                <Typography variant="body1">
                  {selectedMovement.weight} kg
                </Typography>
              </Grid>

              {selectedMovement.fromLocationId && (
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Localização Origem
                  </Typography>
                  <Typography variant="body1">
                    {getLocationDisplay(selectedMovement.fromLocationId)}
                  </Typography>
                </Grid>
              )}

              {selectedMovement.toLocationId && (
                <Grid
                  size={{
                    xs: 12,
                    md: 6
                  }}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Localização Destino
                  </Typography>
                  <Typography variant="body1">
                    {getLocationDisplay(selectedMovement.toLocationId)}
                  </Typography>
                </Grid>
              )}

              <Grid size={12}>
                <Typography variant="subtitle2" color="textSecondary">
                  Usuário Responsável
                </Typography>
                <Typography variant="body1">
                  {getUserDisplay(selectedMovement.userId)}
                </Typography>
              </Grid>

              {selectedMovement.reason && (
                <Grid size={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Motivo
                  </Typography>
                  <Typography variant="body1">
                    {selectedMovement.reason}
                  </Typography>
                </Grid>
              )}

              {selectedMovement.notes && (
                <Grid size={12}>
                  <Typography variant="subtitle2" color="textSecondary">
                    Observações
                  </Typography>
                  <Typography variant="body1">
                    {selectedMovement.notes}
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Box>
        )}
      </Modal>
    </Box>
  );
};

export default HistoryPage; 