/**
 * Controller de Tipos de Sementes
 * Objetivos: Sistema dinâmico de tipos de sementes sem alterações no código
 * Baseado no planejamento: /api/seed-types com gestão completa de tipos
 * 
 * REESTRUTURADO: Agora usa seedTypeService para funcionalidades avançadas e análises
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const SeedType = require('../models/SeedType');
const seedTypeService = require('../services/seedTypeService');

/**
 * @desc    Listar tipos de sementes
 * @route   GET /api/seed-types
 * @access  Private (All authenticated users)
 */
const getSeedTypes = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = 'name',
    search,
    isActive,
    temperature,
    humidity,
    includeAnalytics = 'false'
  } = req.query;

  // 1. Construir filtros
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  // Filtros por condições de armazenamento
  if (temperature) {
    const temp = parseFloat(temperature);
    filter.optimalTemperature = { $gte: temp - 2, $lte: temp + 2 };
  }
  
  if (humidity) {
    const hum = parseFloat(humidity);
    filter.optimalHumidity = { $gte: hum - 5, $lte: hum + 5 };
  }

  // 2. Configurar paginação
  const skip = (page - 1) * limit;
  const sortObj = {};
  
  // Parse do sort
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  // 3. Executar consulta com paginação
  const [seedTypes, total] = await Promise.all([
    SeedType.find(filter)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit)),
    SeedType.countDocuments(filter)
  ]);

  // 4. Adicionar análises avançadas se solicitado
  let seedTypesWithAnalytics = seedTypes;
  
  if (includeAnalytics === 'true') {
    // Usar seedTypeService para adicionar análises de condições ótimas
    seedTypesWithAnalytics = await Promise.all(
      seedTypes.map(async (seedType) => {
        try {
          const optimalConditions = await seedTypeService.analyzeOptimalConditions(seedType._id, {
            includeRecommendations: true
          });
          
          return {
            ...seedType.toObject(),
            analytics: {
              optimalConditions: optimalConditions.data.optimalTemperature,
              hasRealData: optimalConditions.data.hasRealData,
              dataPoints: optimalConditions.data.dataPoints,
              recommendations: optimalConditions.data.recommendations.slice(0, 3),
              lastAnalysis: optimalConditions.data.analysisDate
            }
          };
        } catch (error) {
          // Se falhar a análise, retornar tipo sem analytics
          return {
            ...seedType.toObject(),
            analytics: null
          };
        }
      })
    );
  }

  // 5. Calcular informações de paginação
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 6. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      seedTypes: seedTypesWithAnalytics,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      analytics: includeAnalytics === 'true' ? {
        enabled: true,
        description: 'Análises de condições ótimas baseadas em dados reais'
      } : null
    }
  });
});

/**
 * @desc    Obter tipo de semente específico
 * @route   GET /api/seed-types/:id
 * @access  Private (All authenticated users)
 */
const getSeedType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { includeOptimalConditions = 'false', includeCompatibility = 'false' } = req.query;

  // 1. Buscar tipo de semente
  const seedType = await SeedType.findById(id);

  if (!seedType) {
    return next(new AppError('Tipo de semente não encontrado', 404));
  }

  // 2. Adicionar análise de condições ótimas se solicitado
  let optimalConditionsAnalysis = null;
  if (includeOptimalConditions === 'true') {
    try {
      const optimalConditions = await seedTypeService.analyzeOptimalConditions(id, {
        includeRecommendations: true,
        includePerformanceData: true
      });
      
      optimalConditionsAnalysis = optimalConditions.data;
    } catch (error) {
      console.warn('Erro ao analisar condições ótimas:', error.message);
    }
  }

  // 3. Adicionar análise de compatibilidade com câmaras se solicitado
  let compatibilityAnalysis = null;
  if (includeCompatibility === 'true') {
    try {
      // Usar seedTypeService para recomendar câmaras compatíveis
      // Como precisamos do ID de câmara específica, vamos fazer uma análise geral
      const storageOptimizations = await seedTypeService.suggestStorageOptimizations(id, {
        includeChamberRecommendations: true
      });
      
      compatibilityAnalysis = storageOptimizations.data.chamberCompatibility;
    } catch (error) {
      console.warn('Erro ao analisar compatibilidade:', error.message);
    }
  }

  // 4. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      seedType: {
        id: seedType._id,
        name: seedType.name,
        description: seedType.description,
        optimalTemperature: seedType.optimalTemperature,
        optimalHumidity: seedType.optimalHumidity,
        maxStorageTimeDays: seedType.maxStorageTimeDays,
        specifications: seedType.specifications,
        storageNotes: seedType.storageNotes,
        isActive: seedType.isActive,
        createdAt: seedType.createdAt,
        updatedAt: seedType.updatedAt
      },
      optimalConditions: optimalConditionsAnalysis,
      compatibility: compatibilityAnalysis
    }
  });
});

