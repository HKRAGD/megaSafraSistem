import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
} from '@mui/material';
import { WithdrawalRequestsList } from '../../components/withdrawals/WithdrawalRequestsList';
import { WithdrawalRequestDetails } from '../../components/withdrawals/WithdrawalRequestDetails';
import { WithdrawalRequestWithRelations } from '../../types';
import { useWithdrawalRequests } from '../../hooks/useWithdrawalRequests';
import { usePermissions } from '../../hooks/usePermissions';
import Toast from '../../components/common/Toast';

export const WithdrawalRequestsPage: React.FC = () => {
  const { isAdmin, isOperator } = usePermissions();
  const { confirmWithdrawalRequest, cancelWithdrawalRequest } = useWithdrawalRequests();
  
  const [selectedWithdrawal, setSelectedWithdrawal] = useState<WithdrawalRequestWithRelations | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  
  // Toast state
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'warning' | 'info'>('success');

  const showToast = (message: string, severity: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    setToastMessage(message);
    setToastSeverity(severity);
    setToastOpen(true);
  };

  const handleView = (withdrawal: WithdrawalRequestWithRelations) => {
    setSelectedWithdrawal(withdrawal);
    setShowDetails(true);
  };

  const handleEdit = (withdrawal: WithdrawalRequestWithRelations) => {
    // TODO: Implementar formulário de edição se necessário
    showToast('Funcionalidade de edição será implementada em breve', 'info');
  };

  const handleConfirm = (withdrawal: WithdrawalRequestWithRelations) => {
    setSelectedWithdrawal(withdrawal);
    setShowConfirmDialog(true);
  };

  const handleCancel = (withdrawal: WithdrawalRequestWithRelations) => {
    setSelectedWithdrawal(withdrawal);
    setShowCancelDialog(true);
  };

  const executeConfirm = async () => {
    if (!selectedWithdrawal) return;
    
    try {
      await confirmWithdrawalRequest(selectedWithdrawal.id);
      setShowConfirmDialog(false);
      setSelectedWithdrawal(null);
      showToast('Retirada confirmada com sucesso!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao confirmar retirada', 'error');
    }
  };

  const executeCancel = async () => {
    if (!selectedWithdrawal) return;
    
    try {
      await cancelWithdrawalRequest(selectedWithdrawal.id);
      setShowCancelDialog(false);
      setSelectedWithdrawal(null);
      showToast('Solicitação cancelada com sucesso!', 'success');
    } catch (error: any) {
      showToast(error.message || 'Erro ao cancelar solicitação', 'error');
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          {isAdmin ? 'Solicitações de Retirada' : 'Confirmar Retiradas'}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {isAdmin 
            ? 'Gerencie todas as solicitações de retirada do sistema'
            : 'Confirme as retiradas físicas solicitadas pelos administradores'
          }
        </Typography>
      </Box>

      {/* Informação contextual para OPERATOR */}
      {isOperator && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Instruções:</strong> Clique em "Confirmar Retirada" apenas após realizar a retirada física do produto da câmara refrigerada.
          </Typography>
        </Alert>
      )}

      {/* Lista de Solicitações */}
      <WithdrawalRequestsList
        onView={handleView}
        onEdit={handleEdit}
        onCancel={handleCancel}
        onConfirm={handleConfirm}
      />

      {/* Modal de Detalhes */}
      <Dialog
        open={showDetails}
        onClose={() => setShowDetails(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          Detalhes da Solicitação de Retirada
        </DialogTitle>
        <DialogContent>
          {selectedWithdrawal && (
            <WithdrawalRequestDetails
              withdrawalId={selectedWithdrawal.id}
              onClose={() => setShowDetails(false)}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDetails(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Confirmação */}
      <Dialog
        open={showConfirmDialog}
        onClose={() => setShowConfirmDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Confirmar Retirada</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja confirmar a retirada do produto "{selectedWithdrawal?.productId?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Esta ação indica que o produto foi fisicamente retirado da câmara refrigerada e não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowConfirmDialog(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={executeConfirm}
            variant="contained"
            color="success"
          >
            Confirmar Retirada
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog de Cancelamento */}
      <Dialog
        open={showCancelDialog}
        onClose={() => setShowCancelDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Cancelar Solicitação</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Tem certeza que deseja cancelar a solicitação de retirada do produto "{selectedWithdrawal?.productId?.name}"?
          </Typography>
          <Typography variant="body2" color="text.secondary">
            O produto voltará ao status "Locado" e poderá ser solicitado novamente.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowCancelDialog(false)}>
            Voltar
          </Button>
          <Button 
            onClick={executeCancel}
            variant="outlined"
            color="error"
          >
            Cancelar Solicitação
          </Button>
        </DialogActions>
      </Dialog>

      <Toast
        open={toastOpen}
        onClose={() => setToastOpen(false)}
        message={toastMessage}
        severity={toastSeverity}
      />
    </Container>
  );
};

export default WithdrawalRequestsPage;