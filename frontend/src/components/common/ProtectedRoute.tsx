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
  if (requiredRole) {
    // Casos específicos de acesso baseado em role
    if (requiredRole === 'ADMIN' && user.role !== 'ADMIN') {
      // Apenas ADMIN pode acessar rotas restritas de ADMIN
      return <Navigate to="/dashboard" replace />;
    }
    
    if (requiredRole === 'OPERATOR') {
      // OPERATOR e ADMIN podem acessar rotas de OPERATOR
      if (user.role !== 'OPERATOR' && user.role !== 'ADMIN') {
        return <Navigate to="/dashboard" replace />;
      }
    }
  }

  return <>{children}</>;
}; 