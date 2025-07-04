import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  Collapse,
  IconButton,
  Grid,
  Stack,
  Avatar,
  Divider,
  Alert,
  Badge,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ProductWithRelations } from '../../../types';
import { URGENT_EXPIRATION_DAYS } from '../../../utils/constants';

interface ProductBatch {
  batchId: string | null;
  batchName?: string; // Nome personalizado do grupo
  clientId: string;
  clientName: string;
  productCount: number;
  createdAt: string;
  products: ProductWithRelations[];
}

interface ProductBatchCardProps {
  batch: ProductBatch;
  onAllocateProduct: (product: ProductWithRelations) => void;
  isAllocating?: boolean;
  disabled?: boolean;
}

/**
 * Card expansível que exibe um grupo de produtos (lote) com possibilidade
 * de alocação individual de cada produto dentro do grupo.
 * 
 * Características:
 * - Card principal mostra resumo do lote
 * - Expansível para mostrar produtos individuais
 * - Ações de alocação por produto
 * - Indicadores visuais de status e urgência
 * - Compatível com produtos individuais (batchId: null)
 */
export const ProductBatchCard: React.FC<ProductBatchCardProps> = React.memo(({
  batch,
  onAllocateProduct,
  isAllocating = false,
  disabled = false,
}) => {
  const [expanded, setExpanded] = useState(false);
  const navigate = useNavigate();

  const handleExpandClick = () => {
    setExpanded(!expanded);
  };

  const handleViewDetails = () => {
    if (batch.batchId) {
      navigate(`/product-allocation/group/${batch.batchId}`);
    }
  };

  const formatDate = (date: string): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getTotalWeight = (): number => {
    return batch.products.reduce((total, product) => total + (product.totalWeight || 0), 0);
  };

  const getUrgentProductsCount = (): number => {
    const now = new Date();
    const urgentThreshold = new Date(now.getTime() + URGENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    
    return batch.products.filter(product => 
      product.expirationDate && new Date(product.expirationDate) < urgentThreshold
    ).length;
  };

  const isIndividualProduct = batch.batchId === null;
  const urgentCount = getUrgentProductsCount();

  return (
    <Card 
      sx={{ 
        mb: 2,
        border: urgentCount > 0 ? '2px solid' : '1px solid',
        borderColor: urgentCount > 0 ? 'warning.main' : 'divider',
        boxShadow: urgentCount > 0 ? 3 : 1,
        '&:hover': {
          boxShadow: 4,
        }
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        {/* Header do Card */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
            <Avatar sx={{ 
              bgcolor: isIndividualProduct ? 'info.main' : 'primary.main',
              width: 48,
              height: 48 
            }}>
              {isIndividualProduct ? <AssignmentIcon /> : <InventoryIcon />}
            </Avatar>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h6" component="h3" sx={{ fontWeight: 600 }}>
                {isIndividualProduct 
                  ? `Produto Individual`
                  : (batch.batchName || `Lote de Produtos`)
                }
              </Typography>
              
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="body2" color="text.secondary">
                  {batch.clientName}
                </Typography>
              </Box>
              
              {/* Exibir ID do lote como informação secundária quando há nome personalizado */}
              {!isIndividualProduct && batch.batchName && batch.batchId && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                  ID: {batch.batchId.substring(0, 8)}...
                </Typography>
              )}
            </Box>
          </Box>

          {/* Badges e Status */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {urgentCount > 0 && (
              <Badge badgeContent={urgentCount} color="warning">
                <Chip
                  icon={<WarningIcon />}
                  label="Urgente"
                  color="warning"
                  size="small"
                  variant="outlined"
                />
              </Badge>
            )}
            
            <Chip
              label={`${batch.productCount} produto${batch.productCount !== 1 ? 's' : ''}`}
              color="primary"
              size="small"
              variant="outlined"
            />

            {/* Botão Ver Detalhes - apenas para lotes reais */}
            {!isIndividualProduct && batch.batchId && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<VisibilityIcon />}
                onClick={handleViewDetails}
                disabled={disabled}
                sx={{ 
                  minWidth: 120,
                  textTransform: 'none'
                }}
              >
                Ver Detalhes
              </Button>
            )}
            
            <IconButton
              onClick={handleExpandClick}
              disabled={disabled}
              sx={{
                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                transition: 'transform 0.3s',
              }}
            >
              <ExpandMoreIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Resumo do Lote */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                {batch.productCount}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Produtos
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h6" color="secondary.main" sx={{ fontWeight: 600 }}>
                {getTotalWeight().toFixed(2)} kg
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Peso Total
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1 }}>
              <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                {batch.products.filter(p => p.status === 'AGUARDANDO_LOCACAO').length}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Aguardando
              </Typography>
            </Box>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Box sx={{ textAlign: 'center', p: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
              <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                {formatDate(batch.createdAt)}
              </Typography>
            </Box>
          </Grid>
        </Grid>

        {/* Alerta para produtos urgentes */}
        {urgentCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{urgentCount}</strong> produto{urgentCount !== 1 ? 's' : ''} com validade próxima (7 dias). 
              Priorize a alocação!
            </Typography>
          </Alert>
        )}

        {/* Lista Expandida de Produtos */}
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Divider sx={{ my: 2 }} />
          
          <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600 }}>
            Produtos no {isIndividualProduct ? 'Cadastro' : 'Lote'}:
          </Typography>
          
          <Stack spacing={2}>
            {batch.products.map((product, index) => {
              const isUrgent = product.expirationDate && 
                new Date(product.expirationDate) < new Date(Date.now() + URGENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
              
              return (
                <Card 
                  key={product.id} 
                  variant="outlined" 
                  sx={{ 
                    border: isUrgent ? '1px solid' : undefined,
                    borderColor: isUrgent ? 'warning.main' : undefined,
                    backgroundColor: isUrgent ? 'warning.light' : 'background.paper',
                    opacity: isUrgent ? 0.95 : 1
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {product.name}
                        </Typography>
                        
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                          Lote: {product.lot} | {product.seedTypeId?.name || 'N/A'}
                        </Typography>
                        
                        <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ gap: 0.5 }}>
                          <Chip
                            label={`${product.quantity} ${product.storageType}`}
                            size="small"
                            variant="outlined"
                            color="default"
                          />
                          <Chip
                            label={`${product.totalWeight} kg`}
                            size="small"
                            variant="outlined"
                            color="secondary"
                          />
                          {isUrgent && (
                            <Chip
                              icon={<WarningIcon />}
                              label="Urgente"
                              size="small"
                              color="warning"
                            />
                          )}
                        </Stack>
                        
                        {product.expirationDate && (
                          <Typography 
                            variant="caption" 
                            color={isUrgent ? 'warning.dark' : 'text.secondary'}
                            sx={{ display: 'block', mt: 1 }}
                          >
                            Validade: {formatDate(product.expirationDate)}
                          </Typography>
                        )}
                      </Box>
                      
                      <Button
                        size="small"
                        variant="contained"
                        color={isUrgent ? 'warning' : 'primary'}
                        startIcon={<LocationIcon />}
                        onClick={() => onAllocateProduct(product)}
                        disabled={disabled || isAllocating}
                        sx={{ 
                          ml: 2,
                          minWidth: 120,
                          flexShrink: 0
                        }}
                      >
                        {isAllocating ? 'Alocando...' : 'Alocar'}
                      </Button>
                    </Box>
                    
                    {product.notes && (
                      <Box sx={{ mt: 1, p: 1, backgroundColor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          {product.notes}
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </Stack>
        </Collapse>
      </CardContent>
    </Card>
  );
});

ProductBatchCard.displayName = 'ProductBatchCard';