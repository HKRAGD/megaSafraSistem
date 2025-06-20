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
import { usePermissions } from '../../hooks/usePermissions';
import { DashboardSummary } from '../../components/dashboard/DashboardSummary';
import { RecentMovements } from '../../components/dashboard/RecentMovements';

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { loading, error, refreshDashboard } = useDashboard();
  const { isAdmin, isOperator, canCreateProduct, canLocateProduct, canManageUsers } = usePermissions();

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
          Dashboard {isAdmin ? 'Administrativo' : 'Operacional'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Bem-vindo, {user?.name}! 
          {isAdmin && ' Você tem acesso completo ao sistema de gerenciamento.'}
          {isOperator && ' Aqui estão suas tarefas operacionais pendentes.'}
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
        <Grid
          size={{
            xs: 12,
            md: 8
          }}>
          <RecentMovements />
        </Grid>

        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
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
                    bgcolor: user?.role === 'ADMIN' ? 'error.light' : 
                            user?.role === 'OPERATOR' ? 'warning.light' : 'info.light',
                    color: user?.role === 'ADMIN' ? 'error.contrastText' : 
                           user?.role === 'OPERATOR' ? 'warning.contrastText' : 'info.contrastText',
                    borderRadius: 1,
                    display: 'inline-block'
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {user?.role === 'ADMIN' ? 'Administrador' : 
                     user?.role === 'OPERATOR' ? 'Operador' : 'Visualizador'}
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
                {isAdmin ? 'Ações Administrativas' : 'Tarefas Operacionais'}
              </Typography>
              <Typography variant="body2" color="text.secondary" paragraph>
                {isAdmin 
                  ? 'Acesso completo às funcionalidades administrativas:'
                  : 'Suas principais responsabilidades operacionais:'
                }
              </Typography>
              <Box component="ul" sx={{ pl: 2, mt: 2 }}>
                {isAdmin && (
                  <>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      ➕ Criar e gerenciar produtos
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      👥 Administração de usuários
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📋 Solicitar retiradas de produtos
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📊 Relatórios gerenciais
                    </Typography>
                  </>
                )}
                {isOperator && (
                  <>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📍 Localizar produtos aguardando
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      ✅ Confirmar retiradas pendentes
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📦 Mover produtos entre localizações
                    </Typography>
                    <Typography component="li" variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                      📊 Visualizar relatórios operacionais
                    </Typography>
                  </>
                )}
                <Typography component="li" variant="body2" color="text.secondary">
                  🏢 Câmaras e localizações
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}; 