import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Grid,
  Typography,
  Button,
  Card,
  CardContent,
  Tabs,
  Tab,
  Chip,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Add as AddIcon,
  ViewModule as GridViewIcon,
  Map as MapViewIcon,
  Settings as SettingsIcon,
} from '@mui/icons-material';

import { PageHeader } from '../../components/layout/PageHeader';
import { ChamberGrid } from '../../components/locations/ChamberGrid';
import { LocationDetails } from '../../components/locations/LocationDetails';
import { ChamberForm } from '../../components/locations/ChamberForm';
import { LocationMap } from '../../components/locations/LocationMap';
import { useChambers } from '../../hooks/useChambers';
import { useLocations } from '../../hooks/useLocations';
import { useAuth } from '../../hooks/useAuth';
import { Chamber, Location } from '../../types';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel({ children, value, index, ...other }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`locations-tabpanel-${index}`}
      aria-labelledby={`locations-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const LocationsPage: React.FC = () => {
  const { user } = useAuth();
  const {
    chambers,
    loading: chambersLoading,
    error: chambersError,
    fetchChambers,
    createChamber,
    updateChamber,
    deleteChamber,
    generateLocations,
  } = useChambers();

  const {
    locations,
    loading: locationsLoading,
    error: locationsError,
    fetchLocationsByChamber,
    updateLocation,
  } = useLocations();

  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState<'grid' | 'map'>('grid');
  const [showChamberForm, setShowChamberForm] = useState(false);
  const [editingChamber, setEditingChamber] = useState<Chamber | null>(null);

  // Carregar câmaras ao montar o componente
  useEffect(() => {
    fetchChambers();
  }, [fetchChambers]);

  // Carregar localizações quando uma câmara é selecionada
  useEffect(() => {
    if (selectedChamber) {
      fetchLocationsByChamber(selectedChamber.id);
    }
  }, [selectedChamber, fetchLocationsByChamber]);

  const handleChamberSelect = (chamber: Chamber) => {
    setSelectedChamber(chamber);
    setSelectedLocation(null);
  };

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  const handleCreateChamber = () => {
    setEditingChamber(null);
    setShowChamberForm(true);
  };

  const handleEditChamber = (chamber: Chamber) => {
    setEditingChamber(chamber);
    setShowChamberForm(true);
  };

  const handleSubmitChamber = async (chamberData: any) => {
    try {
      if (editingChamber) {
        await updateChamber(editingChamber.id, chamberData);
      } else {
        await createChamber(chamberData);
      }
      setShowChamberForm(false);
      setEditingChamber(null);
      await fetchChambers();
    } catch (error) {
      console.error('Erro ao salvar câmara:', error);
    }
  };

  const handleGenerateLocations = async (chamberId: string) => {
    try {
      await generateLocations(chamberId);
      if (selectedChamber && selectedChamber.id === chamberId) {
        await fetchLocationsByChamber(chamberId);
      }
    } catch (error) {
      console.error('Erro ao gerar localizações:', error);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const canManage = user?.role === 'admin' || user?.role === 'operator';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        <PageHeader
          title="Localizações"
          subtitle="Gerenciamento de câmaras refrigeradas e localizações de armazenamento"
        />

        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" href="/dashboard">
            Dashboard
          </Link>
          <Typography color="text.primary">Localizações</Typography>
          {selectedChamber && (
            <Typography color="text.primary">
              {selectedChamber.name}
            </Typography>
          )}
        </Breadcrumbs>

        {/* Erros */}
        {(chambersError || locationsError) && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {chambersError || locationsError}
          </Alert>
        )}

        {/* Tabs de navegação */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Câmaras" />
            <Tab label="Visualização" disabled={!selectedChamber} />
            <Tab label="Detalhes" disabled={!selectedLocation} />
          </Tabs>
        </Box>

        {/* Tab 0: Lista de Câmaras */}
        <TabPanel value={tabValue} index={0}>
          <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">
              Câmaras Disponíveis ({chambers.length})
            </Typography>
            {canManage && (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={handleCreateChamber}
              >
                Nova Câmara
              </Button>
            )}
          </Box>

          <ChamberGrid
            chambers={chambers}
            loading={chambersLoading}
            selectedChamber={selectedChamber}
            onSelectChamber={handleChamberSelect}
            onEditChamber={canManage ? handleEditChamber : undefined}
            onDeleteChamber={canManage ? deleteChamber : undefined}
            onGenerateLocations={canManage ? handleGenerateLocations : undefined}
          />
        </TabPanel>

        {/* Tab 1: Visualização das Localizações */}
        <TabPanel value={tabValue} index={1}>
          {selectedChamber && (
            <>
              <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box>
                  <Typography variant="h6">
                    {selectedChamber.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedChamber.description}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant={viewMode === 'grid' ? 'contained' : 'outlined'}
                    startIcon={<GridViewIcon />}
                    onClick={() => setViewMode('grid')}
                  >
                    Grade
                  </Button>
                  <Button
                    variant={viewMode === 'map' ? 'contained' : 'outlined'}
                    startIcon={<MapViewIcon />}
                    onClick={() => setViewMode('map')}
                  >
                    Mapa 3D
                  </Button>
                </Box>
              </Box>

              {/* Informações da câmara */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Grid container spacing={2}>
                    <Grid
                      size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                      }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Dimensões
                      </Typography>
                      <Typography variant="body1">
                        {selectedChamber.dimensions.quadras}Q × {selectedChamber.dimensions.lados}L × {selectedChamber.dimensions.filas}F × {selectedChamber.dimensions.andares}A
                      </Typography>
                    </Grid>
                    <Grid
                      size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                      }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Total de Localizações
                      </Typography>
                      <Typography variant="body1">
                        {selectedChamber.totalLocations || 0}
                      </Typography>
                    </Grid>
                    <Grid
                      size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                      }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Temperatura
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {selectedChamber.currentTemperature || '--'}°C
                        </Typography>
                        <Chip
                          size="small"
                          label={selectedChamber.temperatureStatus || 'unknown'}
                          color={
                            selectedChamber.temperatureStatus === 'normal'
                              ? 'success'
                              : (selectedChamber.temperatureStatus === 'low' || selectedChamber.temperatureStatus === 'high')
                              ? 'error'
                              : 'default'
                          }
                        />
                      </Box>
                    </Grid>
                    <Grid
                      size={{
                        xs: 12,
                        sm: 6,
                        md: 3
                      }}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Status
                      </Typography>
                      <Chip
                        label={selectedChamber.status}
                        color={
                          selectedChamber.status === 'active'
                            ? 'success'
                            : selectedChamber.status === 'maintenance'
                            ? 'warning'
                            : 'error'
                        }
                      />
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>

              {/* Visualização das localizações */}
              <LocationMap
                chamber={selectedChamber}
                locations={locations}
                loading={locationsLoading}
                viewMode={viewMode}
                selectedLocation={selectedLocation}
                onLocationSelect={handleLocationSelect}
                onLocationUpdate={canManage ? updateLocation : undefined}
              />
            </>
          )}
        </TabPanel>

        {/* Tab 2: Detalhes da Localização */}
        <TabPanel value={tabValue} index={2}>
          {selectedLocation && (
            <LocationDetails
              location={selectedLocation}
              chamber={selectedChamber}
              onUpdate={canManage ? updateLocation : undefined}
              onClose={() => setSelectedLocation(null)}
            />
          )}
        </TabPanel>

        {/* Modal de formulário de câmara */}
        {showChamberForm && (
          <ChamberForm
            chamber={editingChamber}
            open={showChamberForm}
            onClose={() => {
              setShowChamberForm(false);
              setEditingChamber(null);
            }}
            onSubmit={handleSubmitChamber}
          />
        )}
    </Container>
  );
}; 