import { useAuth } from './useAuth';
import { UserRole } from '../types';

export const usePermissions = () => {
  const { user } = useAuth();
  
  const hasRole = (role: UserRole) => user?.role === role;
  const hasAnyRole = (roles: UserRole[]) => roles.includes(user?.role as UserRole);
  
  return {
    isAdmin: hasRole('ADMIN'),
    isOperator: hasRole('OPERATOR'),
    hasRole,
    hasAnyRole,
    currentRole: user?.role,
    
    // Permissões específicas
    canCreateProduct: hasRole('ADMIN'),
    canLocateProduct: hasAnyRole(['ADMIN', 'OPERATOR']),
    canRequestWithdrawal: hasRole('ADMIN'),
    canConfirmWithdrawal: hasRole('OPERATOR'),
    canManageUsers: hasRole('ADMIN'),
    canViewReports: hasAnyRole(['ADMIN', 'OPERATOR']),
    canManageLocations: hasRole('ADMIN'),
    canMovementProducts: hasAnyRole(['ADMIN', 'OPERATOR']),
    
    // Permissões de navegação
    canAccessDashboard: hasAnyRole(['ADMIN', 'OPERATOR']),
    canAccessProducts: hasAnyRole(['ADMIN', 'OPERATOR']),
    canAccessNewProduct: hasRole('ADMIN'),
    canAccessUsers: hasRole('ADMIN'),
    canAccessWithdrawalRequests: hasRole('OPERATOR'),
    canAccessLocations: hasAnyRole(['ADMIN', 'OPERATOR']),
    canAccessReports: hasAnyRole(['ADMIN', 'OPERATOR']),
  };
};