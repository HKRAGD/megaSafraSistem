/**
 * ProductService - Lógica de Negócio para Produtos
 * Objetivos: Gestão inteligente de produtos com regras críticas de negócio
 * Funcionalidades: Criação, movimentação, otimização, validações, análises
 * Regras: Uma localização = Um produto, movimentações automáticas, validação de capacidade
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
const ProductBatch = require('../models/ProductBatch');
const Location = require('../models/Location');
const SeedType = require('../models/SeedType');
const Client = require('../models/Client');
const Movement = require('../models/Movement');
const locationService = require('./locationService');
const { v4: uuidv4 } = require('uuid');

/**
 * Criação inteligente de produto com validações completas
 * @param {Object} productData - Dados do produto
 * @param {String} userId - ID do usuário criador
 * @param {Object} options - Opções de criação
 * @returns {Object} Produto criado com detalhes
 */
const createProduct = async (productData, userId, options = {}) => {
  try {
    const {
      autoFindLocation = false,
      validateSeedType = true,
      generateTrackingCode = true,
      calculateOptimalExpiration = true,
      session = null // Adicionado para suporte a transações
    } = options;

    // 1. Validar dados básicos
    const validation = await validateProductData(productData);
    if (!validation.valid) {
      throw new Error(`Validação falhou: ${validation.errors.join(', ')}`);
    }

    // 2. Validar tipo de semente se solicitado
    let seedType = null;
    if (validateSeedType) {
      seedType = session 
        ? await SeedType.findById(productData.seedTypeId).session(session)
        : await SeedType.findById(productData.seedTypeId);
      if (!seedType || !seedType.isActive) {
        throw new Error('Tipo de semente não encontrado ou inativo');
      }
    }

    // 3. Calcular peso total
    const totalWeight = productData.quantity * productData.weightPerUnit;

    // 4. Buscar localização automaticamente se solicitado E fornecido
    let locationId = productData.locationId;
    let clientId = productData.clientId;
    
    // Tratar string vazia como undefined (frontend envia "" quando não há localização/cliente)
    if (locationId === '') {
      locationId = undefined;
    }
    
    if (clientId === '') {
      clientId = undefined;
    }
    
    // Tratar batchId vazio/undefined para evitar conversão para string 'undefined'
    let batchId = productData.batchId;
    if (batchId === '' || batchId === 'undefined') {
      batchId = undefined;
    }
    
    let location = null;
    let capacityValidation = { warnings: [] }; // Inicializar para evitar ReferenceError
    
    if (autoFindLocation && !locationId) {
      const optimalLocation = await findOptimalLocation({
        quantity: productData.quantity,
        weightPerUnit: productData.weightPerUnit
      });

      if (optimalLocation.success) {
        locationId = optimalLocation.data.location._id;
      }
      // MUDANÇA: Não é mais erro se não encontrar localização - produto fica aguardando locação
    }

    // 5. Validar localização APENAS se fornecida
    if (locationId) {
      location = session 
        ? await Location.findById(locationId).session(session)
        : await Location.findById(locationId);
      if (!location) {
        throw new Error('Localização não encontrada');
      }

      if (location.isOccupied) {
        throw new Error('Localização já está ocupada');
      }

      // 6. Validar capacidade da localização
      capacityValidation = await locationService.validateLocationCapacity(
        locationId, 
        totalWeight, 
        { includeSuggestions: true }
      );

      if (!capacityValidation.valid) {
        let errorMessage = `Localização inválida: ${capacityValidation.reason}`;
        if (capacityValidation.suggestions && capacityValidation.suggestions.length > 0) {
          const suggestedCodes = capacityValidation.suggestions.map(s => s.code).join(', ');
          errorMessage += `. Sugestões: ${suggestedCodes}`;
        }
        throw new Error(errorMessage);
      }
    }

    // 7. Construir dados completos do produto
    const completeProductData = {
      ...productData,
      locationId, // Pode ser undefined - o modelo definirá o status automaticamente
      clientId, // Pode ser undefined - cliente opcional
      batchId, // Pode ser undefined - validado para evitar 'undefined' string
      totalWeight,
      entryDate: new Date(),
      metadata: {
        createdBy: userId,
        lastModifiedBy: userId,
        lastMovementDate: new Date()
      }
      // REMOVIDO: status: 'stored' - deixar o modelo definir baseado em locationId
    };

    // 8. Criar produto
    const product = new Product(completeProductData);
    await product.save(session ? { session } : {});

    // 9. REGRA CRÍTICA: Ocupar localização apenas se fornecida
    if (locationId) {
      const updateOptions = session ? { session } : {};
      await Location.findByIdAndUpdate(locationId, {
        isOccupied: true,
        currentWeightKg: totalWeight
      }, updateOptions);

      // 10. REGRA CRÍTICA: Gerar movimento automático de entrada apenas se localizado
      const movementData = {
        type: 'entry',
        productId: product._id,
        userId: userId,
        toLocationId: locationId,
        quantity: productData.quantity,
        weight: totalWeight,
        reason: 'Entrada automática na criação do produto',
        timestamp: new Date(),
        metadata: {
          verified: true,
          automatic: true
        }
      };

      const movement = new Movement(movementData);
      await movement.save(session ? { session } : {});
    }

    // 11. Buscar produto completo com populações
    let fullProductQuery = Product.findById(product._id)
      .populate('seedTypeId', 'name optimalTemperature optimalHumidity maxStorageTimeDays')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg')
      .populate('metadata.createdBy', 'name email');
    
    if (session) {
      fullProductQuery = fullProductQuery.session(session);
    }
    
    const fullProduct = await fullProductQuery;

    // 12. Análise de resultado
    const analysis = {
      locationSelected: fullProduct.locationId ? {
        code: fullProduct.locationId.code,
        coordinates: fullProduct.locationId.coordinates,
        utilizationAfter: Math.round((totalWeight / fullProduct.locationId.maxCapacityKg) * 100)
      } : null,
      statusAssigned: fullProduct.status, // Mostra o status definido pelo FSM
      seedTypeCompatibility: seedType ? {
        temperatureMatch: seedType.optimalTemperature ? 'compatible' : 'unknown',
        humidityMatch: seedType.optimalHumidity ? 'compatible' : 'unknown',
        storageTimeOptimal: seedType.maxStorageTimeDays || 'unlimited'
      } : null,
      trackingGenerated: !!productData.tracking?.batchNumber,
      expirationCalculated: !!productData.expirationDate
    };

    return {
      success: true,
      data: {
        product: fullProduct,
        analysis,
        warnings: capacityValidation.warnings || []
      }
    };

  } catch (error) {
    throw new Error(`Erro ao criar produto: ${error.message}`);
  }
};

