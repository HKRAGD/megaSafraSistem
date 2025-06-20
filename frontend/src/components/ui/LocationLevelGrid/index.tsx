import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Chip,
  Skeleton,
  useTheme,
  alpha,
  LinearProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Business as ChamberIcon,
  ViewModule as QuadraIcon,
  ViewList as LadoIcon,
  ViewStream as FilaIcon,
  Layers as AndarIcon,
  CheckCircle as OccupiedIcon,
  RadioButtonUnchecked as AvailableIcon,
  Warning as WarningIcon,
  Thermostat as TempIcon,
  Scale as WeightIcon
} from '@mui/icons-material';
import SafeChip from '../SafeChip';
import { LocationTreeItem, TreeLevel, LevelGridProps } from '../../../types/locationTree';
import { sanitizeChipProps } from '../../../utils/chipUtils';

// Configurações de grid por nível
const GRID_CONFIGS = {
  chamber: {
    columns: { xs: 1, sm: 2, md: 3, lg: 3 },
    minHeight: 180,
    cardSize: 'large'
  },
  quadra: {
    columns: { xs: 2, sm: 3, md: 4, lg: 5 },
    minHeight: 140,
    cardSize: 'medium'
  },
  lado: {
    columns: { xs: 3, sm: 4, md: 6, lg: 8 },
    minHeight: 120,
    cardSize: 'small'
  },
  fila: {
    columns: { xs: 4, sm: 6, md: 8, lg: 10 },
    minHeight: 100,
    cardSize: 'compact'
  },
  andar: {
    columns: { xs: 5, sm: 8, md: 10, lg: 12 },
    minHeight: 80,
    cardSize: 'mini'
  }
} as const;

const getLevelIcon = (level: TreeLevel, size: 'small' | 'medium' | 'large' = 'medium') => {
  const IconComponent = {
    chamber: ChamberIcon,
    quadra: QuadraIcon,
    lado: LadoIcon,
    fila: FilaIcon,
    andar: AndarIcon
  }[level];

  return <IconComponent fontSize={size} />;
};

const getStatusColor = (item: LocationTreeItem, theme: any) => {
  if (item.isOccupied) {
    // Ocupado - cores baseadas na capacidade
    const capacityRate = item.stats.capacityRate;
    if (capacityRate > 95) return theme.palette.error.main;
    if (capacityRate > 85) return theme.palette.warning.main;
    return theme.palette.info.main;
  }
  return theme.palette.success.main; // Disponível
};

const getStatusIcon = (item: LocationTreeItem) => {
  if (item.isOccupied) {
    if (item.stats.capacityRate > 95) return <WarningIcon fontSize="small" color="error" />;
    return <OccupiedIcon fontSize="small" color="info" />;
  }
  return <AvailableIcon fontSize="small" color="success" />;
};

interface LocationCardProps {
  item: LocationTreeItem;
  level: TreeLevel;
  onClick: () => void;
  isSelected: boolean;
  loading: boolean;
  cardSize: string;
}

