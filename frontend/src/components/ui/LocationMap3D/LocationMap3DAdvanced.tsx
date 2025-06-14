import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Stack,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Paper,
  TextField,
  InputAdornment,
  ToggleButton,
  ToggleButtonGroup,
  Pagination
} from '@mui/material';
import {
  Warning,
  CheckCircle,
  Error,
  Search as SearchIcon,
  ViewModule as GridIcon,
  ViewComfy as CompactIcon,
  FilterList as FilterIcon
} from '@mui/icons-material';
import { Chamber, LocationWithChamber } from '../../../types';
import { sanitizeChipProps } from '../../../utils/chipUtils';

interface LocationMap3DAdvancedProps {
  allLocations: LocationWithChamber[];
  chambers: Chamber[];
  onLocationSelect?: (location: LocationWithChamber) => void;
  selectedChamber?: Chamber | null;
  availableOnly?: boolean;
  title?: string;
  height?: string | number;
}

export const LocationMap3DAdvanced: React.FC<LocationMap3DAdvancedProps> = ({
  allLocations = [],
  chambers = [],
  onLocationSelect,
  selectedChamber: initialSelectedChamber,
  availableOnly = false,
  title = "Mapa 3D das Localizações",
  height = 500
}) => {
  const [selectedChamber, setSelectedChamber] = useState<Chamber | null>(initialSelectedChamber || null);
  const [selectedLocation, setSelectedLocation] = useState<LocationWithChamber | null>(null);
  const [autoSwitched, setAutoSwitched] = useState(false);
  
  // 🎛️ CONTROLES DE VISUALIZAÇÃO
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'compact' | 'normal'>('compact');
  const [statusFilter, setStatusFilter] = useState<'all' | 'available' | 'occupied'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(100); // Mostrar 100 localizações por página

  // 🔍 VERIFICAR SE CÂMARA TEM LOCALIZAÇÕES
  const hasLocationsForChamber = (chamberName: string): boolean => {
    if (!chamberName || allLocations.length === 0) return false;
    return allLocations.some(loc => loc.chamber?.name === chamberName);
  };

  // 📊 ANÁLISE DE DADOS
  const dataAnalysis = useMemo(() => {
    const chambersWithLocations = chambers.filter(c => hasLocationsForChamber(c.name));
    const chambersWithoutLocations = chambers.filter(c => !hasLocationsForChamber(c.name));
    
    return {
      chambersWithLocations,
      chambersWithoutLocations,
      totalChambers: chambers.length,
      hasInconsistentData: chambersWithoutLocations.length > 0
    };
  }, [chambers, allLocations]);

  // 🎯 SMART CHAMBER SELECTION
  useEffect(() => {
    if (chambers.length === 0 || allLocations.length === 0) return;

    // Se não há câmara selecionada ou a selecionada não tem localizações
    if (!selectedChamber || !hasLocationsForChamber(selectedChamber.name)) {
      
      // 1. Tentar usar a câmara inicial se ela tem localizações
      if (initialSelectedChamber && hasLocationsForChamber(initialSelectedChamber.name)) {
        console.log('✅ Usando câmara inicial:', initialSelectedChamber.name);
        setSelectedChamber(initialSelectedChamber);
        return;
      }
      
      // 2. Encontrar primeira câmara com localizações
      const chamberWithLocations = dataAnalysis.chambersWithLocations[0];
      
      if (chamberWithLocations) {
        console.log('🎯 AUTO-SELEÇÃO: Selecionando câmara com localizações:', chamberWithLocations.name);
        setSelectedChamber(chamberWithLocations);
        setAutoSwitched(true);
        return;
      }
      
      // 3. Se nenhuma câmara tem localizações, selecionar a primeira
      if (chambers.length > 0) {
        console.log('⚠️ Nenhuma câmara tem localizações, selecionando primeira:', chambers[0].name);
        setSelectedChamber(chambers[0]);
      }
    }
  }, [chambers, allLocations, initialSelectedChamber]);

  // 📍 FILTRAR LOCALIZAÇÕES POR CÂMARA
  const chamberLocations = useMemo(() => {
    if (!selectedChamber?.name || allLocations.length === 0) return [];
    
    const filtered = allLocations.filter(loc => loc.chamber?.name === selectedChamber.name);
    
    console.log('🔍 LocationMap3DAdvanced DEBUG:', {
      chambers: chambers.length,
      allLocations: allLocations.length,
      selectedChamber: selectedChamber.name,
      hasData: filtered.length > 0,
      chamberLocations: filtered.length
    });
    
    return filtered;
  }, [selectedChamber?.name, allLocations]);

  // 🔍 APLICAR FILTROS E BUSCA
  const filteredLocations = useMemo(() => {
    let filtered = chamberLocations;

    // Filtro por status
    if (statusFilter === 'available') {
      filtered = filtered.filter(loc => !loc.isOccupied);
    } else if (statusFilter === 'occupied') {
      filtered = filtered.filter(loc => loc.isOccupied);
    }

    // Aplicar filtro availableOnly se necessário
    if (availableOnly) {
      filtered = filtered.filter(loc => !loc.isOccupied);
    }

    // Filtro por busca
    if (searchTerm) {
      filtered = filtered.filter(loc => 
        loc.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    return filtered;
  }, [chamberLocations, statusFilter, availableOnly, searchTerm]);

  // 📄 PAGINAÇÃO
  const paginatedLocations = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredLocations.slice(startIndex, endIndex);
  }, [filteredLocations, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredLocations.length / itemsPerPage);

  // 📊 ESTATÍSTICAS
  const stats = useMemo(() => {
    const allAvailableCount = chamberLocations.filter(loc => !loc.isOccupied).length;
    const allOccupiedCount = chamberLocations.filter(loc => loc.isOccupied).length;
    
    return {
      totalLocations: chamberLocations.length,
      availableCount: allAvailableCount,
      occupiedCount: allOccupiedCount,
      filteredCount: filteredLocations.length,
      displayedCount: paginatedLocations.length,
      occupancyRate: chamberLocations.length > 0 ? (allOccupiedCount / chamberLocations.length) * 100 : 0
    };
  }, [chamberLocations, filteredLocations, paginatedLocations]);

  // Reset página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, searchTerm, selectedChamber]);

  // 🔄 LOADING STATE
  if (chambers.length === 0 || allLocations.length === 0) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Box display="flex" flexDirection="column" alignItems="center" p={3}>
            <CircularProgress size={40} />
            <Typography variant="body2" color="textSecondary" mt={2}>
              Carregando dados...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 🚫 ERROR STATE - Nenhuma câmara tem localizações
  if (dataAnalysis.chambersWithLocations.length === 0) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          <Alert severity="error" icon={<Error />}>
            <Typography variant="subtitle2">
              Nenhuma Câmara Possui Localizações
            </Typography>
            <Typography variant="body2">
              Todas as {chambers.length} câmaras configuradas não possuem localizações geradas.
              Gere localizações para as câmaras antes de usar esta funcionalidade.
            </Typography>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  // ⚠️ WARNING STATE - Câmara selecionada não tem localizações
  if (selectedChamber && !hasLocationsForChamber(selectedChamber.name)) {
    return (
      <Card sx={{ height }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>{title}</Typography>
          
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Warning color="warning" />
              <Typography variant="body2">
                <strong>Problema de Dados</strong>
              </Typography>
            </Stack>
            <Typography variant="body2" mt={1}>
              A câmara "{selectedChamber.name}" não possui localizações vinculadas. 
              Isso pode indicar inconsistência nos dados.
            </Typography>
          </Alert>

          {/* Debug Info */}
          <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
            <Typography variant="body2" color="textSecondary">
              <strong>DEBUG:</strong> Câmaras: {chambers.length} | Localizações: {allLocations.length} | 
              Câmara Selecionada: {selectedChamber.name} | hasData: {chamberLocations.length > 0}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID da Câmara: {selectedChamber.id}
            </Typography>
          </Paper>

          {/* Seletor de câmara alternativa */}
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Selecione uma câmara com localizações disponíveis:
            </Typography>
            <FormControl fullWidth size="small">
              <InputLabel>Câmara</InputLabel>
              <Select
                value={selectedChamber.id}
                label="Câmara"
                onChange={(e) => {
                  const chamber = chambers.find(c => c.id === e.target.value);
                  if (chamber) {
                    setSelectedChamber(chamber);
                    setAutoSwitched(false);
                  }
                }}
              >
                {dataAnalysis.chambersWithLocations.map((chamber) => (
                  <MenuItem key={chamber.id} value={chamber.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <CheckCircle color="success" fontSize="small" />
                      <span>{chamber.name}</span>
                      <Chip 
                        {...sanitizeChipProps({
                          label: `${allLocations.filter(l => l.chamber?.name === chamber.name).length} localizações`,
                          size: "small",
                          color: "success",
                          variant: "outlined"
                        })}
                      />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </CardContent>
      </Card>
    );
  }

  // 🎉 SUCCESS STATE - Render the map
  return (
    <Card sx={{ height, display: 'flex', flexDirection: 'column' }}>
      <CardHeader
        title={title}
        action={
          <Stack direction="row" spacing={1}>
            <Chip 
              {...sanitizeChipProps({
                label: `${stats.totalLocations} total`,
                color: "primary",
                size: "small"
              })}
            />
            <Chip 
              {...sanitizeChipProps({
                label: `${stats.availableCount} disponíveis`,
                color: "success",
                size: "small"
              })}
            />
            <Chip 
              {...sanitizeChipProps({
                label: `${stats.occupiedCount} ocupadas`,
                color: "warning",
                size: "small"
              })}
            />
          </Stack>
        }
      />
      
      <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Auto-switch feedback */}
        {autoSwitched && (
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              Câmara selecionada automaticamente: "{selectedChamber?.name}" 
              {initialSelectedChamber && ` (${initialSelectedChamber.name} não possui localizações)`}
            </Typography>
          </Alert>
        )}

        {/* Data inconsistency warning */}
        {dataAnalysis.hasInconsistentData && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            <Typography variant="body2" gutterBottom>
              <strong>Aviso:</strong> {dataAnalysis.chambersWithoutLocations.length} câmara(s) 
              não possuem localizações geradas.
            </Typography>
            <Typography variant="body2">
              Câmaras sem localizações: {dataAnalysis.chambersWithoutLocations.map(c => c.name).join(', ')}
            </Typography>
          </Alert>
        )}
        
        {/* Controles superiores */}
        <Box mb={2}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
            {/* Seletor de câmara */}
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <InputLabel>Câmara</InputLabel>
              <Select
                value={selectedChamber?.id || ''}
                label="Câmara"
                onChange={(e) => {
                  const chamber = chambers.find(c => c.id === e.target.value);
                  if (chamber) {
                    setSelectedChamber(chamber);
                    setAutoSwitched(false);
                  }
                }}
              >
                {chambers.map((chamber) => (
                  <MenuItem key={chamber.id} value={chamber.id}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      {hasLocationsForChamber(chamber.name) ? (
                        <CheckCircle color="success" fontSize="small" />
                      ) : (
                        <Error color="error" fontSize="small" />
                      )}
                      <span>{chamber.name}</span>
                      <Chip 
                        {...sanitizeChipProps({
                          label: `${allLocations.filter(l => l.chamber?.name === chamber.name).length}`,
                          size: "small",
                          color: hasLocationsForChamber(chamber.name) ? "success" : "error",
                          variant: "outlined"
                        })}
                      />
                    </Stack>
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Busca */}
            <TextField
              size="small"
              placeholder="Buscar localização..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                ),
              }}
              sx={{ minWidth: 200 }}
            />

            {/* Filtro de status */}
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={statusFilter}
                label="Status"
                onChange={(e) => setStatusFilter(e.target.value as any)}
                startAdornment={<FilterIcon color="action" sx={{ mr: 1 }} />}
              >
                <MenuItem value="all">Todas</MenuItem>
                <MenuItem value="available">Disponíveis</MenuItem>
                <MenuItem value="occupied">Ocupadas</MenuItem>
              </Select>
            </FormControl>

            {/* Modo de visualização */}
            <ToggleButtonGroup
              value={viewMode}
              exclusive
              onChange={(_, newMode) => newMode && setViewMode(newMode)}
              size="small"
            >
              <ToggleButton value="compact">
                <CompactIcon fontSize="small" />
              </ToggleButton>
              <ToggleButton value="normal">
                <GridIcon fontSize="small" />
              </ToggleButton>
            </ToggleButtonGroup>
          </Stack>
        </Box>

        {/* Informações de resultado */}
        <Box mb={2}>
          <Typography variant="body2" color="textSecondary">
            Mostrando {paginatedLocations.length} de {stats.filteredCount} localizações
            {stats.filteredCount !== stats.totalLocations && ` (total: ${stats.totalLocations})`}
            {totalPages > 1 && ` - Página ${currentPage} de ${totalPages}`}
          </Typography>
        </Box>

        {/* Mapa 3D otimizado */}
        <Paper sx={{ 
          flexGrow: 1, 
          p: 2, 
          backgroundColor: 'grey.50',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'auto'
        }}>
          <Typography variant="h6" color="textSecondary" gutterBottom>
            Mapa 3D - {selectedChamber?.name}
          </Typography>
          
          {/* Grid otimizado de localizações */}
          <Box sx={{ 
            display: 'grid', 
            gridTemplateColumns: viewMode === 'compact' 
              ? 'repeat(auto-fit, minmax(60px, 1fr))' 
              : 'repeat(auto-fit, minmax(100px, 1fr))',
            gap: viewMode === 'compact' ? 0.5 : 1,
            maxHeight: 400,
            overflow: 'auto',
            p: 1,
            flex: 1
          }}>
            {paginatedLocations.map((location) => (
              <Paper
                key={location.id}
                sx={{
                  p: viewMode === 'compact' ? 0.5 : 1,
                  textAlign: 'center',
                  backgroundColor: location.isOccupied ? 'error.light' : 'success.light',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    backgroundColor: location.isOccupied ? 'error.main' : 'success.main',
                    color: 'white',
                    transform: 'scale(1.05)',
                    zIndex: 1
                  }
                }}
                onClick={() => {
                  setSelectedLocation(location);
                  if (onLocationSelect) {
                    onLocationSelect(location);
                  }
                }}
              >
                <Typography 
                  variant={viewMode === 'compact' ? 'caption' : 'body2'} 
                  sx={{ fontWeight: 'bold', fontSize: viewMode === 'compact' ? '10px' : '12px' }}
                >
                  {location.code}
                </Typography>
                {viewMode === 'normal' && (
                  <Typography variant="caption" display="block" sx={{ opacity: 0.8 }}>
                    {location.isOccupied ? 'Ocupada' : 'Livre'}
                  </Typography>
                )}
              </Paper>
            ))}
          </Box>
          
          {/* Paginação */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
              <Pagination
                count={totalPages}
                page={currentPage}
                onChange={(_, page) => setCurrentPage(page)}
                color="primary"
                size="small"
                showFirstButton
                showLastButton
              />
            </Box>
          )}
        </Paper>
      </CardContent>
    </Card>
  );
};

export default LocationMap3DAdvanced; 