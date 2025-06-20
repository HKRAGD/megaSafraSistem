import React from 'react';
import {
  Box,
  CircularProgress,
  LinearProgress,
  Skeleton,
  Typography,
  Paper,
  Stack,
} from '@mui/material';

interface LoadingStateProps {
  variant?: 'circular' | 'linear' | 'skeleton' | 'card' | 'table' | 'form';
  size?: 'small' | 'medium' | 'large';
  message?: string;
  rows?: number;
  overlay?: boolean;
  fullHeight?: boolean;
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  variant = 'circular',
  size = 'medium',
  message,
  rows = 3,
  overlay = false,
  fullHeight = false,
}) => {
  // Configurações de tamanho
  const sizeConfig = {
    circular: {
      small: 24,
      medium: 40,
      large: 56,
    },
    skeleton: {
      small: 40,
      medium: 60,
      large: 80,
    },
  };

  // Componente base de container
  const Container: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const baseStyles = {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      p: 3,
      ...(fullHeight && { minHeight: '200px' }),
      ...(overlay && {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.8)',
        zIndex: 9999,
      }),
    };

    return <Box sx={baseStyles}>{children}</Box>;
  };

  // Renderização condicional por variante
  const renderContent = () => {
    switch (variant) {
      case 'circular':
        return (
          <Container>
            <CircularProgress size={sizeConfig.circular[size]} />
            {message && (
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            )}
          </Container>
        );

      case 'linear':
        return (
          <Box sx={{ width: '100%', p: 2 }}>
            <LinearProgress />
            {message && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, textAlign: 'center' }}>
                {message}
              </Typography>
            )}
          </Box>
        );

      case 'skeleton':
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={2}>
              {Array.from({ length: rows }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={sizeConfig.skeleton[size]}
                  animation="wave"
                />
              ))}
            </Stack>
          </Box>
        );

      case 'card':
        return (
          <Paper elevation={1} sx={{ p: 2, m: 1 }}>
            <Stack spacing={2}>
              <Skeleton variant="rectangular" height={200} animation="wave" />
              <Stack spacing={1}>
                <Skeleton variant="text" width="60%" height={24} animation="wave" />
                <Skeleton variant="text" width="80%" height={20} animation="wave" />
                <Skeleton variant="text" width="40%" height={20} animation="wave" />
              </Stack>
            </Stack>
          </Paper>
        );

      case 'table':
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={1}>
              {/* Header */}
              <Skeleton variant="rectangular" height={56} animation="wave" />
              {/* Rows */}
              {Array.from({ length: rows }).map((_, index) => (
                <Skeleton
                  key={index}
                  variant="rectangular"
                  height={48}
                  animation="wave"
                />
              ))}
            </Stack>
          </Box>
        );

      case 'form':
        return (
          <Box sx={{ p: 2 }}>
            <Stack spacing={3}>
              {Array.from({ length: rows }).map((_, index) => (
                <Box key={index}>
                  <Skeleton variant="text" width="30%" height={24} animation="wave" sx={{ mb: 1 }} />
                  <Skeleton variant="rectangular" height={56} animation="wave" />
                </Box>
              ))}
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 2 }}>
                <Skeleton variant="rectangular" width={100} height={36} animation="wave" />
                <Skeleton variant="rectangular" width={120} height={36} animation="wave" />
              </Box>
            </Stack>
          </Box>
        );

      default:
        return (
          <Container>
            <CircularProgress size={sizeConfig.circular[size]} />
            {message && (
              <Typography variant="body2" color="text.secondary">
                {message}
              </Typography>
            )}
          </Container>
        );
    }
  };

  return renderContent();
};

// Componente específico para overlay de loading
export const LoadingOverlay: React.FC<{ loading: boolean; children: React.ReactNode; message?: string }> = ({
  loading,
  children,
  message = 'Carregando...',
}) => {
  return (
    <Box sx={{ position: 'relative' }}>
      {children}
      {loading && (
        <LoadingState
          variant="circular"
          message={message}
          overlay
          fullHeight
        />
      )}
    </Box>
  );
};

// Hook para gerenciar estados de loading
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = React.useState(initialState);
  
  const startLoading = () => setLoading(true);
  const stopLoading = () => setLoading(false);
  
  const withLoading = async <T,>(asyncFunction: () => Promise<T>): Promise<T> => {
    startLoading();
    try {
      const result = await asyncFunction();
      return result;
    } finally {
      stopLoading();
    }
  };

  return {
    loading,
    startLoading,
    stopLoading,
    withLoading,
  };
}; 