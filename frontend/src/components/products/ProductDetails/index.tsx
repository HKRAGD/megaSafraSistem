import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Stack,
  IconButton,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  CalendarToday as DateIcon,
  Scale as WeightIcon,
  Category as CategoryIcon,
  Assignment as LotIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Inventory as InventoryIcon,
  Close as CloseIcon,
  Edit as EditIcon,
  SwapHoriz as MoveIcon,
  Assignment as RequestIcon,
  Done as ConfirmIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { ProductWithRelations } from '../../../types';
import { useProducts } from '../../../hooks/useProducts';
import { usePermissions } from '../../../hooks/usePermissions';
import { ProductStatusBadge } from '../../ui';

interface ProductDetailsProps {
  productId: string;
  onClose: () => void;
  onEdit?: (product: ProductWithRelations) => void;
  onMove?: (product: ProductWithRelations) => void;
  onRequestWithdrawal?: (product: ProductWithRelations) => void;
  onConfirmWithdrawal?: (product: ProductWithRelations) => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ 
  productId, 
  onClose, 
  onEdit, 
  onMove, 
  onRequestWithdrawal, 
  onConfirmWithdrawal 
}) => {
  const { getProduct } = useProducts();
  const { canCreateProduct, canLocateProduct, canRequestWithdrawal, canConfirmWithdrawal } = usePermissions();
  const [product, setProduct] = useState<ProductWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProduct = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const productData = await getProduct(productId);
        
        if (productData) {
          setProduct(productData);
        } else {
          setError('Produto não encontrado');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar produto');
      } finally {
        setLoading(false);
      }
    };

    loadProduct();
  }, [productId, getProduct]);

  const formatDate = (date: string | Date | undefined): string => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'CADASTRADO': return 'default';
      case 'AGUARDANDO_LOCACAO': return 'warning';
      case 'LOCADO': return 'success';
      case 'AGUARDANDO_RETIRADA': return 'info';
      case 'RETIRADO': return 'secondary';
      case 'REMOVIDO': return 'error';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'CADASTRADO': return 'Cadastrado';
      case 'AGUARDANDO_LOCACAO': return 'Aguardando Locação';
      case 'LOCADO': return 'Locado';
      case 'AGUARDANDO_RETIRADA': return 'Aguardando Retirada';
      case 'RETIRADO': return 'Retirado';
      case 'REMOVIDO': return 'Removido';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'CADASTRADO': return <InventoryIcon fontSize="small" />;
      case 'AGUARDANDO_LOCACAO': return <WarningIcon fontSize="small" />;
      case 'LOCADO': return <CheckIcon fontSize="small" />;
      case 'AGUARDANDO_RETIRADA': return <WarningIcon fontSize="small" />;
      case 'RETIRADO': return <CheckIcon fontSize="small" />;
      case 'REMOVIDO': return <ErrorIcon fontSize="small" />;
      default: return <InventoryIcon fontSize="small" />;
    }
  };

  const getExpirationStatus = (expirationDate: string | Date | undefined) => {
    if (!expirationDate) return { color: 'default', label: 'Sem data', icon: null };
    
    const now = new Date();
    const expDate = new Date(expirationDate);
    const daysUntilExpiration = Math.ceil((expDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiration < 0) {
      return { color: 'error', label: 'Vencido', icon: <ErrorIcon fontSize="small" /> };
    } else if (daysUntilExpiration <= 7) {
      return { color: 'error', label: 'Crítico', icon: <WarningIcon fontSize="small" /> };
    } else if (daysUntilExpiration <= 30) {
      return { color: 'warning', label: 'Atenção', icon: <WarningIcon fontSize="small" /> };
    } else {
      return { color: 'success', label: 'Bom', icon: <CheckIcon fontSize="small" /> };
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Carregando detalhes do produto...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={onClose}>
          Fechar
        </Button>
      </Box>
    );
  }

  if (!product) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Produto não encontrado
        </Alert>
        <Button variant="outlined" onClick={onClose}>
          Fechar
        </Button>
      </Box>
    );
  }

  const expirationStatus = getExpirationStatus(product.expirationDate);

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            {product.name}
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <ProductStatusBadge status={product.status} size="medium" />
            <Chip
              {...(expirationStatus.icon && { icon: expirationStatus.icon })}
              label={expirationStatus.label}
              color={expirationStatus.color as any}
              size="small"
            />
          </Stack>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>

      <Stack spacing={3}>
        {/* Ações FSM */}
        <Card sx={{ backgroundColor: 'primary.50', borderColor: 'primary.200', borderWidth: 1, borderStyle: 'solid' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <TimelineIcon color="primary" />
              Ações Disponíveis
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack direction="row" spacing={2} flexWrap="wrap">
              {/* Editar - sempre disponível para ADMIN */}
              {canCreateProduct && onEdit && (
                <Button
                  variant="outlined"
                  startIcon={<EditIcon />}
                  onClick={() => onEdit(product)}
                  size="small"
                >
                  Editar Produto
                </Button>
              )}

              {/* Localizar produto - OPERATOR quando AGUARDANDO_LOCACAO */}
              {canLocateProduct && product.status === 'AGUARDANDO_LOCACAO' && onMove && (
                <Button
                  variant="contained"
                  color="warning"
                  startIcon={<LocationIcon />}
                  onClick={() => onMove(product)}
                  size="small"
                >
                  Localizar Produto
                </Button>
              )}

              {/* Mover produto - OPERATOR quando LOCADO */}
              {canLocateProduct && product.status === 'LOCADO' && onMove && (
                <Button
                  variant="outlined"
                  startIcon={<MoveIcon />}
                  onClick={() => onMove(product)}
                  size="small"
                >
                  Mover Produto
                </Button>
              )}

              {/* Solicitar retirada - ADMIN quando LOCADO */}
              {canRequestWithdrawal && product.status === 'LOCADO' && onRequestWithdrawal && (
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<RequestIcon />}
                  onClick={() => onRequestWithdrawal(product)}
                  size="small"
                >
                  Solicitar Retirada
                </Button>
              )}

              {/* Confirmar retirada - OPERATOR quando AGUARDANDO_RETIRADA */}
              {canConfirmWithdrawal && product.status === 'AGUARDANDO_RETIRADA' && onConfirmWithdrawal && (
                <Button
                  variant="contained"
                  color="success"
                  startIcon={<ConfirmIcon />}
                  onClick={() => onConfirmWithdrawal(product)}
                  size="small"
                >
                  Confirmar Retirada
                </Button>
              )}
            </Stack>

            {/* Indicador de status atual no workflow */}
            <Box sx={{ mt: 2, p: 2, backgroundColor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                Status atual no workflow:
              </Typography>
              <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {getStatusIcon(product.status)}
                <strong>{getStatusLabel(product.status)}</strong>
              </Typography>
            </Box>
          </CardContent>
        </Card>

        {/* Informações Básicas */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <InventoryIcon color="primary" />
              Informações Básicas
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LotIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Lote:</strong> {product.lot}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CategoryIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Tipo de Semente:</strong> {product.seedTypeId?.name || 'N/A'}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <InventoryIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Tipo de Armazenamento:</strong> {product.storageType}
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Quantidade e Peso */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WeightIcon color="primary" />
              Quantidade e Peso
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>Quantidade:</strong> {product.quantity} unidades
              </Typography>
              
              <Typography variant="body2">
                <strong>Peso por unidade:</strong> {product.weightPerUnit}kg
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WeightIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Peso total:</strong> {product.totalWeight || product.calculatedTotalWeight}kg
                </Typography>
              </Box>
            </Stack>
          </CardContent>
        </Card>

        {/* Localização */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocationIcon color="primary" />
              Localização
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Código:</strong> {product.locationId?.code || 'N/A'}
                </Typography>
              </Box>
              
              <Typography variant="body2">
                <strong>Câmara:</strong> {product.locationId?.chamberId?.name || 'N/A'}
              </Typography>
              
              {product.locationId?.maxCapacityKg && (
                <Typography variant="body2">
                  <strong>Capacidade:</strong> {product.locationId.currentWeightKg || 0}kg / {product.locationId.maxCapacityKg}kg
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Datas */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <DateIcon color="primary" />
              Datas
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={2}>
              <Typography variant="body2">
                <strong>Data de Entrada:</strong> {formatDate(product.entryDate)}
              </Typography>
              
              <Typography variant="body2">
                <strong>Data de Validade:</strong> {formatDate(product.expirationDate)}
              </Typography>
              
              {product.storageTimeDays !== undefined && (
                <Typography variant="body2">
                  <strong>Tempo de Armazenamento:</strong> {product.storageTimeDays} dias
                </Typography>
              )}
            </Stack>
          </CardContent>
        </Card>

        {/* Observações */}
        {product.notes && (
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Observações
              </Typography>
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                {product.notes}
              </Typography>
            </CardContent>
          </Card>
        )}

        {/* Metadados */}
        <Card sx={{ backgroundColor: 'grey.50' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Informações do Sistema
            </Typography>
            <Divider sx={{ mb: 2 }} />
            
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                <strong>Criado em:</strong> {formatDate(product.createdAt)}
              </Typography>
              
              <Typography variant="caption" color="text.secondary">
                <strong>Última atualização:</strong> {formatDate(product.updatedAt)}
              </Typography>
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default ProductDetails; 