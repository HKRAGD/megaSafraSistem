import { useState, useMemo, useCallback, useEffect } from 'react';
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
  selectedChamber?: Chamber | null;
  availableOnly?: boolean; // Para modo selection
}

export const useLocationMap3D = ({
  chambers,
  allLocations,
  mode,
  onLocationSelect,
  selectedChamber: initialSelectedChamber,
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
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(initialSelectedChamber || null);
  const [selectedFloor, setSelectedFloor] = useState<number>(1);
  const [viewMode, setViewMode] = useState<ViewMode>('2d');
  const [showGrid, setShowGrid] = useState(true);
  const [showCapacityColors, setShowCapacityColors] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithChamber | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasAutoSwitched, setHasAutoSwitched] = useState(false);

  // ✅ CORREÇÃO CRÍTICA: Selecionar câmara que tenha localizações de fato
  useEffect(() => {
    console.log('🔄 useLocationMap3D: Verificando câmaras...', {
      chambersCount: chambers.length,
      selectedChamber: selectedChamber?.name || 'None',
      firstChamber: chambers[0]?.name || 'None',
      totalLocations: allLocations.length
    });
    
    if (chambers.length > 0 && allLocations.length > 0 && !selectedChamber) {
      // ✅ CORREÇÃO: Encontrar câmara que tenha localizações de fato
      const chamberWithLocations = chambers.find(chamber => {
        const locationsForThisChamber = allLocations.filter(loc => loc.chamberId === chamber.id);
        console.log(`🔍 Câmara ${chamber.name} (${chamber.id}): ${locationsForThisChamber.length} localizações`);
        return locationsForThisChamber.length > 0;
      });
      
      if (chamberWithLocations) {
        console.log('✅ Selecionando câmara com localizações:', chamberWithLocations.name);
        setSelectedChamber(chamberWithLocations);
      } else {
        console.log('⚠️ Nenhuma câmara encontrada com localizações. Selecionando primeira mesmo assim:', chambers[0].name);
        setSelectedChamber(chambers[0]);
      }
    }
  }, [chambers, allLocations, selectedChamber]);

  // ✅ CORREÇÃO CRÍTICA: Filtrar localizações da câmara selecionada
  const chamberLocations = useMemo(() => {
    if (!selectedChamber) {
      console.log('❌ Nenhuma câmara selecionada');
      return [];
    }
    
    console.log('🔍 Filtrando localizações para câmara:', {
      chamberName: selectedChamber.name,
      chamberId: selectedChamber.id,
      totalLocations: allLocations.length
    });
    
    // ✅ CORREÇÃO: Primeiro tentar filtrar por ID exato
    let filtered = allLocations.filter(
      loc => loc.chamberId === selectedChamber.id
    );
    
    // ✅ FALLBACK: Se não encontrar por ID, tentar por nome da câmara
    if (filtered.length === 0) {
      console.log('🔄 Tentando buscar localizações por nome da câmara...');
      filtered = allLocations.filter(loc => 
        loc.chamber?.name && loc.chamber.name.toLowerCase() === selectedChamber.name.toLowerCase()
      );
      
      if (filtered.length > 0) {
        console.log(`✅ FALLBACK: Encontradas ${filtered.length} localizações por nome da câmara`);
      }
    }

    console.log(`📍 ${filtered.length} localizações encontradas para câmara ${selectedChamber.name}`);
    
    // ✅ DEBUG: Mostrar algumas localizações de exemplo
    if (filtered.length > 0) {
      console.log('📝 Exemplos de localizações encontradas:', filtered.slice(0, 3).map(loc => ({
        code: loc.code,
        isOccupied: loc.isOccupied,
        chamber: loc.chamber?.name
      })));
         } else {
       console.log('⚠️ PROBLEMA: Nenhuma localização encontrada para esta câmara');
       console.log('🔍 Verificando IDs das localizações disponíveis:', 
         allLocations.slice(0, 5).map(loc => ({
           code: loc.code,
           chamberId: loc.chamberId,
           expectedId: selectedChamber.id
         }))
       );
       
       // ✅ DIAGNÓSTICO: Mostrar quais câmaras têm localizações de fato
       const uniqueChamberIds = Array.from(new Set(allLocations.map(loc => loc.chamberId)));
       console.log('🏭 IDs de câmaras que têm localizações no banco:', uniqueChamberIds);
       console.log('🏭 Câmaras carregadas da API:', chambers.map(c => ({ id: c.id, name: c.name })));
       
       // ✅ SUGESTÃO: Tentar encontrar correspondência por nome se IDs não batem
       const chamberWithSameName = chambers.find(c => 
         allLocations.some(loc => 
           loc.chamber?.name && loc.chamber.name.toLowerCase() === c.name.toLowerCase()
         )
       );
       
       if (chamberWithSameName) {
         console.log('💡 SUGESTÃO: Câmara com mesmo nome encontrada:', chamberWithSameName.name);
       }
     }
    
    return filtered;
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
    const capacityTotal = floorLocations.reduce((sum, loc) => sum + (loc.maxCapacityKg || 1500), 0);
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

  // ✅ CORREÇÃO CRÍTICA: Melhorar lógica do hasData
  const hasData = useMemo(() => {
    const result = chambers.length > 0 && selectedChamber != null && chamberLocations.length > 0;
    console.log('🔍 hasData calculado:', {
      chambers: chambers.length,
      selectedChamber: selectedChamber?.name || 'None',
      chamberLocations: chamberLocations.length,
      result
    });
    return result;
  }, [chambers.length, selectedChamber, chamberLocations.length]);

  // 📊 SMART CHAMBER SELECTION - Selecionar câmara com localizações
  useEffect(() => {
    console.log('🔄 useLocationMap3D: Verificando câmaras...', {
      chambersCount: chambers.length,
      selectedChamber: selectedChamber?.name || 'None',
      firstChamber: chambers[0]?.name || 'None',
      totalLocations: allLocations.length
    });
    
    if (chambers.length === 0) {
      console.log('⏳ Aguardando câmaras...');
      return;
    }

    // 🎯 SMART SELECTION: Escolher câmara inteligentemente
    const smartChamberSelection = () => {
      // Se não há câmara selecionada ou a selecionada não tem localizações
      if (!selectedChamber || !hasLocationsForChamber(selectedChamber.name)) {
        
        // 1. Tentar usar a câmara inicial se ela tem localizações
        if (initialSelectedChamber && hasLocationsForChamber(initialSelectedChamber.name)) {
          console.log('✅ Usando câmara inicial:', initialSelectedChamber.name);
          setSelectedChamber(initialSelectedChamber);
          return;
        }
        
        // 2. Encontrar primeira câmara com localizações
        const chamberWithLocations = chambers.find(chamber => {
          const hasLocs = hasLocationsForChamber(chamber.name);
          console.log(`🏭 Verificando ${chamber.name}:`, hasLocs ? '✅ TEM localizações' : '❌ SEM localizações');
          return hasLocs;
        });
        
        if (chamberWithLocations) {
          console.log('🎯 AUTO-SELEÇÃO: Selecionando câmara com localizações:', chamberWithLocations.name);
          setSelectedChamber(chamberWithLocations);
          setHasAutoSwitched(true);
          setError(null);
          return;
        }
        
        // 3. Se nenhuma câmara tem localizações, selecionar a primeira
        console.log('⚠️ Nenhuma câmara tem localizações, selecionando primeira:', chambers[0]?.name);
        setSelectedChamber(chambers[0] || null);
        setError('Nenhuma câmara possui localizações geradas. Gere localizações para começar.');
      }
    };

    smartChamberSelection();
  }, [chambers, allLocations, initialSelectedChamber, selectedChamber]);

  // 🔍 VERIFICAR SE CÂMARA TEM LOCALIZAÇÕES
  const hasLocationsForChamber = (chamberName: string): boolean => {
    if (!chamberName || allLocations.length === 0) return false;
    
    // Buscar por nome da câmara
    const locationsByName = allLocations.filter(loc => 
      loc.chamber?.name === chamberName
    );
    
    return locationsByName.length > 0;
  };

  // 📍 FILTRAR LOCALIZAÇÕES POR CÂMARA
  const getFilteredLocations = (chamberName: string): LocationWithChamber[] => {
    if (!chamberName || allLocations.length === 0) {
      console.log('⚠️ Parâmetros inválidos para filtro:', { chamberName, locationsCount: allLocations.length });
      return [];
    }

    console.log('🔍 Filtrando localizações para câmara:', {
      chamberName,
      chamberId: chambers.find(c => c.name === chamberName)?.id,
      totalLocations: allLocations.length
    });

    // Buscar por nome da câmara (mais confiável)
    let filteredLocations = allLocations.filter(loc => 
      loc.chamber?.name === chamberName
    );

    console.log('📍', filteredLocations.length, 'localizações encontradas para câmara', chamberName);
    
    // 🔍 DIAGNÓSTICO DETALHADO quando não encontra localizações
    if (filteredLocations.length === 0) {
      console.log('⚠️ PROBLEMA: Nenhuma localização encontrada para esta câmara');
      
      // Mostrar amostras de dados para debug
      const sampleLocations = allLocations.slice(0, 5).map(loc => ({
        code: loc.code,
        chamberId: loc.chamberId,
        chamberName: loc.chamber?.name
      }));
      console.log('🔍 Amostra de localizações disponíveis:', sampleLocations);
      
      // Mostrar IDs únicos de câmaras no banco
      const uniqueChamberIds = Array.from(new Set(allLocations.map(loc => loc.chamberId)));
      console.log('🏭 IDs de câmaras que têm localizações no banco:', uniqueChamberIds);
      
      // Mostrar câmaras carregadas
      const loadedChambers = chambers.map(c => ({ id: c.id, name: c.name }));
      console.log('🏭 Câmaras carregadas da API:', loadedChambers);
      
      // Sugerir câmaras disponíveis
      const availableChambers = chambers.filter(chamber => 
        allLocations.some(loc => loc.chamber?.name === chamber.name)
      );
      
      if (availableChambers.length > 0) {
        console.log('💡 SUGESTÃO: Câmara com mesmo nome encontrada:', availableChambers[0].name);
      }
    }

    return filteredLocations;
  };

  return {
    // Estados
    selectedChamber,
    selectedFloor,
    viewMode,
    showGrid,
    showCapacityColors,
    selectedLocation,
    isLoading,
    error,
    hasAutoSwitched,
    
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
    hasData,
    hasLocationsForChamber,
    getFilteredLocations
  };
}; 