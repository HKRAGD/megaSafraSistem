import { useState, useCallback } from 'react';

type ToastSeverity = 'success' | 'error' | 'warning' | 'info';

interface UseToastNotificationReturn {
  toastOpen: boolean;
  toastMessage: string;
  toastSeverity: ToastSeverity;
  showToast: (message: string, severity?: ToastSeverity) => void;
  handleCloseToast: () => void;
}

export const useToastNotification = (): UseToastNotificationReturn => {
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<ToastSeverity>('success');

  const showToast = useCallback((message: string, severity: ToastSeverity = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  }, []);

  const handleCloseToast = useCallback(() => {
    setToastOpen(false);
  }, []);

  return {
    toastOpen,
    toastMessage,
    toastSeverity,
    showToast,
    handleCloseToast,
  };
};