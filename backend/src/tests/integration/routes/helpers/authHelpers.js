/**
 * Auth Helpers - Infraestrutura de Testes
 * 
 * Responsável por fornecer utilitários para autenticação e autorização
 * em testes de integração.
 * 
 * Objetivo: Centralizar e padronizar a criação de tokens JWT, mocks de usuários
 * e validações de autenticação para todos os testes de routes.
 */

const jwt = require('jsonwebtoken');
const { generateRefreshToken } = require('../../../../config/auth');
const TestDataFactory = require('./testDataFactory');
const testDatabase = require('./TestDatabase');

const JWT_SECRET = process.env.JWT_SECRET || 'teste-secret-key';

/**
 * Classe principal para helpers de autenticação
 */
class AuthHelpers {
  /**
   * Gera token JWT válido para teste
   */
  static generateValidToken(userData = {}) {
    const defaultUser = {
      id: TestDataFactory.generateObjectId().toString(),
      email: 'test@example.com',
      role: 'operator',
      name: 'Test User'
    };

    const user = { ...defaultUser, ...userData };
    
    return jwt.sign(
      user,
      process.env.JWT_SECRET || 'test_secret',
      { expiresIn: '1h' }
    );
  }

  /**
   * Gera refresh token válido usando o mesmo sistema do controller
   */
  static generateValidRefreshToken(userData = {}) {
    try {
      const payload = {
        id: userData.id || TestDataFactory.generateObjectId().toString()
      };
      
      // Usar o mesmo método que o controller usa
      return generateRefreshToken(payload);
    } catch (error) {
      // Fallback para testes se JWT_REFRESH_SECRET não estiver definido
      return jwt.sign(
        { id: userData.id || TestDataFactory.generateObjectId().toString() },
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'test_refresh_secret',
        { expiresIn: '30d' }
      );
    }
  }

