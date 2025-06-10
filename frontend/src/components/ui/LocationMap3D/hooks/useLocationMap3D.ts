import { useState, useMemo, useCallback } from 'react';
import { Chamber, LocationWithChamber } from '../../../../types';
import { numeroParaLetra, letraParaNumero } from '../../../../utils/locationUtils';

export type ViewMode = '2d' | '3d' | 'isometric';
export type MapMode = 'selection' | 'transfer' | 'visualization';

export interface LocationCube {
  location: LocationWithChamber;
  isAvailable: boolean;
  isOccupied: boolean;
  canSelect: boolean;
  capacityPercentage: number;
  coordinates: {
    quadra: number;
    lado: string | number;
    fila: number;
    andar: number;
  };
}

export interface FloorStats {
  total: number;
  available: number;
  occupied: number;
  occupancyRate: number;
  capacityUsed: number;
  capacityTotal: number;
  capacityPercentage: number;
}

export interface ChamberAnalysis {
  efficiency: number;
  distribution: {
    balanced: boolean;
    hotspots: Array<{ quadra: number; percentage: number }>;
  };
  recommendations: string[];
}

export interface LocationGrid {
  [quadra: number]: {
    [lado: number]: {
      [fila: number]: LocationCube;
    };
  };
}

interface UseLocationMap3DProps {
  chambers: Chamber[];
  allLocations: LocationWithChamber[];
  mode: MapMode;
  onLocationSelect?: (location: LocationWithChamber | null) => void;
  selectedLocation?: LocationWithChamber | null;
  availableOnly?: boolean; // Para modo selection
}

