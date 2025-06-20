/**
 * Controller de Localizações
 * Objetivos: Gestão completa de localizações com hierarquia e capacidade
 * Baseado no planejamento: /api/locations com filtros avançados e estatísticas
 * 
 * REESTRUTURADO: Agora usa locationService para funcionalidades avançadas
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const Location = require('../models/Location');
const Chamber = require('../models/Chamber');
const locationService = require('../services/locationService');

/**
 * @desc    Listar localizações (com filtros)
 * @route   GET /api/locations
 * @access  Private (All authenticated users)
 */
const getLocations = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = 'coordinates.quadra',
    search,
    chamberId,
    isOccupied,
    minCapacity,
    maxCapacity,
    capacityStatus,
    nearCapacity
  } = req.query;

  // 1. Construir filtros
  const filter = {};
  
  if (search) {
    filter.$or = [
      { code: { $regex: search, $options: 'i' } },
      { 'metadata.notes': { $regex: search, $options: 'i' } }
    ];
  }
  
  if (chamberId) {
    filter.chamberId = chamberId;
  }
  
  if (isOccupied !== undefined) {
    filter.isOccupied = isOccupied === 'true';
  }
  
  if (minCapacity) {
    filter.maxCapacityKg = { ...filter.maxCapacityKg, $gte: parseFloat(minCapacity) };
  }
  
  if (maxCapacity) {
    filter.maxCapacityKg = { ...filter.maxCapacityKg, $lte: parseFloat(maxCapacity) };
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

  // 3. Filtro especial para localizações próximas da capacidade
  if (nearCapacity === 'true') {
    const nearCapacityLocations = await Location.findNearCapacity(80);
    const nearCapacityIds = nearCapacityLocations.map(loc => loc._id);
    filter._id = { $in: nearCapacityIds };
  }

  // 4. Executar consulta com paginação
  const [locations, total] = await Promise.all([
    Location.find(filter)
      .populate('chamberId', 'name status dimensions')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Location.countDocuments(filter)
  ]);

  // 5. Adicionar campos virtuais manualmente para lean()
  const locationsWithVirtuals = locations.map(location => {
    const availableCapacityKg = location.maxCapacityKg - location.currentWeightKg;
    const occupancyPercentage = location.maxCapacityKg === 0 ? 0 : 
      Math.round((location.currentWeightKg / location.maxCapacityKg) * 100);
    
    let capacityStatusCalc = 'empty';
    if (occupancyPercentage === 0) capacityStatusCalc = 'empty';
    else if (occupancyPercentage < 50) capacityStatusCalc = 'low';
    else if (occupancyPercentage < 80) capacityStatusCalc = 'medium';
    else if (occupancyPercentage < 100) capacityStatusCalc = 'high';
    else capacityStatusCalc = 'full';

    const coordinatesText = `Quadra ${location.coordinates.quadra}, Lado ${location.coordinates.lado}, Fila ${location.coordinates.fila}, Andar ${location.coordinates.andar}`;

    return {
      ...location,
      availableCapacityKg,
      occupancyPercentage,
      capacityStatus: capacityStatusCalc,
      coordinatesText
    };
  });

  // 6. Filtrar por capacityStatus se fornecido
  let filteredLocations = locationsWithVirtuals;
  if (capacityStatus) {
    filteredLocations = locationsWithVirtuals.filter(loc => loc.capacityStatus === capacityStatus);
  }

  // 7. Calcular informações de paginação
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 8. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      locations: filteredLocations,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      }
    }
  });
});

/**
 * @desc    Listar localizações por câmara
 * @route   GET /api/locations/chamber/:chamberId
 * @access  Private (All authenticated users)
 */
