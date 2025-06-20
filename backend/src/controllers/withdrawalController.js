/**
 * Controller de Solicitações de Retirada
 * Objetivos: Gerenciar fluxo completo de solicitações conforme FSM
 * Regras: ADMIN solicita, OPERATOR confirma, auditoria completa
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const withdrawalService = require('../services/withdrawalService');
const WithdrawalRequest = require('../models/WithdrawalRequest');

/**
 * @desc    Criar solicitação de retirada
 * @route   POST /api/withdrawal-requests
 * @access  Private (ADMIN only)
 */
const createWithdrawalRequest = asyncHandler(async (req, res, next) => {
  const { productId, type, quantityRequested, reason } = req.body;

  // Validações básicas
  if (!productId) {
    return next(new AppError('ID do produto é obrigatório', 400));
  }

  if (!type || !['TOTAL', 'PARCIAL'].includes(type)) {
    return next(new AppError('Tipo de retirada deve ser TOTAL ou PARCIAL', 400));
  }

  if (type === 'PARCIAL' && (!quantityRequested || quantityRequested <= 0)) {
    return next(new AppError('Quantidade é obrigatória para retirada parcial', 400));
  }

  const requestData = {
    productId,
    type,
    quantityRequested: type === 'PARCIAL' ? quantityRequested : null,
    reason: reason || 'Solicitação de retirada'
  };

  const result = await withdrawalService.createWithdrawalRequest(
    requestData, 
    req.user._id,
    { validateUser: true, createMovementLog: true }
  );

  res.status(201).json({
    success: true,
    message: 'Solicitação de retirada criada com sucesso',
    data: result.data
  });
});

/**
 * @desc    Confirmar solicitação de retirada
 * @route   PATCH /api/withdrawal-requests/:id/confirm
 * @access  Private (OPERATOR only)
 */
const confirmWithdrawalRequest = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { notes } = req.body;

  if (!id) {
    return next(new AppError('ID da solicitação é obrigatório', 400));
  }

  const result = await withdrawalService.confirmWithdrawalRequest(
    id, 
    req.user._id,
    { 
      notes: notes || '',
      validateUser: true, 
      createMovementLog: true, 
      freeLocation: true 
    }
  );

  res.status(200).json({
    success: true,
    message: 'Retirada confirmada com sucesso',
    data: result.data
  });
});

/**
 * @desc    Cancelar solicitação de retirada
 * @route   PATCH /api/withdrawal-requests/:id/cancel
 * @access  Private (ADMIN only)
 */
const cancelWithdrawalRequest = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!id) {
    return next(new AppError('ID da solicitação é obrigatório', 400));
  }

  const result = await withdrawalService.cancelWithdrawalRequest(
    id, 
    req.user._id,
    { 
      reason: reason || 'Cancelamento de solicitação',
      validateUser: true, 
      createMovementLog: true 
    }
  );

  res.status(200).json({
    success: true,
    message: 'Solicitação cancelada com sucesso',
    data: result.data
  });
});

/**
 * @desc    Buscar solicitações pendentes
 * @route   GET /api/withdrawal-requests/pending
 * @access  Private (ADMIN/OPERATOR)
 */
const getPendingWithdrawals = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sortBy = 'requestedAt',
    sortOrder = 'desc',
    productId,
    type
  } = req.query;

  const filters = {
    page: parseInt(page),
    limit: parseInt(limit),
    sortBy,
    sortOrder,
    productId,
    type
  };

  const result = await withdrawalService.getPendingWithdrawals(filters);

  res.status(200).json({
    success: true,
    data: result.data
  });
});

/**
 * @desc    Buscar todas as solicitações (paginado)
 * @route   GET /api/withdrawal-requests
 * @access  Private (ADMIN/OPERATOR)
 */
const getWithdrawals = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = '-requestedAt',
    status,
    type,
    productId,
    requestedBy
  } = req.query;

  // Construir filtros
  const filter = {};
  
  if (status) {
    filter.status = status;
  }
  
  if (type) {
    filter.type = type;
  }
  
  if (productId) {
    filter.productId = productId;
  }
  
  if (requestedBy) {
    filter.requestedBy = requestedBy;
  }

  // Configurar paginação
  const skip = (page - 1) * limit;
  const sortObj = {};
  
  // Parse do sort
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const withdrawals = await WithdrawalRequest.find(filter)
    .populate({
      path: 'productId',
      populate: [
        {
          path: 'seedTypeId',
          select: 'name'
        },
        {
          path: 'locationId',
          select: 'code coordinates chamberId',
          populate: {
            path: 'chamberId',
            select: 'name'
          }
        }
      ]
    })
    .populate('requestedBy', 'name email role')
    .populate('confirmedBy', 'name email role')
    .populate('canceledBy', 'name email role')
    .sort(sortObj)
    .skip(skip)
    .limit(parseInt(limit));

  const total = await WithdrawalRequest.countDocuments(filter);

  res.status(200).json({
    success: true,
    data: {
      withdrawals,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    }
  });
});

/**
 * @desc    Buscar solicitação específica
 * @route   GET /api/withdrawal-requests/:id
 * @access  Private (ADMIN/OPERATOR)
 */