/**
 * @desc    Criar novo tipo de semente
 * @route   POST /api/seed-types
 * @access  Private (Admin/Operator)
 */
const createSeedType = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    category,
    varietyCode,
    optimalTemperature,
    optimalHumidity,
    maxStorageTimeDays,
    specifications,
    storageNotes
  } = req.body;

  // 1. Preparar dados do tipo de semente
  const seedTypeData = {
    name: name.trim(),
    description: description?.trim() || '',
    category: category || 'general',
    varietyCode: varietyCode || name.trim().toUpperCase().replace(/\s+/g, '_'),
    optimalTemperature: optimalTemperature || undefined,
    optimalHumidity: optimalHumidity || undefined,
    maxStorageTimeDays: maxStorageTimeDays || 365, // Default 1 ano
    specifications: specifications || {},
    storageNotes: storageNotes?.trim() || ''
  };

  try {
    // 2. Usar seedTypeService para criar o tipo com validações avançadas
    const result = await seedTypeService.createSeedType(seedTypeData);

    if (!result.success) {
      return next(new AppError(result.message || 'Erro ao criar tipo de semente', 400));
    }

    // 3. Sugerir especificações se não fornecidas
    let suggestedSpecs = null;
    if (!specifications || Object.keys(specifications).length === 0) {
      try {
        const suggestions = await seedTypeService.suggestSpecificationsForNewType(seedTypeData);
        suggestedSpecs = suggestions.data;
      } catch (error) {
        console.warn('Erro ao sugerir especificações:', error.message);
      }
    }

    // 4. Resposta de sucesso
    res.status(201).json({
      success: true,
      message: 'Tipo de semente criado com sucesso',
      data: {
        seedType: {
          id: result.data._id,
          name: result.data.name,
          description: result.data.description,
          category: result.data.category,
          varietyCode: result.data.varietyCode,
          optimalTemperature: result.data.optimalTemperature,
          optimalHumidity: result.data.optimalHumidity,
          maxStorageTimeDays: result.data.maxStorageTimeDays,
          specifications: result.data.specifications,
          storageNotes: result.data.storageNotes,
          isActive: result.data.isActive,
          createdAt: result.data.createdAt
        },
        suggestedSpecifications: suggestedSpecs
      }
    });

  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Atualizar tipo de semente
 * @route   PUT /api/seed-types/:id
 * @access  Private (Admin/Operator)
 */
const updateSeedType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    description,
    optimalTemperature,
    optimalHumidity,
    maxStorageTimeDays,
    specifications,
    storageNotes,
    isActive
  } = req.body;

  // 1. Verificar se tipo existe
  const seedType = await SeedType.findById(id);
  
  if (!seedType) {
    return next(new AppError('Tipo de semente não encontrado', 404));
  }

  // 2. Verificar se nome será alterado e se já existe
  if (name && name.toLowerCase() !== seedType.name.toLowerCase()) {
    const existingSeedType = await SeedType.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (existingSeedType) {
      return next(new AppError('Nome já está em uso por outro tipo de semente', 400));
    }
  }

  // 3. Preparar dados para atualização
  const updateData = {};
  
  if (name) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (optimalTemperature !== undefined) updateData.optimalTemperature = optimalTemperature;
  if (optimalHumidity !== undefined) updateData.optimalHumidity = optimalHumidity;
  if (maxStorageTimeDays !== undefined) updateData.maxStorageTimeDays = maxStorageTimeDays;
  if (specifications !== undefined) updateData.specifications = specifications;
  if (storageNotes !== undefined) updateData.storageNotes = storageNotes.trim();
  if (isActive !== undefined) updateData.isActive = isActive;

  // 4. Atualizar tipo de semente
  const updatedSeedType = await SeedType.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  // 5. Validar novas condições se fornecidas
  let conditionsValidation = null;
  if (optimalTemperature !== undefined || optimalHumidity !== undefined) {
    try {
      const validation = await seedTypeService.validateOptimalConditions(updatedSeedType.toObject());
      conditionsValidation = validation.data;
    } catch (error) {
      console.warn('Erro ao validar condições:', error.message);
    }
  }

  // 6. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Tipo de semente atualizado com sucesso',
    data: {
      seedType: {
        id: updatedSeedType._id,
        name: updatedSeedType.name,
        description: updatedSeedType.description,
        optimalTemperature: updatedSeedType.optimalTemperature,
        optimalHumidity: updatedSeedType.optimalHumidity,
        maxStorageTimeDays: updatedSeedType.maxStorageTimeDays,
        specifications: updatedSeedType.specifications,
        storageNotes: updatedSeedType.storageNotes,
        isActive: updatedSeedType.isActive,
        updatedAt: updatedSeedType.updatedAt
      },
      conditionsValidation
    }
  });
});

