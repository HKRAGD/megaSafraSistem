import React, { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Button,
  Box,
  Chip,
  IconButton,
  Skeleton,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Edit as EditIcon,
  Delete as DeleteIcon,
  ViewModule as ViewIcon,
  Thermostat as ThermostatIcon,
  Opacity as HumidityIcon,
  Storage as StorageIcon,
  AutoMode as AutoIcon,
} from '@mui/icons-material';
import { Chamber } from '../../types';
import { dashboardService } from '../../services/dashboardService';

interface ChamberGridProps {
  chambers: Chamber[];
  loading: boolean;
  selectedChamber: Chamber | null;
  onSelectChamber: (chamber: Chamber) => void;
  onEditChamber?: (chamber: Chamber) => void;
  onDeleteChamber?: (chamberId: string) => void;
  onGenerateLocations?: (chamberId: string) => void;
}

interface ChamberStatusData {
  [chamberId: string]: {
    occupancyRate: number;
    utilizationRate: number;
    totalProducts: number;
    expiringProducts: number;
    conditionsStatus: string;
  };
}

export const ChamberGrid: React.FC<ChamberGridProps> = ({
  chambers,
  loading,
  selectedChamber,
  onSelectChamber,
  onEditChamber,
  onDeleteChamber,
  onGenerateLocations,
}) => {
  const [chamberStatusData, setChamberStatusData] = useState<ChamberStatusData>({});
  const [statusLoading, setStatusLoading] = useState(false);

  // Carregar dados reais de status das câmaras
  useEffect(() => {
    const fetchChamberStatus = async () => {
      if (chambers.length === 0) return;
      
      setStatusLoading(true);
      try {
        const response = await dashboardService.getChamberStatus();
        
        console.log('🔍 DEBUG - Resposta completa da API:', response);
        console.log('🔍 DEBUG - response.data:', response.data);
        console.log('🔍 DEBUG - response.data.chambers:', response.data?.chambers);
        
        // Mapear dados de status por ID da câmara
        const statusMap: ChamberStatusData = {};
        // Backend retorna: { success: true, data: { chambers: [...] } }
        const chambersData = response.data?.chambers || response.data || [];
        
        console.log('🔍 DEBUG - chambersData:', chambersData);
        console.log('🔍 DEBUG - chambersData.length:', chambersData.length);
        
        chambersData.forEach((chamberStatus: any, index: number) => {
          console.log(`🔍 DEBUG - Chamber ${index}:`, chamberStatus);
          console.log(`🔍 DEBUG - Chamber ID: ${chamberStatus.chamber?.id}`);
          console.log(`🔍 DEBUG - Utilization Rate: ${chamberStatus.capacity?.utilizationRate}`);
          
          statusMap[chamberStatus.chamber.id] = {
            occupancyRate: chamberStatus.occupancy.occupancyRate || 0,
            utilizationRate: chamberStatus.capacity.utilizationRate || 0,
            totalProducts: chamberStatus.products.totalProducts || 0,
            expiringProducts: chamberStatus.products.expiringProducts || 0,
            conditionsStatus: chamberStatus.conditions.temperature?.status || 'unknown'
          };
        });
        
        setChamberStatusData(statusMap);
        console.log('✅ Dados de status das câmaras carregados:', statusMap);
      } catch (error) {
        console.error('❌ Erro ao carregar status das câmaras:', error);
        // Manter dados vazios em caso de erro
        setChamberStatusData({});
      } finally {
        setStatusLoading(false);
      }
    };

    fetchChamberStatus();
  }, [chambers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'success';
      case 'maintenance':
        return 'warning';
      case 'inactive':
        return 'error';
      default:
        return 'default';
    }
  };

  const getConditionColor = (condition: string) => {
    switch (condition) {
      case 'optimal':
        return 'success';
      case 'normal':
        return 'info';
      case 'alert':
        return 'error';
      case 'unknown':
        return 'warning';
      default:
        return 'default';
    }
  };

  const getChamberOccupancyData = (chamber: Chamber) => {
    const statusData = chamberStatusData[chamber.id];
    if (statusData) {
      return {
        occupancyRate: statusData.occupancyRate,
        utilizationRate: statusData.utilizationRate,
        totalProducts: statusData.totalProducts,
        expiringProducts: statusData.expiringProducts,
        conditionsStatus: statusData.conditionsStatus
      };
    }
    
    // Fallback para dados básicos se status não carregou
    return {
      occupancyRate: 0,
      utilizationRate: 0,
      totalProducts: 0,
      expiringProducts: 0,
      conditionsStatus: 'unknown'
    };
  };

  if (loading) {
    return (
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: 3,
        }}
      >
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardContent>
              <Skeleton variant="text" width="60%" />
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="rectangular" height={60} sx={{ mt: 2 }} />
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  if (chambers.length === 0) {
    return (
      <Card>
        <CardContent sx={{ textAlign: 'center', py: 6 }}>
          <StorageIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Nenhuma câmara encontrada
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Crie sua primeira câmara para começar a gerenciar o armazenamento
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: 3,
      }}
    >
      {chambers.map((chamber) => {
        const isSelected = selectedChamber?.id === chamber.id;
        const { occupancyRate, utilizationRate, totalProducts, expiringProducts, conditionsStatus } = getChamberOccupancyData(chamber);

        return (
          <Card
            key={chamber.id}
            sx={{
              cursor: 'pointer',
              border: isSelected ? 2 : 1,
              borderColor: isSelected ? 'primary.main' : 'divider',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-2px)',
              },
            }}
            onClick={() => onSelectChamber(chamber)}
          >
            <CardContent>
              {/* Header */}
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                <Box>
                  <Typography variant="h6" component="h3" gutterBottom>
                    {chamber.name}
                  </Typography>
                  <Chip
                    size="small"
                    label={chamber.status}
                    color={getStatusColor(chamber.status) as any}
                  />
                </Box>
                {onEditChamber && (
                  <Box>
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditChamber(chamber);
                      }}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Box>
                )}
              </Box>

              {/* Descrição */}
              {chamber.description && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  {chamber.description}
                </Typography>
              )}

              {/* Dimensões */}
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  Dimensões
                </Typography>
                <Typography variant="body2">
                  {chamber.dimensions.quadras}Q × {chamber.dimensions.lados}L × {chamber.dimensions.filas}F × {chamber.dimensions.andares}A
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Total: {chamber.totalLocations || 0} localizações
                </Typography>
              </Box>

              {/* Condições ambientais */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <ThermostatIcon fontSize="small" color="action" />
                  <Typography variant="caption">
                    {chamber.currentTemperature || '--'}°C
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <HumidityIcon fontSize="small" color="action" />
                  <Typography variant="caption">
                    {chamber.currentHumidity || '--'}%
                  </Typography>
                </Box>
              </Box>

              {/* Status das condições */}
              {chamber.conditionsStatus && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Condições:
                  </Typography>
                  <Chip
                    size="small"
                    label={chamber.conditionsStatus}
                    color={getConditionColor(chamber.conditionsStatus) as any}
                    sx={{ ml: 1 }}
                  />
                </Box>
              )}

              {/* Informações de produtos */}
              {totalProducts > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      Produtos: {totalProducts}
                    </Typography>
                    {expiringProducts > 0 && (
                      <Chip
                        size="small"
                        label={`${expiringProducts} vencendo`}
                        color="warning"
                        variant="outlined"
                      />
                    )}
                  </Box>
                </Box>
              )}

              {/* Taxa de ocupação */}
              <Box sx={{ mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    Ocupação
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {statusLoading ? '--' : occupancyRate}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant={statusLoading ? "indeterminate" : "determinate"}
                  value={statusLoading ? 0 : occupancyRate}
                  color={occupancyRate > 90 ? 'error' : occupancyRate > 70 ? 'warning' : 'primary'}
                />
              </Box>

              {/* Taxa de utilização de capacidade */}
              {utilizationRate > 0 && (
                <Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      Capacidade
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {utilizationRate}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={utilizationRate}
                    color={utilizationRate > 90 ? 'error' : utilizationRate > 70 ? 'warning' : 'success'}
                    sx={{ height: 4 }}
                  />
                </Box>
              )}
            </CardContent>

            <CardActions sx={{ px: 2, pb: 2 }}>
              <Button
                size="small"
                startIcon={<ViewIcon />}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectChamber(chamber);
                }}
              >
                Visualizar
              </Button>

              {onGenerateLocations && (
                <Tooltip title="Gerar localizações automaticamente">
                  <Button
                    size="small"
                    startIcon={<AutoIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onGenerateLocations(chamber.id);
                    }}
                  >
                    Gerar
                  </Button>
                </Tooltip>
              )}

              {onDeleteChamber && chamber.status !== 'active' && (
                <IconButton
                  size="small"
                  color="error"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm(`Tem certeza que deseja excluir a câmara "${chamber.name}"?`)) {
                      onDeleteChamber(chamber.id);
                    }
                  }}
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              )}
            </CardActions>
          </Card>
        );
      })}
    </Box>
  );
}; 