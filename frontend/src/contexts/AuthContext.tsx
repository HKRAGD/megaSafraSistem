import React, { createContext, useContext, useReducer, useEffect, ReactNode, useCallback, useMemo } from 'react';
import { User, UserRole, UseAuthState, LoginFormData, ApiResponse, AuthResponse } from '../types';
import { setAuthToken, setRefreshTokenCallback, setLogoutCallback } from '../services/api';
import { authService, setAuthCallbacks } from '../services/authService';

// ============================================================================
// TYPES
// ============================================================================

interface AuthContextType extends UseAuthState {
  login: (credentials: LoginFormData) => Promise<void>;
  logout: () => void;
  hasPermission: (requiredRole?: UserRole) => boolean;
  refreshUserData: () => Promise<void>;
  refreshToken: () => Promise<string | null>;
  // Novos métodos específicos de permissão
  isAdmin: () => boolean;
  isOperator: () => boolean;
  canCreateProduct: () => boolean;
  canLocateProduct: () => boolean;
  canMoveProduct: () => boolean;
  canRemoveProduct: () => boolean;
  canRequestWithdrawal: () => boolean;
  canConfirmWithdrawal: () => boolean;
  canManageUsers: () => boolean;
  canAccessReports: () => boolean;
  can: (action: string) => boolean;
}

interface AuthAction {
  type: 'LOGIN_START' | 'LOGIN_SUCCESS' | 'LOGIN_ERROR' | 'LOGOUT' | 'REFRESH_USER' | 'SET_LOADING' | 'UPDATE_TOKENS';
  payload?: any;
}

interface AuthProviderProps {
  children: ReactNode;
}

interface AuthState extends UseAuthState {
  accessToken: string | null;
  refreshTokenData: string | null;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  loading: true,
  error: null,
  accessToken: null,
  refreshTokenData: null,
};

// ============================================================================
// AUTH REDUCER
// ============================================================================

const authReducer = (state: AuthState, action: AuthAction): AuthState => {
  switch (action.type) {
    case 'LOGIN_START':
      return {
        ...state,
        loading: true,
        error: null,
      };

    case 'LOGIN_SUCCESS':
      return {
        ...state,
        user: action.payload.user,
        accessToken: action.payload.accessToken,
        refreshTokenData: action.payload.refreshToken,
        isAuthenticated: true,
        loading: false,
        error: null,
      };

    case 'LOGIN_ERROR':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshTokenData: null,
        isAuthenticated: false,
        loading: false,
        error: action.payload.error,
      };

    case 'LOGOUT':
      return {
        ...state,
        user: null,
        accessToken: null,
        refreshTokenData: null,
        isAuthenticated: false,
        loading: false,
        error: null,
      };

    case 'REFRESH_USER':
      return {
        ...state,
        user: action.payload.user,
        loading: false,
      };

    case 'UPDATE_TOKENS':
      return {
        ...state,
        accessToken: action.payload.accessToken,
        refreshTokenData: action.payload.refreshToken || state.refreshTokenData,
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload.loading,
      };

    default:
      return state;
  }
};

