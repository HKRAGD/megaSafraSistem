import React from 'react';
import {
  Box,
  Skeleton,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Typography,
} from '@mui/material';

// ============================================================================
// INTERFACES
// ============================================================================

interface LoadingProps {
  variant?: 'page' | 'table' | 'cards' | 'dashboard' | 'form' | 'circular' | 'linear';
  count?: number;
  height?: number | string;
  text?: string;
}

// ============================================================================
// LOADING COMPONENT
// ============================================================================

export const Loading: React.FC<LoadingProps> = ({
  variant = 'circular',
  count = 3,
  height = 200,
  text = 'Carregando...',
}) => {
  // ============================================================================
  // LOADING CIRCULAR CENTRALIZADO
  // ============================================================================

  if (variant === 'circular') {
    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: height,
          gap: 2,
        }}
      >
        <CircularProgress size={40} />
        <Typography variant="body2" color="text.secondary">
          {text}
        </Typography>
      </Box>
    );
  }

  // ============================================================================
  // LOADING LINEAR (BARRA DE PROGRESSO)
  // ============================================================================

  if (variant === 'linear') {
    return (
      <Box sx={{ width: '100%', my: 2 }}>
        <Skeleton variant="rectangular" width="100%" height={4} />
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
          {text}
        </Typography>
      </Box>
    );
  }

  // ============================================================================
  // LOADING PARA PÁGINAS COMPLETAS
  // ============================================================================

  if (variant === 'page') {
    return (
      <Box sx={{ p: 3 }}>
        {/* Header skeleton */}
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="text" width="30%" height={40} />
          <Skeleton variant="text" width="60%" height={20} sx={{ mt: 1 }} />
        </Box>

        {/* Content skeleton */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" height={400} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" height={200} sx={{ mb: 2 }} />
            <Skeleton variant="rectangular" height={180} />
          </Grid>
        </Grid>
      </Box>
    );
  }

  // ============================================================================
  // LOADING PARA TABELAS
  // ============================================================================

  if (variant === 'table') {
    return (
      <Box>
        {/* Header da tabela */}
        <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
          <Skeleton variant="rectangular" width="30%" height={40} />
          <Skeleton variant="rectangular" width="20%" height={40} />
          <Skeleton variant="rectangular" width="25%" height={40} />
          <Skeleton variant="rectangular" width="25%" height={40} />
        </Box>

        {/* Linhas da tabela */}
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Skeleton variant="text" width="30%" height={50} />
            <Skeleton variant="text" width="20%" height={50} />
            <Skeleton variant="text" width="25%" height={50} />
            <Skeleton variant="text" width="25%" height={50} />
          </Box>
        ))}
      </Box>
    );
  }

  // ============================================================================
  // LOADING PARA CARDS
  // ============================================================================

  if (variant === 'cards') {
    return (
      <Grid container spacing={3}>
        {Array.from({ length: count }).map((_, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Skeleton variant="circular" width={40} height={40} />
                  <Box sx={{ ml: 2, flex: 1 }}>
                    <Skeleton variant="text" width="60%" />
                    <Skeleton variant="text" width="40%" />
                  </Box>
                </Box>
                <Skeleton variant="rectangular" height={100} />
                <Box sx={{ mt: 2 }}>
                  <Skeleton variant="text" width="80%" />
                  <Skeleton variant="text" width="60%" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  }

  // ============================================================================
  // LOADING PARA DASHBOARD
  // ============================================================================

  if (variant === 'dashboard') {
    return (
      <Box>
        {/* Cards de métricas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {Array.from({ length: 4 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Skeleton variant="circular" width={24} height={24} />
                    <Skeleton variant="text" width="60%" sx={{ ml: 1 }} />
                  </Box>
                  <Skeleton variant="text" width="40%" height={32} />
                  <Skeleton variant="text" width="30%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Gráficos e conteúdo */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="30%" height={24} sx={{ mb: 2 }} />
                <Skeleton variant="rectangular" height={300} />
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Skeleton variant="text" width="40%" height={24} sx={{ mb: 2 }} />
                {Array.from({ length: 5 }).map((_, i) => (
                  <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Skeleton variant="circular" width={8} height={8} />
                    <Skeleton variant="text" width="70%" sx={{ ml: 1 }} />
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    );
  }

  // ============================================================================
  // LOADING PARA FORMULÁRIOS
  // ============================================================================

  if (variant === 'form') {
    return (
      <Box sx={{ p: 2 }}>
        {Array.from({ length: count }).map((_, index) => (
          <Box key={index} sx={{ mb: 3 }}>
            <Skeleton variant="text" width="30%" height={24} sx={{ mb: 1 }} />
            <Skeleton variant="rectangular" height={56} />
          </Box>
        ))}
        
        {/* Botões do formulário */}
        <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end', mt: 3 }}>
          <Skeleton variant="rectangular" width={100} height={36} />
          <Skeleton variant="rectangular" width={120} height={36} />
        </Box>
      </Box>
    );
  }

  // ============================================================================
  // DEFAULT - CIRCULAR
  // ============================================================================

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: height,
        gap: 2,
      }}
    >
      <CircularProgress size={40} />
      <Typography variant="body2" color="text.secondary">
        {text}
      </Typography>
    </Box>
  );
};

// ============================================================================
// EXPORTAÇÃO PADRÃO
// ============================================================================

export default Loading; 