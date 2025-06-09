/**
 * Controller de Câmaras Refrigeradas
 * Objetivos: Gestão inteligente de câmaras com análises avançadas e otimização
 * Baseado no planejamento: /api/chambers com funcionalidades avançadas de monitoramento
 * 
 * REESTRUTURADO: Agora usa chamberService para funcionalidades avançadas e integrações
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const Chamber = require('../models/Chamber');
const chamberService = require('../services/chamberService');

/**
 * @desc    Listar câmaras com análises opcionais
 * @route   GET /api/chambers
 * @access  Private (All authenticated users)
 */
const getChambers = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    sort = 'name',
    search,
    status,
    withAlerts = 'false',
    includeCapacity = 'false',
    includeConditions = 'false'
  } = req.query;

  // 1. Construir filtros
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) {
    filter.status = status;
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

  // 3. Buscar câmaras com ou sem alertas
  let query;
  if (withAlerts === 'true') {
    // Usar método estático para câmaras com alertas
    query = Chamber.findWithAlerts();
    if (Object.keys(filter).length > 0) {
      query = query.find(filter);
    }
  } else {
    query = Chamber.find(filter);
  }

  // 4. Executar consulta com paginação
  const [chambers, total] = await Promise.all([
    query
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    withAlerts === 'true' ? 
      Chamber.findWithAlerts().countDocuments(filter) :
      Chamber.countDocuments(filter)
  ]);

  // 5. Adicionar análises avançadas se solicitado
  let chambersWithAnalytics = chambers;
  
  if (includeCapacity === 'true' || includeConditions === 'true') {
    chambersWithAnalytics = await Promise.all(
      chambers.map(async (chamber) => {
        try {
          let capacityAnalysis = null;
          let conditionsAnalysis = null;

          // Análise de capacidade usando chamberService
          if (includeCapacity === 'true') {
            const capacityResult = await chamberService.analyzeCapacityUtilization(chamber._id, {
              includeProjections: false
            });
            
            capacityAnalysis = {
              utilizationPercentage: capacityResult.data.capacity.utilizationPercentage,
              totalCapacity: capacityResult.data.capacity.total,
              usedCapacity: capacityResult.data.capacity.used,
              efficiency: capacityResult.data.efficiency.rating,
              alerts: capacityResult.data.alerts
            };
          }

          // Análise de condições ambientais usando chamberService
          if (includeConditions === 'true') {
            const conditionsResult = await chamberService.monitorEnvironmentalConditions(chamber._id, {
              includeAlerts: true
            });
            
            conditionsAnalysis = {
              qualityScore: conditionsResult.data.qualityScore,
              compliance: conditionsResult.data.compliance,
              alerts: conditionsResult.data.alerts.slice(0, 3), // Máximo 3 alertas
              status: conditionsResult.data.status
            };
          }

          return {
            ...chamber,
            // Campos virtuais básicos
            totalLocations: chamber.dimensions.quadras * chamber.dimensions.lados * 
                          chamber.dimensions.filas * chamber.dimensions.andares,
            // Análises avançadas
            analytics: {
              capacity: capacityAnalysis,
              conditions: conditionsAnalysis
            }
          };
        } catch (error) {
          // Se falhar a análise, retornar câmara sem analytics
          return {
            ...chamber,
            totalLocations: chamber.dimensions.quadras * chamber.dimensions.lados * 
                          chamber.dimensions.filas * chamber.dimensions.andares,
            analytics: null
          };
        }
      })
    );
  } else {
    // Adicionar campos virtuais básicos
    chambersWithAnalytics = chambers.map(chamber => ({
      ...chamber,
      totalLocations: chamber.dimensions.quadras * chamber.dimensions.lados * 
                     chamber.dimensions.filas * chamber.dimensions.andares
    }));
  }

  // 6. Calcular informações de paginação
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 7. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      chambers: chambersWithAnalytics,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      analytics: {
        capacityEnabled: includeCapacity === 'true',
        conditionsEnabled: includeConditions === 'true'
      }
    }
  });
});

/**
 * @desc    Obter câmara específica com análises detalhadas
 * @route   GET /api/chambers/:id
 * @access  Private (All authenticated users)
 */
