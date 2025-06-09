import React from 'react';
import {
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent,
} from '@mui/lab';
import {
  Typography,
  Box,
  Card,
  CardContent,
  Chip,
  Grid,
} from '@mui/material';
import {
  Input as EntryIcon,
  Output as ExitIcon,
  SwapHoriz as TransferIcon,
  Edit as AdjustmentIcon,
  History as HistoryIcon,
  Person as PersonIcon,
  LocationOn as LocationIcon,
  Notes as NotesIcon,
} from '@mui/icons-material';
import { Movement } from '../../../../types';
import { getMovementConfig, formatDate, formatTime } from '../utils/movementHistoryUtils';

interface MovementHistoryItemProps {
  movement: Movement;
  isLast: boolean;
}

const getMovementIcon = (type: string) => {
  switch (type) {
    case 'entry':
      return <EntryIcon />;
    case 'exit':
      return <ExitIcon />;
    case 'transfer':
      return <TransferIcon />;
    case 'adjustment':
      return <AdjustmentIcon />;
    default:
      return <HistoryIcon />;
  }
};

export const MovementHistoryItem: React.FC<MovementHistoryItemProps> = React.memo(({
  movement,
  isLast,
}) => {
  const config = getMovementConfig(movement.type);

  return (
    <TimelineItem>
      <TimelineOppositeContent
        sx={{ m: 'auto 0', minWidth: '100px' }}
        align="right"
        variant="body2"
        color="text.secondary"
      >
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {formatDate(movement.timestamp)}
          </Typography>
          <Typography variant="caption">
            {formatTime(movement.timestamp)}
          </Typography>
        </Box>
      </TimelineOppositeContent>
      <TimelineSeparator>
        <TimelineDot color={config.color as any}>
          {getMovementIcon(movement.type)}
        </TimelineDot>
        {!isLast && <TimelineConnector />}
      </TimelineSeparator>
      <TimelineContent sx={{ py: '12px', px: 2 }}>
        <Card variant="outlined">
          <CardContent sx={{ pb: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="h6" component="div">
                {config.label}
              </Typography>
              <Chip
                label={config.label}
                color={config.color as any}
                size="small"
              />
            </Box>

            <Grid container spacing={2}>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <PersonIcon fontSize="small" color="action" />
                  <Typography variant="body2">
                    Usuário: {movement.userId || 'Sistema'}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Quantidade: {movement.quantity} unidades
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Peso: {movement.weight} kg
                  </Typography>
                </Box>
              </Grid>

              <Grid size={{ xs: 12, sm: 6 }}>
                {movement.fromLocationId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      De: {movement.fromLocationId}
                    </Typography>
                  </Box>
                )}

                {movement.toLocationId && (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <LocationIcon fontSize="small" color="action" />
                    <Typography variant="body2">
                      Para: {movement.toLocationId}
                    </Typography>
                  </Box>
                )}
              </Grid>
            </Grid>

            {movement.reason && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <NotesIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Motivo:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {movement.reason}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}

            {movement.notes && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                  <NotesIcon fontSize="small" color="action" sx={{ mt: 0.5 }} />
                  <Box>
                    <Typography variant="body2" fontWeight="medium">
                      Observações:
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {movement.notes}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            )}
          </CardContent>
        </Card>
      </TimelineContent>
    </TimelineItem>
  );
}); 