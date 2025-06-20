/**
 * Rotas de Clientes
 * Baseado no planejamento: /api/clients com gestão completa de clientes
 * Funcionalidades: CRUD, busca, estatísticas e integração com produtos
 */

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  getClients, 
  getClient, 
  createClient, 
  updateClient, 
  deleteClient,
  activateClient,
  searchClients,
  getClientStats
} = require('../controllers/clientController');

const router = express.Router();

// IMPORTANTES: Rotas mais específicas devem vir antes das genéricas para evitar conflitos

/**
 * @desc    Buscar clientes por texto
 * @route   GET /api/clients/search
 * @access  Private (Admin/Operator)
 * @query   q (termo de busca), limit, activeOnly
 */
router.get('/search', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), searchClients);

/**
 * @desc    Obter estatísticas de clientes
 * @route   GET /api/clients/stats
 * @access  Private (Admin only)
 */
router.get('/stats', authenticateToken, authorizeRole(['ADMIN']), getClientStats);

/**
 * @desc    Reativar cliente
 * @route   PATCH /api/clients/:id/activate
 * @access  Private (Admin only)
 */
router.patch('/:id/activate', authenticateToken, authorizeRole(['ADMIN']), activateClient);

/**
 * @desc    Obter cliente específico
 * @route   GET /api/clients/:id
 * @access  Private (Admin/Operator)
 * @query   includeProducts
 */
router.get('/:id', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getClient);

/**
 * @desc    Atualizar cliente
 * @route   PUT /api/clients/:id
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateToken, authorizeRole(['ADMIN']), updateClient);

/**
 * @desc    Desativar cliente (soft delete)
 * @route   DELETE /api/clients/:id
 * @access  Private (Admin only)
 * @query   force (para forçar desativação mesmo com produtos associados)
 */
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteClient);

/**
 * @desc    Listar clientes com filtros e paginação
 * @route   GET /api/clients
 * @access  Private (Admin/Operator)
 * @query   page, limit, sort, search, isActive, documentType, includeStats
 */
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getClients);

/**
 * @desc    Criar novo cliente
 * @route   POST /api/clients
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, authorizeRole(['ADMIN']), createClient);

module.exports = router;