const getChamber = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { 
    includeCapacity = 'true', 
    includeConditions = 'true',
    timeframe = '30d'
  } = req.query;

  // 1. Buscar câmara
  const chamber = await Chamber.findById(id);

  if (!chamber) {
    return next(new AppError('Câmara não encontrada', 404));
  }

  // 2. Usar chamberService para análises avançadas
  let capacityAnalysis = null;
  let conditionsAnalysis = null;

  try {
    // Análise de capacidade detalhada
    if (includeCapacity === 'true') {
      const capacityResult = await chamberService.analyzeCapacityUtilization(id, {
        timeframe,
        includeProjections: true
      });
      
      capacityAnalysis = capacityResult.data;
    }

    // Monitoramento de condições ambientais
    if (includeConditions === 'true') {
      const conditionsResult = await chamberService.monitorEnvironmentalConditions(id, {
        timeframe,
        includeAlerts: true
      });
      
      conditionsAnalysis = conditionsResult.data;
    }
  } catch (error) {
    console.warn('Erro ao executar análises da câmara:', error.message);
  }

  // 3. Buscar estatísticas básicas de ocupação (fallback)
  const Location = require('../models/Location');
  const occupancyStats = await Location.aggregate([
    { $match: { chamberId: chamber._id } },
    {
      $group: {
        _id: null,
        totalLocations: { $sum: 1 },
        occupiedLocations: { $sum: { $cond: ['$isOccupied', 1, 0] } },
        totalCapacity: { $sum: '$maxCapacityKg' },
        usedCapacity: { $sum: '$currentWeightKg' }
      }
    }
  ]);

  const basicOccupancy = occupancyStats.length > 0 ? {
    totalLocations: occupancyStats[0].totalLocations,
    occupiedLocations: occupancyStats[0].occupiedLocations,
    occupancyRate: ((occupancyStats[0].occupiedLocations / occupancyStats[0].totalLocations) * 100).toFixed(1),
    totalCapacity: occupancyStats[0].totalCapacity,
    usedCapacity: occupancyStats[0].usedCapacity,
    capacityRate: ((occupancyStats[0].usedCapacity / occupancyStats[0].totalCapacity) * 100).toFixed(1)
  } : {
    totalLocations: 0,
    occupiedLocations: 0,
    occupancyRate: '0.0',
    totalCapacity: 0,
    usedCapacity: 0,
    capacityRate: '0.0'
  };

  // 4. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      chamber: {
        id: chamber._id,
        name: chamber.name,
        description: chamber.description,
        currentTemperature: chamber.currentTemperature,
        currentHumidity: chamber.currentHumidity,
        dimensions: chamber.dimensions,
        status: chamber.status,
        settings: chamber.settings,
        lastMaintenanceDate: chamber.lastMaintenanceDate,
        nextMaintenanceDate: chamber.nextMaintenanceDate,
        totalLocations: chamber.totalLocations,
        temperatureStatus: chamber.temperatureStatus,
        humidityStatus: chamber.humidityStatus,
        conditionsStatus: chamber.conditionsStatus,
        needsMaintenance: chamber.needsMaintenance(),
        createdAt: chamber.createdAt,
        updatedAt: chamber.updatedAt
      },
      occupancy: basicOccupancy,
      capacityAnalysis: capacityAnalysis,
      conditionsAnalysis: conditionsAnalysis,
      analyzedAt: new Date()
    }
  });
});

/**
 * @desc    Criar nova câmara com geração integrada de localizações
 * @route   POST /api/chambers
 * @access  Private (Admin only)
 */
