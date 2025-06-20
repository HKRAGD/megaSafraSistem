/**
 * Client Service
 * Sistema de Gerenciamento de Clientes
 * 
 * Funcionalidades:
 * - Validações de negócio para clientes
 * - Verificação de unicidade de dados
 * - Lógica de soft delete com verificação de integridade
 * - Análises e estatísticas avançadas
 * - Agregações otimizadas para performance
 * 
 * Integrações:
 * - Product (verificação de produtos associados)
 * - Validações de CPF/CNPJ robustas
 * - Logs de auditoria
 */

const Client = require('../models/Client');
const Product = require('../models/Product');
const { AppError } = require('../middleware/errorHandler');
const mongoose = require('mongoose');

/**
 * Validar unicidade de dados do cliente
 * @param {string} name - Nome do cliente
 * @param {string} cnpjCpf - CPF/CNPJ do cliente
 * @param {string} excludeId - ID para excluir da verificação (para updates)
 * @returns {Promise<void>}
 */
const validateClientUniqueness = async (name, cnpjCpf, excludeId = null) => {
  const filter = { isActive: true };
  const orConditions = [];

  if (name && name.trim()) {
    orConditions.push({ name: name.trim() });
  }
  
  if (cnpjCpf && cnpjCpf.trim()) {
    const cleanedDocument = cnpjCpf.replace(/\D/g, '');
    if (cleanedDocument) {
      orConditions.push({ cnpjCpf: cleanedDocument });
    }
  }

  if (orConditions.length === 0) return; // Nada para verificar

  filter.$or = orConditions;
  if (excludeId) {
    filter._id = { $ne: excludeId };
  }

  const existingClient = await Client.findOne(filter);
  if (existingClient) {
    // Verificar qual campo específico está conflitando
    if (name && existingClient.name === name.trim()) {
      throw new AppError('Já existe um cliente ativo com este nome', 400);
    }
    if (cnpjCpf && existingClient.cnpjCpf === cnpjCpf.replace(/\D/g, '')) {
      throw new AppError('Já existe um cliente ativo com este CPF/CNPJ', 400);
    }
  }
};

/**
 * Verificar se cliente pode ser removido/desativado
 * @param {string} clientId - ID do cliente
 * @returns {Promise<object>} Resultado da verificação
 */
const checkClientDeletionEligibility = async (clientId) => {
  const associatedProductsCount = await Product.countDocuments({ 
    clientId: clientId,
    status: { $ne: 'REMOVIDO' }
  });
  
  // Buscar produtos por status para dar detalhes
  const productsByStatus = await Product.aggregate([
    { 
      $match: { 
        clientId: mongoose.Types.ObjectId(clientId),
        status: { $ne: 'REMOVIDO' }
      }
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        products: { 
          $push: { 
            name: '$name', 
            lot: '$lot',
            totalWeight: '$totalWeight'
          }
        }
      }
    }
  ]);

  return {
    canDelete: associatedProductsCount === 0,
    associatedProductsCount,
    productsByStatus,
    message: associatedProductsCount > 0 
      ? `Cliente possui ${associatedProductsCount} produtos associados`
      : 'Cliente pode ser removido'
  };
};

/**
 * Obter clientes com estatísticas de produtos (versão otimizada)
 * @param {object} filter - Filtros da consulta
 * @param {object} options - Opções de paginação e ordenação
 * @param {boolean} includeStats - Se deve incluir estatísticas
 * @returns {Promise<object>} Resultado da consulta
 */
