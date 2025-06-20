/**
 * Rotas de Tipos de Sementes
 * Baseado no planejamento: /api/seed-types com sistema dinâmico e análises avançadas
 * Funcionalidades: Gestão inteligente de tipos com análises de condições e compatibilidade
 */

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  getSeedTypes, 
  getSeedType, 
  createSeedType, 
  updateSeedType, 
  deleteSeedType,
  getSeedTypesByConditions,
  getPerformanceComparison,
  getConditionViolations
} = require('../controllers/seedTypeController');

const router = express.Router();

/**
 * @desc    Listar tipos de sementes com análises opcionais
 * @route   GET /api/seed-types
 * @access  Private (All authenticated users)
 * @query   page, limit, sort, search, isActive, temperature, humidity, includeAnalytics
 */
router.get('/', authenticateToken, getSeedTypes);

/**
 * @desc    Buscar tipos por condições de armazenamento ou câmara
 * @route   GET /api/seed-types/by-conditions
 * @access  Private (All authenticated users)
 * @query   chamberId, temperature, humidity, tolerance
 */
router.get('/by-conditions', authenticateToken, getSeedTypesByConditions);

/**
 * @desc    Obter comparação de performance entre tipos
 * @route   GET /api/seed-types/performance-comparison
 * @access  Private (Admin/Operator)
 * @query   seedTypeIds, timeframe, includeRecommendations
 */
router.get('/performance-comparison', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getPerformanceComparison);

/**
 * @desc    Obter tipo de semente específico com análises opcionais
 * @route   GET /api/seed-types/:id
 * @access  Private (All authenticated users)
 * @query   includeOptimalConditions, includeCompatibility
 */
router.get('/:id', authenticateToken, getSeedType);

/**
 * @desc    Detectar violações de condições para um tipo
 * @route   GET /api/seed-types/:id/condition-violations
 * @access  Private (Admin/Operator)
 * @query   timeframe, includeRecommendations
 */
router.get('/:id/condition-violations', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), getConditionViolations);

/**
 * @desc    Criar novo tipo de semente
 * @route   POST /api/seed-types
 * @access  Private (Admin/Operator)
 */
router.post('/', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), createSeedType);

/**
 * @desc    Atualizar tipo de semente
 * @route   PUT /api/seed-types/:id
 * @access  Private (Admin/Operator)
 */
router.put('/:id', authenticateToken, authorizeRole(['ADMIN', 'OPERATOR']), updateSeedType);

/**
 * @desc    Desativar tipo de semente
 * @route   DELETE /api/seed-types/:id
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, authorizeRole(['ADMIN']), deleteSeedType);

module.exports = router; 