const getLocationsByChamber = asyncHandler(async (req, res, next) => {
  const { chamberId } = req.params;
  const { includeOccupied = 'true', sort = 'coordinates.quadra' } = req.query;

  // 1. Verificar se câmara existe
  const chamber = await Chamber.findById(chamberId);
  
  if (!chamber) {
    return next(new AppError('Câmara não encontrada', 404));
  }

  // 2. Buscar localizações usando método estático
  const locations = await Location.findByChamber(chamberId, includeOccupied === 'true');

  // 3. Aplicar ordenação personalizada se fornecida
  if (sort && sort !== 'coordinates.quadra') {
    const sortObj = {};
    if (sort.startsWith('-')) {
      sortObj[sort.substring(1)] = -1;
    } else {
      sortObj[sort] = 1;
    }
    
    locations.sort((a, b) => {
      const field = Object.keys(sortObj)[0];
      const order = sortObj[field];
      const aVal = field.split('.').reduce((obj, key) => obj?.[key], a);
      const bVal = field.split('.').reduce((obj, key) => obj?.[key], b);
      return order === 1 ? (aVal > bVal ? 1 : -1) : (aVal < bVal ? 1 : -1);
    });
  }

  // 4. Obter estatísticas da câmara
  const stats = await Location.getStats(chamberId);

  // 5. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      chamber: {
        id: chamber._id,
        name: chamber.name,
        status: chamber.status,
        totalLocations: chamber.totalLocations
      },
      locations,
      stats,
      filters: {
        includeOccupied: includeOccupied === 'true',
        count: locations.length
      }
    }
  });
});

/**
 * @desc    Listar apenas localizações disponíveis (MELHORADO)
 * @route   GET /api/locations/available
 * @access  Private (All authenticated users)
 * 
 * REESTRUTURADO: Usa locationService.findAvailableLocations()
 */
const getAvailableLocations = asyncHandler(async (req, res, next) => {
  try {
    // Usar locationService que implementa estratégias inteligentes
    const result = await locationService.findAvailableLocations(
      req.query,
      {
        strategy: req.query.strategy || 'OPTIMAL',
        includeStats: req.query.includeStats !== 'false',
        limit: parseInt(req.query.limit) || 50
      }
    );
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Obter localização específica
 * @route   GET /api/locations/:id
 * @access  Private (All authenticated users)
 */
const getLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // Buscar localização com dados relacionados
  const location = await Location.findById(id)
    .populate('chamberId', 'name status dimensions currentTemperature currentHumidity');

  if (!location) {
    return next(new AppError('Localização não encontrada', 404));
  }

  // Buscar produto atual se houver
  const Product = require('../models/Product');
  const currentProduct = await Product.findOne({
    locationId: id,
    status: 'stored'
  }).populate('seedTypeId', 'name optimalTemperature optimalHumidity');

  // Buscar histórico de movimentações (últimas 10)
  const Movement = require('../models/Movement');
  const recentMovements = await Movement.find({
    $or: [
      { fromLocationId: id },
      { toLocationId: id }
    ]
  })
    .populate('productId', 'name lot')
    .populate('userId', 'name')
    .sort({ timestamp: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      location: {
        id: location._id,
        code: location.code,
        coordinates: location.coordinates,
        coordinatesText: location.coordinatesText,
        maxCapacityKg: location.maxCapacityKg,
        currentWeightKg: location.currentWeightKg,
        availableCapacityKg: location.availableCapacityKg,
        occupancyPercentage: location.occupancyPercentage,
        capacityStatus: location.capacityStatus,
        isOccupied: location.isOccupied,
        chamber: location.chamberId,
        createdAt: location.createdAt,
        updatedAt: location.updatedAt
      },
      currentProduct,
      recentMovements,
      summary: {
        totalMovements: recentMovements.length,
        isCurrentlyOccupied: !!currentProduct,
        capacityUtilization: location.occupancyPercentage
      }
    }
  });
});

/**
 * @desc    Atualizar localização
 * @route   PUT /api/locations/:id
 * @access  Private (Admin/Operator)
 */
const updateLocation = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    maxCapacityKg,
    notes
  } = req.body;

  // Buscar localização
  const location = await Location.findById(id);
  
  if (!location) {
    return next(new AppError('Localização não encontrada', 404));
  }

  // Verificar se nova capacidade não é menor que o peso atual
  if (maxCapacityKg && maxCapacityKg < location.currentWeightKg) {
    return next(new AppError(
      `Nova capacidade (${maxCapacityKg}kg) não pode ser menor que o peso atual (${location.currentWeightKg}kg)`,
      400
    ));
  }

  // Atualizar campos permitidos
  const updateData = {};
  if (maxCapacityKg !== undefined) updateData.maxCapacityKg = maxCapacityKg;
  if (notes !== undefined) updateData.notes = notes;

  const updatedLocation = await Location.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate('chamberId', 'name');

  res.status(200).json({
    success: true,
    message: 'Localização atualizada com sucesso',
    data: {
      location: updatedLocation
    }
  });
});

