/**
 * Rotas de Localizações
 * Sistema de Câmaras Refrigeradas
 * 
 * Funcionalidades:
 * - CRUD de localizações
 * - Geração automática inteligente
 * - Busca otimizada de disponíveis
 * - Validação de capacidade
 * - Análise de ocupação
 * - Localizações adjacentes
 * 
 * ATUALIZADO: Agora inclui endpoints que expõem locationService
 */

const express = require('express');
const router = express.Router();

const { authenticateToken, authorizeRole } = require('../middleware/auth');
const { validateRequest } = require('../middleware/validation');
const locationController = require('../controllers/locationController');

// Todas as rotas requerem autenticação
router.use(authenticateToken);

// Rotas de listagem e consulta (qualquer usuário autenticado)
router.get('/', locationController.getLocations);
router.get('/chamber/:chamberId', locationController.getLocationsByChamber);
router.get('/available', locationController.getAvailableLocations);
router.get('/stats', locationController.getLocationStats);

// Nova rota para buscar quadras por câmara (ANTES de /:id)
router.get('/quadras-by-chamber/:chamberId', locationController.getQuadrasByChamber);

// Rotas de análise avançada (admin e operador)
router.get('/occupancy-analysis', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  locationController.getOccupancyAnalysis
);

router.get('/:id/adjacent', 
  locationController.getAdjacentLocations
);

// Rota específica por ID - SEMPRE POR ÚLTIMO
router.get('/:id', locationController.getLocation);

// Rotas de criação e modificação (admin e operador)
router.post('/generate', 
  authorizeRole(['ADMIN']), 
  validateRequest('generateLocations'),
  locationController.generateLocations
);

router.post('/validate-capacity', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  validateRequest('validateLocationCapacity'),
  locationController.validateLocationCapacity
);

// Rotas de atualização (admin e operador)
router.put('/:id', 
  authorizeRole(['ADMIN', 'OPERATOR']), 
  validateRequest('updateLocation'),
  locationController.updateLocation
);

module.exports = router; 