/**
 * Controller de Movimentações
 * Objetivos: Sistema completo de auditoria e histórico de movimentações
 * Funcionalidades: Listagem, histórico por produto/localização, movimentações manuais
 * Baseado no planejamento: /api/movements com consultas avançadas e auditoria
 * 
 * REESTRUTURADO: Agora usa movementService para funcionalidades avançadas
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const Movement = require('../models/Movement');
const Product = require('../models/Product');
const Location = require('../models/Location');
const movementService = require('../services/movementService');

/**
 * @desc    Listar movimentações (paginado, com filtros)
 * @route   GET /api/movements
 * @access  Private (All authenticated users)
 */
const getMovements = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = '-timestamp',
    type,
    status,
    productId,
    locationId,
    userId,
    isAutomatic,
    verified,
    startDate,
    endDate,
    batchId,
    search
  } = req.query;

  // 1. Construir filtros
  const filter = {};
  
  if (type) {
    filter.type = type;
  }
  
  if (status) {
    filter.status = status;
  }
  
  if (productId) {
    filter.productId = productId;
  }
  
  if (locationId) {
    filter.$or = [
      { fromLocationId: locationId },
      { toLocationId: locationId }
    ];
  }
  
  if (userId) {
    filter.userId = userId;
  }
  
  if (isAutomatic !== undefined) {
    filter['metadata.isAutomatic'] = isAutomatic === 'true';
  }
  
  if (verified !== undefined) {
    filter['verification.isVerified'] = verified === 'true';
  }
  
  if (batchId) {
    filter['metadata.batchId'] = batchId;
  }
  
  // Filtro por período
  if (startDate || endDate) {
    filter.timestamp = {};
    if (startDate) filter.timestamp.$gte = new Date(startDate);
    if (endDate) filter.timestamp.$lte = new Date(endDate);
  }
  
  // Busca textual
  if (search) {
    // Buscar em notas, motivo, ou dados do produto
    filter.$or = [
      { reason: { $regex: search, $options: 'i' } },
      { notes: { $regex: search, $options: 'i' } }
    ];
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
  const [movements, total] = await Promise.all([
    Movement.find(filter)
      .populate('productId', 'name lot storageType')
      .populate('userId', 'name email')
      .populate('fromLocationId', 'code coordinates')
      .populate('toLocationId', 'code coordinates')
      .populate({
        path: 'fromLocationId',
        populate: {
          path: 'chamberId',
          select: 'name'
        }
      })
      .populate({
        path: 'toLocationId',
        populate: {
          path: 'chamberId',
          select: 'name'
        }
      })
      .populate('verification.verifiedBy', 'name email')
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .lean(),
    Movement.countDocuments(filter)
  ]);

  // 4. Adicionar campos virtuais manualmente para lean()
  const movementsWithVirtuals = movements.map(movement => {
    // Calcular tempo desde a movimentação
    const now = new Date();
    const diffMs = now - new Date(movement.timestamp);
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let timeSinceMovement;
    if (diffDays > 0) timeSinceMovement = `${diffDays} dias atrás`;
    else if (diffHours > 0) timeSinceMovement = `${diffHours} horas atrás`;
    else if (diffMinutes > 0) timeSinceMovement = `${diffMinutes} minutos atrás`;
    else timeSinceMovement = 'Agora';

    // Descrição do tipo
    const typeDescriptions = {
      'entry': 'Entrada',
      'exit': 'Saída',
      'transfer': 'Transferência',
      'adjustment': 'Ajuste'
    };
    const typeDescription = typeDescriptions[movement.type] || movement.type;

    // Descrição completa
    let description;
    switch (movement.type) {
      case 'entry':
        description = `${typeDescription} de ${movement.quantity} unidades (${movement.weight}kg)`;
        break;
      case 'exit':
        description = `${typeDescription} de ${movement.quantity} unidades (${movement.weight}kg)`;
        break;
      case 'transfer':
        description = `${typeDescription} de ${movement.quantity} unidades (${movement.weight}kg)`;
        break;
      case 'adjustment':
        description = `${typeDescription} para ${movement.quantity} unidades (${movement.weight}kg)`;
        break;
      default:
        description = `${typeDescription}: ${movement.quantity} unidades (${movement.weight}kg)`;
    }

    return {
      ...movement,
      timeSinceMovement,
      typeDescription,
      description
    };
  });

  // 5. Calcular informações de paginação
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 6. Estatísticas rápidas (se não há muitos filtros)
  let stats = null;
  if (!search && Object.keys(filter).length <= 2) {
    const statsFilter = { ...filter };
    delete statsFilter.timestamp; // Remove filtro de data para stats gerais
    
    const statsPromises = [
      Movement.countDocuments({ ...statsFilter, type: 'entry' }),
      Movement.countDocuments({ ...statsFilter, type: 'exit' }),
      Movement.countDocuments({ ...statsFilter, type: 'transfer' }),
      Movement.countDocuments({ ...statsFilter, type: 'adjustment' }),
      Movement.countDocuments({ ...statsFilter, 'metadata.isAutomatic': true }),
      Movement.countDocuments({ ...statsFilter, 'metadata.isAutomatic': false })
    ];

    const [entries, exits, transfers, adjustments, automatic, manual] = await Promise.all(statsPromises);

    stats = {
      byType: {
        entries,
        exits,
        transfers,
        adjustments
      },
      byAutomation: {
        automatic,
        manual,
        automationRate: Math.round((automatic / (automatic + manual)) * 100) || 0
      },
      total: entries + exits + transfers + adjustments
    };
  }

  // 7. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      movements: movementsWithVirtuals,
      pagination: {
        currentPage: parseInt(page),
        totalPages,
        totalItems: total,
        itemsPerPage: parseInt(limit),
        hasNextPage,
        hasPrevPage
      },
      stats
    }
  });
});

