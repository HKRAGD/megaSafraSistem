import { useCallback, useRef } from 'react';

interface RequestConfig {
  cacheTime?: number; // Tempo de cache em ms
  staleTime?: number; // Tempo antes de considerar stale em ms
  retries?: number;   // Número de tentativas
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  isStale: boolean;
  promise?: Promise<T>;
}

/**
 * Hook otimizado para requisições com cache e deduplicação
 * Reduz drasticamente o número de requisições duplicadas
 */
export const useOptimizedFetch = <T>() => {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const ongoingRequests = useRef<Map<string, Promise<T>>>(new Map());

  const fetchData = useCallback(async (
    key: string,
    fetchFn: () => Promise<T>,
    config: RequestConfig = {}
  ): Promise<T> => {
    const {
      cacheTime = 5 * 60 * 1000, // 5 minutos
      staleTime = 30 * 1000,     // 30 segundos
      retries = 1
    } = config;

    // 1. Verificar cache primeiro
    const cached = cache.current.get(key);
    if (cached && !cached.isStale) {
      console.log(`🎯 Cache hit: ${key}`);
      return cached.data;
    }

    // 2. Verificar se já existe requisição em andamento
    const ongoing = ongoingRequests.current.get(key);
    if (ongoing) {
      console.log(`🔄 Deduplicando requisição: ${key}`);
      return ongoing;
    }

    // 3. Executar nova requisição
    console.log(`🌐 Nova requisição: ${key}`);
    
    const executeRequest = async (attemptsLeft: number = retries): Promise<T> => {
      try {
        const result = await fetchFn();
        
        // Armazenar no cache
        cache.current.set(key, {
          data: result,
          timestamp: Date.now(),
          isStale: false
        });

        // Marcar como stale após staleTime
        setTimeout(() => {
          const entry = cache.current.get(key);
          if (entry) {
            entry.isStale = true;
          }
        }, staleTime);

        // Remover do cache após cacheTime
        setTimeout(() => {
          cache.current.delete(key);
        }, cacheTime);

        return result;
      } catch (error) {
        if (attemptsLeft > 0) {
          console.warn(`🔄 Tentando novamente: ${key} (${attemptsLeft} tentativas restantes)`);
          await new Promise(resolve => setTimeout(resolve, 1000)); // Delay entre tentativas
          return executeRequest(attemptsLeft - 1);
        }
        throw error;
      }
    };

    const promise = executeRequest();
    ongoingRequests.current.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      ongoingRequests.current.delete(key);
    }
  }, []);

  const invalidateCache = useCallback((keyPattern?: string) => {
    if (keyPattern) {
      // Invalidar chaves que correspondem ao padrão
      for (const key of Array.from(cache.current.keys())) {
        if (key.includes(keyPattern)) {
          cache.current.delete(key);
        }
      }
    } else {
      // Limpar todo o cache
      cache.current.clear();
    }
    ongoingRequests.current.clear();
  }, []);

  const getCacheInfo = useCallback(() => {
    return {
      size: cache.current.size,
      keys: Array.from(cache.current.keys()),
      ongoingRequests: Array.from(ongoingRequests.current.keys())
    };
  }, []);

  return {
    fetchData,
    invalidateCache,
    getCacheInfo
  };
};

/**
 * Hook específico para produtos com cache inteligente
 */
export const useOptimizedProducts = () => {
  const { fetchData, invalidateCache } = useOptimizedFetch();

  const fetchProducts = useCallback(async (filters: any, fetchFn: () => Promise<any>) => {
    // Criar chave única baseada nos filtros
    const filterKey = JSON.stringify(filters);
    const cacheKey = `products:${filterKey}`;

    return fetchData(cacheKey, fetchFn, {
      cacheTime: 3 * 60 * 1000, // 3 minutos
      staleTime: 30 * 1000,     // 30 segundos
      retries: 2
    });
  }, [fetchData]);

  const invalidateProducts = useCallback(() => {
    invalidateCache('products:');
  }, [invalidateCache]);

  return {
    fetchProducts,
    invalidateProducts
  };
};

/**
 * Hook específico para dashboard com cache mais agressivo
 */
export const useOptimizedDashboard = () => {
  const { fetchData, invalidateCache } = useOptimizedFetch();

  const fetchDashboardData = useCallback(async (
    section: 'summary' | 'chambers' | 'movements' | 'capacity',
    fetchFn: () => Promise<any>
  ) => {
    const cacheKey = `dashboard:${section}`;

    return fetchData(cacheKey, fetchFn, {
      cacheTime: 5 * 60 * 1000, // 5 minutos
      staleTime: 60 * 1000,     // 1 minuto
      retries: 1
    });
  }, [fetchData]);

  const invalidateDashboard = useCallback(() => {
    invalidateCache('dashboard:');
  }, [invalidateCache]);

  return {
    fetchDashboardData,
    invalidateDashboard
  };
};