const createChamber = asyncHandler(async (req, res, next) => {
  const {
    name,
    description,
    currentTemperature,
    currentHumidity,
    dimensions,
    settings,
    lastMaintenanceDate,
    nextMaintenanceDate,
    generateLocations = true,
    locationOptions
  } = req.body;

  // 1. Verificar se câmara já existe
  const existingChamber = await Chamber.findOne({
    name: { $regex: new RegExp(`^${name}$`, 'i') }
  });
  
  if (existingChamber) {
    return next(new AppError('Câmara com este nome já existe', 400));
  }

  // 2. Preparar dados da câmara
  const chamberData = {
    name: name.trim(),
    description: description?.trim() || '',
    currentTemperature: currentTemperature || null,
    currentHumidity: currentHumidity || null,
    dimensions,
    settings: settings || {},
    lastMaintenanceDate: lastMaintenanceDate || null,
    nextMaintenanceDate: nextMaintenanceDate || null
  };

  try {
    // 3. Usar chamberService para criação integrada
    if (generateLocations) {
      const result = await chamberService.createChamberWithLocations(chamberData, {
        defaultCapacity: locationOptions?.defaultCapacity || 1000,
        capacityVariation: locationOptions?.capacityVariation !== false,
        optimizeAccess: locationOptions?.optimizeAccess !== false,
        ...locationOptions
      });

      // 4. Resposta de sucesso com dados da criação integrada
      res.status(201).json({
        success: true,
        message: 'Câmara criada com sucesso e localizações geradas',
        data: {
          chamber: {
            id: result.data.chamber.id,
            name: result.data.chamber.name,
            description: result.data.chamber.description,
            dimensions: result.data.chamber.dimensions,
            status: result.data.chamber.status,
            currentConditions: result.data.chamber.currentConditions,
            totalLocations: result.data.chamber.dimensions.quadras * 
                          result.data.chamber.dimensions.lados * 
                          result.data.chamber.dimensions.filas * 
                          result.data.chamber.dimensions.andares,
            createdAt: result.data.chamber.createdAt
          },
          locations: {
            totalGenerated: result.data.locations.totalGenerated,
            summary: result.data.locations.summary
          },
          benefits: result.data.estimatedBenefits
        }
      });
    } else {
      // 5. Criação simples sem localizações
      const newChamber = await Chamber.create(chamberData);

      res.status(201).json({
        success: true,
        message: 'Câmara criada com sucesso',
        data: {
          chamber: {
            id: newChamber._id,
            name: newChamber.name,
            description: newChamber.description,
            currentTemperature: newChamber.currentTemperature,
            currentHumidity: newChamber.currentHumidity,
            dimensions: newChamber.dimensions,
            status: newChamber.status,
            settings: newChamber.settings,
            totalLocations: newChamber.totalLocations,
            createdAt: newChamber.createdAt
          }
        }
      });
    }

  } catch (error) {
    return next(new AppError(`Erro ao criar câmara: ${error.message}`, 400));
  }
});

/**
 * @desc    Atualizar câmara com validações avançadas
 * @route   PUT /api/chambers/:id
 * @access  Private (Admin/Operator)
 */
