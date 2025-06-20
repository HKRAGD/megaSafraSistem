import React from 'react';
import {
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import { MovementFilters, MovementConfig } from '../utils/movementHistoryUtils';

interface MovementHistoryFiltersProps {
  filters: MovementFilters;
  onFilterChange: (field: string | number | symbol, value: string) => void;
}

export const MovementHistoryFilters: React.FC<MovementHistoryFiltersProps> = React.memo(({
  filters,
  onFilterChange,
}) => {
  return (
    <Box sx={{ mb: 3 }}>
      <Grid container spacing={2}>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <FormControl fullWidth size="small">
            <InputLabel>Tipo de Movimentação</InputLabel>
            <Select
              value={filters.type}
              label="Tipo de Movimentação"
              onChange={(e) => onFilterChange('type', e.target.value)}
            >
              <MenuItem value="">Todos</MenuItem>
              {Object.entries(MovementConfig.types).map(([type, config]) => (
                <MenuItem key={type} value={type}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
        <Grid
          size={{
            xs: 12,
            sm: 6
          }}>
          <FormControl fullWidth size="small">
            <InputLabel>Período</InputLabel>
            <Select
              value={filters.period}
              label="Período"
              onChange={(e) => onFilterChange('period', e.target.value)}
            >
              {Object.entries(MovementConfig.periods).map(([period, config]) => (
                <MenuItem key={period} value={period}>
                  {config.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Grid>
      </Grid>
    </Box>
  );
}); 