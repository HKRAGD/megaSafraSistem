import React, { useState, useEffect, useMemo, useCallback } from 'react';
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

export const ClientSelector: React.FC<ClientSelectorProps> = React.memo(({
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
  const [hasInitialLoad, setHasInitialLoad] = useState(false);

  // Função estável para carregar clientes iniciais
  const loadInitialClients = useCallback(async () => {
    if (!hasInitialLoad) {
      try {
        await fetchClients({ limit: 50, isActive: true });
        setHasInitialLoad(true);
      } catch (error) {
        console.error('Erro ao carregar clientes iniciais:', error);
      }
    }
  }, [hasInitialLoad, fetchClients]);

  // Carregar clientes quando o componente abre
  useEffect(() => {
    if (open && clients.length === 0) {
      loadInitialClients();
    }
  }, [open, clients.length, loadInitialClients]);

  // Função estável para busca
  const performSearch = useCallback(async (term: string) => {
    if (term && term.length >= 2) {
      setSearching(true);
      try {
        const results = await searchClients(term);
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
  }, [searchClients]);

  // Buscar clientes quando o usuário digita (com debounce)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      performSearch(searchTerm);
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, performSearch]);

  // Combinar clientes carregados com resultados da busca
  const availableClients = useMemo(() => {
    const allClients = searchTerm ? searchResults : clients;
    
    if (!Array.isArray(allClients)) return [];
    
    const activeClients = allClients.filter(client => client && client.isActive);

    // Use um Map para garantir performance e unicidade (O(n))
    const clientMap = new Map<string, Client>();
    activeClients.forEach(client => {
      clientMap.set(client.id, client);
    });

    // Garante que o cliente selecionado (pelo `value`) esteja sempre nas opções,
    // mesmo que não esteja nos resultados da busca atual.
    if (value && !clientMap.has(value)) {
      const selectedInFullList = clients.find(c => c.id === value);
      if (selectedInFullList) {
        clientMap.set(selectedInFullList.id, selectedInFullList);
      }
    }

    const uniqueClients = Array.from(clientMap.values());

    return uniqueClients.sort((a, b) => a.name.localeCompare(b.name));
  }, [searchResults, searchTerm, clients, value]);

  // Encontrar cliente selecionado
  const selectedClient = useMemo(() => {
    if (!value) return null;
    return availableClients.find(client => client.id === value) || null;
  }, [value, availableClients]);

  // Handlers estáveis
  const handleChange = useCallback((event: any, newValue: Client | null) => {
    onChange(newValue ? newValue.id : null);
  }, [onChange]);

  const handleInputChange = useCallback((event: any, newInputValue: string) => {
    setSearchTerm(newInputValue);
  }, []);

  const handleOpen = useCallback(() => setOpen(true), []);
  const handleClose = useCallback(() => setOpen(false), []);

  // Funções estáveis para o Autocomplete - CORREÇÃO LOOP INFINITO
  const renderInput = useCallback((params: any) => (
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
  ), [required, label, placeholder, error, helperText, loading, searching]);

  const renderOption = useCallback((props: any, client: Client) => (
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
  ), []);

  const renderTags = useCallback((tagValue: Client[], getTagProps: any) =>
    tagValue.map((client, index) => (
      <Chip
        {...getTagProps({ index })}
        key={client.id}
        label={client.name}
        icon={client.documentType === 'CPF' ? <PersonIcon /> : <BusinessIcon />}
        size={size}
      />
    )), [size]);

  const isOptionEqualToValue = useCallback((option: Client, value: Client) => 
    option.id === value.id, 
  []);

  return (
    <Autocomplete
      value={selectedClient}
      onChange={handleChange}
      onInputChange={handleInputChange}
      onOpen={handleOpen}
      onClose={handleClose}
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
      renderInput={renderInput}
      renderTags={renderTags}
      isOptionEqualToValue={isOptionEqualToValue}
    />
  );
});

export default ClientSelector;