// ============================================================================
// CONTEXT CREATION
// ============================================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================================
// AUTH PROVIDER
// ============================================================================

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // ============================================================================
  // ROLE HIERARCHY CONFIGURATION
  // ============================================================================
  
  const roleHierarchy = useMemo<Record<UserRole, number>>(() => ({
    OPERATOR: 1,
    ADMIN: 2,
  }), []);

  // ============================================================================
  // CALLBACK FUNCTIONS FOR AUTHSERVICE
  // ============================================================================

  const setUser = useCallback((user: User | null) => {
    if (user) {
      dispatch({
        type: 'REFRESH_USER',
        payload: { user },
      });
    } else {
      dispatch({ type: 'LOGOUT' });
    }
  }, []);

  const setTokens = useCallback((accessToken: string, refreshToken?: string) => {
    // Configurar token na API
    setAuthToken(accessToken);
    
    dispatch({
      type: 'UPDATE_TOKENS',
      payload: { accessToken, refreshToken },
    });
  }, []);

  const clearAuth = useCallback(() => {
    dispatch({ type: 'LOGOUT' });
    setAuthToken(null);
  }, []);

  const getRefreshToken = useCallback((): string | null => {
    return state.refreshTokenData;
  }, [state.refreshTokenData]);

  // ============================================================================
  // REFRESH TOKEN FUNCTION
  // ============================================================================

  const refreshToken = useCallback(async (): Promise<string | null> => {
    try {
      console.log('🔄 Renovando token via authService...');
      const newAccessToken = await authService.refreshToken();
      
      if (newAccessToken) {
        console.log('✅ Token renovado com sucesso via authService');
        return newAccessToken;
      }
      
      console.warn('⚠️ Falha ao renovar token via authService');
      return null;
      
    } catch (error: any) {
      console.error('❌ Erro ao renovar token via authService:', error);
      return null;
    }
  }, []);

  // ============================================================================
  // AUTHENTICATION FUNCTIONS
  // ============================================================================

  /**
   * Realizar logout do usuário
   */
  const logout = useCallback(async (): Promise<void> => {
    try {
      console.log('🚀 Iniciando logout via authService...');
      await authService.logout();
      console.log('✅ Logout concluído com sucesso via authService');
    } catch (error: any) {
      console.error('❌ Erro no logout via authService (ignorado):', error);
    }
  }, []);

  /**
   * Realizar login do usuário
   */
  const login = async (credentials: LoginFormData): Promise<void> => {
    dispatch({ type: 'LOGIN_START' });

    try {
      console.log('🚀 Iniciando login via authService...');
      const response = await authService.login(credentials);
      
      if (response.success && response.data) {
        const { user, accessToken, refreshToken: refreshTokenData } = response.data;
        
        dispatch({
          type: 'LOGIN_SUCCESS',
          payload: { user, accessToken, refreshToken: refreshTokenData },
        });

        console.log('✅ Login concluído com sucesso via authService:', user.name);
      } else {
        throw new Error('Resposta de login inválida');
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Erro ao fazer login';
      
      dispatch({
        type: 'LOGIN_ERROR',
        payload: { error: errorMessage },
      });

      console.error('❌ Erro no login via authService:', errorMessage);
      throw new Error(errorMessage);
    }
  };

  /**
   * Verificar se usuário tem permissão para uma operação
   */
  const hasPermission = useCallback((requiredRole?: UserRole): boolean => {
    if (!state.user || !state.isAuthenticated) {
      return false;
    }

    // Se não especificar role, qualquer usuário autenticado tem acesso
    if (!requiredRole) {
      return true;
    }

    // Verificar hierarquia de roles
    const userRoleLevel = roleHierarchy[state.user.role];
    const requiredRoleLevel = roleHierarchy[requiredRole];

    return userRoleLevel >= requiredRoleLevel;
  }, [state.user, state.isAuthenticated, roleHierarchy]);

  // ============================================================================
  // MÉTODOS ESPECÍFICOS DE PERMISSÃO (CONFORME ESPECIFICAÇÃO)
  // ============================================================================

  const isAdmin = useCallback((): boolean => {
    return state.user?.role === 'ADMIN' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const isOperator = useCallback((): boolean => {
    return state.user?.role === 'OPERATOR' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canCreateProduct = useCallback((): boolean => {
    return state.user?.role === 'ADMIN' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canLocateProduct = useCallback((): boolean => {
    return (state.user?.role === 'OPERATOR' || state.user?.role === 'ADMIN') && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canMoveProduct = useCallback((): boolean => {
    return state.user?.role === 'OPERATOR' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canRemoveProduct = useCallback((): boolean => {
    return state.user?.role === 'ADMIN' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canRequestWithdrawal = useCallback((): boolean => {
    return state.user?.role === 'ADMIN' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canConfirmWithdrawal = useCallback((): boolean => {
    return state.user?.role === 'OPERATOR' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canManageUsers = useCallback((): boolean => {
    return state.user?.role === 'ADMIN' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  const canAccessReports = useCallback((): boolean => {
    return state.user?.role === 'ADMIN' && state.isAuthenticated;
  }, [state.user?.role, state.isAuthenticated]);

  // Método para verificar múltiplas ações
  const can = useCallback((action: string): boolean => {
    switch (action) {
      case 'create_product':
        return canCreateProduct();
      case 'locate_product':
        return canLocateProduct();
      case 'move_product':
        return canMoveProduct();
      case 'remove_product':
        return canRemoveProduct();
      case 'request_withdrawal':
        return canRequestWithdrawal();
      case 'confirm_withdrawal':
        return canConfirmWithdrawal();
      case 'manage_users':
        return canManageUsers();
      case 'access_reports':
        return canAccessReports();
      default:
        return false;
    }
  }, [canCreateProduct, canLocateProduct, canMoveProduct, canRemoveProduct, canRequestWithdrawal, canConfirmWithdrawal, canManageUsers, canAccessReports]);

  /**
   * Atualizar dados do usuário
   */
  const refreshUserData = async (): Promise<void> => {
    try {
      if (!state.user || !state.accessToken) return;

      // Importação dinâmica para evitar dependência circular
      const { userService } = await import('../services/userService');
      const response = await userService.getById(state.user.id);
      
      dispatch({
        type: 'REFRESH_USER',
        payload: { user: response.data },
      });

      console.log('✅ Dados do usuário atualizados');
    } catch (error: any) {
      console.error('❌ Erro ao atualizar dados do usuário:', error);
      // Não fazer logout aqui, pode ser erro temporário
    }
  };

  // ============================================================================
  // EFFECTS
  // ============================================================================



  /**
   * Inicialização: Recuperar sessão do localStorage com proteção contra React StrictMode
   * Baseado em: https://www.freecodecamp.org/news/how-to-persist-a-logged-in-user-in-react
   * E: https://www.joshwcomeau.com/react/persisting-react-state-in-localstorage/
   */
  useEffect(() => {
    // Proteção contra execução dupla do React StrictMode
    let cancelled = false;
    
    const recoverSessionFromStorage = async () => {
      try {
        console.log('🔄 Iniciando recuperação de sessão...');
        
        // Verificar se já foi cancelado (StrictMode cleanup)
        if (cancelled) {
          console.log('⚠️ Recuperação cancelada - React StrictMode');
          return;
        }
        
        // Aguardar um tick para garantir que componentes estão montados
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Verificar novamente se foi cancelado após o delay
        if (cancelled) {
          console.log('⚠️ Recuperação cancelada após delay - React StrictMode');
          return;
        }
        
        // Recuperar sessão salva com validação no servidor
        const sessionData = await authService.recoverSession();
        
        // Verificar se foi cancelado após a recuperação
        if (cancelled) {
          console.log('⚠️ Recuperação cancelada após recoverSession - React StrictMode');
          return;
        }
        
        if (sessionData) {
          const { user, accessToken, refreshToken } = sessionData;
          
          console.log('✅ Dados de sessão recuperados:', {
            userName: user.name,
            userRole: user.role,
            hasAccessToken: !!accessToken,
            hasRefreshToken: !!refreshToken
          });
          
          // Restaurar estado completo
          dispatch({
            type: 'LOGIN_SUCCESS',
            payload: { user, accessToken, refreshToken }
          });
          
          console.log('✅ Estado do AuthContext restaurado para:', user.name);
        } else {
          // Nenhuma sessão válida para restaurar
          console.log('ℹ️ Nenhuma sessão válida encontrada - usuário precisa fazer login');
          dispatch({ type: 'SET_LOADING', payload: { loading: false } });
        }
      } catch (error: any) {
        console.error('❌ Erro crítico na recuperação de sessão:', error);
        
        // Verificar se foi cancelado antes de limpar
        if (!cancelled) {
          // Limpar qualquer dado corrompido
          localStorage.removeItem('userSession');
          localStorage.removeItem('refreshToken');
          
          // Finalizar loading
          dispatch({ type: 'SET_LOADING', payload: { loading: false } });
        }
      }
    };

    // Executar recuperação na inicialização
    recoverSessionFromStorage();
    
    // Cleanup function para React StrictMode
    return () => {
      cancelled = true;
      console.log('🧹 useEffect cleanup - cancelando recuperação de sessão');
    };
  }, []); // Empty dependency array - roda apenas uma vez

  /**
   * Configurar callbacks da API após montagem
   */
  useEffect(() => {
    // Configurar callbacks do authService
    setAuthCallbacks({
      setUser,
      setTokens,
      clearAuth,
      getRefreshToken,
    });

    // Configurar callbacks da API
    setRefreshTokenCallback(refreshToken);
    setLogoutCallback(clearAuth);

    console.log('✅ Callbacks configurados entre AuthContext ↔ authService ↔ api');

    return () => {
      // Cleanup callbacks
      setRefreshTokenCallback(null);
      setLogoutCallback(null);
    };
  }, [setUser, setTokens, clearAuth, getRefreshToken, refreshToken]);

  /**
   * Atualizar token na API sempre que mudar
   */
  useEffect(() => {
    setAuthToken(state.accessToken);
  }, [state.accessToken]);

  /**
   * Timer de inatividade - logout automático após 30 minutos
   * OTIMIZADO: Throttle nos eventos para reduzir overhead
   */
  useEffect(() => {
    if (!state.isAuthenticated) return;

    let inactivityTimer: NodeJS.Timeout;
    let lastResetTime = 0;
    const THROTTLE_MS = 5000; // Só reseta o timer a cada 5 segundos

    const resetInactivityTimer = () => {
      const now = Date.now();
      if (now - lastResetTime < THROTTLE_MS) {
        return; // Throttle - muito cedo para resetar novamente
      }
      
      lastResetTime = now;
      clearTimeout(inactivityTimer);
      inactivityTimer = setTimeout(() => {
        console.warn('⚠️ Logout automático por inatividade');
        logout();
      }, 30 * 60 * 1000); // 30 minutos
    };

    // Events que resetam o timer (com throttle)
    const events = ['mousedown', 'keypress'];
    
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer, { passive: true });
    });

    // Iniciar timer
    resetInactivityTimer();

    return () => {
      clearTimeout(inactivityTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
    };
  }, [state.isAuthenticated, logout]);

  // ============================================================================
  // PROVIDER VALUE
  // ============================================================================

  const value: AuthContextType = {
    user: state.user,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    error: state.error,
    login,
    logout,
    hasPermission,
    refreshUserData,
    refreshToken,
    // Novos métodos específicos de permissão
    isAdmin,
    isOperator,
    canCreateProduct,
    canLocateProduct,
    canMoveProduct,
    canRemoveProduct,
    canRequestWithdrawal,
    canConfirmWithdrawal,
    canManageUsers,
    canAccessReports,
    can,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// HOOKS
// ============================================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

// ============================================================================
// HOC para proteção de rotas com roles
// ============================================================================

export const withRoleProtection = (
  Component: React.ComponentType<any>,
  requiredRole?: UserRole
) => {
  return function ProtectedComponent(props: any) {
    const { isAuthenticated, hasPermission, loading } = useAuth();

    if (loading) {
      return <div>Carregando...</div>;
    }

    if (!isAuthenticated) {
      window.location.href = '/login';
      return null;
    }

    if (!hasPermission(requiredRole)) {
      return (
        <div>
          <h2>Acesso Negado</h2>
          <p>Você não tem permissão para acessar esta página.</p>
        </div>
      );
    }

    return <Component {...props} />;
  };
};

// Hook usePermissions foi movido para hooks/usePermissions.ts

export default AuthContext; 