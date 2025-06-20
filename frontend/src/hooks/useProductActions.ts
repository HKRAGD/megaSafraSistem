/**
 * Hook customizado para ações de produtos
 * Gerencia todas as ações relacionadas aos produtos com FSM
 */

import { useState, useCallback } from 'react';
import { useAuth } from './useAuth';
import { productService } from '../services/productService';
import { Product, ProductStatus, CreateProductFormData, UpdateProductFormData } from '../types';

interface UseProductActionsReturn {
  loading: boolean;
  error: string | null;
  
  // Ações FSM
  locateProduct: (productId: string, locationId: string, reason?: string) => Promise<Product | null>;
  requestWithdrawal: (productId: string, type: 'TOTAL' | 'PARCIAL', quantity?: number, reason?: string) => Promise<any>;
  
  // Ações básicas
  createProduct: (data: CreateProductFormData) => Promise<Product | null>;
  updateProduct: (productId: string, data: UpdateProductFormData) => Promise<Product | null>;
  moveProduct: (productId: string, newLocationId: string, reason?: string) => Promise<Product | null>;
  deleteProduct: (productId: string, reason?: string) => Promise<boolean>;
  
  // Ações avançadas
  partialExit: (productId: string, quantity: number, reason?: string) => Promise<Product | null>;
  partialMove: (productId: string, quantity: number, newLocationId: string, reason?: string) => Promise<any>;
  addStock: (productId: string, quantity: number, reason?: string, weightPerUnit?: number) => Promise<Product | null>;
  
  // Utilitários
  findOptimalLocation: (quantity: number, weightPerUnit: number) => Promise<any>;
  validateProductData: (data: any) => Promise<any>;
  generateProductCode: (data: any) => Promise<any>;
  
  // Consultas especiais
  getProductsPendingLocation: () => Promise<Product[]>;
  getProductsPendingWithdrawal: () => Promise<Product[]>;
  
  // Estado
  clearError: () => void;
}

