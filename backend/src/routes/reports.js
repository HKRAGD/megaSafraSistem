const express = require('express');
const router = express.Router();

const {
  getInventoryReport,
  getMovementReport,
  getExpirationReport,
  getCapacityReport,
  getExecutiveReport,
  getCustomReport
} = require('../controllers/reportController');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

/**
 * @route   GET /api/reports/inventory
 * @desc    Relatório completo de estoque atual
 * @access  Private (All authenticated users)
 */
router.get('/inventory', authenticateToken, getInventoryReport);

/**
 * @route   GET /api/reports/movements
 * @desc    Relatório de movimentações por período
 * @access  Private (All authenticated users)
 */
router.get('/movements', authenticateToken, getMovementReport);

/**
 * @route   GET /api/reports/expiration
 * @desc    Relatório de produtos próximos ao vencimento
 * @access  Private (All authenticated users)
 */
router.get('/expiration', authenticateToken, getExpirationReport);

/**
 * @route   GET /api/reports/capacity
 * @desc    Relatório detalhado de capacidade por câmara
 * @access  Private (All authenticated users)
 */
router.get('/capacity', authenticateToken, getCapacityReport);

/**
 * @route   GET /api/reports/executive
 * @desc    Relatório executivo consolidado
 * @access  Private (Admin/Operator only)
 */
router.get('/executive', authenticateToken, authorizeRole(['admin', 'operator']), getExecutiveReport);

/**
 * @route   GET /api/reports/custom
 * @desc    Relatório customizado com múltiplas dimensões
 * @access  Private (Admin/Operator only)
 */
router.get('/custom', authenticateToken, authorizeRole(['admin', 'operator']), getCustomReport);

module.exports = router; 