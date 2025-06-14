import React from 'react';
import {
  Box,
  Typography,
  Chip,
  Tooltip,
  Card,
  CardContent,
  Grid,
  LinearProgress,
  IconButton,
  Stack,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Business as ChamberIcon,
  Inventory as InventoryIcon,
  Info as InfoIcon,
  Navigation as NavigationIcon,
} from '@mui/icons-material';
import { Location, Chamber } from '../../../types';
import { numeroParaLetra } from '../../../utils/locationUtils';
import { sanitizeChipProps } from '../../../utils/chipUtils';

// ============================================================================
// INTERFACES
// ============================================================================

interface LocationHierarchyDisplayProps {
  location: Location;
  chamber?: Chamber;
  showCapacity?: boolean;
  showNavigation?: boolean;
  onClick?: (location: Location) => void;
  variant?: 'card' | 'inline' | 'breadcrumb';
  size?: 'small' | 'medium' | 'large';
}

interface HierarchyCoordinate {
  label: string;
  value: string | number;
  color: string;
  icon: React.ReactNode;
}

// ============================================================================
// LOCATION HIERARCHY DISPLAY COMPONENT
// ============================================================================

/**
 * LocationHierarchyDisplay - Componente para exibir visualmente a hierarquia de localizações
 * 
 * REGRAS CRÍTICAS IMPLEMENTADAS:
 * - Hierarquia de localizações (Quadra → Lado → Fila → Andar)
 * - Validação de capacidade visual
 * - Uma localização = Um produto (feedback visual)
 * - Integração com sistema de câmaras
 * 
 * REGRAS REACT SEGUIDAS:
 * - Componente puro
 * - Props imutáveis 
 * - TypeScript rigoroso
 * - Acessibilidade
 */
