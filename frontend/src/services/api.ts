import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// ============================================================================
// API CLIENT CONFIGURATION - AUTO DETECTION LOCAL/PUBLIC
// ============================================================================

/**
 * Detecta automaticamente se está sendo acessado via rede local ou externa
 * e configura a URL base da API correspondente
 */
function getApiBaseUrl(): string {
  const currentHost = window.location.hostname;
  
  // IPs configurados
  const localIP = process.env.REACT_APP_LOCAL_IP || '192.168.1.89';
  const publicIP = process.env.REACT_APP_PUBLIC_IP || '168.90.248.170';
  
  // URLs da API
  const localApiUrl = process.env.REACT_APP_API_URL_LOCAL || `http://${localIP}:3001/api`;
  const publicApiUrl = process.env.REACT_APP_API_URL_PUBLIC || `http://${publicIP}:3001/api`;
  const fallbackUrl = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
  
  console.log('🌐 Detecção automática de rede:');
  console.log(`   📍 Host atual: ${currentHost}`);
  console.log(`   🏠 IP Local: ${localIP}`);
  console.log(`   🌍 IP Público: ${publicIP}`);
  
  // Se está sendo acessado pelo IP local, usar API local
  if (currentHost === localIP || currentHost === 'localhost' || currentHost === '127.0.0.1') {
    console.log(`   ✅ Acesso LOCAL detectado - usando: ${localApiUrl}`);
    return localApiUrl;
  }
  
  // Se está sendo acessado pelo IP público, usar API pública  
  if (currentHost === publicIP && publicIP !== 'SEU_IP_PUBLICO_AQUI') {
    console.log(`   ✅ Acesso PÚBLICO detectado - usando: ${publicApiUrl}`);
    return publicApiUrl;
  }
  
  // Fallback para desenvolvimento
  console.log(`   ⚠️ Host não reconhecido, usando fallback: ${fallbackUrl}`);
  return fallbackUrl;
}

/**
 * Configuração base do cliente HTTP para comunicação com o backend
 * DETECÇÃO AUTOMÁTICA: Local vs Externa
 * 
 * REGRA CRÍTICA: NUNCA usar localStorage/sessionStorage, apenas React state
 */
const api: AxiosInstance = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// Log da configuração inicial
console.log(`🚀 API Cliente configurado para: ${api.defaults.baseURL}`);

// ============================================================================
// TOKEN MANAGEMENT - APENAS VIA REACT STATE
// ============================================================================

/**
 * Função para definir token no header - será chamada pelo AuthContext
 * IMPORTANTE: Token é gerenciado apenas via React state, não localStorage
 */
export const setAuthToken = (token: string | null): void => {
  if (token) {
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common.Authorization;
  }
};

/**
 * Função para definir refresh callback - será chamada pelo AuthContext
 * Permite que o AuthContext gerencie o refresh token
 */
let refreshTokenCallback: (() => Promise<string | null>) | null = null;
export const setRefreshTokenCallback = (callback: (() => Promise<string | null>) | null): void => {
  refreshTokenCallback = callback;
};

/**
 * Função para definir logout callback - será chamada pelo AuthContext
 * Permite que o AuthContext gerencie o logout quando token expira
 */
let logoutCallback: (() => void) | null = null;
export const setLogoutCallback = (callback: (() => void) | null): void => {
  logoutCallback = callback;
};

// ============================================================================
// REQUEST INTERCEPTOR
// ============================================================================

api.interceptors.request.use(
  (config) => {
    // Log para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 ${config.method?.toUpperCase()} ${config.url}`, {
        headers: config.headers,
        data: config.data,
      });
    }

    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// ============================================================================
// ADVANCED REFRESH TOKEN WITH QUEUE HANDLING
// ============================================================================

interface FailedRequest {
  resolve: (value: AxiosResponse) => void;
  reject: (value: AxiosError) => void;
  config: any;
}

let isRefreshing = false;
let failedQueue: FailedRequest[] = [];

const processQueue = (error: AxiosError | null, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject, config }) => {
    if (error) {
      reject(error);
    } else {
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Resolver com a promessa da requisição
      api(config).then(resolve).catch(reject);
    }
  });
  
  failedQueue = [];
};

