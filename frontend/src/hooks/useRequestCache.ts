import { useRef, useCallback } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

/**
 * Hook para cache de requisições com deduplicação
 * Evita múltiplas requisições simultâneas para o mesmo endpoint
 */
export const useRequestCache = <T>(cacheTimeMs: number = 5000) => {
  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<T>>>(new Map());

  const getCached = useCallback((key: string): T | null => {
    const entry = cache.current.get(key);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp > cacheTimeMs;
    if (isExpired) {
      cache.current.delete(key);
      return null;
    }

    return entry.data;
  }, [cacheTimeMs]);

  const setCached = useCallback((key: string, data: T) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
    });
  }, []);

  const executeRequest = useCallback(async <R>(
    key: string,
    requestFn: () => Promise<R>
  ): Promise<R> => {
    // Verificar cache primeiro
    const cached = getCached(key);
    if (cached) {
      return cached as R;
    }

    // Verificar se já existe uma requisição pendente
    const existingRequest = pendingRequests.current.get(key);
    if (existingRequest) {
      console.log(`🔄 Deduplicando requisição: ${key}`);
      return existingRequest as unknown as Promise<R>;
    }

    // Executar nova requisição
    const promise = requestFn();
    pendingRequests.current.set(key, promise as unknown as Promise<T>);

    try {
      const result = await promise;
      setCached(key, result as T);
      return result;
    } finally {
      pendingRequests.current.delete(key);
    }
  }, [getCached, setCached]);

  const clearCache = useCallback((key?: string) => {
    if (key) {
      cache.current.delete(key);
      pendingRequests.current.delete(key);
    } else {
      cache.current.clear();
      pendingRequests.current.clear();
    }
  }, []);

  return {
    executeRequest,
    getCached,
    setCached,
    clearCache,
  };
};