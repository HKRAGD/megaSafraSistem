import { 
  LoginFormData, 
  RegisterFormData, 
  User, 
  ApiResponse,
  AuthResponse 
} from '../types';
import { apiPost, apiGet } from './api';

// ============================================================================
// AUTH SERVICE - Sistema de Autenticação
// ============================================================================

/**
 * Service responsável por todas as operações de autenticação
 * REGRA CRÍTICA: NUNCA usar localStorage/sessionStorage - apenas React state via callbacks
 * 
 * Este service trabalha com callbacks do AuthContext para gerenciar estado
 * Endpoints baseados na documentação: /api/auth/*
 */

// Callbacks para integração com AuthContext
let authCallbacks: {
  setUser: ((user: User | null) => void) | null;
  setTokens: ((accessToken: string, refreshToken?: string) => void) | null;
  clearAuth: (() => void) | null;
  getRefreshToken: (() => string | null) | null;
} = {
  setUser: null,
  setTokens: null,
  clearAuth: null,
  getRefreshToken: null,
};

/**
 * Configurar callbacks do AuthContext
 * Chamado pelo AuthContext durante inicialização
 */
export const setAuthCallbacks = (callbacks: {
  setUser: (user: User | null) => void;
  setTokens: (accessToken: string, refreshToken?: string) => void;
  clearAuth: () => void;
  getRefreshToken: () => string | null;
}): void => {
  authCallbacks = callbacks;
};

