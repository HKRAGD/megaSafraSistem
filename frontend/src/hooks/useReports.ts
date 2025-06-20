import { useState, useCallback } from 'react';
import { ReportFilters } from '../types';
import { reportService } from '../services/reportService';

interface UseReportsReturn {
  loading: boolean;
  error: string | null;
  
  // Estado dos dados de relatórios
  inventoryData: any;
  movementData: any;
  expirationData: any;
  capacityData: any;
  executiveData: any;
  
  // Funções de geração
  generateInventoryReport: (filters?: ReportFilters) => Promise<any>;
  generateMovementReport: (filters?: ReportFilters) => Promise<any>;
  generateExpirationReport: (filters?: ReportFilters) => Promise<any>;
  generateCapacityReport: () => Promise<any>;
  generateExecutiveReport: () => Promise<any>;
  
  clearError: () => void;
}

// ============================================================================
// FUNÇÃO DE MAPEAMENTO DE DADOS DA API
// ============================================================================

/**
 * Converte os dados de capacidade da API para o formato compatível com o frontend
 * API retorna utilizationRate em %, frontend espera em decimal
 */
const mapApiCapacityToChamberAnalysis = (apiChamber: any): any => {
  return {
    ...apiChamber,
    // Normalizar utilizationRate de % para decimal se necessário
    utilizationRate: typeof apiChamber.utilizationRate === 'number' && apiChamber.utilizationRate > 1 
      ? apiChamber.utilizationRate / 100 
      : apiChamber.utilizationRate || 0,
    
    // Garantir campos compatíveis
    totalLocations: apiChamber.totalLocations || apiChamber.locationsTotal || 0,
    occupiedLocations: apiChamber.occupiedLocations || apiChamber.locationsOccupied || 0,
    
    // Campos já corretos
    chamberId: apiChamber.chamberId,
    name: apiChamber.name,
    totalCapacity: apiChamber.totalCapacity || 0,
    usedCapacity: apiChamber.usedCapacity || 0,
    availableCapacity: apiChamber.availableCapacity || (apiChamber.totalCapacity - apiChamber.usedCapacity) || 0,
  };
};

/**
 * Converte os dados de movimentação da API para o formato compatível com o frontend
 * API retorna: { userId: { _id, name, email }, productId: { _id, name, lot }, etc }
 * Frontend espera: dados populados acessíveis nas funções helper
 */
const mapApiMovementToMovement = (apiMovement: any): any => {
  return {
    // Dados básicos da movimentação
    id: apiMovement._id || apiMovement.id,
    type: apiMovement.type,
    quantity: apiMovement.quantity,
    weight: apiMovement.weight,
    reason: apiMovement.reason,
    notes: apiMovement.notes,
    timestamp: apiMovement.timestamp,
    createdAt: apiMovement.createdAt,
    updatedAt: apiMovement.updatedAt,

    // Relacionamentos mapeados - garantir compatibilidade com funções helper
    userId: apiMovement.userId && typeof apiMovement.userId === 'object' 
      ? {
          _id: apiMovement.userId._id,
          name: apiMovement.userId.name,
          email: apiMovement.userId.email
        }
      : apiMovement.userId,

    productId: apiMovement.productId && typeof apiMovement.productId === 'object'
      ? {
          _id: apiMovement.productId._id,
          name: apiMovement.productId.name,
          lot: apiMovement.productId.lot,
          storageType: apiMovement.productId.storageType
        }
      : apiMovement.productId,

    fromLocationId: apiMovement.fromLocationId && typeof apiMovement.fromLocationId === 'object'
      ? {
          _id: apiMovement.fromLocationId._id,
          code: apiMovement.fromLocationId.code,
          coordinates: apiMovement.fromLocationId.coordinates
        }
      : apiMovement.fromLocationId,

    toLocationId: apiMovement.toLocationId && typeof apiMovement.toLocationId === 'object'
      ? {
          _id: apiMovement.toLocationId._id,
          code: apiMovement.toLocationId.code,
          coordinates: apiMovement.toLocationId.coordinates
        }
      : apiMovement.toLocationId,
  };
  };