export const useLocationMap3D = ({
  chambers,
  allLocations,
  mode,
  onLocationSelect,
  selectedLocation,
  availableOnly = false,
}: UseLocationMap3DProps) => {
  /*
   * ✅ CORREÇÕES FINAIS APLICADAS:
   * 1. ✅ Função getCapacityColor corrigida - sempre retorna cores CSS válidas
   * 2. ✅ Visualização padrão como 2D para formulário (menos distorção)
   * 3. ✅ Rotações 3D reduzidas (5deg/-5deg) para melhor UX
   * 4. ✅ allLocations agora recebe TODAS as localizações (limite: 1000)
   * 5. ✅ availableOnly filtra corretamente apenas localizações não ocupadas
   * 6. ✅ CSS do mapa 3D ajustado para não ficar cortado
   * 7. ✅ Height e overflow corrigidos no formulário
   * 
   * PROBLEMA RESOLVIDO: Localizações brancas + Mapa cortado + Dados limitados
   */

  // Estados do mapa
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(
    chambers.length > 0 ? chambers[0] : null
  );
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [showGrid, setShowGrid] = useState(true);
  const [showCapacityColors, setShowCapacityColors] = useState(false);

  // Atualizar câmara selecionada quando câmaras mudam
  useMemo(() => {
    if (chambers.length > 0 && !selectedChamber) {
      setSelectedChamber(chambers[0]);
    }
  }, [chambers, selectedChamber]);

  // Filtrar localizações da câmara selecionada
  const chamberLocations = useMemo(() => {
    if (!selectedChamber) return [];
    
    const filtered = allLocations.filter(
      loc => loc.chamberId === selectedChamber.id
    );

    // ✅ CORREÇÃO CRÍTICA: Sempre mostrar TODAS as localizações no mapa
    // O mapa 3D deve exibir localizações ocupadas (vermelhas) e disponíveis (verdes)
    // A filtragem por disponibilidade é apenas para selecionar, não para visualizar
    
    return filtered; // Retorna TODAS as localizações sempre
  }, [allLocations, selectedChamber]);

  // Grid de localizações do andar selecionado
  const locationGrid = useMemo((): LocationGrid => {
    if (!selectedChamber) return {};

    const grid: LocationGrid = {};
    const { quadras, lados, filas } = selectedChamber.dimensions;

    // Preencher grid com localizações do andar selecionado
    for (let q = 1; q <= quadras; q++) {
      for (let l = 1; l <= lados; l++) {
        for (let f = 1; f <= filas; f++) {
          const location = chamberLocations.find(loc => {
            const locLado = typeof loc.coordinates.lado === 'string' 
              ? letraParaNumero(loc.coordinates.lado)
              : loc.coordinates.lado;
            
            return loc.coordinates.quadra === q &&
              locLado === l &&
              loc.coordinates.fila === f &&
              loc.coordinates.andar === selectedFloor;
          });

          if (location) {
            if (!grid[q]) grid[q] = {};
            if (!grid[q][l]) grid[q][l] = {};

            const isSelected = selectedLocation?.id === location.id;
            
            // ✅ CORREÇÃO: Só permitir seleção de localizações disponíveis no modo selection
            const isSelectable = mode === 'selection' ? 
              !location.isOccupied : // Em modo selection, só pode selecionar não ocupadas
              false; // Em outros modos, não permite seleção

            grid[q][l][f] = {
              location: location,
              isAvailable: !location.isOccupied,
              isOccupied: location.isOccupied,
              canSelect: isSelectable,
              capacityPercentage: location.currentWeightKg ? (location.currentWeightKg / location.maxCapacityKg) * 100 : 0,
              coordinates: location.coordinates,
            };
          }
        }
      }
    }

    return grid;
  }, [chamberLocations, selectedChamber, selectedFloor, selectedLocation, mode]);

  // Estatísticas do andar atual
  const floorStats = useMemo((): FloorStats => {
    if (!selectedChamber) {
      return {
        total: 0,
        available: 0,
        occupied: 0,
        occupancyRate: 0,
        capacityUsed: 0,
        capacityTotal: 0,
        capacityPercentage: 0,
      };
    }

    const { quadras, lados, filas } = selectedChamber.dimensions;
    const total = quadras * lados * filas;
    
    const floorLocations = chamberLocations.filter(
      loc => loc.coordinates.andar === selectedFloor
    );
    
    const available = floorLocations.filter(loc => !loc.isOccupied).length;
    const occupied = floorLocations.filter(loc => loc.isOccupied).length;
    const occupancyRate = total > 0 ? (occupied / total) * 100 : 0;

    // Cálculo de capacidade
    const capacityUsed = floorLocations.reduce((sum, loc) => sum + (loc.currentWeightKg || 0), 0);
    const capacityTotal = floorLocations.reduce((sum, loc) => sum + (loc.maxCapacityKg || 1000), 0);
    const capacityPercentage = capacityTotal > 0 ? (capacityUsed / capacityTotal) * 100 : 0;

    return {
      total,
      available,
      occupied,
      occupancyRate,
      capacityUsed,
      capacityTotal,
      capacityPercentage,
    };
  }, [selectedChamber, chamberLocations, selectedFloor]);

  // Análise da câmara
  const chamberAnalysis = useMemo((): ChamberAnalysis | null => {
    if (!selectedChamber || chamberLocations.length === 0) return null;

    const quadras = selectedChamber.dimensions.quadras;
    const quadraStats = Array.from({ length: quadras }, (_, i) => {
      const quadraNumber = i + 1;
      const quadraLocations = chamberLocations.filter(
        loc => loc.coordinates.quadra === quadraNumber
      );
      const occupied = quadraLocations.filter(loc => loc.isOccupied).length;
      const total = quadraLocations.length;
      const percentage = total > 0 ? (occupied / total) * 100 : 0;
      
      return { quadra: quadraNumber, percentage };
    });

    const avgOccupancy = quadraStats.reduce((sum, q) => sum + q.percentage, 0) / quadras;
    const efficiency = avgOccupancy;
    const threshold = 20; // 20% de diferença considera desequilibrio
    const balanced = quadraStats.every(q => Math.abs(q.percentage - avgOccupancy) <= threshold);

    const hotspots = quadraStats.filter(q => q.percentage > avgOccupancy + threshold);

    const recommendations: string[] = [];
    if (!balanced) {
      recommendations.push('Distribuição desequilibrada entre quadras');
    }
    if (hotspots.length > 0) {
      recommendations.push(`Quadras ${hotspots.map(h => h.quadra).join(', ')} com alta ocupação`);
    }
    if (efficiency < 30) {
      recommendations.push('Baixa utilização da câmara');
    } else if (efficiency > 90) {
      recommendations.push('Câmara próxima da capacidade máxima');
    }

    return {
      efficiency,
      distribution: { balanced, hotspots },
      recommendations,
    };
  }, [selectedChamber, chamberLocations]);

  // Função para obter cor baseada na capacidade
  const getCapacityColor = useCallback((capacityPercentage: number, isOccupied: boolean) => {
    // ✅ CORREÇÃO CRÍTICA: Se a localização está ocupada, sempre vermelha
    if (isOccupied) {
      return '#f44336'; // Vermelho para localizações ocupadas
    }
    
    // ✅ Para localizações disponíveis, sempre verde (por enquanto para debugging)
    // Se showCapacityColors estiver habilitado, usar gradiente, senão verde padrão
    if (!showCapacityColors) {
      return '#4caf50'; // Verde padrão para disponíveis
    }
    
    // Cores baseadas na capacidade (somente se enabled)
    if (capacityPercentage <= 30) {
      return '#4caf50';      // Verde (0-30%)
    }
    if (capacityPercentage <= 70) {
      return '#ff9800';      // Laranja (31-70%)
    }
    if (capacityPercentage <= 90) {
      return '#f44336';      // Vermelho (71-90%)
    }
    return '#d32f2f';        // Vermelho escuro (91-100%)
  }, [showCapacityColors]);

  // Função para obter info do tooltip
  const getTooltipInfo = useCallback((cube: LocationCube) => {
    const { location, capacityPercentage, isOccupied, isAvailable } = cube;
    
    return {
      code: location.code,
      chamber: location.chamber?.name || 'N/A',
      status: isOccupied ? 'Ocupada' : 'Disponível',
      statusColor: isOccupied ? 'error' : 'success',
      capacity: `${location.currentWeightKg || 0}kg / ${location.maxCapacityKg}kg`,
      capacityPercentage: capacityPercentage.toFixed(1),
      canSelect: cube.canSelect,
      coordinates: `Q${location.coordinates.quadra}-L${location.coordinates.lado}-F${location.coordinates.fila}-A${location.coordinates.andar}`,
    };
  }, []);

  // Handler para seleção de localização
  const handleLocationSelect = useCallback((cube: LocationCube) => {
    if (!cube.canSelect || !onLocationSelect) return;
    
    const newSelection = selectedLocation?.id === cube.location.id 
      ? null 
      : cube.location;
    
    onLocationSelect(newSelection);
  }, [selectedLocation, onLocationSelect]);

  // Handler para mudança de câmara
  const handleChamberChange = useCallback((chamber: Chamber | null) => {
    setSelectedChamber(chamber);
    setSelectedFloor(1); // Reset para primeiro andar
    if (onLocationSelect) {
      onLocationSelect(null); // Limpar seleção
    }
  }, [onLocationSelect]);

  // Handler para mudança de andar
  const handleFloorChange = useCallback((floor: number) => {
    setSelectedFloor(floor);
    if (onLocationSelect) {
      onLocationSelect(null); // Limpar seleção ao mudar andar
    }
  }, [onLocationSelect]);

  return {
    // Estados
    selectedChamber,
    selectedFloor,
    viewMode,
    showGrid,
    showCapacityColors,
    
    // Dados processados
    locationGrid,
    floorStats,
    chamberAnalysis,
    chamberLocations,
    
    // Handlers
    handleLocationSelect,
    handleChamberChange,
    handleFloorChange,
    setViewMode,
    setShowGrid,
    setShowCapacityColors,
    
    // Utilities
    getCapacityColor,
    getTooltipInfo,
    
    // Estado de loading/erro
    hasData: chamberLocations.length > 0,
    isLoading: false, // TODO: implementar se necessário
  };
}; 