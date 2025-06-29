import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateProductFormData, LocationWithChamber } from '../../../../types';
import { useProducts } from '../../../../hooks/useProducts';
import { useLocationsWithChambers } from '../../../../hooks/useLocationsWithChambers';
import { useSeedTypes } from '../../../../hooks/useSeedTypes';
import { useChambers } from '../../../../hooks/useChambers';
import { useToast } from '../../../../contexts/ToastContext';
import { useLoading } from '../../../../components/common/LoadingState';
import { BatchFormData } from '../../../../components/products/BatchProductForm/utils/batchFormValidation';
import api from '../../../../services/api';

export const useNewProductPage = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, showWarning } = useToast();
  const { loading: formLoading, withLoading } = useLoading();
  
  // Hooks de dados
  const { createProduct } = useProducts();
  const { 
    availableLocationsWithChambers: availableLocations, 
    loading: locationsLoading, 
    refreshData: fetchLocations 
  } = useLocationsWithChambers();
  const { 
    seedTypes, 
    loading: seedTypesLoading, 
    fetchSeedTypes 
  } = useSeedTypes();
  const { 
    data: chambers, 
    loading: chambersLoading, 
    refetch: fetchChambers 
  } = useChambers();

  // Estado da página
  const [selectedLocation, setSelectedLocation] = useState<LocationWithChamber | null>(null);
  const [allLocations, setAllLocations] = useState<LocationWithChamber[]>([]);

  // ✅ CORREÇÃO: Removido useEffect duplicado que causava double-fetch
  // Os hooks individuais (useLocationsWithChambers, useSeedTypes, useChambers) 
  // já têm seus próprios useEffect para carregar dados automaticamente

  // Handler para seleção de localização
  const handleLocationSelect = (location: LocationWithChamber | null) => {
    setSelectedLocation(location);
    
    if (location?.isOccupied) {
      showWarning(`Localização ${location.code} está ocupada. Selecione outra localização.`);
    }
  };

  // Handler para submissão do formulário individual
  const handleSubmit = async (data: CreateProductFormData) => {
    return withLoading(async () => {
      try {
        // Calcular peso total
        const totalWeight = data.quantity * data.weightPerUnit;

        // Validações adicionais
        if (data.locationId && selectedLocation?.isOccupied) {
          showError('Não é possível cadastrar produto em localização ocupada.');
          return;
        }

        if (data.locationId && totalWeight > (selectedLocation?.maxCapacityKg || 0)) {
          showError('Peso total excede a capacidade da localização selecionada.');
          return;
        }

        await createProduct(data);
        
        // Feedback de sucesso baseado na situação
        if (data.locationId) {
          showSuccess(`Produto "${data.name}" cadastrado com sucesso na localização ${selectedLocation?.code}!`);
        } else {
          showSuccess(`Produto "${data.name}" cadastrado com sucesso! Status: Aguardando Locação.`);
        }
        
        // Navegar de volta para lista de produtos
        navigate('/products');
        
      } catch (error) {
        console.error('Erro ao criar produto:', error);
        showError('Erro ao cadastrar produto. Verifique os dados e tente novamente.');
      }
    });
  };

  // Handler para submissão do formulário em lote
  const handleBatchSubmit = async (data: BatchFormData) => {
    return withLoading(async () => {
      try {
        const response = await api.post('/products/batch', data);
        
        const { batchId, count } = response.data.data;
        showSuccess(`Lote de ${count} produtos cadastrado com sucesso! ID do lote: ${batchId}`);
        
        // Navegar de volta para lista de produtos
        navigate('/products');
        
      } catch (error: any) {
        console.error('Erro ao criar lote de produtos:', error);
        const errorMessage = error.response?.data?.message || 'Erro ao cadastrar lote de produtos. Verifique os dados e tente novamente.';
        showError(errorMessage);
      }
    });
  };

  // Handler para cancelar
  const handleCancel = () => {
    if (window.confirm('Deseja cancelar o cadastro? Todos os dados serão perdidos.')) {
      navigate('/products');
    }
  };

  // Estados derivados
  const isLoading = locationsLoading || seedTypesLoading || chambersLoading;
  const hasRequiredData = seedTypes.length > 0 && chambers.length > 0;
  const hasError = !hasRequiredData && !isLoading;

  // ✅ CORREÇÃO: Verificação adicional para prevenir warnings MUI
  const isDataReady = !isLoading && hasRequiredData;

  return {
    // Dados
    seedTypes,
    chambers,
    availableLocations,
    allLocations,
    selectedLocation,
    
    // Estados de loading
    isLoading,
    formLoading,
    hasRequiredData,
    hasError,
    isDataReady,
    

    
    // Handlers
    handleLocationSelect,
    handleSubmit,
    handleBatchSubmit,
    handleCancel,
  };
}; 