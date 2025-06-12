import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProducts } from '../../../../hooks/useProducts';
import { useSeedTypes } from '../../../../hooks/useSeedTypes';
import { useChambers } from '../../../../hooks/useChambers';
import { useLocationsWithChambers } from '../../../../hooks/useLocationsWithChambers';
import { useAllLocationsWithChambers } from '../../../../hooks/useAllLocationsWithChambers';
import { CreateProductFormData, LocationWithChamber } from '../../../../types';

export const useNewProductPage = () => {
  const navigate = useNavigate();
  
  // Hooks de dados
  const { createProduct } = useProducts();
  const { seedTypes, loading: seedTypesLoading } = useSeedTypes();
  const { data: chambers, loading: chambersLoading } = useChambers();
  
  // Hook para localizações disponíveis (para seleção)
  const { 
    availableLocationsWithChambers,
    loading: locationsLoading,
    error: locationsError,
    refreshData: refreshLocations 
  } = useLocationsWithChambers({
    autoFetch: true,
    initialFilters: {}
  });

  // Hook para TODAS as localizações (para mapa 3D)
  const { 
    allLocationsWithChambers,
    loading: allLocationsLoading,
    error: allLocationsError,
    refreshData: refreshAllLocations
  } = useAllLocationsWithChambers({
    autoFetch: true,
    initialFilters: {}
  });

  // Estados para filtros do mapa 3D
  const [selectedChamber, setSelectedChamber] = useState<string | null>(null);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  
  // Estado para controlar carregamento inicial (evitar loop infinito)
  const [hasLoadedOnce, setHasLoadedOnce] = useState<boolean>(false);

  // Estado para controle de toast/feedback
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'success'
  });

  // Carregar dados quando o componente monta (apenas uma vez)
  useEffect(() => {
    if (!hasLoadedOnce) {
      setHasLoadedOnce(true);
      const loadData = async () => {
        try {
          // Chama as funções diretamente sem depender delas no useEffect
          // Isso evita loop infinito causado por mudanças nas referências das funções
          await Promise.all([
            refreshLocations(),
            refreshAllLocations()
          ]);
        } catch (error) {
          console.error('Erro ao carregar dados:', error);
          // Usando showToast diretamente para evitar dependência circular
          setToast({
            open: true,
            message: 'Erro ao carregar dados das localizações',
            severity: 'error'
          });
        }
      };

      loadData();
    }
  }, [hasLoadedOnce]); // ✅ CORREÇÃO: Apenas hasLoadedOnce como dependência
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Função para mostrar toast
  const showToast = useCallback((message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToast({
      open: true,
      message,
      severity
    });
  }, []);

  // Função para fechar toast
  const closeToast = useCallback(() => {
    setToast(prev => ({ ...prev, open: false }));
  }, []);

  // Handler para submissão do formulário
  const handleSubmit = useCallback(async (data: CreateProductFormData) => {
    try {
      await createProduct(data);
      showToast('Produto cadastrado com sucesso!', 'success');
      
      // Redirecionar após sucesso
      setTimeout(() => {
        navigate('/products');
      }, 1500);
    } catch (error: any) {
      console.error('Erro ao criar produto:', error);
      const errorMessage = error.response?.data?.message || 'Erro ao cadastrar produto';
      showToast(errorMessage, 'error');
    }
  }, [createProduct, navigate, showToast]);

  // Handler para cancelar
  const handleCancel = useCallback(() => {
    navigate('/products');
  }, [navigate]);

  // Handler para refresh de dados
  const refreshData = useCallback(async () => {
    try {
      await Promise.all([
        refreshLocations(),
        refreshAllLocations()
      ]);
      showToast('Dados atualizados com sucesso!', 'success');
    } catch (error) {
      console.error('Erro ao atualizar dados:', error);
      showToast('Erro ao atualizar dados', 'error');
    }
  }, [showToast]); // ✅ CORREÇÃO: Manter apenas showToast como dependência
  // eslint-disable-next-line react-hooks/exhaustive-deps

  // Computed values
  const isLoading = seedTypesLoading || chambersLoading || locationsLoading || allLocationsLoading;
  const hasError = locationsError || allLocationsError;

  // Filtrar localizações por câmara selecionada (para o mapa 3D)
  const filteredAllLocations = selectedChamber 
    ? allLocationsWithChambers.filter(location => location.chamber.id === selectedChamber)
    : allLocationsWithChambers;

  // Filtrar localizações disponíveis por câmara selecionada
  const filteredAvailableLocations = selectedChamber
    ? availableLocationsWithChambers.filter(location => location.chamber.id === selectedChamber)
    : availableLocationsWithChambers;

  return {
    // Dados
    seedTypes,
    chambers,
    availableLocations: filteredAvailableLocations,
    allLocations: filteredAllLocations,
    
    // Estados
    isLoading,
    hasError,
    
    // Filtros mapa 3D
    selectedChamber,
    setSelectedChamber,
    selectedFloor,
    setSelectedFloor,
    
    // Toast
    toast,
    showToast,
    closeToast,
    
    // Handlers
    handleSubmit,
    handleCancel,
    refreshData,
    
    // Dados originais (sem filtro para referência)
    originalAvailableLocations: availableLocationsWithChambers,
    originalAllLocations: allLocationsWithChambers,
  };
}; 