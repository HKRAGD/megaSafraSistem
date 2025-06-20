import React, { useEffect } from 'react';
import { Grid } from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Assignment as RequestIcon,
  Done as ConfirmIcon,
  Person as PersonIcon,
} from '@mui/icons-material';
import { StatsCard } from '../ui';
import { useDashboard } from '../../hooks/useDashboard';
import { usePermissions } from '../../hooks/usePermissions';
import { formatWeightCompact } from '../../utils/displayHelpers';

export const DashboardSummary: React.FC = () => {
  const { summary, loading, refreshDashboard } = useDashboard();
  const { isAdmin, isOperator } = usePermissions();

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  // Stats específicas para ADMIN - visão gerencial
  const adminStats = [
    {
      title: 'Total de Produtos',
      value: summary?.totalProducts || 0,
      icon: InventoryIcon,
      iconColor: 'primary' as const,
      subtitle: 'produtos no sistema',
    },
    {
      title: 'Usuários Ativos',
      value: summary?.totalUsers || 0,
      icon: PersonIcon,
      iconColor: 'secondary' as const,
      subtitle: 'usuários cadastrados',
    },
    {
      title: 'Produtos Criados Hoje',
      value: summary?.productsCreatedToday || 0,
      icon: InventoryIcon,
      iconColor: 'success' as const,
      subtitle: 'novos produtos',
    },
    {
      title: 'Próximos ao Vencimento',
      value: summary?.productsNearExpiration || 0,
      icon: WarningIcon,
      iconColor: 'error' as const,
      subtitle: 'produtos críticos',
    },
    {
      title: 'Capacidade Total',
      value: `${((summary?.totalWeight || 0) / (summary?.totalCapacity || 1) * 100).toFixed(0)}%`,
      icon: AssessmentIcon,
      iconColor: 'info' as const,
      subtitle: 'ocupação do sistema',
    },
    {
      title: 'Peso Total',
      value: formatWeightCompact(summary?.totalWeight || 0),
      icon: AssessmentIcon,
      iconColor: 'info' as const,
      subtitle: 'armazenado',
    },
  ];

  // Stats específicas para OPERATOR - foco operacional  
  const operatorStats = [
    {
      title: 'Aguardando Localização',
      value: summary?.productsAwaitingLocation || 0,
      icon: ScheduleIcon,
      iconColor: 'warning' as const,
      subtitle: 'produtos para localizar',
    },
    {
      title: 'Aguardando Retirada',
      value: summary?.productsAwaitingWithdrawal || 0,
      icon: RequestIcon,
      iconColor: 'info' as const,
      subtitle: 'retiradas pendentes',
    },
    {
      title: 'Produtos Locados',
      value: summary?.productsLocated || 0,
      icon: CheckCircleIcon,
      iconColor: 'success' as const,
      subtitle: 'produtos em estoque',
    },
    {
      title: 'Tarefas Concluídas Hoje',
      value: summary?.tasksCompletedToday || 0,
      icon: ConfirmIcon,
      iconColor: 'success' as const,
      subtitle: 'operações realizadas',
    },
    {
      title: 'Localizações Livres',
      value: summary ? (summary.totalLocations - summary.occupiedLocations) : 0,
      icon: LocationIcon,
      iconColor: 'secondary' as const,
      subtitle: 'espaços disponíveis',
    },
    {
      title: 'Próximos ao Vencimento',
      value: summary?.productsNearExpiration || 0,
      icon: WarningIcon,
      iconColor: 'error' as const,
      subtitle: 'produtos críticos',
    },
  ];

  const stats = isAdmin ? adminStats : operatorStats;

  if (loading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
            <StatsCard
              title="Carregando..."
              value="--"
              icon={InventoryIcon}
              iconColor="primary"
              loading={true}
            />
          </Grid>
        ))}
      </Grid>
    );
  }

  return (
    <Grid container spacing={3}>
      {stats.map((stat, index) => (
        <Grid item xs={12} sm={6} md={4} lg={2} key={index}>
          <StatsCard
            title={stat.title}
            value={stat.value}
            icon={stat.icon}
            iconColor={stat.iconColor}
            subtitle={stat.subtitle}
          />
        </Grid>
      ))}
    </Grid>
  );
}; 