/**
 * @desc    Desativar tipo de semente (soft delete)
 * @route   DELETE /api/seed-types/:id
 * @access  Private (Admin only)
 */
const deleteSeedType = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1. Verificar se tipo existe
  const seedType = await SeedType.findById(id);
  
  if (!seedType) {
    return next(new AppError('Tipo de semente não encontrado', 404));
  }

  // 2. Verificar se existem produtos usando este tipo
  const Product = require('../models/Product');
  const productsWithType = await Product.countDocuments({
    seedTypeId: id,
    status: { $in: ['stored', 'reserved'] }
  });

  if (productsWithType > 0) {
    return next(new AppError(
      `Não é possível desativar este tipo. Existem ${productsWithType} produto(s) ativo(s) usando este tipo`,
      400
    ));
  }

  // 3. Gerar relatório de uso antes da desativação
  let usageReport = null;
  try {
    const movementPatterns = await seedTypeService.analyzeMovementPatternsBySeedType(id);
    usageReport = movementPatterns;
  } catch (error) {
    console.warn('Erro ao gerar relatório de uso:', error.message);
  }

  // 4. Desativar tipo (soft delete)
  const deactivatedSeedType = await SeedType.findByIdAndUpdate(
    id,
    { isActive: false },
    { new: true }
  );

  // 5. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Tipo de semente desativado com sucesso',
    data: {
      seedType: {
        id: deactivatedSeedType._id,
        name: deactivatedSeedType.name,
        isActive: deactivatedSeedType.isActive,
        updatedAt: deactivatedSeedType.updatedAt
      },
      usageReport
    }
  });
});

/**
 * @desc    Buscar tipos por condições de armazenamento
 * @route   GET /api/seed-types/by-conditions
 * @access  Private (All authenticated users)
 */