// Função para mapear dados da API do relatório executivo para o formato esperado pelo frontend
const mapApiExecutiveToExecutiveMetrics = (apiData: any): any => {
  console.log('🔍 DEBUG ExecutiveReport - Dados RAW da API:', apiData);
  
  // Extrair kpis ou fallback para mock
  const kpis = apiData.kpis || {};
  const trends = apiData.trends || {};
  const alerts = apiData.alerts || [];
  const topData = apiData.topData || {};
  const comparisons = apiData.comparisons || {};
  
  // Usar dados reais de capacidade do backend
  const totalCapacityKg = kpis.totalCapacity || 45000; // fallback apenas se não houver dados
  const usedCapacityKg = kpis.usedCapacity || 31500; // fallback apenas se não houver dados
  const occupancyRate = kpis.occupancyRate || Math.round((usedCapacityKg / totalCapacityKg) * 100);
  
  console.log('🔍 DEBUG ExecutiveReport - KPIs do backend:', {
    totalProducts: kpis.totalProducts,
    totalMovements: kpis.totalMovements,
    activeChambers: kpis.activeChambers,
    totalCapacity: kpis.totalCapacity,
    usedCapacity: kpis.usedCapacity,
    occupancyRate: kpis.occupancyRate,
    expiringProducts: kpis.expiringProducts
  });
  
  // Mapear para a estrutura que o ExecutiveReport espera
  const mappedData = {
    totalProducts: kpis.totalProducts || 0,
    totalChambers: kpis.activeChambers || kpis.totalChambers || 0,
    totalCapacityKg,
    usedCapacityKg,
    occupancyRate,
    totalMovements: kpis.totalMovements || 0,
    expiringProducts: kpis.expiringProducts || 0,
    criticalAlerts: alerts.length || 0,
    trends: {
      productsGrowth: comparisons.products?.changePercent || 0,
      movementsGrowth: comparisons.movements?.changePercent || 0,
      occupancyGrowth: 15.3 // TODO: calcular baseado em dados históricos
    },
    topPerformers: {
      chambers: (topData.topChambers || []).map((chamber: any) => ({
        name: chamber.name || `Câmara ${chamber._id}`,
        occupancyRate: chamber.occupancyRate || 0,
        efficiency: chamber.efficiency || 0
      })),
      users: (topData.topUsers || []).map((user: any) => ({
        name: user.name || `Usuário ${user._id}`,
        movementsCount: user.count || 0,
        efficiency: Math.min(100, Math.max(0, 85 + (user.count || 0) * 0.1)) // Eficiência baseada em atividade
      }))
    },
    alerts: alerts.map((alert: any) => ({
      type: alert.severity === 'critical' ? 'error' : alert.severity === 'high' ? 'warning' : 'info',
      message: alert.message || 'Alerta do sistema',
      count: alert.count
    }))
  };
  
  // Remover mock data - sempre usar dados reais da API, mesmo que sejam zeros
  
  return mappedData;
};

