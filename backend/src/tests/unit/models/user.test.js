/**
 * Testes unitários para User model
 * Foco em autenticação, roles e validações
 */

const User = require('../../../models/User');
const bcrypt = require('bcryptjs');

describe('User Model', () => {
  
  describe('📋 Schema Validations', () => {
    test('deve criar usuário com dados válidos', async () => {
      const userData = {
        name: 'João Silva',
        email: 'joao@test.com',
        password: 'password123',
        role: 'admin'
      };
      
      const user = await User.create(userData);
      
      expect(user.name).toBe('João Silva');
      expect(user.email).toBe('joao@test.com');
      expect(user.role).toBe('admin');
      expect(user.isActive).toBe(true);
      expect(user.password).not.toBe('password123'); // Deve estar hasheado
    });

    test('deve exigir campos obrigatórios', async () => {
      const user = new User({});
      
      let error;
      try {
        await user.save();
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors.email).toBeDefined();
      expect(error.errors.password).toBeDefined();
    });

    test('deve validar formato de email', async () => {
      const userData = {
        name: 'Teste',
        email: 'email-inválido',
        password: 'password123'
      };
      
      let error;
      try {
        await User.create(userData);
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.email.message).toContain('email válido');
    });

    test('deve exigir email único', async () => {
      const userData = {
        name: 'Usuário 1',
        email: 'teste@test.com',
        password: 'password123'
      };
      
      await User.create(userData);
      
      let error;
      try {
        await User.create({ ...userData, name: 'Usuário 2' });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // Duplicate key error
    });

    test('deve converter email para lowercase', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'TESTE@EMAIL.COM',
        password: 'password123'
      });
      
      expect(user.email).toBe('teste@email.com');
    });

    test('deve definir role padrão como viewer', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      expect(user.role).toBe('viewer');
    });

    test('deve validar valores de role', async () => {
      let error;
      try {
        await User.create({
          name: 'Teste',
          email: 'teste@test.com',
          password: 'password123',
          role: 'role-inválida'
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.role).toBeDefined();
    });

    test('deve validar tamanho mínimo da senha', async () => {
      let error;
      try {
        await User.create({
          name: 'Teste',
          email: 'teste@test.com',
          password: '123'
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.password.message).toContain('6 caracteres');
    });
  });

  describe('🔐 Password Handling', () => {
    test('deve fazer hash da senha ao salvar', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: plainPassword
      });
      
      expect(user.password).not.toBe(plainPassword);
      expect(user.password).toMatch(/^\$2[ab]\$/); // Formato bcrypt
    });

    test('não deve refazer hash se senha não foi modificada', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      const originalHash = user.password;
      user.name = 'Nome Alterado';
      await user.save();
      
      expect(user.password).toBe(originalHash);
    });

    test('deve fazer hash de nova senha ao atualizar', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      const originalHash = user.password;
      user.password = 'newpassword123';
      await user.save();
      
      expect(user.password).not.toBe(originalHash);
      expect(user.passwordChangedAt).toBeDefined();
    });

    test('comparePassword deve funcionar corretamente', async () => {
      const plainPassword = 'password123';
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: plainPassword
      });
      
      const isValid = await user.comparePassword(plainPassword);
      const isInvalid = await user.comparePassword('wrongpassword');
      
      expect(isValid).toBe(true);
      expect(isInvalid).toBe(false);
    });

    test('passwordChangedAfter deve funcionar corretamente', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      // Token timestamp 10 segundos atrás
      const tokenTimestamp = Math.floor(Date.now() / 1000) - 10;
      
      // Senha não foi alterada após criação
      expect(user.passwordChangedAfter(tokenTimestamp)).toBe(false);
      
      // Alterar senha
      user.password = 'newpassword123';
      await user.save();
      
      // Agora a senha foi alterada após o token
      expect(user.passwordChangedAfter(tokenTimestamp)).toBe(true);
    });
  });

  describe('👥 Role Methods', () => {
    test('isAdmin deve funcionar corretamente', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin'
      });
      
      const operator = await User.create({
        name: 'Operator',
        email: 'operator@test.com',
        password: 'password123',
        role: 'operator'
      });
      
      expect(admin.isAdmin()).toBe(true);
      expect(operator.isAdmin()).toBe(false);
    });

    test('canOperate deve funcionar corretamente', async () => {
      const admin = await User.create({
        name: 'Admin',
        email: 'admin@test.com',
        password: 'password123',
        role: 'admin'
      });
      
      const operator = await User.create({
        name: 'Operator',
        email: 'operator@test.com',
        password: 'password123',
        role: 'operator'
      });
      
      const viewer = await User.create({
        name: 'Viewer',
        email: 'viewer@test.com',
        password: 'password123',
        role: 'viewer'
      });
      
      expect(admin.canOperate()).toBe(true);
      expect(operator.canOperate()).toBe(true);
      expect(viewer.canOperate()).toBe(false);
    });
  });

  describe('🔍 Static Methods', () => {
    beforeEach(async () => {
      // Criar usuários de teste
      await User.create([
        { name: 'Admin 1', email: 'admin1@test.com', password: 'pass123', role: 'admin' },
        { name: 'Admin 2', email: 'admin2@test.com', password: 'pass123', role: 'admin', isActive: false },
        { name: 'Operator 1', email: 'op1@test.com', password: 'pass123', role: 'operator' },
        { name: 'Viewer 1', email: 'viewer1@test.com', password: 'pass123', role: 'viewer' }
      ]);
    });

    test('findByEmail deve encontrar usuário', async () => {
      const user = await User.findByEmail('admin1@test.com');
      expect(user).toBeDefined();
      expect(user.email).toBe('admin1@test.com');
    });

    test('findByEmail deve ser case insensitive', async () => {
      const user = await User.findByEmail('ADMIN1@TEST.COM');
      expect(user).toBeDefined();
      expect(user.email).toBe('admin1@test.com');
    });

    test('findActive deve retornar apenas usuários ativos', async () => {
      const activeUsers = await User.findActive();
      expect(activeUsers).toHaveLength(3); // Admin 2 está inativo
      
      activeUsers.forEach(user => {
        expect(user.isActive).toBe(true);
      });
    });

    test('findByRole deve filtrar por role e ativos', async () => {
      const admins = await User.findByRole('admin');
      expect(admins).toHaveLength(1); // Apenas admin1 está ativo
      expect(admins[0].role).toBe('admin');
      expect(admins[0].isActive).toBe(true);
    });

    test('getStats deve calcular estatísticas corretamente', async () => {
      const stats = await User.getStats();
      
      expect(stats.total).toBe(4);
      expect(stats.active).toBe(3);
      expect(stats.byRole).toHaveLength(3); // admin, operator, viewer
      
      const adminStats = stats.byRole.find(r => r._id === 'admin');
      expect(adminStats.count).toBe(2);
      expect(adminStats.active).toBe(1);
    });
  });

  describe('🔒 Security Features', () => {
    test('não deve retornar senha nas consultas por padrão', async () => {
      await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      const user = await User.findOne({ email: 'teste@test.com' });
      expect(user.password).toBeUndefined();
    });

    test('deve excluir campos sensíveis no toJSON', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      const json = user.toJSON();
      expect(json.password).toBeUndefined();
      expect(json.passwordChangedAt).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });

    test('deve incluir senha quando explicitamente selecionada', async () => {
      await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      const user = await User.findOne({ email: 'teste@test.com' }).select('+password');
      expect(user.password).toBeDefined();
      expect(user.password).toMatch(/^\$2[ab]\$/);
    });
  });

  describe('📊 Timestamps and Virtuals', () => {
    test('deve incluir timestamps automáticos', async () => {
      const user = await User.create({
        name: 'Teste',
        email: 'teste@test.com',
        password: 'password123'
      });
      
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
      expect(user.createdAt).toBeInstanceOf(Date);
    });

    test('virtual displayName deve retornar nome', async () => {
      const user = await User.create({
        name: 'João Silva',
        email: 'joao@test.com',
        password: 'password123'
      });
      
      expect(user.displayName).toBe('João Silva');
    });
  });
});

console.log('✅ Testes do User model criados com sucesso!'); 