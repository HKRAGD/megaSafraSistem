/**
 * Rotas de Autenticação
 * Baseado no planejamento: /api/auth com login, register, refresh, logout
 * Funcionalidades: Autenticação com análise de segurança, auditoria automática
 * SEGURANÇA: Rate limiting implementado para proteção contra força bruta
 */

const express = require('express');
const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { 
  loginLimiter, 
  registerLimiter, 
  refreshLimiter, 
  securityLimiter,
  createEmailLimiter,
  rateLimitLogger 
} = require('../middleware/rateLimiting');
const { 
  login, 
  register, 
  refreshToken, 
  logout, 
  getSecurityInfo, 
  revokeSessions 
} = require('../controllers/authController');

const router = express.Router();

// Criar limiter por email para login (5 tentativas por email em 15 min)
const emailLoginLimiter = createEmailLimiter(5, 15 * 60 * 1000);

/**
 * @desc    Login usuário
 * @route   POST /api/auth/login
 * @access  Public
 * @security Rate limited: 5 tentativas por IP/15min + 5 por email/15min
 */
router.post('/login', 
  rateLimitLogger,
  loginLimiter, 
  emailLoginLimiter,
  login
);

/**
 * @desc    Registrar novo usuário (apenas admin)
 * @route   POST /api/auth/register
 * @access  Private (Admin only)
 * @security Rate limited: 3 tentativas por IP/1hora
 */
router.post('/register', 
  rateLimitLogger,
  registerLimiter,
  authenticateToken, 
  authorizeRole(['ADMIN']), 
  register
);

/**
 * @desc    Refresh access token
 * @route   POST /api/auth/refresh
 * @access  Public (com refresh token válido)
 * @security Rate limited: 20 tentativas por IP/5min
 */
router.post('/refresh', 
  rateLimitLogger,
  refreshLimiter, 
  refreshToken
);

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
 * @security Rate limited: 10 tentativas por IP/10min (segurança sensível)
 */
router.get('/security-info', 
  rateLimitLogger,
  securityLimiter,
  authenticateToken, 
  getSecurityInfo
);

/**
 * @desc    Revogar todas as sessões do usuário
 * @route   POST /api/auth/revoke-sessions
 * @access  Private
 * @security Rate limited: 10 tentativas por IP/10min (operação crítica)
 */
router.post('/revoke-sessions', 
  rateLimitLogger,
  securityLimiter,
  authenticateToken, 
  revokeSessions
);

module.exports = router; 