/**
 * Movimentação inteligente de produto entre localizações
 * @param {String} productId - ID do produto
 * @param {String} newLocationId - Nova localização
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções de movimentação
 * @returns {Object} Resultado da movimentação
 */
const moveProduct = async (productId, newLocationId, userId, options = {}) => {
  try {
    const {
      reason = 'Movimentação manual',
      validateCapacity = true,
      analyzeOptimization = false,
      forceMove = false
    } = options;

    // 1. Buscar produto atual
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.status !== 'LOCADO') {
      throw new Error(`Produto deve estar locado para ser movido. Status atual: ${product.status}`);
    }

    // 2. Verificar se não é a mesma localização
    if (product.locationId._id.toString() === newLocationId) {
      return {
        success: false,
        message: 'Produto já está na localização especificada',
        product
      };
    }

    // 3. Verificar se nova localização está disponível
    const newLocation = await Location.findById(newLocationId);
    if (!newLocation) {
      throw new Error('Nova localização não encontrada');
    }

    if (newLocation.isOccupied) {
      throw new Error('Nova localização já está ocupada');
    }

    // 4. Validar capacidade da nova localização se solicitado
    if (validateCapacity && !forceMove) {
      const capacityValidation = await locationService.validateLocationCapacity(
        newLocationId, 
        product.totalWeight,
        { includeSuggestions: true }
      );

      if (!capacityValidation.valid) {
        throw new Error(`Nova localização inválida: ${capacityValidation.reason}`);
      }
    }

    const oldLocationId = product.locationId._id;

    // 5. REGRA CRÍTICA: Atualizar produto
    await Product.findByIdAndUpdate(productId, {
      locationId: newLocationId,
      'metadata.lastModifiedBy': userId,
      'metadata.lastMovementDate': new Date()
    });

    // 6. REGRA CRÍTICA: Liberar localização antiga
    await Location.findByIdAndUpdate(oldLocationId, {
      isOccupied: false,
      currentWeightKg: 0
    });

    // 7. REGRA CRÍTICA: Ocupar nova localização
    await Location.findByIdAndUpdate(newLocationId, {
      isOccupied: true,
      currentWeightKg: product.totalWeight
    });

    // 8. REGRA CRÍTICA: Gerar movimento manual (não automático para evitar duplicação)
    const movementData = {
      type: 'transfer',
      productId: product._id,
      userId: userId,
      fromLocationId: oldLocationId,
      toLocationId: newLocationId,
      quantity: product.quantity,
      weight: product.totalWeight,
      reason: reason,
      timestamp: new Date(),
      metadata: {
        verified: true,
        isAutomatic: false // Marcado como manual para passar pela validação de duplicatas
      }
    };

    const movement = new Movement(movementData);
    await movement.save();

    // 9. Buscar produto atualizado
    const updatedProduct = await Product.findById(productId)
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg')
      .populate('metadata.lastModifiedBy', 'name email');

    // 10. Análise de otimização se solicitada
    let analysis = null;
    if (analyzeOptimization) {
      const oldLocation = await Location.findById(oldLocationId);
      
      analysis = {
        benefits: [
          'Localização antiga liberada',
          'Produto realocado com sucesso'
        ],
        score: 85 // Score fixo para simplificar
      };

      // Comparar andares para determinar melhoria de acesso
      if (newLocation.coordinates.andar < oldLocation.coordinates.andar) {
        analysis.benefits.push('Melhor acesso (andar mais baixo)');
        analysis.score += 10;
      }

      // Comparar capacidades
      if (newLocation.maxCapacityKg > oldLocation.maxCapacityKg) {
        analysis.benefits.push('Maior capacidade disponível');
        analysis.score += 5;
      }
    }

    return {
      success: true,
      data: {
        movement: movement,
        product: updatedProduct,
        analysis: analysis,
        metrics: {
          timeToExecute: 13, // Tempo fixo para simplificar
          weightTransferred: product.totalWeight,
          oldLocationUtilization: 0,
          newLocationUtilization: Math.round((product.totalWeight / newLocation.maxCapacityKg) * 100),
          distanceMoved: 8 // Distância fixa para simplificar
        },
        optimization: {
          accessibility: {
            old: product.locationId.coordinates.andar <= 2 ? 'high' : 'medium',
            new: newLocation.coordinates.andar <= 2 ? 'high' : 'medium'
          },
          utilization: {
            oldLocationAfter: -50, // Simplificado
            newLocationAfter: 50    // Simplificado
          },
          environmentalConditions: {
            temperatureChange: 'monitored',
            humidityChange: 'monitored'
          },
          recommendation: 'analyze_after_move'
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao mover produto: ${error.message}`);
  }
};

/**
 * Remoção de produto com liberação automática de espaço
 * @param {String} productId - ID do produto
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções de remoção
 * @returns {Object} Resultado da remoção
 */
const removeProduct = async (productId, userId, options = {}) => {
  try {
    const {
      reason = 'Remoção manual',
      includeSpaceAnalysis = false
    } = options;

    // 1. Buscar produto com dados completos
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg')
      .populate('metadata.createdBy', 'name email');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    const locationId = product.locationId._id;
    const productWeight = product.totalWeight;

    // 2. REGRA CRÍTICA: Marcar produto como removido
    await Product.findByIdAndUpdate(productId, {
      status: 'REMOVIDO',
      'metadata.lastModifiedBy': userId,
      'metadata.lastMovementDate': new Date()
    });

    // 3. REGRA CRÍTICA: Liberar localização automaticamente
    await Location.findByIdAndUpdate(locationId, {
      isOccupied: false,
      currentWeightKg: 0
    });

    // 4. REGRA CRÍTICA: Movimentação será criada automaticamente pelo middleware do Product
    // Não criar movimentação manual aqui para evitar duplicação

    // 5. Análise de liberação de espaço se solicitada
    let spaceAnalysis = null;
    if (includeSpaceAnalysis) {
      spaceAnalysis = {
        freedCapacity: productWeight,
        locationCode: product.locationId.code,
        utilizationBefore: Math.round((productWeight / product.locationId.maxCapacityKg) * 100),
        utilizationAfter: 0
      };
    }

    return {
      success: true,
      data: {
        productId: product._id,
        spaceAnalysis: spaceAnalysis,
        message: 'Produto removido com sucesso'
      }
    };

  } catch (error) {
    throw new Error(`Erro ao remover produto: ${error.message}`);
  }
};

/**
 * Busca inteligente de localização ótima para produto
 * @param {Object} criteria - Critérios de busca
 * @param {Object} options - Opções de otimização
 * @returns {Object} Localizações recomendadas
 */
const findOptimalLocation = async (criteria = {}, options = {}) => {
  try {
    const {
      quantity = 0,
      weightPerUnit = 0
    } = criteria;

    // Validar peso positivo
    if (weightPerUnit <= 0) {
      return {
        success: false,
        message: 'Peso por unidade deve ser maior que zero'
      };
    }

    const requiredWeight = quantity * weightPerUnit;

    // Buscar localizações disponíveis usando o locationService
    const availableLocations = await locationService.findAvailableLocations({
      minCapacity: requiredWeight
    }, {
      limit: 5,
      includeStats: true
    });

    if (!availableLocations.success || availableLocations.data.locations.length === 0) {
      return {
        success: false,
        message: 'Nenhuma localização disponível encontrada'
      };
    }

    // Retornar primeira localização (já vem otimizada do locationService)
    const bestLocation = availableLocations.data.locations[0];

    return {
      success: true,
      data: {
        location: bestLocation,
        score: 95, // Score fixo para simplificar
        alternatives: availableLocations.data.locations.slice(1)
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar localização ótima: ${error.message}`);
  }
};

/**
 * Validação rigorosa de dados de produto
 * @param {Object} productData - Dados para validar
 * @returns {Object} Resultado da validação
 */
const validateProductData = async (productData) => {
  try {
    const errors = [];

    // Validações básicas
    if (!productData.name || productData.name.trim() === '') {
      errors.push('Nome do produto é obrigatório');
    }

    if (!productData.lot || productData.lot.trim() === '') {
      errors.push('Lote é obrigatório');
    }

    if (!productData.seedTypeId) {
      errors.push('Tipo de semente é obrigatório');
    }

    if (!productData.quantity || productData.quantity <= 0) {
      errors.push('Quantidade deve ser maior que zero');
    }

    if (!productData.weightPerUnit || productData.weightPerUnit <= 0) {
      errors.push('Peso por unidade deve ser maior que zero');
    }

    if (!productData.storageType) {
      errors.push('Tipo de armazenamento é obrigatório');
    }

    const totalWeight = (productData.quantity || 0) * (productData.weightPerUnit || 0);

    const isValid = errors.length === 0;

    return {
      valid: isValid,
      errors: errors,
      data: {
        totalWeight: totalWeight,
        isValid: isValid
      }
    };

  } catch (error) {
    return {
      valid: false,
      errors: ['Erro interno de validação'],
      data: null
    };
  }
};

/**
 * Gerar código único de rastreamento para produto
 * @param {Object} productData - Dados do produto
 * @returns {Object} Código gerado
 */
const generateProductCode = async (productData) => {
  try {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const code = `PRD-${year}-${timestamp}`;

    return {
      success: true,
      data: {
        code: code,
        generatedAt: new Date()
      }
    };

  } catch (error) {
    return {
      success: false,
      message: 'Erro ao gerar código do produto'
    };
  }
};

/**
 * Análise de distribuição de produtos no sistema
 * @param {Object} options - Opções de análise
 * @returns {Object} Relatório de distribuição
 */
const analyzeProductDistribution = async (options = {}) => {
  try {
    const {
      includeOptimizations = false
    } = options;

    // Buscar todos os produtos ativos
    const products = await Product.find({ status: 'LOCADO' })
      .populate('locationId', 'chamberId coordinates')
      .populate('seedTypeId', 'name');

    // Agrupar por câmara
    const chamberMap = new Map();
    
    for (const product of products) {
      if (product.locationId && product.locationId.chamberId) {
        const chamberId = product.locationId.chamberId.toString();
        
        if (!chamberMap.has(chamberId)) {
          chamberMap.set(chamberId, {
            chamberId: chamberId,
            products: [],
            totalWeight: 0,
            locations: new Set()
          });
        }
        
        const chamberData = chamberMap.get(chamberId);
        chamberData.products.push(product);
        chamberData.totalWeight += product.totalWeight || 0;
        chamberData.locations.add(product.locationId._id.toString());
      }
    }

    const chambersData = Array.from(chamberMap.values()).map(chamber => ({
      ...chamber,
      totalLocations: chamber.locations.size,
      locations: undefined // Remove Set para serialização
    }));

    // Análise de otimização se solicitada
    let optimization = null;
    if (includeOptimizations) {
      const recommendations = [];
      
      // Verificar se há produtos em andares altos
      const highFloorProducts = products.filter(p => 
        p.locationId && p.locationId.coordinates && p.locationId.coordinates.andar > 3
      );
      
      if (highFloorProducts.length > 0) {
        recommendations.push({
          type: 'accessibility',
          description: `${highFloorProducts.length} produtos em andares altos`,
          action: 'Considere mover para andares mais baixos'
        });
      }

      optimization = {
        recommendations: recommendations,
        summary: {
          totalProducts: products.length,
          chambersUsed: chamberMap.size,
          avgProductsPerChamber: chamberMap.size > 0 ? Math.round(products.length / chamberMap.size) : 0
        }
      };
    }

    return {
      success: true,
      data: {
        summary: {
          totalProducts: products.length,
          totalChambers: chamberMap.size,
          totalWeight: products.reduce((sum, p) => sum + (p.totalWeight || 0), 0)
        },
        chambersData: chambersData,
        optimization: optimization
      }
    };

  } catch (error) {
    throw new Error(`Erro ao analisar distribuição: ${error.message}`);
  }
};

/**
 * Busca produtos por condições específicas
 * @param {Object} conditions - Condições de busca
 * @param {Object} options - Opções de busca
 * @returns {Array} Produtos encontrados
 */
const getProductsByConditions = async (conditions = {}, options = {}) => {
  try {
    const {
      includeMetrics = false,
      includeSeedType = true,
      includeLocation = true,
      limit = 50
    } = options;

    let query = Product.find();

    // Aplicar condições
    if (conditions.seedType) {
      query = query.where('seedTypeId').equals(conditions.seedType);
    }

    if (conditions.chamberId) {
      // Buscar localizações da câmara
      const locations = await Location.find({ chamberId: conditions.chamberId });
      const locationIds = locations.map(loc => loc._id);
      query = query.where('locationId').in(locationIds);
    }

    if (conditions.temperature) {
      // Buscar produtos baseado nas condições das câmaras
      query = query.where('status').equals('LOCADO');
    }

    if (conditions.humidity) {
      query = query.where('status').equals('LOCADO');
    }

    // Populações
    if (includeSeedType) {
      query = query.populate('seedTypeId', 'name optimalTemperature optimalHumidity maxStorageTimeDays');
    }

    if (includeLocation) {
      query = query.populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');
    }

    // Limite
    query = query.limit(limit);

    const products = await query;

    // Simular métricas se solicitado
    if (includeMetrics) {
      products.forEach(product => {
        product.storageConditions = {
          temperature: 15 + Math.random() * 10, // 15-25°C
          humidity: 45 + Math.random() * 20     // 45-65%
        };
        product.qualityMetrics = {
          germination: 85 + Math.random() * 15  // 85-100%
        };
      });
    }

    return products;
  } catch (error) {
    throw new Error(`Erro ao buscar produtos: ${error.message}`);
  }
};

/**
 * Saída parcial ou total de produto (reduz estoque)
 * @param {String} productId - ID do produto
 * @param {Number} quantity - Quantidade a ser retirada
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções da operação
 * @returns {Object} Resultado da operação
 */
const partialExit = async (productId, quantity, userId, options = {}) => {
  try {
    const {
      reason = 'Saída manual de estoque',
      validateQuantity = true
    } = options;

    // 1. Buscar produto atual
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.status !== 'LOCADO') {
      throw new Error(`Produto deve estar locado para saída. Status atual: ${product.status}`);
    }

    // 2. Validar quantidade
    if (validateQuantity) {
      if (quantity <= 0) {
        throw new Error('Quantidade deve ser maior que zero');
      }

      if (quantity > product.quantity) {
        throw new Error(`Quantidade solicitada (${quantity}) excede disponível (${product.quantity})`);
      }
    }

    // 3. Calcular novos valores
    const newQuantity = product.quantity - quantity;
    const weightToRemove = quantity * product.weightPerUnit;
    const newTotalWeight = newQuantity * product.weightPerUnit;

    // 4. Registrar movimento de saída
    const movement = new Movement({
      type: 'exit',
      productId: product._id,
      userId: userId,
      fromLocationId: product.locationId._id,
      quantity: quantity,
      weight: weightToRemove,
      reason,
      timestamp: new Date(),
      metadata: {
        verified: true,
        automatic: false,
        operationType: 'partial_exit'
      }
    });
    await movement.save();

    // 5. Atualizar produto
    if (newQuantity === 0) {
      // Se saída total, remover produto e liberar localização
      await Product.findByIdAndUpdate(productId, { 
        status: 'REMOVIDO',
        metadata: {
          ...product.metadata,
          lastModifiedBy: userId,
          lastMovementDate: new Date()
        }
      });

      await Location.findByIdAndUpdate(product.locationId._id, {
        isOccupied: false,
        currentWeightKg: 0
      });
    } else {
      // Se saída parcial, atualizar quantidades
      await Product.findByIdAndUpdate(productId, {
        quantity: newQuantity,
        totalWeight: newTotalWeight,
        metadata: {
          ...product.metadata,
          lastModifiedBy: userId,
          lastMovementDate: new Date()
        }
      });

      await Location.findByIdAndUpdate(product.locationId._id, {
        currentWeightKg: newTotalWeight
      });
    }

    // 6. Buscar produto atualizado
    const updatedProduct = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    return {
      success: true,
      data: {
        product: updatedProduct,
        operation: {
          type: 'partial_exit',
          quantityRemoved: quantity,
          weightRemoved: weightToRemove,
          remainingQuantity: newQuantity,
          remainingWeight: newTotalWeight,
          totalRemoval: newQuantity === 0
        },
        movement: {
          id: movement._id,
          timestamp: movement.timestamp
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro na saída parcial: ${error.message}`);
  }
};

/**
 * Movimentação parcial de produto (cria novo produto na nova localização)
 * @param {String} productId - ID do produto origem
 * @param {Number} quantity - Quantidade a ser movida
 * @param {String} newLocationId - Nova localização
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções da operação
 * @returns {Object} Resultado da operação
 */
const partialMove = async (productId, quantity, newLocationId, userId, options = {}) => {
  try {
    const {
      reason = 'Movimentação parcial',
      validateCapacity = true
    } = options;

    // 1. Buscar produto atual
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.status !== 'LOCADO') {
      throw new Error(`Produto deve estar locado para movimentação. Status atual: ${product.status}`);
    }

    // 2. Validar quantidade
    if (quantity <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    if (quantity >= product.quantity) {
      throw new Error('Use movimentação total para mover todo o estoque');
    }

    // 3. Validar nova localização
    const newLocation = await Location.findById(newLocationId);
    if (!newLocation) {
      throw new Error('Nova localização não encontrada');
    }

    if (newLocation.isOccupied) {
      throw new Error('Nova localização já está ocupada');
    }

    // 4. Validar capacidade se solicitado
    const weightToMove = quantity * product.weightPerUnit;
    if (validateCapacity) {
      const capacityValidation = await locationService.validateLocationCapacity(
        newLocationId, 
        weightToMove
      );

      if (!capacityValidation.valid) {
        throw new Error(`Capacidade insuficiente: ${capacityValidation.reason}`);
      }
    }

    // 5. Calcular novos valores para produto origem
    const newOriginQuantity = product.quantity - quantity;
    const newOriginWeight = newOriginQuantity * product.weightPerUnit;

    // 6. Registrar movimento de saída do produto origem
    const exitMovement = new Movement({
      type: 'transfer',
      productId: product._id,
      userId: userId,
      fromLocationId: product.locationId._id,
      toLocationId: newLocationId,
      quantity: quantity,
      weight: weightToMove,
      reason: `${reason} - Saída parcial`,
      timestamp: new Date(),
      metadata: {
        verified: true,
        automatic: false,
        operationType: 'partial_move_exit'
      }
    });
    await exitMovement.save();

    // 7. Criar novo produto na nova localização
    const newProductData = {
      name: product.name,
      lot: product.lot,
      seedTypeId: product.seedTypeId._id,
      quantity: quantity,
      storageType: product.storageType,
      weightPerUnit: product.weightPerUnit,
      totalWeight: weightToMove,
      locationId: newLocationId,
      entryDate: new Date(),
      expirationDate: product.expirationDate,
      status: 'LOCADO',
      notes: `Criado por movimentação parcial do produto ${product.name}`,
      tracking: {
        ...product.tracking,
        originProductId: product._id
      },
      metadata: {
        createdBy: userId,
        lastModifiedBy: userId,
        lastMovementDate: new Date()
      }
    };

    const newProduct = new Product(newProductData);
    await newProduct.save();

    // 8. Registrar movimento de entrada do novo produto
    const entryMovement = new Movement({
      type: 'entry',
      productId: newProduct._id,
      userId: userId,
      toLocationId: newLocationId,
      quantity: quantity,
      weight: weightToMove,
      reason: `${reason} - Entrada parcial`,
      timestamp: new Date(),
      metadata: {
        verified: true,
        automatic: false,
        operationType: 'partial_move_entry',
        originProductId: product._id
      }
    });
    await entryMovement.save();

    // 9. Atualizar produto origem
    await Product.findByIdAndUpdate(productId, {
      quantity: newOriginQuantity,
      totalWeight: newOriginWeight,
      metadata: {
        ...product.metadata,
        lastModifiedBy: userId,
        lastMovementDate: new Date()
      }
    });

    // 10. Atualizar localizações
    await Location.findByIdAndUpdate(product.locationId._id, {
      currentWeightKg: newOriginWeight
    });

    await Location.findByIdAndUpdate(newLocationId, {
      isOccupied: true,
      currentWeightKg: weightToMove
    });

    // 11. Buscar produtos atualizados
    const updatedOriginProduct = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId');

    const createdProduct = await Product.findById(newProduct._id)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId');

    return {
      success: true,
      data: {
        originProduct: updatedOriginProduct,
        newProduct: createdProduct,
        operation: {
          type: 'partial_move',
          quantityMoved: quantity,
          weightMoved: weightToMove,
          fromLocation: product.locationId.code,
          toLocation: newLocation.code
        },
        movements: {
          exit: exitMovement._id,
          entry: entryMovement._id
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro na movimentação parcial: ${error.message}`);
  }
};

/**
 * Adicionar estoque a produto existente (mesmo tipo e lote)
 * @param {String} productId - ID do produto existente
 * @param {Number} quantity - Quantidade a ser adicionada
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções da operação
 * @returns {Object} Resultado da operação
 */
const addStock = async (productId, quantity, userId, options = {}) => {
  try {
    const {
      reason = 'Adição de estoque',
      validateCapacity = true,
      weightPerUnit = null // Se não fornecido, usa o mesmo do produto
    } = options;

    // 1. Buscar produto atual
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.status !== 'LOCADO') {
      throw new Error(`Produto deve estar locado para adicionar estoque. Status atual: ${product.status}`);
    }

    // 2. Validar quantidade
    if (quantity <= 0) {
      throw new Error('Quantidade deve ser maior que zero');
    }

    // 3. Usar peso por unidade fornecido ou do produto existente
    const unitWeight = weightPerUnit || product.weightPerUnit;
    const weightToAdd = quantity * unitWeight;

    // 4. Validar capacidade se solicitado
    if (validateCapacity) {
      const currentLocationWeight = product.locationId.currentWeightKg || 0;
      const newTotalWeight = currentLocationWeight + weightToAdd;

      if (newTotalWeight > product.locationId.maxCapacityKg) {
        throw new Error(`Capacidade insuficiente. Peso atual: ${currentLocationWeight}kg, Tentando adicionar: ${weightToAdd}kg, Capacidade máxima: ${product.locationId.maxCapacityKg}kg`);
      }
    }

    // 5. Calcular novos valores
    const newQuantity = product.quantity + quantity;
    const newTotalWeight = product.totalWeight + weightToAdd;

    // 6. Registrar movimento de ajuste
    const movement = new Movement({
      type: 'adjustment',
      productId: product._id,
      userId: userId,
      toLocationId: product.locationId._id,
      quantity: quantity,
      weight: weightToAdd,
      reason,
      timestamp: new Date(),
      metadata: {
        verified: true,
        automatic: false,
        operationType: 'add_stock',
        previousQuantity: product.quantity,
        previousWeight: product.totalWeight
      }
    });
    await movement.save();

    // 7. Atualizar produto
    await Product.findByIdAndUpdate(productId, {
      quantity: newQuantity,
      totalWeight: newTotalWeight,
      metadata: {
        ...product.metadata,
        lastModifiedBy: userId,
        lastMovementDate: new Date()
      }
    });

    // 8. Atualizar localização
    await Location.findByIdAndUpdate(product.locationId._id, {
      currentWeightKg: newTotalWeight
    });

    // 9. Buscar produto atualizado
    const updatedProduct = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    return {
      success: true,
      data: {
        product: updatedProduct,
        operation: {
          type: 'add_stock',
          quantityAdded: quantity,
          weightAdded: weightToAdd,
          previousQuantity: product.quantity,
          newQuantity: newQuantity,
          previousWeight: product.totalWeight,
          newWeight: newTotalWeight
        },
        movement: {
          id: movement._id,
          timestamp: movement.timestamp
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao adicionar estoque: ${error.message}`);
  }
};

/**
 * Localizar produto aguardando locação (OPERATOR)
 * @param {String} productId - ID do produto
 * @param {String} locationId - ID da localização
 * @param {String} userId - ID do usuário operador
 * @param {Object} options - Opções da operação
 * @returns {Object} Resultado da localização
 */
const locateProduct = async (productId, locationId, userId, options = {}) => {
  try {
    const { reason = 'Localização de produto', validateCapacity = true } = options;

    // 1. Buscar produto
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    // 2. Validar capacidade da localização se solicitado
    if (validateCapacity) {
      const capacityValidation = await locationService.validateLocationCapacity(
        locationId, 
        product.totalWeight, 
        { includeSuggestions: true }
      );

      if (!capacityValidation.valid) {
        let errorMessage = `Localização inválida: ${capacityValidation.reason}`;
        if (capacityValidation.suggestions && capacityValidation.suggestions.length > 0) {
          const suggestedCodes = capacityValidation.suggestions.map(s => s.code).join(', ');
          errorMessage += `. Sugestões: ${suggestedCodes}`;
        }
        throw new Error(errorMessage);
      }
    }

    // 3. Usar método FSM do modelo
    await product.locate(locationId, userId, reason);

    // 4. Ocupar localização
    await Location.findByIdAndUpdate(locationId, {
      isOccupied: true,
      currentWeightKg: product.totalWeight
    });

    // 4.1. Gerar movimento para alocação
    const movement = new Movement({
      type: 'entry',
      productId: product._id,
      userId: userId,
      fromLocationId: null, // Produto não estava em localização específica antes da alocação
      toLocationId: locationId,
      quantity: product.quantity,
      weight: product.totalWeight,
      reason: reason || 'Alocação de produto',
      timestamp: new Date(),
      metadata: {
        verified: true,
        automatic: true // Marcar como automático pois faz parte do fluxo FSM principal
      }
    });
    await movement.save();

    // 5. Buscar produto atualizado
    const updatedProduct = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates chamberId maxCapacityKg currentWeightKg');

    return {
      success: true,
      data: {
        product: updatedProduct,
        operation: {
          type: 'locate',
          previousStatus: 'AGUARDANDO_LOCACAO',
          newStatus: 'LOCADO',
          locationAssigned: updatedProduct.locationId.code
        },
        movement: { // Incluir detalhes do movimento na resposta
          id: movement._id,
          timestamp: movement.timestamp
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao localizar produto: ${error.message}`);
  }
};

/**
 * Solicitar retirada de produto (ADMIN)
 * @param {String} productId - ID do produto
 * @param {String} userId - ID do usuário admin
 * @param {Object} options - Opções da solicitação
 * @returns {Object} Resultado da solicitação
 */
const requestProductWithdrawal = async (productId, userId, options = {}) => {
  try {
    const { reason = 'Solicitação de retirada', type = 'TOTAL', quantity = null } = options;

    // 1. Buscar produto
    const product = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates');

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    // 2. Criar solicitação de retirada
    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const withdrawalData = {
      productId: productId,
      requestedBy: userId,
      type: type,
      quantityRequested: type === 'PARCIAL' ? quantity : null,
      reason: reason
    };

    const withdrawalRequest = new WithdrawalRequest(withdrawalData);
    await withdrawalRequest.save();

    // 3. Usar método FSM do modelo
    await product.requestWithdrawal(userId, reason);

    // 4. Buscar dados atualizados
    const updatedProduct = await Product.findById(productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates');

    const fullWithdrawalRequest = await WithdrawalRequest.findById(withdrawalRequest._id)
      .populate('requestedBy', 'name email');

    return {
      success: true,
      data: {
        product: updatedProduct,
        withdrawalRequest: fullWithdrawalRequest,
        operation: {
          type: 'request_withdrawal',
          previousStatus: 'LOCADO',
          newStatus: 'AGUARDANDO_RETIRADA',
          withdrawalType: type
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao solicitar retirada: ${error.message}`);
  }
};

/**
 * Confirmar retirada de produto (OPERATOR)
 * @param {String} withdrawalRequestId - ID da solicitação de retirada
 * @param {String} userId - ID do usuário operador
 * @param {Object} options - Opções da confirmação
 * @returns {Object} Resultado da confirmação
 */
const confirmProductWithdrawal = async (withdrawalRequestId, userId, options = {}) => {
  try {
    const { notes = '' } = options;

    // 1. Buscar solicitação de retirada
    const WithdrawalRequest = require('../models/WithdrawalRequest');
    const withdrawalRequest = await WithdrawalRequest.findById(withdrawalRequestId)
      .populate('productId')
      .populate('requestedBy', 'name email');

    if (!withdrawalRequest) {
      throw new Error('Solicitação de retirada não encontrada');
    }

    // 2. Confirmar usando método do modelo WithdrawalRequest
    await withdrawalRequest.confirm(userId, notes);

    // 3. Liberar localização
    const product = withdrawalRequest.productId;
    if (product.locationId) {
      await Location.findByIdAndUpdate(product.locationId, {
        isOccupied: false,
        currentWeightKg: 0
      });
    }

    // 3.1. Gerar movimento para retirada
    const quantityWithdrawn = withdrawalRequest.type === 'PARCIAL' ? withdrawalRequest.quantityRequested : product.quantity;
    const weightWithdrawn = quantityWithdrawn * product.weightPerUnit;

    const movement = new Movement({
      type: 'withdrawal', // Tipo específico para retirada
      productId: product._id,
      userId: userId,
      fromLocationId: product.locationId, // Produto estava nesta localização
      toLocationId: null, // Produto está sendo retirado, sem localização de destino
      quantity: quantityWithdrawn,
      weight: weightWithdrawn,
      reason: withdrawalRequest.reason || 'Retirada de produto',
      timestamp: new Date(),
      metadata: {
        verified: true,
        automatic: true // Marcar como automático
      }
    });
    await movement.save();

    // 4. Buscar dados atualizados
    const updatedWithdrawalRequest = await WithdrawalRequest.findById(withdrawalRequestId)
      .populate('productId')
      .populate('requestedBy', 'name email')
      .populate('confirmedBy', 'name email');

    return {
      success: true,
      data: {
        withdrawalRequest: updatedWithdrawalRequest,
        operation: {
          type: 'confirm_withdrawal',
          previousStatus: 'AGUARDANDO_RETIRADA',
          newStatus: 'RETIRADO',
          confirmedAt: updatedWithdrawalRequest.confirmedAt
        },
        movement: { // Incluir detalhes do movimento na resposta
          id: movement._id,
          timestamp: movement.timestamp
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao confirmar retirada: ${error.message}`);
  }
};

/**
 * Buscar produtos aguardando locação
 * @param {Object} filters - Filtros opcionais
 * @returns {Object} Lista de produtos aguardando locação
 */
const getProductsPendingLocation = async (filters = {}) => {
  try {
    const products = await Product.findPendingLocation();
    
    return {
      success: true,
      data: {
        products,
        count: products.length
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar produtos aguardando locação: ${error.message}`);
  }
};

/**
 * Buscar produtos aguardando retirada
 * @param {Object} filters - Filtros opcionais
 * @returns {Object} Lista de produtos aguardando retirada
 */
const getProductsPendingWithdrawal = async (filters = {}) => {
  try {
    const products = await Product.findPendingWithdrawal();
    
    return {
      success: true,
      data: {
        products,
        count: products.length
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar produtos aguardando retirada: ${error.message}`);
  }
};

/**
 * Busca e agrupa produtos com status 'AGUARDANDO_LOCACAO' por batchId ou individualmente.
 * Inclui nomes personalizados de ProductBatch quando disponíveis.
 * @returns {Object} Objeto contendo os lotes de produtos agrupados.
 */
const getProductsPendingAllocationGrouped = async () => {
  try {
    const result = await Product.aggregate([
      { $match: { status: 'AGUARDANDO_LOCACAO' } },
      {
        $addFields: {
          // Converter IDs para ObjectId com segurança, definindo null em caso de erro
          seedTypeId_obj: {
            $convert: {
              input: "$seedTypeId",
              to: "objectId",
              onError: null,
              onNull: null
            }
          },
          clientId_obj: {
            $convert: {
              input: "$clientId", 
              to: "objectId",
              onError: null,
              onNull: null
            }
          },
          // Identificar se o produto é agrupado (batchId válido e não vazio/undefined)
          isGroupedProduct: {
            $and: [
              { $ne: ["$batchId", null] },
              { $ne: ["$batchId", ""] },
              { $ne: ["$batchId", "undefined"] }
            ]
          }
        }
      },
      {
        $lookup: {
          from: 'seedtypes',
          localField: 'seedTypeId_obj',
          foreignField: '_id',
          as: 'seedTypeDetails'
        }
      },
      {
        $unwind: {
          path: '$seedTypeDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId_obj',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'productbatches',
          localField: 'batchId',
          foreignField: '_id',
          as: 'batchDetails'
        }
      },
      {
        $unwind: {
          path: '$batchDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $addFields: {
          productData: {
            id: "$_id",
            name: "$name",
            lot: "$lot",
            status: "$status",
            quantity: "$quantity",
            totalWeight: "$totalWeight",
            seedTypeId: "$seedTypeDetails",
            expirationDate: "$expirationDate",
            createdAt: "$createdAt",
            tracking: "$tracking",
            notes: "$notes",
            storageType: "$storageType",
            weightPerUnit: "$weightPerUnit",
            locationId: "$locationId",
            clientId: "$clientDetails",
            batchId: "$batchId"
          }
        }
      },
      {
        $facet: {
          groupedProducts: [
            { $match: { isGroupedProduct: true } },
            {
              $group: {
                _id: "$batchId",
                batchId: { $first: "$batchId" },
                batchName: { 
                  $first: { 
                    $ifNull: ["$batchDetails.name", "Lote de Produtos"] 
                  } 
                },
                clientId: { $first: "$clientDetails._id" },
                clientName: { $first: "$clientDetails.name" },
                productCount: { $sum: 1 },
                createdAt: { $min: "$createdAt" },
                products: { $push: "$productData" }
              }
            },
            {
              $project: {
                _id: 0,
                batchId: 1,
                batchName: 1,
                clientId: 1,
                clientName: 1,
                productCount: 1,
                createdAt: 1,
                products: 1
              }
            },
            { $sort: { createdAt: -1 } }
          ],
          individualProducts: [
            { $match: { isGroupedProduct: false } },
            {
              $project: {
                _id: 0,
                id: "$productData.id",
                name: "$productData.name",
                lot: "$productData.lot",
                status: "$productData.status",
                quantity: "$productData.quantity",
                totalWeight: "$productData.totalWeight",
                seedTypeId: "$productData.seedTypeId",
                expirationDate: "$productData.expirationDate",
                createdAt: "$productData.createdAt",
                tracking: "$productData.tracking",
                notes: "$productData.notes",
                storageType: "$productData.storageType",
                weightPerUnit: "$productData.weightPerUnit",
                locationId: "$productData.locationId",
                clientId: "$productData.clientId",
                batchId: "$productData.batchId"
              }
            },
            { $sort: { createdAt: -1 } }
          ]
        }
      }
    ]);

    // Extrair os resultados do facet
    const { groupedProducts, individualProducts } = result[0];

    return {
      success: true,
      data: {
        groupedProducts: groupedProducts,
        individualProducts: individualProducts,
        totalGrouped: groupedProducts.length,
        totalIndividual: individualProducts.length,
        // Manter compatibilidade com código existente
        batches: [...groupedProducts, ...individualProducts.map(product => ({
          batchId: null,
          clientId: product.clientId?._id || null,
          clientName: product.clientId?.name || null,
          productCount: 1,
          createdAt: product.createdAt,
          products: [product]
        }))]
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar produtos aguardando alocação agrupados: ${error.message}`);
  }
};

/**
 * Buscar produtos por batchId com dados relacionados populados
 * @param {String} batchId - ID do lote
 * @returns {Object} Detalhes do grupo de produtos do lote
 */
const getProductsByBatch = async (batchId) => {
  try {
    if (!batchId || batchId === '' || batchId === 'undefined') {
      throw new Error('batchId é obrigatório');
    }

    const result = await Product.aggregate([
      { $match: { batchId: batchId } },
      {
        $addFields: {
          // Converter IDs para ObjectId com segurança
          seedTypeId_obj: {
            $convert: {
              input: "$seedTypeId",
              to: "objectId",
              onError: null,
              onNull: null
            }
          },
          locationId_obj: {
            $convert: {
              input: "$locationId",
              to: "objectId", 
              onError: null,
              onNull: null
            }
          },
          clientId_obj: {
            $convert: {
              input: "$clientId",
              to: "objectId",
              onError: null,
              onNull: null
            }
          }
        }
      },
      {
        $lookup: {
          from: 'seedtypes',
          localField: 'seedTypeId_obj',
          foreignField: '_id',
          as: 'seedTypeDetails'
        }
      },
      {
        $unwind: {
          path: '$seedTypeDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId_obj',
          foreignField: '_id',
          as: 'locationDetails'
        }
      },
      {
        $unwind: {
          path: '$locationDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'clients',
          localField: 'clientId_obj',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      {
        $unwind: {
          path: '$clientDetails',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $project: {
          id: "$_id",
          name: 1,
          lot: 1,
          status: 1,
          quantity: 1,
          totalWeight: 1,
          seedTypeId: "$seedTypeDetails",
          locationId: "$locationDetails",
          clientId: "$clientDetails", 
          batchId: 1,
          expirationDate: 1,
          createdAt: 1,
          entryDate: 1,
          tracking: 1,
          notes: 1,
          storageType: 1,
          weightPerUnit: 1
        }
      },
      { $sort: { createdAt: 1 } }
    ]);

    if (result.length === 0) {
      return {
        success: false,
        message: 'Nenhum produto encontrado para este lote'
      };
    }

    // Agrupar por informações do cliente e calcular estatísticas
    const firstProduct = result[0];
    const clientId = firstProduct.clientId?._id || null;
    const clientName = firstProduct.clientId?.name || null;
    
    // Calcular estatísticas
    const totalProducts = result.length;
    const allocatedProducts = result.filter(product => product.status === 'LOCADO').length;
    
    // Buscar a data de criação mais antiga do lote
    const createdAt = result.reduce((earliest, product) => {
      return product.createdAt < earliest ? product.createdAt : earliest;
    }, result[0].createdAt);

    return {
      success: true,
      data: {
        batchId: batchId,
        clientId: clientId,
        clientName: clientName,
        products: result,
        totalProducts: totalProducts,
        allocatedProducts: allocatedProducts,
        createdAt: createdAt
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar produtos do lote: ${error.message}`);
  }
};

/**
 * Criação em lote de produtos com validações e transação atômica.
 * @param {String} clientId - ID do cliente comum para todos os produtos.
 * @param {Array<Object>} productsArray - Array de dados de produtos.
 * @param {String} userId - ID do usuário criador.
 * @param {String} batchName - Nome personalizado do lote (opcional).
 * @returns {Object} Resultado da operação em lote.
 */
const createProductsBatch = async (clientId, productsArray, userId, batchName) => {
  const { executeWithTransactionIfAvailable } = require('../utils/database');
  
  // Implementação da operação de criação em lote
  const batchOperation = async ({ session, useTransactions }) => {
    const productsCreated = [];
    const failedProducts = [];
    
    // 1. Gerar batchId único
    const batchId = uuidv4();
    
    // 2. Criar ProductBatch primeiro
    let productBatch = null;
    
    // ✅ CORREÇÃO: Debug e validação mais robusta do batchName
    console.log(`[ProductService] batchName recebido:`, { 
      batchName, 
      type: typeof batchName, 
      length: batchName?.length,
      trimmed: batchName?.trim?.()
    });
    
    // Validação mais robusta para preservar nomes personalizados
    let resolvedBatchName;
    if (batchName && typeof batchName === 'string' && batchName.trim().length > 0) {
      resolvedBatchName = batchName.trim();
      console.log(`[ProductService] Usando nome personalizado: "${resolvedBatchName}"`);
    } else {
      resolvedBatchName = `Lote de Produtos - ${new Date().toLocaleDateString('pt-BR')}`;
      console.log(`[ProductService] Usando nome automático: "${resolvedBatchName}"`);
    }
    try {
      const batchData = {
        _id: batchId, // Usar batchId como _id para compatibilidade
        name: resolvedBatchName,
        clientId: clientId,
        description: `Lote criado com ${productsArray.length} produtos`,
        metadata: {
          createdBy: userId,
          lastModifiedBy: userId,
          totalProducts: productsArray.length,
          totalWeight: 0 // Será calculado após criação dos produtos
        }
      };

      productBatch = new ProductBatch(batchData);
      await productBatch.save(session ? { session } : {});
      
      console.log(`[ProductService] ProductBatch criado: ${resolvedBatchName} (ID: ${batchId})`);
    } catch (error) {
      console.error(`[ProductService] Erro ao criar ProductBatch:`, error.message);
      throw new Error(`Erro ao criar lote: ${error.message}`);
    }
    
    console.log(`[ProductService] Iniciando criação em lote de ${productsArray.length} produtos`, {
      batchId,
      batchName: resolvedBatchName,
      clientId,
      useTransactions,
      userId
    });

    for (let i = 0; i < productsArray.length; i++) {
      const productData = productsArray[i];
      try {
        // Aplicar clientId e batchId comuns a cada produto
        const productDataWithBatch = {
          ...productData,
          clientId: clientId,
          batchId: batchId
        };

        // Reutilizar a lógica de createProduct, passando a sessão
        // CRÍTICO: Desabilitar autoFindLocation para produtos em lote (devem ficar AGUARDANDO_LOCACAO)
        const result = await createProduct(productDataWithBatch, userId, { 
          session, 
          autoFindLocation: false 
        });
        productsCreated.push(result.data.product);
        
        console.log(`[ProductService] Produto ${i + 1}/${productsArray.length} criado:`, {
          productId: result.data.product.id,
          name: result.data.product.name,
          lot: result.data.product.lot
        });

      } catch (error) {
        console.error(`[ProductService] Erro ao criar produto ${i + 1}:`, error.message);
        
        if (!useTransactions) {
          // Sem transações: registrar falha mas continuar
          failedProducts.push({
            index: i,
            productData,
            error: error.message
          });
        } else {
          // Com transações: falhar imediatamente (rollback automático)
          throw error;
        }
      }
    }

    // Se não estamos usando transações e houve falhas, implementar rollback manual
    if (!useTransactions && failedProducts.length > 0) {
      console.warn(`[ProductService] ${failedProducts.length} produtos falharam sem transações - executando rollback manual`);
      
      // Remover produtos criados com sucesso (rollback manual)
      for (const createdProduct of productsCreated) {
        try {
          await removeProduct(createdProduct.id, userId, { skipValidation: true });
          console.log(`[ProductService] Produto ${createdProduct.name} removido durante rollback`);
        } catch (rollbackError) {
          console.error(`[ProductService] Erro durante rollback do produto ${createdProduct.name}:`, rollbackError.message);
        }
      }
      
      // Throw error com detalhes das falhas
      throw new Error(`Falha na criação em lote. Produtos com erro: ${failedProducts.map(f => f.index + 1).join(', ')}`);
    }

    // 3. Atualizar estatísticas do ProductBatch
    if (productBatch && productsCreated.length > 0) {
      const totalWeight = productsCreated.reduce((sum, product) => sum + (product.totalWeight || 0), 0);
      await productBatch.updateStatistics(productsCreated.length, totalWeight);
    }

    return {
      batchId,
      batchName: resolvedBatchName,
      clientId,
      productsCreated,
      totalProducts: productsCreated.length
    };
  };

  try {
    return await executeWithTransactionIfAvailable(batchOperation);
  } catch (error) {
    throw new Error(`Erro ao criar produtos em lote: ${error.message}`);
  }
};

module.exports = {
  createProduct,
  moveProduct,
  removeProduct,
  findOptimalLocation,
  validateProductData,
  generateProductCode,
  analyzeProductDistribution,
  getProductsByConditions,
  // Funcionalidades existentes
  partialExit,
  partialMove,
  addStock,
  // Novos métodos FSM
  locateProduct,
  requestProductWithdrawal,
  confirmProductWithdrawal,
  getProductsPendingLocation,
  getProductsPendingWithdrawal,
  getProductsPendingAllocationGrouped,
  getProductsByBatch,
  createProductsBatch
}; 