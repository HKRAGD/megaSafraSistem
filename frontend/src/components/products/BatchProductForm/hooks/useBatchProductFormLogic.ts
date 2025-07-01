import { useMemo, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { SeedType, LocationWithChamber, Chamber, Client } from '../../../../types';
import { batchFormSchema, BatchFormData } from '../utils/batchFormValidation';

interface UseBatchProductFormLogicProps {
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[];
  onSubmit: (data: BatchFormData) => void;
  onCancel: () => void;
}

// Dados padrão para novo produto
const getDefaultProductData = () => ({
  name: '',
  lot: '',
  seedTypeId: '',
  quantity: 1,
  storageType: 'saco' as const,
  weightPerUnit: 50,
  expirationDate: null,
  notes: ''
});

export const useBatchProductFormLogic = ({
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  onSubmit,
  onCancel,
}: UseBatchProductFormLogicProps) => {
  // Form setup with default values
  const form = useForm<BatchFormData>({
    resolver: yupResolver(batchFormSchema),
    defaultValues: {
      products: [getDefaultProductData()], // Começar com 1 produto
      clientId: '',
    },
  });

  // UseFieldArray para gerenciar array de produtos
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'products',
  });

  // Watch form values
  const clientId = form.watch('clientId');
  const products = form.watch('products');

  // Computed values
  const totalProducts = fields.length;
  const canAddProduct = totalProducts < 50; // Máximo conforme backend
  const canRemoveProduct = totalProducts > 1; // Mínimo 1 produto

  const totalBatchWeight = useMemo(() => {
    return products.reduce((total, product) => {
      const productWeight = (product.quantity || 0) * (product.weightPerUnit || 0);
      return total + productWeight;
    }, 0);
  }, [products]);

  // Use react-hook-form's built-in validation state

  // Handlers
  const handleAddProduct = useCallback(() => {
    if (canAddProduct) {
      append(getDefaultProductData());
    }
  }, [append, canAddProduct]);

  const handleRemoveProduct = useCallback((index: number) => {
    if (canRemoveProduct) {
      remove(index);
    }
  }, [remove, canRemoveProduct]);

  const handleFormSubmit = useCallback(async (data: BatchFormData) => {
    try {
      // Formatar dados para a API
      const formattedData = {
        clientId: data.clientId,
        products: data.products.map(product => ({
          ...product,
          totalWeight: product.quantity * product.weightPerUnit,
        })),
      };
      
      await onSubmit(formattedData);
    } catch (error) {
      console.error('Erro ao submeter lote de produtos:', error);
    }
  }, [onSubmit]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  const handleClientSelect = useCallback((client: Client | null) => {
    form.setValue('clientId', client?.id || '');
  }, [form]);

  return {
    // Form
    form,
    fields,
    handleSubmit: form.handleSubmit(handleFormSubmit),
    
    // Computed values
    totalProducts,
    totalBatchWeight,
    isFormValid: form.formState.isValid,
    canAddProduct,
    canRemoveProduct,
    
    // Handlers
    handleAddProduct,
    handleRemoveProduct,
    handleCancel,
    handleClientSelect,
    
    // Props passthrough
    seedTypes,
    chambers,
    availableLocations,
    allLocations,
    
    // Form state
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
    clientId,
  };
};