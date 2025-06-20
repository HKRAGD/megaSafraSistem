import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Grid,
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  IconButton,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  LinearProgress,
  Alert,
  Tooltip,
} from '@mui/material';
import {
  Close as CloseIcon,
  LocationOn as LocationIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Search as SearchIcon,
  FilterList as FilterIcon,
  ViewModule as GridIcon,
  ViewList as ListIcon,
  Scale as WeightIcon,
} from '@mui/icons-material';
import { Location, Chamber, Product } from '../../types';
import { numeroParaLetra } from '../../utils/locationUtils';

interface ProductMoveLocationDialogProps {
  open: boolean;
  product: Product | null;
  locations: Location[];
  chambers: Chamber[];
  onClose: () => void;
  onConfirm: (locationId: string, reason?: string) => void;
  loading?: boolean;
}

interface LocationFilters {
  chamberId: string;
  minCapacity: number;
  maxCapacity: number;
  availableOnly: boolean;
  search: string;
}

/**
 * ProductMoveLocationDialog - Modal complexo para movimentação de produtos
 * 
 * FUNCIONALIDADES:
 * - Interface visual rica com cards e lista
 * - Filtros avançados por câmara, capacidade, disponibilidade
 * - Validação de capacidade em tempo real
 * - Visualização de coordenadas hierárquicas
 * - Seleção intuitiva com feedback visual
 * - Campos para justificativa da movimentação
 * 
 * USO: Específico para movimentação de produtos entre localizações
 */
