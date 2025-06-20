import { useState, useEffect } from 'react';

/**
 * Hook para debounce de valores de entrada
 * Conforme regras do projeto: 300ms de delay obrigatório
 * 
 * @param value - Valor a ser debouncado
 * @param delay - Delay em ms (padrão: 300ms conforme regras)
 * @returns Valor debouncado
 */
export const useDebounce = <T>(value: T, delay: number = 300): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup do timeout anterior
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook para debounce específico de buscas
 * Inclui estado de loading durante o debounce
 */
export const useSearchDebounce = (searchTerm: string, delay: number = 300) => {
  const [isSearching, setIsSearching] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, delay);

  useEffect(() => {
    if (searchTerm !== debouncedSearch) {
      setIsSearching(true);
    } else {
      setIsSearching(false);
    }
  }, [searchTerm, debouncedSearch]);

  return {
    debouncedSearch,
    isSearching
  };
}; 