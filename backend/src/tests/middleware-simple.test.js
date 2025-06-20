/**
 * Testes simplificados para middlewares de autenticação e validação
 */

// Configurar variáveis de ambiente para testes
process.env.JWT_SECRET = 'test-secret-key-for-middleware-tests';
process.env.NODE_ENV = 'test';

const {
  authorizeRole,
  requireAdmin,
  requireOperator,
  canAccessUser
} = require('../middleware/auth');

const {
  validateBody,
  validateParams,
  userSchemas,
  authSchemas,
  objectIdSchema
} = require('../middleware/validation');

const { AppError } = require('../middleware/errorHandler');

describe('Middleware de Autorização', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: null,
      params: {},
      body: {}
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('authorizeRole', () => {
    test('deve permitir acesso para role correto', () => {
      req.user = { role: 'admin' };
      const middleware = authorizeRole('admin', 'operator');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve negar acesso para role incorreto', () => {
      req.user = { role: 'viewer' };
      const middleware = authorizeRole('admin');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403
        })
      );
    });

    test('deve falhar sem usuário autenticado', () => {
      const middleware = authorizeRole('admin');
      
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 401
        })
      );
    });
  });

  describe('requireAdmin', () => {
    test('deve permitir acesso para admin', () => {
      req.user = { 
        isAdmin: () => true 
      };
      
      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve negar acesso para não admin', () => {
      req.user = { 
        isAdmin: () => false 
      };
      
      requireAdmin(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403
        })
      );
    });
  });

  describe('requireOperator', () => {
    test('deve permitir acesso para operator', () => {
      req.user = { 
        canOperate: () => true 
      };
      
      requireOperator(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve negar acesso para viewer', () => {
      req.user = { 
        canOperate: () => false 
      };
      
      requireOperator(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403
        })
      );
    });
  });

  describe('canAccessUser', () => {
    test('deve permitir acesso aos próprios dados', () => {
      req.user = {
        _id: { toString: () => 'user123' },
        isAdmin: () => false
      };
      req.params.id = 'user123';
      
      canAccessUser(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve permitir acesso para admin', () => {
      req.user = {
        _id: { toString: () => 'admin123' },
        isAdmin: () => true
      };
      req.params.id = 'user456';
      
      canAccessUser(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve negar acesso a dados de outros usuários', () => {
      req.user = {
        _id: { toString: () => 'user123' },
        isAdmin: () => false
      };
      req.params.id = 'user456';
      
      canAccessUser(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 403
        })
      );
    });
  });
});

describe('Middleware de Validação', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      body: {},
      params: {},
      query: {}
    };
    res = {};
    next = jest.fn();
    jest.clearAllMocks();
  });

  describe('validateBody', () => {
    test('deve validar dados corretos do usuário', () => {
      req.body = {
        name: 'João Silva',
        email: 'joao@test.com',
        password: '123456',
        role: 'operator'
      };
      
      const middleware = validateBody(userSchemas.create);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve falhar com dados inválidos', () => {
      req.body = {
        name: 'A', // muito curto
        email: 'email-inválido',
        password: '123' // muito curta
      };
      
      const middleware = validateBody(userSchemas.create);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400
        })
      );
    });

    test('deve validar login', () => {
      req.body = {
        email: 'test@test.com',
        password: 'senha123'
      };
      
      const middleware = validateBody(authSchemas.login);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('validateParams', () => {
    test('deve validar ObjectId válido', () => {
      req.params = {
        id: '507f1f77bcf86cd799439011'
      };
      
      const schema = { id: objectIdSchema };
      const middleware = validateParams(schema);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith();
    });

    test('deve falhar com ObjectId inválido', () => {
      req.params = {
        id: 'id-inválido'
      };
      
      const schema = { id: objectIdSchema };
      const middleware = validateParams(schema);
      middleware(req, res, next);
      
      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 400
        })
      );
    });
  });

  describe('Schemas de validação', () => {
    test('userSchemas.create deve funcionar', () => {
      const validData = {
        name: 'João Silva',
        email: 'JOAO@TEST.COM',
        password: '123456',
        role: 'admin'
      };
      
      const { error, value } = userSchemas.create.validate(validData);
      
      expect(error).toBeUndefined();
      expect(value.email).toBe('joao@test.com'); // lowercase
    });

    test('authSchemas.login deve validar', () => {
      const validData = {
        email: 'test@test.com',
        password: 'qualquer'
      };
      
      const { error } = authSchemas.login.validate(validData);
      
      expect(error).toBeUndefined();
    });

    test('objectIdSchema deve validar IDs MongoDB', () => {
      const validId = '507f1f77bcf86cd799439011';
      const invalidId = 'invalid';
      
      expect(objectIdSchema.validate(validId).error).toBeUndefined();
      expect(objectIdSchema.validate(invalidId).error).toBeDefined();
    });
  });
});

describe('AppError', () => {
  test('deve criar erro com status code correto', () => {
    const error = new AppError('Mensagem de teste', 400);
    
    expect(error.message).toBe('Mensagem de teste');
    expect(error.statusCode).toBe(400);
    expect(error.status).toBe('fail');
    expect(error.isOperational).toBe(true);
  });

  test('deve definir status como error para 5xx', () => {
    const error = new AppError('Erro interno', 500);
    
    expect(error.status).toBe('error');
  });
});

console.log('✅ Testes simplificados dos middlewares criados com sucesso!'); 