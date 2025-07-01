/**
 * Rotas de Produtos
 * Sistema de Câmaras Refrigeradas
 * 
 * Funcionalidades:
 * - CRUD completo de produtos
 * - Movimentação inteligente
 * - Busca de localização ótima
 * - Análise de distribuição
 * - Validação de dados
 * - Geração de códigos
 */

const express = require('express');
const router = express.Router();

const { 
  authenticateToken, 
  authorizeRole,
  canCreateProduct,
  canLocateProduct,
  canMoveProduct,
  canRemoveProduct,
  canRequestWithdrawal
} = require('../middleware/auth');
const { validateRequest, validateBody, productSchemas } = require('../middleware/validation');
const productController = require('../controllers/productController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de listagem e consulta (qualquer usuário autenticado)
router.get('/', productController.getProducts);

// Rotas de análise (admin e operador) - ANTES do /:id
router.get('/distribution-analysis', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  productController.getDistributionAnalysis
);

// Rotas de validação e utilitários (admin e operador) - ANTES do /:id
router.post('/validate-data', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  productController.validateProductData
);

router.post('/find-optimal-location', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  productController.findOptimalLocation
);

router.post('/generate-code', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  productController.generateProductCode
);

// Buscar produtos aguardando locação
router.get('/pending-location', 
  canLocateProduct, // Apenas OPERATOR precisa ver isso
  productController.getProductsPendingLocation
);

// Buscar produtos aguardando locação, agrupados por lote
router.get('/pending-allocation-grouped', 
  canLocateProduct, // Apenas OPERATOR precisa ver isso
  productController.getProductsPendingAllocationGrouped
);

// Buscar produtos de um lote específico (para página de detalhes)
router.get('/by-batch/:batchId', 
  canLocateProduct, // Apenas OPERATOR precisa ver isso
  productController.getProductsByBatch
);

// Buscar produtos aguardando retirada
router.get('/pending-withdrawal', 
  authorizeRole(['ADMIN', 'OPERATOR']), // Ambos podem ver
  productController.getProductsPendingWithdrawal
);

// Rota específica por ID - SEMPRE POR ÚLTIMO
router.get('/:id', productController.getProduct);

// Rotas de CRUD com permissões específicas
router.post('/', 
  canCreateProduct, // Apenas ADMIN pode criar produtos
  validateBody(productSchemas.create),
  productController.createProduct
);

// Nova rota para cadastro em lote
router.post('/batch', 
  canCreateProduct, // Apenas ADMIN pode criar produtos em lote
  validateBody(productSchemas.createBatch), // Validação robusta dos dados de entrada
  productController.createProductsBatch
);

router.put('/:id', 
  authorizeRole(['ADMIN', 'OPERATOR']), // Ambos podem atualizar dados básicos
  validateBody(productSchemas.update),
  productController.updateProduct
);

router.delete('/:id', 
  canRemoveProduct, // Apenas ADMIN pode remover produtos
  productController.deleteProduct
);

// Rota de movimentação (apenas OPERATOR)
router.post('/:id/move', 
  canMoveProduct, // Apenas OPERATOR pode mover produtos
  validateBody(productSchemas.move),
  productController.moveProduct
);

// ============================================================================
// NOVAS ROTAS FSM (FINITE STATE MACHINE)
// ============================================================================

// Localizar produto aguardando locação (OPERATOR)
router.post('/:id/locate', 
  canLocateProduct, // Apenas OPERATOR pode localizar produtos
  productController.locateProduct
);

// Solicitar retirada de produto (ADMIN)
router.post('/:id/request-withdrawal', 
  canRequestWithdrawal, // Apenas ADMIN pode solicitar retiradas
  productController.requestWithdrawal
);

// ============================================================================
// ROTAS DE MOVIMENTAÇÃO AVANÇADA (EXISTENTES)
// ============================================================================
router.post('/:id/partial-exit', 
  canRemoveProduct, // Apenas ADMIN pode fazer saída parcial
  productController.partialExit
);

router.post('/:id/partial-move', 
  canMoveProduct, // Apenas OPERATOR pode fazer movimentação parcial
  productController.partialMove
);

router.post('/:id/add-stock', 
  canCreateProduct, // Apenas ADMIN pode adicionar estoque
  productController.addStock
);

module.exports = router; 