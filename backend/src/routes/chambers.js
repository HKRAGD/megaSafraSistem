/**
 * Rotas de Câmaras Refrigeradas
 * Baseado no planejamento: /api/chambers com funcionalidades avançadas de gestão e monitoramento
 * Funcionalidades: CRUD completo + análises de capacidade + monitoramento ambiental + manutenção + otimização
 */

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  getChambers, 
  getChamber, 
  createChamber, 
  updateChamber, 
  deleteChamber,
  generateLocations,
  getCapacityAnalysis,
  getEnvironmentalMonitoring,
  getMaintenanceSchedule,
  getLayoutOptimization
} = require('../controllers/chamberController');

const router = express.Router();

/**
 * @desc    Listar câmaras com análises opcionais
 * @route   GET /api/chambers
 * @access  Private (All authenticated users)
 * @query   page, limit, sort, search, status, withAlerts, includeCapacity, includeConditions
 */
router.get('/', authenticateToken, getChambers);

/**
 * @desc    Obter câmara específica com análises detalhadas
 * @route   GET /api/chambers/:id
 * @access  Private (All authenticated users)
 * @query   includeCapacity, includeConditions, timeframe
 */
router.get('/:id', authenticateToken, getChamber);

/**
 * @desc    Obter análise de capacidade detalhada
 * @route   GET /api/chambers/:id/capacity-analysis
 * @access  Private (Admin/Operator)
 * @query   timeframe, includeProjections
 */
router.get('/:id/capacity-analysis', authenticateToken, authorizeRole(['admin', 'operator']), getCapacityAnalysis);

/**
 * @desc    Obter monitoramento de condições ambientais
 * @route   GET /api/chambers/:id/environmental-monitoring
 * @access  Private (Admin/Operator)
 * @query   timeframe, includeAlerts
 */
router.get('/:id/environmental-monitoring', authenticateToken, authorizeRole(['admin', 'operator']), getEnvironmentalMonitoring);

/**
 * @desc    Obter cronograma de manutenção
 * @route   GET /api/chambers/:id/maintenance-schedule
 * @access  Private (Admin/Operator)
 * @query   includePreventive, timeframe
 */
router.get('/:id/maintenance-schedule', authenticateToken, authorizeRole(['admin', 'operator']), getMaintenanceSchedule);

/**
 * @desc    Obter otimizações de layout
 * @route   GET /api/chambers/:id/layout-optimization
 * @access  Private (Admin only)
 * @query   includeReorganization
 */
router.get('/:id/layout-optimization', authenticateToken, authorizeRole(['admin']), getLayoutOptimization);

/**
 * @desc    Criar nova câmara com geração integrada de localizações
 * @route   POST /api/chambers
 * @access  Private (Admin only)
 */
router.post('/', authenticateToken, authorizeRole(['admin']), createChamber);

/**
 * @desc    Gerar localizações com análise de otimização
 * @route   POST /api/chambers/:id/generate-locations
 * @access  Private (Admin only)
 */
router.post('/:id/generate-locations', authenticateToken, authorizeRole(['admin']), generateLocations);

/**
 * @desc    Atualizar câmara com validações avançadas
 * @route   PUT /api/chambers/:id
 * @access  Private (Admin/Operator)
 */
router.put('/:id', authenticateToken, authorizeRole(['admin', 'operator']), updateChamber);

/**
 * @desc    Desativar câmara com análise final
 * @route   DELETE /api/chambers/:id
 * @access  Private (Admin only)
 */
router.delete('/:id', authenticateToken, authorizeRole(['admin']), deleteChamber);

module.exports = router; 