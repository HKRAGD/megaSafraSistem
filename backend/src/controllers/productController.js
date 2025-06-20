/**
 * Controller de Produtos
 * Objetivos: Controller crítico com regras de negócio principais do sistema
 * Regras: Uma localização = Um produto, Movimentações automáticas, Validação de capacidade
 * Baseado no planejamento: /api/products com CRUD completo e movimentação
 * 
 * REESTRUTURADO: Agora usa productService para centralizar lógica de negócio
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const Product = require('../models/Product');
const Location = require('../models/Location');
const SeedType = require('../models/SeedType');
const productService = require('../services/productService');

/**
 * @desc    Listar produtos (paginado, com filtros)
 * @route   GET /api/products
 * @access  Private (All authenticated users)
 */
const getProducts = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    search,
    status,
    seedTypeId,
    locationId,
    expirationStatus,
    qualityGrade,
    minWeight,
    maxWeight
  } = req.query;

  // 1. Construir filtros
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { lot: { $regex: search, $options: 'i' } },
      { 'tracking.supplier': { $regex: search, $options: 'i' } },
      { 'tracking.origin': { $regex: search, $options: 'i' } }
    ];
  }
  
  if (status) {
    filter.status = status;
  }
  
  if (seedTypeId) {
    filter.seedTypeId = seedTypeId;
  }
  
  if (locationId) {
    filter.locationId = locationId;
  }
  
  if (qualityGrade) {
    filter['tracking.qualityGrade'] = qualityGrade;
  }
  
  if (minWeight || maxWeight) {
    filter.totalWeight = {};
    if (minWeight) filter.totalWeight.$gte = parseFloat(minWeight);
    if (maxWeight) filter.totalWeight.$lte = parseFloat(maxWeight);
  }

  // Filtro especial por status de expiração
  if (expirationStatus) {
    const now = new Date();
    switch (expirationStatus) {
      case 'expired':
        filter.expirationDate = { $lt: now };
        break;
      case 'critical':
        const criticalDate = new Date(now.getTime() + (7 * 24 * 60 * 60 * 1000));
        filter.expirationDate = { $gte: now, $lte: criticalDate };
        break;
      case 'warning':
        const warningDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        filter.expirationDate = { $gte: now, $lte: warningDate };
        break;
      case 'good':
        const goodDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        filter.expirationDate = { $gt: goodDate };
        break;
    }
  }

  // 2. Configurar paginação e ordenação com priorização
  const skip = (page - 1) * limit;
  
  // PRIORIZAÇÃO: AGUARDANDO_LOCACAO e AGUARDANDO_RETIRADA sempre primeiro
  const sortPipeline = [
    {
      $addFields: {
        // Criar campo de prioridade baseado no status
        statusPriority: {
          $switch: {
            branches: [
              { case: { $eq: ["$status", "AGUARDANDO_LOCACAO"] }, then: 1 },
              { case: { $eq: ["$status", "AGUARDANDO_RETIRADA"] }, then: 2 }
            ],
            default: 99 // Todos os outros status têm prioridade baixa
          }
        }
      }
    },
    {
      $sort: {
        statusPriority: 1, // Prioridade primeiro (1 = AGUARDANDO_LOCACAO, 2 = AGUARDANDO_RETIRADA, 99 = outros)
        // Ordenação secundária baseada no parâmetro sort
        ...(sort.startsWith('-') 
          ? { [sort.substring(1)]: -1 }
          : { [sort]: 1 }
        )
      }
    }
  ];

  // 3. Executar consulta com agregação para priorização
  const [productsResult, total] = await Promise.all([
    Product.aggregate([
      { $match: filter },
      ...sortPipeline,
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'seedtypes',
          localField: 'seedTypeId',
          foreignField: '_id',
          as: 'seedType',
          pipeline: [{ $project: { name: 1, optimalTemperature: 1, optimalHumidity: 1, maxStorageTimeDays: 1 } }]
        }
      },
      {
        $lookup: {
          from: 'locations',
          localField: 'locationId',
          foreignField: '_id',
          as: 'location',
          pipeline: [
            { $project: { code: 1, coordinates: 1, chamberId: 1 } },
            {
              $lookup: {
                from: 'chambers',
                localField: 'chamberId',
                foreignField: '_id',
                as: 'chamber',
                pipeline: [{ $project: { name: 1, status: 1 } }]
              }
            }
          ]
        }
      },
      {
        $addFields: {
          seedTypeId: { $arrayElemAt: ['$seedType', 0] },
          locationId: { $arrayElemAt: ['$location', 0] }
        }
      },
      {
        $project: {
          statusPriority: 0, // Remover campo temporário
          seedType: 0,
          location: 0
        }
      }
    ]),
    Product.countDocuments(filter)
  ]);

  // Ajustar estrutura para compatibilidade com população
  const products = productsResult.map(product => ({
    ...product,
    locationId: product.locationId ? {
      ...product.locationId,
      chamberId: product.locationId.chamber?.[0] || null
    } : null
  }));

  // 4. Adicionar campos virtuais manualmente para lean()
  const productsWithVirtuals = products.map(product => {
    const calculatedTotalWeight = product.quantity * product.weightPerUnit;
    
    // Calcular status de expiração
    let expirationStatusCalc = 'no-expiration';
    let isNearExpiration = false;
    let storageTimeDays = Math.floor((new Date() - new Date(product.entryDate)) / (1000 * 60 * 60 * 24));
    
    if (product.expirationDate) {
      const now = new Date();
      const daysUntilExpiration = Math.ceil((new Date(product.expirationDate) - now) / (1000 * 60 * 60 * 24));
      
      if (daysUntilExpiration < 0) expirationStatusCalc = 'expired';
      else if (daysUntilExpiration <= 7) expirationStatusCalc = 'critical';
      else if (daysUntilExpiration <= 30) expirationStatusCalc = 'warning';
      else expirationStatusCalc = 'good';
      
      isNearExpiration = daysUntilExpiration <= 30;
    }

    return {
      ...product,
      calculatedTotalWeight,
      expirationStatus: expirationStatusCalc,
      isNearExpiration,
      storageTimeDays
    };
  });

  // 5. Calcular informações de paginação
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;
  const hasPrevPage = page > 1;

  // 6. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      products: productsWithVirtuals,
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
 * @desc    Obter produto específico
 * @route   GET /api/products/:id
 * @access  Private (All authenticated users)
 */
const getProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  // 1. Buscar produto
  const product = await Product.findById(id)
    .populate('seedTypeId', 'name description optimalTemperature optimalHumidity maxStorageTimeDays')
    .populate('locationId', 'code coordinates maxCapacityKg currentWeightKg chamberId')
    .populate({
      path: 'locationId',
      populate: {
        path: 'chamberId',
        select: 'name status currentTemperature currentHumidity'
      }
    })
    .populate('metadata.createdBy', 'name email')
    .populate('metadata.lastModifiedBy', 'name email');

  if (!product) {
    return next(new AppError('Produto não encontrado', 404));
  }

  // 2. Buscar histórico de movimentações
  const Movement = require('../models/Movement');
  const movementHistory = await Movement.find({ productId: id })
    .populate('userId', 'name')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates')
    .sort({ timestamp: -1 })
    .limit(20);

  // 3. Verificar se há produtos similares (mesmo tipo de semente)
  const similarProducts = await Product.find({
    seedTypeId: product.seedTypeId._id,
    status: { $in: ['LOCADO', 'AGUARDANDO_RETIRADA'] },
    _id: { $ne: product._id }
  })
    .populate('locationId', 'code coordinates')
    .select('name lot totalWeight status locationId')
    .limit(5);

  // 4. Verificar condições ideais vs atuais
  let conditionsAnalysis = null;
  if (product.locationId?.chamberId && product.seedTypeId) {
    const chamber = product.locationId.chamberId;
    const seedType = product.seedTypeId;
    
    conditionsAnalysis = {
      temperature: {
        current: chamber.currentTemperature,
        optimal: seedType.optimalTemperature,
        status: chamber.currentTemperature === null ? 'unknown' :
                Math.abs(chamber.currentTemperature - (seedType.optimalTemperature || 0)) <= 2 ? 'good' : 'poor'
      },
      humidity: {
        current: chamber.currentHumidity,
        optimal: seedType.optimalHumidity,
        status: chamber.currentHumidity === null ? 'unknown' :
                Math.abs(chamber.currentHumidity - (seedType.optimalHumidity || 0)) <= 5 ? 'good' : 'poor'
      }
    };
  }

  // 5. Resposta de sucesso
  res.status(200).json({
    success: true,
    data: {
      product: {
        id: product._id,
        name: product.name,
        lot: product.lot,
        seedType: product.seedTypeId,
        quantity: product.quantity,
        storageType: product.storageType,
        weightPerUnit: product.weightPerUnit,
        totalWeight: product.totalWeight,
        calculatedTotalWeight: product.calculatedTotalWeight,
        location: product.locationId,
        entryDate: product.entryDate,
        expirationDate: product.expirationDate,
        expirationStatus: product.expirationStatus,
        isNearExpiration: product.isNearExpiration,
        storageTimeDays: product.storageTimeDays,
        status: product.status,
        notes: product.notes,
        tracking: product.tracking,
        metadata: product.metadata,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt
      },
      relatedData: {
        movementHistory,
        similarProducts,
        conditionsAnalysis
      }
    }
  });
});

