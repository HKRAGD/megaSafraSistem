import React, { useState, useEffect, useMemo } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Avatar,
  IconButton,
  Tooltip,
  Stack,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Assignment as AssignmentIcon,
  Check as CheckIcon,
  Info as InfoIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useProducts } from '../../hooks/useProducts';
import { useProductActions } from '../../hooks/useProductActions';
import { useLocationsWithChambers } from '../../hooks/useLocationsWithChambers';
import { useChambers } from '../../hooks/useChambers';
import { usePermissions } from '../../hooks/usePermissions';
import { ProductWithRelations, LocationWithChamber } from '../../types';
import { Loading } from '../../components/common/Loading';
import Toast from '../../components/common/Toast';
import { LocationTreeNavigation } from '../../components/ui/LocationTreeNavigation';

export const ProductAllocationPage: React.FC = () => {
  const { canLocateProduct } = usePermissions();
  const { 
    data: products, 
    loading: productsLoading, 
    fetchProducts,
    error: productsError 
  } = useProducts();
  const { 
    locateProduct, 
    loading: allocationLoading,
    error: allocationError,
    clearError 
  } = useProductActions();
  const { 
    availableLocationsWithChambers: availableLocations, 
    loading: locationsLoading, 
    refreshData: fetchAvailableLocations 
  } = useLocationsWithChambers({
    autoFetch: false,
    initialFilters: {}
  });
  const { data: chambers, loading: chambersLoading } = useChambers();

  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [showAllocationDialog, setShowAllocationDialog] = useState(false);
  // Estado combinado de loading
  const isAllocating = allocationLoading;
  
  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // Filtrar apenas produtos aguardando locação
  const pendingProducts = products.filter(product => product.status === 'AGUARDANDO_LOCACAO');

  // As localizações serão filtradas pelo LocationMap3DAdvanced internamente

  // Memoize the filter object to ensure a stable reference
  const pendingProductsFilters = useMemo(() => ({ status: 'AGUARDANDO_LOCACAO' as const, limit: 50 }), []);

  useEffect(() => {
    // Carregar produtos com filtro específico para AGUARDANDO_LOCACAO
    fetchProducts(pendingProductsFilters);
    fetchAvailableLocations();
  }, [fetchProducts, fetchAvailableLocations, pendingProductsFilters]);

  // Limpar erros de alocação quando o componente monta
  useEffect(() => {
    clearError();
  }, [clearError]);

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

  // Handler para seleção de localização no LocationTreeNavigation
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
        
        // Recarregar a lista de produtos
        await fetchProducts(pendingProductsFilters);
        await fetchAvailableLocations(); // Atualizar localizações disponíveis
      }
    } catch (error: any) {
      // Erro já é tratado pelo useProductActions, mas vamos mostrar no toast também
      showToast(allocationError || error.message || 'Erro ao alocar produto', 'error');
    }
  };

  const formatDate = (date: string | Date): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  const getLocationDisplay = (location: LocationWithChamber): string => {
    return `${location.code} - ${location.chamber?.name || 'Câmara N/A'}`;
  };

  if (productsLoading && pendingProducts.length === 0) {
    return <Loading variant="page" text="Carregando produtos aguardando locação..." />;
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

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Alocar Produtos
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Aloque produtos que estão aguardando locação nas câmaras refrigeradas
        </Typography>
      </Box>
      {/* Actions */}
      <Box sx={{ mb: 3, display: 'flex', justify: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {pendingProducts.length} produto(s) aguardando locação
        </Typography>
        <Button
          variant="outlined"
          startIcon={<RefreshIcon />}
          onClick={() => {
            fetchProducts(pendingProductsFilters);
            fetchAvailableLocations();
          }}
          disabled={productsLoading}
        >
          Atualizar
        </Button>
      </Box>
      {/* Error Alerts */}
      {productsError && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {productsError}
        </Alert>
      )}
      {allocationError && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={clearError}>
          {allocationError}
        </Alert>
      )}
      {/* Empty State */}
      {pendingProducts.length === 0 && !productsLoading && (
        <Card>
          <CardContent sx={{ textAlign: 'center', py: 6 }}>
            <CheckIcon sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              Todos os produtos estão alocados!
            </Typography>
            <Typography variant="body1" color="text.secondary" gutterBottom>
              Não há produtos aguardando locação no momento.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Novos produtos cadastrados pelos administradores aparecerão aqui automaticamente.
            </Typography>
          </CardContent>
        </Card>
      )}
      {/* Product Grid */}
      {pendingProducts.length > 0 && (
        <Grid container spacing={3}>
          {pendingProducts.map((product) => (
            <Grid
              key={product.id}
              size={{
                xs: 12,
                md: 6,
                lg: 4
              }}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  {/* Product Header */}
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <Avatar sx={{ bgcolor: 'warning.main' }}>
                      <AssignmentIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="h3" noWrap>
                        {product.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Lote: {product.lot}
                      </Typography>
                    </Box>
                    <Chip
                      label="Aguardando Locação"
                      color="warning"
                      size="small"
                    />
                  </Box>

                  {/* Product Details */}
                  <Stack spacing={1} sx={{ mb: 3 }}>
                    <Box sx={{ display: 'flex', justify: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Tipo de Semente:
                      </Typography>
                      <Typography variant="body2">
                        {product.seedTypeId?.name || 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justify: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Quantidade:
                      </Typography>
                      <Typography variant="body2">
                        {product.quantity} {product.storageType}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justify: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Peso Total:
                      </Typography>
                      <Typography variant="body2">
                        {product.totalWeight} kg
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justify: 'space-between' }}>
                      <Typography variant="body2" color="text.secondary">
                        Cadastrado em:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(product.createdAt)}
                      </Typography>
                    </Box>

                    {product.expirationDate && (
                      <Box sx={{ display: 'flex', justify: 'space-between' }}>
                        <Typography variant="body2" color="text.secondary">
                          Validade:
                        </Typography>
                        <Typography variant="body2" color={
                          new Date(product.expirationDate) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) 
                            ? 'error.main' 
                            : 'text.primary'
                        }>
                          {formatDate(product.expirationDate)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {/* Warning for urgent products */}
                  {product.expirationDate && new Date(product.expirationDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="caption">
                        Produto com validade próxima! Priorize a locação.
                      </Typography>
                    </Alert>
                  )}

                  {/* Notes if any */}
                  {product.notes && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                        Observações:
                      </Typography>
                      <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                        {product.notes}
                      </Typography>
                    </Box>
                  )}
                </CardContent>

                {/* Action Button */}
                <Box sx={{ p: 2, pt: 0 }}>
                  <Button
                    fullWidth
                    variant="contained"
                    color="primary"
                    startIcon={<LocationIcon />}
                    onClick={() => handleAllocateClick(product)}
                    disabled={locationsLoading || availableLocations.length === 0 || isAllocating}
                  >
                    Alocar Produto
                  </Button>
                  
                  {availableLocations.length === 0 && !locationsLoading && (
                    <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
                      Nenhuma localização disponível
                    </Typography>
                  )}
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
      {/* Allocation Dialog */}
      <Dialog
        open={showAllocationDialog}
        onClose={() => setShowAllocationDialog(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            Alocar Produto: {selectedProduct?.name}
          </Box>
        </DialogTitle>
        
        <DialogContent dividers>
          <Box sx={{ mb: 3 }}>
            <Alert severity="info" icon={<InfoIcon />}>
              Selecione uma localização na árvore hierárquica abaixo para alocar este produto. O produto passará para o status "Locado".
            </Alert>
          </Box>

          <Grid container spacing={3}>
            {/* Navegação em árvore ocupa toda a largura */}
            <Grid size={12}>
              <Box sx={{ 
                border: '1px solid', 
                borderColor: 'divider',
                borderRadius: 1,
                minHeight: 500,
                backgroundColor: 'background.paper'
              }}>
                <LocationTreeNavigation
                  onLocationSelect={handleTreeLocationSelect}
                  selectedLocationId={selectedLocationId || undefined}
                  showStats={true}
                  allowModeToggle={false}
                  hideViewToggle={true}
                  filters={{
                    status: 'available'
                  }}
                />
              </Box>
            </Grid>

            {/* Feedback da localização selecionada */}
            <Grid size={12}>
              {selectedLocationId ? (
                <Alert severity="success">
                  <Typography variant="body2">
                    Localização selecionada: {availableLocations.find(loc => loc.id === selectedLocationId)?.code || 'N/A'}
                  </Typography>
                </Alert>
              ) : (
                <Alert severity="info">
                  <Typography variant="body2">
                    Navegue pela árvore e clique em uma localização (andar) para selecioná-la.
                  </Typography>
                </Alert>
              )}
            </Grid>

            {/* Campo de observações */}
            <Grid size={12}>
              <TextField
                fullWidth
                label="Observações da Alocação (opcional)"
                multiline
                rows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Digite observações sobre a alocação deste produto..."
              />
            </Grid>
          </Grid>

          {/* Aviso se não há localizações disponíveis */}
          {availableLocations.length === 0 && !locationsLoading && (
            <Alert severity="warning" sx={{ mt: 2 }}>
              <Typography variant="body2">
                Nenhuma localização disponível no sistema. Aguarde novas localizações serem liberadas ou contate o administrador.
              </Typography>
            </Alert>
          )}
        </DialogContent>

        <DialogActions>
          <Button 
            onClick={() => setShowAllocationDialog(false)}
            disabled={isAllocating}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAllocate}
            variant="contained"
            disabled={!selectedLocationId || isAllocating}
            startIcon={isAllocating ? undefined : <CheckIcon />}
          >
            {isAllocating ? 'Alocando...' : 'Confirmar Alocação'}
          </Button>
        </DialogActions>
      </Dialog>
      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />
    </Container>
  );
};

export default ProductAllocationPage;