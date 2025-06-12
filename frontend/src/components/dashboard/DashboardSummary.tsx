import React, { useEffect } from 'react';
import { Grid } from '@mui/material';
import {
  Inventory as InventoryIcon,
  LocationOn as LocationIcon,
  Assessment as AssessmentIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
} from '@mui/icons-material';
import { StatsCard } from '../ui';
import { useDashboard } from '../../hooks/useDashboard';
import { formatWeightCompact } from '../../utils/displayHelpers';

export const DashboardSummary: React.FC = () => {
  const { summary, loading, refreshDashboard } = useDashboard();

  useEffect(() => {
    refreshDashboard();
  }, [refreshDashboard]);

  const stats = [
    {
      title: 'Total de Produtos',
      value: summary?.totalProducts || 0,
      icon: InventoryIcon,
      iconColor: 'primary' as const,
      subtitle: 'produtos armazenados',
    },
    {
      title: 'Câmaras Totais',
      value: summary?.totalChambers || 0,
      icon: LocationIcon,
      iconColor: 'success' as const,
      subtitle: 'câmaras no sistema',
    },
    {
      title: 'Alertas Ativos',
      value: summary?.alertsCount || 0,
      icon: WarningIcon,
      iconColor: 'warning' as const,
      subtitle: 'requerem atenção',
    },
    {
      title: 'Próximos ao Vencimento',
      value: summary?.productsNearExpiration || 0,
      icon: WarningIcon,
      iconColor: 'error' as const,
      subtitle: 'produtos críticos',
    },
    {
      title: 'Localizações Livres',
      value: summary ? (summary.totalLocations - summary.occupiedLocations) : 0,
      icon: CheckCircleIcon,
      iconColor: 'secondary' as const,
      subtitle: 'espaços disponíveis',
    },
    {
      title: 'Peso Total',
      value: formatWeightCompact(summary?.totalWeight || 0),
      icon: AssessmentIcon,
      iconColor: 'info' as const,
      subtitle: 'armazenado',
    },
  ];

  if (loading) {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
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
        <Grid size={{ xs: 12, sm: 6, md: 4, lg: 2 }} key={index}>
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