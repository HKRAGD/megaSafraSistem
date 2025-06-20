import React, { useState, useEffect, useMemo } from 'react';
import {
  Autocomplete,
  TextField,
  Box,
  Typography,
  Chip,
  CircularProgress,
  InputAdornment,
  Alert,
} from '@mui/material';
import {
  Person as PersonIcon,
  Business as BusinessIcon,
  Search as SearchIcon,
} from '@mui/icons-material';

import { Client } from '../../../types';
import { useClients } from '../../../hooks/useClients';
import { clientService } from '../../../services/clientService';

export interface ClientSelectorProps {
  value?: string | null;
  onChange: (clientId: string | null) => void;
  label?: string;
  placeholder?: string;
  error?: boolean;
  helperText?: string;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
  size?: 'small' | 'medium';
}

export const ClientSelector: React.FC<ClientSelectorProps> = ({
  value,
  onChange,
  label = 'Cliente',
  placeholder = 'Selecione um cliente',
  error = false,
  helperText,
  disabled = false,
  required = false,
  fullWidth = true,
  size = 'medium',
}) => {
  const { clients, loading, fetchClients, searchClients } = useClients({ autoFetch: false });
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Client[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);

  // Carregar clientes iniciais quando o componente abre
  useEffect(() => {
    if (open && clients.length === 0) {
      fetchClients({ limit: 50, isActive: true });
    }
  }, [open, clients.length, fetchClients]);

  // Buscar clientes quando o usuário digita
  useEffect(() => {
    const searchAsync = async () => {
      if (searchTerm && searchTerm.length >= 2) {
        setSearching(true);
        try {
          const results = await searchClients(searchTerm);
          setSearchResults(results);
        } catch (error) {
          console.error('Erro ao buscar clientes:', error);
          setSearchResults([]);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
        setSearching(false);
      }
    };

    const timeoutId = setTimeout(searchAsync, 300);
    return () => clearTimeout(timeoutId);
  }, [searchTerm, searchClients]);

  // Combinar clientes carregados com resultados da busca
  const availableClients = useMemo(() => {
    const allClients = searchTerm ? searchResults : clients;
    
    // Filtrar apenas clientes ativos e remover duplicatas
    const activeClients = allClients.filter(client => client.isActive);
    const uniqueClients = activeClients.filter((client, index, self) => 
      index === self.findIndex(c => c.id === client.id)
    );

    return uniqueClients.sort((a, b) => a.name.localeCompare(b.name));
  }, [clients, searchResults, searchTerm]);

  // Encontrar cliente selecionado
  const selectedClient = useMemo(() => {
    if (!value) return null;
    return availableClients.find(client => client.id === value) || null;
  }, [value, availableClients]);

  const handleChange = (event: any, newValue: Client | null) => {
    onChange(newValue ? newValue.id : null);
  };

  const handleInputChange = (event: any, newInputValue: string) => {
    setSearchTerm(newInputValue);
  };

  const renderOption = (props: any, client: Client) => (
    <Box component="li" {...props} key={client.id}>
      <Box sx={{ display: 'flex', alignItems: 'center', width: '100%' }}>
        {client.documentType === 'CPF' ? (
          <PersonIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
        ) : (
          <BusinessIcon sx={{ mr: 1, color: 'primary.main', fontSize: 20 }} />
        )}
        
        <Box sx={{ flex: 1 }}>
          <Typography variant="body1">
            {client.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {client.documentType}: {clientService.formatDocument(client.document, client.documentType)}
            {client.email && ` • ${client.email}`}
          </Typography>
        </Box>

        <Chip
          label={client.documentType}
          size="small"
          color={client.documentType === 'CPF' ? 'primary' : 'secondary'}
          sx={{ ml: 1 }}
        />
      </Box>
    </Box>
  );

  const renderTags = (tagValue: Client[], getTagProps: any) =>
    tagValue.map((client, index) => (
      <Chip
        {...getTagProps({ index })}
        key={client.id}
        label={client.name}
        icon={client.documentType === 'CPF' ? <PersonIcon /> : <BusinessIcon />}
        size={size}
      />
    ));

  return (
    <Autocomplete
      value={selectedClient}
      onChange={handleChange}
      onInputChange={handleInputChange}
      onOpen={() => setOpen(true)}
      onClose={() => setOpen(false)}
      options={availableClients}
      getOptionLabel={(client) => client.name}
      renderOption={renderOption}
      loading={loading || searching}
      disabled={disabled}
      fullWidth={fullWidth}
      size={size}
      noOptionsText={
        searchTerm && searchTerm.length < 2
          ? 'Digite pelo menos 2 caracteres para buscar'
          : availableClients.length === 0
          ? 'Nenhum cliente encontrado'
          : 'Nenhuma opção'
      }
      loadingText="Carregando clientes..."
      renderInput={(params) => (
        <TextField
          {...params}
          label={required ? `${label} *` : label}
          placeholder={placeholder}
          error={error}
          helperText={helperText}
          InputProps={{
            ...params.InputProps,
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color={error ? 'error' : 'action'} />
              </InputAdornment>
            ),
            endAdornment: (
              <>
                {(loading || searching) ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {params.InputProps.endAdornment}
              </>
            ),
          }}
        />
      )}
      renderTags={renderTags}
      isOptionEqualToValue={(option, value) => option.id === value.id}
    />
  );
};

export default ClientSelector;