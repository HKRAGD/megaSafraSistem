import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Alert,
  Breadcrumbs,
  Link,
  Card,
  CardContent,
  Grid,
} from '@mui/material';
import {
  Add as AddIcon,
  Person as PersonIcon,
  Security as SecurityIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import { Navigate } from 'react-router-dom';

import { PageHeader } from '../../components/layout/PageHeader';
import { UserList } from '../../components/users/UserList';
import { UserForm } from '../../components/users/UserForm';
import { StatsCard } from '../../components/ui';
import { useAuth } from '../../hooks/useAuth';
import { useUsers } from '../../hooks/useUsers';
import { User } from '../../types';

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const {
    users,
    loading,
    error,
    totalPages,
    currentPage,
    fetchUsers,
    createUser,
    updateUser,
    deleteUser,
  } = useUsers();

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [filters, setFilters] = useState<any>({});

  // Carregar usuários ao montar o componente
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Verificação de permissão - apenas admin pode acessar
  if (currentUser?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  // Calcular estatísticas dos usuários com verificação de segurança
  const safeUsers = Array.isArray(users) ? users : [];
  const stats = {
    total: safeUsers.length,
    active: safeUsers.filter((user: User) => user.isActive).length,
    inactive: safeUsers.filter((user: User) => !user.isActive).length,
    admins: safeUsers.filter((user: User) => user.role === 'admin').length,
    operators: safeUsers.filter((user: User) => user.role === 'operator').length,
    viewers: safeUsers.filter((user: User) => user.role === 'viewer').length,
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleSubmitUser = async (userData: any) => {
    try {
      if (editingUser) {
        await updateUser(editingUser.id, userData);
      } else {
        await createUser(userData);
      }
      setShowUserForm(false);
      setEditingUser(null);
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    // Não permitir que o usuário atual se delete
    if (userId === currentUser?.id) {
      alert('Você não pode excluir sua própria conta.');
      return;
    }

    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      try {
        await deleteUser(userId);
        await fetchUsers();
      } catch (error) {
        console.error('Erro ao excluir usuário:', error);
      }
    }
  };

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    // Não permitir que o usuário atual se desative
    if (userId === currentUser?.id && !isActive) {
      alert('Você não pode desativar sua própria conta.');
      return;
    }

    try {
      await updateUser(userId, { isActive });
      await fetchUsers();
    } catch (error) {
      console.error('Erro ao alterar status do usuário:', error);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
        <PageHeader
          title="Gerenciar Usuários"
          subtitle="Controle de acesso e permissões do sistema"
        />

        {/* Breadcrumbs */}
        <Breadcrumbs sx={{ mb: 3 }}>
          <Link underline="hover" color="inherit" href="/dashboard">
            Dashboard
          </Link>
          <Typography color="text.primary">Usuários</Typography>
        </Breadcrumbs>

        {/* Exibir erros */}
        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {/* Cards de estatísticas */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2
            }}>
            <StatsCard
              title="Total"
              value={stats.total}
              icon={GroupIcon}
              iconColor="primary"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2
            }}>
            <StatsCard
              title="Ativos"
              value={stats.active}
              icon={PersonIcon}
              iconColor="success"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2
            }}>
            <StatsCard
              title="Inativos"
              value={stats.inactive}
              icon={PersonIcon}
              iconColor="error"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2
            }}>
            <StatsCard
              title="Admins"
              value={stats.admins}
              icon={SecurityIcon}
              iconColor="warning"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2
            }}>
            <StatsCard
              title="Operadores"
              value={stats.operators}
              icon={PersonIcon}
              iconColor="info"
            />
          </Grid>
          <Grid
            size={{
              xs: 12,
              sm: 6,
              md: 2
            }}>
            <StatsCard
              title="Visualizadores"
              value={stats.viewers}
              icon={PersonIcon}
              iconColor="primary"
            />
          </Grid>
        </Grid>

        {/* Controles */}
        <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
                            Lista de Usuários ({safeUsers.length})
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleCreateUser}
          >
            Novo Usuário
          </Button>
        </Box>

        {/* Informações importantes */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            <strong>Níveis de Permissão:</strong>
          </Typography>
          <Typography variant="body2" component="div" sx={{ mt: 1 }}>
            • <strong>Admin:</strong> Acesso total ao sistema, incluindo gerenciamento de usuários<br/>
            • <strong>Operador:</strong> Pode criar/modificar produtos, câmaras e movimentações<br/>
            • <strong>Visualizador:</strong> Apenas visualização de dados e relatórios
          </Typography>
        </Alert>

        {/* Lista de usuários */}
        <Card>
          <CardContent>
            <UserList
              users={safeUsers}
              loading={loading}
              currentUserId={currentUser?.id || ''}
              onEdit={handleEditUser}
              onDelete={handleDeleteUser}
              onToggleStatus={handleToggleStatus}
              filters={filters}
              onFiltersChange={setFilters}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={(page) => fetchUsers({ ...filters, page })}
            />
          </CardContent>
        </Card>

        {/* Modal de formulário de usuário */}
        {showUserForm && (
          <UserForm
            user={editingUser}
            open={showUserForm}
            onClose={() => {
              setShowUserForm(false);
              setEditingUser(null);
            }}
            onSubmit={handleSubmitUser}
            currentUserId={currentUser?.id || ''}
          />
        )}
    </Container>
  );
}; 