const updateChamber = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    description,
    currentTemperature,
    currentHumidity,
    status,
    settings,
    lastMaintenanceDate,
    nextMaintenanceDate
  } = req.body;

  // 1. Verificar se câmara existe
  const chamber = await Chamber.findById(id);
  
  if (!chamber) {
    return next(new AppError('Câmara não encontrada', 404));
  }

  // 2. Verificar se nome será alterado e se já existe
  if (name && name.toLowerCase() !== chamber.name.toLowerCase()) {
    const existingChamber = await Chamber.findOne({
      name: { $regex: new RegExp(`^${name}$`, 'i') },
      _id: { $ne: id }
    });
    
    if (existingChamber) {
      return next(new AppError('Nome já está em uso por outra câmara', 400));
    }
  }

  // 3. Usar chamberService para validar dados se fornecidos
  if (req.body.dimensions || name || currentTemperature !== undefined || currentHumidity !== undefined) {
    try {
      const validationData = {
        name: name || chamber.name,
        dimensions: req.body.dimensions || chamber.dimensions,
        currentTemperature: currentTemperature !== undefined ? currentTemperature : chamber.currentTemperature,
        currentHumidity: currentHumidity !== undefined ? currentHumidity : chamber.currentHumidity
      };

      const validation = chamberService.validateChamberData(validationData);
      if (!validation.isValid) {
        return next(new AppError(`Dados inválidos: ${validation.errors.join(', ')}`, 400));
      }
    } catch (error) {
      console.warn('Erro na validação avançada:', error.message);
    }
  }

  // 4. Verificar alteração de dimensões e lidar com localizações existentes
  if (req.body.dimensions) {
    const Location = require('../models/Location');
    const Product = require('../models/Product');
    
    // Verificar se há produtos armazenados
    const occupiedLocations = await Location.find({
      chamberId: id,
      isOccupied: true
    });

    if (occupiedLocations.length > 0) {
      // Verificar se há produtos ativos
      const activeProducts = await Product.countDocuments({
        locationId: { $in: occupiedLocations.map(loc => loc._id) },
        status: { $in: ['stored', 'reserved'] }
      });

      if (activeProducts > 0) {
        return next(new AppError(
          `Não é possível alterar dimensões. Existem ${activeProducts} produto(s) ativo(s) armazenado(s) na câmara. Remova ou mova os produtos primeiro.`,
          400
        ));
      }
    }

    // Se não há produtos ativos, remover todas as localizações vazias
    await Location.deleteMany({
      chamberId: id,
      isOccupied: false
    });

    // Log da operação
    console.log(`🗑️ Localizações vazias removidas da câmara ${chamber.name} para permitir alteração de dimensões`);
  }

  // 5. Preparar dados para atualização
  const updateData = {};
  
  if (name) updateData.name = name.trim();
  if (description !== undefined) updateData.description = description.trim();
  if (currentTemperature !== undefined) updateData.currentTemperature = currentTemperature;
  if (currentHumidity !== undefined) updateData.currentHumidity = currentHumidity;
  if (status) updateData.status = status;
  if (settings !== undefined) updateData.settings = settings;
  if (lastMaintenanceDate !== undefined) updateData.lastMaintenanceDate = lastMaintenanceDate;
  if (nextMaintenanceDate !== undefined) updateData.nextMaintenanceDate = nextMaintenanceDate;
  if (req.body.dimensions) updateData.dimensions = req.body.dimensions;

  // 6. Verificar se há dados para atualizar
  if (Object.keys(updateData).length === 0) {
    return next(new AppError('Nenhum campo válido para atualização fornecido', 400));
  }

  // 7. Atualizar câmara
  const updatedChamber = await Chamber.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  );

  // 8. Gerar análise pós-atualização se condições ambientais foram alteradas
  let postUpdateAnalysis = null;
  if (currentTemperature !== undefined || currentHumidity !== undefined) {
    try {
      const conditionsResult = await chamberService.monitorEnvironmentalConditions(id, {
        includeAlerts: true
      });
      
      postUpdateAnalysis = {
        qualityScore: conditionsResult.data.qualityScore,
        compliance: conditionsResult.data.compliance,
        alerts: conditionsResult.data.alerts.slice(0, 2),
        recommendations: conditionsResult.data.recommendations.slice(0, 3)
      };
    } catch (error) {
      console.warn('Erro na análise pós-atualização:', error.message);
    }
  }

  // 9. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Câmara atualizada com sucesso',
    data: {
      chamber: {
        id: updatedChamber._id,
        name: updatedChamber.name,
        description: updatedChamber.description,
        currentTemperature: updatedChamber.currentTemperature,
        currentHumidity: updatedChamber.currentHumidity,
        dimensions: updatedChamber.dimensions,
        status: updatedChamber.status,
        settings: updatedChamber.settings,
        lastMaintenanceDate: updatedChamber.lastMaintenanceDate,
        nextMaintenanceDate: updatedChamber.nextMaintenanceDate,
        totalLocations: updatedChamber.totalLocations,
        temperatureStatus: updatedChamber.temperatureStatus,
        humidityStatus: updatedChamber.humidityStatus,
        conditionsStatus: updatedChamber.conditionsStatus,
        updatedAt: updatedChamber.updatedAt
      },
      postUpdateAnalysis
    }
  });
});

/**
 * @desc    Excluir câmara permanentemente ou desativar
 * @route   DELETE /api/chambers/:id?permanent=true
 * @access  Private (Admin only)
 */