const getClientsWithStats = async (filter, options, includeStats = false) => {
  const { skip, limit, sortObj } = options;

  if (!includeStats) {
    // Consulta simples sem estatísticas
    const [clients, total] = await Promise.all([
      Client.find(filter)
        .select('-__v')
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .populate('metadata.createdBy', 'name email')
        .populate('metadata.lastModifiedBy', 'name email'),
      Client.countDocuments(filter)
    ]);

    return { clients, total };
  }

  // Consulta otimizada com agregação para incluir estatísticas
  const aggregationPipeline = [
    { $match: filter },
    { $sort: sortObj },
    { $skip: skip },
    { $limit: limit },
    {
      $lookup: {
        from: 'products',
        let: { clientId: '$_id' },
        pipeline: [
          { 
            $match: { 
              $expr: { $eq: ['$clientId', '$$clientId'] },
              status: { $ne: 'REMOVIDO' }
            }
          },
          {
            $group: {
              _id: null,
              productCount: { $sum: 1 },
              totalWeight: { 
                $sum: { 
                  $cond: [
                    { $in: ['$status', ['LOCADO', 'AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA']] }, 
                    '$totalWeight', 
                    0
                  ]
                }
              },
              totalQuantity: { 
                $sum: { 
                  $cond: [
                    { $in: ['$status', ['LOCADO', 'AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA']] }, 
                    '$quantity', 
                    0
                  ]
                }
              }
            }
          }
        ],
        as: 'productStats'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'metadata.createdBy',
        foreignField: '_id',
        as: 'createdBy',
        pipeline: [{ $project: { name: 1, email: 1 } }]
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'metadata.lastModifiedBy',
        foreignField: '_id',
        as: 'lastModifiedBy',
        pipeline: [{ $project: { name: 1, email: 1 } }]
      }
    },
    {
      $addFields: {
        stats: {
          productCount: { $ifNull: [{ $arrayElemAt: ['$productStats.productCount', 0] }, 0] },
          totalWeight: { $ifNull: [{ $arrayElemAt: ['$productStats.totalWeight', 0] }, 0] },
          totalQuantity: { $ifNull: [{ $arrayElemAt: ['$productStats.totalQuantity', 0] }, 0] },
          hasProducts: { $gt: [{ $ifNull: [{ $arrayElemAt: ['$productStats.productCount', 0] }, 0] }, 0] }
        },
        'metadata.createdBy': { $arrayElemAt: ['$createdBy', 0] },
        'metadata.lastModifiedBy': { $arrayElemAt: ['$lastModifiedBy', 0] }
      }
    },
    {
      $project: { 
        productStats: 0,
        createdBy: 0,
        lastModifiedBy: 0,
        __v: 0
      }
    }
  ];

  const [clients, totalArray] = await Promise.all([
    Client.aggregate(aggregationPipeline),
    Client.aggregate([
      { $match: filter },
      { $count: 'total' }
    ])
  ]);

  const total = totalArray[0]?.total || 0;

  return { clients, total };
};

/**
 * Criar novo cliente com validações
 * @param {object} clientData - Dados do cliente
 * @param {string} userId - ID do usuário que está criando
 * @returns {Promise<object>} Cliente criado
 */
const createClient = async (clientData, userId) => {
  // Validar unicidade
  await validateClientUniqueness(clientData.name, clientData.cnpjCpf);

  const newClientData = {
    ...clientData,
    metadata: {
      createdBy: userId,
      lastModifiedBy: userId
    }
  };

  const client = await Client.create(newClientData);

  // Retornar cliente com dados populados
  return await Client.findById(client._id)
    .populate('metadata.createdBy', 'name email')
    .populate('metadata.lastModifiedBy', 'name email');
};

/**
 * Atualizar cliente com validações
 * @param {string} clientId - ID do cliente
 * @param {object} updateData - Dados para atualização
 * @param {string} userId - ID do usuário que está atualizando
 * @returns {Promise<object>} Cliente atualizado
 */
const updateClient = async (clientId, updateData, userId) => {
  const client = await Client.findById(clientId);
  
  if (!client) {
    throw new AppError('Cliente não encontrado', 404);
  }

  // Validar unicidade apenas se os campos mudaram
  let needsUniquenessCheck = false;
  let nameToCheck = null;
  let cnpjCpfToCheck = null;

  if (updateData.name && updateData.name !== client.name) {
    needsUniquenessCheck = true;
    nameToCheck = updateData.name;
  }

  if (updateData.cnpjCpf && updateData.cnpjCpf !== client.cnpjCpf) {
    needsUniquenessCheck = true;
    cnpjCpfToCheck = updateData.cnpjCpf;
  }

  if (needsUniquenessCheck) {
    await validateClientUniqueness(nameToCheck, cnpjCpfToCheck, clientId);
  }

  // Atualizar dados
  const finalUpdateData = {
    ...updateData,
    'metadata.lastModifiedBy': userId
  };

  return await Client.findByIdAndUpdate(
    clientId,
    finalUpdateData,
    { 
      new: true, 
      runValidators: true 
    }
  )
  .populate('metadata.createdBy', 'name email')
  .populate('metadata.lastModifiedBy', 'name email');
};

