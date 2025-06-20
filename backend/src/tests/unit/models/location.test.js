/**
 * Testes unitários para Location model
 * Baseado nos objetivos reais do projeto conforme planejamento
 * Objetivo: Regra crítica "Uma Localização = Um Produto" + Validação de Capacidade
 */

const Location = require('../../../models/Location');
const Chamber = require('../../../models/Chamber');

describe('Location Model - Objetivos do Projeto', () => {

  let testChamber;

  beforeEach(async () => {
    // Criar câmara de teste para as localizações
    testChamber = await Chamber.create({
      name: 'Câmara Teste',
      dimensions: { quadras: 5, lados: 4, filas: 6, andares: 3 }
    });
  });

  describe('📋 Schema Conforme Planejamento', () => {
    test('deve criar localização com campos obrigatórios', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: {
          quadra: 1,
          lado: 2,
          fila: 3,
          andar: 4
        }
      });
      
      expect(location.chamberId.toString()).toBe(testChamber._id.toString());
      expect(location.coordinates.quadra).toBe(1);
      expect(location.coordinates.lado).toBe(2);
      expect(location.coordinates.fila).toBe(3);
      expect(location.coordinates.andar).toBe(4);
      expect(location.code).toBe('Q1-L2-F3-A4'); // Auto-gerado
      expect(location.isOccupied).toBe(false); // Default
      expect(location.maxCapacityKg).toBe(1000); // Default
      expect(location.currentWeightKg).toBe(0); // Default
      expect(location.createdAt).toBeDefined();
      expect(location.updatedAt).toBeDefined();
    });

    test('deve criar localização com todos os campos opcionais', async () => {
      const locationData = {
        chamberId: testChamber._id,
        coordinates: {
          quadra: 2,
          lado: 3,
          fila: 4,
          andar: 1
        },
        maxCapacityKg: 2000,
        currentWeightKg: 500,
        metadata: {
          notes: 'Localização especial',
          accessLevel: 'elevated'
        }
      };
      
      const location = await Location.create(locationData);
      
      expect(location.maxCapacityKg).toBe(2000);
      expect(location.currentWeightKg).toBe(500);
      expect(location.isOccupied).toBe(true); // Auto-calculado pelo middleware
      expect(location.metadata.notes).toBe('Localização especial');
      expect(location.metadata.accessLevel).toBe('elevated');
    });

    test('deve exigir campos obrigatórios', async () => {
      let error;
      try {
        await Location.create({});
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.chamberId).toBeDefined();
      expect(error.errors['coordinates.quadra']).toBeDefined();
      expect(error.errors['coordinates.lado']).toBeDefined();
      expect(error.errors['coordinates.fila']).toBeDefined();
      expect(error.errors['coordinates.andar']).toBeDefined();
    });

    test('deve garantir unicidade de coordenadas por câmara', async () => {
      await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 }
      });
      
      let error;
      try {
        await Location.create({
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 } // Mesmas coordenadas
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // Duplicate key
    });

    test('deve garantir unicidade de código', async () => {
      await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        code: 'Q1-L1-F1-A1'
      });
      
      let error;
      try {
        await Location.create({
          chamberId: testChamber._id,
          coordinates: { quadra: 2, lado: 2, fila: 2, andar: 2 },
          code: 'Q1-L1-F1-A1' // Mesmo código
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // Duplicate key
    });

    test('deve validar coordenadas como números inteiros', async () => {
      let error;
      try {
        await Location.create({
          chamberId: testChamber._id,
          coordinates: { quadra: 1.5, lado: 2, fila: 3, andar: 4 }
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
    });

    test('deve validar capacidades positivas', async () => {
      // Capacidade máxima inválida
      let error;
      try {
        await Location.create({
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
          maxCapacityKg: -100
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();

      // Peso atual inválido
      try {
        await Location.create({
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 },
          currentWeightKg: -50
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });
  });

  describe('🎯 Regra Crítica: Uma Localização = Um Produto', () => {
    test('deve atualizar isOccupied automaticamente baseado no peso', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        currentWeightKg: 0
      });
      
      expect(location.isOccupied).toBe(false);
      
      // Adicionar peso
      location.currentWeightKg = 100;
      await location.save();
      
      expect(location.isOccupied).toBe(true);
      
      // Remover peso
      location.currentWeightKg = 0;
      await location.save();
      
      expect(location.isOccupied).toBe(false);
    });

    test('canAccommodateWeight deve verificar capacidade disponível', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        maxCapacityKg: 1000,
        currentWeightKg: 300
      });
      
      // Pode acomodar peso dentro da capacidade
      expect(location.canAccommodateWeight(500)).toBe(true);
      expect(location.canAccommodateWeight(700)).toBe(true);
      
      // Não pode acomodar peso que excede capacidade
      expect(location.canAccommodateWeight(800)).toBe(false);
      expect(location.canAccommodateWeight(1000)).toBe(false);
    });

    test('addWeight deve adicionar peso respeitando capacidade', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        maxCapacityKg: 1000,
        currentWeightKg: 200
      });
      
      // Adicionar peso válido
      await location.addWeight(300);
      expect(location.currentWeightKg).toBe(500);
      expect(location.isOccupied).toBe(true);
      
      // Tentar adicionar peso que excede capacidade
      let error;
      try {
        await location.addWeight(600); // 500 + 600 = 1100 > 1000
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.message).toContain('Capacidade disponível');
      expect(location.currentWeightKg).toBe(500); // Não deve ter mudado
    });

    test('removeWeight deve remover peso corretamente', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        currentWeightKg: 500
      });
      
      // Remover peso válido
      await location.removeWeight(200);
      expect(location.currentWeightKg).toBe(300);
      expect(location.isOccupied).toBe(true);
      
      // Remover todo o peso
      await location.removeWeight(300);
      expect(location.currentWeightKg).toBe(0);
      expect(location.isOccupied).toBe(false);
      
      // Tentar remover mais peso do que existe
      let error;
      try {
        await location.removeWeight(100);
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.message).toContain('Peso atual');
    });

    test('middleware deve impedir peso atual > capacidade máxima', async () => {
      let error;
      try {
        await Location.create({
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
          maxCapacityKg: 1000,
          currentWeightKg: 1500 // Excede capacidade
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.message).toContain('excede capacidade máxima');
    });
  });

  describe('📊 Virtuals e Cálculos', () => {
    test('availableCapacityKg deve calcular capacidade disponível', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        maxCapacityKg: 1000,
        currentWeightKg: 300
      });
      
      expect(location.availableCapacityKg).toBe(700);
    });

    test('occupancyPercentage deve calcular percentual de ocupação', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        maxCapacityKg: 1000,
        currentWeightKg: 250
      });
      
      expect(location.occupancyPercentage).toBe(25);
    });

    test('capacityStatus deve categorizar status da capacidade', async () => {
      const testCases = [
        { weight: 0, expected: 'empty', coords: { quadra: 1, lado: 1, fila: 1, andar: 1 } },
        { weight: 200, expected: 'low', coords: { quadra: 1, lado: 1, fila: 1, andar: 2 } },    // 20%
        { weight: 600, expected: 'medium', coords: { quadra: 1, lado: 1, fila: 2, andar: 1 } }, // 60%
        { weight: 900, expected: 'high', coords: { quadra: 1, lado: 1, fila: 2, andar: 2 } },   // 90%
        { weight: 1000, expected: 'full', coords: { quadra: 1, lado: 1, fila: 3, andar: 1 } }   // 100%
      ];
      
      for (const testCase of testCases) {
        const location = await Location.create({
          chamberId: testChamber._id,
          coordinates: testCase.coords,
          maxCapacityKg: 1000,
          currentWeightKg: testCase.weight
        });
        
        expect(location.capacityStatus).toBe(testCase.expected);
      }
    });

    test('coordinatesText deve formatar coordenadas', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 3, lado: 2, fila: 5, andar: 1 }
      });
      
      expect(location.coordinatesText).toBe('Quadra 3, Lado 2, Fila 5, Andar 1');
    });
  });

  describe('🔍 Métodos de Busca e Consulta', () => {
    beforeEach(async () => {
      // Criar localizações de teste
      await Location.create([
        {
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
          currentWeightKg: 0 // Vazia
        },
        {
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 1, andar: 2 },
          currentWeightKg: 500 // Ocupada
        },
        {
          chamberId: testChamber._id,
          coordinates: { quadra: 1, lado: 1, fila: 2, andar: 1 },
          maxCapacityKg: 2000,
          currentWeightKg: 800 // Capacidade maior
        }
      ]);
    });

    test('findAvailable deve retornar apenas localizações disponíveis', async () => {
      const available = await Location.findAvailable();
      
      expect(available.length).toBeGreaterThan(0);
      available.forEach(location => {
        expect(location.isOccupied).toBe(false);
      });
    });

    test('findOccupied deve retornar apenas localizações ocupadas', async () => {
      const occupied = await Location.findOccupied();
      
      expect(occupied.length).toBeGreaterThan(0);
      occupied.forEach(location => {
        expect(location.isOccupied).toBe(true);
      });
    });

    test('findByChamber deve filtrar por câmara', async () => {
      const locations = await Location.findByChamber(testChamber._id);
      
      expect(locations.length).toBe(3);
      locations.forEach(location => {
        // Como o método popula o chamberId, precisamos acessar o _id do objeto populado
        const chamberIdToCompare = location.chamberId._id ? 
          location.chamberId._id.toString() : 
          location.chamberId.toString();
        expect(chamberIdToCompare).toBe(testChamber._id.toString());
      });
    });

    test('findByCapacityRange deve filtrar por faixa de capacidade', async () => {
      const highCapacity = await Location.findByCapacityRange(1500, 3000);
      
      expect(highCapacity.length).toBeGreaterThan(0);
      highCapacity.forEach(location => {
        expect(location.maxCapacityKg).toBeGreaterThanOrEqual(1500);
        expect(location.maxCapacityKg).toBeLessThanOrEqual(3000);
      });
    });

    test('getStats deve calcular estatísticas corretas', async () => {
      const stats = await Location.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.available).toBe(1);
      expect(stats.occupied).toBe(2);
      expect(stats.totalCapacity).toBeGreaterThan(0);
      expect(stats.usedCapacity).toBeGreaterThan(0);
      expect(stats.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(stats.utilizationRate).toBeLessThanOrEqual(100);
    });
  });

  describe('📊 Validações e Integridade', () => {
    test('deve gerar código automaticamente se não fornecido', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 2, lado: 3, fila: 4, andar: 1 }
      });
      
      expect(location.code).toBe('Q2-L3-F4-A1');
    });

    test('deve aceitar código personalizado', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        code: 'CUSTOM-CODE'
      });
      
      expect(location.code).toBe('CUSTOM-CODE');
    });

    test('deve incluir timestamps automáticos', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 }
      });
      
      expect(location.createdAt).toBeDefined();
      expect(location.updatedAt).toBeDefined();
      expect(location.createdAt).toBeInstanceOf(Date);
    });

    test('toJSON deve excluir campos internos', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 }
      });
      
      const json = location.toJSON();
      expect(json.__v).toBeUndefined();
      expect(json.id).toBeDefined(); // Virtual id deve estar presente
    });

    test('deve permitir metadados opcionais', async () => {
      const location = await Location.create({
        chamberId: testChamber._id,
        coordinates: { quadra: 1, lado: 1, fila: 1, andar: 1 },
        metadata: {
          installationDate: new Date(),
          notes: 'Localização especial',
          accessLevel: 'high'
        }
      });
      
      expect(location.metadata.notes).toBe('Localização especial');
      expect(location.metadata.accessLevel).toBe('high');
      expect(location.metadata.installationDate).toBeInstanceOf(Date);
    });
  });
});

console.log('✅ Testes do Location model (Regra Crítica: Uma Localização = Um Produto) criados!'); 