export const useProductActions = (): UseProductActionsReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user, isAdmin, isOperator, canCreateProduct, canLocateProduct, canMoveProduct } = useAuth();

  const handleAsync = useCallback(async <T>(
    operation: () => Promise<T>,
    successMessage?: string
  ): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await operation();
      
      if (successMessage) {
        // Aqui você pode adicionar um toast de sucesso se tiver
        console.log(successMessage);
      }
      
      return result;
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro inesperado';
      setError(errorMessage);
      console.error('Erro na operação:', errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  // ============================================================================
  // AÇÕES FSM (FINITE STATE MACHINE)
  // ============================================================================

  const locateProduct = useCallback(async (
    productId: string, 
    locationId: string, 
    reason?: string
  ): Promise<Product | null> => {
    if (!canLocateProduct()) {
      setError('Você não tem permissão para localizar produtos');
      return null;
    }

    return handleAsync(
      () => productService.locateProduct(productId, locationId, reason),
      'Produto localizado com sucesso'
    );
  }, [canLocateProduct, handleAsync]);

  const requestWithdrawal = useCallback(async (
    productId: string,
    type: 'TOTAL' | 'PARCIAL',
    quantity?: number,
    reason?: string
  ): Promise<any> => {
    if (!isAdmin()) {
      setError('Apenas administradores podem solicitar retiradas');
      return null;
    }

    return handleAsync(
      () => productService.requestWithdrawal(productId, type, quantity, reason),
      'Solicitação de retirada criada com sucesso'
    );
  }, [isAdmin, handleAsync]);

  // ============================================================================
  // AÇÕES BÁSICAS DE PRODUTO
  // ============================================================================

  const createProduct = useCallback(async (data: CreateProductFormData): Promise<Product | null> => {
    if (!canCreateProduct()) {
      setError('Você não tem permissão para criar produtos');
      return null;
    }

    return handleAsync(
      () => productService.createProductForHook(data),
      'Produto criado com sucesso'
    );
  }, [canCreateProduct, handleAsync]);

  const updateProduct = useCallback(async (
    productId: string, 
    data: UpdateProductFormData
  ): Promise<Product | null> => {
    if (!isAdmin() && !isOperator()) {
      setError('Você não tem permissão para atualizar produtos');
      return null;
    }

    return handleAsync(
      () => productService.updateProductForHook(productId, data),
      'Produto atualizado com sucesso'
    );
  }, [isAdmin, isOperator, handleAsync]);

  const moveProduct = useCallback(async (
    productId: string,
    newLocationId: string,
    reason?: string
  ): Promise<Product | null> => {
    if (!canMoveProduct()) {
      setError('Você não tem permissão para mover produtos');
      return null;
    }

    return handleAsync(
      () => productService.moveProductForHook(productId, newLocationId, reason),
      'Produto movido com sucesso'
    );
  }, [canMoveProduct, handleAsync]);

  const deleteProduct = useCallback(async (
    productId: string,
    reason?: string
  ): Promise<boolean> => {
    if (!isAdmin()) {
      setError('Apenas administradores podem remover produtos');
      return false;
    }

    const result = await handleAsync(
      () => productService.deleteProductForHook(productId, reason),
      'Produto removido com sucesso'
    );

    return result !== null;
  }, [isAdmin, handleAsync]);

  // ============================================================================
  // AÇÕES AVANÇADAS
  // ============================================================================

  const partialExit = useCallback(async (
    productId: string,
    quantity: number,
    reason?: string
  ): Promise<Product | null> => {
    if (!isAdmin()) {
      setError('Apenas administradores podem fazer saída parcial');
      return null;
    }

    return handleAsync(
      () => productService.partialExitForHook(productId, quantity, reason),
      'Saída parcial registrada com sucesso'
    );
  }, [isAdmin, handleAsync]);

  const partialMove = useCallback(async (
    productId: string,
    quantity: number,
    newLocationId: string,
    reason?: string
  ): Promise<any> => {
    if (!canMoveProduct()) {
      setError('Você não tem permissão para mover produtos');
      return null;
    }

    return handleAsync(
      () => productService.partialMoveForHook(productId, quantity, newLocationId, reason),
      'Movimentação parcial realizada com sucesso'
    );
  }, [canMoveProduct, handleAsync]);

  const addStock = useCallback(async (
    productId: string,
    quantity: number,
    reason?: string,
    weightPerUnit?: number
  ): Promise<Product | null> => {
    if (!canCreateProduct()) {
      setError('Você não tem permissão para adicionar estoque');
      return null;
    }

    return handleAsync(
      () => productService.addStockForHook(productId, quantity, reason, weightPerUnit),
      'Estoque adicionado com sucesso'
    );
  }, [canCreateProduct, handleAsync]);

  // ============================================================================
  // UTILITÁRIOS
  // ============================================================================

  const findOptimalLocation = useCallback(async (
    quantity: number,
    weightPerUnit: number
  ): Promise<any> => {
    return handleAsync(
      () => productService.findOptimalLocationForHook(quantity, weightPerUnit)
    );
  }, [handleAsync]);

  const validateProductData = useCallback(async (data: any): Promise<any> => {
    return handleAsync(
      () => productService.validateProductDataForHook(data)
    );
  }, [handleAsync]);

  const generateProductCode = useCallback(async (data: any): Promise<any> => {
    return handleAsync(
      () => productService.generateProductCodeForHook(data)
    );
  }, [handleAsync]);

  // ============================================================================
  // CONSULTAS ESPECIAIS
  // ============================================================================

  const getProductsPendingLocation = useCallback(async (): Promise<Product[]> => {
    if (!canLocateProduct()) {
      setError('Você não tem permissão para ver produtos aguardando locação');
      return [];
    }

    const result = await handleAsync(
      () => productService.getProductsPendingLocation()
    );

    return result || [];
  }, [canLocateProduct, handleAsync]);

  const getProductsPendingWithdrawal = useCallback(async (): Promise<Product[]> => {
    if (!isAdmin() && !isOperator()) {
      setError('Você não tem permissão para ver produtos aguardando retirada');
      return [];
    }

    const result = await handleAsync(
      () => productService.getProductsPendingWithdrawal()
    );

    return result || [];
  }, [isAdmin, isOperator, handleAsync]);

  // ============================================================================
  // UTILITÁRIOS DE ESTADO
  // ============================================================================

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    loading,
    error,
    
    // Ações FSM
    locateProduct,
    requestWithdrawal,
    
    // Ações básicas
    createProduct,
    updateProduct,
    moveProduct,
    deleteProduct,
    
    // Ações avançadas
    partialExit,
    partialMove,
    addStock,
    
    // Utilitários
    findOptimalLocation,
    validateProductData,
    generateProductCode,
    
    // Consultas especiais
    getProductsPendingLocation,
    getProductsPendingWithdrawal,
    
    // Estado
    clearError
  };
};