const deleteChamber = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { permanent = 'false' } = req.query;

  // 1. Verificar se câmara existe
  const chamber = await Chamber.findById(id);
  
  if (!chamber) {
    return next(new AppError('Câmara não encontrada', 404));
  }

  // 2. Verificar se existem produtos armazenados na câmara
  const Location = require('../models/Location');
  const Product = require('../models/Product');
  
  const locationsWithProducts = await Location.find({
    chamberId: id,
    isOccupied: true
  });

  if (locationsWithProducts.length > 0) {
    // Verificar se há produtos ativos
    const activeProducts = await Product.countDocuments({
      locationId: { $in: locationsWithProducts.map(loc => loc._id) },
      status: { $in: ['stored', 'reserved'] }
    });

    if (activeProducts > 0) {
      return next(new AppError(
        `Não é possível ${permanent === 'true' ? 'excluir' : 'desativar'} esta câmara. Existem ${activeProducts} produto(s) ativo(s) armazenado(s) nela`,
        400
      ));
    }
  }

  // 3. Gerar relatório final usando chamberService
  let finalReport = null;
  try {
    const capacityAnalysis = await chamberService.analyzeCapacityUtilization(id, {
      timeframe: '90d',
      includeProjections: false
    });
    
    finalReport = {
      utilizationHistory: {
        peak: capacityAnalysis.data.capacity.utilizationPercentage,
        efficiency: capacityAnalysis.data.efficiency.rating
      },
      recommendations: capacityAnalysis.data.recommendations.slice(0, 3)
    };
  } catch (error) {
    console.warn('Erro ao gerar relatório final:', error.message);
  }

  if (permanent === 'true') {
    // 4. Exclusão permanente
    // Primeiro, remover todas as localizações da câmara
    const deletedLocations = await Location.deleteMany({ chamberId: id });
    
    // Depois, remover a câmara
    await Chamber.findByIdAndDelete(id);

    console.log(`🗑️ Câmara "${chamber.name}" e ${deletedLocations.deletedCount} localizações removidas permanentemente`);

    res.status(200).json({
      success: true,
      message: 'Câmara removida permanentemente',
      data: {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          deletedLocations: deletedLocations.deletedCount
        },
        finalReport
      }
    });
  } else {
    // 4. Desativar câmara (soft delete)
    const deactivatedChamber = await Chamber.findByIdAndUpdate(
      id,
      { status: 'inactive' },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: 'Câmara desativada com sucesso',
      data: {
        chamber: {
          id: deactivatedChamber._id,
          name: deactivatedChamber.name,
          status: deactivatedChamber.status,
          updatedAt: deactivatedChamber.updatedAt
        },
        finalReport
      }
    });
  }
});

/**
 * @desc    Gerar localizações com análise de otimização
 * @route   POST /api/chambers/:id/generate-locations
 * @access  Private (Admin only)
 */
const generateLocations = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { 
    maxCapacityKg = 1000, 
    overwrite = false,
    optimizeAccess = true,
    capacityVariation = true
  } = req.body;

  // 1. Verificar se câmara existe
  const chamber = await Chamber.findById(id);
  
  if (!chamber) {
    return next(new AppError('Câmara não encontrada', 404));
  }

  // 2. Verificar se já existem localizações
  const Location = require('../models/Location');
  const existingLocations = await Location.countDocuments({ chamberId: id });
  
  if (existingLocations > 0 && !overwrite) {
    return next(new AppError(
      `Câmara já possui ${existingLocations} localização(ões). Use overwrite=true para sobrescrever`,
      400
    ));
  }

  // 3. Se overwrite=true, verificar se há produtos armazenados
  if (overwrite && existingLocations > 0) {
    const occupiedLocations = await Location.countDocuments({
      chamberId: id,
      isOccupied: true
    });

    if (occupiedLocations > 0) {
      return next(new AppError(
        `Não é possível sobrescrever localizações ocupadas. ${occupiedLocations} localização(ões) possuem produtos`,
        400
      ));
    }

    // Remover localizações existentes vazias
    await Location.deleteMany({
      chamberId: id,
      isOccupied: false
    });
  }

  try {
    // 4. Usar locationService integrado via chamberService para geração otimizada
    const locationService = require('../services/locationService');
    const generationResult = await locationService.generateLocationsForChamber(id, {
      defaultCapacity: maxCapacityKg,
      capacityVariation,
      optimizeAccess,
      skipExisting: !overwrite
    });

    if (!generationResult.success) {
      return next(new AppError(generationResult.message || 'Erro na geração de localizações', 400));
    }

    // 5. Calcular benefícios da geração usando chamberService
    let benefits = null;
    try {
      benefits = {
        efficiency: chamberService.calculateInitialEfficiencyScore(chamber, { 
          totalGenerated: generationResult.locationsCreated 
        }),
        flexibility: chamberService.calculateFlexibilityScore({ 
          totalGenerated: generationResult.locationsCreated,
          summary: generationResult.stats || {}
        })
      };
    } catch (error) {
      console.warn('Erro ao calcular benefícios:', error.message);
    }

    // 6. Resposta de sucesso
    res.status(201).json({
      success: true,
      message: generationResult.message,
      data: {
        chamber: {
          id: chamber._id,
          name: chamber.name,
          totalLocations: chamber.totalLocations
        },
        generated: {
          count: generationResult.locationsCreated,
          maxCapacityKg,
          overwrite,
          configuration: generationResult.configuration
        },
        benefits,
        stats: generationResult.stats
      }
    });

  } catch (error) {
    return next(new AppError(`Erro ao gerar localizações: ${error.message}`, 500));
  }
});

