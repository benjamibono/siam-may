import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface UseApiCacheOptions {
  cacheTime?: number; // tiempo en ms para mantener en caché
  staleTime?: number; // tiempo en ms antes de considerar datos obsoletos
  refetchOnWindowFocus?: boolean;
  enabled?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const cache = new Map<string, CacheEntry<any>>();

export function useApiCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options: UseApiCacheOptions = {}
) {
  const {
    cacheTime = 5 * 60 * 1000, // 5 minutos por defecto
    staleTime = 30 * 1000, // 30 segundos por defecto
    refetchOnWindowFocus = true,
    enabled = true,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [isRefetching, setIsRefetching] = useState(false);
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (force = false) => {
    if (!enabled) return;

    const now = Date.now();
    const cached = cache.get(key);

    // Si hay datos en caché y no han expirado, usarlos
    if (cached && !force && now < cached.expiresAt) {
      setData(cached.data);
      setIsLoading(false);
      setError(null);
      return cached.data;
    }

    // Si hay datos en caché pero están obsoletos, mostrarlos mientras se refrescan
    if (cached && now < cached.timestamp + cacheTime) {
      setData(cached.data);
      setIsLoading(false);
      setIsRefetching(true);
    } else {
      setIsLoading(true);
    }

    // Cancelar request anterior si existe
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();

    try {
      const result = await fetcher();
      
      if (!mountedRef.current) return;

      // Actualizar caché
      cache.set(key, {
        data: result,
        timestamp: now,
        expiresAt: now + staleTime,
      });

      setData(result);
      setError(null);
      return result;
    } catch (err) {
      if (!mountedRef.current) return;
      
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }

      setError(err instanceof Error ? err : new Error('Unknown error'));
      
      // Si hay datos en caché, mantenerlos en caso de error
      if (cached) {
        setData(cached.data);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
        setIsRefetching(false);
      }
    }
  }, [key, fetcher, enabled, staleTime, cacheTime]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidate = useCallback(() => {
    cache.delete(key);
    return fetchData(true);
  }, [key, fetchData]);

  // Fetch inicial
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Refetch on window focus
  useEffect(() => {
    if (!refetchOnWindowFocus) return;

    const handleFocus = () => {
      const cached = cache.get(key);
      if (cached && Date.now() > cached.timestamp + staleTime) {
        fetchData();
      }
    };

    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [key, staleTime, refetchOnWindowFocus, fetchData]);

  // Cleanup
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    isLoading,
    error,
    isRefetching,
    refetch,
    invalidate,
  };
}

// Utilidad para invalidar múltiples claves de caché
export function invalidateCache(keys: string[]) {
  keys.forEach(key => cache.delete(key));
}

// Utilidad para limpiar toda la caché
export function clearCache() {
  cache.clear();
} 