import React from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Badge,
  Menu,
  MenuItem,
  Avatar,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Notifications as NotificationsIcon,
  AccountCircle as AccountIcon,
  Logout as LogoutIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';
import { useAuth } from '../../contexts/AuthContext';
import { APP_CONFIG } from '../../config/app';

// ============================================================================
// INTERFACES
// ============================================================================

interface TopBarProps {
  sidebarOpen: boolean;
  onSidebarToggle: () => void;
  sidebarWidth: number;
}

// ============================================================================
// TOPBAR COMPONENT
// ============================================================================

export const TopBar: React.FC<TopBarProps> = ({ 
  sidebarOpen, 
  onSidebarToggle, 
  sidebarWidth 
}) => {
  const { user, logout } = useAuth();
  
  // Estados para menus
  const [notificationAnchor, setNotificationAnchor] = React.useState<null | HTMLElement>(null);
  const [profileAnchor, setProfileAnchor] = React.useState<null | HTMLElement>(null);

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleNotificationClick = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationClose = () => {
    setNotificationAnchor(null);
  };

  const handleProfileClick = (event: React.MouseEvent<HTMLElement>) => {
    setProfileAnchor(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchor(null);
  };

  const handleLogout = () => {
    handleProfileClose();
    logout();
  };

  // ============================================================================
  // RENDER COMPONENT
  // ============================================================================

  return (
    <AppBar
      position="fixed"
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        // Em desktop: se ajusta à sidebar quando ela está aberta
        // Em mobile: usa toda a largura (sidebar é overlay)
        marginLeft: { 
          xs: 0, 
          md: sidebarOpen ? `${sidebarWidth}px` : 0 
        },
        width: { 
          xs: '100%', 
          md: sidebarOpen ? `calc(100% - ${sidebarWidth}px)` : '100%' 
        },
        // Transição suave
        transition: (theme) => theme.transitions.create(['margin-left', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.enteringScreen,
        }),
      }}
    >
      <Toolbar>
        {/* Botão do menu (sempre visível) */}
        <IconButton
          edge="start"
          color="inherit"
          aria-label="toggle sidebar"
          onClick={onSidebarToggle}
          sx={{
            mr: 2,
          }}
        >
          <MenuIcon />
        </IconButton>

        {/* Logo e Título da aplicação */}
        <Box sx={{ 
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center',
          flexGrow: 1,
          gap: 2
        }}>
          <img 
            src={APP_CONFIG.LOGO_HORIZONTAL} 
            alt={APP_CONFIG.APP_FULL_NAME} 
            style={{ 
              height: '32px',
              width: 'auto',
              maxWidth: '140px'
            }}
          />
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{ color: 'inherit' }}
          >
            {APP_CONFIG.APP_FULL_NAME}
          </Typography>
        </Box>

        {/* Título compacto para mobile */}
        <Box sx={{ 
          display: { xs: 'flex', sm: 'none' },
          alignItems: 'center',
          flexGrow: 1,
          gap: 1
        }}>
          <img 
            src={APP_CONFIG.LOGO_VERTICAL} 
            alt={APP_CONFIG.APP_NAME} 
            style={{ 
              height: '24px',
              width: 'auto'
            }}
          />
          <Typography 
            variant="h6" 
            noWrap 
            component="div"
            sx={{ color: 'inherit' }}
          >
            {APP_CONFIG.APP_NAME}
          </Typography>
        </Box>

        {/* Área de ações */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Notificações */}
          <Tooltip title="Notificações">
            <IconButton
              color="inherit"
              onClick={handleNotificationClick}
              aria-label="notificações"
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Menu de Notificações */}
          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={handleNotificationClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: { width: 320, maxHeight: 400 }
            }}
          >
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Notificações</Typography>
            </Box>
            <Divider />
            
            {/* Lista de notificações (mockadas) */}
            <MenuItem onClick={handleNotificationClose}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Produto próximo ao vencimento
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Lote #123 vence em 5 dias
                </Typography>
              </Box>
            </MenuItem>
            
            <MenuItem onClick={handleNotificationClose}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Câmara com capacidade baixa
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Câmara A1 está 90% ocupada
                </Typography>
              </Box>
            </MenuItem>
            
            <MenuItem onClick={handleNotificationClose}>
              <Box>
                <Typography variant="body2" fontWeight="medium">
                  Nova movimentação registrada
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Produto transferido para B2
                </Typography>
              </Box>
            </MenuItem>
          </Menu>

          {/* Perfil do usuário */}
          <Tooltip title="Perfil">
            <IconButton
              color="inherit"
              onClick={handleProfileClick}
              aria-label="perfil do usuário"
            >
              <Avatar
                sx={{ 
                  width: 32, 
                  height: 32,
                  backgroundColor: 'secondary.main',
                  fontSize: '0.875rem'
                }}
              >
                {user?.name?.charAt(0)?.toUpperCase() || 'U'}
              </Avatar>
            </IconButton>
          </Tooltip>

          {/* Menu do Perfil */}
          <Menu
            anchorEl={profileAnchor}
            open={Boolean(profileAnchor)}
            onClose={handleProfileClose}
            transformOrigin={{ horizontal: 'right', vertical: 'top' }}
            anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            PaperProps={{
              sx: { width: 200 }
            }}
          >
            {/* Informações do usuário */}
            <Box sx={{ p: 2 }}>
              <Typography variant="subtitle2" fontWeight="medium">
                {user?.name}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {user?.email}
              </Typography>
              <Typography variant="caption" display="block" color="primary">
                {user?.role === 'admin' ? 'Administrador' : 
                 user?.role === 'operator' ? 'Operador' : 'Visualizador'}
              </Typography>
            </Box>
            
            <Divider />

            {/* Opções do menu */}
            <MenuItem onClick={handleProfileClose}>
              <AccountIcon sx={{ mr: 2 }} />
              Meu Perfil
            </MenuItem>
            
            <MenuItem onClick={handleProfileClose}>
              <SettingsIcon sx={{ mr: 2 }} />
              Configurações
            </MenuItem>
            
            <Divider />
            
            <MenuItem onClick={handleLogout}>
              <LogoutIcon sx={{ mr: 2 }} />
              Sair
            </MenuItem>
          </Menu>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar; 