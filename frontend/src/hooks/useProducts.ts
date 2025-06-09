import { useState, useEffect, useCallback } from 'react';
import { 
  Product, 
  ProductWithRelations,
  ProductFilters, 
  CreateProductFormData, 
  MoveProductFormData,
  UseDataState 
} from '../types';
import { productService } from '../services/productService';

// ============================================================================
// FUNÇÃO DE MAPEAMENTO DE DADOS DA API
// ============================================================================

/**
 * Converte os dados de produto da API para o formato ProductWithRelations
 * API retorna: { seedTypeId: { _id, name, ... }, locationId: { _id, code, chamberId: { _id, name, ... }, ... } }
 * Frontend espera: { seedType: { id, name }, location: { id, code, chamber: { id, name } } }
 */
const mapApiProductToProductWithRelations = (apiProduct: any): ProductWithRelations => {
  // 🔄 Mapear dados da API para formato ProductWithRelations
  
  const mapped = {
    // Dados básicos do produto
    id: apiProduct._id || apiProduct.id,
    name: apiProduct.name,
    lot: apiProduct.lot,
    seedTypeId: (() => {
      const seedTypeData = apiProduct.seedType || apiProduct.seedTypeId;
      return typeof seedTypeData === 'object' ? (seedTypeData._id || seedTypeData.id) : seedTypeData;
    })(),
    quantity: apiProduct.quantity,
    storageType: apiProduct.storageType,
    weightPerUnit: apiProduct.weightPerUnit,
    totalWeight: apiProduct.totalWeight || apiProduct.calculatedTotalWeight,
    locationId: (() => {
      const locationData = apiProduct.location || apiProduct.locationId;
      return typeof locationData === 'object' ? (locationData._id || locationData.id) : locationData;
    })(),
    entryDate: apiProduct.entryDate,
    expirationDate: apiProduct.expirationDate,
    status: apiProduct.status,
    notes: apiProduct.notes,
    tracking: apiProduct.tracking,
    metadata: apiProduct.metadata,
    calculatedTotalWeight: apiProduct.calculatedTotalWeight || apiProduct.totalWeight,
    isNearExpiration: apiProduct.isNearExpiration || false,
    expirationStatus: apiProduct.expirationStatus || 'good',
    storageTimeDays: apiProduct.storageTimeDays || 0,
    createdAt: apiProduct.createdAt,
    updatedAt: apiProduct.updatedAt,

    // Relacionamentos mapeados - Lidar com diferentes estruturas da API
    seedType: (() => {
      // A API pode retornar tanto seedType quanto seedTypeId
      const seedTypeData = apiProduct.seedType || apiProduct.seedTypeId;
      if (seedTypeData && typeof seedTypeData === 'object') {
        return {
          id: seedTypeData._id || seedTypeData.id,
          name: seedTypeData.name,
        };
      }
      return undefined;
    })(),

    location: (() => {
      // A API pode retornar tanto location quanto locationId
      const locationData = apiProduct.location || apiProduct.locationId;
      if (locationData && typeof locationData === 'object') {
        return {
          id: locationData._id || locationData.id,
          code: locationData.code,
          maxCapacityKg: locationData.maxCapacityKg,
          currentWeightKg: locationData.currentWeightKg,
          chamber: (() => {
            // A câmara pode estar em chamberId ou diretamente em chamber
            const chamberData = locationData.chamberId || locationData.chamber;
            if (chamberData && typeof chamberData === 'object') {
              return {
                id: chamberData._id || chamberData.id,
                name: chamberData.name,
              };
            }
            return undefined;
          })(),
        };
      }
      return undefined;
    })(),
  };

  // ✅ Retornar produto mapeado
  
  return mapped;
};

// ============================================================================
// INTERFACE DO HOOK
// ============================================================================

interface UseProductsOptions {
  autoFetch?: boolean;
  initialFilters?: ProductFilters;
}

interface UseProductsReturn extends UseDataState<ProductWithRelations> {
  // Estado adicional específico
  selectedProduct: ProductWithRelations | null;
  filters: ProductFilters;
  totalItems: number; // Getter conveniente para total
  
