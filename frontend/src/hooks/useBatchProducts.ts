import { useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { productService } from '../services/productService';
import { CreateProductFormData, ApiResponse, Product, CreateBatchProductsPayload } from '../types';
import { batchIndividualProductSchema, batchFormSchema } from '../schemas/productSchemas';

// Constants
export const MAX_BATCH_PRODUCTS = 50;

// Type for the form data
export type BatchProductFormInput = yup.InferType<typeof batchFormSchema>;

interface UseBatchProductsProps {
  onSuccess?: (products: Product[]) => void;
  onError?: (message: string) => void;
  defaultValues?: BatchProductFormInput;
}

export const useBatchProducts = ({
  onSuccess,
  onError,
  defaultValues
}: UseBatchProductsProps) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BatchProductFormInput>({
    resolver: yupResolver(batchFormSchema),
    defaultValues: defaultValues || {
      clientId: '',
      products: [
        { // Initial empty product for the form
          name: '',
          lot: '',
          seedTypeId: '',
          quantity: 1,
          storageType: 'saco',
          weightPerUnit: 50,
          expirationDate: undefined,
          notes: ''
        }
      ]
    }
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: 'products'
  });

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Function to add a new product to the batch
  const addProduct = useCallback(() => {
    append({
      name: '',
      lot: '',
      seedTypeId: '',
      quantity: 1,
      storageType: 'saco',
      weightPerUnit: 50,
      expirationDate: null,
      notes: ''
    });
  }, [append]);

  // Function to remove a product from the batch by index
  const removeProduct = useCallback((index: number) => {
    remove(index);
  }, [remove]);

  // Function to update a product in the batch by index
  const updateProduct = useCallback((index: number, data: yup.InferType<typeof batchIndividualProductSchema>) => {
    update(index, data);
  }, [update]);

  // Custom validation for the entire batch (beyond schema validation)
  const validateBatch = useCallback(async (): Promise<boolean> => {
    const isValid = await form.trigger(); // Trigger all form validations
    if (!isValid) {
      setError('Por favor, corrija os erros nos campos do formulário.');
      return false;
    }

    clearError();
    return true;
  }, [form, clearError]);

  // Submission handler
  const submitBatch = useCallback(async (data: BatchProductFormInput) => {
    setLoading(true);
    setError(null);

    try {
      const payload: CreateBatchProductsPayload = {
        clientId: data.clientId,
        products: data.products.map(product => ({
          ...product,
          expirationDate: product.expirationDate ? product.expirationDate.toISOString() : undefined
        }))
      };

      const response = await productService.createBatchProducts(payload);

      if (response.success && response.data?.products) {
        onSuccess?.(response.data.products);
        form.reset(defaultValues);
      } else {
        throw new Error(response.message || 'Erro desconhecido ao cadastrar lote de produtos.');
      }
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Erro ao submeter lote de produtos.';
      setError(errorMessage);
      onError?.(errorMessage);
      console.error('Erro ao submeter lote de produtos:', err);
    } finally {
      setLoading(false);
    }
  }, [onSuccess, onError, form, defaultValues]);

  // Calculate individual product weight (internal utility)
  const calculateProductTotalWeight = useCallback((index: number) => {
    const product = form.getValues(`products.${index}`);
    if (!product) return 0;
    return (product.quantity || 0) * (product.weightPerUnit || 0);
  }, [form]);

  // Expose total products in the batch
  const totalProductsInBatch = useMemo(() => fields.length, [fields.length]);

  // Calculate total batch weight
  const totalBatchWeight = useMemo(() => {
    const products = form.watch('products') || [];
    return products.reduce((total, product) => {
      const quantity = product?.quantity || 0;
      const weightPerUnit = product?.weightPerUnit || 0;
      return total + (quantity * weightPerUnit);
    }, 0);
  }, [form]);

  return {
    form,
    fields,
    addProduct,
    removeProduct,
    updateProduct,
    validateBatch,
    submitBatch: form.handleSubmit(submitBatch),
    loading,
    error,
    clearError,
    totalProductsInBatch,
    totalBatchWeight,
    formState: form.formState
  };
};