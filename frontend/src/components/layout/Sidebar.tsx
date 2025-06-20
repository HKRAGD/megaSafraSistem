import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Divider,
  Box,
  Typography,
  Collapse,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Inventory as ProductsIcon,
  LocationOn as LocationsIcon,
  People as UsersIcon,
  Assessment as ReportsIcon,
  History as HistoryIcon,
  Settings as SettingsIcon,
  Assignment as AssignmentIcon,
  PlaylistAdd as PlaylistAddIcon,
  ExpandLess,
  ExpandMore,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { usePermissions } from '../../hooks/usePermissions';
import { APP_CONFIG } from '../../config/app';

// ============================================================================
// INTERFACES
// ============================================================================

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
  width: number;
}

interface MenuItemData {
  label: string;
  icon: React.ReactElement;
  path?: string;
  children?: MenuItemData[];
  requiredRoles?: ('ADMIN' | 'OPERATOR')[];
  exact?: boolean;
}

// ============================================================================
// DADOS DO MENU
// ============================================================================

const menuItems: MenuItemData[] = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/dashboard',
    exact: true,
    requiredRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    label: 'Produtos',
    icon: <ProductsIcon />,
    path: '/products',
    requiredRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    label: 'Localizações',
    icon: <LocationsIcon />,
    path: '/locations',
    requiredRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    label: 'Relatórios',
    icon: <ReportsIcon />,
    path: '/reports',
    requiredRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    label: 'Histórico',
    icon: <HistoryIcon />,
    path: '/history',
    requiredRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    label: 'Alocar Produtos',
    icon: <PlaylistAddIcon />,
    path: '/product-allocation',
    requiredRoles: ['OPERATOR'],
  },
  {
    label: 'Solicitações de Retirada',
    icon: <AssignmentIcon />,
    path: '/withdrawal-requests',
    requiredRoles: ['ADMIN', 'OPERATOR'],
  },
  {
    label: 'Usuários',
    icon: <UsersIcon />,
    path: '/users',
    requiredRoles: ['ADMIN'],
  },
  {
    label: 'Configurações',
    icon: <SettingsIcon />,
    path: '/settings',
    requiredRoles: ['ADMIN'],
  },
];

// ============================================================================
// SIDEBAR COMPONENT
// ============================================================================