const getWithdrawal = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const withdrawal = await WithdrawalRequest.findById(id)
    .populate({
      path: 'productId',
      populate: [
        {
          path: 'seedTypeId',
          select: 'name optimalTemperature optimalHumidity'
        },
        {
          path: 'locationId',
          select: 'code coordinates chamberId',
          populate: {
            path: 'chamberId',
            select: 'name'
          }
        }
      ]
    })
    .populate('requestedBy', 'name email role')
    .populate('confirmedBy', 'name email role')
    .populate('canceledBy', 'name email role');

  if (!withdrawal) {
    return next(new AppError('Solicitação de retirada não encontrada', 404));
  }

  res.status(200).json({
    success: true,
    data: { withdrawal }
  });
});

/**
 * @desc    Buscar solicitações por produto
 * @route   GET /api/withdrawal-requests/product/:productId
 * @access  Private (ADMIN/OPERATOR)
 */
const getWithdrawalsByProduct = asyncHandler(async (req, res, next) => {
  const { productId } = req.params;
  const { includeCompleted = true, includeCanceled = true } = req.query;

  const result = await withdrawalService.getWithdrawalsByProduct(
    productId,
    { 
      includeCompleted: includeCompleted === 'true', 
      includeCanceled: includeCanceled === 'true' 
    }
  );

  res.status(200).json({
    success: true,
    data: result.data
  });
});

/**
 * @desc    Buscar minhas solicitações
 * @route   GET /api/withdrawal-requests/my-requests
 * @access  Private (Authenticated user)
 */
const getMyWithdrawals = asyncHandler(async (req, res, next) => {
  const { 
    role = 'requested', // 'requested' | 'confirmed' | 'canceled'
    page = 1,
    limit = 20 
  } = req.query;

  const result = await withdrawalService.getWithdrawalsByUser(
    req.user._id,
    { 
      role, 
      page: parseInt(page), 
      limit: parseInt(limit) 
    }
  );

  res.status(200).json({
    success: true,
    data: result.data
  });
});

/**
 * @desc    Buscar estatísticas de solicitações
 * @route   GET /api/withdrawal-requests/stats
 * @access  Private (ADMIN only)
 */
const getWithdrawalsStats = asyncHandler(async (req, res, next) => {
  const result = await withdrawalService.getWithdrawalsStats();

  res.status(200).json({
    success: true,
    data: result.data
  });
});

/**
 * @desc    Gerar relatório de solicitações
 * @route   GET /api/withdrawal-requests/report
 * @access  Private (ADMIN only)
 */
const getWithdrawalsReport = asyncHandler(async (req, res, next) => {
  const {
    startDate,
    endDate,
    includeStats = true,
    includeByType = true,
    includeByStatus = true
  } = req.query;

  const filters = {
    startDate,
    endDate,
    includeStats: includeStats === 'true',
    includeByType: includeByType === 'true',
    includeByStatus: includeByStatus === 'true'
  };

  const result = await withdrawalService.getWithdrawalsReport(filters);

  res.status(200).json({
    success: true,
    data: result.data
  });
});

/**
 * @desc    Atualizar solicitação (apenas se PENDENTE)
 * @route   PUT /api/withdrawal-requests/:id
 * @access  Private (ADMIN only)
 */
const updateWithdrawalRequest = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { type, quantityRequested, reason } = req.body;

  // Buscar solicitação
  const withdrawal = await WithdrawalRequest.findById(id);
  
  if (!withdrawal) {
    return next(new AppError('Solicitação de retirada não encontrada', 404));
  }

  if (withdrawal.status !== 'PENDENTE') {
    return next(new AppError('Apenas solicitações pendentes podem ser editadas', 400));
  }

  // Verificar se é o mesmo usuário que criou
  if (withdrawal.requestedBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Você só pode editar suas próprias solicitações', 403));
  }

  // Atualizar campos permitidos
  const updateData = {};
  
  if (type && ['TOTAL', 'PARCIAL'].includes(type)) {
    updateData.type = type;
  }
  
  if (type === 'PARCIAL' && quantityRequested && quantityRequested > 0) {
    updateData.quantityRequested = quantityRequested;
  } else if (type === 'TOTAL') {
    updateData.quantityRequested = null;
  }
  
  if (reason) {
    updateData.reason = reason;
  }

  const updatedWithdrawal = await WithdrawalRequest.findByIdAndUpdate(
    id,
    updateData,
    { new: true, runValidators: true }
  ).populate('productId', 'name lot quantity totalWeight')
   .populate('requestedBy', 'name email role');

  res.status(200).json({
    success: true,
    message: 'Solicitação atualizada com sucesso',
    data: { withdrawal: updatedWithdrawal }
  });
});

module.exports = {
  createWithdrawalRequest,
  confirmWithdrawalRequest,
  cancelWithdrawalRequest,
  getPendingWithdrawals,
  getWithdrawals,
  getWithdrawal,
  getWithdrawalsByProduct,
  getMyWithdrawals,
  getWithdrawalsStats,
  getWithdrawalsReport,
  updateWithdrawalRequest
};