/**
 * @desc    Obter análise de capacidade detalhada
 * @route   GET /api/chambers/:id/capacity-analysis
 * @access  Private (Admin/Operator)
 */
const getCapacityAnalysis = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { timeframe = '30d', includeProjections = 'true' } = req.query;

  try {
    const analysisResult = await chamberService.analyzeCapacityUtilization(id, {
      timeframe,
      includeProjections: includeProjections === 'true'
    });

    res.status(200).json({
      success: true,
      data: analysisResult.data
    });

  } catch (error) {
    return next(new AppError(`Erro na análise de capacidade: ${error.message}`, 500));
  }
});

/**
 * @desc    Obter monitoramento de condições ambientais
 * @route   GET /api/chambers/:id/environmental-monitoring
 * @access  Private (Admin/Operator)
 */
const getEnvironmentalMonitoring = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { timeframe = '24h', includeAlerts = 'true' } = req.query;

  try {
    const monitoringResult = await chamberService.monitorEnvironmentalConditions(id, {
      timeframe,
      includeAlerts: includeAlerts === 'true'
    });

    res.status(200).json({
      success: true,
      data: monitoringResult.data
    });

  } catch (error) {
    return next(new AppError(`Erro no monitoramento ambiental: ${error.message}`, 500));
  }
});

/**
 * @desc    Obter cronograma de manutenção
 * @route   GET /api/chambers/:id/maintenance-schedule
 * @access  Private (Admin/Operator)
 */
const getMaintenanceSchedule = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { includePreventive = 'true', timeframe = '12M' } = req.query;

  try {
    const scheduleResult = await chamberService.generateMaintenanceSchedule(id, {
      includePreventive: includePreventive === 'true',
      timeframe
    });

    res.status(200).json({
      success: true,
      data: scheduleResult.data
    });

  } catch (error) {
    return next(new AppError(`Erro ao gerar cronograma de manutenção: ${error.message}`, 500));
  }
});

/**
 * @desc    Obter otimizações de layout
 * @route   GET /api/chambers/:id/layout-optimization
 * @access  Private (Admin only)
 */
const getLayoutOptimization = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { includeReorganization = 'false' } = req.query;

  try {
    const optimizationResult = await chamberService.optimizeChamberLayout(id, {
      includeReorganization: includeReorganization === 'true'
    });

    res.status(200).json({
      success: true,
      data: optimizationResult.data
    });

  } catch (error) {
    return next(new AppError(`Erro na otimização de layout: ${error.message}`, 500));
  }
});

module.exports = {
  getChambers,
  getChamber,
  createChamber,
  updateChamber,
  deleteChamber,
  generateLocations,
  getCapacityAnalysis,
  getEnvironmentalMonitoring,
  getMaintenanceSchedule,
  getLayoutOptimization
}; 