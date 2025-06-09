import React, { useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Box,
  Alert,
  CircularProgress
} from '@mui/material';
import { 
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import { useAuth } from '../../hooks/useAuth';
import { useDashboard } from '../../hooks/useDashboard';
import { DashboardSummary } from '../../components/dashboard/DashboardSummary';
import { RecentMovements } from '../../components/dashboard/RecentMovements';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { loading, error, refreshDashboard } = useDashboard();

  // Carregar dados do dashboard ao acessar a página
  useEffect(() => {
    refreshDashboard();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state
  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
          <CircularProgress size={40} />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography 
          variant="h4" 
          fontWeight="bold" 
          color="primary" 
          gutterBottom
        >
          Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bem-vindo, {user?.name}! Aqui está um resumo do sistema.
        </Typography>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Cards de Resumo */}
      <Box sx={{ mb: 4 }}>
        <DashboardSummary />
      </Box>

      {/* Seção Principal */}
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <RecentMovements />
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card elevation={2}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <TrendingUpIcon sx={{ color: 'primary.main', mr: 1 }} />
                <Typography variant="h6" fontWeight="bold">
                  Informações do Sistema
                </Typography>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Usuário Logado:
                </Typography>
                <Typography variant="body1" fontWeight="medium">
                  {user?.name}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {user?.email}
                </Typography>
              </Box>

              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Nível de Acesso:
                </Typography>
                <Box 
                  sx={{ 
                    px: 2, 
                    py: 1, 
                    bgcolor: user?.role === 'admin' ? 'error.light' : 
                            user?.role === 'operator' ? 'warning.light' : 'info.light',
                    color: user?.role === 'admin' ? 'error.contrastText' : 
                           user?.role === 'operator' ? 'warning.contrastText' : 'info.contrastText',
                    borderRadius: 1,
                    display: 'inline-block'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                    {user?.role === 'admin' ? 'Administrador' : 
                     user?.role === 'operator' ? 'Operador' : 'Visualizador'}
                  </Typography>
                </Box>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Status:
                </Typography>
                <Typography variant="body2" sx={{ color: 'success.main', fontWeight: 'medium' }}>
                  🟢 Sistema Online
                </Typography>
              </Box>
            </CardContent>
          </Card>

          <Card elevation={2} sx={{ mt: 2 }}>
            <CardContent>
              <Typography variant="h6" fontWeight="bold" gutterBottom>
                Acesso Rápido
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                Use os links de navegação na barra lateral para acessar:
              </Typography>
              <Box component="ul" sx={{ pl: 2, mt: 2 }}>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  📦 Gerenciar Produtos
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  🏢 Câmaras e Localizações
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  📊 Relatórios Completos
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  👥 Administração de Usuários
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}; 