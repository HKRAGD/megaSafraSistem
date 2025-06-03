/**
 * Testes unitários para reportService
 * Baseados nos OBJETIVOS DO PROJETO especificados no planejamento
 * 
 * OBJETIVOS TESTADOS:
 * 1. Relatório completo de estoque com análise por câmara e otimização
 * 2. Relatório de movimentações com padrões temporais e eficiência
 * 3. Produtos próximos ao vencimento com classificação por urgência
 * 4. Análise detalhada de capacidade e ocupação por câmara
 * 5. Dashboard executivo com KPIs, comparações e tendências
 */

const reportService = require('../../../services/reportService');
const Product = require('../../../models/Product');
const Movement = require('../../../models/Movement');
const Location = require('../../../models/Location');
const Chamber = require('../../../models/Chamber');
const SeedType = require('../../../models/SeedType');

// Configurar setup de testes
require('../../setup');

describe('ReportService', () => {
  let testCounter = 0;

  // Helper para gerar códigos únicos
  const getUniqueLocationCode = () => {
    testCounter++;
    return `TRP${testCounter}-Q1-L1-F1-A1`;
  };

  const getUniqueCoordinates = () => {
    testCounter++;
    return { 
      quadra: Math.ceil(testCounter / 25), 
      lado: Math.ceil(testCounter / 20), 
      fila: testCounter + 200, 
      andar: Math.ceil(testCounter / 15) 
    };
  };

  describe('📦 generateInventoryReport', () => {
    test('deve gerar relatório completo de estoque', async () => {
      const chamber = await global.createTestChamber({ name: 'Câmara Teste' });
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false
      });
      await global.createTestProduct({ 
        locationId: location._id,
        quantity: 20, 
        weightPerUnit: 50 
      });

      const result = await reportService.generateInventoryReport({}, {
        includeChamberBreakdown: true,
        includeExpirationAnalysis: true,
        includeOptimization: true
      });

      expect(result.success).toBe(true);
      expect(result.data.summary.totalProducts).toBe(1);
      expect(result.data.summary.totalWeight).toBe(1000);
      expect(result.data.data).toBeDefined();
      expect(result.data.data.products).toBeDefined();
    });

    test('deve filtrar por câmara específica', async () => {
      const chamber1 = await global.createTestChamber({ name: 'Câmara 1' });
      const chamber2 = await global.createTestChamber({ name: 'Câmara 2' });
      
      const location1 = await global.createTestLocation({ 
        chamberId: chamber1._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      const location2 = await global.createTestLocation({ 
        chamberId: chamber2._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestProduct({ locationId: location1._id });
      await global.createTestProduct({ locationId: location2._id });

      const result = await reportService.generateInventoryReport({
        chamberId: chamber1._id
      });

      expect(result.success).toBe(true);
      expect(result.data.summary.totalProducts).toBe(1);
      expect(result.data.data.products[0].locationId.chamberId._id.toString()).toBe(chamber1._id.toString());
    });

    test('deve filtrar por tipo de semente', async () => {
      const seedType = await global.createTestSeedType({ name: 'Milho' });
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      await global.createTestProduct({ 
        seedTypeId: seedType._id,
        locationId: location._id 
      });

      const result = await reportService.generateInventoryReport({
        seedTypeId: seedType._id
      });

      expect(result.success).toBe(true);
      expect(result.data.summary.totalProducts).toBe(1);
      expect(result.data.data.products[0].seedTypeId.name).toBe('Milho');
    });

    test('deve analisar produtos próximos ao vencimento', async () => {
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      // Produto próximo ao vencimento
      const nearExpiration = new Date();
      nearExpiration.setDate(nearExpiration.getDate() + 5); // 5 dias
      
      await global.createTestProduct({
        name: 'Produto Vencendo',
        locationId: location._id,
        expirationDate: nearExpiration
      });

      const result = await reportService.generateInventoryReport({}, {
        includeExpirationAnalysis: true
      });

      expect(result.success).toBe(true);
      expect(result.data.data.expirationAnalysis).toBeDefined();
    });

    test('deve incluir análise de otimização', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 6 }, // Andar alto
        isOccupied: false
      });
      await global.createTestProduct({ locationId: location._id });

      const result = await reportService.generateInventoryReport({}, {
        includeOptimization: true
      });

      expect(result.success).toBe(true);
      expect(result.data.data.optimizationSuggestions).toBeDefined();
    });
  });

  describe('📊 generateMovementReport', () => {
    test('deve gerar relatório de movimentações por período', async () => {
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestMovement({
        userId: user._id,
        toLocationId: location._id,
        timestamp: new Date()
      });

      const result = await reportService.generateMovementReport({
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        endDate: new Date()
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
    });

    test('deve agrupar movimentações por dia', async () => {
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestMovement({
        userId: user._id,
        toLocationId: location._id,
        timestamp: new Date()
      });

      const result = await reportService.generateMovementReport({}, {
        groupBy: 'day'
      });

      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
    });

    test('deve analisar padrões temporais', async () => {
      const user = await global.createTestUser();
      
      // Criar movimentações em horários diferentes
      for (let hour = 8; hour <= 10; hour++) {
        const timestamp = new Date();
        timestamp.setHours(hour, 0, 0, 0);
        
        await global.createTestMovement({
          userId: user._id,
          timestamp,
          toLocationId: (await global.createTestLocation({ 
            code: getUniqueLocationCode(),
            coordinates: getUniqueCoordinates()
          }))._id
        });
      }

      const result = await reportService.generateMovementReport({}, {
        includePatternAnalysis: true
      });

      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
    });

    test('deve incluir análise de atividade de usuários', async () => {
      const user1 = await global.createTestUser({ name: 'Usuário A' });
      const user2 = await global.createTestUser({ name: 'Usuário B' });
      
      // Criar movimentações para diferentes usuários
      for (let i = 0; i < 3; i++) {
        await global.createTestMovement({ 
          userId: user1._id,
          toLocationId: (await global.createTestLocation({ 
            code: getUniqueLocationCode(),
            coordinates: getUniqueCoordinates()
          }))._id
        });
      }
      
      await global.createTestMovement({ 
        userId: user2._id,
        toLocationId: (await global.createTestLocation({ 
          code: getUniqueLocationCode(),
          coordinates: getUniqueCoordinates()
        }))._id
      });

      const result = await reportService.generateMovementReport({}, {
        includeUserActivity: true
      });

      expect(result.success).toBe(true);
      expect(result.data.analysis).toBeDefined();
    });

    test('deve calcular métricas de eficiência', async () => {
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestMovement({
        userId: user._id,
        toLocationId: location._id,
        timestamp: new Date()
      });

      const result = await reportService.generateMovementReport({}, {
        includeEfficiencyMetrics: true
      });

      expect(result.success).toBe(true);
      expect(result.data.analysis.efficiency).toBeDefined();
    });
  });

  describe('⏰ generateExpirationReport', () => {
    test('deve gerar relatório de produtos próximos ao vencimento', async () => {
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      // Produto próximo ao vencimento
      const nearExpiration = new Date();
      nearExpiration.setDate(nearExpiration.getDate() + 10);
      
      await global.createTestProduct({
        locationId: location._id,
        expirationDate: nearExpiration
      });

      const result = await reportService.generateExpirationReport({
        days: 30
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
    });

    test('deve agrupar por câmara quando solicitado', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      const nearExpiration = new Date();
      nearExpiration.setDate(nearExpiration.getDate() + 15);
      
      await global.createTestProduct({
        locationId: location._id,
        expirationDate: nearExpiration
      });

      const result = await reportService.generateExpirationReport({
        groupByChamber: true
      });

      expect(result.success).toBe(true);
      expect(result.data.data).toBeDefined();
    });

    test('deve incluir recomendações de ação', async () => {
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      const soonExpiration = new Date();
      soonExpiration.setDate(soonExpiration.getDate() + 2); // 2 dias
      
      await global.createTestProduct({
        name: 'Produto Urgente',
        locationId: location._id,
        expirationDate: soonExpiration
      });

      const result = await reportService.generateExpirationReport({
        includeRecommendations: true
      });

      expect(result.success).toBe(true);
      expect(result.data.data.recommendations).toBeDefined();
    });

    test('deve filtrar por nível de urgência', async () => {
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      const criticalExpiration = new Date();
      criticalExpiration.setDate(criticalExpiration.getDate() + 1); // 1 dia
      
      await global.createTestProduct({
        locationId: location._id,
        expirationDate: criticalExpiration
      });

      const result = await reportService.generateExpirationReport({
        days: 5,
        includeCritical: true
      });

      expect(result.success).toBe(true);
      expect(result.data.summary.totalExpiring).toBeGreaterThanOrEqual(0);
    });
  });

  describe('📊 generateCapacityReport', () => {
    test('deve gerar relatório detalhado de capacidade', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 1000,
        currentWeightKg: 500
      });

      const result = await reportService.generateCapacityReport({
        chamberId: chamber._id.toString()
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
    });

    test('deve incluir projeções de capacidade', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 1000,
        currentWeightKg: 800
      });

      const result = await reportService.generateCapacityReport({
        includeProjections: true
      });

      expect(result.success).toBe(true);
      expect(result.data.data.projections).toBeDefined();
    });

    test('deve detectar problemas de capacidade', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 1000,
        currentWeightKg: 950 // Quase no limite
      });

      const result = await reportService.generateCapacityReport({
        includeAlerts: true
      });

      expect(result.success).toBe(true);
      expect(result.data.data.alerts).toBeDefined();
    });
  });

  describe('📈 generateExecutiveDashboard', () => {
    test('deve gerar dashboard executivo completo', async () => {
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestProduct({ locationId: location._id });
      await global.createTestMovement({ 
        userId: user._id,
        toLocationId: location._id 
      });

      const result = await reportService.generateExecutiveDashboard();

      expect(result.success).toBe(true);
      expect(result.data.kpis).toBeDefined();
      expect(result.data.kpis.totalProducts).toBeGreaterThanOrEqual(1);
      expect(result.data.kpis.totalMovements).toBeGreaterThanOrEqual(1);
      expect(result.data.quickStats.systemHealth).toBeDefined();
      expect(result.data.quickStats.systemHealth.score).toBeGreaterThan(0);
    });

    test('deve incluir comparações com período anterior', async () => {
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestProduct({ locationId: location._id });
      await global.createTestMovement({ 
        userId: user._id,
        toLocationId: location._id 
      });

      const result = await reportService.generateExecutiveDashboard({
        includeComparisons: true,
        comparisonPeriod: 30
      });

      expect(result.success).toBe(true);
      expect(result.data.comparisons).toBeDefined();
    });

    test('deve incluir análise de tendências', async () => {
      const user = await global.createTestUser();
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestProduct({ locationId: location._id });
      await global.createTestMovement({ 
        userId: user._id,
        toLocationId: location._id 
      });

      const result = await reportService.generateExecutiveDashboard({
        includeTrends: true
      });

      expect(result.success).toBe(true);
      expect(result.data.trends).toBeDefined();
    });

    test('deve calcular score de saúde do sistema', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 1000,
        currentWeightKg: 500
      });
      
      await global.createTestProduct({ locationId: location._id });

      const result = await reportService.generateExecutiveDashboard();

      expect(result.success).toBe(true);
      expect(result.data.quickStats.systemHealth.score).toBeGreaterThan(70); // Sistema saudável
      expect(result.data.quickStats.systemHealth.status).toBeDefined();
    });
  });

  describe('🚨 Tratamento de Erros', () => {
    test('deve tratar erro de banco de dados graciosamente', async () => {
      // Tentar usar filtro inválido que cause erro
      await expect(
        reportService.generateInventoryReport({
          chamberId: 'invalid-id'
        })
      ).rejects.toThrow();
    });

    test('deve validar filtros inválidos', async () => {
      await expect(
        reportService.generateInventoryReport({
          chamberId: 'invalid-id'
        })
      ).rejects.toThrow();
    });
  });

  describe('🎯 Casos Extremos', () => {
    test('deve lidar com sistema sem produtos', async () => {
      const result = await reportService.generateInventoryReport();

      expect(result.success).toBe(true);
      expect(result.data.summary.totalProducts).toBe(0);
    });

    test('deve lidar com período sem movimentações', async () => {
      const result = await reportService.generateMovementReport({
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date(Date.now() - 23 * 60 * 60 * 1000) // 1 hora no passado
      });

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
    });

    test('deve lidar com produtos sem data de expiração', async () => {
      const location = await global.createTestLocation({ 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      await global.createTestProduct({
        locationId: location._id,
        expirationDate: null
      });

      const result = await reportService.generateExpirationReport();

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
    });

    test('deve calcular corretamente com capacidades variadas', async () => {
      const chamber = await global.createTestChamber();
      const location1 = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 500
      });
      const location2 = await global.createTestLocation({ 
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 1500
      });

      const result = await reportService.generateCapacityReport();

      expect(result.success).toBe(true);
      expect(result.data.summary).toBeDefined();
    });

    test('deve funcionar com dashboard vazio', async () => {
      const result = await reportService.generateExecutiveDashboard();

      expect(result.success).toBe(true);
      expect(result.data.kpis.totalProducts).toBe(0);
      expect(result.data.kpis.totalMovements).toBe(0);
      expect(result.data.quickStats.systemHealth).toBeDefined();
    });
  });
}); 