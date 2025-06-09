import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Alert,
  CircularProgress,
  Button,
  Stack,
  TextField,
  Card,
  CardContent,
  Divider,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
} from '@mui/icons-material';
import { ProductWithRelations } from '../../../types';

interface ProductEditProps {
  product: ProductWithRelations;
  onSave: (updatedData: {
    name: string;
    quantity: number;
    weightPerUnit: number;
    notes?: string;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

export const ProductEdit: React.FC<ProductEditProps> = ({
  product,
  onSave,
  onCancel,
  loading = false,
}) => {
  const [formData, setFormData] = useState({
    name: product.name || '',
    quantity: product.quantity || 0,
    weightPerUnit: product.weightPerUnit || 0,
    notes: product.notes || '',
  });
  
  const [saveLoading, setSaveLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Limpar erro do campo quando o usuário editar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nome é obrigatório';
    } else if (formData.name.length < 2) {
      newErrors.name = 'Nome deve ter pelo menos 2 caracteres';
    }

    if (formData.quantity <= 0) {
      newErrors.quantity = 'Quantidade deve ser maior que zero';
    }

    if (formData.weightPerUnit <= 0) {
      newErrors.weightPerUnit = 'Peso por unidade deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaveLoading(true);
      await onSave(formData);
    } catch (error) {
      console.error('Erro ao salvar produto:', error);
    } finally {
      setSaveLoading(false);
    }
  };

  const hasChanges = () => {
    return (
      formData.name !== product.name ||
      formData.quantity !== product.quantity ||
      formData.weightPerUnit !== product.weightPerUnit ||
      formData.notes !== (product.notes || '')
    );
  };

  const calculatedTotalWeight = formData.quantity * formData.weightPerUnit;

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <EditIcon color="primary" />
          Editar Produto
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Edite as informações do produto. Alguns campos não podem ser alterados por questões de segurança.
        </Typography>
      </Box>

      {/* Informações Não Editáveis */}
      <Card sx={{ mb: 3, bgcolor: 'grey.50' }}>
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            Informações Fixas
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          <Stack spacing={1}>
            <Typography variant="body2">
              <strong>Lote:</strong> {product.lot}
            </Typography>
            <Typography variant="body2">
              <strong>Tipo de Semente:</strong> {product.seedType?.name || 'N/A'}
            </Typography>
            <Typography variant="body2">
              <strong>Tipo de Armazenamento:</strong> {product.storageType}
            </Typography>
            <Typography variant="body2">
              <strong>Localização:</strong> {product.location?.code || 'N/A'} - {product.location?.chamber?.name || 'N/A'}
            </Typography>
          </Stack>
        </CardContent>
      </Card>

      {/* Formulário de Edição */}
      <Stack spacing={3}>
        {/* Nome do Produto */}
        <TextField
          label="Nome do Produto"
          value={formData.name}
          onChange={(e) => handleInputChange('name', e.target.value)}
          error={!!errors.name}
          helperText={errors.name}
          required
          disabled={saveLoading || loading}
          fullWidth
        />

        {/* Quantidade */}
        <TextField
          label="Quantidade"
          type="number"
          value={formData.quantity}
          onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
          error={!!errors.quantity}
          helperText={errors.quantity}
          required
          disabled={saveLoading || loading}
          inputProps={{ min: 1 }}
          fullWidth
        />

        {/* Peso por Unidade */}
        <TextField
          label="Peso por Unidade (kg)"
          type="number"
          value={formData.weightPerUnit}
          onChange={(e) => handleInputChange('weightPerUnit', parseFloat(e.target.value) || 0)}
          error={!!errors.weightPerUnit}
          helperText={errors.weightPerUnit}
          required
          disabled={saveLoading || loading}
          inputProps={{ min: 0.001, step: 0.1 }}
          fullWidth
        />

        {/* Peso Total Calculado */}
        <Alert severity="info">
          <Typography variant="body2">
            <strong>Peso Total Calculado:</strong> {calculatedTotalWeight.toFixed(2)}kg
            {calculatedTotalWeight !== (product.totalWeight || 0) && (
              <span style={{ color: 'orange' }}>
                {' '}(era {product.totalWeight || 0}kg)
              </span>
            )}
          </Typography>
        </Alert>

        {/* Observações */}
        <TextField
          label="Observações"
          multiline
          rows={4}
          value={formData.notes}
          onChange={(e) => handleInputChange('notes', e.target.value)}
          disabled={saveLoading || loading}
          placeholder="Adicione observações sobre o produto..."
          fullWidth
        />

        {/* Aviso sobre Limitações */}
        <Alert severity="warning">
          <Typography variant="body2">
            <strong>Limitações de Edição:</strong><br />
            • Lote, tipo de semente e localização não podem ser alterados<br />
            • Para mudar a localização, use a função "Mover Produto"<br />
            • Para alterar o tipo, será necessário criar um novo produto
          </Typography>
        </Alert>

        {/* Botões de Ação */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button
            variant="outlined"
            onClick={onCancel}
            disabled={saveLoading || loading}
          >
            Cancelar
          </Button>
          
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!hasChanges() || saveLoading || loading}
            startIcon={saveLoading ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saveLoading ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Stack>
      </Stack>
    </Box>
  );
};

export default ProductEdit; 