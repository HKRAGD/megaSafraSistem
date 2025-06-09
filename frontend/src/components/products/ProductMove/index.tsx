import React, { useState, useEffect, useMemo } from 'react';
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
  Chip,
  Grid,
  Paper,
  Autocomplete,
  Tabs,
  Tab,
} from '@mui/material';
import {
  SwapHoriz as MoveIcon,
  LocationOn as LocationIcon,
  ExitToApp as ExitIcon,
  Add as AddIcon,
  CallSplit as PartialIcon,
  ViewInAr as ViewInArIcon,
  List as ListIcon,
} from '@mui/icons-material';
import { ProductWithRelations, Chamber, LocationWithChamber } from '../../../types';
import { useLocationsWithChambers } from '../../../hooks/useLocationsWithChambers';
import { useAllLocationsWithChambers } from '../../../hooks/useAllLocationsWithChambers';
import { useChambers } from '../../../hooks/useChambers';
import LocationMap3D from '../../ui/LocationMap';

interface ProductMoveProps {
  product: ProductWithRelations;
  onMove: (newLocationId: string, reason: string) => Promise<void>;
  onPartialMove: (quantity: number, newLocationId: string, reason: string) => Promise<void>;
  onPartialExit: (quantity: number, reason: string) => Promise<void>;
  onAddStock: (quantity: number, reason: string) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

type OperationType = 'move_all' | 'move_partial' | 'exit_partial' | 'add_stock';

export const ProductMove: React.FC<ProductMoveProps> = ({
  product,
  onMove,
  onPartialMove,
  onPartialExit,
  onAddStock,
  onCancel,
  loading = false,
}) => {
  const [operationType, setOperationType] = useState<OperationType>('move_all');
  const [selectedLocationId, setSelectedLocationId] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<LocationWithChamber | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [reason, setReason] = useState<string>('');
  const [operationLoading, setOperationLoading] = useState(false);
  const [locationViewMode, setLocationViewMode] = useState<'map' | 'list'>('map');
  
  const { 
    availableLocationsWithChambers,
    loading: locationsLoading,
    error: locationsError,
    refreshData: refreshLocations
  } = useLocationsWithChambers({
    autoFetch: true,
    initialFilters: {}
  });

  // Hook para buscar dados das câmaras necessários para o mapa 3D
  const { data: chambers, loading: chambersLoading } = useChambers();

  // Hook para buscar TODAS as localizações (ocupadas + disponíveis) para o mapa 3D
  const { 
    allLocationsWithChambers,
    loading: allLocationsLoading,
    error: allLocationsError
  } = useAllLocationsWithChambers({
    autoFetch: true,
    initialFilters: {}
  });

  // Opções de operação
  const operationOptions = [
    {
      value: 'move_all' as OperationType,
      label: 'Mover Tudo',
      description: 'Move todo o estoque para nova localização',
      icon: <MoveIcon />,
      color: 'primary',
      requiresLocation: true,
      requiresQuantity: false
    },
    {
      value: 'move_partial' as OperationType,
      label: 'Mover Parcial',
      description: 'Move quantidade específica para nova localização',
      icon: <PartialIcon />,
      color: 'secondary',
      requiresLocation: true,
      requiresQuantity: true
    },
    {
      value: 'exit_partial' as OperationType,
      label: 'Saída',
      description: 'Remove quantidade do estoque (saída do sistema)',
      icon: <ExitIcon />,
      color: 'warning',
      requiresLocation: false,
      requiresQuantity: true
    },
    {
      value: 'add_stock' as OperationType,
      label: 'Adicionar Estoque',
      description: 'Adiciona quantidade ao produto atual',
      icon: <AddIcon />,
      color: 'success',
      requiresLocation: false,
      requiresQuantity: true
    }
  ];

  const currentOperation = operationOptions.find(op => op.value === operationType);

  // Reset campos quando muda tipo de operação
  useEffect(() => {
    setSelectedLocationId('');
    setSelectedLocation(null);
    setQuantity(1);
    setReason('');
  }, [operationType]);

  // Validações
  const isValidQuantity = useMemo(() => {
    if (!currentOperation?.requiresQuantity) return true;
    
    if (operationType === 'move_partial' || operationType === 'exit_partial') {
      return quantity > 0 && quantity < product.quantity;
    }
    
    if (operationType === 'add_stock') {
      return quantity > 0;
    }
    
    return true;
  }, [operationType, quantity, product.quantity, currentOperation]);

  const canExecute = useMemo(() => {
    if (operationLoading || loading) return false;
    
    // Motivo sempre obrigatório
    if (!reason.trim()) return false;
    
    // Localização obrigatória para operações que movem
    if (currentOperation?.requiresLocation && !selectedLocation) return false;
    
    // Quantidade válida para operações parciais
    if (currentOperation?.requiresQuantity && !isValidQuantity) return false;
    
    return true;
  }, [operationLoading, loading, reason, selectedLocation, isValidQuantity, currentOperation]);

  const handleExecute = async () => {
    if (!canExecute) return;

    try {
      setOperationLoading(true);
      
      switch (operationType) {
        case 'move_all':
          await onMove(selectedLocation?.id || '', reason.trim());
          break;
          
        case 'move_partial':
          await onPartialMove(quantity, selectedLocation?.id || '', reason.trim());
          break;
          
        case 'exit_partial':
          await onPartialExit(quantity, reason.trim());
          break;
          
        case 'add_stock':
          await onAddStock(quantity, reason.trim());
          break;
      }
    } catch (error) {
      console.error('Erro na operação:', error);
    } finally {
      setOperationLoading(false);
    }
  };

  // Função para selecionar localização (tanto do mapa 3D quanto da lista)
  const handleLocationSelect = (location: LocationWithChamber | null) => {
    setSelectedLocation(location);
    setSelectedLocationId(location?.id || '');
  };

  if (locationsLoading) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography variant="body2" sx={{ mt: 2 }}>
          Carregando localizações disponíveis...
        </Typography>
      </Box>
    );
  }

  if (locationsError) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Erro ao carregar localizações: {locationsError}
        </Alert>
        <Button variant="outlined" onClick={refreshLocations}>
          Tentar Novamente
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 800, margin: '0 auto' }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <MoveIcon color="primary" />
          Operações de Produto
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Selecione o tipo de operação desejada para o produto
        </Typography>
      </Box>

      {/* Informações do Produto */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            {product.name}
          </Typography>
          <Divider sx={{ my: 2 }} />
          
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 3 }}>
            <Box sx={{ flex: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                <LocationIcon fontSize="small" color="action" />
                <Typography variant="body2">
                  <strong>Localização Atual:</strong> {product.location?.code || 'N/A'}
                </Typography>
              </Box>
              
              <Typography variant="body2">
                <strong>Câmara Atual:</strong> {product.location?.chamber?.name || 'N/A'}
              </Typography>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <Typography variant="body2">
                <strong>Quantidade:</strong> {product.quantity} {product.storageType}s
              </Typography>
              
              <Typography variant="body2">
                <strong>Peso Total:</strong> {product.totalWeight || product.calculatedTotalWeight}kg
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Seleção do Tipo de Operação */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Tipo de Operação
        </Typography>
        
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          {operationOptions.map((option) => (
            <Card 
              key={option.value}
              sx={{ 
                cursor: 'pointer',
                border: operationType === option.value ? 2 : 1,
                borderColor: operationType === option.value ? `${option.color}.main` : 'divider',
                '&:hover': { borderColor: `${option.color}.main` }
              }}
              onClick={() => setOperationType(option.value)}
            >
              <CardContent sx={{ p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  {option.icon}
                  <Typography variant="subtitle2">
                    {option.label}
                  </Typography>
                  {operationType === option.value && (
                    <Chip size="small" label="Selecionado" color={option.color as any} />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {option.description}
                </Typography>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Paper>

      {/* Configurações da Operação */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Configurações
        </Typography>
        
        <Stack spacing={3}>
          {/* Campo de Quantidade (para operações que requerem) */}
          {currentOperation?.requiresQuantity && (
            <TextField
              label="Quantidade"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              inputProps={{ 
                min: 1, 
                max: operationType === 'add_stock' ? undefined : product.quantity - 1 
              }}
              error={!isValidQuantity}
              helperText={
                !isValidQuantity
                  ? operationType === 'add_stock'
                    ? 'Quantidade deve ser maior que zero'
                    : `Quantidade deve ser entre 1 e ${product.quantity - 1}`
                  : operationType === 'add_stock'
                    ? 'Quantidade a ser adicionada ao estoque atual'
                    : `Disponível: ${product.quantity} ${product.storageType}s`
              }
              fullWidth
              disabled={operationLoading || loading}
            />
          )}

          {/* Seleção de Localização (para operações que movem) */}
          {currentOperation?.requiresLocation && (
            <Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="medium">
                  Seleção de Localização
                </Typography>
                
                {/* Toggle entre Mapa 3D e Lista */}
                <Tabs
                  value={locationViewMode}
                  onChange={(_, newValue) => setLocationViewMode(newValue)}
                  sx={{ minHeight: 'auto' }}
                >
                  <Tab
                    icon={<ViewInArIcon />}
                    label="Mapa 3D"
                    value="map"
                    sx={{ minHeight: 40, py: 1 }}
                  />
                  <Tab
                    icon={<ListIcon />}
                    label="Lista"
                    value="list"
                    sx={{ minHeight: 40, py: 1 }}
                  />
                </Tabs>
              </Box>

              {/* Mapa 3D ou Lista dependendo do modo selecionado */}
              {locationViewMode === 'map' ? (
                <Box sx={{ mb: 2 }}>
                  {!chambersLoading && !allLocationsLoading && chambers && chambers.length > 0 ? (
                    <LocationMap3D
                      chambers={chambers}
                      availableLocations={availableLocationsWithChambers}
                      allLocations={allLocationsWithChambers}
                      selectedLocation={selectedLocation}
                      onLocationSelect={handleLocationSelect}
                    />
                  ) : (
                    <Alert severity="info">
                      <Typography variant="subtitle2">
                        {(chambersLoading || allLocationsLoading) ? 'Carregando Dados' : 'Dados Indisponíveis'}
                      </Typography>
                      <Typography variant="body2">
                        {(chambersLoading || allLocationsLoading)
                          ? 'Por favor, aguarde enquanto carregamos as informações das câmaras e localizações...'
                          : allLocationsError || 'Não há câmaras configuradas no sistema.'
                        }
                      </Typography>
                    </Alert>
                  )}
                </Box>
              ) : (
                <Autocomplete
                  value={selectedLocation}
                  onChange={(event, newValue) => handleLocationSelect(newValue)}
                  options={availableLocationsWithChambers}
                  getOptionLabel={(option) => `${option.code} - ${option.chamber?.name || 'N/A'}`}
                  renderOption={(props, option) => (
                    <li {...props}>
                      <Box>
                        <Typography variant="body2">
                          {option.code} - {option.chamber?.name || 'N/A'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Capacidade: {option.currentWeightKg || 0}kg / {option.maxCapacityKg}kg
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label="Nova Localização"
                      placeholder="Selecione uma localização disponível"
                      required
                    />
                  )}
                  disabled={operationLoading || loading}
                  sx={{ mb: 2 }}
                />
              )}
            </Box>
          )}

          {/* Motivo da Operação */}
          <TextField
            label="Motivo da Operação"
            multiline
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={`Descreva o motivo da ${currentOperation?.label.toLowerCase()} (obrigatório)`}
            required
            disabled={operationLoading || loading}
            fullWidth
          />

          {/* Alertas e Validações */}
          {selectedLocation && currentOperation?.requiresLocation && (
            <Alert severity="info">
              <Typography variant="body2">
                <strong>Verificação de Capacidade</strong><br />
                {(() => {
                  if (!selectedLocation) return 'Localização não encontrada';
                  
                  const currentWeight = selectedLocation.currentWeightKg || 0;
                  const productWeight = operationType === 'move_all' 
                    ? (product.totalWeight || product.calculatedTotalWeight || 0)
                    : (quantity * product.weightPerUnit);
                  const newTotalWeight = currentWeight + productWeight;
                  const maxCapacity = selectedLocation.maxCapacityKg;
                  
                  if (newTotalWeight > maxCapacity) {
                    return `⚠️ ATENÇÃO: O peso total (${newTotalWeight}kg) excederá a capacidade máxima (${maxCapacity}kg)`;
                  } else {
                    return `✅ Capacidade OK: ${newTotalWeight}kg / ${maxCapacity}kg`;
                  }
                })()}
              </Typography>
            </Alert>
          )}
        </Stack>
      </Paper>

      {/* Botões de Ação */}
      <Stack direction="row" spacing={2} justifyContent="flex-end">
        <Button
          variant="outlined"
          onClick={onCancel}
          disabled={operationLoading}
        >
          Cancelar
        </Button>
        
        <Button
          variant="contained"
          color={currentOperation?.color as any || 'primary'}
          onClick={handleExecute}
          disabled={!canExecute}
          startIcon={
            operationLoading ? (
              <CircularProgress size={20} />
            ) : (
              currentOperation?.icon
            )
          }
        >
          {operationLoading ? 'Processando...' : currentOperation?.label}
        </Button>
      </Stack>
    </Box>
  );
};

export default ProductMove; 