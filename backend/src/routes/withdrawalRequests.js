/**
 * Rotas de Solicitações de Retirada
 * Sistema de Câmaras Refrigeradas
 * 
 * Funcionalidades:
 * - CRUD completo de solicitações de retirada
 * - Controle de fluxo ADMIN → OPERATOR
 * - Relatórios e estatísticas
 * - Validação de estados FSM
 */

const express = require('express');
const router = express.Router();

const { 
  authenticateToken, 
  authorizeRole,
  canRequestWithdrawal,
  canConfirmWithdrawal
} = require('../middleware/auth');
const { validateRequest, validateBody } = require('../middleware/validation');
const withdrawalController = require('../controllers/withdrawalController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// ============================================================================
// ROTAS DE LISTAGEM E CONSULTA
// ============================================================================

// Buscar solicitações pendentes (ADMIN e OPERATOR podem ver)
router.get('/pending', 
  authorizeRole(['ADMIN', 'OPERATOR']),
  withdrawalController.getPendingWithdrawals
);

// Buscar solicitações por produto
router.get('/product/:productId', 
  authorizeRole(['ADMIN', 'OPERATOR']),
  withdrawalController.getWithdrawalsByProduct
);

// Buscar solicitações por usuário (minhas solicitações)
router.get('/my-requests', 
  withdrawalController.getMyWithdrawals
);

// Buscar estatísticas de solicitações (ADMIN)
router.get('/stats', 
  canRequestWithdrawal, // Apenas ADMIN pode ver estatísticas completas
  withdrawalController.getWithdrawalsStats
);

// Buscar relatório de solicitações (ADMIN)
router.get('/report', 
  canRequestWithdrawal, // Apenas ADMIN pode gerar relatórios
  withdrawalController.getWithdrawalsReport
);

// ============================================================================
// ROTAS DE CRUD E AÇÕES
// ============================================================================

// Buscar todas as solicitações (paginado, com filtros)
router.get('/', 
  authorizeRole(['ADMIN', 'OPERATOR']),
  withdrawalController.getWithdrawals
);

// Buscar solicitação específica por ID
router.get('/:id', 
  authorizeRole(['ADMIN', 'OPERATOR']),
  withdrawalController.getWithdrawal
);

// Criar nova solicitação de retirada (ADMIN)
router.post('/', 
  canRequestWithdrawal, // Apenas ADMIN pode solicitar
  withdrawalController.createWithdrawalRequest
);

// Confirmar solicitação de retirada (OPERATOR)
router.patch('/:id/confirm', 
  canConfirmWithdrawal, // Apenas OPERATOR pode confirmar
  withdrawalController.confirmWithdrawalRequest
);

// Cancelar solicitação de retirada (ADMIN)
router.patch('/:id/cancel', 
  canRequestWithdrawal, // Apenas ADMIN pode cancelar
  withdrawalController.cancelWithdrawalRequest
);

// Atualizar dados da solicitação (apenas ADMIN e apenas se PENDENTE)
router.put('/:id', 
  canRequestWithdrawal, // Apenas ADMIN pode editar
  withdrawalController.updateWithdrawalRequest
);

module.exports = router;