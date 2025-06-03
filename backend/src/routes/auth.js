/**
 * Rotas de Autenticação
 * Baseado no planejamento: /api/auth com login, register, refresh, logout
 * Funcionalidades: Autenticação com análise de segurança, auditoria automática
 */

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  login, 
  register, 
  refreshToken, 
  logout, 
  getSecurityInfo, 
  revokeSessions 
} = require('../controllers/authController');

const router = express.Router();

/**
 * @desc    Login usuário
 * @route   POST /api/auth/login
 * @access  Public
 */
router.post('/login', login);

/**
 * @desc    Registrar novo usuário (apenas admin)
 * @route   POST /api/auth/register
 * @access  Private (Admin only)
 */
router.post('/register', authenticateToken, authorizeRole('admin'), register);

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (com refresh token válido)
 */
router.post('/refresh', refreshToken);

/**
 * @desc    Logout usuário
 * @route   POST /api/auth/logout
 * @access  Private
 */
router.post('/logout', authenticateToken, logout);

/**
 * @desc    Obter informações de segurança do usuário atual
 * @route   GET /api/auth/security-info
 * @access  Private
 */
router.get('/security-info', authenticateToken, getSecurityInfo);

/**
 * @desc    Revogar todas as sessões do usuário
 * @route   POST /api/auth/revoke-sessions
 * @access  Private
 */
router.post('/revoke-sessions', authenticateToken, revokeSessions);

module.exports = router; 