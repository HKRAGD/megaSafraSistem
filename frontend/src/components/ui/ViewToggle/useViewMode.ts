import { useState, useEffect, useCallback } from 'react';
import { ViewMode } from './index';

const STORAGE_KEY = 'warehouse_view_mode';
const DEFAULT_VIEW_MODE: ViewMode = 'tree'; // Recomendado para warehouse

interface UseViewModeResult {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  isLoading: boolean;
}

/**
 * Hook customizado para gerenciar o modo de visualização
 * com persistência no localStorage
 */
export const useViewMode = (initialMode?: ViewMode): UseViewModeResult => {
  const [viewMode, setViewModeState] = useState<ViewMode>(initialMode || DEFAULT_VIEW_MODE);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar preferência salva no localStorage ao montar
  useEffect(() => {
    try {
      const savedMode = localStorage.getItem(STORAGE_KEY) as ViewMode;
      if (savedMode && (savedMode === 'list' || savedMode === 'tree')) {
        setViewModeState(savedMode);
      } else if (initialMode) {
        setViewModeState(initialMode);
      }
    } catch (error) {
      console.warn('Erro ao carregar preferência de visualização do localStorage:', error);
      setViewModeState(initialMode || DEFAULT_VIEW_MODE);
    } finally {
      setIsLoading(false);
    }
  }, [initialMode]);

  // Função para alterar o modo de visualização
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      console.warn('Erro ao salvar preferência de visualização no localStorage:', error);
    }
  }, []);

  // Função para alternar entre os modos
  const toggleViewMode = useCallback(() => {
    const newMode: ViewMode = viewMode === 'list' ? 'tree' : 'list';
    setViewMode(newMode);
  }, [viewMode, setViewMode]);

  return {
    viewMode,
    setViewMode,
    toggleViewMode,
    isLoading
  };
};

export default useViewMode; 