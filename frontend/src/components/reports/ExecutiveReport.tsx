import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Divider
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Assessment as AssessmentIcon,
  Speed as SpeedIcon,
  Storage as StorageIcon,
  Warning as WarningIcon
} from '@mui/icons-material';
import { useReports } from '../../hooks/useReports';
import { Loading } from '../common/Loading';
import { formatWeightSmart } from '../../utils/displayHelpers';

interface ExecutiveMetrics {
  totalProducts: number;
  totalChambers: number;
  totalCapacityKg: number;
  usedCapacityKg: number;
  occupancyRate: number;
  totalMovements: number;
  expiringProducts: number;
  criticalAlerts: number;
  trends: {
    productsGrowth: number;
    movementsGrowth: number;
    occupancyGrowth: number;
  };
  topPerformers: {
    chambers: Array<{
      name: string;
      occupancyRate: number;
      efficiency: number;
    }>;
    users: Array<{
      name: string;
      movementsCount: number;
      efficiency: number;
    }>;
  };
  alerts: Array<{
    type: 'error' | 'warning' | 'info';
    message: string;
    count?: number;
  }>;
}

export const ExecutiveReport: React.FC = () => {
  const { generateExecutiveReport } = useReports();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);

  useEffect(() => {
    loadExecutiveData();
  }, []);

  const loadExecutiveData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Carregar dados reais do backend
      const executiveData = await generateExecutiveReport();
      
      if (executiveData) {
        setMetrics(executiveData);
        return;
      }
      
      // Fallback para mock data apenas se a API falhar
      const mockMetrics: ExecutiveMetrics = {
        totalProducts: 342,
        totalChambers: 8,
        totalCapacityKg: 45000,
        usedCapacityKg: 31500,
        occupancyRate: 70,
        totalMovements: 1247,
        expiringProducts: 23,
        criticalAlerts: 3,
        trends: {
          productsGrowth: 12.5,
          movementsGrowth: 8.2,
          occupancyGrowth: 15.3
        },
        topPerformers: {
          chambers: [
            { name: 'Câmara A1', occupancyRate: 95, efficiency: 98 },
            { name: 'Câmara B2', occupancyRate: 87, efficiency: 92 },
            { name: 'Câmara C1', occupancyRate: 82, efficiency: 89 }
          ],
          users: [
            { name: 'João Silva', movementsCount: 234, efficiency: 96 },
            { name: 'Maria Santos', movementsCount: 198, efficiency: 94 },
            { name: 'Pedro Costa', movementsCount: 156, efficiency: 91 }
          ]
        },
        alerts: [
          { type: 'error', message: 'Produtos próximos ao vencimento', count: 23 },
          { type: 'warning', message: 'Câmaras com alta ocupação', count: 3 },
          { type: 'info', message: 'Manutenções programadas', count: 2 }
        ]
      };

      // Usar dados mockados apenas como fallback
      console.warn('Usando dados mockados para ExecutiveReport');
      setMetrics(mockMetrics);
    } catch (err) {
      setError('Erro ao carregar dados executivos');
      console.error('Erro ao carregar relatório executivo:', err);
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (value: number) => {
    return value >= 0 ? (
      <TrendingUpIcon color="success" fontSize="small" />
    ) : (
      <TrendingDownIcon color="error" fontSize="small" />
    );
  };

  const getTrendColor = (value: number) => {
    return value >= 0 ? 'success' : 'error';
  };

  if (loading) return <Loading />;
  if (error) return <Alert severity="error">{error}</Alert>;
  if (!metrics) return null;

  return (
    <Box>
      {/* KPIs Principais */}
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mb: 4 }}>
        <Card sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <StorageIcon color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Total de Produtos
              </Typography>
            </Box>
            <Typography variant="h4" component="div">
              {(metrics.totalProducts || 0).toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {getTrendIcon(metrics.trends?.productsGrowth || 0)}
              <Typography 
                variant="body2" 
                color={getTrendColor(metrics.trends?.productsGrowth || 0)}
                sx={{ ml: 0.5 }}
              >
                {Math.abs(metrics.trends?.productsGrowth || 0)}% este mês
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <SpeedIcon color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Taxa de Ocupação
              </Typography>
            </Box>
            <Typography variant="h4" component="div">
              {(metrics.occupancyRate || 0)}%
            </Typography>
            <LinearProgress 
              variant="determinate" 
              value={metrics.occupancyRate || 0} 
              sx={{ mt: 1, height: 8, borderRadius: 4 }}
            />
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {getTrendIcon(metrics.trends?.occupancyGrowth || 0)}
              <Typography 
                variant="body2" 
                color={getTrendColor(metrics.trends?.occupancyGrowth || 0)}
                sx={{ ml: 0.5 }}
              >
                {Math.abs(metrics.trends?.occupancyGrowth || 0)}% este mês
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AssessmentIcon color="primary" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Movimentações
              </Typography>
            </Box>
            <Typography variant="h4" component="div">
              {(metrics.totalMovements || 0).toLocaleString()}
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
              {getTrendIcon(metrics.trends?.movementsGrowth || 0)}
              <Typography 
                variant="body2" 
                color={getTrendColor(metrics.trends?.movementsGrowth || 0)}
                sx={{ ml: 0.5 }}
              >
                {Math.abs(metrics.trends?.movementsGrowth || 0)}% este mês
              </Typography>
            </Box>
          </CardContent>
        </Card>

        <Card sx={{ flex: '1 1 calc(25% - 16px)', minWidth: 250 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <WarningIcon color="warning" sx={{ mr: 1 }} />
              <Typography color="textSecondary" variant="body2">
                Alertas Críticos
              </Typography>
            </Box>
            <Typography variant="h4" component="div" color="warning.main">
              {metrics.criticalAlerts || 0}
            </Typography>
            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
              {metrics.expiringProducts || 0} produtos expirando
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
        {/* Alertas */}
        <Card sx={{ flex: '1 1 calc(50% - 16px)', minWidth: 400 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Alertas do Sistema
            </Typography>
            <Box sx={{ mt: 2 }}>
              {Array.isArray(metrics.alerts) && metrics.alerts.length > 0 ? (
                metrics.alerts.map((alert, index) => (
                  <Alert 
                    key={index}
                    severity={alert.type}
                    sx={{ mb: 1 }}
                    action={
                      alert.count ? (
                        <Chip 
                          label={alert.count} 
                          size="small" 
                          color={alert.type === 'error' ? 'error' : alert.type === 'warning' ? 'warning' : 'default'}
                        />
                      ) : undefined
                    }
                  >
                    {alert.message}
                  </Alert>
                ))
              ) : (
                <Typography variant="body2" color="textSecondary">
                  Nenhum alerta no momento
                </Typography>
              )}
            </Box>
          </CardContent>
        </Card>

        {/* Top Câmaras */}
        <Card sx={{ flex: '1 1 calc(50% - 16px)', minWidth: 400 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Câmaras com Melhor Performance
            </Typography>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Câmara</TableCell>
                    <TableCell align="right">Ocupação</TableCell>
                    <TableCell align="right">Eficiência</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {Array.isArray(metrics.topPerformers?.chambers) && metrics.topPerformers.chambers.length > 0 ? (
                    metrics.topPerformers.chambers.map((chamber, index) => (
                      <TableRow key={index}>
                        <TableCell component="th" scope="row">
                          {chamber.name}
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${chamber.occupancyRate}%`}
                            color={chamber.occupancyRate > 90 ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={`${chamber.efficiency}%`}
                            color={chamber.efficiency > 95 ? 'success' : 'default'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} align="center">
                        <Typography variant="body2" color="textSecondary">
                          Dados de performance não disponíveis
                        </Typography>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Capacidade Total */}
        <Card sx={{ flex: '1 1 100%' }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Utilização de Capacidade
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 2 }}>
              <Box sx={{ flex: '1 1 calc(33.333% - 16px)', textAlign: 'center' }}>
                <Typography variant="h3" color="primary">
                  {formatWeightSmart(metrics.usedCapacityKg || 0)}
                </Typography>
                <Typography color="textSecondary">
                  Capacidade Utilizada
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 calc(33.333% - 16px)', textAlign: 'center' }}>
                <Typography variant="h3" color="textSecondary">
                  {formatWeightSmart(metrics.totalCapacityKg || 0)}
                </Typography>
                <Typography color="textSecondary">
                  Capacidade Total
                </Typography>
              </Box>
              <Box sx={{ flex: '1 1 calc(33.333% - 16px)', textAlign: 'center' }}>
                <Typography variant="h3" color="success.main">
                  {formatWeightSmart((metrics.totalCapacityKg || 0) - (metrics.usedCapacityKg || 0))}
                </Typography>
                <Typography color="textSecondary">
                  Capacidade Livre
                </Typography>
              </Box>
            </Box>

            <Divider sx={{ my: 3 }} />

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                Utilização Geral
              </Typography>
              <LinearProgress
                variant="determinate"
                value={metrics.occupancyRate || 0}
                sx={{ height: 12, borderRadius: 6 }}
              />
              <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                {metrics.occupancyRate || 0}% da capacidade total utilizada
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
}; 