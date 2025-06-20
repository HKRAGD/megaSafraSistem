import React, { useState, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  IconButton,
  Button,
  Chip,
  Grid,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  Menu,
  MenuItem as DropdownMenuItem,
  Alert,
  Divider,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  MoreVert as MoreIcon,
  Person as PersonIcon,
  Business as BusinessIcon,
  Email as EmailIcon,
  Phone as PhoneIcon,
  LocationOn as LocationIcon,
} from '@mui/icons-material';

import { Client, ClientFilters } from '../../types';
import { clientService } from '../../services/clientService';
import { DataTable } from '../common/DataTable';
import { Modal } from '../common/Modal';

interface ClientListProps {
  clients: Client[];
  loading: boolean;
  error: string | null;
  onEdit: (client: Client) => void;
  onDelete: (client: Client) => void;
  onRefresh: () => void;
  onFiltersChange?: (filters: ClientFilters) => void;
}

export const ClientList: React.FC<ClientListProps> = ({
  clients,
  loading,
  error,
  onEdit,
  onDelete,
  onRefresh,
  onFiltersChange
}) => {
  const [filters, setFilters] = useState<ClientFilters>({
    search: '',
    documentType: undefined,
    isActive: undefined,
  });

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  const handleFilterChange = useCallback((key: keyof ClientFilters, value: any) => {
    const newFilters = {
      ...filters,
      [key]: value
    };
    setFilters(newFilters);
    
    if (onFiltersChange) {
      onFiltersChange(newFilters);
    }
  }, [filters, onFiltersChange]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, client: Client) => {
    setAnchorEl(event.currentTarget);
    setSelectedClient(client);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedClient(null);
  };

  const handleDeleteClick = (client: Client) => {
    setClientToDelete(client);
    setDeleteModalOpen(true);
    handleMenuClose();
  };

  const handleDeleteConfirm = async () => {
    if (clientToDelete) {
      await onDelete(clientToDelete);
      setDeleteModalOpen(false);
      setClientToDelete(null);
    }
  };

  const handleDeleteCancel = () => {
    setDeleteModalOpen(false);
    setClientToDelete(null);
  };

  const formatDocument = (document: string, type: 'CPF' | 'CNPJ') => {
    return clientService.formatDocument(document, type);
  };

  const renderClientCard = (client: Client) => (
    <Card key={client.id} sx={{ mb: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flex: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              {client.documentType === 'CPF' ? (
                <PersonIcon sx={{ mr: 1, color: 'primary.main' }} />
              ) : (
                <BusinessIcon sx={{ mr: 1, color: 'primary.main' }} />
              )}
              <Typography variant="h6" component="h3">
                {client.name}
              </Typography>
              <Chip
                label={client.isActive ? 'Ativo' : 'Inativo'}
                color={client.isActive ? 'success' : 'default'}
                size="small"
                sx={{ ml: 2 }}
              />
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12} md={6}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    <strong>{client.documentType}:</strong> {formatDocument(client.document, client.documentType)}
                  </Typography>
                </Box>

                {client.email && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <EmailIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {client.email}
                    </Typography>
                  </Box>
                )}

                {client.phone && (
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <PhoneIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {client.phone}
                    </Typography>
                  </Box>
                )}
              </Grid>

              <Grid item xs={12} md={6}>
                {client.address && (client.address.city || client.address.state) && (
                  <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 1 }}>
                    <LocationIcon sx={{ fontSize: 16, mr: 1, color: 'text.secondary', mt: 0.5 }} />
                    <Typography variant="body2" color="text.secondary">
                      {[client.address.city, client.address.state].filter(Boolean).join(', ')}
                    </Typography>
                  </Box>
                )}

                {client.notes && (
                  <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {client.notes.length > 100 ? `${client.notes.substring(0, 100)}...` : client.notes}
                  </Typography>
                )}
              </Grid>
            </Grid>
          </Box>

          <Box>
            <IconButton
              size="small"
              onClick={(e) => handleMenuOpen(e, client)}
            >
              <MoreIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );

  if (error) {
    return (
      <Alert 
        severity="error" 
        action={
          <Button color="inherit" size="small" onClick={onRefresh}>
            Tentar Novamente
          </Button>
        }
      >
        {error}
      </Alert>
    );
  }

  return (
    <Box>
      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                label="Buscar clientes"
                fullWidth
                size="small"
                value={filters.search || ''}
                onChange={(e) => handleFilterChange('search', e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
                placeholder="Nome, documento ou email..."
              />
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Tipo de Documento</InputLabel>
                <Select
                  value={filters.documentType || ''}
                  onChange={(e) => handleFilterChange('documentType', e.target.value || undefined)}
                  label="Tipo de Documento"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="CPF">CPF</MenuItem>
                  <MenuItem value="CNPJ">CNPJ</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Status</InputLabel>
                <Select
                  value={filters.isActive !== undefined ? String(filters.isActive) : ''}
                  onChange={(e) => handleFilterChange('isActive', e.target.value === '' ? undefined : e.target.value === 'true')}
                  label="Status"
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true">Ativo</MenuItem>
                  <MenuItem value="false">Inativo</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} md={2}>
              <Button
                variant="outlined"
                fullWidth
                onClick={onRefresh}
                disabled={loading}
              >
                Atualizar
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Lista de Clientes */}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography>Carregando clientes...</Typography>
        </Box>
      ) : clients.length === 0 ? (
        <Card>
          <CardContent>
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <PersonIcon sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                Nenhum cliente encontrado
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filters.search || filters.documentType || filters.isActive !== undefined
                  ? 'Tente ajustar os filtros ou criar um novo cliente.'
                  : 'Comece criando seu primeiro cliente.'}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {clients.map(renderClientCard)}
        </Box>
      )}

      {/* Menu de Ações */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <DropdownMenuItem onClick={() => {
          if (selectedClient) onEdit(selectedClient);
          handleMenuClose();
        }}>
          <EditIcon sx={{ mr: 1 }} />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => {
          if (selectedClient) handleDeleteClick(selectedClient);
        }}>
          <DeleteIcon sx={{ mr: 1 }} />
          Excluir
        </DropdownMenuItem>
      </Menu>

      {/* Modal de Confirmação de Exclusão */}
      <Modal
        open={deleteModalOpen}
        onClose={handleDeleteCancel}
        title="Confirmar Exclusão"
        maxWidth="sm"
        actions={
          <Box>
            <Button onClick={handleDeleteCancel} sx={{ mr: 1 }}>
              Cancelar
            </Button>
            <Button
              onClick={handleDeleteConfirm}
              variant="contained"
              color="error"
            >
              Excluir
            </Button>
          </Box>
        }
      >
        <Typography>
          Tem certeza que deseja excluir o cliente{' '}
          <strong>{clientToDelete?.name}</strong>?
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          Esta ação não pode ser desfeita.
        </Typography>
      </Modal>
    </Box>
  );
};

export default ClientList;