import { 
  Product, 
  CreateProductFormData, 
  MoveProductFormData,
  ProductFilters,
  ApiResponse,
  PaginatedResponse,
  ProductsResponse 
} from '../types';
import api, { apiGet, apiPost, apiPut, apiDelete } from './api';

// ============================================================================
// PRODUCT SERVICE - CRUD de Produtos
// ============================================================================

/**
 * Service responsável por todas as operações com produtos
 * Endpoints baseados na documentação: /api/products/*
 */
export const productService = {
  /**
   * Listar todos os produtos com filtros e paginação
   * GET /api/products
   */
  getAll: async (filters?: ProductFilters): Promise<ApiResponse<ProductsResponse>> => {
    try {
      const response = await apiGet<ApiResponse<ProductsResponse>>('/products', {
        params: filters
      });
      
      console.log(`✅ ${response.data.products.length} produtos carregados`);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao carregar produtos:', error);
      throw error;
    }
  },

  /**
   * Obter produto específico por ID
   * GET /api/products/:id
   */
  getById: async (id: string): Promise<ApiResponse<Product>> => {
    try {
      const response = await apiGet<ApiResponse<Product>>(`/products/${id}`);
      
      console.log('✅ Produto carregado:', response.data.name);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao carregar produto:', error);
      throw error;
    }
  },

  /**
   * Criar novo produto
   * POST /api/products
   */
  create: async (productData: CreateProductFormData): Promise<ApiResponse<Product>> => {
    try {
      const response = await apiPost<ApiResponse<Product>>('/products', productData);
      
      console.log('✅ Produto criado:', response.data.name);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao criar produto:', error);
      throw error;
    }
  },

  /**
   * Atualizar produto existente
   * PUT /api/products/:id
   */
  update: async (id: string, productData: Partial<CreateProductFormData>): Promise<ApiResponse<Product>> => {
    try {
      const response = await apiPut<ApiResponse<Product>>(`/products/${id}`, productData);
      
      console.log('✅ Produto atualizado:', response.data.name);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao atualizar produto:', error);
      throw error;
    }
  },

  /**
   * Remover produto
   * DELETE /api/products/:id
   */
  delete: async (id: string): Promise<ApiResponse<void>> => {
    try {
      const response = await apiDelete<ApiResponse<void>>(`/products/${id}`);
      
      console.log('✅ Produto removido com sucesso');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao remover produto:', error);
      throw error;
    }
  },

  /**
   * Mover produto para nova localização
   * POST /api/products/:id/move
   */
  move: async (id: string, moveData: MoveProductFormData): Promise<ApiResponse<Product>> => {
    try {
      const response = await apiPost<ApiResponse<Product>>(`/products/${id}/move`, moveData);
      
      console.log('✅ Produto movido com sucesso');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao mover produto:', error);
      throw error;
    }
  },

  /**
   * Análise de distribuição de produtos
   * GET /api/products/distribution-analysis
   */
  getDistributionAnalysis: async (): Promise<ApiResponse<{
    byStatus: Record<string, number>;
    bySeedType: Record<string, number>;
    byChamber: Record<string, number>;
    byStorageType: Record<string, number>;
  }>> => {
    try {
      const response = await apiGet<ApiResponse<{
        byStatus: Record<string, number>;
        bySeedType: Record<string, number>;
        byChamber: Record<string, number>;
        byStorageType: Record<string, number>;
      }>>('/products/distribution-analysis');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao obter análise de distribuição:', error);
      throw error;
    }
  },

  /**
   * Validar dados do produto
   * POST /api/products/validate-data
   */
  validateData: async (productData: CreateProductFormData): Promise<ApiResponse<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>> => {
    try {
      const response = await apiPost<ApiResponse<{
        isValid: boolean;
        errors: string[];
        warnings: string[];
      }>>('/products/validate-data', productData);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao validar dados do produto:', error);
      throw error;
    }
  },

  /**
   * Encontrar localização ótima para produto
   * POST /api/products/find-optimal-location
   */
  findOptimalLocation: async (productData: {
    seedTypeId: string;
    totalWeight: number;
    preferredChamberId?: string;
  }): Promise<ApiResponse<{
    locationId: string;
    locationCode: string;
    chamberName: string;
    score: number;
    reasons: string[];
  }>> => {
    try {
      const response = await apiPost<ApiResponse<{
        locationId: string;
        locationCode: string;
        chamberName: string;
        score: number;
        reasons: string[];
      }>>('/products/find-optimal-location', productData);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao encontrar localização ótima:', error);
      throw error;
    }
  },

  /**
   * Gerar código único para produto
   * POST /api/products/generate-code
   */
  generateCode: async (productData: {
    seedTypeId: string;
    lot: string;
  }): Promise<ApiResponse<{
    code: string;
    suggestion: string;
  }>> => {
    try {
      const response = await apiPost<ApiResponse<{
        code: string;
        suggestion: string;
      }>>('/products/generate-code', productData);
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao gerar código do produto:', error);
      throw error;
    }
  },

  /**
   * Saída parcial ou total de produto
   * POST /api/products/:id/partial-exit
   */
  partialExit: async (id: string, exitData: {
    quantity: number;
    reason: string;
  }): Promise<ApiResponse<{
    product: Product;
    operation: {
      type: 'partial_exit';
      quantityRemoved: number;
      weightRemoved: number;
      remainingQuantity: number;
      remainingWeight: number;
      totalRemoval: boolean;
    };
    movement: {
      id: string;
      timestamp: string;
    };
  }>> => {
    try {
      const response = await apiPost<ApiResponse<{
        product: Product;
        operation: {
          type: 'partial_exit';
          quantityRemoved: number;
          weightRemoved: number;
          remainingQuantity: number;
          remainingWeight: number;
          totalRemoval: boolean;
        };
        movement: {
          id: string;
          timestamp: string;
        };
      }>>(`/products/${id}/partial-exit`, exitData);
      
      console.log('✅ Saída parcial realizada com sucesso');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro na saída parcial:', error);
      throw error;
    }
  },

  /**
   * Movimentação parcial de produto
   * POST /api/products/:id/partial-move
   */
  partialMove: async (id: string, moveData: {
    quantity: number;
    newLocationId: string;
    reason: string;
  }): Promise<ApiResponse<{
    originProduct: Product;
    newProduct: Product;
    operation: {
      type: 'partial_move';
      quantityMoved: number;
      weightMoved: number;
      fromLocation: string;
      toLocation: string;
    };
    movements: {
      exit: string;
      entry: string;
    };
  }>> => {
    try {
      const response = await apiPost<ApiResponse<{
        originProduct: Product;
        newProduct: Product;
        operation: {
          type: 'partial_move';
          quantityMoved: number;
          weightMoved: number;
          fromLocation: string;
          toLocation: string;
        };
        movements: {
          exit: string;
          entry: string;
        };
      }>>(`/products/${id}/partial-move`, moveData);
      
      console.log('✅ Movimentação parcial realizada com sucesso');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro na movimentação parcial:', error);
      throw error;
    }
  },

  /**
   * Adicionar estoque a produto existente
   * POST /api/products/:id/add-stock
   */
  addStock: async (id: string, stockData: {
    quantity: number;
    reason: string;
    weightPerUnit?: number;
  }): Promise<ApiResponse<{
    product: Product;
    operation: {
      type: 'add_stock';
      quantityAdded: number;
      weightAdded: number;
      previousQuantity: number;
      newQuantity: number;
      previousWeight: number;
      newWeight: number;
    };
    movement: {
      id: string;
      timestamp: string;
    };
  }>> => {
    try {
      const response = await apiPost<ApiResponse<{
        product: Product;
        operation: {
          type: 'add_stock';
          quantityAdded: number;
          weightAdded: number;
          previousQuantity: number;
          newQuantity: number;
          previousWeight: number;
          newWeight: number;
        };
        movement: {
          id: string;
          timestamp: string;
        };
      }>>(`/products/${id}/add-stock`, stockData);
      
      console.log('✅ Estoque adicionado com sucesso');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao adicionar estoque:', error);
      throw error;
    }
  },

  // ============================================================================
  // NOVAS FUNÇÕES FSM (FINITE STATE MACHINE)
  // ============================================================================

  /**
   * Localizar produto aguardando locação
   * POST /api/products/:id/locate
   */
  locateProduct: async (id: string, locationId: string, reason?: string): Promise<Product> => {
    try {
      const response = await apiPost<ApiResponse<{ product: Product }>>(`/products/${id}/locate`, {
        locationId,
        reason
      });
      
      console.log('✅ Produto localizado com sucesso');
      
      return response.data.product;
    } catch (error: any) {
      console.error('❌ Erro ao localizar produto:', error);
      throw error;
    }
  },

  /**
   * Solicitar retirada de produto
   * POST /api/products/:id/request-withdrawal
   */
  requestWithdrawal: async (
    id: string, 
    type: 'TOTAL' | 'PARCIAL', 
    quantity?: number, 
    reason?: string
  ): Promise<any> => {
    try {
      const response = await apiPost<ApiResponse<any>>(`/products/${id}/request-withdrawal`, {
        type,
        quantity,
        reason
      });
      
      console.log('✅ Solicitação de retirada criada com sucesso');
      
      return response.data;
    } catch (error: any) {
      console.error('❌ Erro ao solicitar retirada:', error);
      throw error;
    }
  },

  /**
   * Buscar produtos aguardando locação
   * GET /api/products/pending-location
   */
  getProductsPendingLocation: async (): Promise<Product[]> => {
    try {
      const response = await apiGet<ApiResponse<{ products: Product[] }>>('/products/pending-location');
      
      console.log(`✅ ${response.data.products.length} produtos aguardando locação`);
      
      return response.data.products;
    } catch (error: any) {
      console.error('❌ Erro ao buscar produtos aguardando locação:', error);
      throw error;
    }
  },

  /**
   * Buscar produtos aguardando retirada
   * GET /api/products/pending-withdrawal
   */
  getProductsPendingWithdrawal: async (): Promise<Product[]> => {
    try {
      const response = await apiGet<ApiResponse<{ products: Product[] }>>('/products/pending-withdrawal');
      
      console.log(`✅ ${response.data.products.length} produtos aguardando retirada`);
      
      return response.data.products;
    } catch (error: any) {
      console.error('❌ Erro ao buscar produtos aguardando retirada:', error);
      throw error;
    }
  },

  // ============================================================================
  // FUNÇÕES DE CONVENIÊNCIA PARA HOOKS
  // ============================================================================

  /**
   * Criar produto (versão simplificada para hook)
   */
  createProductForHook: async (data: CreateProductFormData): Promise<Product> => {
    const response = await productService.create(data);
    return response.data;
  },

  /**
   * Atualizar produto (versão simplificada para hook)
   */
  updateProductForHook: async (id: string, data: Partial<CreateProductFormData>): Promise<Product> => {
    const response = await productService.update(id, data);
    return response.data;
  },

  /**
   * Mover produto (versão simplificada para hook)
   */
  moveProductForHook: async (id: string, newLocationId: string, reason?: string): Promise<Product> => {
    const response = await productService.move(id, { newLocationId, reason });
    return response.data;
  },

  /**
   * Remover produto (versão simplificada para hook)
   */
  deleteProductForHook: async (id: string, reason?: string): Promise<void> => {
    await productService.delete(id);
  },

  /**
   * Encontrar localização ótima (versão simplificada para hook)
   */
  findOptimalLocationForHook: async (quantity: number, weightPerUnit: number): Promise<any> => {
    const response = await productService.findOptimalLocation({
      seedTypeId: '', // Será preenchido conforme necessário
      totalWeight: quantity * weightPerUnit
    });
    return response.data;
  },

  /**
   * Validar dados de produto (versão simplificada para hook)
   */
  validateProductDataForHook: async (data: any): Promise<any> => {
    const response = await productService.validateData(data);
    return response.data;
  },

  /**
   * Gerar código de produto (versão simplificada para hook)
   */
  generateProductCodeForHook: async (data: any): Promise<any> => {
    const response = await productService.generateCode(data);
    return response.data;
  },

  /**
   * Saída parcial (versão simplificada para hook)
   */
  partialExitForHook: async (id: string, quantity: number, reason?: string): Promise<Product> => {
    const response = await productService.partialExit(id, {
      quantity,
      reason: reason || 'Saída manual de estoque'
    });
    return response.data.product;
  },

  /**
   * Movimentação parcial (versão simplificada para hook)
   */
  partialMoveForHook: async (id: string, quantity: number, newLocationId: string, reason?: string): Promise<any> => {
    const response = await productService.partialMove(id, {
      quantity,
      newLocationId,
      reason: reason || 'Movimentação parcial'
    });
    return response.data;
  },

  /**
   * Adicionar estoque (versão simplificada para hook)
   */
  addStockForHook: async (id: string, quantity: number, reason?: string, weightPerUnit?: number): Promise<Product> => {
    const response = await productService.addStock(id, {
      quantity,
      reason: reason || 'Adição de estoque',
      weightPerUnit
    });
    return response.data.product;
  }
};

export default productService; 