const LocationCard: React.FC<LocationCardProps> = ({
  item,
  level,
  onClick,
  isSelected,
  loading,
  cardSize
}) => {
  const theme = useTheme();
  const statusColor = getStatusColor(item, theme);

  if (loading) {
    return (
      <Card
        sx={{
          minHeight: GRID_CONFIGS[level].minHeight,
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <CardContent sx={{ flex: 1, p: 1.5 }}>
          <Skeleton variant="circular" width={32} height={32} sx={{ mb: 1 }} />
          <Skeleton variant="text" width="80%" height={24} />
          <Skeleton variant="text" width="60%" height={16} />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      onClick={onClick}
      sx={{
        minHeight: GRID_CONFIGS[level].minHeight,
        cursor: 'pointer',
        border: isSelected ? `2px solid ${theme.palette.primary.main}` : `1px solid ${alpha(statusColor, 0.3)}`,
        background: isSelected 
          ? alpha(theme.palette.primary.main, 0.1)
          : `linear-gradient(135deg, ${alpha(statusColor, 0.1)} 0%, ${alpha(statusColor, 0.05)} 100%)`,
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isSelected ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow: isSelected ? theme.shadows[8] : theme.shadows[1],
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: theme.shadows[8],
          borderColor: statusColor,
          '& .card-icon': {
            transform: 'scale(1.1)',
            color: statusColor
          }
        },
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <CardContent sx={{ flex: 1, p: cardSize === 'mini' ? 1 : 1.5 }}>
        {/* Header com ícone e status */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box
            className="card-icon"
            sx={{
              color: statusColor,
              transition: 'all 0.2s ease-in-out'
            }}
          >
            {getLevelIcon(level, cardSize === 'mini' ? 'small' : 'medium')}
          </Box>
          {getStatusIcon(item)}
        </Box>

        {/* Título principal */}
        <Typography
          variant={cardSize === 'mini' ? 'body2' : cardSize === 'small' ? 'subtitle2' : 'h6'}
          component="div"
          sx={{
            fontWeight: 600,
            fontSize: cardSize === 'mini' ? '0.75rem' : cardSize === 'small' ? '0.875rem' : '1rem',
            lineHeight: 1.2,
            mb: 0.5,
            color: 'text.primary'
          }}
        >
          {item.label}
        </Typography>

        {/* Estatísticas baseadas no nível e tamanho */}
        {cardSize !== 'mini' && (
          <Box>
            {/* Chip de ocupação */}
            <SafeChip
              label={`${item.stats.occupancyRate.toFixed(0)}% ocupado`}
              size="small"
              sx={{
                height: 20,
                fontSize: '0.7rem',
                backgroundColor: alpha(statusColor, 0.15),
                color: statusColor,
                mb: 1
              }}
            />

            {/* Informações específicas por nível */}
            {level === 'chamber' && cardSize === 'large' && item.chamber && (
              <Box display="flex" alignItems="center" gap={1} mb={1}>
                <TempIcon fontSize="small" color="action" />
                <Typography variant="caption" color="text.secondary">
                  {item.chamber.currentTemperature}°C
                </Typography>
              </Box>
            )}

            {level === 'andar' && item.location && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Código: {item.location.code}
                </Typography>
                {item.isOccupied && (
                  <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                    <WeightIcon fontSize="small" color="action" />
                    <Typography variant="caption" color="text.secondary">
                      {item.location.currentWeightKg}kg
                    </Typography>
                  </Box>
                )}
              </Box>
            )}

            {/* Progress bar de capacidade para níveis menores */}
            {(cardSize === 'small' || cardSize === 'compact') && item.stats.capacityRate > 0 && (
              <Box mt={1}>
                <LinearProgress
                  variant="determinate"
                  value={item.stats.capacityRate}
                  sx={{
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: alpha(statusColor, 0.2),
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: statusColor,
                      borderRadius: 2
                    }
                  }}
                />
              </Box>
            )}
          </Box>
        )}

        {/* Para cards mini, apenas info essencial */}
        {cardSize === 'mini' && (
          <Typography variant="caption" color="text.secondary" display="block">
            {item.isOccupied ? 'Ocupado' : 'Livre'}
          </Typography>
        )}

        {/* Indicador de filhos (se aplicável) */}
        {item.hasChildren && item.childrenCount > 0 && (
          <SafeChip
            label={`${item.childrenCount} ${level === 'chamber' ? 'quadras' : 'itens'}`}
            size="small"
            variant="outlined"
            sx={{
              position: 'absolute',
              top: 8,
              right: 8,
              height: 18,
              fontSize: '0.6rem'
            }}
          />
        )}
      </CardContent>
    </Card>
  );
};

export const LocationLevelGrid: React.FC<LevelGridProps> = ({
  level,
  data,
  onItemClick,
  onItemSelect,
  selectedItemId,
  expandedItems = [],
  columns,
  showStats = true,
  showTooltips = true,
  enableHover = true,
  loading = false
}) => {
  const theme = useTheme();
  const config = GRID_CONFIGS[level];

  // Se não há dados e não está carregando, mostrar estado vazio
  if (!loading && (!data || data.length === 0)) {
    return (
      <Box
        display="flex"
        flexDirection="column"
        alignItems="center"
        justifyContent="center"
        py={8}
        textAlign="center"
      >
        {getLevelIcon(level, 'large')}
        <Typography variant="h6" color="text.secondary" mt={2}>
          Nenhum item encontrado
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Não há dados disponíveis para este nível
        </Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Grid de itens */}
      <Box
        display="grid"
        gridTemplateColumns={{
          xs: `repeat(${
            typeof columns === 'object' ? columns.xs || config.columns.xs : columns || config.columns.xs
          }, 1fr)`,
          sm: `repeat(${
            typeof columns === 'object' ? columns.sm || config.columns.sm : columns || config.columns.sm
          }, 1fr)`,
          md: `repeat(${
            typeof columns === 'object' ? columns.md || config.columns.md : columns || config.columns.md
          }, 1fr)`,
          lg: `repeat(${
            typeof columns === 'object' ? columns.lg || config.columns.lg : columns || config.columns.lg
          }, 1fr)`
        }}
        gap={level === 'andar' ? 1 : 2}
        sx={{
          '& > div': {
            animation: loading ? 'none' : 'fadeInUp 0.5s ease-out',
            animationDelay: loading ? '0s' : 'calc(var(--animation-order, 0) * 0.1s)',
            '@keyframes fadeInUp': {
              '0%': {
                opacity: 0,
                transform: 'translateY(20px)'
              },
              '100%': {
                opacity: 1,
                transform: 'translateY(0)'
              }
            }
          }
        }}
      >
        {loading ? (
          // Skeletons durante carregamento
          (Array.from({ length: 12 }).map((_, index) => (
            <LocationCard
              key={`skeleton-${index}`}
              item={{} as LocationTreeItem}
              level={level}
              onClick={() => {}}
              isSelected={false}
              loading={true}
              cardSize={config.cardSize}
            />
          )))
        ) : (
          // Cards reais
          (data.map((item, index) => {
            const isSelected = selectedItemId === item.id;
            
            const cardElement = (
              <LocationCard
                key={item.id}
                item={item}
                level={level}
                onClick={() => onItemClick(item)}
                isSelected={isSelected}
                loading={false}
                cardSize={config.cardSize}
              />
            );

            // Adicionar tooltip se habilitado
            if (showTooltips && config.cardSize !== 'large') {
              return (
                <Tooltip
                  key={item.id}
                  title={
                    <Box>
                      <Typography variant="subtitle2">{item.label}</Typography>
                      <Typography variant="caption">
                        {item.stats.occupied} ocupados de {item.stats.total}
                      </Typography>
                      {item.stats.productsCount && (
                        <Typography variant="caption" display="block">
                          {item.stats.productsCount} produtos
                        </Typography>
                      )}
                    </Box>
                  }
                  arrow
                  enterDelay={500}
                  placement="top"
                >
                  <div style={{ '--animation-order': index } as React.CSSProperties}>
                    {cardElement}
                  </div>
                </Tooltip>
              );
            }

            return (
              <div key={item.id} style={{ '--animation-order': index } as React.CSSProperties}>
                {cardElement}
              </div>
            );
          }))
        )}
      </Box>
      {/* Footer informativo */}
      {!loading && data && data.length > 0 && (
        <Box mt={2} textAlign="center">
          <Typography variant="caption" color="text.secondary">
            Mostrando {data.length} {level === 'chamber' ? 'câmaras' : 'itens'} • 
            Click para navegar para o próximo nível
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LocationLevelGrid; 