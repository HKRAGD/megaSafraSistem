import React from 'react';
import {
  Box,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  Chip
} from '@mui/material';
import {
  ViewList as ListIcon,
  AccountTree as TreeIcon
} from '@mui/icons-material';

export type ViewMode = 'list' | 'tree';

interface ViewToggleProps {
  currentView: ViewMode;
  onViewChange: (view: ViewMode) => void;
  disabled?: boolean;
  size?: 'small' | 'medium' | 'large';
  showLabels?: boolean;
}

export const ViewToggle: React.FC<ViewToggleProps> = ({
  currentView,
  onViewChange,
  disabled = false,
  size = 'medium',
  showLabels = true
}) => {
  const handleViewChange = (
    event: React.MouseEvent<HTMLElement>,
    newView: ViewMode | null
  ) => {
    if (newView !== null && newView !== currentView) {
      onViewChange(newView);
      // Persistir no localStorage para manter preferência do usuário
      localStorage.setItem('warehouse_view_mode', newView);
    }
  };

  const toggleButtons = [
    {
      value: 'list' as ViewMode,
      icon: <ListIcon />,
      label: 'Lista',
      tooltip: 'Visualização em Lista - Mais compacta e rápida para busca',
      ariaLabel: 'Alternar para visualização em lista'
    },
    {
      value: 'tree' as ViewMode,
      icon: <TreeIcon />,
      label: 'Árvore',
      tooltip: 'Navegação Hierárquica - Ideal para explorar estrutura do warehouse',
      ariaLabel: 'Alternar para navegação hierárquica'
    }
  ];

  return (
    <Box 
      sx={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: 1,
        '& .MuiToggleButtonGroup-root': {
          borderRadius: 2,
          '& .MuiToggleButton-root': {
            border: '1px solid',
            borderColor: 'divider',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              backgroundColor: 'action.hover',
              transform: 'translateY(-1px)',
              boxShadow: 1
            },
            '&.Mui-selected': {
              backgroundColor: 'primary.main',
              color: 'primary.contrastText',
              '&:hover': {
                backgroundColor: 'primary.dark'
              }
            }
          }
        }
      }}
    >
      {/* Label informativo */}
      <Typography 
        variant="body2" 
        color="text.secondary"
        sx={{ 
          display: { xs: 'none', sm: 'block' },
          fontWeight: 500
        }}
      >
        Visualização:
      </Typography>

      {/* Toggle Button Group */}
      <ToggleButtonGroup
        value={currentView}
        exclusive
        onChange={handleViewChange}
        disabled={disabled}
        size={size}
        aria-label="Modo de visualização de localizações"
      >
        {toggleButtons.map(({ value, icon, label, tooltip, ariaLabel }) => (
          <Tooltip 
            key={value}
            title={tooltip}
            arrow
            enterDelay={500}
            placement="top"
          >
            <ToggleButton
              value={value}
              aria-label={ariaLabel}
              sx={{
                display: 'flex',
                flexDirection: showLabels ? 'row' : 'column',
                gap: showLabels ? 1 : 0.5,
                minWidth: showLabels ? 80 : 48,
                px: showLabels ? 2 : 1
              }}
            >
              {icon}
              {showLabels && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    display: { xs: 'none', md: 'block' },
                    fontWeight: 600,
                    fontSize: '0.75rem'
                  }}
                >
                  {label}
                </Typography>
              )}
            </ToggleButton>
          </Tooltip>
        ))}
      </ToggleButtonGroup>

      {/* Indicador de recomendação */}
      {currentView === 'tree' && (
        <Chip
          label="Recomendado"
          size="small"
          color="success"
          variant="outlined"
          sx={{ 
            fontSize: '0.7rem',
            height: 20,
            display: { xs: 'none', lg: 'flex' }
          }}
        />
      )}
    </Box>
  );
};

export default ViewToggle; 