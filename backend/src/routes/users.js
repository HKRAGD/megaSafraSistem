/**
 * Rotas de Usuários
 * Baseado no planejamento: /api/users com CRUD completo e análises avançadas
 * Funcionalidades: Gestão de usuários com análise de produtividade e sugestões de role
 */

const express = require('express');
const { authenticateToken, authorizeRole, canAccessUser } = require('../middleware/auth');
const { 
  getUsers, 
  getUser, 
  createUser, 
  updateUser, 
  deleteUser,
  getUserProductivity,
  getSimilarUsers
} = require('../controllers/userController');

const router = express.Router();

/**
 * @desc    Listar usuários (paginado com filtros e análises)
 * @route   GET /api/users
 * @access  Private (Admin/Operator)
 * @query   page, limit, sort, search, role, isActive, includeAnalytics, includeInactivity
 */
router.get('/', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getUsers);

/**
 * @desc    Obter análise de produtividade de usuário
 * @route   GET /api/users/:id/productivity
 * @access  Private (Admin/Operator)
 * @query   timeframe (7d, 30d, 90d), includeDetails
 */
router.get('/:id/productivity', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getUserProductivity);

/**
 * @desc    Obter usuários similares baseado em atividade e performance
 * @route   GET /api/users/:id/similar
 * @access  Private (Admin only)
 * @query   minSimilarity
 */
router.get('/:id/similar', authenticateToken, authorizeRole(['ADMIN']), getSimilarUsers);

/**
 * @desc    Obter usuário específico com análises opcionais
 * @route   GET /api/users/:id
 * @access  Private (Admin/Operator)
 * @query   includeAnalytics, includeInactivity
 */
router.get('/:id', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getUser);

/**
 * @desc    Criar novo usuário
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, authorizeRole(['ADMIN']), createUser);

/**
 * @desc    Atualizar usuário
 * @route   PUT /api/users/:id
 * @access  Private (Admin only)
 */
router.put('/:id', authenticateToken, authorizeRole(['ADMIN']), updateUser);

/**
 * @desc    Desativar usuário
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteUser);

module.exports = router; 