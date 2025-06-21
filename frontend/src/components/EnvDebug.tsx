import React from 'react';
import { Card, CardContent, Typography, Box, Chip } from '@mui/material';

/**
 * Componente para debug de variáveis de ambiente
 * Útil para verificar se as variáveis estão sendo carregadas no Vercel
 */
const EnvDebug: React.FC = () => {
  const envVars = {
    // Vercel específicas
    VERCEL_ENV: process.env.VERCEL_ENV,
    VERCEL_URL: process.env.VERCEL_URL,
    VERCEL_BRANCH_URL: process.env.VERCEL_BRANCH_URL,
    
    // Node.js
    NODE_ENV: process.env.NODE_ENV,
    
    // Nossas variáveis
    REACT_APP_API_URL_PUBLIC: process.env.REACT_APP_API_URL_PUBLIC,
    REACT_APP_API_URL_LOCAL: process.env.REACT_APP_API_URL_LOCAL,
    REACT_APP_LOCAL_IP: process.env.REACT_APP_LOCAL_IP,
    REACT_APP_PUBLIC_IP: process.env.REACT_APP_PUBLIC_IP,
    REACT_APP_API_URL: process.env.REACT_APP_API_URL,
    
    // Build específicas
    GENERATE_SOURCEMAP: process.env.GENERATE_SOURCEMAP,
    HOST: process.env.HOST,
  };

  const getStatusChip = (value: string | undefined) => {
    if (value === undefined) {
      return <Chip label="NÃO DEFINIDA" color="error" size="small" />;
    }
    if (value === '') {
      return <Chip label="VAZIA" color="warning" size="small" />;
    }
    return <Chip label="CONFIGURADA" color="success" size="small" />;
  };

  const getEnvironmentInfo = () => {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : 'N/A';
    const hostname = typeof window !== 'undefined' ? window.location.hostname : 'N/A';
    
    return {
      currentUrl,
      hostname,
      isProduction: process.env.NODE_ENV === 'production',
      isVercel: hostname.includes('vercel.app'),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
    };
  };

  const envInfo = getEnvironmentInfo();

  // Log para console também
  console.log('🐛 DEBUG - Variáveis de Ambiente:', envVars);
  console.log('🌍 DEBUG - Informações do Ambiente:', envInfo);

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" gutterBottom>
        🐛 Debug - Variáveis de Ambiente
      </Typography>
      
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            🌍 Informações do Ambiente
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <Typography><strong>URL Atual:</strong> {envInfo.currentUrl}</Typography>
            <Typography><strong>Hostname:</strong> {envInfo.hostname}</Typography>
            <Typography><strong>É Produção:</strong> {envInfo.isProduction ? 'SIM' : 'NÃO'}</Typography>
            <Typography><strong>É Vercel:</strong> {envInfo.isVercel ? 'SIM' : 'NÃO'}</Typography>
            <Typography><strong>VERCEL_ENV:</strong> {process.env.VERCEL_ENV || 'N/A'}</Typography>
          </Box>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            ⚙️ Variáveis de Ambiente
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {Object.entries(envVars).map(([key, value]) => (
              <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography component="span" sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>
                  {key}:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  {getStatusChip(value)}
                  {value && (
                    <Typography 
                      component="span" 
                      sx={{ 
                        fontFamily: 'monospace', 
                        fontSize: '0.8rem',
                        maxWidth: '300px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {value}
                    </Typography>
                  )}
                </Box>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mt: 2, backgroundColor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💡 Instruções para Vercel
          </Typography>
          <Typography variant="body2" component="div">
            <strong>1. Verificar variáveis no dashboard:</strong>
            <br />• Acesse: vercel.com → Seu Projeto → Settings → Environment Variables
            <br />• Adicione: REACT_APP_API_URL_PUBLIC = https://seu-backend.up.railway.app/api
            <br />• Environment: Production
            <br /><br />
            <strong>2. Redeploy:</strong>
            <br />• Após adicionar variáveis, faça um novo deploy
            <br />• Vercel precisa rebuild para incluir as variáveis
            <br /><br />
            <strong>3. Verificação:</strong>
            <br />• Esta página mostrará se as variáveis foram carregadas
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
};

export default EnvDebug;