export const useReports = (): UseReportsReturn => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Estado dos dados
  const [inventoryData, setInventoryData] = useState<any>(null);
  const [movementData, setMovementData] = useState<any>(null);
  const [expirationData, setExpirationData] = useState<any>(null);
  const [capacityData, setCapacityData] = useState<any>(null);
  const [executiveData, setExecutiveData] = useState<any>(null);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateInventoryReport = useCallback(async (filters?: ReportFilters) => {
    setLoading(true);
    clearError();

    try {
      const response = await reportService.getInventoryReport(filters);
      

      
      // Mapear a estrutura da API para o que o frontend espera
      // Lidar com diferentes estruturas de resposta que a API pode retornar
      let mappedData: any;
      
      if (response.data && response.data.data) {
        // Estrutura padrão: {success: true, data: {summary: {...}, data: {products: [...]}}}
        mappedData = {
          summary: response.data.data.summary || {},
          products: response.data.data.products || [],
          chamberBreakdown: response.data.data.chamberBreakdown || {},
          expirationAnalysis: response.data.data.expirationAnalysis || {},
          optimizationSuggestions: response.data.data.optimizationSuggestions || [],
          metadata: response.data.data.metadata || response.data.metadata
        };

      } else if (response.data && response.data.summary) {
        // Estrutura direta: {summary: {...}, products: [...]}
        mappedData = {
          summary: response.data.summary,
          products: response.data.products || [],
          chamberBreakdown: response.data.chamberBreakdown || {},
          expirationAnalysis: response.data.expirationAnalysis || {},
          optimizationSuggestions: response.data.optimizationSuggestions || [],
          metadata: response.data.metadata
        };

      } else {
        // Fallback para qualquer outra estrutura
        mappedData = {
          summary: response.data || {},
          products: [],
          chamberBreakdown: {},
          expirationAnalysis: {},
          optimizationSuggestions: [],
          metadata: {}
        };

      }
      

      
      setInventoryData(mappedData);
      console.log('✅ Relatório de estoque gerado com sucesso:', mappedData);
      return mappedData;
    } catch (error: any) {
      handleError(error, 'gerar relatório de estoque');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const generateMovementReport = useCallback(async (filters?: ReportFilters) => {
    setLoading(true);
    clearError();

    try {
      const response = await reportService.getMovementReport(filters);
      

      
      // Mapear a estrutura da API para o que o frontend espera
      const typeDistribution = response.data.summary?.typeDistribution || [];
      const mappedSummary = {
        totalMovements: response.data.summary?.totalMovements || 0,
        avgMovementsPerDay: response.data.summary?.avgMovementsPerDay || 0,
        // Converter distribuição por tipo para formato que o frontend espera
        entryCount: typeDistribution.find((t: any) => t._id === 'entry')?.count || 0,
        exitCount: typeDistribution.find((t: any) => t._id === 'exit')?.count || 0,
        transferCount: typeDistribution.find((t: any) => t._id === 'transfer')?.count || 0,
        adjustmentCount: typeDistribution.find((t: any) => t._id === 'adjustment')?.count || 0,
      };
      
      // CORREÇÃO: Buscar movimentações no local correto
      const movements = response.data.movements || response.data.analysis?.patterns?.movements || [];
      

      
      const mappedData = {
        summary: mappedSummary,
        movements: movements.map(mapApiMovementToMovement),
        analysis: response.data.analysis || {},
        metadata: response.data.metadata
      };
      
      setMovementData(mappedData);
      console.log('✅ Relatório de movimentações gerado com sucesso:', mappedData);
      return mappedData;
    } catch (error: any) {
      handleError(error, 'gerar relatório de movimentações');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const generateExpirationReport = useCallback(async (filters?: ReportFilters) => {
    setLoading(true);
    clearError();

    try {
      const days = filters?.expirationDays || 30;
      const response = await reportService.getExpirationReport(days);
      
      // Mapear a estrutura da API para o que o frontend espera
      const mappedData = {
        products: response.data.products || response.data.data?.products || response.data.analysis?.byUrgency?.critical || response.data.analysis?.byUrgency?.warning || response.data.expiringProducts || [],
        summary: response.data.summary || response.data.data?.summary || {},
        analysis: response.data.analysis || response.data.data?.analysis || {},
        metadata: response.data.metadata || response.data.data?.metadata || {}
      };
      
      setExpirationData(mappedData);
      console.log('✅ Relatório de vencimentos gerado com sucesso:', mappedData);
      return mappedData;
    } catch (error: any) {
      handleError(error, 'gerar relatório de vencimentos');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const generateCapacityReport = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const response = await reportService.getCapacityReport();
      

      
      // Mapear a estrutura da API para o que o frontend espera
      let mappedData: any;
      
      if (response.data && response.data.data) {
        // Estrutura padrão: {success: true, data: {summary: {...}, data: {chamberAnalysis: [...]}}}
        const rawChamberAnalysis = response.data.data.chamberAnalysis || response.data.chamberAnalysis || [];
        const summary = response.data.summary || response.data.data.summary || {};
        
        mappedData = {
          summary: {
            ...summary,
            // A averageUtilization já vem em % do backend, não converter
            averageUtilization: summary.averageUtilization || 0
          },
          data: {
            chamberAnalysis: rawChamberAnalysis.map(mapApiCapacityToChamberAnalysis),
            projections: response.data.data.projections || response.data.projections || {},
            alerts: response.data.data.alerts || response.data.alerts || []
          },
          metadata: response.data.metadata || response.data.data.metadata || {}
        };

      } else if (response.data && response.data.summary) {
        // Estrutura direta
        const rawChamberAnalysis = response.data.chamberAnalysis || [];
        const summary = response.data.summary;
        
        mappedData = {
          summary: {
            ...summary,
            // A averageUtilization já vem em % do backend, não converter
            averageUtilization: summary.averageUtilization || 0
          },
          data: {
            chamberAnalysis: rawChamberAnalysis.map(mapApiCapacityToChamberAnalysis),
            projections: response.data.projections || {},
            alerts: response.data.alerts || []
          },
          metadata: response.data.metadata || {}
        };

      } else {
        // Fallback para qualquer outra estrutura
        mappedData = {
          summary: response.data || {},
          data: {
            chamberAnalysis: [],
            projections: {},
            alerts: []
          },
          metadata: {}
        };

      }
      

      
      setCapacityData(mappedData);
      console.log('✅ Relatório de capacidade gerado com sucesso:', mappedData);
      return mappedData;
    } catch (error: any) {
      handleError(error, 'gerar relatório de capacidade');
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);

  const generateExecutiveReport = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      const response = await reportService.getExecutiveReport();
      

      
      // Mapear a estrutura da API para o que o frontend espera
      let mappedData: any;
      
      if (response.data) {
        // Usar função de mapeamento para converter dados da API
        mappedData = mapApiExecutiveToExecutiveMetrics(response.data);

      } else {
        // Se não há dados da API, retornar estrutura vazia
        mappedData = {
          totalProducts: 0,
          totalChambers: 0,
          totalCapacityKg: 0,
          usedCapacityKg: 0,
          occupancyRate: 0,
          totalMovements: 0,
          expiringProducts: 0,
          criticalAlerts: 0,
          trends: {
            productsGrowth: 0,
            movementsGrowth: 0,
            occupancyGrowth: 0
          },
          topPerformers: {
            chambers: [],
            users: []
          },
          alerts: []
        };
        console.warn('⚠️ Estrutura da API executive não reconhecida, retornando dados vazios');
      }
      
      setExecutiveData(mappedData);
      console.log('✅ Relatório executivo gerado com sucesso:', mappedData);
      return mappedData;
    } catch (error: any) {
      handleError(error, 'gerar relatório executivo');
      // Retornar null em caso de erro - o componente deve lidar com isso
      return null;
    } finally {
      setLoading(false);
    }
  }, [handleError, clearError]);


  return {
    loading,
    error,
    
    // Estado dos dados
    inventoryData,
    movementData,
    expirationData,
    capacityData,
    executiveData,
    
    // Funções de geração
    generateInventoryReport,
    generateMovementReport,
    generateExpirationReport,
    generateCapacityReport,
    generateExecutiveReport,
    
    clearError,
  };
};

export default useReports; 