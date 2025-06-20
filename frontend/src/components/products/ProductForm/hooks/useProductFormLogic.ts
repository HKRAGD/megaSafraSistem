import { useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import { Product, SeedType, LocationWithChamber, Chamber, CreateProductFormData, UpdateProductFormData } from '../../../../types';
import { productSchema, ProductFormData } from '../utils/productFormValidation';
import { 
  calculateTotalWeight, 
  calculateCapacityInfo, 
  findLocationById, 
  formatFormDataForSubmission,
  CapacityInfo
} from '../utils/productFormUtils';

interface UseProductFormLogicProps {
  product?: Product | null;
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  allLocations?: LocationWithChamber[]; // TODAS as localizações para o mapa 3D
  onSubmit: (data: CreateProductFormData | UpdateProductFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

export const useProductFormLogic = ({
  product,
  seedTypes,
  chambers,
  availableLocations,
  allLocations,
  onSubmit,
  onCancel,
  isEditing = false,
}: UseProductFormLogicProps) => {
  // Form setup
  const form = useForm({
    resolver: yupResolver(productSchema),
    defaultValues: {
      name: product?.name || '',
      lot: product?.lot || '',
      seedTypeId: product?.seedTypeId || '',
      quantity: product?.quantity || 1,
      storageType: product?.storageType || 'saco',
      weightPerUnit: product?.weightPerUnit || 50,
      locationId: product?.locationId || '',
      clientId: product?.clientId || '',
      expirationDate: product?.expirationDate ? new Date(product.expirationDate) : null,
      notes: product?.notes || '',
      tracking: {
        batchNumber: product?.tracking?.batchNumber || '',
        origin: product?.tracking?.origin || '',
        supplier: product?.tracking?.supplier || '',
        qualityGrade: product?.tracking?.qualityGrade || 'A',
      },
    },
  });

  // Watch form values
  const quantity = form.watch('quantity');
  const weightPerUnit = form.watch('weightPerUnit');
  const locationId = form.watch('locationId');

  // Computed values (sem useState desnecessário)
  const totalWeight = useMemo(() => {
    return calculateTotalWeight(quantity, weightPerUnit);
  }, [quantity, weightPerUnit]);

  const selectedLocation = useMemo(() => {
    return findLocationById(availableLocations, locationId);
  }, [availableLocations, locationId]);

  const capacityInfo: CapacityInfo | null = useMemo(() => {
    return calculateCapacityInfo(selectedLocation, totalWeight);
  }, [selectedLocation, totalWeight]);

  // Handlers
  const handleLocationSelect = useCallback((location: LocationWithChamber | null) => {
    if (location) {
      form.setValue('locationId', location.id);
    }
  }, [form]);

  const handleFormSubmit = useCallback(async (data: any) => {
    try {
      const formattedData = formatFormDataForSubmission(data, totalWeight);
      await onSubmit(formattedData);
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  }, [onSubmit, totalWeight]);

  const handleCancel = useCallback(() => {
    onCancel();
  }, [onCancel]);

  return {
    // Form
    form,
    handleSubmit: form.handleSubmit(handleFormSubmit),
    
    // Computed values
    totalWeight,
    selectedLocation,
    capacityInfo,
    
    // Handlers
    handleLocationSelect,
    handleCancel,
    
    // Props passthrough
    seedTypes,
    chambers,
    availableLocations,
    allLocations,
    isEditing,
    
    // Form state
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  };
}; 