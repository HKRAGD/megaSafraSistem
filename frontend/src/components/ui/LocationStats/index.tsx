import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Skeleton,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  Storage as StorageIcon,
  CheckCircle as OccupiedIcon,
  RadioButtonUnchecked as AvailableIcon,
  Scale as CapacityIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon
} from '@mui/icons-material';

import { LevelStats, TreeLevel, DEFAULT_STATUS_THRESHOLDS } from '../../../types/locationTree';

interface LocationStatsProps {
  stats: LevelStats;
  level: TreeLevel;
  loading?: boolean;
  compact?: boolean;
  showTrends?: boolean;
  className?: string;
}

interface StatCardProps {
  title: string;
  value: number | string;
  subtitle?: string;
  icon: React.ReactNode;
  color: string;
  progress?: number;
  trend?: 'up' | 'down' | 'flat';
  tooltip?: string;
  loading?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  color,
  progress,
  trend,
  tooltip,
  loading = false
}) => {
  const theme = useTheme();

  const getTrendIcon = () => {
    switch (trend) {
      case 'up':
        return <TrendingUpIcon fontSize="small" color="success" />;
      case 'down':
        return <TrendingDownIcon fontSize="small" color="error" />;
      case 'flat':
        return <TrendingFlatIcon fontSize="small" color="action" />;
      default:
        return null;
    }
  };

  const cardContent = (
    <Card
      elevation={1}
      sx={{
        height: '100%',
        background: `linear-gradient(135deg, ${color}15 0%, ${color}08 100%)`,
        border: `1px solid ${color}30`,
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
          borderColor: color
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box sx={{ color }} display="flex" alignItems="center">
            {icon}
          </Box>
          {trend && getTrendIcon()}
        </Box>

        {loading ? (
          <>
            <Skeleton variant="text" width="60%" height={32} />
            <Skeleton variant="text" width="80%" height={20} />
          </>
        ) : (
          <>
            <Typography
              variant="h6"
              component="div"
              sx={{
                fontWeight: 700,
                fontSize: '1.5rem',
                color: 'text.primary',
                lineHeight: 1.2
              }}
            >
              {value}
            </Typography>

            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: '0.75rem', fontWeight: 500 }}
            >
              {title}
            </Typography>

            {subtitle && (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ fontSize: '0.7rem' }}
              >
                {subtitle}
              </Typography>
            )}
          </>
        )}

        {progress !== undefined && !loading && (
          <Box mt={1}>
            <LinearProgress
              variant="determinate"
              value={progress}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: `${color}20`,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: color,
                  borderRadius: 3
                }
              }}
            />
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontSize: '0.65rem', mt: 0.5, display: 'block' }}
            >
              {progress.toFixed(0)}%
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return tooltip ? (
    <Tooltip title={tooltip} arrow enterDelay={500}>
      {cardContent}
    </Tooltip>
  ) : (
    cardContent
  );
};

export const LocationStats: React.FC<LocationStatsProps> = ({
  stats,
  level,
  loading = false,
  compact = false,
  showTrends = false,
  className
}) => {
  const theme = useTheme();

  // Determinar cores baseadas no status
  const getStatusColor = (rate: number): string => {
    if (rate <= DEFAULT_STATUS_THRESHOLDS.optimal.max) return theme.palette.success.main;
    if (rate <= DEFAULT_STATUS_THRESHOLDS.normal.max) return theme.palette.info.main;
    if (rate <= DEFAULT_STATUS_THRESHOLDS.warning.max) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Formatear números grandes
  const formatNumber = (num: number): string => {
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}k`;
    }
    return num.toString();
  };

  // Formatear peso
  const formatWeight = (kg: number): string => {
    if (kg >= 1000) {
      return `${(kg / 1000).toFixed(1)}t`;
    }
    return `${kg.toFixed(0)}kg`;
  };

  // Configuração dos cards de estatísticas
  const statCards = [
    {
      title: 'Total',
      value: formatNumber(stats.total),
      subtitle: `${level === 'chamber' ? 'câmaras' : 'posições'}`,
      icon: <StorageIcon />,
      color: theme.palette.primary.main,
      tooltip: `Total de ${stats.total} ${level === 'chamber' ? 'câmaras no sistema' : 'posições disponíveis'}`
    },
    {
      title: 'Ocupadas',
      value: formatNumber(stats.occupied),
      subtitle: `${stats.occupancyRate.toFixed(1)}% ocupação`,
      icon: <OccupiedIcon />,
      color: getStatusColor(stats.occupancyRate),
      progress: stats.occupancyRate,
      trend: showTrends ? (stats.occupancyRate > 80 ? 'up' : stats.occupancyRate < 50 ? 'down' : 'flat') : undefined,
      tooltip: `${stats.occupied} posições ocupadas (${stats.occupancyRate.toFixed(1)}% do total)`
    },
    {
      title: 'Disponíveis',
      value: formatNumber(stats.available),
      subtitle: `${(100 - stats.occupancyRate).toFixed(1)}% livres`,
      icon: <AvailableIcon />,
      color: theme.palette.grey[600],
      progress: 100 - stats.occupancyRate,
      tooltip: `${stats.available} posições disponíveis para novos produtos`
    },
    {
      title: 'Capacidade',
      value: formatWeight(stats.usedCapacityKg),
      subtitle: `de ${formatWeight(stats.totalCapacityKg)}`,
      icon: <CapacityIcon />,
      color: getStatusColor(stats.capacityRate),
      progress: stats.capacityRate,
      trend: showTrends ? (stats.capacityRate > 90 ? 'up' : stats.capacityRate < 60 ? 'down' : 'flat') : undefined,
      tooltip: `Peso utilizado: ${formatWeight(stats.usedCapacityKg)} de ${formatWeight(stats.totalCapacityKg)} (${stats.capacityRate.toFixed(1)}%)`
    }
  ];

  return (
    <Box className={className}>
      {/* Header com status geral */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h6" component="h3" fontWeight={600}>
          Estatísticas {level === 'chamber' ? 'das Câmaras' : 'do Nível'}
        </Typography>
        
        <Chip
          label={stats.status}
          size="small"
          color={
            stats.status === 'optimal' ? 'success' :
            stats.status === 'normal' ? 'info' :
            stats.status === 'warning' ? 'warning' :
            stats.status === 'critical' ? 'error' : 'default'
          }
          variant="outlined"
          sx={{ textTransform: 'capitalize' }}
        />
      </Box>

      {/* Grid de estatísticas */}
      <Box 
        display="grid" 
        gridTemplateColumns={{
          xs: 'repeat(2, 1fr)',
          sm: compact ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)'
        }}
        gap={compact ? 1 : 2}
      >
        {statCards.map((card, index) => (
          <StatCard
            key={index}
            title={card.title}
            value={card.value}
            subtitle={card.subtitle}
            icon={card.icon}
            color={card.color}
            progress={card.progress}
            trend={card.trend as 'up' | 'down' | 'flat' | undefined}
            tooltip={card.tooltip}
            loading={loading}
          />
        ))}
      </Box>

      {/* Informações adicionais */}
      {stats.productsCount !== undefined && !loading && (
        <Box mt={2} p={1.5} bgcolor="action.hover" borderRadius={1}>
          <Typography variant="body2" color="text.secondary">
            <strong>{stats.productsCount}</strong> produtos armazenados
            {stats.productsCount > 0 && (
              <> • Peso médio por produto: <strong>
                {formatWeight(stats.usedCapacityKg / stats.productsCount)}
              </strong></>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LocationStats; 