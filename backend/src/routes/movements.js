/**
 * Rotas de Movimentações
 * Sistema de Câmaras Refrigeradas
 * 
 * Funcionalidades:
 * - Listagem e histórico
 * - Registro manual inteligente
 * - Análise de padrões
 * - Relatórios de auditoria
 * - Verificação de pendentes
 * 
 * ATUALIZADO: Agora inclui endpoints que expõem movementService
 */

const express = require('express');
const router = express.Router();

const {
  getMovements,
  getMovementsByProduct,
  getMovementsByLocation,
  createMovement,
  getMovementPatterns,
  getAuditReport,
  getProductDetailedHistory,
  registerManualMovement,
  verifyPendingMovements
} = require('../controllers/movementController');

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest, validateParams, validateBody, movementSchemas } = require('../middleware/validation');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

/**
 * @route   GET /api/movements
 * @desc    Listar movimentações (paginado, com filtros)
 * @access  Private (All authenticated users)
 */
router.get('/', getMovements);

/**
 * @route   GET /api/movements/product/:productId
 * @desc    Obter histórico de movimentações por produto
 * @access  Private (All authenticated users)
 */
router.get('/product/:productId', 
  getMovementsByProduct
);

/**
 * @route   GET /api/movements/location/:locationId
 * @desc    Obter histórico de movimentações por localização
 * @access  Private (All authenticated users)
 */
router.get('/location/:locationId',
  getMovementsByLocation
);

/**
 * @route   GET /api/movements/patterns
 * @desc    Obter padrões de movimentações
 * @access  Private (Admin/Operator)
 */
router.get('/patterns', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  getMovementPatterns
);

/**
 * @route   GET /api/movements/audit
 * @desc    Obter relatório de auditoria
 * @access  Private (Admin/Operator)
 */
router.get('/audit', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  getAuditReport
);

/**
 * @route   GET /api/movements/product/:id/detailed-history
 * @desc    Obter histórico detalhado de um produto
 * @access  Private (All authenticated users)
 */
router.get('/product/:id/detailed-history', 
  getProductDetailedHistory
);

/**
 * @route   POST /api/movements
 * @desc    Registrar movimentação manual
 * @access  Private (Admin/Operator)
 */
router.post('/',
  authorizeRole(['ADMIN', 'OPERATOR']),
  validateBody(movementSchemas.create),
  createMovement
);

/**
 * @route   POST /api/movements/manual
 * @desc    Registrar movimentação manual
 * @access  Private (Admin/Operator)
 */
router.post('/manual', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  registerManualMovement
);

/**
 * @route   POST /api/movements/verify-pending
 * @desc    Verificar movimentações pendentes
 * @access  Private (Admin/Operator)
 */
router.post('/verify-pending', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  verifyPendingMovements
);

module.exports = router; 