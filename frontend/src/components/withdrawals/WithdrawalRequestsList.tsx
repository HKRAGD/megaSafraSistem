import React, { useState, useEffect } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Alert,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Stack,
  Button,
  Tooltip,
  Avatar,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Visibility as ViewIcon,
  Edit as EditIcon,
  Cancel as CancelIcon,
  Done as ConfirmIcon,
  Assignment as RequestIcon,
  Person as PersonIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  FilterList as FilterIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WithdrawalRequestWithRelations } from '../../types';
import { useWithdrawalRequests } from '../../hooks/useWithdrawalRequests';
import { usePermissions } from '../../hooks/usePermissions';
import { Loading } from '../common/Loading';
import { WithdrawalStatusBadge, WithdrawalTypeBadge } from '../ui';

interface WithdrawalRequestsListProps {
  onView?: (withdrawal: WithdrawalRequestWithRelations) => void;
  onEdit?: (withdrawal: WithdrawalRequestWithRelations) => void;
  onCancel?: (withdrawal: WithdrawalRequestWithRelations) => void;
  onConfirm?: (withdrawal: WithdrawalRequestWithRelations) => void;
}

export const WithdrawalRequestsList: React.FC<WithdrawalRequestsListProps> = ({
  onView,
  onEdit,
  onCancel,
  onConfirm,
}) => {
  const {
    withdrawals,
    pendingWithdrawals,
    loading,
    error,
    pagination,
    fetchWithdrawals,
    refreshData,
    clearError,
  } = useWithdrawalRequests();

  const { isAdmin, isOperator, canRequestWithdrawal, canConfirmWithdrawal } = usePermissions();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestWithRelations | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    search: '',
  });

  // Para OPERATOR, mostrar apenas solicitações pendentes por padrão
  const [viewMode, setViewMode] = useState<'all' | 'pending'>(isOperator ? 'pending' : 'all');

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, withdrawal: WithdrawalRequestWithRelations) => {
    setAnchorEl(event.currentTarget);
    setSelectedWithdrawal(withdrawal);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedWithdrawal(null);
  };

  const handleFilterChange = (field: string, value: any) => {
    const newFilters = { ...filters, [field]: value };
    setFilters(newFilters);
    
    // Aplicar filtros
    fetchWithdrawals({
      page: 1,
      limit: pagination.limit,
      status: newFilters.status || undefined,
      type: newFilters.type || undefined,
    });
  };

  // Removidas funções getStatusChip e getTypeChip - agora usando badges padronizados

  const formatDate = (date: string | Date): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const formatRelativeDate = (date: string | Date): string => {
    return formatDistanceToNow(new Date(date), { addSuffix: true, locale: ptBR });
  };

  const displayData = viewMode === 'pending' ? pendingWithdrawals : withdrawals;

  if (loading && displayData.length === 0) {
    return <Loading />;
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            {isAdmin ? 'Solicitações de Retirada' : 'Tarefas de Retirada'}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {isAdmin 
              ? 'Gerencie todas as solicitações de retirada do sistema'
              : 'Confirme as retiradas pendentes'
            }
          </Typography>
        </Box>
        <Stack direction="row" spacing={2}>
          {isOperator && (
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Visualização</InputLabel>
              <Select
                value={viewMode}
                label="Visualização"
                onChange={(e) => setViewMode(e.target.value as 'all' | 'pending')}
              >
                <MenuItem value="pending">Pendentes</MenuItem>
                <MenuItem value="all">Todas</MenuItem>
              </Select>
            </FormControl>
          )}
          <Button
            variant="outlined"
            startIcon={<FilterIcon />}
            onClick={() => setShowFilters(!showFilters)}
            size="small"
          >
            Filtros
          </Button>
        </Stack>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      {showFilters && (
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
            <TextField
              label="Buscar produto"
              variant="outlined"
              size="small"
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              sx={{ minWidth: 200 }}
            />
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDING">Pendente</MenuItem>
                <MenuItem value="CONFIRMED">Confirmada</MenuItem>
                <MenuItem value="CANCELED">Cancelada</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Tipo</InputLabel>
              <Select
                value={filters.type}
                label="Tipo"
                onChange={(e) => handleFilterChange('type', e.target.value)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="TOTAL">Total</MenuItem>
                <MenuItem value="PARCIAL">Parcial</MenuItem>
              </Select>
            </FormControl>
          </Stack>
        </Paper>
      )}

      {/* Tabela */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Produto</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Quantidade</TableCell>
              <TableCell>Solicitado por</TableCell>
              <TableCell>Data</TableCell>
              <TableCell align="center">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {displayData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center">
                  <Box sx={{ py: 4 }}>
                    <RequestIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {viewMode === 'pending' 
                        ? 'Nenhuma solicitação pendente'
                        : 'Nenhuma solicitação encontrada'
                      }
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {isAdmin && viewMode !== 'pending' && 'Crie uma nova solicitação de retirada'}
                      {isOperator && 'Aguarde novas solicitações dos administradores'}
                    </Typography>
                  </Box>
                </TableCell>
              </TableRow>
            ) : (
              displayData.map((withdrawal) => (
                <TableRow key={withdrawal.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        <RequestIcon />
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle2" noWrap>
                          {withdrawal.productId?.name || 'Produto não encontrado'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Lote: {withdrawal.productId?.lot || 'N/A'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <WithdrawalTypeBadge status={withdrawal.type} />
                  </TableCell>
                  
                  <TableCell>
                    <WithdrawalStatusBadge status={withdrawal.status} />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {withdrawal.quantityRequested || withdrawal.productId?.quantity || 0} unidades
                    </Typography>
                    {withdrawal.type === 'PARCIAL' && withdrawal.productId?.quantity && (
                      <Typography variant="caption" color="text.secondary">
                        de {withdrawal.productId.quantity} total
                      </Typography>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <PersonIcon fontSize="small" color="action" />
                      <Box>
                        <Typography variant="body2">
                          {withdrawal.requestedBy?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {withdrawal.requestedBy?.role === 'ADMIN' ? 'Administrador' : 'Operador'}
                        </Typography>
                      </Box>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box>
                      <Typography variant="body2">
                        {formatDate(withdrawal.createdAt)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatRelativeDate(withdrawal.createdAt)}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'center' }}>
                      <Tooltip title="Visualizar">
                        <IconButton
                          size="small"
                          onClick={() => onView?.(withdrawal)}
                        >
                          <ViewIcon />
                        </IconButton>
                      </Tooltip>
                      
                      {/* Confirmar retirada - OPERATOR para status PENDING */}
                      {canConfirmWithdrawal && withdrawal.status === 'PENDENTE' && (
                        <Tooltip title="Confirmar Retirada">
                          <IconButton
                            size="small"
                            color="success"
                            onClick={() => onConfirm?.(withdrawal)}
                          >
                            <ConfirmIcon />
                          </IconButton>
                        </Tooltip>
                      )}
                      
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, withdrawal)}
                      >
                        <MoreVertIcon />
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Paginação */}
      {displayData.length > 0 && viewMode === 'all' && (
        <TablePagination
          component="div"
          count={pagination.total}
          page={pagination.page - 1}
          onPageChange={(_, page) => fetchWithdrawals({ 
            page: page + 1, 
            limit: pagination.limit,
            status: filters.status || undefined,
            type: filters.type || undefined,
          })}
          rowsPerPage={pagination.limit}
          onRowsPerPageChange={(e) => fetchWithdrawals({ 
            page: 1, 
            limit: parseInt(e.target.value, 10),
            status: filters.status || undefined,
            type: filters.type || undefined,
          })}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) => `${from}-${to} de ${count}`}
        />
      )}

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          if (selectedWithdrawal) onView?.(selectedWithdrawal);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <ViewIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Visualizar Detalhes</ListItemText>
        </MenuItem>

        {/* Editar - ADMIN para status PENDING */}
        {isAdmin && selectedWithdrawal?.status === 'PENDENTE' && (
          <MenuItem onClick={() => {
            if (selectedWithdrawal) onEdit?.(selectedWithdrawal);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Editar Solicitação</ListItemText>
          </MenuItem>
        )}

        {/* Confirmar - OPERATOR para status PENDING */}
        {canConfirmWithdrawal && selectedWithdrawal?.status === 'PENDENTE' && (
          <MenuItem onClick={() => {
            if (selectedWithdrawal) onConfirm?.(selectedWithdrawal);
            handleMenuClose();
          }}>
            <ListItemIcon>
              <ConfirmIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Confirmar Retirada</ListItemText>
          </MenuItem>
        )}

        {/* Cancelar - ADMIN para status PENDING */}
        {isAdmin && selectedWithdrawal?.status === 'PENDENTE' && (
          <MenuItem onClick={() => {
            if (selectedWithdrawal) onCancel?.(selectedWithdrawal);
            handleMenuClose();
          }} sx={{ color: 'error.main' }}>
            <ListItemIcon>
              <CancelIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Cancelar Solicitação</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Box>
  );
};