export const Sidebar: React.FC<SidebarProps> = ({ open, onToggle, width }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { hasAnyRole } = usePermissions();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const [expandedItems, setExpandedItems] = React.useState<string[]>(['Relatórios']);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleItemClick = (item: MenuItemData) => {
    if (item.path) {
      navigate(item.path);
      // Fechar sidebar em mobile após navegação
      if (isMobile) {
        onToggle();
      }
    } else if (item.children) {
      toggleExpanded(item.label);
    }
  };

  const toggleExpanded = (label: string) => {
    setExpandedItems(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label)
        : [...prev, label]
    );
  };

  const isItemActive = (item: MenuItemData): boolean => {
    if (!item.path) return false;
    
    if (item.exact) {
      return location.pathname === item.path;
    }
    
    return location.pathname.startsWith(item.path);
  };

  const isItemVisible = (item: MenuItemData): boolean => {
    if (!item.requiredRoles || item.requiredRoles.length === 0) return true;
    return hasAnyRole(item.requiredRoles);
  };

  // ============================================================================
  // RENDER MENU ITEM
  // ============================================================================

  const renderMenuItem = (item: MenuItemData, level = 0) => {
    if (!isItemVisible(item)) return null;

    const isActive = isItemActive(item);
    const isExpanded = expandedItems.includes(item.label);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <React.Fragment key={item.label}>
        <ListItem disablePadding>
          <ListItemButton
            onClick={() => handleItemClick(item)}
            selected={isActive}
            sx={{
              pl: 2 + level * 2,
              minHeight: 48,
              '&.Mui-selected': {
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                '& .MuiListItemIcon-root': {
                  color: 'primary.contrastText',
                },
                '&:hover': {
                  backgroundColor: 'primary.dark',
                },
              },
            }}
          >
            <ListItemIcon
              sx={{
                minWidth: 40,
                color: isActive ? 'inherit' : 'text.secondary',
              }}
            >
              {item.icon}
            </ListItemIcon>
            
            <ListItemText 
              primary={item.label}
              primaryTypographyProps={{
                fontSize: '0.875rem',
                fontWeight: isActive ? 600 : 400,
              }}
            />
            
            {hasChildren && (
              isExpanded ? <ExpandLess /> : <ExpandMore />
            )}
          </ListItemButton>
        </ListItem>

        {/* Submenu */}
        {hasChildren && (
          <Collapse in={isExpanded} timeout="auto" unmountOnExit>
            <List component="div" disablePadding>
              {item.children!.map(child => renderMenuItem(child, level + 1))}
            </List>
          </Collapse>
        )}
      </React.Fragment>
    );
  };

  // ============================================================================
  // RENDER DRAWER CONTENT
  // ============================================================================

  const drawerContent = (
    <Box sx={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden' // Previne problemas de scroll
    }}>
      {/* Header do Sidebar */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: 1,
          borderColor: 'divider',
          minHeight: 64, // Altura da TopBar
          flexShrink: 0, // Não encolhe
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <img 
            src={APP_CONFIG.LOGO_VERTICAL} 
            alt={APP_CONFIG.APP_NAME} 
            style={{ 
              height: '28px',
              width: 'auto'
            }}
          />
          <Box>
            <Typography variant="h6" color="primary" fontWeight="bold" sx={{ lineHeight: 1 }}>
              {APP_CONFIG.APP_NAME}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1 }}>
              Sistem
            </Typography>
          </Box>
        </Box>
        
        {/* Botão fechar apenas em mobile */}
        {isMobile && (
          <IconButton onClick={onToggle} size="small">
            <CloseIcon />
          </IconButton>
        )}
      </Box>

      {/* Informações do usuário */}
      <Box
        sx={{
          p: 2,
          borderBottom: 1,
          borderColor: 'divider',
          flexShrink: 0, // Não encolhe
        }}
      >
        <Typography variant="subtitle2" fontWeight="medium">
          {user?.name}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {user?.role === 'ADMIN' ? 'Administrador' : 
           user?.role === 'OPERATOR' ? 'Operador' : 'Visualizador'}
        </Typography>
      </Box>

      {/* Menu de navegação */}
      <Box sx={{ 
        flexGrow: 1, 
        overflow: 'auto', // Permite scroll apenas no menu
        scrollbarWidth: 'thin',
        '&::-webkit-scrollbar': {
          width: '6px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'background.paper',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'divider',
          borderRadius: '3px',
        },
      }}>
        <List sx={{ pt: 1, pb: 1 }}>
          {menuItems.map(item => renderMenuItem(item))}
        </List>
      </Box>

      {/* Footer do Sidebar */}
      <Box
        sx={{
          p: 2,
          borderTop: 1,
          borderColor: 'divider',
          textAlign: 'center',
          flexShrink: 0, // Não encolhe
        }}
      >
        <Typography variant="caption" color="text.secondary">
          v{APP_CONFIG.APP_VERSION} - {APP_CONFIG.APP_FULL_NAME}
        </Typography>
      </Box>
    </Box>
  );

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  return (
    <>
      {/* Sidebar para Desktop - Drawer Persistente */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={open}
        sx={{
          display: { xs: 'none', md: open ? 'block' : 'none' },
          width: open ? width : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            borderRight: '1px solid',
            borderColor: 'divider',
            position: 'fixed',
            height: '100vh',
            top: 0,
            left: 0,
            zIndex: theme.zIndex.drawer,
            backgroundColor: 'background.paper',
            // Força ocultação quando fechado
            visibility: open ? 'visible' : 'hidden',
            transform: open ? 'translateX(0)' : `translateX(-${width}px)`,
            // Transições suaves
            transition: theme.transitions.create(['transform', 'visibility'], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          },
        }}
      >
        {drawerContent}
      </Drawer>

      {/* Sidebar para Mobile - Drawer Temporário */}
      <Drawer
        variant="temporary"
        anchor="left"
        open={open}
        onClose={onToggle}
        ModalProps={{
          keepMounted: true, // Melhor performance em mobile
        }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            backgroundColor: 'background.paper',
            zIndex: theme.zIndex.drawer + 100,
          },
          // Z-index para o modal backdrop
          zIndex: theme.zIndex.drawer + 99,
        }}
      >
        {drawerContent}
      </Drawer>
    </>
  );
};

export default Sidebar; 