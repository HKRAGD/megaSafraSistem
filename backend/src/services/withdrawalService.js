/**
 * WithdrawalService - Lógica de Negócio para Solicitações de Retirada
 * Objetivos: Gerenciar fluxo completo de solicitações de retirada conforme FSM
 * Funcionalidades: Criação, confirmação, cancelamento, relatórios
 * Regras: Apenas ADMIN solicita, apenas OPERATOR confirma, auditoria completa
 * ATUALIZADO: Transações atômicas e optimistic locking implementados
 */

const mongoose = require('mongoose');
const WithdrawalRequest = require('../models/WithdrawalRequest');
const Product = require('../models/Product');
const User = require('../models/User');
const Location = require('../models/Location');
const Movement = require('../models/Movement');
const { WITHDRAWAL_STATUS, WITHDRAWAL_TYPE, PRODUCT_STATUS, MOVEMENT_TYPE } = require('../utils/constants');

/**
 * Criar solicitação de retirada (ADMIN)
 * @param {Object} requestData - Dados da solicitação
 * @param {String} userId - ID do usuário solicitante (ADMIN)
 * @param {Object} options - Opções da solicitação
 * @returns {Object} Solicitação criada
 */
const createWithdrawalRequest = async (requestData, userId, options = {}) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { 
      validateUser = true,
      createMovementLog = true,
      sendNotification = false 
    } = options;

    // 1. Validar usuário se solicitado
    if (validateUser) {
      const user = await User.findById(userId);
      if (!user || !user.canRequestWithdrawal()) {
        throw new Error('Apenas administradores podem solicitar retiradas');
      }
    }

    // 2. Buscar e validar produto
    const product = await Product.findById(requestData.productId)
      .populate('seedTypeId', 'name')
      .populate('locationId', 'code coordinates')
      .session(session);

    if (!product) {
      throw new Error('Produto não encontrado');
    }

    if (product.status !== PRODUCT_STATUS.LOCADO) {
      throw new Error('Apenas produtos locados podem ter retirada solicitada');
    }

    // 3. Validar quantidade para retirada parcial
    if (requestData.type === WITHDRAWAL_TYPE.PARCIAL) {
      if (!requestData.quantityRequested || requestData.quantityRequested <= 0) {
        throw new Error('Quantidade solicitada é obrigatória para retirada parcial');
      }
      
      if (requestData.quantityRequested >= product.quantity) {
        throw new Error('Quantidade para retirada parcial deve ser menor que a quantidade total');
      }
    }

    // 4. Atualizar produto para AGUARDANDO_RETIRADA (com optimistic locking)
    const currentVersion = product.version;
    const updatedProduct = await Product.findOneAndUpdate(
      { _id: product._id, version: currentVersion },
      { 
        $set: { 
          status: PRODUCT_STATUS.AGUARDANDO_RETIRADA,
          'metadata.lastModifiedBy': userId,
          'metadata.lastMovementDate': new Date()
        },
        $inc: { version: 1 }
      },
      { session, new: true }
    );

    if (!updatedProduct) {
      throw new Error('Produto foi modificado por outro usuário. Tente novamente.');
    }

    // 5. Criar solicitação
    const withdrawalData = {
      ...requestData,
      requestedBy: userId,
      status: WITHDRAWAL_STATUS.PENDENTE
    };

    const [withdrawalRequest] = await WithdrawalRequest.create([withdrawalData], { session });

    // 6. Criar log de movimento se solicitado
    if (createMovementLog) {
      const movementData = {
        productId: product._id,
        type: MOVEMENT_TYPE.ADJUSTMENT,
        toLocationId: product.locationId,
        quantity: product.quantity,
        weight: product.totalWeight,
        userId: userId,
        reason: `Solicitação de retirada criada: ${withdrawalRequest._id}`,
        notes: `Tipo: ${requestData.type}${requestData.type === WITHDRAWAL_TYPE.PARCIAL ? `, Quantidade: ${requestData.quantityRequested}` : ''}`,
        metadata: {
          isAutomatic: true,
          withdrawalRequestId: withdrawalRequest._id,
          withdrawalType: requestData.type
        }
      };

      await Movement.create([movementData], { session });
    }

    await session.commitTransaction();

    // 7. Buscar solicitação completa
    const fullWithdrawalRequest = await WithdrawalRequest.findById(withdrawalRequest._id)
      .populate({
        path: 'productId',
        select: 'name lot quantity totalWeight status locationId',
        populate: {
          path: 'locationId',
          select: 'code coordinates chamberId',
          populate: {
            path: 'chamberId',
            select: 'name'
          }
        }
      })
      .populate('requestedBy', 'name email role');

    return {
      success: true,
      data: {
        withdrawalRequest: fullWithdrawalRequest,
        operation: {
          type: 'create_withdrawal_request',
          productStatus: PRODUCT_STATUS.AGUARDANDO_RETIRADA,
          withdrawalType: requestData.type,
          createdAt: withdrawalRequest.requestedAt
        }
      }
    };

  } catch (error) {
    await session.abortTransaction();
    
    // Tratamento específico de optimistic locking
    if (error.name === 'VersionError' || error.message.includes('version')) {
      throw new Error('Produto foi modificado por outro usuário. Tente novamente.');
    }
    
    throw new Error(`Erro ao criar solicitação de retirada: ${error.message}`);
  } finally {
    session.endSession();
  }
};

