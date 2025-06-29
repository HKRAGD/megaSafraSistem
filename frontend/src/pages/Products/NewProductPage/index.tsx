import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Box,
  Typography,
  CircularProgress,
  Alert,
  Breadcrumbs,
  Link,
  ToggleButton,
  ToggleButtonGroup,
  Divider
} from '@mui/material';
import {
  NavigateNext as NavigateNextIcon,
  Home as HomeIcon,
  Inventory as InventoryIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { Link as RouterLink } from 'react-router-dom';

import { useNewProductPage } from './hooks/useNewProductPage';
import { NewProductForm } from './components/NewProductForm';
import { BatchProductForm } from '../../../components/products/BatchProductForm';

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
  const [formMode, setFormMode] = useState<'individual' | 'batch'>('individual');

  const handleFormModeChange = (
    _event: React.MouseEvent<HTMLElement>,
    newMode: 'individual' | 'batch' | null,
  ) => {
    if (newMode !== null) {
      setFormMode(newMode);
    }
  };

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
    <Container maxWidth="lg" sx={{ py: 3 }}>
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
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 600 }}>
              {formMode === 'individual' ? 'Cadastrar Novo Produto' : 'Cadastrar Lote de Produtos'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {formMode === 'individual' 
                ? 'Preencha as informações do produto e selecione uma localização disponível'
                : 'Cadastre múltiplos produtos simultaneamente com um cliente comum'
              }
            </Typography>
          </Box>
          
          <ToggleButtonGroup
            value={formMode}
            exclusive
            onChange={handleFormModeChange}
            aria-label="Modo de cadastro"
            size="small"
          >
            <ToggleButton value="individual" aria-label="Cadastro individual">
              <PersonIcon sx={{ mr: 1 }} />
              Individual
            </ToggleButton>
            <ToggleButton value="batch" aria-label="Cadastro em lote">
              <GroupIcon sx={{ mr: 1 }} />
              Em Lote
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
        
        <Divider />
      </Box>

      {/* Formulário Principal */}
      <Card elevation={2}>
        <CardContent>
          {formMode === 'individual' ? (
            <>
              <Box sx={{ mb: 2 }}>
                <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
                  Informações do Produto
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Digite os dados do produto que será armazenado e selecione sua localização
                </Typography>
              </Box>
              
              <NewProductForm
                seedTypes={pageLogic.seedTypes}
                chambers={pageLogic.chambers}
                availableLocations={pageLogic.availableLocations}
                allLocations={pageLogic.allLocations}
                isLoading={pageLogic.isLoading}
                formLoading={pageLogic.formLoading}
                handleSubmit={pageLogic.handleSubmit}
                handleCancel={pageLogic.handleCancel}
              />
            </>
          ) : (
            <BatchProductForm
              seedTypes={pageLogic.seedTypes}
              chambers={pageLogic.chambers}
              availableLocations={pageLogic.availableLocations}
              allLocations={pageLogic.allLocations}
              onSubmit={pageLogic.handleBatchSubmit}
              onCancel={pageLogic.handleCancel}
            />
          )}
        </CardContent>
      </Card>


    </Container>
  );
}; 