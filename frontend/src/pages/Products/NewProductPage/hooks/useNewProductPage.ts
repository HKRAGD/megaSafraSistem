import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CreateProductFormData, LocationWithChamber } from '../../../../types';
import { useProducts } from '../../../../hooks/useProducts';
import { useLocationsWithChambers } from '../../../../hooks/useLocationsWithChambers';
import { useSeedTypes } from '../../../../hooks/useSeedTypes';
import { useChambers } from '../../../../hooks/useChambers';
import { useToast } from '../../../../contexts/ToastContext';
import { useLoading } from '../../../../components/common/LoadingState';
import { useBatchProducts, BatchProductFormInput } from '../../../../hooks/useBatchProducts';

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
  } = useLocationsWithChambers({
    autoFetch: false,
    initialFilters: {}
  });
  const { 
    seedTypes, 
    loading: seedTypesLoading, 
    fetchSeedTypes 
  } = useSeedTypes({ autoFetch: false });
  const { 
    data: chambers, 
    loading: chambersLoading, 
    refetch: fetchChambers 
  } = useChambers({ autoFetch: false });

  // Estado da página
  const [selectedLocation, setSelectedLocation] = useState<LocationWithChamber | null>(null);
  const [allLocations, setAllLocations] = useState<LocationWithChamber[]>([]);

  // Hook para cadastro em lote
  const batchHook = useBatchProducts({
    onSuccess: (products) => {
      showSuccess(`Lote de ${products.length} produtos cadastrado com sucesso!`);
      navigate('/products');
    },
    onError: (message) => {
      showError(message);
    }
  });

  // ✅ CORREÇÃO: Carregamento único no mount para todos os dados necessários
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        await Promise.all([
          fetchSeedTypes(),
          fetchChambers(),
          fetchLocations()
        ]);
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
      }
    };

    loadInitialData();
  }, []); // Apenas no mount, sem dependências

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
  const handleBatchSubmit = () => {
    // Este handler não é mais necessário pois o submitBatch do hook já faz tudo
    // Mantido apenas para compatibilidade
    return Promise.resolve();
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
    formLoading: formLoading || batchHook.loading,
    hasRequiredData,
    hasError,
    isDataReady,
    

    
    // Handlers
    handleLocationSelect,
    handleSubmit,
    handleBatchSubmit,
    handleCancel,
    
    // Batch form
    batchForm: batchHook,
  };
}; 