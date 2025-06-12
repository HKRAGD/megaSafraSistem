import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Alert,
  CircularProgress,
  Grid,
  TextField,
  MenuItem,
  InputAdornment,
  Chip,
  Fab,
  IconButton,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Add as AddIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  Refresh as RefreshIcon,
  MoreVert as MoreVertIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  SwapHoriz as MoveIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useProducts } from '../../hooks/useProducts';
import { useSeedTypes } from '../../hooks/useSeedTypes';
import { useChambers } from '../../hooks/useChambers';
import { useLocations } from '../../hooks/useLocations';
import { useLocationsWithChambers } from '../../hooks/useLocationsWithChambers';
import { useAllLocationsWithChambers } from '../../hooks/useAllLocationsWithChambers';
import { useDebounce } from '../../hooks/useDebounce';
import { PageHeader } from '../../components/layout/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { Modal } from '../../components/common/Modal';
import { ProductForm } from '../../components/products/ProductForm';
import ProductDetails from '../../components/products/ProductDetails';
import ProductEdit from '../../components/products/ProductEdit';
import ProductMove from '../../components/products/ProductMove';
import Toast from '../../components/common/Toast';
import { ProductWithRelations, ProductFilters, CreateProductFormData } from '../../types';

interface ProductActionsMenuProps {
  product: ProductWithRelations;
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  onView: () => void;
  onEdit: () => void;
  onMove: () => void;
  onDelete: () => void;
}

const ProductActionsMenu: React.FC<ProductActionsMenuProps> = ({
  anchorEl,
  open,
  onClose,
  onView,
  onEdit,
  onMove,
  onDelete,
}) => (
  <Menu anchorEl={anchorEl} open={open} onClose={onClose}>
    <MenuItem onClick={onView}>
      <ListItemIcon>
        <ViewIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Ver Detalhes</ListItemText>
    </MenuItem>
    <MenuItem onClick={onEdit}>
      <ListItemIcon>
        <EditIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Editar</ListItemText>
    </MenuItem>
    <MenuItem onClick={onMove}>
      <ListItemIcon>
        <MoveIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Mover</ListItemText>
    </MenuItem>
    <MenuItem onClick={onDelete}>
      <ListItemIcon>
        <DeleteIcon fontSize="small" />
      </ListItemIcon>
      <ListItemText>Remover</ListItemText>
    </MenuItem>
  </Menu>
);

