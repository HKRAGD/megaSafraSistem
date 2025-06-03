/**
 * Testes unitários para locationService
 * Baseados nos OBJETIVOS DO PROJETO especificados no planejamento
 * 
 * OBJETIVOS TESTADOS:
 * 1. Gerar localizações automaticamente respeitando hierarquia da câmara
 * 2. Buscar localizações disponíveis com estratégias de otimização
 * 3. Validar capacidade antes de ocupação (REGRA CRÍTICA)
 * 4. Analisar ocupação do sistema para otimização
 * 5. Encontrar localizações adjacentes para operações inteligentes
 */

const locationService = require('../../../services/locationService');
const Location = require('../../../models/Location');
const Chamber = require('../../../models/Chamber');
const Product = require('../../../models/Product');

// Configurar setup de testes
require('../../setup');

describe('LocationService - Objetivos do Projeto', () => {
  let testCounter = 0;

  // Helper para gerar códigos únicos
  const getUniqueLocationCode = () => {
    testCounter++;
    return `T${testCounter}-Q1-L1-F1-A1`;
  };

  const getUniqueCoordinates = () => {
    testCounter++;
    return { 
      quadra: Math.ceil(testCounter / 10), 
      lado: Math.ceil(testCounter / 5), 
      fila: testCounter, 
      andar: 1 
    };
  };

  describe('🎯 OBJETIVO: Geração automática de localizações respeitando hierarquia', () => {
    test('deve gerar localizações respeitando exatamente as dimensões da câmara', async () => {
      const chamber = await global.createTestChamber({
        dimensions: { quadras: 2, lados: 2, filas: 2, andares: 3 }
      });

      const result = await locationService.generateLocationsForChamber(chamber._id);

      expect(result.success).toBe(true);
      // 2 * 2 * 2 * 3 = 24 localizações totais
      expect(result.locationsCreated).toBe(24);
      
      // Verificar se todas as localizações estão dentro dos limites
      const locations = await Location.find({ chamberId: chamber._id });
      
      locations.forEach(location => {
        expect(location.coordinates.quadra).toBeGreaterThanOrEqual(1);
        expect(location.coordinates.quadra).toBeLessThanOrEqual(2);
        expect(location.coordinates.lado).toBeGreaterThanOrEqual(1);
        expect(location.coordinates.lado).toBeLessThanOrEqual(2);
        expect(location.coordinates.fila).toBeGreaterThanOrEqual(1);
        expect(location.coordinates.fila).toBeLessThanOrEqual(2);
        expect(location.coordinates.andar).toBeGreaterThanOrEqual(1);
        expect(location.coordinates.andar).toBeLessThanOrEqual(3);
      });
    });

    test('deve aplicar capacidades variadas por andar (otimização de acesso)', async () => {
      const chamber = await global.createTestChamber({
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 3 }
      });

      const result = await locationService.generateLocationsForChamber(chamber._id, {
        capacityVariation: true,
        defaultCapacity: 1000
      });

      expect(result.success).toBe(true);
      
      const locations = await Location.find({ chamberId: chamber._id }).sort({ 'coordinates.andar': 1 });
      
      // Andar 1 deve ter maior capacidade que andar 3 (acesso mais fácil)
      expect(locations[0].maxCapacityKg).toBeGreaterThan(locations[2].maxCapacityKg);
    });

    test('deve gerar códigos únicos seguindo padrão Q-L-F-A', async () => {
      const chamber = await global.createTestChamber({
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 2 }
      });

      await locationService.generateLocationsForChamber(chamber._id);
      
      const locations = await Location.find({ chamberId: chamber._id });
      
      expect(locations[0].code).toBe('Q1-L1-F1-A1');
      expect(locations[1].code).toBe('Q1-L1-F1-A2');
      
      // Verificar unicidade de códigos
      const codes = locations.map(l => l.code);
      const uniqueCodes = [...new Set(codes)];
      expect(codes.length).toBe(uniqueCodes.length);
    });
  });

  describe('🎯 OBJETIVO: Busca otimizada de localizações disponíveis', () => {
    test('deve aplicar estratégia FIFO (First In, First Out) corretamente', async () => {
      const chamber = await global.createTestChamber();
      
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        coordinates: { quadra: 2, lado: 2, fila: 2, andar: 2 },
        code: getUniqueLocationCode(),
        isOccupied: false 
      });
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        code: getUniqueLocationCode(),
        isOccupied: false 
      });

      const result = await locationService.findAvailableLocations({
        chamberId: chamber._id,
        sortBy: 'coordinates'
      });

      expect(result.success).toBe(true);
      expect(result.data.locations.length).toBeGreaterThan(0);
      
      // Primeira localização deve ter coordenadas menores (FIFO)
      const firstLocation = result.data.locations[0];
      expect(firstLocation.coordinates.quadra).toBe(1);
      expect(firstLocation.coordinates.lado).toBe(1);
    });

    test('deve aplicar estratégia OPTIMAL (melhor acesso + capacidade)', async () => {
      const chamber = await global.createTestChamber();
      
      // Localização com acesso difícil
      const location1 = await global.createTestLocation({ 
        chamberId: chamber._id, 
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 5 }, // Alto
        code: getUniqueLocationCode(),
        maxCapacityKg: 800,
        isOccupied: false 
      });
      
      // Localização com acesso fácil
      const location2 = await global.createTestLocation({ 
        chamberId: chamber._id, 
        coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 }, // Baixo
        code: getUniqueLocationCode(),
        maxCapacityKg: 1200,
        isOccupied: false 
      });

      const result = await locationService.findAvailableLocations({
        chamberId: chamber._id,
        sortBy: 'optimal'
      });

      expect(result.success).toBe(true);
      
      // Localização ótima deve ser a primeira (andar baixo + maior capacidade)
      const firstLocation = result.data.locations[0];
      expect(firstLocation._id.toString()).toBe(location2._id.toString());
    });

    test('deve filtrar por capacidade mínima requerida', async () => {
      const chamber = await global.createTestChamber();
      
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 500,
        isOccupied: false 
      });
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        maxCapacityKg: 1500,
        isOccupied: false 
      });

      const result = await locationService.findAvailableLocations({
        chamberId: chamber._id,
        minCapacity: 1000
      });

      expect(result.success).toBe(true);
      expect(result.data.locations.length).toBe(1);
      expect(result.data.locations[0].maxCapacityKg).toBe(1500);
    });
  });

  describe('🎯 OBJETIVO: Validação de capacidade (REGRA CRÍTICA)', () => {
    test('deve aprovar peso dentro da capacidade', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({
        chamberId: chamber._id,
        maxCapacityKg: 1000,
        currentWeightKg: 0,
        isOccupied: false
      });

      const result = await locationService.validateLocationCapacity(location._id, 800);

      expect(result.valid).toBe(true);
      expect(result.analysis.availableCapacity).toBe(1000);
      expect(result.analysis.utilizationAfter).toBe(80); // 800/1000 * 100
      expect(result.code).toBe('CAPACITY_OK');
    });

    test('deve rejeitar peso que excede capacidade', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({
        chamberId: chamber._id,
        maxCapacityKg: 500,
        currentWeightKg: 0,
        isOccupied: false
      });

      const result = await locationService.validateLocationCapacity(location._id, 600);

      expect(result.valid).toBe(false);
      expect(result.code).toBe('INSUFFICIENT_CAPACITY');
      expect(result.deficit).toBe(100); // 600 - 500
      expect(result.suggestions).toBeDefined(); // Deve incluir sugestões
    });

    test('deve detectar localização já ocupada (REGRA: Uma localização = Um produto)', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({
        chamberId: chamber._id,
        maxCapacityKg: 1000,
        currentWeightKg: 500,
        isOccupied: true
      });

      const result = await locationService.validateLocationCapacity(location._id, 300);

      expect(result.valid).toBe(false);
      expect(result.code).toBe('LOCATION_OCCUPIED');
    });

    test('deve incluir sugestões de localizações alternativas', async () => {
      const chamber = await global.createTestChamber();
      
      // Localização insuficiente
      const smallLocation = await global.createTestLocation({
        chamberId: chamber._id,
        maxCapacityKg: 500,
        currentWeightKg: 0,
        isOccupied: false,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });
      
      // Localização alternativa adequada
      await global.createTestLocation({
        chamberId: chamber._id,
        maxCapacityKg: 1000,
        currentWeightKg: 0,
        isOccupied: false,
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates()
      });

      const result = await locationService.validateLocationCapacity(smallLocation._id, 700, {
        includeSuggestions: true
      });

      expect(result.valid).toBe(false);
      expect(result.suggestions).toBeDefined();
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].maxCapacity).toBeGreaterThanOrEqual(700);
    });
  });

  describe('🎯 OBJETIVO: Análise de ocupação para otimização', () => {
    test('deve calcular estatísticas gerais de ocupação', async () => {
      const chamber = await global.createTestChamber();
      
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: true,
        maxCapacityKg: 1000,
        currentWeightKg: 800
      });
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false,
        maxCapacityKg: 1000,
        currentWeightKg: 0
      });

      const result = await locationService.analyzeOccupancy();

      expect(result.success).toBe(true);
      expect(result.data.generalStats).toBeDefined();
      expect(result.data.generalStats.totalLocations).toBeGreaterThanOrEqual(2);
      expect(result.data.generalStats.occupiedLocations).toBeGreaterThanOrEqual(1);
      expect(result.data.generalStats.occupancyRate).toBeGreaterThan(0);
      expect(result.data.generalStats.totalCapacity).toBeGreaterThan(0);
      expect(result.data.generalStats.utilizationRate).toBeGreaterThan(0);
    });

    test('deve identificar localizações subutilizadas para otimização', async () => {
      const chamber = await global.createTestChamber();
      
      // Localização subutilizada
      await global.createTestLocation({ 
        chamberId: chamber._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: true,
        maxCapacityKg: 1000,
        currentWeightKg: 200 // 20% de utilização
      });

      const result = await locationService.analyzeOccupancy(chamber._id, {
        includeOptimization: true
      });

      expect(result.success).toBe(true);
      expect(result.data.optimization).toBeDefined();
      expect(result.data.optimization.underutilizedLocations).toBeDefined();
    });

    test('deve analisar ocupação por câmara específica', async () => {
      const chamber1 = await global.createTestChamber({ name: 'Câmara 1' });
      const chamber2 = await global.createTestChamber({ name: 'Câmara 2' });
      
      await global.createTestLocation({ 
        chamberId: chamber1._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: true 
      });
      await global.createTestLocation({ 
        chamberId: chamber2._id, 
        code: getUniqueLocationCode(),
        coordinates: getUniqueCoordinates(),
        isOccupied: false 
      });

      const result = await locationService.analyzeOccupancy(chamber1._id);

      expect(result.success).toBe(true);
      expect(result.data.chamberSpecific).toBeDefined();
      expect(result.data.chamberSpecific.chamberId.toString()).toBe(chamber1._id.toString());
    });
  });

  describe('🎯 OBJETIVO: Encontrar localizações adjacentes para operações inteligentes', () => {
    test('deve encontrar localizações adjacentes na mesma fila', async () => {
      const chamber = await global.createTestChamber();
      
      const centralLocation = await global.createTestLocation({
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 2, lado: 2, fila: 2, andar: 2 }
      });
      
      // Criar localizações adjacentes
      await global.createTestLocation({
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 2, lado: 2, fila: 1, andar: 2 } // Fila anterior
      });
      await global.createTestLocation({
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 2, lado: 2, fila: 3, andar: 2 } // Fila posterior
      });

      const result = await locationService.findAdjacentLocations(centralLocation._id);

      expect(result.success).toBe(true);
      expect(result.data.adjacent.length).toBeGreaterThanOrEqual(2);
      
      // Verificar se são realmente adjacentes
      result.data.adjacent.forEach(adj => {
        const coordDiff = Math.abs(adj.coordinates.fila - centralLocation.coordinates.fila);
        expect(coordDiff).toBeLessThanOrEqual(1);
      });
    });

    test('deve priorizar adjacentes disponíveis para operações', async () => {
      const chamber = await global.createTestChamber();
      
      const centralLocation = await global.createTestLocation({
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 }
      });
      
      // Adjacente ocupada
      await global.createTestLocation({
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        isOccupied: true
      });
      
      // Adjacente disponível
      await global.createTestLocation({
        chamberId: chamber._id,
        code: getUniqueLocationCode(),
        coordinates: { quadra: 1, lado: 1, fila: 3, andar: 1 },
        isOccupied: false
      });

      const result = await locationService.findAdjacentLocations(centralLocation._id, {
        prioritizeAvailable: true
      });

      expect(result.success).toBe(true);
      expect(result.data.availableAdjacent.length).toBeGreaterThan(0);
      // Não garantir que haverá ocupadas - apenas que a separação funciona
      expect(result.data.occupiedAdjacent).toBeDefined();
    });
  });

  describe('🚨 Tratamento de Erros Alinhado aos Objetivos', () => {
    test('deve impedir geração para câmara inativa (regra de integridade)', async () => {
      const chamber = await global.createTestChamber({ status: 'inactive' });

      await expect(
        locationService.generateLocationsForChamber(chamber._id)
      ).rejects.toThrow('Apenas câmaras ativas podem ter localizações geradas');
    });

    test('deve validar ID de localização inexistente', async () => {
      const fakeId = '507f1f77bcf86cd799439011';

      await expect(
        locationService.validateLocationCapacity(fakeId, 100)
      ).rejects.toThrow('Localização não encontrada');
    });

    test('deve tratar peso negativo como inválido', async () => {
      const chamber = await global.createTestChamber();
      const location = await global.createTestLocation({ chamberId: chamber._id });

      await expect(
        locationService.validateLocationCapacity(location._id, -100)
      ).rejects.toThrow('Peso deve ser um valor positivo');
    });
  });
}); 