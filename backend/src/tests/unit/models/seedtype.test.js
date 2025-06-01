/**
 * Testes unitários para SeedType model
 * Baseado nos objetivos reais do projeto conforme planejamento
 * Objetivo: Tipos dinâmicos de sementes sem alteração de código
 */

const SeedType = require('../../../models/SeedType');

describe('SeedType Model - Objetivos do Projeto', () => {

  describe('📋 Schema Conforme Planejamento', () => {
    test('deve criar tipo de semente com campos obrigatórios', async () => {
      const seedType = await SeedType.create({
        name: 'Milho Híbrido Premium'
      });
      
      expect(seedType.name).toBe('Milho Híbrido Premium');
      expect(seedType.isActive).toBe(true); // default
      expect(seedType.createdAt).toBeDefined();
      expect(seedType.updatedAt).toBeDefined();
    });

    test('deve criar tipo com todos os campos opcionais', async () => {
      const seedTypeData = {
        name: 'Soja Premium',
        description: 'Soja de alta qualidade para plantio',
        optimalTemperature: 15, // Number conforme planejamento
        optimalHumidity: 60, // Number conforme planejamento
        maxStorageTimeDays: 365 // conforme planejamento
      };
      
      const seedType = await SeedType.create(seedTypeData);
      
      expect(seedType.name).toBe('Soja Premium');
      expect(seedType.description).toBe('Soja de alta qualidade para plantio');
      expect(seedType.optimalTemperature).toBe(15);
      expect(seedType.optimalHumidity).toBe(60);
      expect(seedType.maxStorageTimeDays).toBe(365);
    });

    test('deve exigir nome obrigatório', async () => {
      let error;
      try {
        await SeedType.create({});
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.errors.name).toBeDefined();
    });

    test('deve garantir nome único', async () => {
      await SeedType.create({ name: 'Tipo Único' });
      
      let error;
      try {
        await SeedType.create({ name: 'Tipo Único' });
      } catch (err) {
        error = err;
      }
      
      expect(error).toBeDefined();
      expect(error.code).toBe(11000); // Duplicate key
    });

    test('deve validar valores de temperatura', async () => {
      // Temperatura válida
      const validSeedType = await SeedType.create({
        name: 'Teste Temp Válida',
        optimalTemperature: 20
      });
      expect(validSeedType.optimalTemperature).toBe(20);

      // Temperatura inválida (muito baixa)
      let error;
      try {
        await SeedType.create({
          name: 'Teste Temp Inválida',
          optimalTemperature: -60
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });

    test('deve validar valores de umidade', async () => {
      // Umidade válida
      const validSeedType = await SeedType.create({
        name: 'Teste Umidade Válida',
        optimalHumidity: 50
      });
      expect(validSeedType.optimalHumidity).toBe(50);

      // Umidade inválida (muito alta)
      let error;
      try {
        await SeedType.create({
          name: 'Teste Umidade Inválida',
          optimalHumidity: 150
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });

    test('deve validar tempo de armazenamento', async () => {
      // Tempo válido
      const validSeedType = await SeedType.create({
        name: 'Teste Tempo Válido',
        maxStorageTimeDays: 180
      });
      expect(validSeedType.maxStorageTimeDays).toBe(180);

      // Tempo inválido (negativo)
      let error;
      try {
        await SeedType.create({
          name: 'Teste Tempo Inválido',
          maxStorageTimeDays: -30
        });
      } catch (err) {
        error = err;
      }
      expect(error).toBeDefined();
    });
  });

  describe('🎯 Objetivo: Tipos Dinâmicos', () => {
    test('deve permitir criação de novos tipos sem alteração de código', async () => {
      // Criar vários tipos diferentes dinamicamente
      const tiposDinamicos = [
        {
          name: 'Arroz Orgânico',
          description: 'Arroz cultivado sem agrotóxicos',
          optimalTemperature: 12,
          optimalHumidity: 65,
          maxStorageTimeDays: 180
        },
        {
          name: 'Feijão Carioca',
          description: 'Feijão tradicional brasileiro',
          optimalTemperature: 10,
          optimalHumidity: 50,
          maxStorageTimeDays: 270
        },
        {
          name: 'Girassol Ornamental',
          description: 'Girassol para fins decorativos',
          optimalTemperature: 18,
          optimalHumidity: 40,
          maxStorageTimeDays: 120
        }
      ];

      // Criar todos os tipos dinamicamente
      const tiposCriados = await SeedType.create(tiposDinamicos);
      
      expect(tiposCriados).toHaveLength(3);
      
      // Verificar que cada tipo foi criado corretamente
      tiposCriados.forEach((tipo, index) => {
        expect(tipo.name).toBe(tiposDinamicos[index].name);
        expect(tipo.description).toBe(tiposDinamicos[index].description);
        expect(tipo.optimalTemperature).toBe(tiposDinamicos[index].optimalTemperature);
      });
    });

    test('deve suportar especificações adicionais flexíveis', async () => {
      const seedType = await SeedType.create({
        name: 'Tipo com Especificações',
        description: 'Teste de especificações adicionais',
        specifications: {
          density: 1.2,
          moistureContent: 14.5,
          germinationRate: 95
        }
      });
      
      expect(seedType.specifications.density).toBe(1.2);
      expect(seedType.specifications.moistureContent).toBe(14.5);
      expect(seedType.specifications.germinationRate).toBe(95);
    });

    test('deve permitir tipos mínimos (apenas nome)', async () => {
      const seedType = await SeedType.create({
        name: 'Tipo Mínimo'
      });
      
      expect(seedType.name).toBe('Tipo Mínimo');
      expect(seedType.description).toBeUndefined();
      expect(seedType.optimalTemperature).toBeUndefined();
      expect(seedType.optimalHumidity).toBeUndefined();
      expect(seedType.maxStorageTimeDays).toBeUndefined();
      expect(seedType.isActive).toBe(true);
    });

    test('deve permitir tipos completos (todos os campos)', async () => {
      const seedType = await SeedType.create({
        name: 'Tipo Completo',
        description: 'Tipo com todas as informações',
        optimalTemperature: 15,
        optimalHumidity: 55,
        maxStorageTimeDays: 300,
        specifications: {
          density: 0.8,
          moistureContent: 12,
          germinationRate: 98
        },
        storageNotes: 'Armazenar em local seco e arejado'
      });
      
      expect(seedType.name).toBe('Tipo Completo');
      expect(seedType.description).toBe('Tipo com todas as informações');
      expect(seedType.optimalTemperature).toBe(15);
      expect(seedType.optimalHumidity).toBe(55);
      expect(seedType.maxStorageTimeDays).toBe(300);
      expect(seedType.storageNotes).toBe('Armazenar em local seco e arejado');
    });

    test('deve permitir especificações completamente flexíveis', async () => {
      // Com specifications flexíveis, não há validação rígida - isso é o objetivo!
      const seedType = await SeedType.create({
        name: 'Especificações Flexíveis',
        specifications: {
          qualquerPropriedade: 'qualquer valor',
          numeroNegativo: -1, // Agora permitido pois é flexível
          objetoAninhado: {
            subPropriedade: 'valor'
          },
          array: [1, 2, 3]
        }
      });
      
      expect(seedType.specifications.qualquerPropriedade).toBe('qualquer valor');
      expect(seedType.specifications.numeroNegativo).toBe(-1);
      expect(seedType.specifications.objetoAninhado.subPropriedade).toBe('valor');
      expect(seedType.specifications.array).toEqual([1, 2, 3]);
    });
  });

  describe('🔍 Métodos de Busca e Consulta', () => {
    beforeEach(async () => {
      // Criar dados de teste
      await SeedType.create([
        {
          name: 'Milho Doce',
          description: 'Milho para consumo direto',
          optimalTemperature: 16,
          maxStorageTimeDays: 180,
          isActive: true
        },
        {
          name: 'Soja Premium',
          description: 'Soja de alta qualidade',
          optimalTemperature: 12,
          maxStorageTimeDays: 300,
          isActive: true
        },
        {
          name: 'Trigo Descontinuado',
          description: 'Trigo não mais utilizado',
          optimalTemperature: 8,
          maxStorageTimeDays: 240,
          isActive: false
        }
      ]);
    });

    test('findActive deve retornar apenas tipos ativos', async () => {
      const activeTypes = await SeedType.findActive();
      
      expect(activeTypes).toHaveLength(2);
      activeTypes.forEach(type => {
        expect(type.isActive).toBe(true);
      });
    });

    test('deve permitir busca por texto', async () => {
      const found = await SeedType.searchByText('milho');
      
      expect(found).toHaveLength(1);
      expect(found[0].name).toBe('Milho Doce');
    });

    test('deve permitir busca por faixa de temperatura', async () => {
      const typesInRange = await SeedType.findByTemperatureRange(10, 15);
      
      expect(typesInRange.length).toBeGreaterThan(0);
      typesInRange.forEach(type => {
        expect(type.optimalTemperature).toBeGreaterThanOrEqual(10);
        expect(type.optimalTemperature).toBeLessThanOrEqual(15);
      });
    });

    test('getStats deve calcular estatísticas corretas', async () => {
      const stats = await SeedType.getStats();
      
      expect(stats.total).toBe(3);
      expect(stats.active).toBe(2);
      expect(stats.inactive).toBe(1);
      expect(stats.completionRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('🔧 Métodos de Instância', () => {
    test('isWithinOptimalConditions deve verificar condições', async () => {
      const seedType = await SeedType.create({
        name: 'Teste Condições',
        optimalTemperature: 15,
        optimalHumidity: 60
      });
      
      // Dentro das condições ótimas
      const goodConditions = seedType.isWithinOptimalConditions(15, 60);
      expect(goodConditions.overall).toBe(true);
      
      // Fora das condições ótimas
      const badConditions = seedType.isWithinOptimalConditions(25, 80);
      expect(badConditions.overall).toBe(false);
    });

    test('calculateExpirationDate deve calcular data de expiração', async () => {
      const seedType = await SeedType.create({
        name: 'Teste Expiração',
        maxStorageTimeDays: 180
      });
      
      const entryDate = new Date('2024-01-01');
      const expirationDate = seedType.calculateExpirationDate(entryDate);
      
      expect(expirationDate).toBeDefined();
      expect(expirationDate.getTime()).toBeGreaterThan(entryDate.getTime());
    });

    test('virtual status deve refletir completude dos dados', async () => {
      // Tipo básico
      const basicType = await SeedType.create({
        name: 'Tipo Básico'
      });
      expect(basicType.status).toBe('Básico');
      
      // Tipo completo
      const completeType = await SeedType.create({
        name: 'Tipo Completo',
        optimalTemperature: 15,
        optimalHumidity: 60,
        maxStorageTimeDays: 365
      });
      expect(completeType.status).toBe('Completo');
      
      // Tipo inativo
      const inactiveType = await SeedType.create({
        name: 'Tipo Inativo',
        isActive: false
      });
      expect(inactiveType.status).toBe('Inativo');
    });

    test('virtual optimalConditions deve retornar objeto estruturado', async () => {
      const seedType = await SeedType.create({
        name: 'Teste Condições Virtuais',
        optimalTemperature: 20,
        optimalHumidity: 65,
        maxStorageTimeDays: 200
      });
      
      const conditions = seedType.optimalConditions;
      expect(conditions.temperature).toBe(20);
      expect(conditions.humidity).toBe(65);
      expect(conditions.maxDays).toBe(200);
    });
  });

  describe('📊 Validações e Integridade', () => {
    test('middleware deve formatar nome para Title Case', async () => {
      const seedType = await SeedType.create({
        name: 'milho híbrido premium'
      });
      
      expect(seedType.name).toBe('Milho Híbrido Premium');
    });

    test('toJSON deve excluir campos internos', async () => {
      const seedType = await SeedType.create({
        name: 'Teste JSON'
      });
      
      const json = seedType.toJSON();
      expect(json.__v).toBeUndefined();
      expect(json.id).toBeDefined(); // Virtual id deve estar presente
    });

    test('deve incluir timestamps automáticos', async () => {
      const seedType = await SeedType.create({
        name: 'Teste Timestamps'
      });
      
      expect(seedType.createdAt).toBeDefined();
      expect(seedType.updatedAt).toBeDefined();
      expect(seedType.createdAt).toBeInstanceOf(Date);
    });

    test('deve permitir especificações vazias', async () => {
      const seedType = await SeedType.create({
        name: 'Sem Especificações'
      });
      
      expect(seedType.specifications).toBeUndefined();
    });
  });
});

console.log('✅ Testes do SeedType model (Objetivos do Projeto) criados!'); 