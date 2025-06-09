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

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest, validateBody, productSchemas } = require('../middleware/validation');
const productController = require('../controllers/productController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de listagem e consulta (qualquer usuário autenticado)
router.get('/', productController.getProducts);

// Rotas de análise (admin e operador) - ANTES do /:id
router.get('/distribution-analysis', 
  authorizeRole(['admin', 'operator']), 
  productController.getDistributionAnalysis
);

// Rotas de validação e utilitários (admin e operador) - ANTES do /:id
router.post('/validate-data', 
  authorizeRole(['admin', 'operator']), 
  productController.validateProductData
);

router.post('/find-optimal-location', 
  authorizeRole(['admin', 'operator']), 
  productController.findOptimalLocation
);

router.post('/generate-code', 
  authorizeRole(['admin', 'operator']), 
  productController.generateProductCode
);

// Rota específica por ID - SEMPRE POR ÚLTIMO
router.get('/:id', productController.getProduct);

// Rotas de CRUD (admin e operador)
router.post('/', 
  authorizeRole(['admin', 'operator']), 
  validateBody(productSchemas.create),
  productController.createProduct
);

router.put('/:id', 
  authorizeRole(['admin', 'operator']), 
  validateBody(productSchemas.update),
  productController.updateProduct
);

router.delete('/:id', 
  authorizeRole(['admin', 'operator']), 
  productController.deleteProduct
);

// Rota de movimentação (admin e operador)
router.post('/:id/move', 
  authorizeRole(['admin', 'operator']), 
  validateBody(productSchemas.move),
  productController.moveProduct
);

// Novas rotas de movimentação avançada (admin e operador)
router.post('/:id/partial-exit', 
  authorizeRole(['admin', 'operator']), 
  productController.partialExit
);

router.post('/:id/partial-move', 
  authorizeRole(['admin', 'operator']), 
  productController.partialMove
);

router.post('/:id/add-stock', 
  authorizeRole(['admin', 'operator']), 
  productController.addStock
);

module.exports = router; 