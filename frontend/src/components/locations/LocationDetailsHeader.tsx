import React from 'react';
import {
  Typography,
  Box,
  Chip,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Inventory as PackageIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';

interface LocationDetailsHeaderProps {
  headerInfo: {
    code: string;
    isOccupied: boolean;
    statusColor: 'error' | 'success';
    statusLabel: string;
  };
  onClose: () => void;
}

export const LocationDetailsHeader: React.FC<LocationDetailsHeaderProps> = React.memo(({
  headerInfo,
  onClose,
}) => {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
      <Box>
        <Typography variant="h5" gutterBottom>
          {headerInfo.code}
        </Typography>
        <Chip
          icon={headerInfo.isOccupied ? <PackageIcon /> : <CheckIcon />}
          label={headerInfo.statusLabel}
          color={headerInfo.statusColor}
          sx={{ mb: 1 }}
        />
      </Box>
      <Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </Box>
    </Box>
  );
}); 