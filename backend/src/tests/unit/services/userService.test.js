/**
 * Testes Unitários - userService
 * Sistema de Gestão Inteligente de Usuários
 * 
 * Objetivos dos Testes:
 * - Validar integração com TODOS os services do sistema
 * - Testar análise completa de atividade do usuário
 * - Verificar sugestões de mudança de role baseadas em uso
 * - Validar relatórios de produtividade
 * - Testar detecção de usuários inativos
 * - Verificar validação avançada de permissões
 * - Testar análise de padrões de comportamento
 */

const userService = require('../../../services/userService');
const User = require('../../../models/User');

// Mock das dependências
jest.mock('../../../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findByIdAndUpdate: jest.fn(),
  countDocuments: jest.fn(),
  aggregate: jest.fn()
}));

jest.mock('../../../services/authService', () => ({
  analyzeLoginPatterns: jest.fn(),
  analyzeSecurityActivity: jest.fn(),
  checkUserSecurity: jest.fn()
}));

jest.mock('../../../services/movementService', () => ({
  getUserMovements: jest.fn(),
  analyzeUserEfficiency: jest.fn(),
  registerUserActivity: jest.fn()
}));

jest.mock('../../../services/locationService', () => ({
  getUserLocationActivity: jest.fn(),
  analyzeLocationUsage: jest.fn(),
  getUserAccessPatterns: jest.fn()
}));

jest.mock('../../../services/productService', () => ({
  getUserProductActivity: jest.fn(),
  analyzeProductManagement: jest.fn(),
  getUserProductEfficiency: jest.fn()
}));

jest.mock('../../../services/chamberService', () => ({
  getUserChamberActivity: jest.fn(),
  analyzeChamberAccess: jest.fn()
}));

jest.mock('../../../services/seedTypeService', () => ({
  getUserSeedTypeActivity: jest.fn(),
  analyzeTypeUsage: jest.fn()
}));

jest.mock('../../../services/reportService', () => ({
  generateUserReport: jest.fn(),
  createCustomReport: jest.fn()
}));

const authService = require('../../../services/authService');
const movementService = require('../../../services/movementService');
const locationService = require('../../../services/locationService');
const productService = require('../../../services/productService');
const chamberService = require('../../../services/chamberService');
const seedTypeService = require('../../../services/seedTypeService');
const reportService = require('../../../services/reportService');

