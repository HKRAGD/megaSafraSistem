import { useState, useCallback } from 'react';
import { 
  DashboardSummary, 
  ChamberStatusSummary, 
  RecentMovement, 
  CapacityData 
} from '../types';
import { dashboardService } from '../services/dashboardService';

interface UseDashboardReturn {
  summary: DashboardSummary | null;
  chamberStatus: ChamberStatusSummary[];
  recentMovements: RecentMovement[];
  capacityData: CapacityData[];
  loading: boolean;
  error: string | null;
  
  refreshDashboard: () => Promise<void>;
  refreshSummary: () => Promise<void>;
  refreshChamberStatus: () => Promise<void>;
  refreshRecentMovements: () => Promise<void>;
  refreshCapacityData: () => Promise<void>;
  clearError: () => void;
}

export const useDashboard = (): UseDashboardReturn => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [chamberStatus, setChamberStatus] = useState<ChamberStatusSummary[]>([]);
  const [recentMovements, setRecentMovements] = useState<RecentMovement[]>([]);
  const [capacityData, setCapacityData] = useState<CapacityData[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleError = useCallback((error: any, operation: string) => {
    const errorMessage = error.response?.data?.message || `Erro ao ${operation}`;
    setError(errorMessage);
    console.error(`❌ ${operation}:`, error);
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const refreshSummary = useCallback(async () => {
    try {
      const response = await dashboardService.getSummary();
      
      // Mapear estrutura complexa da API para DashboardSummary
      const apiData = response.data;
      const productStatusBreakdown = apiData.productStatusBreakdown || {
        totalActive: 0,
        cadastrado: 0,
        aguardandoLocacao: 0,
        locado: 0,
        aguardandoRetirada: 0,
        retirado: 0,
        removido: 0
      };
      
      const dashboardSummary: DashboardSummary = {
        totalProducts: apiData.kpis?.totalProducts || productStatusBreakdown.totalActive || 0,
        totalChambers: apiData.systemStatus?.totalChambers || 0,
        totalLocations: apiData.systemStatus?.totalLocations || 0,
        occupiedLocations: apiData.kpis?.occupiedLocations || 0,
        totalWeight: apiData.kpis?.totalWeight || 0, // ✅ Agora usando o valor real da API
        availableCapacity: apiData.kpis?.availableCapacity || 0,
        productsNearExpiration: apiData.kpis?.expiringProducts || 0,
        alertsCount: apiData.criticalAlerts?.total || 0,
        // Propriedades adicionais para o novo workflow usando productStatusBreakdown
        totalUsers: apiData.systemStatus?.totalUsers || 0,
        productsCreatedToday: productStatusBreakdown.cadastrado || 0, // Produtos recém cadastrados
        totalCapacity: apiData.kpis?.totalCapacity || 0,
        productsAwaitingLocation: productStatusBreakdown.aguardandoLocacao || 0, // ✅ Agora usando dados reais
        productsAwaitingWithdrawal: productStatusBreakdown.aguardandoRetirada || 0, // ✅ Agora usando dados reais
        productsLocated: productStatusBreakdown.locado || 0, // ✅ Produtos efetivamente localizados
        tasksCompletedToday: apiData.kpis?.movementsToday || 0, // Movimentações do dia como proxy para tarefas
      };
      
      setSummary(dashboardSummary);

    } catch (error: any) {
      handleError(error, 'carregar resumo do dashboard');
    }
  }, [handleError]);

  const refreshChamberStatus = useCallback(async () => {
    try {
      const response = await dashboardService.getChamberStatus();
      
      // Se a API retorna estrutura complexa, extrair os dados necessários
      let chamberStatusData: ChamberStatusSummary[] = [];
      
      if (Array.isArray(response.data)) {
        // Caso API retorne array direto
        chamberStatusData = response.data;
      } else if (response.data && response.data.chambers) {
        // Caso API retorne estrutura complexa como { chambers: [...] }
        chamberStatusData = response.data.chambers.map((item: any) => ({
          id: item.chamber?.id || item.id,
          name: item.chamber?.name || item.name,
          status: item.chamber?.status || item.status,
          conditionsStatus: item.conditions?.temperature?.status === 'critical' || item.conditions?.humidity?.status === 'critical' ? 'alert' : 'normal',
          currentTemperature: item.chamber?.currentTemperature,
          currentHumidity: item.chamber?.currentHumidity,
          occupancyRate: item.occupancy?.occupancyRate || 0,
          alertsCount: item.alerts?.length || 0,
        }));
      }
      
      setChamberStatus(chamberStatusData);

    } catch (error: any) {
      handleError(error, 'carregar status das câmaras');
    }
  }, [handleError]);

  const refreshRecentMovements = useCallback(async () => {
    try {
      const response = await dashboardService.getRecentMovements();
      // A API retorna { data: { movements: [], summary: {}, analysis: {} } }
      setRecentMovements(response.data.movements || []);
    } catch (error: any) {
      handleError(error, 'carregar movimentações recentes');
    }
  }, [handleError]);

  const refreshCapacityData = useCallback(async () => {
    try {
      const response = await dashboardService.getStorageCapacity();
      
      // Se a API retorna estrutura complexa, extrair os dados necessários
      let capacityDataArray: CapacityData[] = [];
      
      if (Array.isArray(response.data)) {
        // Caso API retorne array direto
        capacityDataArray = response.data;
      } else if (response.data && response.data.chambers) {
        // Caso API retorne estrutura complexa
        capacityDataArray = response.data.chambers.map((item: any) => ({
          chamberId: item.chamberId || item.id,
          chamberName: item.chamberName || item.name,
          totalCapacity: item.totalCapacity || 0,
          usedCapacity: item.usedCapacity || 0,
          occupancyRate: item.occupancyRate || 0,
          totalLocations: item.totalLocations || 0,
          occupiedLocations: item.occupiedLocations || 0,
        }));
      }
      
      setCapacityData(capacityDataArray);

    } catch (error: any) {
      handleError(error, 'carregar dados de capacidade');
    }
  }, [handleError]);

  const refreshDashboard = useCallback(async () => {
    setLoading(true);
    clearError();

    try {
      // Usar Promise.allSettled para evitar falha geral se uma requisição falhar
      const results = await Promise.allSettled([
        refreshSummary(),
        refreshChamberStatus(),
        refreshRecentMovements(),
        refreshCapacityData(),
      ]);
      
      // Log apenas falhas sem bloquear o carregamento
      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          const sections = ['summary', 'chambers', 'movements', 'capacity'];
          console.warn(`⚠️ Falha ao carregar ${sections[index]}:`, result.reason);
        }
      });
    } finally {
      setLoading(false);
    }
  }, [refreshSummary, refreshChamberStatus, refreshRecentMovements, refreshCapacityData, clearError]);

  return {
    summary,
    chamberStatus,
    recentMovements,
    capacityData,
    loading,
    error,
    refreshDashboard,
    refreshSummary,
    refreshChamberStatus,
    refreshRecentMovements,
    refreshCapacityData,
    clearError,
  };
};

export default useDashboard; 