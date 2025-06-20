import React, { useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Typography,
  FormControlLabel,
  Switch,
  Alert,
  IconButton,
} from '@mui/material';
import {
  Close as CloseIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Visibility as VisibilityIcon,
} from '@mui/icons-material';
import { useForm, Controller, FieldError } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { User } from '../../types';

interface UserFormData {
  name: string;
  email: string;
  password?: string;
  confirmPassword?: string;
  role: 'ADMIN' | 'OPERATOR';
  isActive: boolean;
}

interface CreateUserData {
  name: string;
  email: string;
  role: 'ADMIN' | 'OPERATOR';
  isActive: boolean;
  password?: string;
}

interface UserFormProps {
  user: User | null;
  open: boolean;
  onClose: () => void;
  onSubmit: (userData: CreateUserData) => Promise<void>;
  currentUserId: string;
}

// Schema de validação
const createUserSchema = (isEditing: boolean) => yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  email: yup
    .string()
    .required('Email é obrigatório')
    .email('Email deve ter um formato válido'),
  password: isEditing 
    ? yup.string()
    : yup.string()
        .required('Senha é obrigatória')
        .min(6, 'Senha deve ter pelo menos 6 caracteres')
        .max(100, 'Senha deve ter no máximo 100 caracteres'),
  confirmPassword: isEditing
    ? yup.string()
    : yup.string()
        .required('Confirmação de senha é obrigatória')
        .oneOf([yup.ref('password')], 'Senhas devem coincidir'),
  role: yup
    .string()
    .required('Função é obrigatória')
    .oneOf(['ADMIN', 'OPERATOR'], 'Função inválida'),
  isActive: yup.boolean().required(),
});

export const UserForm: React.FC<UserFormProps> = ({
  user,
  open,
  onClose,
  onSubmit,
  currentUserId,
}) => {
  const isEditing = !!user;
  const isEditingSelf = user?.id === currentUserId;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<any>({
    resolver: yupResolver(createUserSchema(isEditing)),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'OPERATOR',
      isActive: true,
    },
  });

  // Resetar formulário quando usuário mudar
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        isActive: user.isActive,
      });
    } else {
      reset({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        role: 'OPERATOR',
        isActive: true,
      });
    }
  }, [user, reset]);

  const handleFormSubmit = async (data: UserFormData) => {
    try {
      const submitData: CreateUserData = {
        name: data.name,
        email: data.email,
        role: data.role,
        isActive: data.isActive,
      };

      // Incluir senha apenas se foi preenchida (para edição) ou se é criação
      if (!isEditing || (isEditing && data.password)) {
        submitData.password = data.password;
      }

      await onSubmit(submitData);
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
    }
  };

  const getRoleInfo = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return {
          icon: <SecurityIcon />,
          label: 'Administrador',
          description: 'Acesso total ao sistema, incluindo gerenciamento de usuários',
        };
      case 'OPERATOR':
        return {
          icon: <PersonIcon />,
          label: 'Operador',
          description: 'Pode localizar produtos, confirmar retiradas e acessar relatórios',
        };
      default:
        return {
          icon: <PersonIcon />,
          label: role,
          description: '',
        };
    }
  };

  const selectedRole = watch('role');
  const roleInfo = getRoleInfo(selectedRole);
  
  const getErrorMessage = (error: any): string => {
    if (!error) return '';
    return error.message || '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </Typography>
          <IconButton onClick={onClose} size="small">
            <CloseIcon />
          </IconButton>
        </Box>
      </DialogTitle>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent dividers>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Dados básicos */}
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Dados Básicos
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Nome Completo"
                      fullWidth
                      error={!!errors.name}
                      helperText={getErrorMessage(errors.name)}
                    />
                  )}
                />

                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={getErrorMessage(errors.email)}
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Senha (apenas se não estiver editando a si mesmo) */}
            {!isEditingSelf && (
              <Box>
                <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                  Senha {isEditing && '(deixe em branco para manter a atual)'}
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label={isEditing ? "Nova Senha (opcional)" : "Senha"}
                        type="password"
                        fullWidth
                        error={!!errors.password}
                        helperText={getErrorMessage(errors.password)}
                      />
                    )}
                  />

                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Confirmar Senha"
                        type="password"
                        fullWidth
                        error={!!errors.confirmPassword}
                        helperText={getErrorMessage(errors.confirmPassword)}
                      />
                    )}
                  />
                </Box>
              </Box>
            )}

            {/* Permissões e Status */}
            <Box>
              <Typography variant="subtitle1" gutterBottom fontWeight="bold">
                Permissões e Status
              </Typography>
              
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <Controller
                  name="role"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.role}>
                      <InputLabel>Função no Sistema</InputLabel>
                      <Select
                        {...field}
                        label="Função no Sistema"
                        disabled={isEditingSelf} // Não permitir alterar própria função
                      >
                        <MenuItem value="ADMIN">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <SecurityIcon />
                            Administrador
                          </Box>
                        </MenuItem>
                        <MenuItem value="OPERATOR">
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <PersonIcon />
                            Operador
                          </Box>
                        </MenuItem>
                      </Select>
                    </FormControl>
                  )}
                />

                {/* Descrição da função selecionada */}
                <Alert severity="info" icon={roleInfo.icon}>
                  <Typography variant="body2">
                    <strong>{roleInfo.label}:</strong> {roleInfo.description}
                  </Typography>
                </Alert>

                {/* Status ativo/inativo */}
                <Controller
                  name="isActive"
                  control={control}
                  render={({ field }) => (
                    <FormControlLabel
                      control={
                        <Switch
                          checked={field.value}
                          onChange={field.onChange}
                          disabled={isEditingSelf} // Não permitir desativar própria conta
                        />
                      }
                      label="Usuário ativo no sistema"
                    />
                  )}
                />
              </Box>
            </Box>

            {/* Aviso para edição própria */}
            {isEditingSelf && (
              <Alert severity="warning">
                Você está editando sua própria conta. Por segurança, não é possível alterar 
                a função, status ou senha por meio desta tela.
              </Alert>
            )}
          </Box>
        </DialogContent>

        <DialogActions>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Salvando...' : (isEditing ? 'Atualizar' : 'Criar Usuário')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}; 