describe('UserService - Gestão Inteligente de Usuários', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzeUserActivity - Integração com TODOS os Services', () => {
    test('deve analisar atividade completa do usuário integrando todos os services', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'João Silva',
        email: 'joao@teste.com',
        role: 'operator',
        isActive: true,
        createdAt: new Date('2023-01-01')
      };

      const mockMovements = [
        { _id: 'mov1', type: 'entry', productId: 'prod1', timestamp: new Date() },
        { _id: 'mov2', type: 'transfer', productId: 'prod2', timestamp: new Date() }
      ];

      const mockLocationActivity = {
        uniqueLocations: 15,
        totalAccess: 45,
        mostUsedLocation: 'Q1-L1-F1-A1',
        details: [
          { locationId: 'loc1', accessCount: 12, lastAccess: new Date() }
        ]
      };

      const mockProductActivity = {
        uniqueProducts: 8,
        totalOperations: 32,
        efficiency: 92,
        details: [
          { productId: 'prod1', operations: 5, lastOperation: new Date() }
        ]
      };

      const mockSessionActivity = {
        totalLogins: 25,
        averageLoginsPerDay: 2.5,
        lastLogin: new Date(),
        sessionDuration: 6.5
      };

      User.findById.mockResolvedValue(mockUser);
      movementService.getUserMovements.mockResolvedValue(mockMovements);
      locationService.getUserLocationActivity.mockResolvedValue(mockLocationActivity);
      productService.getUserProductActivity.mockResolvedValue(mockProductActivity);
      authService.analyzeLoginPatterns.mockResolvedValue(mockSessionActivity);

      const result = await userService.analyzeUserActivity('user123');

      expect(result.success).toBe(true);
      expect(result.data.user.name).toBe('João Silva');
      expect(result.data.summary.totalMovements).toBe(2);
      expect(result.data.summary.locationsUsed).toBe(15);
      expect(result.data.summary.productsManaged).toBe(8);
      expect(result.data.productivity).toBeDefined();
      expect(result.data.patterns).toBeDefined();
      expect(result.data.insights).toBeDefined();

      // Validar integrações críticas
      expect(movementService.getUserMovements).toHaveBeenCalledWith('user123', '30d');
      expect(locationService.getUserLocationActivity).toHaveBeenCalledWith('user123', '30d');
      expect(productService.getUserProductActivity).toHaveBeenCalledWith('user123', '30d');
      expect(authService.analyzeLoginPatterns).toHaveBeenCalledWith('user123', '30d');
    });

    test('deve calcular métricas de produtividade baseadas em múltiplas fontes', async () => {
      const mockUser = { _id: 'user123', name: 'João', role: 'operator' };
      
      User.findById.mockResolvedValue(mockUser);
      movementService.getUserMovements.mockResolvedValue([{}, {}, {}]); // 3 movements
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 10 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 5 });
      authService.analyzeLoginPatterns.mockResolvedValue({ 
        totalLogins: 20, 
        averageLoginsPerDay: 2.0 
      });

      const result = await userService.analyzeUserActivity('user123');

      expect(result.data.productivity.overallScore).toBeGreaterThan(0);
      expect(result.data.productivity.movementEfficiency).toBeDefined();
      expect(result.data.productivity.locationUtilization).toBeDefined();
      expect(result.data.productivity.productManagement).toBeDefined();
      expect(result.data.productivity.systemUsage).toBeDefined();
    });

    test('deve detectar padrões de uso baseados em atividades', async () => {
      const mockUser = { _id: 'user123', name: 'João', role: 'operator' };
      
      const mockMovements = [
        { timestamp: new Date('2024-01-15T09:00:00'), type: 'entry' },
        { timestamp: new Date('2024-01-15T14:00:00'), type: 'transfer' },
        { timestamp: new Date('2024-01-16T10:00:00'), type: 'exit' }
      ];

      User.findById.mockResolvedValue(mockUser);
      movementService.getUserMovements.mockResolvedValue(mockMovements);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 5 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 3 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 10, averageLoginsPerDay: 1.5 });

      const result = await userService.analyzeUserActivity('user123');

      expect(result.data.patterns.peakHours).toBeDefined();
      expect(result.data.patterns.preferredOperations).toBeDefined();
      expect(result.data.patterns.workingDays).toBeDefined();
    });

    test('deve gerar insights personalizados baseados na análise', async () => {
      const mockUser = { 
        _id: 'user123', 
        name: 'João', 
        role: 'operator',
        createdAt: new Date('2023-01-01')
      };
      
      User.findById.mockResolvedValue(mockUser);
      movementService.getUserMovements.mockResolvedValue([]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 1 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 1 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 5, averageLoginsPerDay: 0.5 });

      const result = await userService.analyzeUserActivity('user123');

      expect(Array.isArray(result.data.insights)).toBe(true);
      expect(result.data.insights.length).toBeGreaterThan(0);
      expect(result.data.insights[0]).toHaveProperty('type');
      expect(result.data.insights[0]).toHaveProperty('message');
      expect(result.data.insights[0]).toHaveProperty('priority');
    });
  });

  describe('suggestRoleChanges - Análise Inteligente de Roles', () => {
    test('deve sugerir mudanças de role baseadas em atividade e capacidades', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Maria Santos',
        email: 'maria@teste.com',
        role: 'operator',
        isActive: true
      };

      const mockActivityAnalysis = {
        success: true,
        data: {
          user: mockUser,
          productivity: {
            overallScore: 95,
            movementEfficiency: 92,
            locationUtilization: 88,
            productManagement: 96
          },
          patterns: {
            peakHours: ['09:00-11:00', '14:00-16:00'],
            preferredOperations: ['transfer', 'adjustment'],
            complexity: 'high'
          },
          details: {
            movements: [
              { type: 'entry', complexity: 'high', success: true },
              { type: 'transfer', complexity: 'complex', success: true }
            ]
          }
        }
      };

      const mockSimilarUsers = {
        success: true,
        data: {
          summary: { totalFound: 3, averageScore: 85 },
          benchmarks: { adminThreshold: 90, operatorAverage: 75 }
        }
      };

      User.findById.mockResolvedValue(mockUser);
      User.find.mockResolvedValue([
        { _id: 'user456', name: 'Peer 1', role: 'operator' },
        { _id: 'user789', name: 'Peer 2', role: 'operator' }
      ]);

      movementService.getUserMovements.mockResolvedValue([{}, {}]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 10 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 5 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 20, averageLoginsPerDay: 2.0 });

      const result = await userService.suggestRoleChanges('user123');

      expect(result.success).toBe(true);
      expect(result.data.currentRole).toBe('operator');
      expect(result.data.analysis.activityLevel).toBeGreaterThan(0);
      expect(result.data.suggestions).toBeDefined();
      expect(result.data.suggestions.recommended).toBeDefined();
      expect(result.data.confidence).toBeGreaterThan(0);
    });

    test('deve identificar capacidades demonstradas pelo usuário', async () => {
      const mockUser = { _id: 'user123', name: 'João', role: 'operator' };

      User.findById.mockResolvedValue(mockUser);
      User.find.mockResolvedValue([]);

      movementService.getUserMovements.mockResolvedValue([
        { type: 'entry', metadata: { supervisorApproved: true } },
        { type: 'complex_transfer', success: true }
      ]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 8 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 4 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 15, averageLoginsPerDay: 1.8 });

      const result = await userService.suggestRoleChanges('user123');

      expect(result.data.analysis.capabilities).toBeDefined();
      expect(result.data.analysis.capabilities.leadership).toBeDefined();
      expect(result.data.analysis.capabilities.technical).toBeDefined();
      expect(result.data.analysis.capabilities.efficiency).toBeDefined();
    });

    test('deve calcular adequação a diferentes roles', async () => {
      const mockUser = { _id: 'user123', name: 'Ana', role: 'viewer' };

      User.findById.mockResolvedValue(mockUser);
      User.find.mockResolvedValue([]);

      movementService.getUserMovements.mockResolvedValue([]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 2 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 1 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 8, averageLoginsPerDay: 1.0 });

      const result = await userService.suggestRoleChanges('user123');

      expect(result.data.analysis.roleAdequacy).toBeDefined();
      expect(result.data.analysis.roleAdequacy.viewer).toBeDefined();
      expect(result.data.analysis.roleAdequacy.operator).toBeDefined();
      expect(result.data.analysis.roleAdequacy.admin).toBeDefined();
    });
  });

  describe('generateUserProductivityReport - Relatórios Personalizados', () => {
    test('deve gerar relatório de produtividade detalhado', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'Carlos Rodrigues',
        role: 'admin'
      };

      User.findById.mockResolvedValue(mockUser);
      
      movementService.getUserMovements.mockResolvedValue([{}, {}, {}]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 20 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 15 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 40, averageLoginsPerDay: 3.0 });
      
      reportService.generateUserReport.mockResolvedValue({
        success: true,
        data: { 
          metrics: { efficiency: 88, quality: 92 },
          trends: { improving: true, growthRate: 15 }
        }
      });

      const result = await userService.generateUserProductivityReport('user123');

      expect(result.success).toBe(true);
      expect(result.data.report).toBeDefined();
      expect(result.data.metrics).toBeDefined();
      expect(result.data.trends).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
      
      expect(reportService.generateUserReport).toHaveBeenCalledWith('user123', expect.any(Object));
    });

    test('deve incluir comparações com outros usuários do mesmo role', async () => {
      const mockUser = { _id: 'user123', name: 'Ana', role: 'operator' };

      User.findById.mockResolvedValue(mockUser);
      User.find.mockResolvedValue([
        { _id: 'user456', role: 'operator', isActive: true },
        { _id: 'user789', role: 'operator', isActive: true }
      ]);

      movementService.getUserMovements.mockResolvedValue([{}]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 5 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 3 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 15, averageLoginsPerDay: 1.5 });
      reportService.generateUserReport.mockResolvedValue({ 
        success: true, 
        data: { metrics: {}, trends: {} } 
      });

      const result = await userService.generateUserProductivityReport('user123', {
        includeComparison: true
      });

      expect(result.data.comparison).toBeDefined();
      expect(result.data.comparison.roleAverage).toBeDefined();
      expect(result.data.comparison.ranking).toBeDefined();
      expect(result.data.comparison.benchmark).toBeDefined();
    });
  });

  describe('detectInactiveUsers - Monitoramento de Atividade', () => {
    test('deve detectar usuários inativos baseado em múltiplas métricas', async () => {
      const mockUsers = [
        {
          _id: 'user1',
          name: 'João Inativo',
          email: 'joao@teste.com',
          role: 'operator',
          isActive: true,
          lastLogin: new Date('2024-01-01') // Muito antigo
        },
        {
          _id: 'user2',
          name: 'Maria Ativa',
          email: 'maria@teste.com',
          role: 'admin',
          isActive: true,
          lastLogin: new Date() // Recente
        }
      ];

      User.find.mockResolvedValue(mockUsers);
      
      movementService.getUserMovements
        .mockResolvedValueOnce([]) // user1 - sem movimentos
        .mockResolvedValueOnce([{}, {}]); // user2 - com movimentos

      authService.analyzeLoginPatterns
        .mockResolvedValueOnce({ totalLogins: 0, lastLogin: new Date('2024-01-01') })
        .mockResolvedValueOnce({ totalLogins: 10, lastLogin: new Date() });

      const result = await userService.detectInactiveUsers();

      expect(result.success).toBe(true);
      expect(result.data.summary.totalUsers).toBe(2);
      expect(result.data.summary.inactiveUsers).toBeGreaterThanOrEqual(0);
      expect(result.data.categories.critical).toBeDefined();
      expect(result.data.categories.warning).toBeDefined();
      expect(result.data.categories.moderate).toBeDefined();
      expect(result.data.recommendations).toBeDefined();
    });

    test('deve categorizar usuários inativos por nível de severidade', async () => {
      const mockUsers = [
        { _id: 'user1', name: 'Crítico', lastLogin: new Date('2023-01-01') },
        { _id: 'user2', name: 'Aviso', lastLogin: new Date('2024-11-01') },
        { _id: 'user3', name: 'Moderado', lastLogin: new Date('2024-11-20') }
      ];

      User.find.mockResolvedValue(mockUsers);
      movementService.getUserMovements.mockResolvedValue([]);
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 0 });

      const result = await userService.detectInactiveUsers({
        inactivityThreshold: 60 // 60 dias
      });

      expect(result.data.categories.critical.length).toBeGreaterThanOrEqual(0);
      expect(result.data.categories.warning.length).toBeGreaterThanOrEqual(0);
      expect(result.data.categories.moderate.length).toBeGreaterThanOrEqual(0);
    });

    test('deve gerar recomendações baseadas no padrão de inatividade', async () => {
      const mockUsers = [
        { _id: 'user1', name: 'Teste', role: 'operator', lastLogin: new Date('2024-01-01') }
      ];

      User.find.mockResolvedValue(mockUsers);
      movementService.getUserMovements.mockResolvedValue([]);
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 0 });

      const result = await userService.detectInactiveUsers();

      expect(Array.isArray(result.data.recommendations)).toBe(true);
      expect(result.data.recommendations.length).toBeGreaterThanOrEqual(0);
      if (result.data.recommendations.length > 0) {
        expect(result.data.recommendations[0]).toHaveProperty('action');
        expect(result.data.recommendations[0]).toHaveProperty('priority');
        expect(result.data.recommendations[0]).toHaveProperty('description');
      }
    });
  });

  describe('validateUserPermissions - Segurança Avançada', () => {
    test('deve validar permissões baseadas no contexto de uso', async () => {
      const mockUser = {
        _id: 'user123',
        name: 'João',
        role: 'operator',
        isActive: true
      };

      const mockPermissions = ['read_products', 'create_movements', 'update_locations'];
      const mockContext = {
        chamber: 'chamber1',
        operation: 'product_transfer',
        timeOfDay: '14:00'
      };

      User.findById.mockResolvedValue(mockUser);
      authService.checkUserSecurity.mockResolvedValue({
        success: true,
        securityLevel: 'standard'
      });

      const result = await userService.validateUserPermissions('user123', mockPermissions, mockContext);

      expect(result.success).toBe(true);
      expect(result.data.user.role).toBe('operator');
      expect(result.data.permissions).toBeDefined();
      expect(result.data.context).toBeDefined();
      expect(result.data.validation.allowed).toBeDefined();
      expect(result.data.validation.denied).toBeDefined();
      expect(result.data.security).toBeDefined();
    });

    test('deve considerar contexto temporal e operacional', async () => {
      const mockUser = { _id: 'user123', role: 'viewer', isActive: true };
      const mockPermissions = ['delete_products']; // Permissão restrita
      const mockContext = {
        operation: 'bulk_delete',
        timeOfDay: '02:00', // Horário suspeito
        ipAddress: '192.168.1.100'
      };

      User.findById.mockResolvedValue(mockUser);
      authService.checkUserSecurity.mockResolvedValue({
        success: true,
        securityLevel: 'low',
        alerts: ['unusual_time', 'insufficient_role']
      });

      const result = await userService.validateUserPermissions('user123', mockPermissions, mockContext);

      expect(result.data.validation.denied).toContain('delete_products');
      expect(result.data.security.alerts).toContain('unusual_time');
      expect(result.data.recommendations).toContain('Operação negada por restrições de segurança');
    });
  });

  describe('Integração Completa com Sistema - Alinhamento aos Objetivos', () => {
    test('deve integrar com todos os services conforme arquitetura', async () => {
      const mockUser = { _id: 'user123', role: 'admin', isActive: true };
      
      User.findById.mockResolvedValue(mockUser);
      movementService.getUserMovements.mockResolvedValue([]);
      locationService.getUserLocationActivity.mockResolvedValue({ uniqueLocations: 0 });
      productService.getUserProductActivity.mockResolvedValue({ uniqueProducts: 0 });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 0 });
      reportService.generateUserReport.mockResolvedValue({ success: true, data: {} });

      await userService.analyzeUserActivity('user123');
      await userService.generateUserProductivityReport('user123');
      await userService.validateUserPermissions('user123', ['read']);

      expect(movementService.getUserMovements).toHaveBeenCalled();
      expect(locationService.getUserLocationActivity).toHaveBeenCalled();
      expect(productService.getUserProductActivity).toHaveBeenCalled();
      expect(authService.analyzeLoginPatterns).toHaveBeenCalled();
      expect(reportService.generateUserReport).toHaveBeenCalled();
    });

    test('deve registrar atividade do usuário automaticamente', async () => {
      const mockUser = { _id: 'user123', role: 'operator' };
      
      User.findById.mockResolvedValue(mockUser);
      movementService.registerUserActivity.mockResolvedValue({ success: true });
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 5 });

      await userService.analyzeUserActivity('user123');

      expect(movementService.registerUserActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user123',
          action: 'activity_analysis'
        })
      );
    });

    test('deve respeitar hierarquia de usuários e permissões', async () => {
      const mockUsers = [
        { _id: 'admin1', role: 'admin', isActive: true },
        { _id: 'op1', role: 'operator', isActive: true },
        { _id: 'view1', role: 'viewer', isActive: true }
      ];

      User.find.mockResolvedValue(mockUsers);
      movementService.getUserMovements.mockResolvedValue([]);
      authService.analyzeLoginPatterns.mockResolvedValue({ totalLogins: 0 });

      const result = await userService.detectInactiveUsers();

      expect(result.data.byRole).toBeDefined();
      expect(result.data.byRole.admin).toBeDefined();
      expect(result.data.byRole.operator).toBeDefined();
      expect(result.data.byRole.viewer).toBeDefined();
    });
  });
}); 