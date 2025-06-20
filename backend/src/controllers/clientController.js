/**
 * Controller de Clientes
 * Objetivos: Gerenciamento completo de clientes com integração ao sistema de produtos
 * Baseado no planejamento: /api/clients com gestão completa de clientes
 * 
 * Funcionalidades:
 * - CRUD completo de clientes
 * - Validação de documentos (CPF/CNPJ)
 * - Soft delete para preservar integridade referencial
 * - Busca avançada por texto
 * - Estatísticas e relatórios
 */

const { AppError, asyncHandler } = require('../middleware/errorHandler');
const Client = require('../models/Client');
const Product = require('../models/Product');
const clientService = require('../services/clientService');

/**
 * @desc    Listar clientes
 * @route   GET /api/clients
 * @access  Private (Admin/Operator)
 */
const getClients = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 20,
    sort = 'name',
    search,
    isActive,
    documentType,
    includeStats = 'false'
  } = req.query;

  // Validar parâmetros numéricos
  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);

  if (isNaN(pageNum) || pageNum < 1) {
    return next(new AppError('Parâmetro page deve ser um número positivo', 400));
  }
  if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
    return next(new AppError('Parâmetro limit deve ser um número entre 1 e 100', 400));
  }

  // 1. Construir filtros
  const filter = {};
  
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { contactPerson: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { cnpjCpf: { $regex: search.replace(/\D/g, ''), $options: 'i' } }
    ];
  }
  
  if (isActive !== undefined) {
    filter.isActive = isActive === 'true';
  }

  if (documentType && ['CPF', 'CNPJ', 'OUTROS'].includes(documentType)) {
    filter.documentType = documentType;
  }

  // 2. Configurar opções de paginação
  const skip = (pageNum - 1) * limitNum;
  const sortObj = {};
  
  // Parse do sort
  if (sort.startsWith('-')) {
    sortObj[sort.substring(1)] = -1;
  } else {
    sortObj[sort] = 1;
  }

  const options = { skip, limit: limitNum, sortObj };

  // 3. Usar service para consulta otimizada
  const { clients, total } = await clientService.getClientsWithStats(
    filter, 
    options, 
    includeStats === 'true'
  );

  // 4. Resposta
  res.status(200).json({
    success: true,
    data: clients,
    pagination: {
      current: pageNum,
      pages: Math.ceil(total / limitNum),
      total,
      limit: limitNum
    },
    meta: {
      searchTerm: search || null,
      filters: {
        isActive: isActive ? isActive === 'true' : null,
        documentType: documentType || null
      }
    }
  });
});

/**
 * @desc    Obter cliente específico
 * @route   GET /api/clients/:id
 * @access  Private (Admin/Operator)
 */
const getClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { includeProducts = 'false', includeProductsLimit = 50 } = req.query;

  const client = await Client.findById(id)
    .populate('metadata.createdBy', 'name email')
    .populate('metadata.lastModifiedBy', 'name email');

  if (!client) {
    return next(new AppError('Cliente não encontrado', 404));
  }

  let clientData = client.toObject();

  // Incluir produtos do cliente se solicitado
  if (includeProducts === 'true') {
    const productLimit = Math.min(parseInt(includeProductsLimit) || 50, 200); // Máximo 200
    
    const products = await Product.find({ 
      clientId: id,
      status: { $ne: 'REMOVIDO' }
    })
    .populate('seedTypeId', 'name')
    .populate('locationId', 'code coordinates chamberId')
    .sort({ createdAt: -1 })
    .limit(productLimit);

    clientData.products = products;
    clientData.productCount = products.length;
    clientData.totalProductsInSystem = await Product.countDocuments({ 
      clientId: id,
      status: { $ne: 'REMOVIDO' }
    });
  }

  res.status(200).json({
    success: true,
    data: clientData
  });
});

/**
 * @desc    Criar novo cliente
 * @route   POST /api/clients
 * @access  Private (Admin only)
 */
const createClient = asyncHandler(async (req, res, next) => {
  const newClient = await clientService.createClient(req.body, req.user.id);

  res.status(201).json({
    success: true,
    data: newClient,
    message: 'Cliente criado com sucesso'
  });
});

/**
 * @desc    Atualizar cliente
 * @route   PUT /api/clients/:id
 * @access  Private (Admin only)
 */
const updateClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  
  const updatedClient = await clientService.updateClient(id, req.body, req.user.id);

  res.status(200).json({
    success: true,
    data: updatedClient,
    message: 'Cliente atualizado com sucesso'
  });
});

/**
 * @desc    Desativar cliente (soft delete)
 * @route   DELETE /api/clients/:id
 * @access  Private (Admin only)
 */
const deleteClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { force = 'false' } = req.query;

  try {
    const result = await clientService.deactivateClient(id, req.user.id, force === 'true');

    res.status(200).json({
      success: true,
      data: result.client,
      message: result.forced 
        ? `Cliente desativado. ${result.associatedProductsCount} produtos mantidos com referência.`
        : 'Cliente desativado com sucesso'
    });
  } catch (error) {
    if (error.statusCode === 400 && error.data) {
      // Erro de validação com dados extras para o frontend
      return res.status(400).json({
        success: false,
        message: error.message,
        data: {
          ...error.data,
          warning: 'Use force=true para desativar mesmo com produtos associados'
        }
      });
    }
    throw error; // Re-throw outros erros para o errorHandler
  }
});

/**
 * @desc    Reativar cliente
 * @route   PATCH /api/clients/:id/activate
 * @access  Private (Admin only)
 */
const activateClient = asyncHandler(async (req, res, next) => {
  const { id } = req.params;

  const activatedClient = await clientService.reactivateClient(id, req.user.id);

  res.status(200).json({
    success: true,
    data: activatedClient,
    message: 'Cliente reativado com sucesso'
  });
});

/**
 * @desc    Buscar clientes por texto
 * @route   GET /api/clients/search
 * @access  Private (Admin/Operator)
 */
const searchClients = asyncHandler(async (req, res, next) => {
  const { q: searchTerm, limit = 10, activeOnly = 'true' } = req.query;

  if (!searchTerm || searchTerm.trim().length < 2) {
    return next(new AppError('Termo de busca deve ter pelo menos 2 caracteres', 400));
  }

  const searchLimit = Math.min(parseInt(limit) || 10, 50); // Máximo 50 resultados

  const clients = await Client.searchByText(searchTerm.trim())
    .limit(searchLimit);

  // Filtrar apenas ativos se solicitado
  const filteredClients = activeOnly === 'true' 
    ? clients.filter(client => client.isActive)
    : clients;

  res.status(200).json({
    success: true,
    data: filteredClients,
    meta: {
      searchTerm: searchTerm.trim(),
      resultCount: filteredClients.length,
      activeOnly: activeOnly === 'true',
      limitApplied: searchLimit
    }
  });
});

/**
 * @desc    Obter estatísticas de clientes
 * @route   GET /api/clients/stats
 * @access  Private (Admin)
 */
const getClientStats = asyncHandler(async (req, res, next) => {
  const stats = await clientService.getCompleteClientStats();

  res.status(200).json({
    success: true,
    data: stats
  });
});

module.exports = {
  getClients,
  getClient,
  createClient,
  updateClient,
  deleteClient,
  activateClient,
  searchClients,
  getClientStats
};