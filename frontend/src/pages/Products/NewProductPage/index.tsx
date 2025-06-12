import React from 'react';
import {
  Container,
  Card,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { useNewProductPage } from './hooks/useNewProductPage';
import { NewProductForm } from './components/NewProductForm';
import { NewProductLocationMap } from './components/NewProductLocationMap';
import Toast from '../../../components/common/Toast';

const NewProductPageSkeleton: React.FC = () => (
  <Container maxWidth="xl" sx={{ py: 3 }}>
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
      <Box sx={{ textAlign: 'center' }}>
        <CircularProgress size={48} sx={{ mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          Carregando dados...
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Preparando formulário de cadastro
        </Typography>
      </Box>
    </Box>
  </Container>
);

export const NewProductPage: React.FC = () => {
  const pageLogic = useNewProductPage();

  if (pageLogic.isLoading) {
    return <NewProductPageSkeleton />;
  }

  if (pageLogic.hasError) {
    return (
      <Container maxWidth="xl" sx={{ py: 3 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Erro ao carregar dados necessários para o cadastro. 
          Verifique sua conexão e tente novamente.
        </Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Breadcrumb */}
      <Box sx={{ mb: 3 }}>
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label="breadcrumb"
        >
          <Link
            component={RouterLink}
            to="/dashboard"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <HomeIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Dashboard
          </Link>
          <Link
            component={RouterLink}
            to="/products"
            color="inherit"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            <InventoryIcon sx={{ mr: 0.5 }} fontSize="inherit" />
            Produtos
          </Link>
          <Typography
            color="text.primary"
            sx={{ display: 'flex', alignItems: 'center' }}
          >
            Novo Produto
          </Typography>
        </Breadcrumbs>
      </Box>

      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
          Cadastrar Novo Produto
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Preencha as informações do produto e selecione uma localização disponível no mapa 3D
        </Typography>
      </Box>

      {/* Layout Principal */}
      <Box sx={{ display: 'flex', gap: 3, flexDirection: { xs: 'column', lg: 'row' } }}>
        {/* Formulário */}
        <Box sx={{ flex: 1 }}>
          <Card elevation={2} sx={{ height: 'fit-content' }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Informações do Produto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Digite os dados do produto que será armazenado
                </Typography>
              </Box>
              
              <NewProductForm
                seedTypes={pageLogic.seedTypes}
                chambers={pageLogic.chambers}
                availableLocations={pageLogic.availableLocations}
                allLocations={pageLogic.allLocations}
                handleSubmit={pageLogic.handleSubmit}
                handleCancel={pageLogic.handleCancel}
              />
            </CardContent>
          </Card>
        </Box>
        
        {/* Mapa 3D */}
        <Box sx={{ flex: 1 }}>
          <Card elevation={2} sx={{ height: 'fit-content', minHeight: 600 }}>
            <CardContent>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Mapa de Localizações
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Visualize e selecione uma localização disponível
                </Typography>
              </Box>
              
              <NewProductLocationMap
                chambers={pageLogic.chambers}
                allLocations={pageLogic.allLocations}
                availableLocations={pageLogic.availableLocations}
                selectedChamber={pageLogic.selectedChamber}
                setSelectedChamber={pageLogic.setSelectedChamber}
                selectedFloor={pageLogic.selectedFloor}
                setSelectedFloor={pageLogic.setSelectedFloor}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Toast para feedback */}
      <Toast
        open={pageLogic.toast.open}
        message={pageLogic.toast.message}
        severity={pageLogic.toast.severity}
        onClose={pageLogic.closeToast}
      />
    </Container>
  );
}; 