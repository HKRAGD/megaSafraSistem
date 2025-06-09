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
} from '@mui/icons-material';
import { ProductWithRelations } from '../../../types';
import { useProducts } from '../../../hooks/useProducts';

interface ProductDetailsProps {
  productId: string;
  onClose: () => void;
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({ productId, onClose }) => {
  const { getProduct } = useProducts();
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
      case 'stored': return 'success';
      case 'reserved': return 'warning';
      case 'removed': return 'default';
      default: return 'default';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'stored': return 'Armazenado';
      case 'reserved': return 'Reservado';
      case 'removed': return 'Removido';
      default: return status;
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
            <Chip
              label={getStatusLabel(product.status)}
              color={getStatusColor(product.status) as any}
              size="small"
            />
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
                  <strong>Tipo de Semente:</strong> {product.seedType?.name || 'N/A'}
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
                  <strong>Código:</strong> {product.location?.code || 'N/A'}
                </Typography>
              </Box>
              
              <Typography variant="body2">
                <strong>Câmara:</strong> {product.location?.chamber?.name || 'N/A'}
              </Typography>
              
              {product.location?.maxCapacityKg && (
                <Typography variant="body2">
                  <strong>Capacidade:</strong> {product.location.currentWeightKg || 0}kg / {product.location.maxCapacityKg}kg
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