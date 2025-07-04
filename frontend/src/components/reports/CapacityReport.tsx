import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Card,
  CardContent,
  LinearProgress,
  CircularProgress,
  Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  PictureAsPdf as PdfIcon,
  TableChart as ExcelIcon,
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useReports } from '../../hooks/useReports';
import { exportCapacityPdf, exportCapacityExcel } from '../../services/export';

export const CapacityReport: React.FC = () => {
  const { loading, capacityData, generateCapacityReport } = useReports();
  const [error, setError] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  const reportData = capacityData;

  useEffect(() => {
    // Carregar dados automaticamente ao montar o componente
    handleGenerateReport();
  }, []);

  const handleGenerateReport = async () => {
    try {
      setError(null);
      console.log('🔍 DEBUG CapacityReport - Generating report...');
      const result = await generateCapacityReport();
      console.log('🔍 DEBUG CapacityReport - Result:', result);
    } catch (err: any) {
      setError(err.message || 'Erro ao gerar relatório de capacidade');
      console.error('❌ Erro ao gerar relatório de capacidade:', err);
    }
  };

  const handleExportPDF = async () => {
    if (!reportData) {
      enqueueSnackbar('Nenhum dado disponível para exportação', { variant: 'warning' });
      return;
    }

    try {
      setExportingPdf(true);
      await exportCapacityPdf(reportData, {
        reportTitle: 'Relatório de Capacidade das Câmaras',
        author: 'Sistema de Gerenciamento',
        filtersApplied: 'Todas as câmaras ativas'
      });
      enqueueSnackbar('Relatório PDF exportado com sucesso!', { variant: 'success' });
    } catch (error: any) {
      console.error('Erro ao exportar PDF:', error);
      enqueueSnackbar('Erro ao exportar PDF: ' + (error.message || 'Erro desconhecido'), { variant: 'error' });
    } finally {
      setExportingPdf(false);
    }
  };

  const handleExportExcel = async () => {
    if (!reportData) {
      enqueueSnackbar('Nenhum dado disponível para exportação', { variant: 'warning' });
      return;
    }

    try {
      setExportingExcel(true);
      await exportCapacityExcel(reportData, {
        reportTitle: 'Relatório de Capacidade das Câmaras',
        author: 'Sistema de Gerenciamento',
        filtersApplied: 'Todas as câmaras ativas'
      });
      enqueueSnackbar('Relatório Excel exportado com sucesso!', { variant: 'success' });
    } catch (error: any) {
      console.error('Erro ao exportar Excel:', error);
      enqueueSnackbar('Erro ao exportar Excel: ' + (error.message || 'Erro desconhecido'), { variant: 'error' });
    } finally {
      setExportingExcel(false);
    }
  };

  const getOccupancyColor = (rate: number) => {
    if (rate >= 0.9) return 'error';
    if (rate >= 0.7) return 'warning';
    return 'success';
  };

  const formatWeight = (weight: number | null | undefined) => {
    if (weight === null || weight === undefined || isNaN(weight)) return '0,00t';
    
    const weightInTons = weight / 1000;
    
    // Se for muito pequeno, mostrar em kg
    if (weightInTons < 0.1) {
      return weight.toLocaleString('pt-BR', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      }) + ' kg';
    }
    
    // Mostrar toneladas
    return weightInTons.toLocaleString('pt-BR', { 
      minimumFractionDigits: 1, 
      maximumFractionDigits: 1 
    }) + 't';
  };

  const formatPercentage = (rate: number) => {
    // Se rate é > 1, assumimos que já está em % (0-100)
    // Se rate é <= 1, assumimos que está em decimal (0-1) e convertemos
    if (rate > 1) {
      return Math.round(rate); // Já em %, só arredondar
    } else {
      return Math.round(rate * 100); // Converter de decimal para %
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1">
          Relatório de Capacidade das Câmaras
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            startIcon={<RefreshIcon />}
            onClick={handleGenerateReport}
            disabled={loading}
          >
            Atualizar
          </Button>
          
          {reportData && (
            <>
              <Button
                variant="outlined"
                startIcon={exportingPdf ? <CircularProgress size={16} /> : <PdfIcon />}
                onClick={handleExportPDF}
                disabled={loading || exportingPdf || exportingExcel}
              >
                {exportingPdf ? 'Exportando...' : 'PDF'}
              </Button>
              
              <Button
                variant="outlined"
                startIcon={exportingExcel ? <CircularProgress size={16} /> : <ExcelIcon />}
                onClick={handleExportExcel}
                disabled={loading || exportingPdf || exportingExcel}
              >
                {exportingExcel ? 'Exportando...' : 'Excel'}
              </Button>
            </>
          )}
        </Box>
      </Box>

      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
          <Typography sx={{ ml: 2 }}>Carregando dados de capacidade...</Typography>
        </Box>
      )}

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {!reportData && !loading && !error && (
        <Alert severity="info" sx={{ mb: 3 }}>
          Clique em "Atualizar" para gerar o relatório de capacidade
        </Alert>
      )}

      {reportData && !loading && (
        <>
          {/* Resumo Geral */}
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Resumo Geral do Sistema
              </Typography>
              
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 3 }}>
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="primary">
                    {reportData.summary?.totalChambers || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Câmaras Ativas
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="info.main">
                    {formatWeight(reportData.summary?.totalCapacity || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Capacidade Total
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="warning.main">
                    {formatWeight(reportData.summary?.totalUsed || 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Capacidade Utilizada
                  </Typography>
                </Box>
                
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4" color="success.main">
                    {formatPercentage(reportData.summary?.averageUtilization || 0)}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Utilização Média
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>

          {/* Análise por Câmara */}
          <Typography variant="h6" sx={{ mb: 2 }}>
            Análise por Câmara
          </Typography>
          
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: 3 }}>
            {reportData.data?.chamberAnalysis?.map((chamber: any, index: number) => (
              <Card key={chamber.chamberId || index} sx={{ height: '100%' }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    {chamber.name || `Câmara ${index + 1}`}
                  </Typography>
                  
                  <Box sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        Utilização
                      </Typography>
                      <Typography variant="body2" fontWeight="bold">
                        {formatPercentage(chamber.utilizationRate || 0)}%
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={formatPercentage(chamber.utilizationRate || 0)}
                      color={getOccupancyColor(chamber.utilizationRate || 0)}
                      sx={{ height: 10, borderRadius: 5 }}
                    />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Capacidade Total
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatWeight(chamber.totalCapacity || 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Capacidade Usada
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {formatWeight(chamber.usedCapacity || 0)}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Localizações Ocupadas
                      </Typography>
                      <Typography variant="body1" fontWeight="bold">
                        {chamber.locationsOccupied || 0} / {chamber.locationsTotal || 0}
                      </Typography>
                    </Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Espaço Disponível
                      </Typography>
                      <Typography 
                        variant="body1" 
                        fontWeight="bold"
                        color={(chamber.availableCapacity || 0) < 1000 ? 'error.main' : 'success.main'}
                      >
                        {formatWeight(chamber.availableCapacity || 0)}
                      </Typography>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>

          {/* Alertas e Projeções */}
          {reportData.data?.alerts && reportData.data.alerts.length > 0 && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Alertas de Capacidade
                </Typography>
                
                {reportData.data.alerts.map((alert: any, index: number) => (
                  <Alert key={index} severity={alert.severity || 'warning'} sx={{ mb: 1 }}>
                    {alert.message || alert}
                  </Alert>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Projeções */}
          {reportData.data?.projections && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Projeções de Capacidade
                </Typography>
                
                <Typography variant="body2" color="text.secondary">
                  Projeções baseadas no padrão atual de crescimento e utilização.
                </Typography>
                
                {/* Aqui pode ser expandido com visualizações mais detalhadas das projeções */}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </Box>
  );
}; 