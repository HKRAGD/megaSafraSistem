import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Tabs,
  Tab,
  Chip,
  Alert,
  Breadcrumbs,
  Link,
} from '@mui/material';
import {
  Assessment as ReportIcon,
  Inventory as InventoryIcon,
  SwapHoriz as MovementIcon,
  Warning as ExpirationIcon,
  Storage as CapacityIcon,
  TrendingUp as ExecutiveIcon,
  Download as DownloadIcon,
  FilterList as FilterIcon,
  TableChart as TableIcon,
  PictureAsPdf as PdfIcon,
} from '@mui/icons-material';

import { PageHeader } from '../../components/layout/PageHeader';
import { InventoryReport } from '../../components/reports/InventoryReport';
import { MovementReport } from '../../components/reports/MovementReport';
import { ExpirationReport } from '../../components/reports/ExpirationReport';
import { CapacityReport } from '../../components/reports/CapacityReport';
import { ExecutiveReport } from '../../components/reports/ExecutiveReport';
import { useAuth } from '../../hooks/useAuth';

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
      id={`reports-tabpanel-${index}`}
      aria-labelledby={`reports-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

const ReportsPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const reportCards = [
    {
      id: 'inventory',
      title: 'Relatório de Estoque',
      description: 'Visualize o estoque atual por câmara, tipo de semente e localização',
      icon: <InventoryIcon sx={{ fontSize: 40, color: 'primary.main' }} />,
      color: 'primary',
      complexity: 'Detalhado',
      tabIndex: 0,
    },
    {
      id: 'movements',
      title: 'Relatório de Movimentações',
      description: 'Histórico completo de movimentações e transferências',
      icon: <MovementIcon sx={{ fontSize: 40, color: 'info.main' }} />,
      color: 'info',
      complexity: 'Temporal',
      tabIndex: 1,
    },
    {
      id: 'expiration',
      title: 'Produtos Próximos ao Vencimento',
      description: 'Produtos que vencem nos próximos 30 dias',
      icon: <ExpirationIcon sx={{ fontSize: 40, color: 'warning.main' }} />,
      color: 'warning',
      complexity: 'Crítico',
      tabIndex: 2,
    },
    {
      id: 'capacity',
      title: 'Relatório de Capacidade',
      description: 'Análise de ocupação e capacidade das câmaras',
      icon: <CapacityIcon sx={{ fontSize: 40, color: 'success.main' }} />,
      color: 'success',
      complexity: 'Analítico',
      tabIndex: 3,
    },
    {
      id: 'executive',
      title: 'Dashboard Executivo',
      description: 'Resumo executivo com KPIs e métricas principais',
      icon: <ExecutiveIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
      color: 'secondary',
      complexity: 'Estratégico',
      tabIndex: 4,
      requiresAdmin: true,
    },
  ];

  const availableReports = reportCards.filter(report => 
    !report.requiresAdmin || user?.role === 'ADMIN'
  );

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        <PageHeader
          title="Relatórios"
          subtitle="Gere relatórios detalhados e análises do sistema"
        />

        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" href="/dashboard">
            Dashboard
          </Link>
          <Typography color="text.primary">Relatórios</Typography>
        </Breadcrumbs>

        {/* Visão geral dos relatórios */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Dica:</strong> Todos os relatórios podem ser exportados em formato PDF ou Excel. 
            Use os filtros disponíveis para personalizar suas análises.
          </Typography>
        </Alert>

        {/* Grid de cards dos relatórios */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {availableReports.map((report) => (
            <Grid item xs={12} sm={6} md={4} key={report.id}>
              <Card 
                sx={{ 
                  height: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: 6,
                  }
                }}
                onClick={() => setTabValue(report.tabIndex)}
              >
                <CardContent sx={{ flexGrow: 1, textAlign: 'center' }}>
                  <Box sx={{ mb: 2 }}>
                    {report.icon}
                  </Box>
                  
                  <Typography variant="h6" gutterBottom>
                    {report.title}
                  </Typography>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {report.description}
                  </Typography>

                  <Chip 
                    label={report.complexity}
                    color={report.color as any}
                    size="small"
                    variant="outlined"
                  />
                </CardContent>

                <CardActions sx={{ justifyContent: 'center', pb: 2 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<ReportIcon />}
                    onClick={(e) => {
                      e.stopPropagation();
                      setTabValue(report.tabIndex);
                    }}
                  >
                    Gerar Relatório
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>

        {/* Tabs com os relatórios */}
        <Card>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={tabValue} onChange={handleTabChange} scrollButtons="auto" variant="scrollable">
              <Tab 
                icon={<InventoryIcon />} 
                label="Estoque" 
                id="reports-tab-0"
                aria-controls="reports-tabpanel-0"
              />
              <Tab 
                icon={<MovementIcon />} 
                label="Movimentações" 
                id="reports-tab-1"
                aria-controls="reports-tabpanel-1"
              />
              <Tab 
                icon={<ExpirationIcon />} 
                label="Vencimentos" 
                id="reports-tab-2"
                aria-controls="reports-tabpanel-2"
              />
              <Tab 
                icon={<CapacityIcon />} 
                label="Capacidade" 
                id="reports-tab-3"
                aria-controls="reports-tabpanel-3"
              />
              {user?.role === 'ADMIN' && (
                <Tab 
                  icon={<ExecutiveIcon />} 
                  label="Executivo" 
                  id="reports-tab-4"
                  aria-controls="reports-tabpanel-4"
                />
              )}
            </Tabs>
          </Box>

          {/* Conteúdo dos relatórios */}
          <TabPanel value={tabValue} index={0}>
            <InventoryReport />
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <MovementReport />
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <ExpirationReport />
          </TabPanel>

          <TabPanel value={tabValue} index={3}>
            <CapacityReport />
          </TabPanel>

          {user?.role === 'ADMIN' && (
            <TabPanel value={tabValue} index={4}>
              <ExecutiveReport />
            </TabPanel>
          )}
        </Card>

        {/* Informações adicionais */}
        <Card sx={{ mt: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Formatos de Exportação Disponíveis
            </Typography>
            
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PdfIcon color="error" />
                  <Typography variant="body2">
                    <strong>PDF:</strong> Relatórios formatados para impressão
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <TableIcon color="success" />
                  <Typography variant="body2">
                    <strong>Excel:</strong> Dados estruturados para análise
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <FilterIcon color="primary" />
                  <Typography variant="body2">
                    <strong>Filtros:</strong> Personalize por período e critério
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} sm={6} md={3}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <DownloadIcon color="info" />
                  <Typography variant="body2">
                    <strong>Download:</strong> Salve ou compartilhe facilmente
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
    </Container>
  );
};

export default ReportsPage; 