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
router.get('/', authenticateToken, authorizeRole(['admin', 'operator']), getUsers);

/**
 * @desc    Obter usuário específico com análises opcionais
 * @route   GET /api/users/:id
 * @access  Private (Admin/Own User)
 * @query   includeActivity, timeframe
 */
router.get('/:id', authenticateToken, canAccessUser, getUser);

/**
 * @desc    Criar novo usuário
 * @route   POST /api/users
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, authorizeRole(['admin']), createUser);

/**
 * @desc    Atualizar usuário
 * @route   PUT /api/users/:id
 * @access  Private (Admin/Own User)
 */
router.put('/:id', authenticateToken, canAccessUser, updateUser);

/**
 * @desc    Desativar usuário
 * @route   DELETE /api/users/:id
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteUser);

/**
 * @desc    Obter análise de produtividade de usuário
 * @route   GET /api/users/:id/productivity
 * @access  Private (Admin/Own User)
 * @query   timeframe, includeComparison
 */
router.get('/:id/productivity', authenticateToken, canAccessUser, getUserProductivity);

/**
 * @desc    Obter usuários similares
 * @route   GET /api/users/:id/similar
 * @access  Private (Admin only)
 * @query   minSimilarity
 */
router.get('/:id/similar', authenticateToken, authorizeRole(['admin']), getSimilarUsers);

module.exports = router; 