/**
 * @desc    Cadastrar produto
 * @route   POST /api/products
 * @access  Private (Admin/Operator)
 * 
 * REESTRUTURADO: Usa productService.createProduct()
 */
const createProduct = asyncHandler(async (req, res, next) => {
  try {
    // Usar productService que implementa todas as regras críticas
    const result = await productService.createProduct(req.body, req.user._id, {
      autoFindLocation: false, // ADMIN não busca localização automaticamente - produto fica AGUARDANDO_LOCACAO
      validateSeedType: true,
      generateTrackingCode: true
    });
    
    res.status(201).json({
      success: true,
      message: 'Produto cadastrado com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Atualizar produto
 * @route   PUT /api/products/:id
 * @access  Private (Admin/Operator)
 */
const updateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const {
    name,
    quantity,
    weightPerUnit,
    notes,
    tracking,
    expirationDate
  } = req.body;

  // 1. Verificar se produto existe
  const product = await Product.findById(id).populate('locationId');
  
  if (!product) {
    return next(new AppError('Produto não encontrado', 404));
  }

  // 2. Verificar se produto pode ser editado
  if (product.status === 'REMOVIDO') {
    return next(new AppError('Produtos removidos não podem ser editados', 400));
  }

  // 3. Não permitir alterações em campos críticos
  if (req.body.seedTypeId || req.body.locationId || req.body.lot || req.body.storageType) {
    return next(new AppError('Não é possível alterar tipo de semente, localização, lote ou tipo de armazenamento. Use a funcionalidade de movimentação se necessário', 400));
  }

  // 4. Se alterando peso ou quantidade, validar capacidade
  let newTotalWeight = product.totalWeight;
  if (quantity !== undefined || weightPerUnit !== undefined) {
    const newQuantity = quantity !== undefined ? quantity : product.quantity;
    const newWeightPerUnit = weightPerUnit !== undefined ? weightPerUnit : product.weightPerUnit;
    newTotalWeight = newQuantity * newWeightPerUnit;

    const location = product.locationId;
    const weightDifference = newTotalWeight - product.totalWeight;

    if (weightDifference > 0 && !location.canAccommodateWeight(weightDifference)) {
      return next(new AppError(
        `Localização não tem capacidade para o aumento de peso. Disponível: ${location.availableCapacityKg}kg, Necessário: ${weightDifference}kg`,
        400
      ));
    }
  }

  // 5. Preparar dados para atualização
  const updateData = {
    metadata: {
      ...product.metadata,
      lastModifiedBy: req.user._id
    }
  };
  
  if (name) updateData.name = name.trim();
  if (quantity !== undefined) updateData.quantity = quantity;
  if (weightPerUnit !== undefined) updateData.weightPerUnit = weightPerUnit;
  if (notes !== undefined) updateData.notes = notes.trim();
  if (tracking !== undefined) {
    updateData.tracking = { ...product.tracking, ...tracking };
  }
  if (expirationDate !== undefined) updateData.expirationDate = expirationDate;

  // 6. Atualizar produto
  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    updateData,
    {
      new: true,
      runValidators: true
    }
  )
    .populate('seedTypeId', 'name')
    .populate('locationId', 'code coordinates')
    .populate({
      path: 'locationId',
      populate: {
        path: 'chamberId',
        select: 'name'
      }
    });

  // 7. Atualizar peso na localização se necessário
  if (newTotalWeight !== product.totalWeight) {
    const location = await Location.findById(product.locationId._id);
    const weightDifference = newTotalWeight - product.totalWeight;
    
    if (weightDifference > 0) {
      await location.addWeight(weightDifference);
    } else {
      await location.removeWeight(Math.abs(weightDifference));
    }
  }

  // 8. Resposta de sucesso
  res.status(200).json({
    success: true,
    message: 'Produto atualizado com sucesso',
    data: {
      product: {
        id: updatedProduct._id,
        name: updatedProduct.name,
        lot: updatedProduct.lot,
        seedType: updatedProduct.seedTypeId,
        quantity: updatedProduct.quantity,
        storageType: updatedProduct.storageType,
        weightPerUnit: updatedProduct.weightPerUnit,
        totalWeight: updatedProduct.totalWeight,
        location: updatedProduct.locationId,
        expirationDate: updatedProduct.expirationDate,
        status: updatedProduct.status,
        notes: updatedProduct.notes,
        tracking: updatedProduct.tracking,
        updatedAt: updatedProduct.updatedAt
      }
    }
  });
});

/**
 * @desc    Remover produto
 * @route   DELETE /api/products/:id
 * @access  Private (Admin/Operator)
 * 
 * REESTRUTURADO: Usa productService.removeProduct()
 */
const deleteProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason = 'Remoção manual' } = req.body;

  try {
    // Usar productService que implementa todas as regras de remoção
    const result = await productService.removeProduct(id, req.user._id, {
      reason,
      includeSpaceAnalysis: true
    });

    res.status(200).json({
      success: true,
      message: 'Produto removido com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Mover produto para nova localização
 * @route   POST /api/products/:id/move
 * @access  Private (Admin/Operator)
 * 
 * REESTRUTURADO: Usa productService.moveProduct()
 */
const moveProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { newLocationId, reason = 'Movimentação manual' } = req.body;

  try {
    // Usar productService que implementa análise de benefícios e validações
    const result = await productService.moveProduct(id, newLocationId, req.user._id, {
      reason,
      validateCapacity: true,
      analyzeOptimization: true
    });

    res.status(200).json({
      success: true,
      message: 'Produto movido com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Buscar localização ótima para produto
 * @route   POST /api/products/find-optimal-location
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Expõe funcionalidade do productService
 */
const findOptimalLocation = asyncHandler(async (req, res, next) => {
  const { quantity, weightPerUnit } = req.body;

  if (!quantity || !weightPerUnit) {
    return next(new AppError('Quantidade e peso por unidade são obrigatórios', 400));
  }

  try {
    const result = await productService.findOptimalLocation({ quantity, weightPerUnit });
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Validar dados de produto
 * @route   POST /api/products/validate-data
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Expõe funcionalidade do productService
 */
const validateProductData = asyncHandler(async (req, res, next) => {
  try {
    const result = await productService.validateProductData(req.body);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Análise de distribuição de produtos
 * @route   GET /api/products/distribution-analysis
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Expõe funcionalidade do productService
 */
const getDistributionAnalysis = asyncHandler(async (req, res, next) => {
  try {
    const result = await productService.analyzeProductDistribution({
      includeOptimizations: req.query.includeOptimizations === 'true'
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
 * @desc    Gerar código de rastreamento
 * @route   POST /api/products/generate-code
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Expõe funcionalidade do productService
 */
const generateProductCode = asyncHandler(async (req, res, next) => {
  try {
    const result = await productService.generateProductCode(req.body);
    
    res.status(200).json({
      success: true,
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Saída parcial ou total de produto
 * @route   POST /api/products/:id/partial-exit
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Permite retirar quantidade específica do estoque
 */
const partialExit = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { quantity, reason = 'Saída manual de estoque' } = req.body;

  if (!quantity || quantity <= 0) {
    return next(new AppError('Quantidade deve ser maior que zero', 400));
  }

  try {
    const result = await productService.partialExit(id, quantity, req.user._id, {
      reason,
      validateQuantity: true
    });

    res.status(200).json({
      success: true,
      message: 'Saída registrada com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Movimentação parcial de produto
 * @route   POST /api/products/:id/partial-move
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Move quantidade específica para nova localização
 */
const partialMove = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { quantity, newLocationId, reason = 'Movimentação parcial' } = req.body;

  if (!quantity || quantity <= 0) {
    return next(new AppError('Quantidade deve ser maior que zero', 400));
  }

  if (!newLocationId) {
    return next(new AppError('Nova localização é obrigatória', 400));
  }

  try {
    const result = await productService.partialMove(id, quantity, newLocationId, req.user._id, {
      reason,
      validateCapacity: true
    });

    res.status(200).json({
      success: true,
      message: 'Movimentação parcial realizada com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Adicionar estoque a produto existente
 * @route   POST /api/products/:id/add-stock
 * @access  Private (Admin/Operator)
 * 
 * NOVO ENDPOINT: Adiciona quantidade ao produto existente
 */
const addStock = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { quantity, reason = 'Adição de estoque', weightPerUnit } = req.body;

  if (!quantity || quantity <= 0) {
    return next(new AppError('Quantidade deve ser maior que zero', 400));
  }

  try {
    const result = await productService.addStock(id, quantity, req.user._id, {
      reason,
      validateCapacity: true,
      weightPerUnit
    });

    res.status(200).json({
      success: true,
      message: 'Estoque adicionado com sucesso',
      data: result.data
    });
  } catch (error) {
    return next(new AppError(error.message, 400));
  }
});

/**
 * @desc    Localizar produto aguardando locação
 * @route   POST /api/products/:id/locate
 * @access  Private (OPERATOR only)
 */
const locateProduct = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { locationId, reason } = req.body;

  if (!locationId) {
    return next(new AppError('ID da localização é obrigatório', 400));
  }

  const result = await productService.locateProduct(
    id, 
    locationId, 
    req.user._id,
    { reason: reason || 'Localização de produto', validateCapacity: true }
  );

  res.status(200).json({
    success: true,
    message: 'Produto localizado com sucesso',
    data: result.data
  });
});

/**
 * @desc    Solicitar retirada de produto
 * @route   POST /api/products/:id/request-withdrawal
 * @access  Private (ADMIN only)
 */
const requestWithdrawal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { type = 'TOTAL', quantity, reason } = req.body;

  if (!['TOTAL', 'PARCIAL'].includes(type)) {
    return next(new AppError('Tipo deve ser TOTAL ou PARCIAL', 400));
  }

  if (type === 'PARCIAL' && (!quantity || quantity <= 0)) {
    return next(new AppError('Quantidade é obrigatória para retirada parcial', 400));
  }

  const result = await productService.requestProductWithdrawal(
    id, 
    req.user._id,
    { 
      reason: reason || 'Solicitação de retirada', 
      type, 
      quantity: type === 'PARCIAL' ? quantity : null 
    }
  );

  res.status(200).json({
    success: true,
    message: 'Solicitação de retirada criada com sucesso',
    data: result.data
  });
});

/**
 * @desc    Buscar produtos aguardando locação
 * @route   GET /api/products/pending-location
 * @access  Private (OPERATOR only)
 */
const getProductsPendingLocation = asyncHandler(async (req, res, next) => {
  const result = await productService.getProductsPendingLocation();

  res.status(200).json({
    success: true,
    data: result.data
  });
});

/**
 * @desc    Buscar produtos aguardando retirada
 * @route   GET /api/products/pending-withdrawal
 * @access  Private (ADMIN/OPERATOR)
 */
const getProductsPendingWithdrawal = asyncHandler(async (req, res, next) => {
  const result = await productService.getProductsPendingWithdrawal();

  res.status(200).json({
    success: true,
    data: result.data
  });
});

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  moveProduct,
  // Novos endpoints que expõem funcionalidades do service
  findOptimalLocation,
  validateProductData,
  getDistributionAnalysis,
  generateProductCode,
  // Novos endpoints de movimentação avançada
  partialExit,
  partialMove,
  addStock,
  // Novos endpoints FSM
  locateProduct,
  requestWithdrawal,
  getProductsPendingLocation,
  getProductsPendingWithdrawal
}; 