import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Chip,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Stack,
  IconButton,
  Avatar,
  Grid,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stepper,
  Step,
  StepLabel,
  StepContent,
} from '@mui/material';
import {
  Close as CloseIcon,
  Assignment as RequestIcon,
  Person as PersonIcon,
  Inventory as InventoryIcon,
  CalendarToday as CalendarIcon,
  LocationOn as LocationIcon,
  Scale as WeightIcon,
  Done as ConfirmIcon,
  Cancel as CancelIcon,
  Edit as EditIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Timeline as TimelineIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { WithdrawalRequestWithRelations } from '../../types';
import { useWithdrawalRequests } from '../../hooks/useWithdrawalRequests';
import { usePermissions } from '../../hooks/usePermissions';
import { WithdrawalStatusBadge, WithdrawalTypeBadge } from '../ui';

interface WithdrawalRequestDetailsProps {
  withdrawalId: string;
  onClose: () => void;
  onEdit?: (withdrawal: WithdrawalRequestWithRelations) => void;
  onCancel?: (withdrawal: WithdrawalRequestWithRelations) => void;
  onConfirm?: (withdrawal: WithdrawalRequestWithRelations) => void;
}

export const WithdrawalRequestDetails: React.FC<WithdrawalRequestDetailsProps> = ({
  withdrawalId,
  onClose,
  onEdit,
  onCancel,
  onConfirm,
}) => {
  const { fetchWithdrawalById, confirmWithdrawalRequest, cancelWithdrawalRequest } = useWithdrawalRequests();
  const { isAdmin, isOperator, canRequestWithdrawal, canConfirmWithdrawal } = usePermissions();

  const [withdrawal, setWithdrawal] = useState<WithdrawalRequestWithRelations | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  
  // Dialogs
  const [confirmDialog, setConfirmDialog] = useState(false);
  const [cancelDialog, setCancelDialog] = useState(false);
  const [confirmNotes, setConfirmNotes] = useState('');
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    const loadWithdrawal = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const data = await fetchWithdrawalById(withdrawalId);
        
        if (data) {
          setWithdrawal(data);
        } else {
          setError('Solicitação não encontrada');
        }
      } catch (err: any) {
        setError(err.message || 'Erro ao carregar solicitação');
      } finally {
        setLoading(false);
      }
    };

    loadWithdrawal();
  }, [withdrawalId, fetchWithdrawalById]);

  const handleConfirm = async () => {
    if (!withdrawal) return;
    
    try {
      setActionLoading(true);
      const success = await confirmWithdrawalRequest(withdrawal.id, confirmNotes);
      
      if (success) {
        setConfirmDialog(false);
        setConfirmNotes('');
        // Recarregar dados
        const updatedData = await fetchWithdrawalById(withdrawalId);
        if (updatedData) setWithdrawal(updatedData);
        onConfirm?.(withdrawal);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao confirmar retirada');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!withdrawal) return;
    
    try {
      setActionLoading(true);
      const success = await cancelWithdrawalRequest(withdrawal.id, cancelReason);
      
      if (success) {
        setCancelDialog(false);
        setCancelReason('');
        // Recarregar dados
        const updatedData = await fetchWithdrawalById(withdrawalId);
        if (updatedData) setWithdrawal(updatedData);
        onCancel?.(withdrawal);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar solicitação');
    } finally {
      setActionLoading(false);
    }
  };

  // Removidas funções getStatusChip e getTypeChip - agora usando badges padronizados

  const getWorkflowSteps = () => {
    const steps = [
      {
        label: 'Solicitação Criada',
        description: `Por ${withdrawal?.requestedBy?.name || 'N/A'}`,
        completed: true,
        active: false,
      },
      {
        label: 'Aguardando Confirmação',
        description: 'Esperando operador confirmar',
        completed: withdrawal?.status === 'CONFIRMADO' || withdrawal?.status === 'CANCELADO',
        active: withdrawal?.status === 'PENDENTE',
      },
      {
        label: 'Produto Retirado',
        description: withdrawal?.status === 'CONFIRMADO' ? `Por ${withdrawal?.confirmedBy?.name || 'N/A'}` : 'Aguardando confirmação',
        completed: withdrawal?.status === 'CONFIRMADO',
        active: false,
      },
    ];

    if (withdrawal?.status === 'CANCELADO') {
      return [
        steps[0],
        {
          label: 'Solicitação Cancelada',
          description: `Cancelada por ${withdrawal?.canceledBy?.name || 'N/A'}`,
          completed: true,
          active: false,
        },
      ];
    }

    return steps;
  };

  const formatDate = (date: string | Date): string => {
    return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR });
  };

  if (loading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Carregando detalhes da solicitação...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <Button variant="outlined" onClick={onClose}>
          Fechar
        </Button>
      </Box>
    );
  }

  if (!withdrawal) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          Solicitação não encontrada
        </Alert>
        <Button variant="outlined" onClick={onClose}>
          Fechar
        </Button>
      </Box>
    );
  }

  const workflowSteps = getWorkflowSteps();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Solicitação de Retirada
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <WithdrawalStatusBadge status={withdrawal.status} size="medium" />
            <WithdrawalTypeBadge status={withdrawal.type} size="medium" />
          </Stack>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
      <Grid container spacing={3}>
        {/* Informações principais */}
        <Grid
          size={{
            xs: 12,
            md: 8
          }}>
          <Stack spacing={3}>
            {/* Produto */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <InventoryIcon color="primary" />
                  Produto
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                  <Avatar sx={{ bgcolor: 'primary.main' }}>
                    <InventoryIcon />
                  </Avatar>
                  <Box>
                    <Typography variant="h6">
                      {withdrawal.productId?.name || 'Produto não encontrado'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Lote: {withdrawal.productId?.lot || 'N/A'}
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Tipo de Semente:
                    </Typography>
                    <Typography variant="body1">
                      {withdrawal.productId?.seedTypeId?.name || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Armazenamento:
                    </Typography>
                    <Typography variant="body1">
                      {withdrawal.productId?.storageType || 'N/A'}
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Quantidade Total:
                    </Typography>
                    <Typography variant="body1">
                      {withdrawal.productId?.quantity || 0} unidades
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Peso Total:
                    </Typography>
                    <Typography variant="body1">
                      {withdrawal.productId?.totalWeight || 0} kg
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Localização */}
            {withdrawal.productId?.locationId && (
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <LocationIcon color="primary" />
                    Localização Atual
                  </Typography>
                  <Divider sx={{ mb: 2 }} />
                  
                  <Grid container spacing={2}>
                    <Grid size={6}>
                      <Typography variant="body2" color="text.secondary">
                        Código:
                      </Typography>
                      <Typography variant="body1">
                        {withdrawal.productId.locationId.code}
                      </Typography>
                    </Grid>
                    <Grid size={6}>
                      <Typography variant="body2" color="text.secondary">
                        Câmara:
                      </Typography>
                      <Typography variant="body1">
                        {withdrawal.productId.locationId.chamberId?.name || 'N/A'}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            )}

            {/* Detalhes da solicitação */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <RequestIcon color="primary" />
                  Detalhes da Solicitação
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Quantidade Solicitada:
                    </Typography>
                    <Typography variant="body1">
                      {withdrawal.quantityRequested || withdrawal.productId?.quantity || 0} unidades
                    </Typography>
                  </Grid>
                  <Grid size={6}>
                    <Typography variant="body2" color="text.secondary">
                      Peso Estimado:
                    </Typography>
                    <Typography variant="body1">
                      {withdrawal.type === 'TOTAL' 
                        ? (withdrawal.productId?.totalWeight || 0)
                        : ((withdrawal.quantityRequested || 0) * (withdrawal.productId?.weightPerUnit || 0))
                      } kg
                    </Typography>
                  </Grid>
                </Grid>

                {withdrawal.reason && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Motivo:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {withdrawal.reason}
                    </Typography>
                  </Box>
                )}

                {withdrawal.notes && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      Observações:
                    </Typography>
                    <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                      {withdrawal.notes}
                    </Typography>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Stack>
        </Grid>

        {/* Sidebar */}
        <Grid
          size={{
            xs: 12,
            md: 4
          }}>
          <Stack spacing={3}>
            {/* Ações */}
            <Card sx={{ backgroundColor: 'primary.50', borderColor: 'primary.200', borderWidth: 1, borderStyle: 'solid' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Ações Disponíveis
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Stack spacing={2}>
                  {/* Confirmar retirada - OPERATOR para status PENDING */}
                  {canConfirmWithdrawal && withdrawal.status === 'PENDENTE' && (
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<ConfirmIcon />}
                      onClick={() => setConfirmDialog(true)}
                      fullWidth
                    >
                      Confirmar Retirada
                    </Button>
                  )}

                  {/* Editar - ADMIN para status PENDING */}
                  {isAdmin && withdrawal.status === 'PENDENTE' && onEdit && (
                    <Button
                      variant="outlined"
                      startIcon={<EditIcon />}
                      onClick={() => onEdit(withdrawal)}
                      fullWidth
                    >
                      Editar Solicitação
                    </Button>
                  )}

                  {/* Cancelar - ADMIN para status PENDING */}
                  {isAdmin && withdrawal.status === 'PENDENTE' && (
                    <Button
                      variant="outlined"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => setCancelDialog(true)}
                      fullWidth
                    >
                      Cancelar Solicitação
                    </Button>
                  )}
                </Stack>
              </CardContent>
            </Card>

            {/* Workflow */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TimelineIcon color="primary" />
                  Progresso
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Stepper orientation="vertical">
                  {workflowSteps.map((step, index) => (
                    <Step key={index} active={step.active} completed={step.completed}>
                      <StepLabel>
                        <Typography variant="body2" fontWeight={step.active ? 'bold' : 'normal'}>
                          {step.label}
                        </Typography>
                      </StepLabel>
                      <StepContent>
                        <Typography variant="caption" color="text.secondary">
                          {step.description}
                        </Typography>
                      </StepContent>
                    </Step>
                  ))}
                </Stepper>
              </CardContent>
            </Card>

            {/* Informações do sistema */}
            <Card sx={{ backgroundColor: 'grey.50' }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Informações do Sistema
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Stack spacing={1}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Solicitada por:
                    </Typography>
                    <Typography variant="body2">
                      {withdrawal.requestedBy?.name || 'N/A'}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Data da solicitação:
                    </Typography>
                    <Typography variant="body2">
                      {formatDate(withdrawal.createdAt)}
                    </Typography>
                  </Box>
                  
                  {withdrawal.confirmedBy && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Confirmada por:
                      </Typography>
                      <Typography variant="body2">
                        {withdrawal.confirmedBy?.name || 'N/A'}
                      </Typography>
                    </Box>
                  )}
                  
                  {withdrawal.confirmedAt && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Data da confirmação:
                      </Typography>
                      <Typography variant="body2">
                        {formatDate(withdrawal.confirmedAt)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
          </Stack>
        </Grid>
      </Grid>
      {/* Dialog de confirmação */}
      <Dialog open={confirmDialog} onClose={() => setConfirmDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Confirmar Retirada</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Você está confirmando a retirada do produto <strong>{withdrawal.productId?.name}</strong>.
          </Typography>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Esta ação irá atualizar o status do produto para "RETIRADO" e não poderá ser desfeita.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Observações (opcional)"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={confirmNotes}
            onChange={(e) => setConfirmNotes(e.target.value)}
            placeholder="Adicione observações sobre a retirada..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog(false)} disabled={actionLoading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            variant="contained" 
            color="success"
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <ConfirmIcon />}
          >
            Confirmar Retirada
          </Button>
        </DialogActions>
      </Dialog>
      {/* Dialog de cancelamento */}
      <Dialog open={cancelDialog} onClose={() => setCancelDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Cancelar Solicitação</DialogTitle>
        <DialogContent>
          <Typography variant="body1" gutterBottom>
            Você está cancelando a solicitação de retirada do produto <strong>{withdrawal.productId?.name}</strong>.
          </Typography>
          
          <TextField
            autoFocus
            margin="dense"
            label="Motivo do cancelamento"
            fullWidth
            multiline
            rows={3}
            variant="outlined"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            placeholder="Informe o motivo do cancelamento..."
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelDialog(false)} disabled={actionLoading}>
            Voltar
          </Button>
          <Button 
            onClick={handleCancel} 
            variant="contained" 
            color="error"
            disabled={actionLoading || !cancelReason.trim()}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <CancelIcon />}
          >
            Cancelar Solicitação
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};