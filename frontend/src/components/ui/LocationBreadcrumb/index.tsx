import React from 'react';
import {
  Box,
  Breadcrumbs,
  Link,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Chip,
  Skeleton,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Home as HomeIcon,
  ChevronRight as ChevronRightIcon,
  MoreHoriz as MoreIcon,
  Business as ChamberIcon,
  ViewModule as QuadraIcon,
  ViewList as LadoIcon,
  ViewStream as FilaIcon,
  Layers as AndarIcon
} from '@mui/icons-material';

import { BreadcrumbItem, TreeLevel } from '../../../types/locationTree';
import { sanitizeChipProps } from '../../../utils/chipUtils';

interface LocationBreadcrumbProps {
  breadcrumb: BreadcrumbItem[];
  onNavigate: (path: string, level: TreeLevel) => void;
  loading?: boolean;
  maxItems?: number;
  showHome?: boolean;
  className?: string;
}

const getLevelIcon = (level: TreeLevel): React.ReactNode => {
  switch (level) {
    case 'chamber':
      return <ChamberIcon fontSize="small" />;
    case 'quadra':
      return <QuadraIcon fontSize="small" />;
    case 'lado':
      return <LadoIcon fontSize="small" />;
    case 'fila':
      return <FilaIcon fontSize="small" />;
    case 'andar':
      return <AndarIcon fontSize="small" />;
    default:
      return null;
  }
};

const getLevelLabel = (level: TreeLevel): string => {
  switch (level) {
    case 'chamber':
      return 'Câmara';
    case 'quadra':
      return 'Quadra';
    case 'lado':
      return 'Lado';
    case 'fila':
      return 'Fila';
    case 'andar':
      return 'Andar';
    default:
      return '';
  }
};

export const LocationBreadcrumb: React.FC<LocationBreadcrumbProps> = ({
  breadcrumb,
  onNavigate,
  loading = false,
  maxItems = 4,
  showHome = true,
  className
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  // Determinar itens visíveis baseado na tela
  const effectiveMaxItems = isMobile ? 2 : maxItems;
  const shouldCollapse = breadcrumb.length > effectiveMaxItems;
  
  let visibleItems = breadcrumb;
  let hiddenItems: BreadcrumbItem[] = [];

  if (shouldCollapse) {
    // Mostrar sempre o primeiro (home) e últimos itens
    const lastItemsCount = effectiveMaxItems - 1;
    hiddenItems = breadcrumb.slice(1, breadcrumb.length - lastItemsCount);
    visibleItems = [
      breadcrumb[0], // primeiro item
      ...breadcrumb.slice(breadcrumb.length - lastItemsCount) // últimos itens
    ];
  }

  const handleOverflowClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleOverflowClose = () => {
    setAnchorEl(null);
  };

  const handleItemClick = (item: BreadcrumbItem) => {
    if (item.isClickable && !loading) {
      onNavigate(item.path, item.level);
      handleOverflowClose();
    }
  };

  const handleHomeClick = () => {
    if (!loading) {
      onNavigate('/', 'chamber');
    }
  };

  // Renderizar item do breadcrumb
  const renderBreadcrumbItem = (item: BreadcrumbItem, isLast: boolean = false) => {
    const content = (
      <Box
        display="flex"
        alignItems="center"
        gap={0.5}
        sx={{
          color: isLast ? 'text.primary' : 'text.secondary',
          fontWeight: isLast ? 600 : 400
        }}
      >
        {getLevelIcon(item.level)}
        <Typography
          variant="body2"
          sx={{
            fontSize: isMobile ? '0.75rem' : '0.875rem',
            fontWeight: 'inherit'
          }}
        >
          {item.label}
        </Typography>
      </Box>
    );

    if (isLast || !item.isClickable) {
      return content;
    }

    return (
      <Link
        component="button"
        variant="body2"
        onClick={() => handleItemClick(item)}
        sx={{
          display: 'flex',
          alignItems: 'center',
          textDecoration: 'none',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          borderRadius: 1,
          p: 0.5,
          transition: 'all 0.2s ease-in-out',
          '&:hover': {
            backgroundColor: 'action.hover',
            transform: 'translateY(-1px)'
          }
        }}
      >
        {content}
      </Link>
    );
  };

  // Loading skeleton
  if (loading) {
    return (
      <Box className={className} display="flex" alignItems="center" gap={1}>
        <Skeleton variant="circular" width={24} height={24} />
        <Skeleton variant="text" width={60} height={20} />
        <ChevronRightIcon fontSize="small" color="disabled" />
        <Skeleton variant="text" width={80} height={20} />
        <ChevronRightIcon fontSize="small" color="disabled" />
        <Skeleton variant="text" width={100} height={20} />
      </Box>
    );
  }

  return (
    <Box className={className}>
      <Breadcrumbs
        separator={<ChevronRightIcon fontSize="small" color="action" />}
        aria-label="Navegação hierárquica de localização"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 0.5
          }
        }}
      >
        {/* Home button */}
        {showHome && (
          <IconButton
            size="small"
            onClick={handleHomeClick}
            disabled={loading}
            sx={{
              color: 'text.secondary',
              '&:hover': {
                color: 'primary.main',
                backgroundColor: 'action.hover'
              }
            }}
            aria-label="Voltar ao início"
          >
            <HomeIcon fontSize="small" />
          </IconButton>
        )}

        {/* Primeiro item visível */}
        {visibleItems[0] && renderBreadcrumbItem(visibleItems[0])}

        {/* Menu overflow para itens ocultos */}
        {shouldCollapse && hiddenItems.length > 0 && (
          <>
            <IconButton
              size="small"
              onClick={handleOverflowClick}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover'
                }
              }}
              aria-label={`Mostrar ${hiddenItems.length} níveis ocultos`}
            >
              <MoreIcon fontSize="small" />
              <Chip
                label={hiddenItems.length}
                size="small"
                sx={{
                  height: 16,
                  fontSize: '0.6rem',
                  ml: 0.5
                }}
              />
            </IconButton>

            <Menu
              anchorEl={anchorEl}
              open={Boolean(anchorEl)}
              onClose={handleOverflowClose}
              PaperProps={{
                sx: { minWidth: 200 }
              }}
            >
              {hiddenItems.map((item, index) => (
                <MenuItem
                  key={index}
                  onClick={() => handleItemClick(item)}
                  disabled={!item.isClickable}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1
                  }}
                >
                  {getLevelIcon(item.level)}
                  <Box>
                    <Typography variant="body2" fontWeight={500}>
                      {item.label}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {getLevelLabel(item.level)}
                    </Typography>
                  </Box>
                </MenuItem>
              ))}
            </Menu>
          </>
        )}

        {/* Demais itens visíveis */}
        {visibleItems.slice(1).map((item, index) => {
          const isLast = index === visibleItems.length - 2;
          return renderBreadcrumbItem(item, isLast);
        })}
      </Breadcrumbs>

      {/* Informação adicional sobre o nível atual */}
      {breadcrumb.length > 0 && !loading && (
        <Box mt={1}>
          <Typography variant="caption" color="text.secondary">
            Navegando em: <strong>{getLevelLabel(breadcrumb[breadcrumb.length - 1]?.level)}</strong>
            {breadcrumb.length > 1 && (
              <> • Profundidade: <strong>{breadcrumb.length - 1}</strong></>
            )}
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default LocationBreadcrumb; 