/**
 * @desc    Histórico por produto
 * @route   GET /api/movements/product/:productId
 * @access  Private (All authenticated users)
 */
const getMovementsByProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { limit = 50 } = req.query;

  // Buscar produto para validação (opcional - se não existir, retornar array vazio)
  const product = await Product.findById(productId);
  
  // Se produto não existe, retornar array vazio (comportamento mais amigável para API)
  if (!product) {
    return res.status(200).json({
      success: true,
      data: {
        product: null,
        movements: [],
        total: 0
      }
    });
  }

  // Buscar movimentações do produto
  const movements = await Movement.find({ productId })
    .populate('userId', 'name email')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      product: {
        id: product._id,
        name: product.name,
        lot: product.lot,
        status: product.status
      },
      movements,
      total: movements.length
    }
  });
});

/**
 * @desc    Histórico por localização
 * @route   GET /api/movements/location/:locationId
 * @access  Private (All authenticated users)
 */
const getMovementsByLocation = asyncHandler(async (req, res, next) => {
  const { locationId } = req.params;
  const { limit = 50 } = req.query;

  // Buscar localização para validação
  const location = await Location.findById(locationId).populate('chamberId', 'name');
  if (!location) {
    return next(new AppError('Localização não encontrada', 404));
  }

  // Buscar movimentações da localização
  const movements = await Movement.find({
    $or: [
      { fromLocationId: locationId },
      { toLocationId: locationId }
    ]
  })
    .populate('productId', 'name lot')
    .populate('userId', 'name email')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates')
    .sort({ timestamp: -1 })
    .limit(parseInt(limit));

  res.status(200).json({
    success: true,
    data: {
      location: {
        id: location._id,
        code: location.code,
        coordinates: location.coordinates,
        chamber: location.chamberId
      },
      movements,
      total: movements.length
    }
  });
});

/**
 * @desc    Registrar movimentação manual
 * @route   POST /api/movements/manual
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Usa movementService.registerManualMovement()
 */
