import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';
import { AuthProvider } from './contexts/AuthContext';
import { ToastProvider } from './contexts/ToastContext';
import { ProtectedRoute } from './components/common/ProtectedRoute';
import { AppLayout } from './components/layout/AppLayout';
import { Loading } from './components/common/Loading';
import { ToastContainer } from './components/common/ToastContainer';
import { APP_CONFIG } from './config/app';
import ChipErrorBoundary from './components/common/ChipErrorBoundary';
// Sistema de debug avançado para Chips (automático em desenvolvimento)
import './utils/debugInit';

// Lazy loading de páginas para melhorar performance inicial
const LoginPage = React.lazy(() => import('./pages/Login/LoginPage').then(module => ({ default: module.LoginPage })));
const DashboardPage = React.lazy(() => import('./pages/Dashboard/DashboardPage').then(module => ({ default: module.DashboardPage })));
const ProductsPage = React.lazy(() => import('./pages/Products/ProductsPage').then(module => ({ default: module.ProductsPage })));
const NewProductPage = React.lazy(() => import('./pages/Products/NewProductPage').then(module => ({ default: module.NewProductPage })));
const UsersPage = React.lazy(() => import('./pages/Users/UsersPage').then(module => ({ default: module.UsersPage })));
const LocationsPage = React.lazy(() => import('./pages/Locations/LocationsPage').then(module => ({ default: module.LocationsPage })));
const HistoryPage = React.lazy(() => import('./pages/History/HistoryPage'));
const SettingsPage = React.lazy(() => import('./pages/Settings/SettingsPage').then(module => ({ default: module.SettingsPage })));
const ReportsPage = React.lazy(() => import('./pages/Reports/ReportsPage'));
const WithdrawalRequestsPage = React.lazy(() => import('./pages/WithdrawalRequests').then(module => ({ default: module.WithdrawalRequestsPage })));
const ProductAllocationPage = React.lazy(() => import('./pages/ProductAllocation').then(module => ({ default: module.ProductAllocationPage })));
const ProductGroupDetailPage = React.lazy(() => import('./pages/ProductAllocation/ProductGroupDetailPage'));

// Tema Material-UI aprimorado
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
      light: '#42a5f5',
      dark: '#1565c0',
    },
    secondary: {
      main: '#4caf50',
      light: '#66bb6a',
      dark: '#388e3c',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 500,
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 500,
        },
      },
    },
  },
});

function App() {
  // Atualizar título da página
  React.useEffect(() => {
    document.title = APP_CONFIG.APP_FULL_NAME;
  }, []);

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <ToastProvider>
          <ChipErrorBoundary>
            <Router>
          <Suspense fallback={<Loading variant="page" text="Carregando aplicação..." />}>
            <Routes>
              {/* Rota pública de login */}
              <Route path="/login" element={<LoginPage />} />
              
              {/* Rotas protegidas com AppLayout */}
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="dashboard" text="Carregando dashboard..." />}>
                        <DashboardPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/products" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="table" text="Carregando produtos..." />}>
                        <ProductsPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/products/new" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <Suspense fallback={<Loading variant="page" text="Carregando formulário..." />}>
                        <NewProductPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/users" 
                element={
                  <ProtectedRoute requiredRole="ADMIN">
                    <AppLayout>
                      <Suspense fallback={<Loading variant="table" text="Carregando usuários..." />}>
                        <UsersPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/locations" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="cards" text="Carregando localizações..." />}>
                        <LocationsPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/settings" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="page" text="Carregando configurações..." />}>
                        <SettingsPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/history" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="table" text="Carregando histórico..." />}>
                        <HistoryPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/reports" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="page" text="Carregando relatórios..." />}>
                        <ReportsPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/withdrawal-requests" 
                element={
                  <ProtectedRoute>
                    <AppLayout>
                      <Suspense fallback={<Loading variant="table" text="Carregando solicitações..." />}>
                        <WithdrawalRequestsPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/product-allocation" 
                element={
                  <ProtectedRoute requiredRole="OPERATOR">
                    <AppLayout>
                      <Suspense fallback={<Loading variant="cards" text="Carregando produtos para alocação..." />}>
                        <ProductAllocationPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              <Route 
                path="/product-allocation/group/:batchId" 
                element={
                  <ProtectedRoute requiredRole="OPERATOR">
                    <AppLayout>
                      <Suspense fallback={<Loading variant="page" text="Carregando detalhes do grupo..." />}>
                        <ProductGroupDetailPage />
                      </Suspense>
                    </AppLayout>
                  </ProtectedRoute>
                } 
              />
              
              {/* Redirecionar raiz para dashboard */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              
              {/* Rota para páginas não encontradas */}
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </Router>
        <ToastContainer />
        </ChipErrorBoundary>
      </ToastProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
