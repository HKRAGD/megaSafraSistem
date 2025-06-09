/**
 * LocationService - Lógica de Negócio para Localizações
 * Objetivos: Gestão inteligente de localizações com otimização de espaço
 * Funcionalidades: Geração automática, busca otimizada, análise de ocupação
 * Regras: Validação de capacidade, hierarquia respeitada, otimização de armazenamento
 */

const Location = require('../models/Location');
const Chamber = require('../models/Chamber');
const Product = require('../models/Product');

/**
 * Geração inteligente de localizações para uma câmara
 * @param {String} chamberId - ID da câmara
 * @param {Object} options - Opções de configuração
 * @returns {Object} Resultado da geração
 */
const generateLocationsForChamber = async (chamberId, options = {}) => {
  try {
    const {
      defaultCapacity = 1000,
      capacityVariation = false,
      skipExisting = true,
      batchSize = 100
    } = options;

    // 1. Verificar se câmara existe e está ativa
    const chamber = await Chamber.findById(chamberId);
    if (!chamber) {
      throw new Error('Câmara não encontrada');
    }

    if (chamber.status !== 'active') {
      throw new Error('Apenas câmaras ativas podem ter localizações geradas');
    }

    // 2. Verificar se já existem localizações
    if (skipExisting) {
      const existingCount = await Location.countDocuments({ chamberId });
      if (existingCount > 0) {
        return {
          success: true,
          message: `Câmara já possui ${existingCount} localizações`,
          locationsCreated: 0,
          existingLocations: existingCount,
          chamber: {
            id: chamber._id,
            name: chamber.name,
            totalPossibleLocations: chamber.totalLocations
          }
        };
      }
    }

    // 3. Calcular capacidades variadas se solicitado
    const getCapacityForLocation = (coordinates) => {
      if (!capacityVariation) return defaultCapacity;
      
      // Localizações mais baixas têm maior capacidade (acesso mais fácil)
      const levelModifier = coordinates.andar <= 2 ? 1.2 : 
                           coordinates.andar <= 5 ? 1.0 : 0.8;
      
      // Localizações centrais podem ter capacidade ligeiramente maior
      const centerModifier = coordinates.quadra > 1 && coordinates.lado > 1 ? 1.1 : 1.0;
      
      return Math.round(defaultCapacity * levelModifier * centerModifier);
    };

    // 4. Gerar localizações em lotes para performance
    const { quadras, lados, filas, andares } = chamber.dimensions;
    const expectedTotal = quadras * lados * filas * andares;

    const allLocations = [];
    let processedCount = 0;
    let skippedCount = 0;
    let createdCount = 0;

    for (let q = 1; q <= quadras; q++) {
      for (let l = 1; l <= lados; l++) {
        for (let f = 1; f <= filas; f++) {
          for (let a = 1; a <= andares; a++) {
            const coordinates = { quadra: q, lado: l, fila: f, andar: a };
            const code = `Q${q}-L${l}-F${f}-A${a}`;
            
            processedCount++;
            
            // CORREÇÃO: Verificar se localização com este código já existe NESTA CÂMARA
            const existingLocation = await Location.findOne({ code, chamberId });
            if (existingLocation) {
              skippedCount++;
              continue;
            }

            const capacity = getCapacityForLocation(coordinates);
            
            allLocations.push({
              chamberId,
              coordinates,
              code,
              maxCapacityKg: capacity,
              metadata: {
                accessLevel: a <= 2 ? 'ground' : a <= 5 ? 'elevated' : 'high',
                zone: `Q${q}-L${l}`,
                generatedAt: new Date(),
                defaultCapacity: capacity
              }
            });

            createdCount++;

            // Inserir em lotes para melhor performance
            if (allLocations.length >= batchSize) {
              try {
                await Location.insertMany(allLocations);
              } catch (error) {
                // Se ainda houver erro de duplicata, filtrar e tentar novamente
                        if (error.code === 11000) {
          const validLocations = [];
          for (const location of allLocations) {
            const existing = await Location.findOne({ 
              code: location.code, 
              chamberId: location.chamberId 
            });
            if (!existing) {
              validLocations.push(location);
            }
          }
                  if (validLocations.length > 0) {
                    await Location.insertMany(validLocations);
                  }
                } else {
                  throw error;
                }
              }
              allLocations.length = 0; // Limpar array
            }
          }
        }
      }
    }

    // Inserir localizações restantes
    if (allLocations.length > 0) {
      try {
        await Location.insertMany(allLocations);
      } catch (error) {
        // Se ainda houver erro de duplicata, filtrar e tentar novamente
        if (error.code === 11000) {
          const validLocations = [];
          for (const location of allLocations) {
            const existing = await Location.findOne({ 
              code: location.code, 
              chamberId: location.chamberId 
            });
            if (!existing) {
              validLocations.push(location);
            }
          }
          if (validLocations.length > 0) {
            await Location.insertMany(validLocations);
          }
        } else {
          throw error;
        }
      }
    }

    const actualCreated = createdCount;

    // 5. Atualizar estatísticas da câmara
    const stats = await Location.getStats(chamberId);

    const finalResult = {
      success: true,
      message: `${actualCreated} localizações geradas com sucesso`,
      locationsCreated: actualCreated,
      chamber: {
        id: chamber._id,
        name: chamber.name,
        dimensions: chamber.dimensions,
        totalPossibleLocations: chamber.totalLocations
      },
      stats,
      configuration: {
        defaultCapacity,
        capacityVariation,
        batchSize
      }
    };

    console.log(`✅ Geradas ${actualCreated} localizações para câmara "${chamber.name}"`);
    return finalResult;

  } catch (error) {
    console.error('❌ Erro em generateLocationsForChamber:', error.message);
    throw new Error(`Erro ao gerar localizações: ${error.message}`);
  }
};