const registerManualMovement = asyncHandler(async (req, res, next) => {
  try {
    const result = await movementService.registerManualMovement(
      req.body, 
      req.user._id,
      { 
        generateAnalysis: true,
        detectAnomalies: true,
        captureMetadata: true,
        requestMetadata: {
          ip: req.ip,
          userAgent: req.get('User-Agent'),
          sessionId: req.headers['x-session-id']
        }
      }
    );
    
    res.status(201).json({
      success: true,
      message: 'Movimentação registrada com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Análise de padrões de movimentação
 * @route   GET /api/movements/patterns
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Usa movementService.analyzeMovementPatterns()
 */
const getMovementPatterns = asyncHandler(async (req, res, next) => {
  try {
    const result = await movementService.analyzeMovementPatterns(
      req.query,
      { 
        includeHourlyPatterns: req.query.includeHourly !== 'false',
        includeUserPatterns: req.query.includeUsers !== 'false',
        includeLocationPatterns: req.query.includeLocations !== 'false',
        includeAnomalies: req.query.includeAnomalies === 'true'
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
 * @desc    Relatório de auditoria
 * @route   GET /api/movements/audit
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Usa movementService.generateAuditReport()
 */
const getAuditReport = asyncHandler(async (req, res, next) => {
  try {
    const result = await movementService.generateAuditReport(
      req.query,
      {
        includeRiskAnalysis: req.query.includeRisks !== 'false',
        includeUserPatterns: req.query.includeUsers !== 'false',
        includeTimeAnalysis: req.query.includeTime !== 'false'
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
 * @desc    Histórico detalhado de produto
 * @route   GET /api/movements/product/:id/detailed-history
 * @access  Private (All authenticated users)
 * 
 * NOVO ENDPOINT: Usa movementService.analyzeProductHistory()
 */
const getProductDetailedHistory = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  try {
    const result = await movementService.analyzeProductHistory(id, {
      includeLocationJourney: req.query.includeJourney !== 'false',
      includeWeightEvolution: req.query.includeWeight !== 'false',
      includeUserActivity: req.query.includeUsers !== 'false',
      detectAnomalies: req.query.detectAnomalies === 'true'
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
 * @desc    Verificar movimentações pendentes
 * @route   POST /api/movements/verify-pending
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Usa movementService.verifyPendingMovements()
 */
const verifyPendingMovements = asyncHandler(async (req, res, next) => {
  try {
    const result = await movementService.verifyPendingMovements({
      includeConfidenceAnalysis: true,
      prioritizeByUrgency: true,
      includeRecommendations: true,
      ...req.body
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
 * @desc    Registrar movimentação simples (compatibilidade)
 * @route   POST /api/movements
 * @access  Private (Admin/Operator)
 */
const createMovement = asyncHandler(async (req, res, next) => {
  const {
    type,
    productId,
    fromLocationId,
    toLocationId,
    quantity,
    weight,
    reason,
    notes
  } = req.body;

  // Validações básicas
  if (!type || !productId || !quantity || !weight) {
    return next(new AppError('Tipo, produto, quantidade e peso são obrigatórios', 400));
  }

  // Verificar se produto existe
  const product = await Product.findById(productId);
  if (!product) {
    return next(new AppError('Produto não encontrado', 404));
  }

  // Criar movimentação
  const movementData = {
    type,
    productId,
    fromLocationId,
    toLocationId,
    quantity,
    weight,
    reason: reason || 'Movimentação manual',
    notes: notes || '',
    userId: req.user._id,
    timestamp: new Date(),
    status: 'completed',
    metadata: {
      isAutomatic: false
    }
  };

  const movement = await Movement.create(movementData);

  // Buscar movimentação completa
  const fullMovement = await Movement.findById(movement._id)
    .populate('productId', 'name lot')
    .populate('userId', 'name email')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates');

  res.status(201).json({
    success: true,
    message: 'Movimentação registrada com sucesso',
    data: {
      movement: fullMovement
    }
  });
});

module.exports = {
  getMovements,
  getMovementsByProduct,
  getMovementsByLocation,
  createMovement,
  // Novos endpoints que expõem funcionalidades do service
  registerManualMovement,
  getMovementPatterns,
  getAuditReport,
  getProductDetailedHistory,
  verifyPendingMovements
}; 