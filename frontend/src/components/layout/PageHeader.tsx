import React from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Breadcrumbs,
  Link,
  Divider,
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
} from '@mui/icons-material';

// ============================================================================
// INTERFACES
// ============================================================================

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
  customBreadcrumbs?: BreadcrumbItem[];
}

interface BreadcrumbItem {
  label: string;
  path?: string;
  icon?: React.ReactElement;
}

// ============================================================================
// MAPEAMENTO DE ROTAS PARA BREADCRUMBS
// ============================================================================

const routeLabels: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/products': 'Produtos',
  '/locations': 'Localizações',
  '/users': 'Usuários',
  '/settings': 'Configurações',
  '/history': 'Histórico',
  '/reports': 'Relatórios',
  '/reports/inventory': 'Estoque',
  '/reports/movements': 'Movimentações',
  '/reports/expiration': 'Vencimentos',
  '/reports/capacity': 'Capacidade',
};

// ============================================================================
// PAGE HEADER COMPONENT
// ============================================================================

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  actions,
  customBreadcrumbs,
}) => {
  const location = useLocation();

  // ============================================================================
  // GERAR BREADCRUMBS AUTOMATICAMENTE
  // ============================================================================

  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    if (customBreadcrumbs) {
      return customBreadcrumbs;
    }

    const pathSegments = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'Início',
        path: '/dashboard',
        icon: <HomeIcon fontSize="small" />,
      },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;
      const label = routeLabels[currentPath] || segment;
      
      // Não adicionar a página atual como link
      const isLast = index === pathSegments.length - 1;
      
      breadcrumbs.push({
        label,
        path: isLast ? undefined : currentPath,
      });
    });

    return breadcrumbs;
  };

  const breadcrumbs = generateBreadcrumbs();

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  return (
    <>
      <Box
        sx={{
          mb: 3,
          display: 'flex',
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          alignItems: { xs: 'flex-start', sm: 'center' },
          gap: 2,
        }}
      >
        {/* Área do título e breadcrumbs */}
        <Box sx={{ minWidth: 0, flex: 1 }}>
          {/* Breadcrumbs */}
          <Breadcrumbs
            separator={<NavigateNextIcon fontSize="small" />}
            sx={{ mb: 1 }}
            aria-label="breadcrumb"
          >
            {breadcrumbs.map((item, index) => {
              const isLast = index === breadcrumbs.length - 1;
              
              if (isLast || !item.path) {
                return (
                  <Box
                    key={item.label}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      color: 'text.secondary',
                    }}
                  >
                    {item.icon}
                    <Typography variant="caption" color="inherit">
                      {item.label}
                    </Typography>
                  </Box>
                );
              }

              return (
                <Link
                  key={item.label}
                  component={RouterLink}
                  to={item.path}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    textDecoration: 'none',
                    color: 'text.primary',
                    '&:hover': {
                      textDecoration: 'underline',
                    },
                  }}
                >
                  {item.icon}
                  <Typography variant="caption">
                    {item.label}
                  </Typography>
                </Link>
              );
            })}
          </Breadcrumbs>

          {/* Título principal */}
          <Typography
            variant="h4"
            component="h1"
            sx={{
              fontWeight: 600,
              color: 'text.primary',
              mb: subtitle ? 0.5 : 0,
            }}
          >
            {title}
          </Typography>

          {/* Subtítulo opcional */}
          {subtitle && (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ maxWidth: 600 }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Área de ações */}
        {actions && (
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 1,
              alignSelf: { xs: 'stretch', sm: 'flex-start' },
            }}
          >
            {actions}
          </Box>
        )}
      </Box>

      {/* Divider */}
      <Divider sx={{ mb: 3 }} />
    </>
  );
};

export default PageHeader; 