  // Operações CRUD
  fetchProducts: (newFilters?: ProductFilters) => Promise<void>;
  createProduct: (productData: CreateProductFormData) => Promise<void>;
  updateProduct: (id: string, productData: Partial<CreateProductFormData>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Operações especiais
  moveProduct: (id: string, moveData: MoveProductFormData) => Promise<void>;
  getProduct: (id: string) => Promise<ProductWithRelations | null>;
  
  // Novas operações avançadas
  partialExit: (id: string, quantity: number, reason: string) => Promise<void>;
  partialMove: (id: string, quantity: number, newLocationId: string, reason: string) => Promise<void>;
  addStock: (id: string, quantity: number, reason: string, weightPerUnit?: number) => Promise<void>;
  
  // Análises e validações
  getDistributionAnalysis: () => Promise<any>;
  validateProductData: (productData: CreateProductFormData) => Promise<any>;
  findOptimalLocation: (productData: any) => Promise<any>;
  
  // Controle de estado
  setSelectedProduct: (product: ProductWithRelations | null) => void;
  setFilters: (filters: ProductFilters) => void;
  clearError: () => void;
  refetch: () => Promise<void>;
}

// ============================================================================
// HOOK IMPLEMENTATION
// ============================================================================

/**
 * Hook para gerenciar todos os dados e operações relacionadas a produtos
 * 
 * REGRA CRÍTICA: Este é o ÚNICO lugar onde requisições de produtos devem ser feitas!
 * NUNCA fazer requisições HTTP relacionadas a produtos fora deste hook!
 */
export const useProducts = (options: UseProductsOptions = {}): UseProductsReturn => {
  const { autoFetch = true, initialFilters = {} } = options;

  // ============================================================================
  // ESTADO LOCAL
  // ============================================================================

  const [data, setData] = useState<ProductWithRelations[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState<number>(0);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [hasNextPage, setHasNextPage] = useState<boolean>(false);
  const [hasPrevPage, setHasPrevPage] = useState<boolean>(false);
  
  // Estado específico de produtos
  const [selectedProduct, setSelectedProduct] = useState<ProductWithRelations | null>(null);
  const [filters, setFilters] = useState<ProductFilters>(initialFilters);

  // ============================================================================
  // FUNÇÕES AUXILIARES
  // ============================================================================

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // ============================================================================
  // OPERAÇÕES CRUD
  // ============================================================================

  /**
   * Buscar produtos com filtros
   */
  const fetchProducts = useCallback(async (newFilters?: ProductFilters): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const appliedFilters = newFilters || filters;
      const response = await productService.getAll(appliedFilters);
      
      // Estrutura correta da API: { success: true, data: { products: [...], pagination: {...} } }
      const apiProducts = response.data.products || [];
      const pagination = response.data.pagination || {};
      
      // 🔄 MAPEAR dados da API para formato ProductWithRelations
      const mappedProducts = apiProducts.map(mapApiProductToProductWithRelations);
      
      setData(mappedProducts);
      setTotal(pagination.totalItems || 0);
      setCurrentPage(pagination.currentPage || 1);
      setTotalPages(pagination.totalPages || 1);
      setHasNextPage(pagination.hasNextPage || false);
      setHasPrevPage(pagination.hasPrevPage || false);
      
      // Atualizar filtros aplicados
      setFilters(appliedFilters);
      
      console.log(`✅ ${mappedProducts.length} produtos carregados e mapeados`);
    } catch (error: any) {
      handleError(error, 'carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [filters, handleError, clearError]);

  /**
   * Criar novo produto
   * REGRA CRÍTICA: Uma localização = Um produto, Movimentação automática, Validação de capacidade
   */
  const createProduct = useCallback(async (productData: CreateProductFormData): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      const response = await productService.create(productData);
      
      // Estrutura correta da API: { success: true, data: Product }
      const apiProduct = response.data;
      
      // 🔄 MAPEAR produto criado para formato ProductWithRelations
      const mappedProduct = mapApiProductToProductWithRelations(apiProduct);
      
      // Adicionar produto à lista local
      setData(prevData => [mappedProduct, ...prevData]);
      setTotal(prevTotal => prevTotal + 1);
      
      console.log('✅ Produto criado e mapeado:', mappedProduct.name);
      console.log('🔄 Movimentação automática registrada pela API');
    } catch (error: any) {
      handleError(error, 'criar produto');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  /**
   * Atualizar produto existente
   * NOTA: Algumas alterações podem gerar movimentações automáticas
   */
  const updateProduct = useCallback(async (
    id: string, 
    productData: Partial<CreateProductFormData>
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar produto atual para comparações
      const currentProduct = data.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Produto não encontrado na lista local');
      }

      // 2. Atualizar produto via API
      const response = await productService.update(id, productData);
      
      // Estrutura correta da API: { success: true, data: Product }
      const apiProduct = response.data;
      
      // 🔄 MAPEAR produto atualizado para formato ProductWithRelations
      const mappedProduct = mapApiProductToProductWithRelations(apiProduct);
      
      // 3. Atualizar produto na lista local
      setData(prevData => 
        prevData.map(p => 
          p.id === id ? mappedProduct : p
        )
      );
      
      // 4. Atualizar produto selecionado se for o mesmo
      if (selectedProduct?.id === id) {
        setSelectedProduct(mappedProduct);
      }
      
      console.log('✅ Produto atualizado e mapeado:', mappedProduct.name);
      
      // Log de mudanças importantes
      if (currentProduct.locationId !== mappedProduct.locationId) {
        console.log('🔄 Localização alterada - Movimentação automática registrada');
      }
      
      if (currentProduct.totalWeight !== mappedProduct.totalWeight) {
        console.log('⚖️ Peso alterado - Capacidade recalculada');
      }
    } catch (error: any) {
      handleError(error, 'atualizar produto');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, selectedProduct, handleError, clearError]);

  /**
   * Remover produto
   * REGRA CRÍTICA: Libera localização, registra movimentação automática de saída
   */
  const deleteProduct = useCallback(async (id: string): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar produto para log
      const productToDelete = data.find(p => p.id === id);
      
      // 2. Remover produto via API
      await productService.delete(id);
      
      // 3. Remover produto da lista local
      setData(prevData => prevData.filter(p => p.id !== id));
      setTotal(prevTotal => prevTotal - 1);
      
      // 4. Limpar produto selecionado se for o mesmo
      if (selectedProduct?.id === id) {
        setSelectedProduct(null);
      }
      
      console.log('✅ Produto removido:', productToDelete?.name);
      console.log('🔄 Localização liberada e movimentação registrada');
    } catch (error: any) {
      handleError(error, 'remover produto');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, selectedProduct, handleError, clearError]);

  // ============================================================================
  // OPERAÇÕES ESPECIAIS
  // ============================================================================

  /**
   * Mover produto para nova localização
   * REGRA CRÍTICA: Uma localização = Um produto, Movimentação automática, Validação de capacidade
   */
  const moveProduct = useCallback(async (
    id: string, 
    moveData: MoveProductFormData
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar produto atual para validações
      const currentProduct = data.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Produto não encontrado na lista local');
      }

      // 2. Verificar se não está tentando mover para a mesma localização
      if (currentProduct.locationId === moveData.newLocationId) {
        throw new Error('O produto já está nesta localização');
      }

      // 3. Mover produto (API valida regras críticas automaticamente)
      const response = await productService.move(id, moveData);
      
      // Estrutura correta da API: { success: true, data: Product }
      const apiProduct = response.data;
      
      // 🔄 MAPEAR produto movido para formato ProductWithRelations
      const mappedProduct = mapApiProductToProductWithRelations(apiProduct);
      
      // 4. Atualizar produto na lista local
      setData(prevData => 
        prevData.map(p => 
          p.id === id ? mappedProduct : p
        )
      );
      
      // 5. Atualizar produto selecionado se for o mesmo
      if (selectedProduct?.id === id) {
        setSelectedProduct(mappedProduct);
      }
      
      console.log('✅ Produto movido com sucesso');
      console.log('📍 De:', currentProduct.location?.code);
      console.log('📍 Para:', mappedProduct.location?.code);
      console.log('🔄 Movimentação automática registrada pela API');
    } catch (error: any) {
      handleError(error, 'mover produto');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, selectedProduct, handleError, clearError]);

  /**
   * Obter produto específico por ID
   */
  const getProduct = useCallback(async (id: string): Promise<ProductWithRelations | null> => {
    clearError();

    try {
      const response = await productService.getById(id);
      
      // A API retorna: { success: true, data: { product: {...}, relatedData: {...} } }
      const apiData = response.data as any;
      console.log('🔍 DEBUG getProduct - Resposta da API:', apiData);
      
      const apiProduct = apiData?.data?.product || apiData?.product || apiData;
      
      if (!apiProduct) {
        console.error('❌ Produto não encontrado na resposta da API');
        console.error('📋 Estrutura recebida:', JSON.stringify(apiData, null, 2));
        return null;
      }
      
      console.log('📦 Produto da API antes do mapeamento:', apiProduct);
      
      // 🔄 MAPEAR produto para formato ProductWithRelations
      const mappedProduct = mapApiProductToProductWithRelations(apiProduct);
      
      console.log('✅ Produto carregado e mapeado:', mappedProduct.name);
      console.log('🔗 SeedType mapeado:', mappedProduct.seedType);
      console.log('📍 Location mapeada:', mappedProduct.location);
      return mappedProduct;
    } catch (error: any) {
      console.error('❌ Erro no getProduct:', error);
      handleError(error, 'carregar produto');
      return null;
    }
  }, [handleError, clearError]);

  // ============================================================================
  // ANÁLISES E VALIDAÇÕES
  // ============================================================================

  /**
   * Obter análise de distribuição dos produtos
   */
  const getDistributionAnalysis = useCallback(async () => {
    clearError();

    try {
      const response = await productService.getDistributionAnalysis();
      return response.data;
    } catch (error: any) {
      handleError(error, 'obter análise de distribuição');
      return null;
    }
  }, [handleError, clearError]);

  /**
   * Validar dados do produto
   */
  const validateProductData = useCallback(async (productData: CreateProductFormData) => {
    clearError();

    try {
      const response = await productService.validateData(productData);
      return response.data;
    } catch (error: any) {
      handleError(error, 'validar dados do produto');
      return null;
    }
  }, [handleError, clearError]);

  /**
   * Encontrar localização ótima para produto
   */
  const findOptimalLocation = useCallback(async (productData: any) => {
    clearError();

    try {
      const response = await productService.findOptimalLocation(productData);
      return response.data;
    } catch (error: any) {
      handleError(error, 'encontrar localização ótima');
      return null;
    }
  }, [handleError, clearError]);

  // ============================================================================
  // NOVAS OPERAÇÕES AVANÇADAS
  // ============================================================================

  /**
   * Saída parcial ou total de produto
   * REGRA CRÍTICA: Reduz quantidade ou remove produto completamente, libera localização se total
   */
  const partialExit = useCallback(async (
    id: string, 
    quantity: number, 
    reason: string
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar produto atual para validações
      const currentProduct = data.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Produto não encontrado na lista local');
      }

      // 2. Validações básicas
      if (quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      if (quantity > currentProduct.quantity) {
        throw new Error(`Quantidade solicitada (${quantity}) excede disponível (${currentProduct.quantity})`);
      }

      // 3. Executar saída parcial
      const response = await productService.partialExit(id, { quantity, reason });
      const result = response.data;
      
      // 4. Atualizar estado local baseado no resultado
      if (result.operation.totalRemoval) {
        // Produto foi completamente removido
        setData(prevData => prevData.filter(p => p.id !== id));
        setTotal(prevTotal => prevTotal - 1);
        
        // Limpar produto selecionado se for o mesmo
        if (selectedProduct?.id === id) {
          setSelectedProduct(null);
        }
        
        console.log('✅ Produto completamente removido por saída total');
      } else {
        // Produto teve quantidade reduzida
        const mappedProduct = mapApiProductToProductWithRelations(result.product);
        
        setData(prevData => 
          prevData.map(p => 
            p.id === id ? mappedProduct : p
          )
        );
        
        // Atualizar produto selecionado se for o mesmo
        if (selectedProduct?.id === id) {
          setSelectedProduct(mappedProduct);
        }
        
        console.log('✅ Saída parcial realizada com sucesso');
        console.log(`📦 Quantidade removida: ${result.operation.quantityRemoved}`);
        console.log(`📦 Quantidade restante: ${result.operation.remainingQuantity}`);
      }
      
      console.log('🔄 Movimentação de saída registrada automaticamente');
    } catch (error: any) {
      handleError(error, 'realizar saída de produto');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, selectedProduct, handleError, clearError]);

  /**
   * Movimentação parcial de produto
   * REGRA CRÍTICA: Cria novo produto na nova localização, reduz quantidade do original
   */
  const partialMove = useCallback(async (
    id: string, 
    quantity: number, 
    newLocationId: string, 
    reason: string
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar produto atual para validações
      const currentProduct = data.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Produto não encontrado na lista local');
      }

      // 2. Validações básicas
      if (quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      if (quantity >= currentProduct.quantity) {
        throw new Error('Para mover todo o estoque, use a movimentação total');
      }

      if (currentProduct.locationId === newLocationId) {
        throw new Error('Nova localização deve ser diferente da atual');
      }

      // 3. Executar movimentação parcial
      const response = await productService.partialMove(id, { quantity, newLocationId, reason });
      const result = response.data;
      
      // 4. Mapear produtos atualizados
      const mappedOriginProduct = mapApiProductToProductWithRelations(result.originProduct);
      const mappedNewProduct = mapApiProductToProductWithRelations(result.newProduct);
      
      // 5. Atualizar estado local
      setData(prevData => {
        // Atualizar produto original e adicionar novo produto
        const updatedData = prevData.map(p => 
          p.id === id ? mappedOriginProduct : p
        );
        return [...updatedData, mappedNewProduct];
      });
      
      setTotal(prevTotal => prevTotal + 1); // Novo produto foi criado
      
      // 6. Atualizar produto selecionado se for o original
      if (selectedProduct?.id === id) {
        setSelectedProduct(mappedOriginProduct);
      }
      
      console.log('✅ Movimentação parcial realizada com sucesso');
      console.log(`📦 Quantidade movida: ${result.operation.quantityMoved}`);
      console.log(`📍 De: ${result.operation.fromLocation}`);
      console.log(`📍 Para: ${result.operation.toLocation}`);
      console.log('🔄 Movimentações de saída e entrada registradas automaticamente');
    } catch (error: any) {
      handleError(error, 'realizar movimentação parcial');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, selectedProduct, handleError, clearError]);

  /**
   * Adicionar estoque a produto existente
   * REGRA CRÍTICA: Mesmo tipo e lote, validação de capacidade da localização
   */
  const addStock = useCallback(async (
    id: string, 
    quantity: number, 
    reason: string, 
    weightPerUnit?: number
  ): Promise<void> => {
    setLoading(true);
    clearError();

    try {
      // 1. Buscar produto atual para validações
      const currentProduct = data.find(p => p.id === id);
      if (!currentProduct) {
        throw new Error('Produto não encontrado na lista local');
      }

      // 2. Validações básicas
      if (quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      // 3. Executar adição de estoque
      const response = await productService.addStock(id, { quantity, reason, weightPerUnit });
      const result = response.data;
      
      // 4. Mapear produto atualizado
      const mappedProduct = mapApiProductToProductWithRelations(result.product);
      
      // 5. Atualizar estado local
      setData(prevData => 
        prevData.map(p => 
          p.id === id ? mappedProduct : p
        )
      );
      
      // 6. Atualizar produto selecionado se for o mesmo
      if (selectedProduct?.id === id) {
        setSelectedProduct(mappedProduct);
      }
      
      console.log('✅ Estoque adicionado com sucesso');
      console.log(`📦 Quantidade adicionada: ${result.operation.quantityAdded}`);
      console.log(`📦 Quantidade anterior: ${result.operation.previousQuantity}`);
      console.log(`📦 Nova quantidade: ${result.operation.newQuantity}`);
      console.log('🔄 Movimentação de ajuste registrada automaticamente');
    } catch (error: any) {
      handleError(error, 'adicionar estoque');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [data, selectedProduct, handleError, clearError]);

  // ============================================================================
  // FUNÇÃO DE REFETCH
  // ============================================================================

  const refetch = useCallback(async (): Promise<void> => {
    await fetchProducts();
  }, [fetchProducts]);

  // ============================================================================
  // EFEITO DE INICIALIZAÇÃO
  // ============================================================================

  useEffect(() => {
    if (autoFetch) {
      fetchProducts();
    }
  }, [autoFetch, fetchProducts]); // Apenas na montagem inicial

  // ============================================================================
  // RETORNO DO HOOK
  // ============================================================================

  return {
    // Estado dos dados
    data,
    loading,
    error,
    total,
    currentPage,
    totalPages,
    hasNextPage,
    hasPrevPage,
    
    // Estado específico
    selectedProduct,
    filters,
    totalItems: total, // Getter conveniente
    
    // Operações CRUD
    fetchProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    
    // Operações especiais
    moveProduct,
    getProduct,
    
    // Novas operações avançadas
    partialExit,
    partialMove,
    addStock,
    
    // Análises e validações
    getDistributionAnalysis,
    validateProductData,
    findOptimalLocation,
    
    // Controle de estado
    setSelectedProduct,
    setFilters,
    clearError,
    refetch,
  };
};

export default useProducts; 