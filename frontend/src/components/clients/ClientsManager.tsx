import React, { useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Alert,
  Fab,
} from '@mui/material';
import {
  Add as AddIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';

import { useClients } from '../../hooks/useClients';
import { Client, CreateClientFormData, UpdateClientFormData, ClientFilters } from '../../types';
import { ClientForm } from './ClientForm';
import { ClientList } from './ClientList';

export const ClientsManager: React.FC = () => {
  const {
    clients,
    loading,
    error,
    createClient,
    updateClient,
    deleteClient,
    fetchClients,
    clearError
  } = useClients();

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const handleOpenForm = useCallback(() => {
    setEditingClient(null);
    setFormOpen(true);
    clearError();
  }, [clearError]);

  const handleCloseForm = useCallback(() => {
    setFormOpen(false);
    setEditingClient(null);
    setSubmitLoading(false);
  }, []);

  const handleEditClient = useCallback((client: Client) => {
    setEditingClient(client);
    setFormOpen(true);
    clearError();
  }, [clearError]);

  const handleSubmitForm = useCallback(async (data: CreateClientFormData | UpdateClientFormData) => {
    setSubmitLoading(true);
    try {
      if (editingClient) {
        // Editando cliente existente
        await updateClient(editingClient.id, data as UpdateClientFormData);
        console.log('✅ Cliente atualizado com sucesso');
      } else {
        // Criando novo cliente
        await createClient(data as CreateClientFormData);
        console.log('✅ Cliente criado com sucesso');
      }
      handleCloseForm();
    } catch (error: any) {
      console.error('❌ Erro ao salvar cliente:', error);
      // Erro já é tratado pelo hook useClients
      throw error; // Re-throw para que o form possa lidar com ele
    } finally {
      setSubmitLoading(false);
    }
  }, [editingClient, updateClient, createClient, handleCloseForm]);

  const handleDeleteClient = useCallback(async (client: Client) => {
    try {
      await deleteClient(client.id);
      console.log('✅ Cliente excluído com sucesso');
    } catch (error: any) {
      console.error('❌ Erro ao excluir cliente:', error);
      // Erro já é tratado pelo hook useClients
    }
  }, [deleteClient]);

  const handleRefresh = useCallback(() => {
    fetchClients();
    clearError();
  }, [fetchClients, clearError]);

  const handleFiltersChange = useCallback((filters: ClientFilters) => {
    fetchClients(filters);
  }, [fetchClients]);

  return (
    <Box>
      {/* Header com título e ações */}
      <Box sx={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        mb: 3 
      }}>
        <Box>
          <Typography variant="h5" gutterBottom>
            Gerenciamento de Clientes
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Cadastre e gerencie os clientes do sistema. 
            Clientes podem ser associados aos produtos para melhor rastreabilidade.
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenForm}
            disabled={loading}
          >
            Novo Cliente
          </Button>
        </Box>
      </Box>

      {/* Estatísticas rápidas */}
      {clients.length > 0 && (
        <Box sx={{ 
          display: 'flex', 
          gap: 2, 
          mb: 3,
          p: 2,
          backgroundColor: 'background.default',
          borderRadius: 1,
          border: '1px solid',
          borderColor: 'divider',
        }}>
          <Box>
            <Typography variant="h6" color="primary">
              {clients.length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total de clientes
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="success.main">
              {clients.filter(c => c.isActive).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Clientes ativos
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="info.main">
              {clients.filter(c => c.documentType === 'CPF').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pessoas físicas
            </Typography>
          </Box>
          <Box>
            <Typography variant="h6" color="warning.main">
              {clients.filter(c => c.documentType === 'CNPJ').length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pessoas jurídicas
            </Typography>
          </Box>
        </Box>
      )}

      {/* Lista de clientes */}
      <ClientList
        clients={clients}
        loading={loading}
        error={error}
        onEdit={handleEditClient}
        onDelete={handleDeleteClient}
        onRefresh={handleRefresh}
        onFiltersChange={handleFiltersChange}
      />

      {/* Formulário de cliente */}
      <ClientForm
        open={formOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmitForm}
        client={editingClient}
        title={editingClient ? 'Editar Cliente' : 'Novo Cliente'}
      />

      {/* Floating Action Button para dispositivos móveis */}
      <Fab
        color="primary"
        aria-label="add client"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          display: { xs: 'flex', md: 'none' }
        }}
        onClick={handleOpenForm}
      >
        <AddIcon />
      </Fab>

      {/* Alert de erro global */}
      {error && (
        <Alert 
          severity="error" 
          onClose={clearError}
          sx={{ mt: 2 }}
        >
          {error}
        </Alert>
      )}
    </Box>
  );
};

export default ClientsManager;