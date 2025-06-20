import React, { useState } from 'react';
import {
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TableSortLabel,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Avatar,
  Tooltip,
  Box,
  Typography,
  Alert,
  LinearProgress,
  Badge,
} from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Visibility as VisibilityIcon,
  SwapHoriz as MoveIcon,
  History as HistoryIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  Inventory as InventoryIcon,
  LocationOn as LocationOnIcon,
  Assignment as RequestIcon,
  Done as ConfirmIcon,
} from '@mui/icons-material';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Product, ProductWithRelations, ProductFilters } from '../../types';
import { DataTable } from '../common/DataTable';
import { Loading } from '../common/Loading';
import { usePermissions } from '../../hooks/usePermissions';
import { ProductStatusBadge } from '../ui';

interface ProductListProps {
  products: ProductWithRelations[];
  loading: boolean;
  totalPages: number;
  currentPage: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onEdit: (product: ProductWithRelations) => void;
  onView: (product: ProductWithRelations) => void;
  onDelete: (productId: string) => void;
  onMove: (product: ProductWithRelations) => void;
  onViewHistory: (product: ProductWithRelations) => void;
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
}

export const ProductList: React.FC<ProductListProps> = ({
  products,
  loading,
  totalPages,
  currentPage,
  totalItems,
  onPageChange,
  onEdit,
  onView,
  onDelete,
  onMove,
  onViewHistory,
  filters,
  onFiltersChange,
}) => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const { canCreateProduct, canLocateProduct, canRequestWithdrawal, canConfirmWithdrawal } = usePermissions();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, product: ProductWithRelations) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProduct(null);
  };

  const handleSort = (field: string) => {
    const isAsc = filters.sort === field && filters.sortOrder === 'asc';
    onFiltersChange({
      ...filters,
      sort: field,
      sortOrder: isAsc ? 'desc' : 'asc',
    });
  };

  // Removida função getStatusChip - agora usando ProductStatusBadge padronizado

  const getExpirationStatus = (expirationDate?: string) => {
    if (!expirationDate) return null;

    const now = new Date();
    const expiration = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expiration.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiration < 0) {
      return (
        <Chip
          label="Vencido"
          color="error"
          size="small"
          icon={<WarningIcon />}
        />
      );
    } else if (daysUntilExpiration <= 7) {
      return (
        <Chip
          label={`${daysUntilExpiration}d`}
          color="error"
          size="small"
          icon={<WarningIcon />}
        />
      );
    } else if (daysUntilExpiration <= 30) {
      return (
        <Chip
          label={`${daysUntilExpiration}d`}
          color="warning"
          size="small"
          icon={<WarningIcon />}
        />
      );
    }

    return (
      <Chip
        label="OK"
        color="success"
        size="small"
        variant="outlined"
      />
    );
  };

  const getStorageTypeIcon = (storageType: string) => {
    return storageType === 'bag' ? '🎒' : '📦';
  };

  const calculateCapacityPercentage = (currentWeight: number, maxCapacity: number) => {
    return Math.min((currentWeight / maxCapacity) * 100, 100);
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage >= 90) return 'error';
    if (percentage >= 70) return 'warning';
    return 'success';
  };

  const columns = [
    {
      id: 'product',
      label: 'Produto',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: 'primary.main' }}>
            <InventoryIcon />
          </Avatar>
          <Box>
            <Typography variant="subtitle2" noWrap>
              {product.name}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Lote: {product.lot}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      id: 'seedType',
      label: 'Tipo',
      sortable: false,
      render: (product: ProductWithRelations) => (
        <Typography variant="body2">
          {product.seedTypeId?.name || 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'client',
      label: 'Cliente',
      sortable: false,
      render: (product: ProductWithRelations) => (
        <Typography variant="body2">
          {product.clientId?.name || 'N/A'}
        </Typography>
      ),
    },
    {
      id: 'quantity',
      label: 'Quantidade',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <Box>
          <Typography variant="body2">
            {product.quantity} {getStorageTypeIcon(product.storageType)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {product.totalWeight.toFixed(1)} kg
          </Typography>
        </Box>
      ),
    },
    {
      id: 'location',
      label: 'Localização',
      sortable: false,
      render: (product: ProductWithRelations) => {
        // Debug temporário
        console.log('🔍 Product location data:', {
          productName: product.name,
          locationId: product.locationId,
          code: product.locationId?.code,
          chamberName: product.locationId?.chamberId?.name
        });
        
        return (
          <Box>
            <Typography variant="body2">
              {product.locationId?.code || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {product.locationId?.chamberId?.name || ''}
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <ProductStatusBadge status={product.status} />
      ),
    },
    {
      id: 'expiration',
      label: 'Vencimento',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <Box>
          {product.expirationDate ? (
            <>
              <Typography variant="body2">
                {format(new Date(product.expirationDate), 'dd/MM/yyyy', { locale: ptBR })}
              </Typography>
              {getExpirationStatus(product.expirationDate)}
            </>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Sem vencimento
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'capacity',
      label: 'Capacidade',
      sortable: false,
      render: (product: ProductWithRelations) => {
        if (!product.locationId?.maxCapacityKg) return <Typography variant="body2">N/A</Typography>;
        
        const percentage = calculateCapacityPercentage(
          product.locationId.currentWeightKg || 0,
          product.locationId.maxCapacityKg
        );
        
        return (
          <Box sx={{ minWidth: 80 }}>
            <LinearProgress
              variant="determinate"
              value={percentage}
              color={getCapacityColor(percentage)}
              sx={{ mb: 0.5 }}
            />
            <Typography variant="caption" color="text.secondary">
              {percentage.toFixed(0)}%
            </Typography>
          </Box>
        );
      },
    },
    {
      id: 'entryDate',
      label: 'Entrada',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <Box>
          <Typography variant="body2">
            {format(new Date(product.entryDate), 'dd/MM/yyyy', { locale: ptBR })}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDistanceToNow(new Date(product.entryDate), { 
              addSuffix: true, 
              locale: ptBR 
            })}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'actions',
      label: 'Ações',
      sortable: false,
      render: (product: ProductWithRelations) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="Visualizar">
            <IconButton
              size="small"
              onClick={() => onView(product)}
            >
              <VisibilityIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Editar">
            <IconButton
              size="small"
              onClick={() => onEdit(product)}
            >
              <EditIcon />
            </IconButton>
          </Tooltip>
          
          <Tooltip title="Mover">
            <IconButton
              size="small"
              onClick={() => onMove(product)}
              disabled={!canLocateProduct || (product.status !== 'CADASTRADO' && product.status !== 'LOCADO')}
            >
              <MoveIcon />
            </IconButton>
          </Tooltip>
          
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, product)}
          >
            <MoreVertIcon />
          </IconButton>
        </Box>
      ),
    },
  ];

  if (loading && products.length === 0) {
    return <Loading />;
  }

  return (
    <Paper>
      <DataTable
        columns={columns}
        data={products}
        loading={loading}
        totalItems={totalItems}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
        onSort={handleSort}
        sortBy={filters.sort}
        sortOrder={filters.sortOrder}
        emptyMessage="Nenhum produto encontrado"
        emptySubMessage="Tente ajustar os filtros ou adicionar um novo produto"
      />

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        <MenuItem onClick={() => {
          if (selectedProduct) onViewHistory(selectedProduct);
          handleMenuClose();
        }}>
          <ListItemIcon>
            <HistoryIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Histórico</ListItemText>
        </MenuItem>

        {/* Ação de localizar produto - para OPERATOR quando produto está AGUARDANDO_LOCACAO */}
        {canLocateProduct && selectedProduct?.status === 'AGUARDANDO_LOCACAO' && (
          <MenuItem 
            onClick={() => {
              if (selectedProduct) onMove(selectedProduct);
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <LocationOnIcon fontSize="small" color="warning" />
            </ListItemIcon>
            <ListItemText>Localizar Produto</ListItemText>
          </MenuItem>
        )}

        {/* Ação de solicitar retirada - para ADMIN quando produto está LOCADO */}
        {canRequestWithdrawal && selectedProduct?.status === 'LOCADO' && (
          <MenuItem 
            onClick={() => {
              // TODO: Implementar solicitação de retirada
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <RequestIcon fontSize="small" color="primary" />
            </ListItemIcon>
            <ListItemText>Solicitar Retirada</ListItemText>
          </MenuItem>
        )}

        {/* Ação de confirmar retirada - para OPERATOR quando produto está AGUARDANDO_RETIRADA */}
        {canConfirmWithdrawal && selectedProduct?.status === 'AGUARDANDO_RETIRADA' && (
          <MenuItem 
            onClick={() => {
              // TODO: Implementar confirmação de retirada
              handleMenuClose();
            }}
          >
            <ListItemIcon>
              <ConfirmIcon fontSize="small" color="success" />
            </ListItemIcon>
            <ListItemText>Confirmar Retirada</ListItemText>
          </MenuItem>
        )}
        
        <MenuItem 
          onClick={() => {
            if (selectedProduct) onEdit(selectedProduct);
            handleMenuClose();
          }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            if (selectedProduct) onMove(selectedProduct);
            handleMenuClose();
          }}
          disabled={!canLocateProduct || (selectedProduct?.status !== 'CADASTRADO' && selectedProduct?.status !== 'LOCADO')}
        >
          <ListItemIcon>
            <MoveIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Mover</ListItemText>
        </MenuItem>
        
        {canCreateProduct && (
          <MenuItem 
            onClick={() => {
              if (selectedProduct) onDelete(selectedProduct.id);
              handleMenuClose();
            }}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Excluir</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </Paper>
  );
}; 