import { useState, useCallback, useMemo } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { productService } from '../services/productService';
import { CreateProductFormData, ApiResponse, Product } from '../types';

// This schema will be for each individual product within the batch
const batchIndividualProductSchema = yup.object({
  name: yup.string().min(2, 'Nome deve ter pelo menos 2 caracteres').required('Nome é obrigatório'),
  lot: yup.string().min(1, 'Lote é obrigatório').required('Lote é obrigatório'),
  seedTypeId: yup.string().required('Tipo de semente é obrigatório'),
  quantity: yup.number().integer('Quantidade deve ser um número inteiro').min(1, 'Quantidade deve ser pelo menos 1').required('Quantidade é obrigatória'),
  storageType: yup.string().oneOf(['saco', 'bag'], 'Tipo de armazenamento inválido').required('Tipo de armazenamento é obrigatório'),
  weightPerUnit: yup.number().min(0.001, 'Peso deve ser pelo menos 0.001kg').max(1500, 'Peso não pode exceder 1500kg').required('Peso por unidade é obrigatório'),
  expirationDate: yup.date().nullable().min(new Date(), 'Data de expiração deve ser futura').optional(),
  notes: yup.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional(),
  tracking: yup.object({
    batchNumber: yup.string().max(50, 'Número do lote deve ter no máximo 50 caracteres').optional(),
    origin: yup.string().max(200, 'Origem deve ter no máximo 200 caracteres').optional(),
    supplier: yup.string().max(200, 'Fornecedor deve ter no máximo 200 caracteres').optional(),
    qualityGrade: yup.string().oneOf(['A', 'B', 'C', 'D'], 'Grau de qualidade inválido').optional()
  }).optional()
});

// This is the main schema for the batch form
const batchFormSchema = yup.object({
  clientId: yup.string().required('Cliente é obrigatório para cadastro em lote'),
  products: yup.array()
    .of(batchIndividualProductSchema)
    .min(1, 'É necessário adicionar pelo menos 1 produto ao lote')
    .max(50, 'O número máximo de produtos por lote é 50')
    .required('A lista de produtos não pode ser vazia')
});

// Type for the form data
export type BatchProductFormInput = yup.InferType<typeof batchFormSchema>;
// Type for the API payload
export type CreateBatchProductsPayload = {
  clientId: string;
  products: Array<Omit<CreateProductFormData, 'locationId' | 'clientId'>>;
};

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
          expirationDate: null,
          notes: '',
          tracking: {
            batchNumber: '',
            origin: '',
            supplier: '',
            qualityGrade: 'A'
          }
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
      notes: '',
      tracking: {
        batchNumber: '',
        origin: '',
        supplier: '',
        qualityGrade: 'A'
      }
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
          expirationDate: product.expirationDate ? product.expirationDate.toISOString() : undefined,
          locationId: undefined,
          clientId: undefined
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

  // Expose total weight for each product in the batch (if needed for display)
  const calculateProductTotalWeight = useCallback((index: number) => {
    const product = form.getValues(`products.${index}`);
    if (!product) return 0;
    return (product.quantity || 0) * (product.weightPerUnit || 0);
  }, [form]);

  // Expose total products in the batch
  const totalProductsInBatch = useMemo(() => fields.length, [fields.length]);

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
    calculateProductTotalWeight,
    formState: form.formState
  };
};