/**
 * @desc    Gerar localizações automáticas para câmara
 * @route   POST /api/locations/generate
 * @access  Private (Admin)
 * 
 * NOVO ENDPOINT: Usa locationService.generateLocationsForChamber()
 */
const generateLocations = asyncHandler(async (req, res, next) => {
  const { chamberId } = req.body;

  if (!chamberId) {
    return next(new AppError('ID da câmara é obrigatório', 400));
  }

  try {
    const result = await locationService.generateLocationsForChamber(chamberId, {
      capacityVariation: req.body.capacityVariation || true,
      optimizeAccess: req.body.optimizeAccess || true,
      ...req.body
    });
    
    res.status(201).json({
      success: true,
      message: `${result.locationsCreated} localizações geradas com sucesso`,
      data: result
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Validar capacidade de localização
 * @route   POST /api/locations/validate-capacity
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Usa locationService.validateLocationCapacity()
 */
const validateLocationCapacity = asyncHandler(async (req, res, next) => {
  const { locationId, weight } = req.body;

  if (!locationId || !weight) {
    return next(new AppError('ID da localização e peso são obrigatórios', 400));
  }

  try {
    const result = await locationService.validateLocationCapacity(locationId, weight, {
      includeSuggestions: req.body.includeSuggestions !== 'false',
      includeAnalysis: req.body.includeAnalysis !== 'false'
    });
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Análise de ocupação
 * @route   GET /api/locations/occupancy-analysis
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Usa locationService.analyzeOccupancy()
 */
const getOccupancyAnalysis = asyncHandler(async (req, res, next) => {
  try {
    const result = await locationService.analyzeOccupancy(req.query, {
      includeOptimizations: req.query.includeOptimizations === 'true',
      includeProjections: req.query.includeProjections === 'true'
    });
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Localizações adjacentes
 * @route   GET /api/locations/:id/adjacent
 * @access  Private (All authenticated users)
 * 
 * NOVO ENDPOINT: Usa locationService.findAdjacentLocations()
 */
const getAdjacentLocations = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await locationService.findAdjacentLocations(id, {
      radius: parseInt(req.query.radius) || 1,
      includeOccupied: req.query.includeOccupied !== 'false',
      includeStats: req.query.includeStats === 'true'
    });
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Estatísticas de localizações
 * @route   GET /api/locations/stats
 * @access  Private (All authenticated users)
 */
const getLocationStats = asyncHandler(async (req, res, next) => {
  const { chamberId } = req.query;

  let stats;
  if (chamberId) {
    stats = await Location.getStats(chamberId);
  } else {
    // Estatísticas gerais do sistema
    const [
      totalLocations,
      occupiedLocations,
      nearCapacityLocations,
      totalCapacity,
      usedCapacity
    ] = await Promise.all([
      Location.countDocuments(),
      Location.countDocuments({ isOccupied: true }),
      Location.findNearCapacity(80).then(locs => locs.length),
      Location.aggregate([
        { $group: { _id: null, total: { $sum: '$maxCapacityKg' } } }
      ]).then(result => result[0]?.total || 0),
      Location.aggregate([
        { $group: { _id: null, total: { $sum: '$currentWeightKg' } } }
      ]).then(result => result[0]?.total || 0)
    ]);

    stats = {
      total: totalLocations,
      occupied: occupiedLocations,
      available: totalLocations - occupiedLocations,
      nearCapacity: nearCapacityLocations,
      occupancyRate: totalLocations > 0 ? Math.round((occupiedLocations / totalLocations) * 100) : 0,
      capacityUtilization: totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0,
      totalCapacityKg: totalCapacity,
      usedCapacityKg: usedCapacity,
      availableCapacityKg: totalCapacity - usedCapacity
    };
  }

  res.status(200).json({
    success: true,
    data: {
      stats,
      timestamp: new Date()
    }
  });
});

module.exports = {
  getLocations,
  getLocationsByChamber,
  getAvailableLocations,
  getLocation,
  updateLocation,
  getLocationStats,
  // Novos endpoints que expõem funcionalidades do service
  generateLocations,
  validateLocationCapacity,
  getOccupancyAnalysis,
  getAdjacentLocations
}; 