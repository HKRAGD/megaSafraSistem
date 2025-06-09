import React, { useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormGroup,
  FormControlLabel,
  TextField,
  Grid,
  Divider,
  Chip,
  Alert,
  Button
} from '@mui/material';
import {
  Save as SaveIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  Storage as StorageIcon,
  Speed as PerformanceIcon,
  Security as SecurityIcon,
  Notifications as NotificationIcon,
} from '@mui/icons-material';

interface SystemConfig {
  alertsEnabled: boolean;
  autoBackup: boolean;
  debugMode: boolean;
  maxProductsPerLocation: number;
  temperatureAlertThreshold: number;
  humidityAlertThreshold: number;
  lowStockThreshold: number;
  sessionTimeout: number;
}

export const SystemSettings: React.FC = () => {
  const [config, setConfig] = useState<SystemConfig>({
    alertsEnabled: true,
    autoBackup: true,
    debugMode: false,
    maxProductsPerLocation: 1, // Regra crítica: uma localização = um produto
    temperatureAlertThreshold: 5,
    humidityAlertThreshold: 10,
    lowStockThreshold: 10,
    sessionTimeout: 15,
  });

  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(new Date());

  const handleConfigChange = (key: keyof SystemConfig, value: any) => {
    setConfig(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Simular chamada para API
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastSaved(new Date());
      // TODO: Implementar chamada real para API de configurações
      console.log('Configurações salvas:', config);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setConfig({
      alertsEnabled: true,
      autoBackup: true,
      debugMode: false,
      maxProductsPerLocation: 1,
      temperatureAlertThreshold: 5,
      humidityAlertThreshold: 10,
      lowStockThreshold: 10,
      sessionTimeout: 15,
    });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h6">
            Configurações do Sistema
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Gerencie as configurações gerais do sistema
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            startIcon={<RefreshIcon />}
            onClick={handleReset}
            color="inherit"
          >
            Restaurar Padrão
          </Button>
          <Button
            variant="contained"
            startIcon={<SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </Box>
      </Box>

      {lastSaved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckIcon fontSize="small" />
            <Typography variant="body2">
              Configurações salvas com sucesso em {lastSaved.toLocaleString()}
            </Typography>
          </Box>
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Configurações de Alertas */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <NotificationIcon sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">
                  Alertas e Notificações
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.alertsEnabled}
                      onChange={(e) => handleConfigChange('alertsEnabled', e.target.checked)}
                    />
                  }
                  label="Habilitar Alertas"
                />

                <TextField
                  label="Limite de Alerta de Temperatura"
                  type="number"
                  value={config.temperatureAlertThreshold}
                  onChange={(e) => handleConfigChange('temperatureAlertThreshold', Number(e.target.value))}
                  InputProps={{
                    endAdornment: '°C'
                  }}
                  helperText="Diferença máxima da temperatura ideal antes de alertar"
                  size="small"
                />

                <TextField
                  label="Limite de Alerta de Umidade"
                  type="number"
                  value={config.humidityAlertThreshold}
                  onChange={(e) => handleConfigChange('humidityAlertThreshold', Number(e.target.value))}
                  InputProps={{
                    endAdornment: '%'
                  }}
                  helperText="Diferença máxima da umidade ideal antes de alertar"
                  size="small"
                />

                <TextField
                  label="Limite de Estoque Baixo"
                  type="number"
                  value={config.lowStockThreshold}
                  onChange={(e) => handleConfigChange('lowStockThreshold', Number(e.target.value))}
                  InputProps={{
                    endAdornment: '%'
                  }}
                  helperText="Percentual de ocupação para alertar estoque baixo"
                  size="small"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Configurações de Segurança */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <SecurityIcon sx={{ mr: 1, color: 'error.main' }} />
                <Typography variant="h6">
                  Segurança e Sessão
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <TextField
                  label="Timeout de Sessão"
                  type="number"
                  value={config.sessionTimeout}
                  onChange={(e) => handleConfigChange('sessionTimeout', Number(e.target.value))}
                  InputProps={{
                    endAdornment: 'min'
                  }}
                  helperText="Tempo em minutos para expirar sessão inativa"
                  size="small"
                />

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.debugMode}
                      onChange={(e) => handleConfigChange('debugMode', e.target.checked)}
                    />
                  }
                  label="Modo Debug"
                />

                <Alert severity="warning" variant="outlined">
                  <Typography variant="body2">
                    <strong>Atenção:</strong> O modo debug deve ser usado apenas durante desenvolvimento.
                    Desative em produção por questões de segurança.
                  </Typography>
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Configurações de Armazenamento */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <StorageIcon sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">
                  Armazenamento
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Box>
                  <TextField
                    label="Produtos por Localização"
                    type="number"
                    value={config.maxProductsPerLocation}
                    onChange={(e) => handleConfigChange('maxProductsPerLocation', Number(e.target.value))}
                    size="small"
                    disabled
                  />
                  <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Chip 
                      label="REGRA CRÍTICA" 
                      color="error" 
                      size="small"
                      icon={<WarningIcon fontSize="small" />}
                    />
                    <Typography variant="caption" color="text.secondary">
                      Esta configuração não pode ser alterada (regra de negócio)
                    </Typography>
                  </Box>
                </Box>

                <FormControlLabel
                  control={
                    <Switch
                      checked={config.autoBackup}
                      onChange={(e) => handleConfigChange('autoBackup', e.target.checked)}
                    />
                  }
                  label="Backup Automático"
                />

                <Alert severity="info" variant="outlined">
                  <Typography variant="body2">
                    O backup automático é executado diariamente às 2:00 AM e mantém
                    os últimos 30 dias de dados.
                  </Typography>
                </Alert>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Configurações de Performance */}
        <Grid size={{ xs: 12, md: 6 }}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <PerformanceIcon sx={{ mr: 1, color: 'success.main' }} />
                <Typography variant="h6">
                  Performance
                </Typography>
              </Box>
              <Divider sx={{ mb: 3 }} />

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <Alert severity="info" variant="outlined">
                  <Typography variant="body2">
                    <strong>Cache:</strong> 5 minutos para dados frequentes<br/>
                    <strong>Paginação:</strong> 50 itens por página<br/>
                    <strong>Debounce:</strong> 300ms para buscas<br/>
                    <strong>Refresh:</strong> Automático a cada 30 segundos
                  </Typography>
                </Alert>

                <Typography variant="body2" color="text.secondary">
                  As configurações de performance são otimizadas automaticamente
                  e não podem ser alteradas pelos usuários.
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Informações de Conectividade */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Status da Conectividade
          </Typography>
          <Divider sx={{ mb: 3 }} />

          <Grid container spacing={3}>
            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip 
                  label="Backend" 
                  color="success" 
                  icon={<CheckIcon />}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  http://localhost:3001/api
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip 
                  label="MongoDB" 
                  color="success" 
                  icon={<CheckIcon />}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  sistema-sementes-test
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip 
                  label="Autenticação" 
                  color="success" 
                  icon={<CheckIcon />}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  JWT Ativo
                </Typography>
              </Box>
            </Grid>

            <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <Box sx={{ textAlign: 'center' }}>
                <Chip 
                  label="Cache" 
                  color="success" 
                  icon={<CheckIcon />}
                  sx={{ mb: 1 }}
                />
                <Typography variant="body2" color="text.secondary">
                  5min TTL
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
}; 