import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Button,
  Grid,
  TextField,
  Alert,
  Typography,
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  Check as CheckIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { ProductWithRelations } from '../../../types';
import { LocationTreeNavigation } from '../../ui/LocationTreeNavigation';

interface ProductAllocationDialogProps {
  open: boolean;
  onClose: () => void;
  onAllocate: () => void;
  selectedProduct: ProductWithRelations | null;
  selectedLocationId: string;
  onLocationSelect: (locationId: string) => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  isAllocating: boolean;
  availableLocationsCount: number;
  locationsLoading: boolean;
}

/**
 * Dialog reutilizável para alocação de produtos usando sistema de navegação 3D/hierárquica.
 * 
 * Características:
 * - Integração com LocationTreeNavigation
 * - Suporte a observações personalizadas
 * - Estados de loading e validação
 * - Feedback visual para localização selecionada
 * - Reutilizável entre diferentes páginas
 */
export const ProductAllocationDialog: React.FC<ProductAllocationDialogProps> = ({
  open,
  onClose,
  onAllocate,
  selectedProduct,
  selectedLocationId,
  onLocationSelect,
  notes,
  onNotesChange,
  isAllocating,
  availableLocationsCount,
  locationsLoading,
}) => {
  const handleAllocate = () => {
    if (!selectedLocationId) {
      return;
    }
    onAllocate();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <LocationIcon color="primary" />
          Alocar Produto: {selectedProduct?.name}
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        <Box sx={{ mb: 3 }}>
          <Alert severity="info" icon={<InfoIcon />}>
            Selecione uma localização na árvore hierárquica abaixo para alocar este produto. O produto passará para o status "Locado".
          </Alert>
        </Box>

        <Grid container spacing={3}>
          {/* Navegação em árvore ocupa toda a largura */}
          <Grid size={{ xs: 12 }}>
            <Box sx={{ 
              border: '1px solid', 
              borderColor: 'divider',
              borderRadius: 1,
              minHeight: 500,
              backgroundColor: 'background.paper'
            }}>
              <LocationTreeNavigation
                onLocationSelect={onLocationSelect}
                selectedLocationId={selectedLocationId || undefined}
                showStats={true}
                allowModeToggle={false}
                hideViewToggle={true}
                filters={{
                  status: 'available'
                }}
              />
            </Box>
          </Grid>

          {/* Feedback da localização selecionada */}
          <Grid size={{ xs: 12 }}>
            {selectedLocationId ? (
              <Alert severity="success">
                <Typography variant="body2">
                  Localização selecionada: {selectedLocationId}
                </Typography>
              </Alert>
            ) : (
              <Alert severity="info">
                <Typography variant="body2">
                  Navegue pela árvore e clique em uma localização (andar) para selecioná-la.
                </Typography>
              </Alert>
            )}
          </Grid>

          {/* Campo de observações */}
          <Grid size={{ xs: 12 }}>
            <TextField
              fullWidth
              label="Observações da Alocação (opcional)"
              multiline
              rows={3}
              value={notes}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Digite observações sobre a alocação deste produto..."
            />
          </Grid>
        </Grid>

        {/* Aviso se não há localizações disponíveis */}
        {availableLocationsCount === 0 && !locationsLoading && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Nenhuma localização disponível no sistema. Aguarde novas localizações serem liberadas ou contate o administrador.
            </Typography>
          </Alert>
        )}
      </DialogContent>

      <DialogActions>
        <Button 
          onClick={onClose}
          disabled={isAllocating}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleAllocate}
          variant="contained"
          disabled={!selectedLocationId || isAllocating}
          startIcon={isAllocating ? undefined : <CheckIcon />}
        >
          {isAllocating ? 'Alocando...' : 'Confirmar Alocação'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ProductAllocationDialog;