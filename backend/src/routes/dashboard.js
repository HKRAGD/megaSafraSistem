const express = require('express');
const router = express.Router();

const {
  getSummary,
  getChamberStatus,
  getStorageCapacity,
  getRecentMovements
} = require('../controllers/dashboardController');

const { authenticateToken, authorizeRole } = require('../middleware/auth');

/**
 * @route   GET /api/dashboard/summary
 * @desc    Resumo geral do sistema
 * @access  Private (All authenticated users)
 */
router.get('/summary', authenticateToken, getSummary);

/**
 * @route   GET /api/dashboard/chamber-status
 * @desc    Status detalhado de todas as câmaras
 * @access  Private (All authenticated users)
 */
router.get('/chamber-status', authenticateToken, getChamberStatus);

/**
 * @route   GET /api/dashboard/storage-capacity
 * @desc    Análise detalhada de capacidade de armazenamento
 * @access  Private (All authenticated users)
 */
router.get('/storage-capacity', authenticateToken, getStorageCapacity);

/**
 * @route   GET /api/dashboard/recent-movements
 * @desc    Movimentações recentes com análise
 * @access  Private (All authenticated users)
 */
router.get('/recent-movements', authenticateToken, getRecentMovements);

module.exports = router; 