/**
 * Busca inteligente de localizações disponíveis
 * @param {Object} filters - Filtros de busca
 * @param {Object} options - Opções de ordenação e otimização
 * @returns {Array} Localizações disponíveis ordenadas por prioridade
 */
const findAvailableLocations = async (filters = {}, options = {}) => {
  try {
    const {
      chamberId,
      minCapacity = 0,
      maxCapacity,
      preferredZone,
      accessLevel,
      proximityTo,
      sortBy = 'optimal'
    } = filters;

    const {
      limit = 50,
      includeStats = false,
      includeAdjacent = false
    } = options;

    // 1. Construir query base
    const query = {
      isOccupied: false,
      maxCapacityKg: { $gte: minCapacity }
    };

    if (chamberId) query.chamberId = chamberId;
    if (maxCapacity) query.maxCapacityKg = { ...query.maxCapacityKg, $lte: maxCapacity };
    if (accessLevel) query['metadata.accessLevel'] = accessLevel;
    if (preferredZone) query['metadata.zone'] = preferredZone;

    // 2. Definir ordenação baseada na estratégia
    let sortOptions = {};
    switch (sortBy) {
      case 'capacity_asc':
        sortOptions = { maxCapacityKg: 1 };
        break;
      case 'capacity_desc':
        sortOptions = { maxCapacityKg: -1 };
        break;
      case 'access_easy':
        sortOptions = { 'coordinates.andar': 1, 'coordinates.quadra': 1 };
        break;
      case 'coordinates':
        sortOptions = { 
          'coordinates.quadra': 1, 
          'coordinates.lado': 1, 
          'coordinates.fila': 1, 
          'coordinates.andar': 1 
        };
        break;
      case 'optimal':
        // Ordenação ótima: andar baixo primeiro, depois por capacidade
        sortOptions = { 'coordinates.andar': 1, maxCapacityKg: -1 };
        break;
      default:
        sortOptions = { 'coordinates.andar': 1, maxCapacityKg: -1 };
    }

    // 3. Buscar localizações
    const locations = await Location.find(query)
      .populate('chamberId', 'name status dimensions')
      .sort(sortOptions)
      .limit(limit)
      .lean();

    // 4. Adicionar score de acessibilidade
    const locationsWithScore = locations.map(location => ({
      ...location,
      accessibilityScore: location.coordinates.andar <= 2 ? 'high' : 
                         location.coordinates.andar <= 5 ? 'medium' : 'low'
    }));

    // 5. Calcular estatísticas se solicitado
    let statistics = null;
    if (includeStats) {
      const totalAvailable = await Location.countDocuments({ isOccupied: false });
      const totalCapacity = await Location.aggregate([
        { $match: { isOccupied: false } },
        { $group: { _id: null, total: { $sum: '$maxCapacityKg' } } }
      ]);

      statistics = {
        totalAvailable,
        totalCapacityKg: totalCapacity[0]?.total || 0,
        averageCapacity: locations.length > 0 ? Math.round(totalCapacity[0]?.total / totalAvailable) : 0
      };
    }

    return {
      success: true,
      data: {
        locations: locationsWithScore,
        total: locations.length,
        query: { filters, sortBy },
        statistics
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar localizações disponíveis: ${error.message}`);
  }
};

/**
 * Validação rigorosa de capacidade com validações de segurança
 * @param {String} locationId - ID da localização
 * @param {Number} requiredWeight - Peso requerido
 * @param {Object} options - Opções de validação
 * @returns {Object} Resultado da validação
 */
const validateLocationCapacity = async (locationId, requiredWeight, options = {}) => {
  try {
    // VALIDAÇÃO CRÍTICA: Peso deve ser positivo
    if (requiredWeight < 0) {
      throw new Error('Peso deve ser um valor positivo');
    }

    const {
      includeSuggestions = true,
      safetyMargin = 0.05, // 5% de margem de segurança
      analyzeAlternatives = true
    } = options;

    // 1. Buscar localização
    const location = await Location.findById(locationId)
      .populate('chamberId', 'name status dimensions');

    if (!location) {
      throw new Error('Localização não encontrada');
    }

    // 2. Verificar se câmara está ativa
    if (location.chamberId.status !== 'active') {
      return {
        valid: false,
        reason: 'Câmara não está ativa',
        chamber: location.chamberId.name,
        code: 'CHAMBER_INACTIVE'
      };
    }

    // 3. Verificar se localização está ocupada (REGRA CRÍTICA)
    if (location.isOccupied) {
      // Buscar produto atual para informações detalhadas
      const currentProduct = await Product.findOne({ 
        locationId: location._id, 
        status: 'stored' 
      }).select('name lot totalWeight');

      return {
        valid: false,
        reason: 'Localização já está ocupada',
        currentProduct: currentProduct ? {
          name: currentProduct.name,
          lot: currentProduct.lot,
          weight: currentProduct.totalWeight
        } : null,
        code: 'LOCATION_OCCUPIED'
      };
    }

    // 4. Calcular capacidades
    const availableCapacity = location.maxCapacityKg - location.currentWeightKg;
    const safeCapacity = location.maxCapacityKg * (1 - safetyMargin);
    const wouldFitSafely = requiredWeight <= safeCapacity;
    const wouldFitExactly = requiredWeight <= availableCapacity;

    // 5. Análise detalhada
    const analysis = {
      locationCode: location.code,
      maxCapacity: location.maxCapacityKg,
      currentWeight: location.currentWeightKg,
      availableCapacity,
      requiredWeight,
      safeCapacity,
      utilizationAfter: Math.round(((location.currentWeightKg + requiredWeight) / location.maxCapacityKg) * 100),
      safetyMarginUsed: Math.round((requiredWeight / location.maxCapacityKg) * 100)
    };

    // 6. Determinar resultado
    let result = {
      valid: wouldFitExactly,
      analysis,
      warnings: []
    };

    if (!wouldFitExactly) {
      result.reason = 'Capacidade insuficiente';
      result.deficit = requiredWeight - availableCapacity;
      result.code = 'INSUFFICIENT_CAPACITY';
    } else if (!wouldFitSafely) {
      result.warnings.push('Excede margem de segurança recomendada');
      result.code = 'CAPACITY_WARNING';
    } else {
      result.code = 'CAPACITY_OK';
    }

    // 7. Incluir sugestões alternativas se solicitado
    if (includeSuggestions && (!wouldFitExactly || analyzeAlternatives)) {
      const suggestions = await findAvailableLocations({
        chamberId: location.chamberId._id,
        minCapacity: requiredWeight
      }, { limit: 5 });

      result.suggestions = suggestions.data.locations.slice(0, 3).map(loc => ({
        id: loc._id,
        code: loc.code,
        maxCapacity: loc.maxCapacityKg,
        coordinates: loc.coordinates,
        accessibilityScore: loc.accessibilityScore
      }));
    }

    // 8. Análise de localizações próximas
    if (analyzeAlternatives) {
      const adjacent = await findAdjacentLocations(locationId, { 
        availableOnly: true,
        minCapacity: requiredWeight 
      });
      
      result.adjacentAlternatives = adjacent.data ? adjacent.data.availableAdjacent.length : 0;
    }

    return result;

  } catch (error) {
    throw new Error(`Erro ao validar capacidade: ${error.message}`);
  }
};

/**
 * Busca localizações adjacentes (próximas na hierarquia)
 * @param {String} locationId - ID da localização de referência
 * @param {Object} options - Opções de busca
 * @returns {Object} Localizações adjacentes com estrutura consistente
 */
const findAdjacentLocations = async (locationId, options = {}) => {
  try {
    const {
      availableOnly = false,
      minCapacity = 0,
      radius = 1, // Raio de busca (coordenadas adjacentes)
      prioritizeAvailable = false
    } = options;

    // 1. Buscar localização de referência
    const refLocation = await Location.findById(locationId);
    if (!refLocation) {
      throw new Error('Localização de referência não encontrada');
    }

    const { quadra, lado, fila, andar } = refLocation.coordinates;
    const chamberId = refLocation.chamberId;

    // 2. Definir range de coordenadas adjacentes
    const adjacentQuery = {
      chamberId,
      _id: { $ne: locationId }, // Excluir a própria localização
      'coordinates.quadra': { $gte: quadra - radius, $lte: quadra + radius },
      'coordinates.lado': { $gte: lado - radius, $lte: lado + radius },
      'coordinates.fila': { $gte: fila - radius, $lte: fila + radius },
      'coordinates.andar': { $gte: andar - radius, $lte: andar + radius }
    };

    if (availableOnly) {
      adjacentQuery.isOccupied = false;
    }

    if (minCapacity > 0) {
      adjacentQuery.maxCapacityKg = { $gte: minCapacity };
    }

    // 3. Buscar localizações adjacentes
    const adjacentLocations = await Location.find(adjacentQuery)
      .populate('chamberId', 'name')
      .sort({ 
        'coordinates.quadra': 1, 
        'coordinates.lado': 1, 
        'coordinates.fila': 1, 
        'coordinates.andar': 1 
      })
      .lean();

    // 4. Calcular distância Manhattan para cada localização
    const locationsWithDistance = adjacentLocations.map(loc => {
      const distance = Math.abs(loc.coordinates.quadra - quadra) +
                      Math.abs(loc.coordinates.lado - lado) +
                      Math.abs(loc.coordinates.fila - fila) +
                      Math.abs(loc.coordinates.andar - andar);

      return {
        ...loc,
        distance,
        relativePosition: {
          quadra: loc.coordinates.quadra - quadra,
          lado: loc.coordinates.lado - lado,
          fila: loc.coordinates.fila - fila,
          andar: loc.coordinates.andar - andar
        }
      };
    });

    // 5. Separar por disponibilidade e ordenar por distância
    const availableAdjacent = locationsWithDistance
      .filter(loc => !loc.isOccupied)
      .sort((a, b) => a.distance - b.distance);

    const occupiedAdjacent = locationsWithDistance
      .filter(loc => loc.isOccupied)
      .sort((a, b) => a.distance - b.distance);

    return {
      success: true,
      data: {
        reference: {
          id: refLocation._id,
          code: refLocation.code,
          coordinates: refLocation.coordinates
        },
        adjacent: locationsWithDistance,
        availableAdjacent,
        occupiedAdjacent,
        stats: {
          availableCount: availableAdjacent.length,
          occupiedCount: occupiedAdjacent.length,
          totalAdjacent: locationsWithDistance.length
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar localizações adjacentes: ${error.message}`);
  }
};

/**
 * Análise de ocupação e otimização de espaço
 * @param {String} chamberId - ID da câmara (opcional)
 * @param {Object} options - Opções de análise
 * @returns {Object} Relatório de ocupação
 */
const analyzeOccupancy = async (chamberId = null, options = {}) => {
  try {
    const {
      includeHeatmap = false,
      includeOptimization = false,
      alertThreshold = 80 // % de utilização para alertas
    } = options;

    // 1. Construir query base
    const query = chamberId ? { chamberId } : {};

    // 2. Buscar estatísticas gerais usando aggregation para garantir dados corretos
    const generalStatsAgg = await Location.aggregate([
      { $match: query },
      {
        $group: {
          _id: null,
          totalLocations: { $sum: 1 },
          occupiedLocations: { $sum: { $cond: ['$isOccupied', 1, 0] } },
          totalCapacity: { $sum: '$maxCapacityKg' },
          usedCapacity: { $sum: '$currentWeightKg' }
        }
      },
      {
        $addFields: {
          occupancyRate: { $multiply: [{ $divide: ['$occupiedLocations', '$totalLocations'] }, 100] },
          utilizationRate: { $multiply: [{ $divide: ['$usedCapacity', '$totalCapacity'] }, 100] }
        }
      }
    ]);

    const generalStats = generalStatsAgg[0] || {
      totalLocations: 0,
      occupiedLocations: 0,
      totalCapacity: 0,
      usedCapacity: 0,
      occupancyRate: 0,
      utilizationRate: 0
    };

    // 3. Análise por nível de acesso
    const accessLevelStats = await Location.aggregate([
      { $match: query },
      {
        $group: {
          _id: '$metadata.accessLevel',
          total: { $sum: 1 },
          occupied: { $sum: { $cond: ['$isOccupied', 1, 0] } },
          totalCapacity: { $sum: '$maxCapacityKg' },
          usedCapacity: { $sum: '$currentWeightKg' }
        }
      },
      {
        $addFields: {
          occupancyRate: { $multiply: [{ $divide: ['$occupied', '$total'] }, 100] },
          utilizationRate: { $multiply: [{ $divide: ['$usedCapacity', '$totalCapacity'] }, 100] }
        }
      }
    ]);

    // 4. Informações específicas da câmara se solicitado
    let chamberSpecific = null;
    if (chamberId) {
      const chamber = await Chamber.findById(chamberId);
      if (chamber) {
        chamberSpecific = {
          chamberId: chamber._id,
          name: chamber.name,
          status: chamber.status,
          dimensions: chamber.dimensions,
          stats: generalStats
        };
      }
    }

    // 5. Análise de otimização se solicitada
    let optimization = null;
    if (includeOptimization) {
      // Localizações subutilizadas (< 30% de uso)
      const underutilizedLocations = await Location.find({
        ...query,
        isOccupied: true,
        $expr: {
          $lt: [
            { $multiply: [{ $divide: ['$currentWeightKg', '$maxCapacityKg'] }, 100] },
            30
          ]
        }
      }).limit(10).lean();

      optimization = {
        underutilizedLocations: underutilizedLocations.map(loc => ({
          id: loc._id,
          code: loc.code,
          coordinates: loc.coordinates,
          utilizationPercentage: Math.round((loc.currentWeightKg / loc.maxCapacityKg) * 100)
        })),
        recommendations: []
      };

      if (underutilizedLocations.length > 0) {
        optimization.recommendations.push({
          type: 'consolidation',
          description: `${underutilizedLocations.length} localizações estão subutilizadas`,
          action: 'Considere consolidar produtos para liberar espaço'
        });
      }
    }

    return {
      success: true,
      data: {
        generalStats,
        accessLevelStats,
        chamberSpecific,
        optimization,
        analysisDate: new Date()
      }
    };

  } catch (error) {
    throw new Error(`Erro ao analisar ocupação: ${error.message}`);
  }
};

/**
 * Buscar localizações de uma câmara específica
 * @param {String} chamberId - ID da câmara
 * @param {Object} options - Opções de busca
 * @returns {Object} Lista de localizações
 */
const getLocationsByChamber = async (chamberId, options = {}) => {
  try {
    const {
      includeProducts = false,
      sort = 'code',
      limit = null
    } = options;

    // 1. Verificar se câmara existe
    const chamber = await Chamber.findById(chamberId);
    if (!chamber) {
      throw new Error('Câmara não encontrada');
    }

    // 2. Construir query
    let query = Location.find({ chamberId });

    // 3. Populate produtos se solicitado
    if (includeProducts) {
      query = query.populate({
        path: 'productId',
        select: 'name lot quantity totalWeight status'
      });
    }

    // 4. Aplicar ordenação
    if (sort) {
      query = query.sort(sort);
    }

    // 5. Aplicar limite se especificado
    if (limit) {
      query = query.limit(limit);
    }

    // 6. Executar query
    const locations = await query.lean();

    return {
      success: true,
      data: locations
    };

  } catch (error) {
    throw new Error(`Erro ao buscar localizações da câmara: ${error.message}`);
  }
};

module.exports = {
  generateLocationsForChamber,
  findAvailableLocations,
  validateLocationCapacity,
  findAdjacentLocations,
  analyzeOccupancy,
  getLocationsByChamber
}; 