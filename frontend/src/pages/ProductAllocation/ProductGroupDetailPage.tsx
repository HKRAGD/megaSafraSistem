import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Alert,
  Avatar,
  Stack,
  LinearProgress,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  ArrowBack as ArrowBackIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  CalendarToday as CalendarIcon,
  Warning as WarningIcon,
  Check as CheckIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProductActions } from '../../hooks/useProductActions';
import { useLocationsWithChambers } from '../../hooks/useLocationsWithChambers';
import { usePermissions } from '../../hooks/usePermissions';
import { useProductGroupDetails } from '../../hooks/useProductGroupDetails';
import { ProductWithRelations, LocationWithChamber } from '../../types';
import { Loading } from '../../components/common/Loading';
import Toast from '../../components/common/Toast';
import { ProductAllocationDialog } from '../../components/products/ProductAllocationDialog';
import { URGENT_EXPIRATION_DAYS } from '../../utils/constants';

export const ProductGroupDetailPage: React.FC = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();
  const { canLocateProduct } = usePermissions();
  
  const { 
    locateProduct, 
    loading: allocationLoading,
    error: allocationError,
    clearError: clearAllocationError
  } = useProductActions();
  
  const {
    data: groupDetails,
    loading,
    error,
    progressPercentage,
    refreshGroup,
    clearError
  } = useProductGroupDetails(batchId);
  
  const { 
    availableLocationsWithChambers: availableLocations, 
    loading: locationsLoading, 
    refreshData: fetchAvailableLocations 
  } = useLocationsWithChambers({
    autoFetch: false,
    initialFilters: {}
  });

  // Estados locais
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  
  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Carregar localizações disponíveis quando a página carrega
  useEffect(() => {
    fetchAvailableLocations();
  }, [fetchAvailableLocations]);

  // Limpar erros de alocação quando o componente monta
  useEffect(() => {
    clearAllocationError();
  }, [clearAllocationError]);

  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleAllocateClick = (product: ProductWithRelations) => {
    setSelectedProduct(product);
    setSelectedLocationId('');
    setNotes('');
    setShowAllocationDialog(true);
  };

  const handleTreeLocationSelect = (locationId: string) => {
    setSelectedLocationId(locationId);
  };

  const handleAllocate = async () => {
    if (!selectedProduct || !selectedLocationId) {
      showToast('Selecione uma localização na árvore para alocar o produto', 'warning');
      return;
    }

    try {
      const result = await locateProduct(selectedProduct.id, selectedLocationId, notes || undefined);
      
      if (result) {
        showToast(`Produto "${selectedProduct.name}" alocado com sucesso!`, 'success');
        setShowAllocationDialog(false);
        
        // Recarregar os dados do grupo
        await refreshGroup();
        await fetchAvailableLocations(); // Atualizar localizações disponíveis
      }
    } catch (error: any) {
      showToast(allocationError || error.message || 'Erro ao alocar produto', 'error');
    }
  };

  const formatDate = (date: string): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getUrgentProductsCount = (): number => {
    if (!groupDetails) return 0;
    
    const now = new Date();
    const urgentThreshold = new Date(now.getTime() + URGENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
    
    return groupDetails.products.filter(product => 
      product.expirationDate && new Date(product.expirationDate) < urgentThreshold
    ).length;
  };

  if (loading) {
    return <Loading variant="page" text="Carregando detalhes do grupo..." />;
  }

  if (!canLocateProduct) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">
          Você não tem permissão para alocar produtos. Esta funcionalidade é restrita a operadores.
        </Alert>
      </Container>
    );
  }

  if (error || !groupDetails) {
    return (
      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Alert severity="error">
          {error || 'Erro ao carregar detalhes do grupo'}
        </Alert>
        <Box sx={{ mt: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/product-allocation')}
          >
            Voltar para Alocação
          </Button>
        </Box>
      </Container>
    );
  }

  const urgentCount = getUrgentProductsCount();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumb */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Link
          component="button"
          variant="body1"
          onClick={() => navigate('/product-allocation')}
          sx={{ textDecoration: 'none' }}
        >
          Alocação de Produtos
        </Link>
        <Typography color="text.primary">Detalhes do Lote</Typography>
      </Breadcrumbs>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
          <Button
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/product-allocation')}
            size="small"
          >
            Voltar
          </Button>
          
          <Avatar sx={{ bgcolor: 'primary.main', width: 48, height: 48 }}>
            <InventoryIcon />
          </Avatar>
          
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
              Lote de Produtos
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
              <PersonIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
              <Typography variant="body1" color="text.secondary">
                Cliente: {groupDetails.clientName}
              </Typography>
            </Box>
          </Box>

          {urgentCount > 0 && (
            <Chip
              icon={<WarningIcon />}
              label={`${urgentCount} produto${urgentCount !== 1 ? 's' : ''} urgente${urgentCount !== 1 ? 's' : ''}`}
              color="warning"
              variant="outlined"
            />
          )}
        </Box>

        {/* Estatísticas do Grupo */}
        <Grid container spacing={2} sx={{ mb: 2 }}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="primary.main" sx={{ fontWeight: 600 }}>
                  {groupDetails.totalProducts}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total de Produtos
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="success.main" sx={{ fontWeight: 600 }}>
                  {groupDetails.allocatedProducts}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Produtos Alocados
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color="warning.main" sx={{ fontWeight: 600 }}>
                  {groupDetails.totalProducts - groupDetails.allocatedProducts}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Aguardando Alocação
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <Card>
              <CardContent sx={{ textAlign: 'center', py: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                <CalendarIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                <Typography variant="caption" color="text.secondary">
                  {formatDate(groupDetails.createdAt)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Barra de Progresso */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2" color="text.secondary">
              Progresso da Alocação
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {progressPercentage.toFixed(1)}%
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={progressPercentage}
            color={progressPercentage === 100 ? 'success' : 'primary'}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>

        {/* Alerta para produtos urgentes */}
        {urgentCount > 0 && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>{urgentCount}</strong> produto{urgentCount !== 1 ? 's' : ''} com validade próxima ({URGENT_EXPIRATION_DAYS} dias). 
              Priorize a alocação!
            </Typography>
          </Alert>
        )}
      </Box>

      {/* Lista de Produtos */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        Produtos do Lote:
      </Typography>

      <Stack spacing={2}>
        {groupDetails.products.map((product) => {
          const isUrgent = product.expirationDate && 
            new Date(product.expirationDate) < new Date(Date.now() + URGENT_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
          const isAllocated = product.status === 'LOCADO';

          return (
            <Card 
              key={product.id}
              sx={{ 
                border: isUrgent ? '1px solid' : undefined,
                borderColor: isUrgent ? 'warning.main' : undefined,
                backgroundColor: isAllocated ? 'success.light' : (isUrgent ? 'warning.light' : 'background.paper'),
                opacity: isAllocated ? 0.85 : 1
              }}
            >
              <CardContent sx={{ p: 3 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                      <Avatar sx={{ bgcolor: isAllocated ? 'success.main' : 'primary.main' }}>
                        <AssignmentIcon />
                      </Avatar>
                      
                      <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5 }}>
                          {product.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Lote: {product.lot} | {product.seedTypeId?.name || 'N/A'}
                        </Typography>
                      </Box>

                      <Box sx={{ display: 'flex', gap: 1 }}>
                        {isAllocated && (
                          <Chip
                            icon={<CheckIcon />}
                            label="Alocado"
                            color="success"
                            size="small"
                          />
                        )}
                        {isUrgent && (
                          <Chip
                            icon={<WarningIcon />}
                            label="Urgente"
                            color="warning"
                            size="small"
                          />
                        )}
                      </Box>
                    </Box>
                    
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Quantidade:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {product.quantity} {product.storageType}
                        </Typography>
                      </Grid>
                      
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Typography variant="body2" color="text.secondary">
                          Peso Total:
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 500 }}>
                          {product.totalWeight} kg
                        </Typography>
                      </Grid>
                      
                      {product.expirationDate && (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Validade:
                          </Typography>
                          <Typography 
                            variant="body2" 
                            sx={{ 
                              fontWeight: 500,
                              color: isUrgent ? 'warning.dark' : 'text.primary'
                            }}
                          >
                            {formatDate(product.expirationDate)}
                          </Typography>
                        </Grid>
                      )}

                      {isAllocated && product.locationId && (
                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                          <Typography variant="body2" color="text.secondary">
                            Localização:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500, color: 'success.dark' }}>
                            {product.locationId?.code || product.locationId?.id || 'N/A'}
                          </Typography>
                        </Grid>
                      )}
                    </Grid>

                    {product.notes && (
                      <Box sx={{ mt: 2, p: 1.5, backgroundColor: 'grey.50', borderRadius: 1 }}>
                        <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                          Observações: {product.notes}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                  
                  {!isAllocated && (
                    <Button
                      variant="contained"
                      color={isUrgent ? 'warning' : 'primary'}
                      startIcon={<LocationIcon />}
                      onClick={() => handleAllocateClick(product)}
                      disabled={locationsLoading || availableLocations.length === 0 || allocationLoading}
                      sx={{ ml: 2, minWidth: 140, flexShrink: 0 }}
                    >
                      {allocationLoading ? 'Alocando...' : 'Alocar'}
                    </Button>
                  )}
                </Box>
              </CardContent>
            </Card>
          );
        })}
      </Stack>

      {/* Allocation Dialog */}
      <ProductAllocationDialog
        open={showAllocationDialog}
        onClose={() => setShowAllocationDialog(false)}
        onAllocate={handleAllocate}
        selectedProduct={selectedProduct}
        selectedLocationId={selectedLocationId}
        onLocationSelect={handleTreeLocationSelect}
        notes={notes}
        onNotesChange={setNotes}
        isAllocating={allocationLoading}
        availableLocationsCount={availableLocations.length}
        locationsLoading={locationsLoading}
      />

      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />
    </Container>
  );
};

export default ProductGroupDetailPage;