  /**
   * Gerar token para usuário admin real
   */
  static generateAdminToken() {
    const adminUser = testDatabase.getUserByRole('admin');
    if (!adminUser) {
      throw new Error('Usuário admin não encontrado no banco de teste');
    }

    return jwt.sign(
      {
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Gerar token para usuário operator real
   */
  static generateOperatorToken() {
    const operatorUser = testDatabase.getUserByRole('operator');
    if (!operatorUser) {
      throw new Error('Usuário operator não encontrado no banco de teste');
    }

    return jwt.sign(
      {
        id: operatorUser._id.toString(),
        email: operatorUser.email,
        role: operatorUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Gerar token para usuário viewer real
   */
  static generateViewerToken() {
    const viewerUser = testDatabase.getUserByRole('viewer');
    if (!viewerUser) {
      throw new Error('Usuário viewer não encontrado no banco de teste');
    }

    return jwt.sign(
      {
        id: viewerUser._id.toString(),
        email: viewerUser.email,
        role: viewerUser.role
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  /**
   * Gerar token inválido para testes de erro
   */
  static generateInvalidToken() {
    return 'token.invalido.teste';
  }

  /**
   * Gerar token expirado para testes de erro
   */
  static generateExpiredToken() {
    const adminUser = testDatabase.getUserByRole('admin');
    if (!adminUser) {
      throw new Error('Usuário admin não encontrado no banco de teste');
    }

    return jwt.sign(
      {
        id: adminUser._id.toString(),
        email: adminUser.email,
        role: adminUser.role
      },
      JWT_SECRET,
      { expiresIn: '-1h' } // Expirado há 1 hora
    );
  }

  /**
   * Obter usuário por role do banco de teste
   */
  static getUserByRole(role) {
    return testDatabase.getUserByRole(role);
  }

  /**
   * Obter ID do usuário por role
   */
  static getUserIdByRole(role) {
    const user = testDatabase.getUserByRole(role);
    return user ? user._id.toString() : null;
  }

  /**
   * Validar se token é válido (para testes)
   */
  static validateToken(token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return { valid: true, decoded };
    } catch (error) {
      return { valid: false, error: error.message };
    }
  }

  /**
   * Configuração padrão de mocks para User.findById
   * Usado no beforeEach de todos os testes
   */
  static setupUserMocks(User, users = {}) {
    const defaultUsers = {
      admin: TestDataFactory.createValidAdmin(),
      operator: TestDataFactory.createValidOperator(),
      viewer: TestDataFactory.createValidViewer()
    };

    const allUsers = { ...defaultUsers, ...users };

    User.findById = jest.fn().mockImplementation((id) => {
      const userQueryBuilder = {
        select: jest.fn().mockImplementation(() => {
          // Buscar usuário pelo ID
          const user = Object.values(allUsers).find(u => u._id.toString() === id);
          
          if (user) {
            return Promise.resolve({
              _id: user._id,
              name: user.name,
              email: user.email,
              role: user.role,
              isActive: user.isActive,
              passwordChangedAfter: user.passwordChangedAfter || null
            });
          }
          
          return Promise.resolve(null);
        })
      };
      return userQueryBuilder;
    });

    return allUsers;
  }

  /**
   * Headers de autorização para requisições
   */
  static getAuthHeaders(token) {
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  /**
   * Headers padrão para testes
   */
  static getDefaultHeaders(token = null) {
    const headers = {
      'Content-Type': 'application/json'
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    return headers;
  }

  /**
   * Extrai dados do usuário do token para validações
   */
  static extractUserFromToken(token) {
    try {
      return jwt.decode(token);
    } catch (error) {
      return null;
    }
  }

  /**
   * Valida se token contém role específico
   */
  static tokenHasRole(token, expectedRole) {
    const user = this.extractUserFromToken(token);
    return user && user.role === expectedRole;
  }

  /**
   * Métodos para cenários específicos de teste
   */
  static getUnauthorizedScenarios() {
    return [
      {
        description: 'sem token',
        headers: {},
        expectedStatus: 401,
        expectedMessage: 'Token de acesso requerido'
      },
      {
        description: 'token inválido',
        headers: this.getAuthHeaders(this.generateInvalidToken()),
        expectedStatus: 401,
        expectedMessage: 'Token inválido'
      },
      {
        description: 'token expirado',
        headers: this.getAuthHeaders(this.generateExpiredToken()),
        expectedStatus: 401,
        expectedMessage: 'Token expirado'
      }
    ];
  }

  static getForbiddenScenarios(allowedRoles = ['admin']) {
    const allRoles = ['admin', 'operator', 'viewer'];
    const forbiddenRoles = allRoles.filter(role => !allowedRoles.includes(role));

    return forbiddenRoles.map(role => ({
      description: `role ${role} não autorizado`,
      headers: this.getAuthHeaders(this.generateTokenByRole(role)),
      expectedStatus: 403,
      expectedMessage: 'Acesso negado'
    }));
  }

  /**
   * Gera token baseado no role
   */
  static generateTokenByRole(role) {
    switch (role) {
      case 'admin':
        return this.generateAdminToken();
      case 'operator':
        return this.generateOperatorToken();
      case 'viewer':
        return this.generateViewerToken();
      default:
        return this.generateValidToken({ role });
    }
  }

  /**
   * Configuração completa de mocks para testes de autenticação
   */
  static setupAuthMocks(User) {
    // Configurar mocks básicos do User
    const users = this.setupUserMocks(User);

    // Mocks para métodos de contagem (usado em alguns endpoints)
    User.countDocuments = jest.fn().mockResolvedValue(5);

    // Mock para find (se necessário)
    User.find = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      sort: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      skip: jest.fn().mockResolvedValue([])
    });

    return users;
  }

  /**
   * Validadores para estruturas de resposta de autenticação
   */
  static validateAuthResponse(response) {
    // Aceitar tanto { success } quanto { status: "fail" }
    const hasSuccess = response.body.hasOwnProperty('success');
    const hasStatus = response.body.hasOwnProperty('status');
    
    expect(hasSuccess || hasStatus).toBe(true);
    expect(response.body).toHaveProperty('message');
    
    if (response.status >= 200 && response.status < 300) {
      // Para sucesso, deve ter success: true
      if (hasSuccess) {
        expect(response.body.success).toBe(true);
      }
    } else {
      // Para erro, pode ter success: false OU status: "fail"
      if (hasSuccess) {
        expect(response.body.success).toBe(false);
      } else if (hasStatus) {
        expect(response.body.status).toBe('fail');
      }
    }
  }

  static validateSuccessResponse(response, expectedData = {}) {
    this.validateAuthResponse(response);
    
    // Verificar se é uma resposta de sucesso
    if (response.body.success === true) {
      // Estrutura padrão com data
      if (Object.keys(expectedData).length > 0) {
        expect(response.body).toHaveProperty('data');
        Object.keys(expectedData).forEach(key => {
          expect(response.body.data).toHaveProperty(key);
        });
      }
    } else {
      // Para casos onde o endpoint não retorna "data" mas ainda é sucesso
      expect(response.status).toBeGreaterThanOrEqual(200);
      expect(response.status).toBeLessThan(300);
    }
  }

  static validateErrorResponse(response, expectedStatus, expectedMessage = null) {
    this.validateAuthResponse(response);
    expect(response.status).toBe(expectedStatus);
    
    if (expectedMessage) {
      expect(response.body.message).toContain(expectedMessage);
    }
  }

  /**
   * Utilitário para testes em massa de autorização
   */
  static async testEndpointAuthorization(request, endpoint, method = 'get', allowedRoles = ['admin', 'operator']) {
    const scenarios = [
      ...this.getUnauthorizedScenarios(),
      ...this.getForbiddenScenarios(allowedRoles)
    ];

    for (const scenario of scenarios) {
      const response = await request(app)[method](endpoint)
        .set(scenario.headers);

      expect(response.status).toBe(scenario.expectedStatus);
      expect(response.body.message).toContain(scenario.expectedMessage);
    }
  }

  /**
   * Limpa todos os mocks (para usar no afterEach)
   */
  static clearAllMocks() {
    // Método mantido para compatibilidade com testes existentes
    // Não faz nada pois não usamos mais mocks
  }
}

module.exports = AuthHelpers; 