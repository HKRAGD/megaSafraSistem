import React, { ReactNode } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Collapse,
  IconButton,
  Divider
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon
} from '@mui/icons-material';

interface FormSectionProps {
  title: string;
  icon: ReactNode;
  children: ReactNode;
  collapsible?: boolean;
  defaultExpanded?: boolean;
  elevation?: number;
}

export const FormSection: React.FC<FormSectionProps> = ({
  title,
  icon,
  children,
  collapsible = false,
  defaultExpanded = true,
  elevation = 1
}) => {
  const [expanded, setExpanded] = React.useState(defaultExpanded);

  const handleToggle = () => {
    if (collapsible) {
      setExpanded(!expanded);
    }
  };

  return (
    <Card elevation={elevation} sx={{ mb: 3 }}>
      <CardContent sx={{ pb: 2 }}>
        {/* Header da Seção */}
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            cursor: collapsible ? 'pointer' : 'default',
            mb: 2 
          }}
          onClick={handleToggle}
        >
          <Box sx={{ mr: 2, color: 'primary.main' }}>
            {icon}
          </Box>
          
          <Typography 
            variant="h6" 
            component="h3" 
            sx={{ 
              fontWeight: 600,
              flex: 1,
              color: 'text.primary'
            }}
          >
            {title}
          </Typography>

          {collapsible && (
            <IconButton size="small" sx={{ ml: 1 }}>
              {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          )}
        </Box>

        {/* Divider */}
        <Divider sx={{ mb: 2 }} />

        {/* Conteúdo da Seção */}
        {collapsible ? (
          <Collapse in={expanded} timeout="auto" unmountOnExit>
            <Box>{children}</Box>
          </Collapse>
        ) : (
          <Box>{children}</Box>
        )}
      </CardContent>
    </Card>
  );
}; 