export const authService = {
  /**
   * Realizar login do usuário
   * POST /api/auth/login
   * 
   * SISTEMA INTERNO: Usar localStorage para persistência completa
   */
  login: async (credentials: LoginFormData): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiPost<ApiResponse<AuthResponse>>('/auth/login', credentials);
      
      // Usar callbacks do AuthContext para gerenciar estado
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        
        // SISTEMA INTERNO: Persistir dados completos para recuperação
        const sessionData = {
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isActive: user.isActive
          },
          accessToken,
          refreshToken: refreshToken || null,
          loginTime: new Date().toISOString(),
          expiresIn: response.data.expiresIn || '7d'
        };
        
        console.log('💾 Dados a serem salvos:', {
          userInfo: { id: user.id, name: user.name, email: user.email },
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!sessionData.refreshToken,
          loginTime: sessionData.loginTime
        });
        
        try {
          localStorage.setItem('userSession', JSON.stringify(sessionData));
          console.log('✅ Sessão completa persistida para sistema interno:', user.name);
          
          // 🔍 DEBUG: Verificar se foi salvo corretamente
          const savedVerification = localStorage.getItem('userSession');
          if (savedVerification) {
            console.log('✅ Verificação: dados salvos corretamente no localStorage');
            console.log('📊 Tamanho dos dados salvos:', savedVerification.length, 'caracteres');
            
            // Verificar se consegue fazer parse dos dados salvos
            try {
              const parsedData = JSON.parse(savedVerification);
              console.log('✅ Parse test successful:', {
                hasUser: !!parsedData.user,
                hasAccessToken: !!parsedData.accessToken,
                userName: parsedData.user?.name
              });
            } catch (parseError) {
              console.error('❌ ERRO: dados salvos estão corrompidos!', parseError);
            }
          } else {
            console.log('❌ ERRO CRÍTICO: dados não foram salvos no localStorage!');
          }
        } catch (storageError: any) {
          console.error('❌ ERRO ao salvar no localStorage:', storageError);
          // Continuar mesmo com erro de localStorage (modo degradado)
        }
        
        // Notificar AuthContext sobre login bem-sucedido
        if (authCallbacks.setUser) {
          authCallbacks.setUser(user);
        }
        
        if (authCallbacks.setTokens) {
          authCallbacks.setTokens(accessToken, refreshToken);
        }
        
        console.log('✅ Login realizado com sucesso:', user.name);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro no login:', error);
      throw error;
    }
  },

  /**
   * Registrar novo usuário (apenas admin)
   * POST /api/auth/register
   */
  register: async (userData: RegisterFormData): Promise<ApiResponse<AuthResponse>> => {
    try {
      const response = await apiPost<ApiResponse<AuthResponse>>('/auth/register', userData);
      
      if (response.success && response.data) {
        console.log('✅ Usuário registrado com sucesso:', response.data.user.name);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro no registro:', error);
      throw error;
    }
  },

  /**
   * Renovar access token
   * POST /api/auth/refresh
   * 
   * SISTEMA INTERNO: Usar dados salvos no localStorage
   */
  refreshToken: async (): Promise<string | null> => {
    try {
      // 1. Tentar obter refresh token via callback do AuthContext
      let refreshToken = authCallbacks.getRefreshToken ? authCallbacks.getRefreshToken() : null;
      
      // 2. Fallback: tentar obter da sessão salva
      if (!refreshToken) {
        const savedSession = localStorage.getItem('userSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          refreshToken = sessionData.refreshToken;
          console.log('🔄 Usando refresh token da sessão salva');
        }
      }
      
      if (!refreshToken) {
        throw new Error('Refresh token não encontrado');
      }

      const response = await apiPost<ApiResponse<{ accessToken: string; expiresIn: string }>>('/auth/refresh', {
        refreshToken
      });
      
      if (response.success && response.data) {
        const { accessToken } = response.data;
        
        // Atualizar sessão salva com novo access token
        const savedSession = localStorage.getItem('userSession');
        if (savedSession) {
          const sessionData = JSON.parse(savedSession);
          sessionData.accessToken = accessToken;
          sessionData.loginTime = new Date().toISOString(); // Atualizar tempo
          localStorage.setItem('userSession', JSON.stringify(sessionData));
        }
        
        // Notificar AuthContext sobre novo token
        if (authCallbacks.setTokens) {
          authCallbacks.setTokens(accessToken, refreshToken);
        }
        
        console.log('✅ Token renovado com sucesso e sessão atualizada');
        return accessToken;
      }
      
      throw new Error('Resposta inválida do servidor');
    } catch (error: any) {
      console.error('❌ Erro ao renovar token:', error);
      
      // Se falhou ao renovar, limpar tudo
      localStorage.removeItem('userSession');
      localStorage.removeItem('refreshToken');
      if (authCallbacks.clearAuth) {
        authCallbacks.clearAuth();
      }
      
      return null;
    }
  },

  /**
   * Realizar logout
   * POST /api/auth/logout
   * 
   * SISTEMA INTERNO: Limpar AuthContext + localStorage completo
   */
  logout: async (): Promise<void> => {
    try {
      // Tentar notificar o servidor sobre logout
      await apiPost('/auth/logout', {});
      console.log('✅ Logout realizado com sucesso no servidor');
    } catch (error: any) {
      console.error('❌ Erro no logout do servidor (ignorado):', error);
      // Continuar mesmo com erro na API
    } finally {
      // Limpar sessão completa do localStorage
      localStorage.removeItem('userSession');
      localStorage.removeItem('refreshToken'); // Compatibilidade com versão anterior
      console.log('🗑️ Sessão completa removida do localStorage');
      
      // Sempre limpar via callback do AuthContext
      if (authCallbacks.clearAuth) {
        authCallbacks.clearAuth();
        console.log('✅ Estado de autenticação limpo via AuthContext');
      }
    }
  },

  /**
   * Recuperar sessão do usuário após reload da página
   * SISTEMA INTERNO: Método robusto com validação de token no servidor
   */
  recoverSession: async (): Promise<{ user: User; accessToken: string; refreshToken: string } | null> => {
    try {
      console.log('🔄 Tentando recuperar sessão do sistema interno...');
      
      // 1. Verificar se há sessão salva no localStorage
      const savedSession = localStorage.getItem('userSession');
      if (!savedSession) {
        console.log('❌ Nenhuma sessão encontrada no localStorage');
        return null;
      }
      
      // 2. Parse dos dados da sessão
      let sessionData;
      try {
        sessionData = JSON.parse(savedSession);
      } catch (parseError) {
        console.log('❌ Dados de sessão corrompidos');
        localStorage.removeItem('userSession');
        return null;
      }
      
      const { user, accessToken, refreshToken, loginTime } = sessionData;
      
      // 3. Verificar se dados estão completos com logs detalhados
      console.log('🔍 Verificando dados da sessão:', {
        hasUser: !!user,
        userDetails: user ? { id: user.id, name: user.name, email: user.email } : null,
        hasAccessToken: !!accessToken,
        accessTokenLength: accessToken?.length || 0,
        hasRefreshToken: !!refreshToken,
        refreshTokenLength: refreshToken?.length || 0,
        loginTime
      });
      
      if (!user || !user.id || !user.name || !user.email) {
        console.log('❌ Dados de usuário incompletos:', { 
          hasUser: !!user, 
          userId: user?.id, 
          userName: user?.name, 
          userEmail: user?.email 
        });
        localStorage.removeItem('userSession');
        return null;
      }
      
      if (!accessToken || accessToken.length < 10) {
        console.log('❌ Access token inválido:', { 
          hasToken: !!accessToken, 
          tokenLength: accessToken?.length 
        });
        localStorage.removeItem('userSession');
        return null;
      }
      
      // Note: refreshToken pode vir do backend ou ser null inicialmente
      console.log('✅ Dados de sessão validados com sucesso');
      
      // 4. Configurar token temporariamente para testar validade
      const { setAuthToken } = await import('./api');
      setAuthToken(accessToken);
      
      // 5. Validar token no servidor verificando user data
      try {
        console.log('🔍 Validando token no servidor...');
        const currentUser = await authService.getCurrentUser();
        
        if (!currentUser || currentUser.id !== user.id) {
          console.log('❌ Token inválido ou usuário não encontrado');
          localStorage.removeItem('userSession');
          setAuthToken(null);
          return null;
        }
        
        console.log('✅ Token válido! Sessão recuperada:', currentUser.name);
        return { user: currentUser, accessToken, refreshToken };
        
      } catch (tokenError: any) {
        console.log('❌ Token expirado, tentando renovar...');
        
        // 6. Tentar renovar token se expirado
        try {
          const response = await apiPost<ApiResponse<{ accessToken: string; expiresIn: string }>>('/auth/refresh', {
            refreshToken
          });
          
          if (response.success && response.data) {
            const newAccessToken = response.data.accessToken;
            
            // Atualizar sessão com novo token
            const updatedSession = {
              ...sessionData,
              accessToken: newAccessToken,
              loginTime: new Date().toISOString()
            };
            localStorage.setItem('userSession', JSON.stringify(updatedSession));
            
            // Configurar novo token
            setAuthToken(newAccessToken);
            
            // Verificar usuário com novo token
            const currentUser = await authService.getCurrentUser();
            if (currentUser) {
              console.log('✅ Token renovado e sessão recuperada:', currentUser.name);
              return { user: currentUser, accessToken: newAccessToken, refreshToken };
            }
          }
          
          throw new Error('Falha ao renovar token');
          
        } catch (refreshError: any) {
          console.log('❌ Falha ao renovar token:', refreshError);
          localStorage.removeItem('userSession');
          setAuthToken(null);
          return null;
        }
      }
      
    } catch (error: any) {
      console.error('❌ Erro na recuperação de sessão:', error);
      // Limpar dados corrompidos
      localStorage.removeItem('userSession');
      const { setAuthToken } = await import('./api');
      setAuthToken(null);
      return null;
    }
  },

  /**
   * Verificar se usuário está autenticado e obter dados
   * GET /api/auth/security-info
   * 
   * Usado para recuperar sessão após reload da página
   */
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const response = await apiGet<ApiResponse<{
        sessionId: string;
        loginAttempts: number;
        lastLogin: string;
        activeSessions: number;
        user?: User;
      }>>('/auth/security-info');
      
      if (response.success && response.data.user) {
        console.log('✅ Usuário autenticado encontrado:', response.data.user.name);
        return response.data.user;
      }
      
      return null;
    } catch (error: any) {
      console.error('❌ Erro ao verificar usuário autenticado:', error);
      return null;
    }
  },

  /**
   * Obter informações de segurança do usuário
   * GET /api/auth/security-info
   */
  getSecurityInfo: async (): Promise<ApiResponse<{
    sessionId: string;
    loginAttempts: number;
    lastLogin: string;
    activeSessions: number;
  }>> => {
    try {
      const response = await apiGet<ApiResponse<{
        sessionId: string;
        loginAttempts: number;
        lastLogin: string;
        activeSessions: number;
      }>>('/auth/security-info');
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao obter informações de segurança:', error);
      throw error;
    }
  },

  /**
   * Revogar todas as sessões do usuário
   * POST /api/auth/revoke-sessions
   */
  revokeSessions: async (): Promise<ApiResponse<{ revokedSessions: number }>> => {
    try {
      const response = await apiPost<ApiResponse<{ revokedSessions: number }>>('/auth/revoke-sessions', {});
      
      if (response.success && response.data) {
        console.log('✅ Sessões revogadas:', response.data.revokedSessions);
      }
      
      return response;
    } catch (error: any) {
      console.error('❌ Erro ao revogar sessões:', error);
      throw error;
    }
  }
};

export default authService; 