// ============================================================================
// RESPONSE INTERCEPTOR - TRATAR ERROS E REFRESH TOKEN
// ============================================================================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ ${response.config.method?.toUpperCase()} ${response.config.url}`, {
        status: response.status,
        data: response.data,
      });
    }

    return response;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    // Log para desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error(`❌ ${originalRequest?.method?.toUpperCase()} ${originalRequest?.url}`, {
        status: error.response?.status,
        data: error.response?.data,
      });
    }

    // Token expirado - tentar renovar automaticamente
    if (error.response?.status === 401 && !originalRequest._retry && refreshTokenCallback) {
      
      // Se já estamos renovando token, colocar na fila
      if (isRefreshing) {
        return new Promise<AxiosResponse>((resolve, reject) => {
          failedQueue.push({ resolve, reject, config: originalRequest });
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        console.log('🔄 Tentando renovar token via AuthContext...');
        
        const newToken = await refreshTokenCallback();
        
        if (!newToken) {
          throw new Error('Falha ao renovar token');
        }

        // Atualizar header padrão da instância
        setAuthToken(newToken);

        // Adicionar novo token ao request original
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
        }

        console.log('✅ Token renovado com sucesso via AuthContext');
        
        // Processar fila de requisições pendentes
        processQueue(null, newToken);
        
        // Retentar requisição original
        return api(originalRequest);
        
      } catch (refreshError: any) {
        console.error('❌ Erro ao renovar token via AuthContext:', refreshError);
        
        // Processar fila com erro
        processQueue(refreshError);
        
        // Chamar logout via AuthContext
        if (logoutCallback) {
          logoutCallback();
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Token inválido ou outros erros de autenticação
    if (error.response?.status === 403) {
      console.warn('⚠️ Acesso negado - Verificar permissões do usuário');
    }

    // Erro de servidor
    if (error.response?.status && error.response.status >= 500) {
      console.error('🔥 Erro interno do servidor');
    }

    return Promise.reject(error);
  }
);

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Extrair mensagem de erro da resposta da API
 */
export const extractErrorMessage = (error: AxiosError): string => {
  if (error.response?.data) {
    const data = error.response.data as any;
    return data.message || data.error || 'Erro desconhecido';
  }
  
  if (error.message) {
    return error.message;
  }
  
  return 'Erro de conexão';
};

/**
 * Verificar se é erro de validação (400)
 */
export const isValidationError = (error: AxiosError): boolean => {
  return error.response?.status === 400;
};

/**
 * Verificar se é erro de autenticação (401)
 */
export const isAuthError = (error: AxiosError): boolean => {
  return error.response?.status === 401;
};

/**
 * Verificar se é erro de autorização (403)
 */
export const isForbiddenError = (error: AxiosError): boolean => {
  return error.response?.status === 403;
};

/**
 * Verificar se é erro de servidor (5xx)
 */
export const isServerError = (error: AxiosError): boolean => {
  return error.response?.status !== undefined && error.response.status >= 500;
};

// ============================================================================
// API METHODS WITH PROPER ERROR HANDLING
// ============================================================================

/**
 * GET request
 */
export const apiGet = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await api.get<T>(url, config);
  return response.data;
};

/**
 * POST request
 */
export const apiPost = async <T>(
  url: string, 
  data?: any, 
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.post<T>(url, data, config);
  return response.data;
};

/**
 * PUT request
 */
export const apiPut = async <T>(
  url: string, 
  data?: any, 
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.put<T>(url, data, config);
  return response.data;
};

/**
 * PATCH request
 */
export const apiPatch = async <T>(
  url: string, 
  data?: any, 
  config?: AxiosRequestConfig
): Promise<T> => {
  const response = await api.patch<T>(url, data, config);
  return response.data;
};

/**
 * DELETE request
 */
export const apiDelete = async <T>(url: string, config?: AxiosRequestConfig): Promise<T> => {
  const response = await api.delete<T>(url, config);
  return response.data;
};

export default api; 