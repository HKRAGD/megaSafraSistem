import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  IconButton,
  TextField,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  LinearProgress,
  Alert,
} from '@mui/material';
import {
  Edit as EditIcon,
  Save as SaveIcon,
  Cancel as CancelIcon,
  Close as CloseIcon,
  Inventory as PackageIcon,
  Scale as WeightIcon,
  Room as LocationIcon,
  Info as InfoIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import { Location, Chamber } from '../../types';
import { useProducts } from '../../hooks/useProducts';
import { numeroParaLetra } from '../../utils/locationUtils';

interface LocationDetailsProps {
  location: Location;
  chamber?: Chamber | null;
  onUpdate?: (locationId: string, data: any) => void;
  onClose: () => void;
}

export const LocationDetails: React.FC<LocationDetailsProps> = ({
  location,
  chamber,
  onUpdate,
  onClose,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editedCapacity, setEditedCapacity] = useState(location.maxCapacityKg);
  const [showProductsDialog, setShowProductsDialog] = useState(false);

  // Hook para buscar produtos nesta localização
  const { data: products, loading: productsLoading, fetchProducts } = useProducts();
  
  // Buscar produtos desta localização quando o componente montar
  useEffect(() => {
    fetchProducts({ locationId: location.id });
  }, [location.id, fetchProducts]);

  const occupancyRate = location.maxCapacityKg > 0 
    ? (location.currentWeightKg / location.maxCapacityKg) * 100 
    : 0;

  const getOccupancyColor = () => {
    if (occupancyRate >= 95) return 'error';
    if (occupancyRate >= 80) return 'warning';
    return 'success';
  };

  const getOccupancyStatus = () => {
    if (occupancyRate >= 95) return 'Crítica';
    if (occupancyRate >= 80) return 'Alta';
    if (occupancyRate >= 50) return 'Média';
    return 'Baixa';
  };

  const handleSaveCapacity = async () => {
    if (onUpdate) {
      try {
        await onUpdate(location.id, { maxCapacityKg: editedCapacity });
        setIsEditing(false);
      } catch (error) {
        console.error('Erro ao atualizar capacidade:', error);
      }
    }
  };

  const handleCancelEdit = () => {
    setEditedCapacity(location.maxCapacityKg);
    setIsEditing(false);
  };

  return (
    <>
      <Card>
        <CardContent>
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
            <Box>
              <Typography variant="h5" gutterBottom>
                {location.code}
              </Typography>
              <Chip
                icon={location.isOccupied ? <PackageIcon /> : <CheckIcon />}
                label={location.isOccupied ? 'Ocupada' : 'Disponível'}
                color={location.isOccupied ? 'error' : 'success'}
                sx={{ mb: 1 }}
              />
            </Box>
            <Box>
              <IconButton onClick={onClose} size="small">
                <CloseIcon />
              </IconButton>
            </Box>
          </Box>

          {/* Informações da Câmara */}
          {chamber && (
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" gutterBottom>
                Câmara
              </Typography>
              <Typography variant="body1" color="text.secondary">
                {chamber.name}
              </Typography>
              {chamber.description && (
                <Typography variant="body2" color="text.secondary">
                  {chamber.description}
                </Typography>
              )}
            </Box>
          )}

          <Divider sx={{ my: 2 }} />

          {/* Coordenadas */}
          <Box sx={{ mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Coordenadas
            </Typography>
            <Grid container spacing={2}>
              <Grid
                size={{
                  xs: 6,
                  sm: 3
                }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {location.coordinates.quadra}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Quadra
                  </Typography>
                </Box>
              </Grid>
              <Grid
                size={{
                  xs: 6,
                  sm: 3
                }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {typeof location.coordinates.lado === 'number' ? numeroParaLetra(location.coordinates.lado) : location.coordinates.lado}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Lado
                  </Typography>
                </Box>
              </Grid>
              <Grid
                size={{
                  xs: 6,
                  sm: 3
                }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {location.coordinates.fila}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Fila
                  </Typography>
                </Box>
              </Grid>
              <Grid
                size={{
                  xs: 6,
                  sm: 3
                }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary.main">
                    {location.coordinates.andar}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Andar
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Capacidade */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Capacidade de Armazenamento
              </Typography>
              {onUpdate && !isEditing && (
                <IconButton
                  size="small"
                  onClick={() => setIsEditing(true)}
                >
                  <EditIcon />
                </IconButton>
              )}
            </Box>

            {isEditing ? (
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
                <TextField
                  label="Capacidade Máxima (kg)"
                  type="number"
                  value={editedCapacity}
                  onChange={(e) => setEditedCapacity(Number(e.target.value))}
                  size="small"
                  inputProps={{ min: 1, max: 10000 }}
                />
                <IconButton
                  color="primary"
                  onClick={handleSaveCapacity}
                  size="small"
                >
                  <SaveIcon />
                </IconButton>
                <IconButton
                  color="default"
                  onClick={handleCancelEdit}
                  size="small"
                >
                  <CancelIcon />
                </IconButton>
              </Box>
            ) : (
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2}>
                  <Grid size={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="success.main">
                        {location.maxCapacityKg}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Máxima (kg)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="warning.main">
                        {location.currentWeightKg}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Atual (kg)
                      </Typography>
                    </Box>
                  </Grid>
                  <Grid size={4}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h5" color="info.main">
                        {location.maxCapacityKg - location.currentWeightKg}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Disponível (kg)
                      </Typography>
                    </Box>
                  </Grid>
                </Grid>
              </Box>
            )}

            {/* Barra de ocupação */}
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" color="text.secondary">
                  Taxa de Ocupação
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="bold">
                    {occupancyRate.toFixed(1)}%
                  </Typography>
                  <Chip
                    size="small"
                    label={getOccupancyStatus()}
                    color={getOccupancyColor() as any}
                  />
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={occupancyRate}
                color={getOccupancyColor() as any}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            {/* Alertas de capacidade */}
            {occupancyRate >= 95 && (
              <Alert severity="error" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Capacidade crítica! A localização está praticamente cheia.
                </Typography>
              </Alert>
            )}
            {occupancyRate >= 80 && occupancyRate < 95 && (
              <Alert severity="warning" sx={{ mb: 2 }}>
                <Typography variant="body2">
                  Atenção: A localização está com alta ocupação.
                </Typography>
              </Alert>
            )}
          </Box>

          <Divider sx={{ my: 2 }} />

          {/* Produtos armazenados */}
          <Box sx={{ mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6">
                Produtos Armazenados
              </Typography>
              {location.isOccupied && (
                <Button
                  size="small"
                  startIcon={<InfoIcon />}
                  onClick={() => setShowProductsDialog(true)}
                >
                  Ver Detalhes
                </Button>
              )}
            </Box>

            {location.isOccupied ? (
              <Typography variant="body2" color="text.secondary">
                Esta localização contém produtos. Clique em "Ver Detalhes" para mais informações.
              </Typography>
            ) : (
              <Box sx={{ textAlign: 'center', py: 3 }}>
                <LocationIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
                <Typography variant="body2" color="text.secondary">
                  Localização disponível para armazenamento
                </Typography>
              </Box>
            )}
          </Box>

          {/* Informações adicionais */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="h6" gutterBottom>
              Informações Adicionais
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  <InfoIcon color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Data de Criação"
                  secondary={new Date(location.createdAt).toLocaleDateString('pt-BR')}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  <EditIcon color="action" />
                </ListItemIcon>
                <ListItemText
                  primary="Última Atualização"
                  secondary={new Date(location.updatedAt).toLocaleDateString('pt-BR')}
                />
              </ListItem>
            </List>
          </Box>
        </CardContent>
      </Card>
      {/* Dialog de produtos */}
      <Dialog
        open={showProductsDialog}
        onClose={() => setShowProductsDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          Produtos em {location.code}
        </DialogTitle>
        <DialogContent>
          {productsLoading ? (
            <Box sx={{ textAlign: 'center', py: 3 }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                Carregando produtos...
              </Typography>
              <LinearProgress />
            </Box>
          ) : products && products.length > 0 ? (
            <List>
              {products.map((product) => (
                <ListItem key={product.id} divider>
                  <ListItemIcon>
                    <PackageIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={product.name}
                    secondary={
                      <Box>
                        <Typography variant="caption" display="block">
                          Lote: {product.lot}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Quantidade: {product.quantity} {product.storageType}
                        </Typography>
                        <Typography variant="caption" display="block">
                          Peso: {product.totalWeight}kg
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Nenhum produto encontrado nesta localização.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProductsDialog(false)}>
            Fechar
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}; 