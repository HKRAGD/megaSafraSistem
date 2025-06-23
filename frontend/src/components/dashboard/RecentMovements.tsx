import React, { useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Box,
  Chip,
  Divider,
  Button,
} from '@mui/material';
import {
  ArrowUpward as EntryIcon,
  ArrowDownward as ExitIcon,
  SwapHoriz as TransferIcon,
  Edit as AdjustmentIcon,
  AccessTime as TimeIcon,
} from '@mui/icons-material';
import { useDashboard } from '../../hooks/useDashboard';
import { MovementType } from '../../types';

const getMovementIcon = (type: MovementType) => {
  switch (type) {
    case 'entry':
      return <EntryIcon sx={{ color: '#4caf50' }} />;
    case 'exit':
      return <ExitIcon sx={{ color: '#f44336' }} />;
    case 'transfer':
      return <TransferIcon sx={{ color: '#2196f3' }} />;
    case 'adjustment':
      return <AdjustmentIcon sx={{ color: '#ff9800' }} />;
    default:
      return <TimeIcon />;
  }
};

const getMovementColor = (type: MovementType) => {
  switch (type) {
    case 'entry':
      return 'success';
    case 'exit':
      return 'error';
    case 'transfer':
      return 'primary';
    case 'adjustment':
      return 'warning';
    default:
      return 'default';
  }
};

const getMovementText = (type: MovementType) => {
  switch (type) {
    case 'entry':
      return 'Entrada';
    case 'exit':
      return 'Saída';
    case 'transfer':
      return 'Transferência';
    case 'adjustment':
      return 'Ajuste';
    default:
      return type;
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor(diffMs / (1000 * 60));

  if (diffMinutes < 60) {
    return `${diffMinutes}m atrás`;
  } else if (diffHours < 24) {
    return `${diffHours}h atrás`;
  } else {
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
};

export const RecentMovements: React.FC = () => {
  const { recentMovements, loading, refreshRecentMovements } = useDashboard();

  // Remover auto-fetch aqui - deixar para o DashboardPage controlar
  // O dashboard já carrega todos os dados, incluindo movements
  // useEffect(() => {
  //   refreshRecentMovements();
  // }, [refreshRecentMovements]);

  // Garantir que movements seja sempre um array
  const movements = Array.isArray(recentMovements) ? recentMovements : [];

  if (loading) {
    return (
      <Card elevation={2}>
        <CardContent>
          <Typography variant="h6" fontWeight="bold" gutterBottom>
            Movimentações Recentes
          </Typography>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              Carregando movimentações...
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card elevation={2}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" fontWeight="bold">
            Movimentações Recentes
          </Typography>
          <Button size="small" color="primary">
            Ver todas
          </Button>
        </Box>

        {movements.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              Nenhuma movimentação recente
            </Typography>
          </Box>
        ) : (
          <List disablePadding>
            {movements.slice(0, 5).map((movement, index) => (
              <React.Fragment key={movement.id}>
                <ListItem
                  sx={{
                    px: 0,
                    py: 1.5,
                    '&:hover': {
                      bgcolor: 'action.hover',
                      borderRadius: 1,
                    },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 40 }}>
                    {getMovementIcon(movement.type)}
                  </ListItemIcon>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                        <Typography variant="body2" fontWeight="medium">
                          {movement.productName}
                        </Typography>
                        <Chip
                          label={getMovementText(movement.type)}
                          size="small"
                          color={getMovementColor(movement.type) as any}
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {movement.type === 'entry' && movement.toLocation && 
                            `Para: ${movement.toLocation}`
                          }
                          {movement.type === 'exit' && movement.fromLocation && 
                            `De: ${movement.fromLocation}`
                          }
                          {movement.type === 'transfer' && movement.fromLocation && movement.toLocation && 
                            `${movement.fromLocation} → ${movement.toLocation}`
                          }
                          {movement.type === 'adjustment' && movement.fromLocation && 
                            `Local: ${movement.fromLocation}`
                          }
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {movement.weight}kg • {movement.userName} • {formatTimestamp(movement.timestamp)}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
                {index < movements.length - 1 && index < 4 && <Divider />}
              </React.Fragment>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}; 