/**
 * Confirmar solicitação de retirada (OPERATOR)
 * @param {String} withdrawalRequestId - ID da solicitação
 * @param {String} userId - ID do usuário confirmador (OPERATOR)
 * @param {Object} options - Opções da confirmação
 * @returns {Object} Resultado da confirmação
 */
const confirmWithdrawalRequest = async (withdrawalRequestId, userId, options = {}) => {
  try {
    const { 
      notes = '',
      validateUser = true,
      createMovementLog = true,
      freeLocation = true 
    } = options;

    // 1. Validar usuário se solicitado
    if (validateUser) {
      const user = await User.findById(userId);
      if (!user || !user.canConfirmWithdrawal()) {
        throw new Error('Apenas operadores podem confirmar retiradas');
      }
    }

    // 2. Buscar solicitação
    const withdrawalRequest = await WithdrawalRequest.findById(withdrawalRequestId)
      .populate({
        path: 'productId',
        populate: {
          path: 'locationId',
          select: 'code coordinates _id chamberId',
          populate: {
            path: 'chamberId',
            select: 'name'
          }
        }
      })
      .populate('requestedBy', 'name email');

    if (!withdrawalRequest) {
      throw new Error('Solicitação de retirada não encontrada');
    }

    // 3. Confirmar usando método do modelo
    await withdrawalRequest.confirm(userId, notes);

    // 4. Liberar localização se solicitado
    if (freeLocation && withdrawalRequest.productId.locationId) {
      await Location.findByIdAndUpdate(withdrawalRequest.productId.locationId._id, {
        isOccupied: false,
        currentWeightKg: 0
      });
    }

    // 5. Criar log de movimento se solicitado
    if (createMovementLog) {
      const product = withdrawalRequest.productId;
      const movementData = {
        productId: product._id,
        type: 'exit',
        fromLocationId: product.locationId ? product.locationId._id : null,
        quantity: withdrawalRequest.type === 'PARCIAL' ? withdrawalRequest.quantityRequested : product.quantity,
        weight: withdrawalRequest.type === 'PARCIAL' 
          ? withdrawalRequest.quantityRequested * product.weightPerUnit 
          : product.totalWeight,
        userId: userId,
        reason: `Confirmação de retirada: ${withdrawalRequest._id}`,
        notes: `Tipo: ${withdrawalRequest.type}. ${notes}`,
        metadata: {
          isAutomatic: true,
          withdrawalRequestId: withdrawalRequest._id,
          withdrawalType: withdrawalRequest.type,
          confirmed: true
        }
      };

      await Movement.create(movementData);
    }

    // 6. Buscar dados atualizados
    const updatedWithdrawalRequest = await WithdrawalRequest.findById(withdrawalRequestId)
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
      .populate('confirmedBy', 'name email role');

    return {
      success: true,
      data: {
        withdrawalRequest: updatedWithdrawalRequest,
        operation: {
          type: 'confirm_withdrawal',
          productStatus: 'RETIRADO',
          confirmedAt: updatedWithdrawalRequest.confirmedAt,
          locationFreed: freeLocation
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao confirmar retirada: ${error.message}`);
  }
};

/**
 * Cancelar solicitação de retirada (ADMIN)
 * @param {String} withdrawalRequestId - ID da solicitação
 * @param {String} userId - ID do usuário cancelador (ADMIN)
 * @param {Object} options - Opções do cancelamento
 * @returns {Object} Resultado do cancelamento
 */
const cancelWithdrawalRequest = async (withdrawalRequestId, userId, options = {}) => {
  try {
    const { 
      reason = 'Cancelamento de solicitação',
      validateUser = true,
      createMovementLog = true 
    } = options;

    // 1. Validar usuário se solicitado
    if (validateUser) {
      const user = await User.findById(userId);
      if (!user || !user.canRequestWithdrawal()) {
        throw new Error('Apenas administradores podem cancelar solicitações');
      }
    }

    // 2. Buscar solicitação
    const withdrawalRequest = await WithdrawalRequest.findById(withdrawalRequestId)
      .populate('productId')
      .populate('requestedBy', 'name email');

    if (!withdrawalRequest) {
      throw new Error('Solicitação de retirada não encontrada');
    }

    // 3. Cancelar usando método do modelo
    await withdrawalRequest.cancel(userId, reason);

    // 4. Criar log de movimento se solicitado
    if (createMovementLog) {
      const product = withdrawalRequest.productId;
      const movementData = {
        productId: product._id,
        type: 'adjustment',
        toLocationId: product.locationId,
        quantity: product.quantity,
        weight: product.totalWeight,
        userId: userId,
        reason: `Cancelamento de solicitação de retirada: ${withdrawalRequest._id}`,
        notes: `Motivo: ${reason}`,
        metadata: {
          isAutomatic: true,
          withdrawalRequestId: withdrawalRequest._id,
          withdrawalType: withdrawalRequest.type,
          cancelled: true
        }
      };

      await Movement.create(movementData);
    }

    // 5. Buscar dados atualizados
    const updatedWithdrawalRequest = await WithdrawalRequest.findById(withdrawalRequestId)
      .populate({
        path: 'productId',
        select: 'name lot quantity totalWeight status locationId',
        populate: {
          path: 'locationId',
          select: 'code coordinates chamberId',
          populate: {
            path: 'chamberId',
            select: 'name'
          }
        }
      })
      .populate('requestedBy', 'name email role')
      .populate('canceledBy', 'name email role');

    return {
      success: true,
      data: {
        withdrawalRequest: updatedWithdrawalRequest,
        operation: {
          type: 'cancel_withdrawal',
          productStatus: 'LOCADO',
          canceledAt: updatedWithdrawalRequest.canceledAt,
          reason: reason
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao cancelar solicitação: ${error.message}`);
  }
};

/**
 * Buscar solicitações pendentes
 * @param {Object} filters - Filtros da busca
 * @returns {Object} Lista de solicitações pendentes
 */
const getPendingWithdrawals = async (filters = {}) => {
  try {
    const {
      page = 1,
      limit = 20,
      sortBy = 'requestedAt',
      sortOrder = 'desc',
      productId,
      requestedBy,
      type
    } = filters;

    // Construir filtros
    const queryFilters = { status: 'PENDENTE' };
    
    if (productId) queryFilters.productId = productId;
    if (requestedBy) queryFilters.requestedBy = requestedBy;
    if (type) queryFilters.type = type;

    // Configurar paginação e ordenação
    const skip = (page - 1) * limit;
    const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

    // Buscar solicitações
    const withdrawals = await WithdrawalRequest.find(queryFilters)
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
      .sort(sort)
      .skip(skip)
      .limit(limit);

    const total = await WithdrawalRequest.countDocuments(queryFilters);

    return {
      success: true,
      data: {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar solicitações pendentes: ${error.message}`);
  }
};

/**
 * Buscar solicitações por produto
 * @param {String} productId - ID do produto
 * @param {Object} options - Opções da busca
 * @returns {Object} Histórico de solicitações do produto
 */
const getWithdrawalsByProduct = async (productId, options = {}) => {
  try {
    const { includeCompleted = true, includeCanceled = true } = options;

    const statusFilter = ['PENDENTE'];
    if (includeCompleted) statusFilter.push('CONFIRMADO');
    if (includeCanceled) statusFilter.push('CANCELADO');

    const withdrawals = await WithdrawalRequest.findByProduct(productId)
      .where('status').in(statusFilter);

    return {
      success: true,
      data: {
        withdrawals,
        count: withdrawals.length,
        productId
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar solicitações do produto: ${error.message}`);
  }
};

/**
 * Buscar solicitações por usuário
 * @param {String} userId - ID do usuário
 * @param {Object} options - Opções da busca
 * @returns {Object} Solicitações do usuário
 */
const getWithdrawalsByUser = async (userId, options = {}) => {
  try {
    const { 
      role = 'requested', // 'requested' | 'confirmed' | 'canceled'
      page = 1,
      limit = 20 
    } = options;

    let query;
    
    switch (role) {
      case 'confirmed':
        query = WithdrawalRequest.find({ confirmedBy: userId });
        break;
      case 'canceled':
        query = WithdrawalRequest.find({ canceledBy: userId });
        break;
      default:
        query = WithdrawalRequest.find({ requestedBy: userId });
    }

    const skip = (page - 1) * limit;
    
    const withdrawals = await query
      .populate('productId', 'name lot quantity totalWeight')
      .populate('requestedBy', 'name email')
      .populate('confirmedBy', 'name email')
      .populate('canceledBy', 'name email')
      .sort({ requestedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await query.clone().countDocuments();

    return {
      success: true,
      data: {
        withdrawals,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        role
      }
    };

  } catch (error) {
    throw new Error(`Erro ao buscar solicitações do usuário: ${error.message}`);
  }
};

/**
 * Gerar relatório de solicitações
 * @param {Object} filters - Filtros do relatório
 * @returns {Object} Relatório de solicitações
 */
const getWithdrawalsReport = async (filters = {}) => {
  try {
    const {
      startDate,
      endDate,
      includeStats = true,
      includeByType = true,
      includeByStatus = true
    } = filters;

    const dateFilter = {};
    if (startDate) dateFilter.startDate = new Date(startDate);
    if (endDate) dateFilter.endDate = new Date(endDate);

    const report = await WithdrawalRequest.getReport(dateFilter);

    const result = {
      success: true,
      data: {
        summary: report.summary,
        total: report.total,
        lastUpdated: report.lastUpdated
      }
    };

    if (includeByType) {
      result.data.byType = report.byType;
    }

    if (includeStats) {
      const stats = await WithdrawalRequest.getStats();
      result.data.stats = stats;
    }

    return result;

  } catch (error) {
    throw new Error(`Erro ao gerar relatório: ${error.message}`);
  }
};

/**
 * Buscar estatísticas de solicitações
 * @returns {Object} Estatísticas gerais
 */
const getWithdrawalsStats = async () => {
  try {
    const stats = await WithdrawalRequest.getStats();
    
    return {
      success: true,
      data: stats
    };

  } catch (error) {
    throw new Error(`Erro ao buscar estatísticas: ${error.message}`);
  }
};

module.exports = {
  createWithdrawalRequest,
  confirmWithdrawalRequest,
  cancelWithdrawalRequest,
  getPendingWithdrawals,
  getWithdrawalsByProduct,
  getWithdrawalsByUser,
  getWithdrawalsReport,
  getWithdrawalsStats
};