export const LocationHierarchyDisplay: React.FC<LocationHierarchyDisplayProps> = ({
  location,
  chamber,
  showCapacity = true,
  showNavigation = false,
  onClick,
  variant = 'card',
  size = 'medium',
}) => {
  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const coordinates: HierarchyCoordinate[] = [
    {
      label: 'Quadra',
      value: location.coordinates.quadra,
      color: '#1976d2',
      icon: <ChamberIcon fontSize="small" />,
    },
    {
      label: 'Lado',
      value: typeof location.coordinates.lado === 'number' 
        ? numeroParaLetra(location.coordinates.lado)
        : location.coordinates.lado,
      color: '#388e3c',
      icon: <NavigationIcon fontSize="small" />,
    },
    {
      label: 'Fila',
      value: location.coordinates.fila,
      color: '#f57c00',
      icon: <InventoryIcon fontSize="small" />,
    },
    {
      label: 'Andar',
      value: location.coordinates.andar,
      color: '#7b1fa2',
      icon: <LocationIcon fontSize="small" />,
    },
  ];

  const capacityPercentage = location.maxCapacityKg > 0 
    ? (location.currentWeightKg / location.maxCapacityKg) * 100 
    : 0;

  const getCapacityColor = () => {
    if (capacityPercentage >= 100) return 'error';
    if (capacityPercentage >= 90) return 'warning';
    if (capacityPercentage >= 70) return 'info';
    return 'success';
  };

  const getCapacityLabel = () => {
    if (capacityPercentage >= 100) return 'Capacidade Excedida';
    if (capacityPercentage >= 90) return 'Quase Cheio';
    if (capacityPercentage >= 70) return 'Ocupação Alta';
    if (capacityPercentage > 0) return 'Disponível';
    return 'Vazio';
  };

  const isOccupied = location.isOccupied;
  const isOverCapacity = capacityPercentage > 100;

  // ============================================================================
  // RENDER VARIANTS
  // ============================================================================

  const renderBreadcrumb = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {coordinates.map((coord, index) => (
        <React.Fragment key={coord.label}>
          {index > 0 && (
            <Typography variant="body2" color="text.secondary">
              →
            </Typography>
          )}
                     <Chip
             {...sanitizeChipProps({
               size: size === 'small' ? 'small' : 'medium',
               label: `${coord.label.charAt(0)}${coord.value}`,
               sx: { 
                 backgroundColor: coord.color,
                 color: 'white',
               }
             })}
           />
        </React.Fragment>
      ))}
    </Box>
  );

  const renderInline = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
      <Typography variant="body2" color="text.secondary">
        Localização:
      </Typography>
      <Typography 
        variant="body1" 
        fontWeight="bold"
        color={isOccupied ? 'error.main' : 'success.main'}
      >
        {location.code}
      </Typography>
      {showCapacity && (
        <Chip
          {...sanitizeChipProps({
            size: "small",
            label: getCapacityLabel(),
            color: getCapacityColor(),
            variant: "outlined"
          })}
        />
      )}
    </Box>
  );

  const renderCard = () => (
    <Card 
      sx={{ 
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        '&:hover': onClick ? { 
          transform: 'translateY(-2px)',
          boxShadow: 3 
        } : {},
        border: isOverCapacity ? '2px solid' : '1px solid',
        borderColor: isOverCapacity ? 'error.main' : 'divider',
      }}
      onClick={() => onClick?.(location)}
    >
      <CardContent sx={{ pb: 2 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationIcon color="primary" />
            <Typography variant="h6" component="h3">
              {location.code}
            </Typography>
          </Box>
          
          {chamber && (
            <Tooltip title={`Câmara: ${chamber.name}`}>
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>

        {/* Coordenadas */}
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {coordinates.map((coord) => (
            <Box
              key={coord.label}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                p: 1,
                borderRadius: 1,
                backgroundColor: coord.color,
                color: 'white',
                minWidth: 60,
                flex: 1,
              }}
            >
              {coord.icon}
              <Typography variant="caption" sx={{ mt: 0.5 }}>
                {coord.label}
              </Typography>
              <Typography variant="h6" fontWeight="bold">
                {coord.value.toString().padStart(2, '0')}
              </Typography>
            </Box>
          ))}
        </Box>

        {/* Status e Capacidade */}
        {showCapacity && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Capacidade
              </Typography>
              <Typography variant="body2" fontWeight="bold">
                {location.currentWeightKg}kg / {location.maxCapacityKg}kg
              </Typography>
            </Box>
            
            <LinearProgress
              variant="determinate"
              value={Math.min(capacityPercentage, 100)}
              color={getCapacityColor()}
              sx={{ 
                height: 8, 
                borderRadius: 4,
                backgroundColor: 'grey.200',
              }}
            />
            
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
              <Chip
                {...sanitizeChipProps({
                  size: "small",
                  label: getCapacityLabel(),
                  color: getCapacityColor(),
                  variant: "outlined"
                })}
              />
              <Typography variant="caption" color="text.secondary">
                {capacityPercentage.toFixed(1)}% ocupado
              </Typography>
            </Box>
          </Box>
        )}

        {/* Status de Ocupação */}
        <Box sx={{ mt: 2 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              {...sanitizeChipProps({
                size: "small",
                label: isOccupied ? 'OCUPADO' : 'DISPONÍVEL',
                color: isOccupied ? 'error' : 'success',
                variant: isOccupied ? 'filled' : 'outlined'
              })}
            />
            
            {isOverCapacity && (
              <Chip
                {...sanitizeChipProps({
                  size: "small",
                  label: "SOBRECARGA",
                  color: "error",
                  variant: "filled"
                })}
              />
            )}
            
            {chamber && (
              <Chip
                {...sanitizeChipProps({
                  size: "small",
                  label: chamber.name,
                  variant: "outlined"
                })}
              />
            )}
          </Stack>
        </Box>
      </CardContent>
    </Card>
  );

  // ============================================================================
  // RENDER
  // ============================================================================

  switch (variant) {
    case 'breadcrumb':
      return renderBreadcrumb();
    case 'inline':
      return renderInline();
    case 'card':
    default:
      return renderCard();
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export type { LocationHierarchyDisplayProps };
export default LocationHierarchyDisplay; 