const getSeedTypesByConditions = asyncHandler(async (req, res, next) => {
  const { chamberId, temperature, humidity, tolerance = 2 } = req.query;

  // 1. Se for fornecido ID da câmara, usar o seedTypeService
  if (chamberId) {
    try {
      const recommendations = await seedTypeService.recommendSeedTypesForChamber(chamberId, {
        includeCompatibilityAnalysis: true,
        maxRecommendations: 20
      });

      return res.status(200).json({
        success: true,
        data: {
          seedTypes: recommendations.data.recommendations,
          compatibility: recommendations.data.compatibility,
          chamberInfo: recommendations.data.chamber
        }
      });
    } catch (error) {
      return next(new AppError(`Erro ao obter recomendações: ${error.message}`, 500));
    }
  }

  // 2. Busca tradicional por condições específicas
  if (!temperature && !humidity) {
    return next(new AppError('Pelo menos temperatura, umidade ou ID da câmara deve ser fornecido', 400));
  }

  // 3. Construir filtros
  const filter = { isActive: true };
  
  if (temperature) {
    const temp = parseFloat(temperature);
    const tol = parseFloat(tolerance);
    filter.optimalTemperature = { $gte: temp - tol, $lte: temp + tol };
  }
  
  if (humidity) {
    const hum = parseFloat(humidity);
    const tol = parseFloat(tolerance) * 2; // Maior tolerância para umidade
    filter.optimalHumidity = { $gte: hum - tol, $lte: hum + tol };
  }

  // 4. Buscar tipos compatíveis
  const compatibleTypes = await SeedType.find(filter).sort('name');

  // 5. Adicionar análise de compatibilidade para cada tipo
  const typesWithCompatibility = await Promise.all(
    compatibleTypes.map(async (seedType) => {
      try {
        const compatibility = await seedTypeService.analyzeCompatibility(
          seedType.toObject(),
          { temperature: parseFloat(temperature), humidity: parseFloat(humidity) }
        );
        
        return {
          ...seedType.toObject(),
          compatibility: compatibility.score,
          compatibilityLevel: compatibility.level,
          potentialIssues: compatibility.issues
        };
      } catch (error) {
        return {
          ...seedType.toObject(),
          compatibility: null
        };
      }
    })
  );

  // 6. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      seedTypes: typesWithCompatibility,
      searchCriteria: {
        temperature: temperature ? parseFloat(temperature) : null,
        humidity: humidity ? parseFloat(humidity) : null,
        tolerance: parseFloat(tolerance)
      },
      count: compatibleTypes.length
    }
  });
});

/**
 * @desc    Obter análise de performance entre tipos
 * @route   GET /api/seed-types/performance-comparison
 * @access  Private (Admin/Operator)
 */
const getPerformanceComparison = asyncHandler(async (req, res, next) => {
  const { seedTypeIds, timeframe = '6M', includeRecommendations = 'true' } = req.query;

  // 1. Validar parâmetros
  if (!seedTypeIds) {
    return next(new AppError('IDs dos tipos de sementes são obrigatórios', 400));
  }

  const typeIds = Array.isArray(seedTypeIds) ? seedTypeIds : seedTypeIds.split(',');

  try {
    // 2. Usar seedTypeService para comparar performance
    const comparison = await seedTypeService.compareSeedTypePerformance(typeIds, {
      timeframe,
      includeRecommendations: includeRecommendations === 'true',
      includeTrends: true
    });

    res.status(200).json({
      success: true,
      data: comparison.data
    });

  } catch (error) {
    return next(new AppError(`Erro ao comparar performance: ${error.message}`, 500));
  }
});

/**
 * @desc    Detectar violações de condições
 * @route   GET /api/seed-types/:id/condition-violations
 * @access  Private (Admin/Operator)
 */
const getConditionViolations = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { timeframe = '7d', includeRecommendations = 'true' } = req.query;

  try {
    // Usar seedTypeService para detectar violações
    const violations = await seedTypeService.detectConditionViolations(id, {
      timeframe,
      includeRecommendations: includeRecommendations === 'true',
      severity: 'all'
    });

    res.status(200).json({
      success: true,
      data: violations.data
    });

  } catch (error) {
    return next(new AppError(`Erro ao detectar violações: ${error.message}`, 500));
  }
});

module.exports = {
  getSeedTypes,
  getSeedType,
  createSeedType,
  updateSeedType,
  deleteSeedType,
  getSeedTypesByConditions,
  getPerformanceComparison,
  getConditionViolations
}; 