export const ProductMoveLocationDialog: React.FC<ProductMoveLocationDialogProps> = ({
  open,
  product,
  locations,
  chambers,
  onClose,
  onConfirm,
  loading = false,
}) => {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [reason, setReason] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<LocationFilters>({
    chamberId: '',
    minCapacity: 0,
    maxCapacity: 0,
    availableOnly: true,
    search: '',
  });

  const [filteredLocations, setFilteredLocations] = useState<Location[]>([]);

  // Resetar estado quando modal abre/fecha
  useEffect(() => {
    if (open) {
      setSelectedLocation(null);
      setReason('');
      setFilters(prev => ({ ...prev, chamberId: '' }));
    }
  }, [open]);

  // Filtrar localizações
  useEffect(() => {
    let filtered = [...locations];

    // Filtrar por câmara
    if (filters.chamberId) {
      filtered = filtered.filter(loc => loc.chamberId === filters.chamberId);
    }

    // Filtrar apenas disponíveis
    if (filters.availableOnly) {
      filtered = filtered.filter(loc => !loc.isOccupied);
    }

    // Filtrar por capacidade
    if (product && filters.availableOnly) {
      filtered = filtered.filter(loc => {
        const availableCapacity = loc.maxCapacityKg - loc.currentWeightKg;
        return availableCapacity >= product.totalWeight;
      });
    }

    // Filtrar por busca
    if (filters.search) {
      filtered = filtered.filter(loc => 
        loc.code.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    setFilteredLocations(filtered);
  }, [locations, filters, product]);

  const handleFilterChange = (field: keyof LocationFilters, value: any) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const handleConfirm = () => {
    if (selectedLocation) {
      onConfirm(selectedLocation.id, reason.trim() || undefined);
    }
  };

  const getCapacityPercentage = (location: Location) => {
    if (!product) return 0;
    const newWeight = location.currentWeightKg + product.totalWeight;
    return (newWeight / location.maxCapacityKg) * 100;
  };

  const getCapacityColor = (percentage: number) => {
    if (percentage > 100) return 'error';
    if (percentage > 90) return 'warning';
    if (percentage > 70) return 'info';
    return 'success';
  };

  const getChamberName = (chamberId: string) => {
    return chambers.find(c => c.id === chamberId)?.name || 'Câmara desconhecida';
  };

  const LocationCard: React.FC<{ location: Location }> = ({ location }) => {
    const capacityPercentage = getCapacityPercentage(location);
    const isSelected = selectedLocation?.id === location.id;
    const canAccommodate = !product || (location.currentWeightKg + product.totalWeight) <= location.maxCapacityKg;

    return (
      <Card
        sx={{
          cursor: 'pointer',
          border: isSelected ? 2 : 1,
          borderColor: isSelected ? 'primary.main' : 'divider',
          '&:hover': {
            borderColor: 'primary.light',
            boxShadow: 2,
          },
          opacity: canAccommodate ? 1 : 0.6,
        }}
        onClick={() => canAccommodate && handleLocationSelect(location)}
      >
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
            <Typography variant="h6" component="div">
              {location.code}
            </Typography>
            {isSelected && <CheckCircleIcon color="primary" />}
            {!canAccommodate && (
              <Tooltip title="Capacidade insuficiente">
                <WarningIcon color="error" />
              </Tooltip>
            )}
          </Box>

          <Typography variant="body2" color="text.secondary" gutterBottom>
            {getChamberName(location.chamberId)}
          </Typography>

          <Typography variant="body2" gutterBottom>
                            Coordenadas: Q{location.coordinates.quadra}-L{typeof location.coordinates.lado === 'number' ? numeroParaLetra(location.coordinates.lado) : location.coordinates.lado}-F{location.coordinates.fila}-A{location.coordinates.andar}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Capacidade</Typography>
              <Typography variant="body2">
                {location.currentWeightKg}
                {product && ` + ${product.totalWeight}`}
                kg / {location.maxCapacityKg}kg
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(capacityPercentage, 100)}
              color={getCapacityColor(capacityPercentage)}
              sx={{ height: 8, borderRadius: 1 }}
            />
            <Typography variant="caption" color="text.secondary">
              {capacityPercentage.toFixed(1)}% da capacidade
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  };

  const LocationListItem: React.FC<{ location: Location }> = ({ location }) => {
    const capacityPercentage = getCapacityPercentage(location);
    const isSelected = selectedLocation?.id === location.id;
    const canAccommodate = !product || (location.currentWeightKg + product.totalWeight) <= location.maxCapacityKg;

    return (
      <ListItem disablePadding>
        <ListItemButton
          selected={isSelected}
          onClick={() => canAccommodate && handleLocationSelect(location)}
          disabled={!canAccommodate}
        >
          <ListItemIcon>
            <LocationIcon color={isSelected ? 'primary' : 'inherit'} />
          </ListItemIcon>
          <ListItemText
            primary={location.code}
            secondary={
              <Box>
                <Typography variant="body2" component="span">
                  {getChamberName(location.chamberId)} - 
                  Q{location.coordinates.quadra}-L{typeof location.coordinates.lado === 'number' ? numeroParaLetra(location.coordinates.lado) : location.coordinates.lado}-F{location.coordinates.fila}-A{location.coordinates.andar}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={Math.min(capacityPercentage, 100)}
                    color={getCapacityColor(capacityPercentage)}
                    sx={{ flexGrow: 1, height: 6, borderRadius: 1 }}
                  />
                  <Typography variant="caption">
                    {capacityPercentage.toFixed(1)}%
                  </Typography>
                </Box>
              </Box>
            }
          />
          {!canAccommodate && (
            <Tooltip title="Capacidade insuficiente">
              <WarningIcon color="error" />
            </Tooltip>
          )}
        </ListItemButton>
      </ListItem>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      PaperProps={{
        sx: { height: '80vh' }
      }}
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Mover Produto: {product?.name}
          </Typography>
          <IconButton onClick={onClose}>
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>
      <DialogContent>
        {product && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <WeightIcon />
              <Typography>
                Peso do produto: {product.totalWeight}kg ({product.quantity} × {product.weightPerUnit}kg)
              </Typography>
            </Box>
          </Alert>
        )}

        {/* Filtros */}
        <Box sx={{ mb: 3, p: 2, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FilterIcon /> Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <FormControl fullWidth size="small">
                <InputLabel>Câmara</InputLabel>
                <Select
                  value={filters.chamberId}
                  label="Câmara"
                  onChange={(e) => handleFilterChange('chamberId', e.target.value)}
                >
                  <MenuItem value="">Todas</MenuItem>
                  {chambers.map(chamber => (
                    <MenuItem key={chamber.id} value={chamber.id}>
                      {chamber.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <TextField
                fullWidth
                size="small"
                label="Buscar localização"
                value={filters.search}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: <SearchIcon color="action" sx={{ mr: 1 }} />
                }}
              />
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="body2">Apenas disponíveis:</Typography>
                <Button
                  size="small"
                  variant={filters.availableOnly ? 'contained' : 'outlined'}
                  onClick={() => handleFilterChange('availableOnly', !filters.availableOnly)}
                >
                  {filters.availableOnly ? 'Sim' : 'Não'}
                </Button>
              </Box>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 3
              }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <IconButton
                  color={viewMode === 'grid' ? 'primary' : 'default'}
                  onClick={() => setViewMode('grid')}
                >
                  <GridIcon />
                </IconButton>
                <IconButton
                  color={viewMode === 'list' ? 'primary' : 'default'}
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon />
                </IconButton>
              </Box>
            </Grid>
          </Grid>
        </Box>

        {/* Lista de localizações */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', maxHeight: '400px' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <LinearProgress sx={{ width: '100%' }} />
            </Box>
          ) : filteredLocations.length === 0 ? (
            <Alert severity="warning">
              Nenhuma localização encontrada com os filtros aplicados.
            </Alert>
          ) : viewMode === 'grid' ? (
            <Grid container spacing={2}>
              {filteredLocations.map(location => (
                <Grid
                  key={location.id}
                  size={{
                    xs: 12,
                    sm: 6,
                    md: 4
                  }}>
                  <LocationCard location={location} />
                </Grid>
              ))}
            </Grid>
          ) : (
            <List>
              {filteredLocations.map((location, index) => (
                <React.Fragment key={location.id}>
                  <LocationListItem location={location} />
                  {index < filteredLocations.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          )}
        </Box>

        {/* Campo de razão */}
        {selectedLocation && (
          <Box sx={{ mt: 3, p: 2, bgcolor: 'primary.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" gutterBottom>
              Localização selecionada: {selectedLocation.code}
            </Typography>
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Motivo da movimentação (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Reorganização de estoque, manutenção da câmara..."
            />
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          onClick={handleConfirm}
          disabled={!selectedLocation || loading}
        >
          {loading ? 'Movendo...' : 'Confirmar Movimentação'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}; 