export const ProductsPage: React.FC = () => {
  // ============================================================================
  // HOOKS PRINCIPAIS
  // ============================================================================
  
  const navigate = useNavigate();
  
  const {
    data: products,
    loading,
    error,
    totalPages,
    currentPage,
    totalItems,
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    moveProduct,
    getProduct,
    partialExit,
    partialMove,
    addStock
  } = useProducts();

  const { seedTypes, loading: seedTypesLoading } = useSeedTypes();
  const { data: chambers, loading: chambersLoading } = useChambers();
  const { data: locations, fetchAvailableLocations } = useLocations();
  
  // Hook especializado para localizações com informações de câmara
  const { 
    availableLocationsWithChambers,
    loading: locationsWithChambersLoading,
    error: locationsWithChambersError,
    refreshData: refreshLocationsWithChambers 
  } = useLocationsWithChambers({
    autoFetch: false, // Não buscar automaticamente, vamos controlar manualmente
    initialFilters: {}
  });

  // Hook para buscar TODAS as localizações (ocupadas + disponíveis) para o mapa 3D
  const { 
    allLocationsWithChambers,
    loading: allLocationsLoading,
    error: allLocationsError,
    refreshData: refreshAllLocations
  } = useAllLocationsWithChambers({
    autoFetch: false, // Controlar manualmente
    initialFilters: {}
  });

  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================

  const [filters, setFilters] = useState<ProductFilters>({
    search: '',
    page: 1,
    limit: 10,
    sort: 'createdAt',
    sortOrder: 'desc',
  });

  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);

  // Debounce da busca para não fazer muitas requisições
  const debouncedSearch = useDebounce(filters.search, 300);

  // Estado do Toast
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  // ============================================================================
  // CARREGAR DADOS
  // ============================================================================

  const loadProducts = useCallback(async () => {
    try {
      await fetchProducts(filters);
    } catch (error) {
      console.error('Erro ao carregar produtos:', error);
    }
  }, [fetchProducts, filters]);

  // Carregar localizações quando necessário (para formulário)
  const loadLocationsForForm = useCallback(async () => {
    try {
      await Promise.all([
        refreshLocationsWithChambers(), // Apenas disponíveis para seleção
        refreshAllLocations() // Todas para o mapa 3D
      ]);
    } catch (error) {
      console.error('Erro ao carregar localizações:', error);
    }
  }, [refreshLocationsWithChambers, refreshAllLocations]);

  const handleOpenCreateModal = () => {
    // Navegar para a página de novo produto ao invés de abrir modal
    navigate('/products/new');
  };

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  // Atualizar quando a busca mudar (debounced)
  useEffect(() => {
    setFilters(prev => ({ ...prev, search: debouncedSearch, page: 1 }));
  }, [debouncedSearch]);

  // Carregar dados auxiliares
  useEffect(() => {
    fetchAvailableLocations();
  }, [fetchAvailableLocations]);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleFilterChange = (field: keyof ProductFilters, value: any) => {
    setFilters(prev => ({
      ...prev,
      [field]: value,
      page: 1, // Reset page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSortChange = (sort: string, sortOrder: 'asc' | 'desc') => {
    setFilters(prev => ({ ...prev, sort, sortOrder }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      page: 1,
      limit: 10,
      sort: 'createdAt',
      sortOrder: 'desc',
    });
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, product: ProductWithRelations) => {
    setAnchorEl(event.currentTarget);
    setSelectedProduct(product);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  // ============================================================================
  // HANDLERS DOS MODAIS - VERSÃO CORRIGIDA
  // ============================================================================

  const handleViewDetails = () => {
    if (selectedProduct) {
      setShowDetailsModal(true);
    }
    handleMenuClose();
  };

  const handleEdit = () => {
    if (selectedProduct) {
      setShowEditModal(true);
    }
    handleMenuClose();
  };

  const handleMove = () => {
    if (selectedProduct) {
      setShowMoveModal(true);
      // Carregar localizações para movimentação se necessário
      if (availableLocationsWithChambers.length === 0) {
        refreshLocationsWithChambers();
      }
    }
    handleMenuClose();
  };

  const handleRemove = async () => {
    if (!selectedProduct) return;
    
    if (window.confirm(`Tem certeza que deseja remover o produto "${selectedProduct.name}"?`)) {
      try {
        await deleteProduct(selectedProduct.id);
        showToast('Produto removido com sucesso!', 'success');
        await loadProducts(); // Recarregar lista
      } catch (error: any) {
        showToast(error.message || 'Erro ao remover produto', 'error');
      }
    }
    handleMenuClose();
  };

  // ============================================================================
  // HANDLERS DAS OPERAÇÕES DOS MODAIS
  // ============================================================================

  const handleProductEdit = async (productData: {
    name: string;
    quantity: number;
    weightPerUnit: number;
    notes?: string;
  }) => {
    if (!selectedProduct) return;

    try {
      await updateProduct(selectedProduct.id, productData);
      setShowEditModal(false);
      setSelectedProduct(null);
      showToast('Produto atualizado com sucesso!', 'success');
      await loadProducts(); // Recarregar lista
    } catch (error: any) {
      showToast(error.message || 'Erro ao atualizar produto', 'error');
    }
  };

  const handleProductMove = async (newLocationId: string, reason: string) => {
    if (!selectedProduct) return;

    try {
      await moveProduct(selectedProduct.id, { newLocationId, reason });
      setShowMoveModal(false);
      setSelectedProduct(null);
      showToast('Produto movido com sucesso!', 'success');
      await loadProducts(); // Recarregar lista
    } catch (error: any) {
      showToast(error.message || 'Erro ao mover produto', 'error');
    }
  };

  const handlePartialMove = async (quantity: number, newLocationId: string, reason: string) => {
    if (!selectedProduct) return;

    try {
      await partialMove(selectedProduct.id, quantity, newLocationId, reason);
      setShowMoveModal(false);
      setSelectedProduct(null);
      showToast('Movimentação parcial realizada com sucesso!', 'success');
      await loadProducts(); // Recarregar lista
    } catch (error: any) {
      showToast(error.message || 'Erro na movimentação parcial', 'error');
    }
  };

  const handlePartialExit = async (quantity: number, reason: string) => {
    if (!selectedProduct) return;

    try {
      await partialExit(selectedProduct.id, quantity, reason);
      setShowMoveModal(false);
      setSelectedProduct(null);
      showToast('Saída realizada com sucesso!', 'success');
      await loadProducts(); // Recarregar lista
    } catch (error: any) {
      showToast(error.message || 'Erro na saída de produto', 'error');
    }
  };

  const handleAddStock = async (quantity: number, reason: string) => {
    if (!selectedProduct) return;

    try {
      await addStock(selectedProduct.id, quantity, reason);
      setShowMoveModal(false);
      setSelectedProduct(null);
      showToast('Estoque adicionado com sucesso!', 'success');
      await loadProducts(); // Recarregar lista
    } catch (error: any) {
      showToast(error.message || 'Erro ao adicionar estoque', 'error');
    }
  };

  // Função para mostrar toast
  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  // ============================================================================
  // CONFIGURAÇÃO DA TABELA
  // ============================================================================

  const tableColumns = [
    {
      id: 'name',
      label: 'Nome',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {product.name}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Lote: {product.lot}
          </Typography>
        </Box>
      ),
    },
    {
      id: 'seedType',
      label: 'Tipo de Semente',
      render: (product: ProductWithRelations) => {
        return product.seedType?.name || 'N/A';
      },
    },
    {
      id: 'quantity',
      label: 'Quantidade',
      sortable: true,
      render: (product: ProductWithRelations) => (
        <Box>
          <Typography variant="body2">
            {product.quantity} {product.storageType}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {product.totalWeight}kg
          </Typography>
        </Box>
      ),
    },
    {
      id: 'location',
      label: 'Localização',
      render: (product: ProductWithRelations) => {
        return (
          <Box>
            <Typography variant="body2">
              {product.location?.code || 'N/A'}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {product.location?.chamber?.name || ''}
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
        <Chip
          label={
            product.status === 'stored' ? 'Armazenado' :
            product.status === 'reserved' ? 'Reservado' : 'Removido'
          }
          color={
            product.status === 'stored' ? 'success' :
            product.status === 'reserved' ? 'warning' : 'default'
          }
          size="small"
        />
      ),
    },
    {
      id: 'expirationDate',
      label: 'Validade',
      sortable: true,
      render: (product: ProductWithRelations) => {
        if (!product.expirationDate) return 'N/A';
        const date = new Date(product.expirationDate);
        const now = new Date();
        const isExpiring = (date.getTime() - now.getTime()) < (30 * 24 * 60 * 60 * 1000);
        
        return (
          <Typography
            variant="body2"
            color={isExpiring ? 'error' : 'text.primary'}
          >
            {date.toLocaleDateString('pt-BR')}
          </Typography>
        );
      },
    },
    {
      id: 'actions',
      label: 'Ações',
      render: (product: ProductWithRelations) => (
        <IconButton
          size="small"
          onClick={(e) => handleMenuOpen(e, product)}
        >
          <MoreVertIcon />
        </IconButton>
      ),
    },
  ];

  // ============================================================================
  // LOADING STATE
  // ============================================================================

  if (loading && products.length === 0) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Box sx={{ p: 3 }}>
      <PageHeader
        title="Gerenciar Produtos"
        subtitle="Gerencie produtos, localizações e movimentações do sistema"
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadProducts}
              disabled={loading}
            >
              Atualizar
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={handleOpenCreateModal}
            >
              Novo Produto
            </Button>
          </>
        }
      />

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid size={{ xs: 12, md: 4 }}>
              <TextField
                fullWidth
                label="Buscar produtos"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                select
                label="Status"
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="stored">Armazenado</MenuItem>
                <MenuItem value="reserved">Reservado</MenuItem>
                <MenuItem value="removed">Removido</MenuItem>
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 3 }}>
              <TextField
                fullWidth
                select
                label="Tipo de Semente"
                value={filters.seedTypeId || ''}
                onChange={(e) => handleFilterChange('seedTypeId', e.target.value || undefined)}
                disabled={seedTypesLoading}
              >
                <MenuItem value="">Todos</MenuItem>
                {Array.isArray(seedTypes) && seedTypes.map((type) => (
                  <MenuItem key={type.id} value={type.id}>
                    {type.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 2 }}>
              <TextField
                fullWidth
                select
                label="Câmara"
                value={filters.chamberId || ''}
                onChange={(e) => handleFilterChange('chamberId', e.target.value || undefined)}
                disabled={chambersLoading}
              >
                <MenuItem value="">Todas</MenuItem>
                {Array.isArray(chambers) && chambers.map((chamber) => (
                  <MenuItem key={chamber.id} value={chamber.id}>
                    {chamber.name}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid size={{ xs: 12, md: 1 }}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<FilterIcon />}
                onClick={clearFilters}
              >
                Limpar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Tabela de Produtos */}
      <Card>
        <CardContent>
          <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Lista de Produtos
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total: {totalItems} produtos
            </Typography>
          </Box>

          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>
          ) : products.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 4 }}>
              <Typography variant="body2" color="text.secondary">
                Nenhum produto encontrado
              </Typography>
            </Box>
          ) : (
            <DataTable
              data={products}
              columns={tableColumns}
              loading={loading}
              totalItems={totalItems}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={handlePageChange}
              onSort={(field) => handleSortChange(field, filters.sortOrder === 'asc' ? 'desc' : 'asc')}
              sortBy={filters.sort}
              sortOrder={filters.sortOrder}
              emptyMessage="Nenhum produto encontrado"
            />
          )}
        </CardContent>
      </Card>

      {/* FAB para adicionar em mobile */}
      <Fab
        color="primary"
        aria-label="adicionar produto"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
        }}
        onClick={handleOpenCreateModal}
      >
        <AddIcon />
      </Fab>

      {/* Menu de Ações */}
      {selectedProduct && (
        <ProductActionsMenu
          product={selectedProduct}
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onView={handleViewDetails}
          onEdit={handleEdit}
          onMove={handleMove}
          onDelete={handleRemove}
        />
      )}

      {/* Modal de Criação */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Novo Produto"
        maxWidth="lg"
      >
        {(() => {
          // Verificar se há dados suficientes para renderizar o formulário
          const hasSeedTypes = Array.isArray(seedTypes) && seedTypes.length > 0;
          const hasChambers = Array.isArray(chambers) && chambers.length > 0;
          const hasLocations = availableLocationsWithChambers.length > 0;
          const hasAllLocations = allLocationsWithChambers.length > 0;
          
          // Mostrar loading apenas se estivermos carregando E não temos dados ainda
          if ((seedTypesLoading && !hasSeedTypes) || 
              (chambersLoading && !hasChambers) || 
              (locationsWithChambersLoading && !hasLocations) ||
              (allLocationsLoading && !hasAllLocations)) {
            return (
              <Box sx={{ p: 3, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" sx={{ mt: 2 }}>
                  Carregando dados necessários...
                </Typography>
                <Typography variant="caption" sx={{ mt: 1, display: 'block' }}>
                  Tipos: {hasSeedTypes ? '✅' : '⏳'} | 
                  Câmaras: {hasChambers ? '✅' : '⏳'} | 
                  Localizações: {hasLocations ? '✅' : '⏳'} |
                  Mapa: {hasAllLocations ? '✅' : '⏳'}
                </Typography>
              </Box>
            );
          }

          // Verificar se houve erro ao carregar dados críticos
          if (locationsWithChambersError || allLocationsError) {
            return (
              <Box sx={{ p: 3 }}>
                <Alert severity="error" sx={{ mb: 2 }}>
                  Erro ao carregar localizações: {locationsWithChambersError || allLocationsError}
                </Alert>
                <Button
                  variant="outlined"
                  onClick={() => loadLocationsForForm()}
                  disabled={locationsWithChambersLoading || allLocationsLoading}
                >
                  Tentar Novamente
                </Button>
              </Box>
            );
          }

          // Verificar se faltam dados essenciais
          if (!hasSeedTypes || !hasChambers || !hasLocations) {
            return (
              <Box sx={{ p: 3 }}>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Dados necessários não disponíveis para criar produtos.
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  • Tipos de Sementes: {hasSeedTypes ? '✅ Carregado' : '❌ Não encontrado'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Câmaras: {hasChambers ? '✅ Carregado' : '❌ Não encontrado'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Localizações Disponíveis: {hasLocations ? '✅ Carregado' : '❌ Não encontrado'}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  • Mapa Completo: {hasAllLocations ? '✅ Carregado' : '❌ Não encontrado'}
                </Typography>
              </Box>
            );
          }

          // Se chegamos aqui, temos dados suficientes para mostrar o formulário
          return (
            <ProductForm
              seedTypes={Array.isArray(seedTypes) ? seedTypes : []}
              chambers={Array.isArray(chambers) ? chambers : []}
              availableLocations={availableLocationsWithChambers}
              allLocations={allLocationsWithChambers}
              onSubmit={async (data) => {
                try {
                  await createProduct(data as CreateProductFormData);
                  setShowCreateModal(false);
                  showToast('Produto criado com sucesso!', 'success');
                  await loadProducts(); // Recarregar lista
                } catch (error: any) {
                  showToast(error.message || 'Erro ao criar produto', 'error');
                }
              }}
              onCancel={() => setShowCreateModal(false)}
            />
          );
        })()}
      </Modal>

      {/* Modal de Detalhes */}
      <Modal
        open={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedProduct(null);
        }}
        title="Detalhes do Produto"
        maxWidth="lg"
      >
        {selectedProduct && (
          <ProductDetails
            productId={selectedProduct.id}
            onClose={() => {
              setShowDetailsModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </Modal>

      {/* Modal de Edição */}
      <Modal
        open={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedProduct(null);
        }}
        title="Editar Produto"
        maxWidth="md"
      >
        {selectedProduct && (
          <ProductEdit
            product={selectedProduct}
            onSave={handleProductEdit}
            onCancel={() => {
              setShowEditModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </Modal>

      {/* Modal de Movimentação */}
      <Modal
        open={showMoveModal}
        onClose={() => {
          setShowMoveModal(false);
          setSelectedProduct(null);
        }}
        title="Mover Produto"
        maxWidth="md"
      >
        {selectedProduct && (
          <ProductMove
            product={selectedProduct}
            onMove={handleProductMove}
            onPartialMove={handlePartialMove}
            onPartialExit={handlePartialExit}
            onAddStock={handleAddStock}
            onCancel={() => {
              setShowMoveModal(false);
              setSelectedProduct(null);
            }}
          />
        )}
      </Modal>

      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />

    </Box>
  );
}; 