import React, { useState } from 'react';
import {
  Container,
  Typography,
  Box,
  Tabs,
  Tab,
  Card,
  CardContent,
  Breadcrumbs,
  Link,
  Divider,
  Grid,
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Nature as SeedIcon,
  People as ClientsIcon,
  Security as SecurityIcon,
  Notifications as NotificationsIcon,
  Backup as BackupIcon,
  Info as InfoIcon,
} from '@mui/icons-material';

import { PageHeader } from '../../components/layout/PageHeader';
import { SeedTypesManager } from '../../components/settings/SeedTypesManager';
import { SystemSettings } from '../../components/settings/SystemSettings';
import { ClientsManager } from '../../components/clients/ClientsManager';
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
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const [tabValue, setTabValue] = useState(0);

  // Verificar permissões - apenas admin e operator podem acessar configurações
  // Não há mais role 'viewer', apenas ADMIN e OPERATOR

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const canManageSystem = user?.role === 'ADMIN';

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <PageHeader
        title="Configurações"
        subtitle="Gerenciamento de configurações do sistema e tipos de sementes"
      />
      {/* Breadcrumbs */}
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link underline="hover" color="inherit" href="/dashboard">
          Dashboard
        </Link>
        <Typography color="text.primary">Configurações</Typography>
      </Breadcrumbs>
      {/* Tabs de navegação */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab 
              icon={<SeedIcon />} 
              label="Tipos de Sementes" 
              id="settings-tab-0"
              aria-controls="settings-tabpanel-0"
            />
            <Tab 
              icon={<ClientsIcon />} 
              label="Clientes" 
              id="settings-tab-1"
              aria-controls="settings-tabpanel-1"
            />
            {canManageSystem && (
              <Tab 
                icon={<SettingsIcon />} 
                label="Sistema" 
                id="settings-tab-2"
                aria-controls="settings-tabpanel-2"
              />
            )}
            {canManageSystem && (
              <Tab 
                icon={<SecurityIcon />} 
                label="Segurança" 
                id="settings-tab-3"
                aria-controls="settings-tabpanel-3"
              />
            )}
            {canManageSystem && (
              <Tab 
                icon={<NotificationsIcon />} 
                label="Notificações" 
                id="settings-tab-4"
                aria-controls="settings-tabpanel-4"
              />
            )}
            {canManageSystem && (
              <Tab 
                icon={<BackupIcon />} 
                label="Backup" 
                id="settings-tab-5"
                aria-controls="settings-tabpanel-5"
              />
            )}
          </Tabs>
        </Box>

        <CardContent>
          {/* Tab 0: Tipos de Sementes */}
          <TabPanel value={tabValue} index={0}>
            <SeedTypesManager />
          </TabPanel>

          {/* Tab 1: Clientes */}
          <TabPanel value={tabValue} index={1}>
            <ClientsManager />
          </TabPanel>

          {/* Tab 2: Configurações do Sistema */}
          {canManageSystem && (
            <TabPanel value={tabValue} index={2}>
              <SystemSettings />
            </TabPanel>
          )}

          {/* Tab 3: Configurações de Segurança */}
          {canManageSystem && (
            <TabPanel value={tabValue} index={3}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Configurações de Segurança
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Esta seção está em desenvolvimento. Em breve você poderá configurar:
                  políticas de senha, tempo de sessão, tentativas de login, e outras configurações de segurança.
                </Alert>
                
                <Grid container spacing={3}>
                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Políticas de Senha
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Mínimo 8 caracteres<br/>
                          • Pelo menos 1 letra maiúscula<br/>
                          • Pelo menos 1 número<br/>
                          • Pelo menos 1 caractere especial
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                  
                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Sessão de Usuário
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Tempo de expiração: 15 minutos<br/>
                          • Refresh token: 7 dias<br/>
                          • Logout automático por inatividade
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          )}

          {/* Tab 4: Configurações de Notificações */}
          {canManageSystem && (
            <TabPanel value={tabValue} index={4}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Configurações de Notificações
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Esta seção está em desenvolvimento. Em breve você poderá configurar:
                  alertas de temperatura, notificações de vencimento, e outros tipos de notificações.
                </Alert>

                <Grid container spacing={3}>
                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Alertas de Temperatura
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Notificar quando temperatura sair da faixa ideal<br/>
                          • Enviar alertas críticos por email<br/>
                          • Dashboard com indicadores visuais
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Notificações de Vencimento
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Alertar produtos com vencimento em 30 dias<br/>
                          • Alertas críticos para produtos vencidos<br/>
                          • Relatórios periódicos de produtos próximos ao vencimento
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          )}

          {/* Tab 5: Configurações de Backup */}
          {canManageSystem && (
            <TabPanel value={tabValue} index={5}>
              <Box>
                <Typography variant="h6" gutterBottom>
                  Configurações de Backup
                </Typography>
                <Alert severity="info" sx={{ mb: 3 }}>
                  Esta seção está em desenvolvimento. Em breve você poderá configurar:
                  backups automáticos, frequência de backup, e restauração de dados.
                </Alert>

                <Grid container spacing={3}>
                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Backup Automático
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Backup diário automático<br/>
                          • Retenção de 30 dias<br/>
                          • Backup incremental para otimização
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>

                  <Grid size={12}>
                    <Card variant="outlined">
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Restauração
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          • Restauração pontual<br/>
                          • Verificação de integridade<br/>
                          • Log detalhado de operações
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              </Box>
            </TabPanel>
          )}
        </CardContent>
      </Card>
      {/* Informações do Sistema */}
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <InfoIcon sx={{ mr: 1 }} />
            <Typography variant="h6">
              Informações do Sistema
            </Typography>
          </Box>
          <Divider sx={{ mb: 2 }} />
          
          <Grid container spacing={3}>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Versão:</strong> 1.0.0
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Ambiente:</strong> Desenvolvimento
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Última Atualização:</strong> 05/06/2025
              </Typography>
            </Grid>
            <Grid
              size={{
                xs: 12,
                md: 6
              }}>
              <Typography variant="body2" color="text.secondary">
                <strong>Usuário:</strong> {user?.name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Perfil:</strong> {user?.role}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Email:</strong> {user?.email}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Container>
  );
}; 