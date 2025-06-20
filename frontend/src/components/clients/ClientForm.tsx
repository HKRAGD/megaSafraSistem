import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Typography,
  Box,
  Alert,
} from '@mui/material';
import { 
  Client, 
  CreateClientFormData, 
  UpdateClientFormData 
} from '../../types';
import { clientService } from '../../services/clientService';

interface ClientFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateClientFormData | UpdateClientFormData) => Promise<void>;
  client?: Client | null;
  title?: string;
}

export const ClientForm: React.FC<ClientFormProps> = ({
  open,
  onClose,
  onSubmit,
  client,
  title
}) => {
  const [formData, setFormData] = useState<CreateClientFormData>({
    name: '',
    document: '',
    documentType: 'CPF',
    email: '',
    phone: '',
    address: {
      street: '',
      number: '',
      complement: '',
      neighborhood: '',
      city: '',
      state: '',
      zipCode: '',
    },
    notes: '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Resetar form quando abrir/fechar ou trocar client
  useEffect(() => {
    if (open) {
      if (client) {
        // Editando cliente existente
        setFormData({
          name: client.name || '',
          document: client.document || '',
          documentType: client.documentType || 'CPF',
          email: client.email || '',
          phone: client.phone || '',
          address: {
            street: client.address?.street || '',
            number: client.address?.number || '',
            complement: client.address?.complement || '',
            neighborhood: client.address?.neighborhood || '',
            city: client.address?.city || '',
            state: client.address?.state || '',
            zipCode: client.address?.zipCode || '',
          },
          notes: client.notes || '',
        });
      } else {
        // Criando novo cliente
        setFormData({
          name: '',
          document: '',
          documentType: 'CPF',
          email: '',
          phone: '',
          address: {
            street: '',
            number: '',
            complement: '',
            neighborhood: '',
            city: '',
            state: '',
            zipCode: '',
          },
          notes: '',
        });
      }
      setErrors({});
    }
  }, [open, client]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Validações obrigatórias
    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (!formData.document.trim()) {
      newErrors.document = 'Documento é obrigatório';
    } else {
      // Validar formato do documento
      if (!clientService.validateDocument(formData.document, formData.documentType)) {
        if (formData.documentType === 'CPF') {
          newErrors.document = 'CPF deve ter 11 dígitos';
        } else {
          newErrors.document = 'CNPJ deve ter 14 dígitos';
        }
      }
    }

    // Validar email se fornecido
    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email)) {
        newErrors.email = 'Email inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error('Erro ao salvar cliente:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      setFormData(prev => ({
        ...prev,
        address: {
          ...prev.address,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const handleDocumentChange = (value: string) => {
    // Permitir apenas números
    const cleanValue = value.replace(/\D/g, '');
    handleInputChange('document', cleanValue);
  };

  const getFormattedDocument = () => {
    return clientService.formatDocument(formData.document, formData.documentType);
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        {title || (client ? 'Editar Cliente' : 'Novo Cliente')}
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ py: 2 }}>
          <Grid container spacing={3}>
            {/* Informações Básicas */}
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Informações Básicas
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Nome *"
                fullWidth
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                error={!!errors.name}
                helperText={errors.name}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Documento *</InputLabel>
                <Select
                  value={formData.documentType}
                  onChange={(e) => handleInputChange('documentType', e.target.value)}
                  label="Tipo de Documento *"
                  disabled={loading}
                >
                  <MenuItem value="CPF">CPF</MenuItem>
                  <MenuItem value="CNPJ">CNPJ</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <TextField
                label={`${formData.documentType} *`}
                fullWidth
                value={getFormattedDocument()}
                onChange={(e) => handleDocumentChange(e.target.value)}
                error={!!errors.document}
                helperText={errors.document}
                disabled={loading}
                placeholder={formData.documentType === 'CPF' ? '000.000.000-00' : '00.000.000/0000-00'}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Email"
                type="email"
                fullWidth
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                error={!!errors.email}
                helperText={errors.email}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Telefone"
                fullWidth
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={loading}
              />
            </Grid>

            {/* Endereço */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Endereço
              </Typography>
            </Grid>

            <Grid item xs={12} md={8}>
              <TextField
                label="Rua/Avenida"
                fullWidth
                value={formData.address?.street}
                onChange={(e) => handleInputChange('address.street', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Número"
                fullWidth
                value={formData.address?.number}
                onChange={(e) => handleInputChange('address.number', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Complemento"
                fullWidth
                value={formData.address?.complement}
                onChange={(e) => handleInputChange('address.complement', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                label="Bairro"
                fullWidth
                value={formData.address?.neighborhood}
                onChange={(e) => handleInputChange('address.neighborhood', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Cidade"
                fullWidth
                value={formData.address?.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="Estado"
                fullWidth
                value={formData.address?.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                disabled={loading}
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                label="CEP"
                fullWidth
                value={formData.address?.zipCode}
                onChange={(e) => handleInputChange('address.zipCode', e.target.value)}
                disabled={loading}
              />
            </Grid>

            {/* Observações */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <TextField
                label="Observações"
                fullWidth
                multiline
                rows={3}
                value={formData.notes}
                onChange={(e) => handleInputChange('notes', e.target.value)}
                disabled={loading}
              />
            </Grid>
          </Grid>

          {Object.keys(errors).length > 0 && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Por favor, corrija os campos obrigatórios antes de continuar.
            </Alert>
          )}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={loading}
        >
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ClientForm;