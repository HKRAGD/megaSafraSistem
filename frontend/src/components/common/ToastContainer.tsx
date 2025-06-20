import React from 'react';
import { Snackbar, Alert, IconButton, Slide, SlideProps } from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';
import { useToast } from '../../contexts/ToastContext';

// Transição customizada para os toasts
const SlideTransition = (props: SlideProps) => {
  return <Slide {...props} direction="left" />;
};

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <>
      {toasts.map((toast, index) => (
        <Snackbar
          key={toast.id}
          open={true}
          autoHideDuration={toast.persistent ? null : toast.duration}
          onClose={() => removeToast(toast.id)}
          anchorOrigin={{ 
            vertical: 'top', 
            horizontal: 'right' 
          }}
          TransitionComponent={SlideTransition}
          sx={{
            position: 'fixed',
            top: `${72 + (index * 72)}px`, // Espaçamento entre toasts
            zIndex: theme => theme.zIndex.snackbar + index,
          }}
        >
          <Alert
            severity={toast.severity}
            variant="filled"
            onClose={toast.persistent ? undefined : () => removeToast(toast.id)}
            action={
              toast.action || (toast.persistent && (
                <IconButton
                  size="small"
                  aria-label="close"
                  color="inherit"
                  onClick={() => removeToast(toast.id)}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              ))
            }
            sx={{
              width: '100%',
              minWidth: 300,
              maxWidth: 500,
              '& .MuiAlert-message': {
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                '-webkit-line-clamp': 3,
                '-webkit-box-orient': 'vertical',
              },
            }}
          >
            {toast.message}
          </Alert>
        </Snackbar>
      ))}
    </>
  );
}; 