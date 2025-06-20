/**
 * Testes unitários para Chamber model
 * Baseado nos objetivos reais do projeto conforme planejamento
 * Objetivo: Estrutura hierárquica para controle de temperatura/umidade
 */

const Chamber = require('../../../models/Chamber');

describe('Chamber Model - Objetivos do Projeto', () => {

  describe('📋 Schema Conforme Planejamento', () => {
    test('deve criar câmara com campos obrigatórios', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Principal',
        dimensions: {
          quadras: 5,
          lados: 4,
          filas: 6,
          andares: 3
        }
      });
      
      expect(chamber.name).toBe('Câmara Principal');
      expect(chamber.dimensions.quadras).toBe(5);
      expect(chamber.dimensions.lados).toBe(4);
      expect(chamber.dimensions.filas).toBe(6);
      expect(chamber.dimensions.andares).toBe(3);
      expect(chamber.status).toBe('active'); // default
      expect(chamber.createdAt).toBeDefined();
      expect(chamber.updatedAt).toBeDefined();
    });

    test('deve criar câmara com todos os campos opcionais', async () => {
      const chamberData = {
        name: 'Câmara Completa',
        description: 'Câmara com controle total de clima',
        currentTemperature: 12,
        currentHumidity: 55,
        dimensions: {
          quadras: 3,
          lados: 2,
          filas: 4,
          andares: 5
        },
        status: 'maintenance'
      };
      
      const chamber = await Chamber.create(chamberData);
      
      expect(chamber.name).toBe('Câmara Completa');
      expect(chamber.description).toBe('Câmara com controle total de clima');
      expect(chamber.currentTemperature).toBe(12);
      expect(chamber.currentHumidity).toBe(55);
      expect(chamber.status).toBe('maintenance');
    });

    test('deve exigir campos obrigatórios', async () => {
      let error;
      try {
        await Chamber.create({});
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
      expect(error.errors['dimensions.quadras']).toBeDefined();
      expect(error.errors['dimensions.lados']).toBeDefined();
      expect(error.errors['dimensions.filas']).toBeDefined();
      expect(error.errors['dimensions.andares']).toBeDefined();
    });

    test('deve garantir nome único', async () => {
      await Chamber.create({
        name: 'Câmara Única',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
      });
      
      let error;
      try {
        await Chamber.create({
          name: 'Câmara Única',
          dimensions: { quadras: 2, lados: 2, filas: 2, andares: 2 }
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // Duplicate key
    });

    test('deve validar valores de status', async () => {
      let error;
      try {
        await Chamber.create({
          name: 'Teste Status',
          dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
          status: 'status-inválido'
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.status).toBeDefined();
    });

    test('deve validar faixas de temperatura', async () => {
      // Temperatura válida
      const validChamber = await Chamber.create({
        name: 'Teste Temp Válida',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
        currentTemperature: 15
      });
      expect(validChamber.currentTemperature).toBe(15);

      // Temperatura inválida
      let error;
      try {
        await Chamber.create({
          name: 'Teste Temp Inválida',
          dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
          currentTemperature: -60
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });

    test('deve validar faixas de umidade', async () => {
      // Umidade válida
      const validChamber = await Chamber.create({
        name: 'Teste Umidade Válida',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
        currentHumidity: 60
      });
      expect(validChamber.currentHumidity).toBe(60);

      // Umidade inválida
      let error;
      try {
        await Chamber.create({
          name: 'Teste Umidade Inválida',
          dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
          currentHumidity: 150
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });
  });

  describe('🏗️ Objetivo: Estrutura Hierárquica', () => {
    test('deve validar dimensões mínimas obrigatórias', async () => {
      // Dimensões válidas mínimas
      const chamber = await Chamber.create({
        name: 'Câmara Mínima',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
      });
      
      expect(chamber.totalLocations).toBe(1); // 1*1*1*1

      // Dimensão inválida (zero)
      let error;
      try {
        await Chamber.create({
          name: 'Câmara Inválida',
          dimensions: { quadras: 0, lados: 1, filas: 1, andares: 1 }
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });

    test('deve calcular total de localizações corretamente', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Cálculo',
        dimensions: { quadras: 3, lados: 4, filas: 5, andares: 2 }
      });
      
      expect(chamber.totalLocations).toBe(120); // 3*4*5*2
    });

    test('deve validar coordenadas dentro dos limites', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Validação',
        dimensions: { quadras: 3, lados: 2, filas: 4, andares: 5 }
      });
      
      // Coordenadas válidas
      const validCoords = chamber.validateCoordinates(3, 2, 4, 5);
      expect(validCoords.quadra).toBe(true);
      expect(validCoords.lado).toBe(true);
      expect(validCoords.fila).toBe(true);
      expect(validCoords.andar).toBe(true);
      
      // Coordenadas inválidas (excedem limite)
      const invalidCoords = chamber.validateCoordinates(4, 2, 4, 5);
      expect(invalidCoords.quadra).toBe(false);
      expect(invalidCoords.lado).toBe(true);
      expect(invalidCoords.fila).toBe(true);
      expect(invalidCoords.andar).toBe(true);
    });

    test('deve gerar códigos de localização corretos', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Códigos',
        dimensions: { quadras: 5, lados: 3, filas: 6, andares: 4 }
      });
      
      const code = chamber.generateLocationCode(5, 3, 6, 4);
      expect(code).toBe('Q5-L3-F6-A4');
      
      // Deve falhar com coordenadas inválidas
      expect(() => {
        chamber.generateLocationCode(6, 3, 6, 4); // quadra 6 > limite 5
      }).toThrow('Coordenadas inválidas');
    });

    test('deve impedir dimensões excessivamente grandes', async () => {
      let error;
      try {
        await Chamber.create({
          name: 'Câmara Gigante',
          dimensions: { quadras: 100, lados: 100, filas: 100, andares: 20 } // 20.000.000 localizações
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.message).toContain('100.000');
    });
  });

  describe('🌡️ Controle de Temperatura e Umidade', () => {
    test('deve permitir configuração de temperatura e umidade atuais', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Clima',
        dimensions: { quadras: 2, lados: 2, filas: 2, andares: 2 },
        currentTemperature: 10,
        currentHumidity: 50
      });
      
      expect(chamber.currentTemperature).toBe(10);
      expect(chamber.currentHumidity).toBe(50);
    });

    test('deve permitir configurações de alertas', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Alertas',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
        settings: {
          targetTemperature: 12,
          targetHumidity: 55,
          alertThresholds: {
            temperatureMin: 8,
            temperatureMax: 16,
            humidityMin: 45,
            humidityMax: 65
          }
        }
      });
      
      expect(chamber.settings.targetTemperature).toBe(12);
      expect(chamber.settings.targetHumidity).toBe(55);
      expect(chamber.settings.alertThresholds.temperatureMin).toBe(8);
      expect(chamber.settings.alertThresholds.temperatureMax).toBe(16);
    });

    test('temperatureStatus deve avaliar corretamente', async () => {
      const chamber = await Chamber.create({
        name: 'Teste Status Temp',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
        currentTemperature: 10,
        settings: {
          alertThresholds: {
            temperatureMin: 8,
            temperatureMax: 16
          }
        }
      });
      
      expect(chamber.temperatureStatus).toBe('normal');
      
      // Teste temperatura baixa
      chamber.currentTemperature = 5;
      expect(chamber.temperatureStatus).toBe('low');
      
      // Teste temperatura alta
      chamber.currentTemperature = 20;
      expect(chamber.temperatureStatus).toBe('high');
    });

    test('humidityStatus deve avaliar corretamente', async () => {
      const chamber = await Chamber.create({
        name: 'Teste Status Umidade',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
        currentHumidity: 50,
        settings: {
          alertThresholds: {
            humidityMin: 40,
            humidityMax: 60
          }
        }
      });
      
      expect(chamber.humidityStatus).toBe('normal');
      
      // Teste umidade baixa
      chamber.currentHumidity = 30;
      expect(chamber.humidityStatus).toBe('low');
      
      // Teste umidade alta
      chamber.currentHumidity = 70;
      expect(chamber.humidityStatus).toBe('high');
    });

    test('conditionsStatus deve avaliar condições gerais', async () => {
      const chamber = await Chamber.create({
        name: 'Teste Condições Gerais',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
        currentTemperature: 12,
        currentHumidity: 55,
        settings: {
          alertThresholds: {
            temperatureMin: 8,
            temperatureMax: 16,
            humidityMin: 45,
            humidityMax: 65
          }
        }
      });
      
      expect(chamber.conditionsStatus).toBe('optimal');
      
      // Teste condições de alerta
      chamber.currentTemperature = 20; // Fora da faixa
      expect(chamber.conditionsStatus).toBe('alert');
    });
  });

  describe('🔍 Métodos de Busca e Consulta', () => {
    beforeEach(async () => {
      // Criar dados de teste
      await Chamber.create([
        {
          name: 'Câmara Ativa 1',
          dimensions: { quadras: 2, lados: 2, filas: 2, andares: 2 },
          status: 'active',
          currentTemperature: 12
        },
        {
          name: 'Câmara Ativa 2',
          dimensions: { quadras: 3, lados: 3, filas: 3, andares: 3 },
          status: 'active',
          currentTemperature: 15
        },
        {
          name: 'Câmara Manutenção',
          dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 },
          status: 'maintenance',
          currentTemperature: 8
        },
        {
          name: 'Câmara Inativa',
          dimensions: { quadras: 2, lados: 1, filas: 2, andares: 1 },
          status: 'inactive'
        }
      ]);
    });

    test('findActive deve retornar apenas câmaras ativas', async () => {
      const activeChambers = await Chamber.findActive();
      
      expect(activeChambers).toHaveLength(2);
      activeChambers.forEach(chamber => {
        expect(chamber.status).toBe('active');
      });
    });

    test('findByStatus deve filtrar por status', async () => {
      const maintenanceChambers = await Chamber.findByStatus('maintenance');
      const inactiveChambers = await Chamber.findByStatus('inactive');
      
      expect(maintenanceChambers).toHaveLength(1);
      expect(inactiveChambers).toHaveLength(1);
      expect(maintenanceChambers[0].status).toBe('maintenance');
      expect(inactiveChambers[0].status).toBe('inactive');
    });

    test('getStats deve calcular estatísticas corretas', async () => {
      const stats = await Chamber.getStats();
      
      expect(stats.total).toBe(4);
      expect(stats.active).toBe(2);
      expect(stats.maintenance).toBe(1);
      expect(stats.inactive).toBe(1);
      expect(stats.totalCapacity).toBeGreaterThan(0);
    });

    test('findByCapacityRange deve filtrar por capacidade', async () => {
      const smallChambers = await Chamber.findByCapacityRange(1, 10);
      const largeChambers = await Chamber.findByCapacityRange(20, 50);
      
      expect(smallChambers.length).toBeGreaterThan(0);
      smallChambers.forEach(chamber => {
        expect(chamber.totalLocations).toBeGreaterThanOrEqual(1);
        expect(chamber.totalLocations).toBeLessThanOrEqual(10);
      });
      
      if (largeChambers.length > 0) {
        largeChambers.forEach(chamber => {
          expect(chamber.totalLocations).toBeGreaterThanOrEqual(20);
          expect(chamber.totalLocations).toBeLessThanOrEqual(50);
        });
      }
    });
  });

  describe('📊 Validações e Integridade', () => {
    test('deve incluir timestamps automáticos', async () => {
      const chamber = await Chamber.create({
        name: 'Teste Timestamps',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
      });
      
      expect(chamber.createdAt).toBeDefined();
      expect(chamber.updatedAt).toBeDefined();
      expect(chamber.createdAt).toBeInstanceOf(Date);
    });

    test('toJSON deve excluir campos internos', async () => {
      const chamber = await Chamber.create({
        name: 'Teste JSON',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
      });
      
      const json = chamber.toJSON();
      expect(json.__v).toBeUndefined();
      expect(json.id).toBeDefined(); // Virtual id deve estar presente
    });

    test('deve validar dimensões como números inteiros', async () => {
      let error;
      try {
        await Chamber.create({
          name: 'Dimensões Decimais',
          dimensions: { quadras: 1.5, lados: 2, filas: 3, andares: 4 }
        });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
    });

    test('deve permitir campos opcionais vazios', async () => {
      const chamber = await Chamber.create({
        name: 'Câmara Mínima',
        dimensions: { quadras: 1, lados: 1, filas: 1, andares: 1 }
      });
      
      expect(chamber.description).toBeUndefined();
      expect(chamber.currentTemperature).toBeUndefined();
      expect(chamber.currentHumidity).toBeUndefined();
      expect(chamber.status).toBe('active'); // Default
    });
  });
});

console.log('✅ Testes do Chamber model (Objetivos do Projeto) criados!'); 