import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Box, CircularProgress } from '@mui/material';
import { useAuth } from '../../hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'ADMIN' | 'OPERATOR';
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requiredRole 
}) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  // Mostra loading enquanto verifica autenticação
  if (loading) {
    return (
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '100vh',
        }}
      >
        <CircularProgress size={40} />
      </Box>
    );
  }

  // Redireciona para login se não autenticado
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verifica se o usuário tem a role necessária
  if (requiredRole && user.role !== requiredRole) {
    // Admin tem acesso a tudo
    if (user.role !== 'ADMIN') {
      // Operator não pode acessar funcionalidades de Admin
      if (requiredRole === 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}; 