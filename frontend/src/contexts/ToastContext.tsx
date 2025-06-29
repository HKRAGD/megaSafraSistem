import React, { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';
import { AlertColor } from '@mui/material';

// Types
export interface Toast {
  id: string;
  message: string;
  severity: AlertColor;
  duration?: number;
  action?: React.ReactNode;
  persistent?: boolean;
}

interface ToastContextType {
  toasts: Toast[];
  showToast: (message: string, severity?: AlertColor, options?: Partial<Toast>) => void;
  showSuccess: (message: string, options?: Partial<Toast>) => void;
  showError: (message: string, options?: Partial<Toast>) => void;
  showWarning: (message: string, options?: Partial<Toast>) => void;
  showInfo: (message: string, options?: Partial<Toast>) => void;
  removeToast: (id: string) => void;
  clearAll: () => void;
}

// Actions
type ToastAction =
  | { type: 'ADD_TOAST'; payload: Toast }
  | { type: 'REMOVE_TOAST'; payload: string }
  | { type: 'CLEAR_ALL' };

// Reducer
const toastReducer = (state: Toast[], action: ToastAction): Toast[] => {
  switch (action.type) {
    case 'ADD_TOAST':
      return [...state, action.payload];
    case 'REMOVE_TOAST':
      return state.filter(toast => toast.id !== action.payload);
    case 'CLEAR_ALL':
      return [];
    default:
      return state;
  }
};

// Context
const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Provider
interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, dispatch] = useReducer(toastReducer, []);

  const generateId = () => `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  const removeToast = useCallback((id: string) => {
    dispatch({ type: 'REMOVE_TOAST', payload: id });
  }, []);

  const showToast = useCallback((
    message: string, 
    severity: AlertColor = 'success', 
    options: Partial<Toast> = {}
  ) => {
    const toast: Toast = {
      id: generateId(),
      message,
      severity,
      duration: 6000,
      ...options,
    };
    
    dispatch({ type: 'ADD_TOAST', payload: toast });

    // Auto remove não-persistentes
    if (!toast.persistent) {
      setTimeout(() => {
        removeToast(toast.id);
      }, toast.duration || 6000);
    }
  }, [removeToast]);

  const showSuccess = useCallback((message: string, options?: Partial<Toast>) => {
    showToast(message, 'success', options);
  }, [showToast]);

  const showError = useCallback((message: string, options?: Partial<Toast>) => {
    showToast(message, 'error', { duration: 8000, ...options });
  }, [showToast]);

  const showWarning = useCallback((message: string, options?: Partial<Toast>) => {
    showToast(message, 'warning', { duration: 7000, ...options });
  }, [showToast]);

  const showInfo = useCallback((message: string, options?: Partial<Toast>) => {
    showToast(message, 'info', options);
  }, [showToast]);

  const clearAll = useCallback(() => {
    dispatch({ type: 'CLEAR_ALL' });
  }, []);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        removeToast,
        clearAll,
      }}
    >
      {children}
    </ToastContext.Provider>
  );
};

// Hook
export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}; 