/**
 * Desativar cliente com verificações de integridade
 * @param {string} clientId - ID do cliente
 * @param {string} userId - ID do usuário
 * @param {boolean} force - Forçar desativação mesmo com produtos
 * @returns {Promise<object>} Resultado da operação
 */
const deactivateClient = async (clientId, userId, force = false) => {
  const client = await Client.findById(clientId);
  
  if (!client) {
    throw new AppError('Cliente não encontrado', 404);
  }

  const deletionCheck = await checkClientDeletionEligibility(clientId);

  if (!deletionCheck.canDelete && !force) {
    throw new AppError(
      `Não é possível desativar o cliente. ${deletionCheck.message}. Use force=true para desativar mesmo assim.`,
      400,
      {
        associatedProductsCount: deletionCheck.associatedProductsCount,
        productsByStatus: deletionCheck.productsByStatus,
        canForceDelete: true
      }
    );
  }

  // Realizar soft delete
  const deactivatedClient = await Client.findByIdAndUpdate(
    clientId,
    { 
      isActive: false,
      'metadata.lastModifiedBy': userId
    },
    { new: true }
  );

  return {
    client: deactivatedClient,
    associatedProductsCount: deletionCheck.associatedProductsCount,
    forced: force && deletionCheck.associatedProductsCount > 0
  };
};

/**
 * Reativar cliente com verificações de conflito
 * @param {string} clientId - ID do cliente
 * @param {string} userId - ID do usuário
 * @returns {Promise<object>} Cliente reativado
 */
const reactivateClient = async (clientId, userId) => {
  const client = await Client.findById(clientId);
  
  if (!client) {
    throw new AppError('Cliente não encontrado', 404);
  }

  if (client.isActive) {
    throw new AppError('Cliente já está ativo', 400);
  }

  // Verificar conflitos com clientes ativos
  await validateClientUniqueness(client.name, client.cnpjCpf, clientId);

  return await Client.findByIdAndUpdate(
    clientId,
    { 
      isActive: true,
      'metadata.lastModifiedBy': userId
    },
    { new: true }
  );
};

/**
 * Obter estatísticas completas de clientes
 * @returns {Promise<object>} Estatísticas completas
 */
const getCompleteClientStats = async () => {
  const basicStats = await Client.getStats();

  // Estatísticas de integração com produtos
  const productIntegrationStats = await Product.aggregate([
    {
      $facet: {
        withClient: [
          {
            $match: {
              clientId: { $ne: null },
              status: { $in: ['LOCADO', 'AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA'] }
            }
          },
          {
            $group: {
              _id: null,
              clientsWithProducts: { $addToSet: '$clientId' },
              totalProducts: { $sum: 1 },
              totalWeight: { $sum: '$totalWeight' }
            }
          }
        ],
        withoutClient: [
          {
            $match: {
              clientId: null,
              status: { $in: ['LOCADO', 'AGUARDANDO_LOCACAO', 'AGUARDANDO_RETIRADA'] }
            }
          },
          {
            $group: {
              _id: null,
              totalProducts: { $sum: 1 },
              totalWeight: { $sum: '$totalWeight' }
            }
          }
        ]
      }
    }
  ]);

  const withClientData = productIntegrationStats[0]?.withClient[0] || {};
  const withoutClientData = productIntegrationStats[0]?.withoutClient[0] || {};

  return {
    ...basicStats,
    productIntegration: {
      clientsWithProducts: withClientData.clientsWithProducts?.length || 0,
      totalProductsWithClient: withClientData.totalProducts || 0,
      totalWeightWithClient: withClientData.totalWeight || 0,
      productsWithoutClient: withoutClientData.totalProducts || 0,
      weightWithoutClient: withoutClientData.totalWeight || 0
    }
  };
};

module.exports = {
  validateClientUniqueness,
  checkClientDeletionEligibility,
  getClientsWithStats,
  createClient,
  updateClient,
  deactivateClient,
  reactivateClient,
  getCompleteClientStats
};