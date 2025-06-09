import React, { useMemo } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Avatar,
  Box,
  IconButton,
  LinearProgress,
  Chip,
  Skeleton,
  SxProps,
  Theme,
  useTheme,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  More as MoreIcon,
} from '@mui/icons-material';
import { green, red, orange, blue, grey } from '@mui/material/colors';

// ============================================================================
// INTERFACES
// ============================================================================

interface StatsTrend {
  value: number;
  period: string;
  isPositive?: boolean;
}

interface StatsProgress {
  value: number;
  target: number;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error';
}

export interface StatsCardProps {
  /** Título principal da métrica */
  title: string;
  
  /** Valor principal a ser exibido */
  value: string | number;
  
  /** Ícone da métrica (componente React) */
  icon?: React.ElementType;
  
  /** Cor do avatar do ícone */
  iconColor?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
  
  /** Subtítulo ou descrição adicional */
  subtitle?: string;
  
  /** Informações de tendência/comparação */
  trend?: StatsTrend;
  
  /** Barra de progresso (opcional) */
  progress?: StatsProgress;
  
  /** Formato do valor (currency, percent, number) */
  format?: 'currency' | 'percent' | 'number';
  
  /** Prefixo do valor (ex: R$, $) */
  prefix?: string;
  
  /** Sufixo do valor (ex: %, kg, unidades) */
  suffix?: string;
  
  /** Variante do tamanho do card */
  size?: 'small' | 'medium' | 'large';
  
  /** Elevação do card */
  elevation?: number;
  
  /** Estado de loading */
  loading?: boolean;
  
  /** Função de clique no card */
  onClick?: () => void;
  
  /** Mostrar botão de mais opções */
  showMoreButton?: boolean;
  
  /** Função do botão de mais opções */
  onMoreClick?: () => void;
  
  /** Estilos customizados */
  sx?: SxProps<Theme>;
}

// ============================================================================
// STATS CARD COMPONENT  
// ============================================================================

/**
 * StatsCard - Componente para exibir métricas e KPIs
 * 
 * CARACTERÍSTICAS IMPLEMENTADAS:
 * - Design Material-UI moderno
 * - Suporte a diferentes formatos de dados
 * - Indicadores de tendência (+/-)
 * - Barras de progresso opcionais
 * - Estados de loading com skeleton
 * - Animações hover e interação
 * - Acessibilidade completa
 * - TypeScript rigoroso
 * 
 * REGRAS SEGUIDAS:
 * - Componente puro e performático
 * - Props imutáveis
 * - Material-UI theming
 * - ARIA labels para acessibilidade
 * - Responsividade automática
 */
