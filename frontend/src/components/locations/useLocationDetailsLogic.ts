import { useState, useMemo, useCallback } from 'react';
import { Location, Chamber } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { getOccupancyInfo, validateCapacity, formatDateBR } from './locationDetailsUtils';

interface UseLocationDetailsLogicProps {
  location: Location;
  chamber?: Chamber | null;
  onUpdate?: (locationId: string, data: any) => void;
  onClose: () => void;
}

export const useLocationDetailsLogic = ({
  location,
  chamber,
  onUpdate,
  onClose,
}: UseLocationDetailsLogicProps) => {
  // Estados locais
  const [isEditing, setIsEditing] = useState(false);
  const [editedCapacity, setEditedCapacity] = useState(location.maxCapacityKg);
  const [showProductsDialog, setShowProductsDialog] = useState(false);

  // Hook para buscar produtos nesta localização
  const { data: products, loading: productsLoading } = useProducts({
    initialFilters: { locationId: location.id }
  });

  // Informações de ocupação computadas
  const occupancyInfo = useMemo(() => getOccupancyInfo(location), [location]);

  // Validação da capacidade editada
  const capacityValidation = useMemo(() => validateCapacity(editedCapacity), [editedCapacity]);

  // Informações formatadas
  const formattedDates = useMemo(() => ({
    created: formatDateBR(location.createdAt),
    updated: formatDateBR(location.updatedAt),
  }), [location.createdAt, location.updatedAt]);

  // Informações do cabeçalho
  const headerInfo = useMemo(() => ({
    code: location.code,
    isOccupied: location.isOccupied,
    statusColor: location.isOccupied ? 'error' as const : 'success' as const,
    statusLabel: location.isOccupied ? 'Ocupada' : 'Disponível',
  }), [location.code, location.isOccupied]);

  // Informações das coordenadas
  const coordinatesInfo = useMemo(() => ([
    { label: 'Quadra', value: location.coordinates.quadra },
    { label: 'Lado', value: location.coordinates.lado },
    { label: 'Fila', value: location.coordinates.fila },
    { label: 'Andar', value: location.coordinates.andar },
  ]), [location.coordinates]);

  // Informações de capacidade
  const capacityInfo = useMemo(() => ({
    max: location.maxCapacityKg,
    current: location.currentWeightKg,
    available: occupancyInfo.available,
    occupancy: occupancyInfo,
  }), [location.maxCapacityKg, location.currentWeightKg, occupancyInfo]);

  // Handlers com useCallback para performance
  const handleStartEdit = useCallback(() => {
    setIsEditing(true);
  }, []);

  const handleSaveCapacity = useCallback(async () => {
    if (!capacityValidation.valid || !onUpdate) return;
    
    try {
      await onUpdate(location.id, { maxCapacityKg: editedCapacity });
      setIsEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar capacidade:', error);
    }
  }, [editedCapacity, capacityValidation.valid, onUpdate, location.id]);

  const handleCancelEdit = useCallback(() => {
    setEditedCapacity(location.maxCapacityKg);
    setIsEditing(false);
  }, [location.maxCapacityKg]);

  const handleCapacityChange = useCallback((value: number) => {
    setEditedCapacity(value);
  }, []);

  const handleOpenProductsDialog = useCallback(() => {
    setShowProductsDialog(true);
  }, []);

  const handleCloseProductsDialog = useCallback(() => {
    setShowProductsDialog(false);
  }, []);

  return {
    // Estados
    isEditing,
    editedCapacity,
    showProductsDialog,
    
    // Dados
    products,
    productsLoading,
    
    // Informações computadas
    occupancyInfo,
    capacityValidation,
    formattedDates,
    headerInfo,
    coordinatesInfo,
    capacityInfo,
    chamber,
    
    // Handlers
    handleStartEdit,
    handleSaveCapacity,
    handleCancelEdit,
    handleCapacityChange,
    handleOpenProductsDialog,
    handleCloseProductsDialog,
    onClose,
    
    // Flags
    canEdit: !!onUpdate,
  };
}; 