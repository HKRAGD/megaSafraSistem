import { useMemo, useCallback } from 'react';
import { Product, SeedType, Location, Chamber } from '../../../../types';
import {
  getStatusInfo,
  getExpirationInfo,
  getStorageTypeLabel,
  getQualityGradeInfo,
  formatDateTime,
  formatDateOnly,
  formatWeight,
  calculateStorageTime,
  getLocationCode,
  calculateCapacityPercentage,
  StatusInfo,
  ExpirationInfo,
  QualityGradeInfo,
} from '../utils/productDetailsUtils';

interface UseProductDetailsLogicProps {
  product: Product | null;
  seedType?: SeedType;
  location?: Location;
  chamber?: Chamber;
  onEdit?: (product: Product) => void;
  onMove?: (product: Product) => void;
  onViewHistory?: (product: Product) => void;
  onDelete?: (productId: string) => void;
}

export const useProductDetailsLogic = ({
  product,
  seedType,
  location,
  chamber,
  onEdit,
  onMove,
  onViewHistory,
  onDelete,
}: UseProductDetailsLogicProps) => {
  // Computed values usando useMemo para performance
  const statusInfo: StatusInfo | null = useMemo(() => {
    return product ? getStatusInfo(product.status) : null;
  }, [product?.status]);

  const expirationInfo: ExpirationInfo | null = useMemo(() => {
    return product?.expirationDate ? getExpirationInfo(new Date(product.expirationDate)) : null;
  }, [product?.expirationDate]);

  const qualityGradeInfo: QualityGradeInfo = useMemo(() => {
    return getQualityGradeInfo(product?.tracking?.qualityGrade);
  }, [product?.tracking?.qualityGrade]);

  const storageTypeLabel: string = useMemo(() => {
    return product ? getStorageTypeLabel(product.storageType) : '';
  }, [product?.storageType]);

  const formattedEntryDate: string = useMemo(() => {
    return product?.entryDate ? formatDateTime(new Date(product.entryDate)) : '';
  }, [product?.entryDate]);

  const formattedExpirationDate: string = useMemo(() => {
    return product?.expirationDate ? formatDateOnly(new Date(product.expirationDate)) : 'Não definida';
  }, [product?.expirationDate]);

  const formattedTotalWeight: string = useMemo(() => {
    return product ? formatWeight(product.totalWeight) : '';
  }, [product?.totalWeight]);

  const formattedWeightPerUnit: string = useMemo(() => {
    return product ? formatWeight(product.weightPerUnit) : '';
  }, [product?.weightPerUnit]);

  const storageTimeDays: number = useMemo(() => {
    return product?.entryDate ? calculateStorageTime(new Date(product.entryDate)) : 0;
  }, [product?.entryDate]);

  const locationCode: string = useMemo(() => {
    return getLocationCode(location);
  }, [location]);

  const capacityPercentage: number = useMemo(() => {
    if (!location || !product) return 0;
    return calculateCapacityPercentage(product.totalWeight, location.maxCapacityKg);
  }, [location?.maxCapacityKg, product?.totalWeight]);

  const locationInfo = useMemo(() => {
    if (!location || !chamber) return null;
    
    return {
      code: locationCode,
      chamber: chamber.name,
      capacity: formatWeight(location.maxCapacityKg),
      currentWeight: formatWeight(location.currentWeightKg),
      capacityPercentage,
      isNearCapacity: capacityPercentage > 80,
      isAtCapacity: capacityPercentage >= 100,
    };
  }, [location, chamber, locationCode, capacityPercentage]);

  // Handlers com useCallback para performance
  const handleEdit = useCallback(() => {
    if (product && onEdit) {
      onEdit(product);
    }
  }, [product, onEdit]);

  const handleMove = useCallback(() => {
    if (product && onMove) {
      onMove(product);
    }
  }, [product, onMove]);

  const handleViewHistory = useCallback(() => {
    if (product && onViewHistory) {
      onViewHistory(product);
    }
  }, [product, onViewHistory]);

  const handleDelete = useCallback(() => {
    if (product && onDelete) {
      onDelete(product.id);
    }
  }, [product, onDelete]);

  // Informações derivadas
  const basicInfo = useMemo(() => {
    if (!product) return null;
    
    return {
      name: product.name,
      lot: product.lot,
      seedTypeName: seedType?.name || 'Não especificado',
      status: statusInfo,
      id: product.id,
    };
  }, [product, seedType, statusInfo]);

  const quantityInfo = useMemo(() => {
    if (!product) return null;
    
    return {
      quantity: product.quantity,
      storageType: storageTypeLabel,
      weightPerUnit: formattedWeightPerUnit,
      totalWeight: formattedTotalWeight,
    };
  }, [product, storageTypeLabel, formattedWeightPerUnit, formattedTotalWeight]);

  const dateInfo = useMemo(() => {
    if (!product) return null;
    
    return {
      entryDate: product.entryDate ? new Date(product.entryDate) : new Date(),
      expirationDate: product.expirationDate ? new Date(product.expirationDate) : null,
      expirationInfo,
      storageTimeDays,
      formattedEntryDate,
      formattedExpirationDate,
    };
  }, [product?.entryDate, product?.expirationDate, expirationInfo, storageTimeDays, formattedEntryDate, formattedExpirationDate]);

  const trackingInfo = useMemo(() => {
    if (!product) return null;
    
    return {
      tracking: {
        batchNumber: product.tracking?.batchNumber || 'Não definido',
        origin: product.tracking?.origin || 'Não definida',
        supplier: product.tracking?.supplier || 'Não definido',
        qualityGrade: product.tracking?.qualityGrade,
      },
      notes: product.notes,
    };
  }, [product]);

  const hasActions = Boolean(onEdit || onMove || onViewHistory || onDelete);

  return {
    // Informações organizadas
    basicInfo,
    quantityInfo,
    locationInfo,
    dateInfo,
    expirationData: dateInfo, // Alias para compatibilidade
    trackingInfo,
    
    // Handlers
    handleEdit,
    handleMove,
    handleViewHistory,
    handleDelete,
    
    // Flags
    hasActions,
    canEdit: Boolean(onEdit),
    canMove: Boolean(onMove),
    canViewHistory: Boolean(onViewHistory),
    canDelete: Boolean(onDelete),
    
    // Dados originais (para casos específicos)
    product,
    seedType,
    location,
    chamber,
    
    // Notas
    notes: product?.notes,
  };
}; 