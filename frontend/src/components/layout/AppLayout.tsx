import React from 'react';
import { Box, Toolbar } from '@mui/material';
import { useAuth } from '../../contexts/AuthContext';
import Sidebar from './Sidebar';
import TopBar from './TopBar';

// ============================================================================
// INTERFACE DO COMPONENTE
// ============================================================================

interface AppLayoutProps {
  children: React.ReactNode;
}

// ============================================================================
// CONSTANTES DE LAYOUT
// ============================================================================

const SIDEBAR_WIDTH = 280;

// ============================================================================
// APP LAYOUT COMPONENT
// ============================================================================

/**
 * Layout principal da aplicação
 * 
 * Estrutura:
 * - TopBar fixo no topo
 * - Sidebar à esquerda (retrátil em mobile, sempre visível em desktop quando aberta)
 * - Área de conteúdo principal à direita
 * - Responsivo para mobile/tablet
 */
export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [sidebarOpen, setSidebarOpen] = React.useState(true);

  // Se não estiver autenticado, não renderizar o layout
  if (!isAuthenticated || !user) {
    return <>{children}</>;
  }

  const handleSidebarToggle = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* TopBar fixo */}
      <TopBar 
        sidebarOpen={sidebarOpen}
        onSidebarToggle={handleSidebarToggle}
        sidebarWidth={SIDEBAR_WIDTH}
      />

      {/* Sidebar */}
      <Sidebar 
        open={sidebarOpen}
        onToggle={handleSidebarToggle}
        width={SIDEBAR_WIDTH}
      />

      {/* Área de conteúdo principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          height: '100vh',
          overflow: 'auto',
          // Em desktop: margem apenas quando sidebar está aberta
          // Em mobile: sem margem (sidebar é overlay)
          marginLeft: { 
            xs: 0, 
            md: sidebarOpen ? `${SIDEBAR_WIDTH}px` : 0 
          },
          // Transição suave
          transition: (theme) => theme.transitions.create(['margin-left'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
          // Evita overflow horizontal
          width: '100%',
          minWidth: 0, // Permite flexbox shrink
        }}
      >
        {/* Espaçamento para compensar a TopBar fixa */}
        <Toolbar />
        
        {/* Conteúdo da página */}
        <Box
          sx={{
            p: {
              xs: 2, // mobile
              sm: 3, // tablet+
            },
            minHeight: 'calc(100vh - 64px)',
            backgroundColor: 'background.default',
            width: '100%',
            maxWidth: '100%',
            // Container principal do conteúdo
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default AppLayout; 