export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  icon: IconComponent,
  iconColor = 'primary',
  subtitle,
  trend,
  progress,
  format = 'number',
  prefix = '',
  suffix = '',
  size = 'medium',
  elevation = 1,
  loading = false,
  onClick,
  showMoreButton = false,
  onMoreClick,
  sx,
}) => {
  const theme = useTheme();

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const formattedValue = useMemo(() => {
    if (loading) return '';
    
    let formattedVal = value;
    
    if (typeof value === 'number') {
      switch (format) {
        case 'currency':
          formattedVal = new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }).format(value);
          break;
        case 'percent':
          formattedVal = `${value.toFixed(1)}%`;
          break;
        case 'number':
          formattedVal = new Intl.NumberFormat('pt-BR').format(value);
          break;
        default:
          formattedVal = value.toString();
      }
    }
    
    return `${prefix}${formattedVal}${suffix}`;
  }, [value, format, prefix, suffix, loading]);

  const cardHeight = useMemo(() => {
    switch (size) {
      case 'small': return 140;
      case 'large': return 200;
      default: return 160;
    }
  }, [size]);

  const iconSizes = useMemo(() => {
    switch (size) {
      case 'small': return { avatar: 40, icon: 20 };
      case 'large': return { avatar: 56, icon: 28 };
      default: return { avatar: 48, icon: 24 };
    }
  }, [size]);

  const getIconColorScheme = useMemo(() => {
    const colorMap = {
      primary: { bg: blue[100], text: blue[700] },
      secondary: { bg: theme.palette.secondary.light, text: theme.palette.secondary.dark },
      success: { bg: green[100], text: green[700] },
      warning: { bg: orange[100], text: orange[700] },
      error: { bg: red[100], text: red[700] },
      info: { bg: blue[100], text: blue[700] },
    };
    return colorMap[iconColor];
  }, [iconColor, theme]);

  const getTrendColor = useMemo(() => {
    if (!trend) return grey[500];
    return trend.isPositive === true ? green[600] : red[600];
  }, [trend]);

  const getTrendIcon = useMemo(() => {
    if (!trend) return null;
    return trend.isPositive === true ? TrendingUpIcon : TrendingDownIcon;
  }, [trend]);

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  if (loading) {
    return (
      <Card
        elevation={elevation}
        sx={{
          height: cardHeight,
          cursor: onClick ? 'pointer' : 'default',
          ...sx,
        }}
      >
        <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
            <Skeleton variant="circular" width={iconSizes.avatar} height={iconSizes.avatar} />
            {showMoreButton && (
              <Skeleton variant="circular" width={32} height={32} />
            )}
          </Box>
          
          <Box flex={1}>
            <Skeleton variant="text" width="80%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="text" width="60%" height={36} sx={{ mb: 1 }} />
            {subtitle && <Skeleton variant="text" width="90%" height={20} />}
          </Box>
          
          {progress && (
            <Box mt={2}>
              <Skeleton variant="rectangular" height={4} />
            </Box>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      elevation={elevation}
      onClick={onClick}
      sx={{
        height: cardHeight,
        cursor: onClick ? 'pointer' : 'default',
        transition: theme.transitions.create(['transform', 'box-shadow'], {
          duration: theme.transitions.duration.short,
        }),
        '&:hover': onClick ? {
          transform: 'translateY(-2px)',
          boxShadow: theme.shadows[4],
        } : {},
        ...sx,
      }}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      aria-label={onClick ? `Ver detalhes de ${title}` : undefined}
    >
      <CardContent sx={{ 
        height: '100%', 
        display: 'flex', 
        flexDirection: 'column',
        '&:last-child': { paddingBottom: 2 }
      }}>
        {/* Header com ícone e botão de mais opções */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          {IconComponent && (
            <Avatar
              sx={{
                width: iconSizes.avatar,
                height: iconSizes.avatar,
                bgcolor: getIconColorScheme.bg,
                color: getIconColorScheme.text,
              }}
              aria-hidden="true"
            >
              <IconComponent sx={{ fontSize: iconSizes.icon }} />
            </Avatar>
          )}
          
          {showMoreButton && (
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                onMoreClick?.();
              }}
              aria-label={`Mais opções para ${title}`}
            >
              <MoreIcon />
            </IconButton>
          )}
        </Box>

        {/* Conteúdo principal */}
        <Box flex={1}>
          <Typography 
            variant="body2" 
            color="text.secondary" 
            gutterBottom
            sx={{ 
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: 0.5,
            }}
          >
            {title}
          </Typography>

          <Typography
            variant={size === 'large' ? 'h3' : size === 'small' ? 'h5' : 'h4'}
            component="div"
            sx={{
              fontWeight: 700,
              color: 'text.primary',
              lineHeight: 1.2,
              mb: subtitle ? 1 : 0,
            }}
            aria-label={`Valor: ${formattedValue}`}
          >
            {formattedValue}
          </Typography>

          {subtitle && (
            <Typography variant="body2" color="text.secondary" sx={{ opacity: 0.8 }}>
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Tendência */}
        {trend && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            <Chip
              size="small"
              icon={getTrendIcon ? React.createElement(getTrendIcon, { 
                sx: { fontSize: 16, color: getTrendColor } 
              }) : undefined}
              label={`${trend.isPositive === true ? '+' : ''}${trend.value || 0}%`}
              sx={{
                height: 24,
                bgcolor: trend.isPositive === true ? green[50] : red[50],
                color: getTrendColor,
                fontWeight: 600,
                '& .MuiChip-icon': {
                  color: getTrendColor,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              {trend.period}
            </Typography>
          </Box>
        )}

        {/* Barra de progresso */}
        {progress && (
          <Box mt={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
              <Typography variant="caption" color="text.secondary">
                Progresso
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {progress.value} / {progress.target}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={(progress.value / progress.target) * 100}
              color={progress.color || 'primary'}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: theme.palette.grey[200],
              }}
              aria-label={`Progresso: ${progress.value} de ${progress.target}`}
            />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default StatsCard;