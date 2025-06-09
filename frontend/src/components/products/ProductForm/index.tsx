import React from 'react';
import { Box, Grid } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { ptBR } from 'date-fns/locale';
import { Product, SeedType, LocationWithChamber, Chamber, CreateProductFormData, UpdateProductFormData } from '../../../types';

// Sub-componentes modulares
import { ProductFormBasicInfo } from './components/ProductFormBasicInfo';
import { ProductFormQuantityWeight } from './components/ProductFormQuantityWeight';
import { ProductFormLocation } from './components/ProductFormLocation';
import { ProductFormAdditional } from './components/ProductFormAdditional';
import { ProductFormTracking } from './components/ProductFormTracking';
import { ProductFormActions } from './components/ProductFormActions';

// Hook customizado com lógica de negócio
import { useProductFormLogic } from './hooks/useProductFormLogic';

interface ProductFormProps {
  product?: Product | null;
  seedTypes: SeedType[];
  chambers: Chamber[];
  availableLocations: LocationWithChamber[];
  onSubmit: (data: CreateProductFormData | UpdateProductFormData) => void;
  onCancel: () => void;
  isEditing?: boolean;
}

/**
 * Formulário de produto refatorado seguindo as melhores práticas:
 * - Componente principal com ~150 linhas
 * - Lógica de negócio extraída para hook customizado
 * - Sub-componentes modulares
 * - Performance otimizada com React.memo
 * - Computed values ao invés de useState desnecessário
 */
export const ProductForm: React.FC<ProductFormProps> = React.memo((props) => {
  // Toda a lógica de negócio centralizada no hook customizado
  const formLogic = useProductFormLogic(props);

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
      <Box component="form" onSubmit={formLogic.handleSubmit} noValidate>
        <Grid container spacing={3}>
          {/* Informações Básicas */}
          <ProductFormBasicInfo
            form={formLogic.form}
            seedTypes={formLogic.seedTypes}
            errors={formLogic.errors}
          />

          {/* Quantidade e Peso */}
          <ProductFormQuantityWeight
            form={formLogic.form}
            totalWeight={formLogic.totalWeight}
            errors={formLogic.errors}
          />

          {/* Localização */}
          <ProductFormLocation
            form={formLogic.form}
            chambers={formLogic.chambers}
            availableLocations={formLogic.availableLocations}
            selectedLocation={formLogic.selectedLocation}
            capacityInfo={formLogic.capacityInfo}
            onLocationSelect={formLogic.handleLocationSelect}
            errors={formLogic.errors}
          />

          {/* Informações Adicionais */}
          <ProductFormAdditional
            form={formLogic.form}
            errors={formLogic.errors}
          />

          {/* Rastreamento */}
          <ProductFormTracking
            form={formLogic.form}
            errors={formLogic.errors}
          />

          {/* Botões de Ação */}
          <ProductFormActions
            isSubmitting={formLogic.isSubmitting}
            isEditing={formLogic.isEditing}
            capacityInfo={formLogic.capacityInfo}
            onCancel={formLogic.handleCancel}
          />
        </Grid>
      </Box>
    </LocalizationProvider>
  );
});

ProductForm.displayName = 'ProductForm';