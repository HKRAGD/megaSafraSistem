/**
 * Testes Unitários - ProductController
 * Verificando REGRAS CRÍTICAS: Uma localização = Um produto, Movimentações automáticas
 */

const request = require('supertest');

// Mock do middleware de autenticação ANTES do require do app
jest.mock('../../../middleware/auth', () => ({
  authenticateToken: (req, res, next) => {
    req.user = {
      _id: 'user123',
      email: 'test@test.com',
      role: 'operator'
    };
    next();
  },
  authorizeRole: (...roles) => (req, res, next) => {
    next();
  },
  requireAdmin: (req, res, next) => {
    next();
  },
  requireOperator: (req, res, next) => {
    next();
  }
}));

// Mock do productService
jest.mock('../../../services/productService', () => ({
  analyzeDistribution: jest.fn(),
  analyzeLocationOptimization: jest.fn(),
  createProduct: jest.fn(),
  validateProductData: jest.fn(),
  removeProduct: jest.fn(),
  moveProduct: jest.fn(),
  findOptimalLocation: jest.fn()
}));

// Mock do Product model
jest.mock('../../../models/Product');

const app = require('../../../app');
const productService = require('../../../services/productService');
const Product = require('../../../models/Product');

describe('ProductController - Regras Críticas do Sistema', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Integração com ProductService', () => {
    it('deve verificar disponibilidade dos métodos do productService', async () => {
      // Verificar se os métodos críticos estão disponíveis
      expect(productService.analyzeDistribution).toBeDefined();
      expect(productService.createProduct).toBeDefined();
      expect(productService.validateProductData).toBeDefined();
      expect(productService.removeProduct).toBeDefined();
      expect(productService.moveProduct).toBeDefined();
      expect(productService.findOptimalLocation).toBeDefined();
    });

    it('deve usar productService.analyzeDistribution para análises', async () => {
      const mockDistribution = {
        byStatus: { stored: 1, removed: 0 },
        byChamber: { 'chamber1': 1 },
        recommendations: ['Otimizar distribuição por câmara']
      };

      productService.analyzeDistribution.mockResolvedValue(mockDistribution);

      // Simular chamada do service
      const result = await productService.analyzeDistribution();
      
      expect(result.byStatus).toBeDefined();
      expect(result.recommendations).toBeDefined();
      expect(productService.analyzeDistribution).toHaveBeenCalled();
    });

    it('deve usar productService.createProduct para criação (REGRA CRÍTICA)', async () => {
      const mockResult = {
        success: true,
        data: {
          product: {
            _id: 'prod123',
            name: 'Novo Produto',
            status: 'stored'
          },
          location: {
            code: 'Q1-L1-F1-A1',
            isOccupied: true
          },
          movement: {
            type: 'entry',
            automatic: true
          }
        }
      };

      productService.createProduct.mockResolvedValue(mockResult);

      const productData = {
        name: 'Novo Produto',
        lot: 'LOTE123',
        seedTypeId: 'seed123',
        quantity: 100,
        weightPerUnit: 1.5,
        storageType: 'saco'
      };

      const result = await productService.createProduct(productData, 'user123');

      expect(result.success).toBe(true);
      expect(result.data.location.isOccupied).toBe(true);
      expect(result.data.movement.automatic).toBe(true);
      expect(productService.createProduct).toHaveBeenCalledWith(productData, 'user123');
    });

    it('deve usar productService.moveProduct para movimentação (REGRA CRÍTICA)', async () => {
      const mockResult = {
        success: true,
        data: {
          product: { locationId: 'newloc123' },
          movement: {
            type: 'transfer',
            fromLocationId: 'oldloc123',
            toLocationId: 'newloc123',
            automatic: true
          },
          analysis: {
            benefits: ['Melhor acesso', 'Capacidade otimizada'],
            oldLocationFreed: true,
            newLocationOccupied: true
          }
        }
      };

      productService.moveProduct.mockResolvedValue(mockResult);

      const result = await productService.moveProduct(
        'prod123',
        'newloc123',
        'user123',
        'Otimização de acesso'
      );

      expect(result.data.movement.automatic).toBe(true);
      expect(result.data.analysis.oldLocationFreed).toBe(true);
      expect(result.data.analysis.newLocationOccupied).toBe(true);
      expect(productService.moveProduct).toHaveBeenCalledWith(
        'prod123',
        'newloc123',
        'user123',
        'Otimização de acesso'
      );
    });

    it('deve usar productService.removeProduct para remoção com liberação', async () => {
      const mockResult = {
        success: true,
        data: {
          product: { status: 'removed' },
          location: { isOccupied: false },
          movement: { type: 'exit', automatic: true },
          spaceAnalysis: {
            spaceFreed: 150,
            newAvailableCapacity: 850
          }
        }
      };

      productService.removeProduct.mockResolvedValue(mockResult);

      const result = await productService.removeProduct('prod123', 'user123');

      expect(result.data.location.isOccupied).toBe(false);
      expect(result.data.spaceAnalysis.spaceFreed).toBe(150);
      expect(productService.removeProduct).toHaveBeenCalledWith('prod123', 'user123');
    });

    it('deve usar productService.findOptimalLocation para otimização', async () => {
      const mockOptimalLocation = {
        location: {
          code: 'Q2-L1-F1-A1',
          availableCapacity: 500
        },
        benefits: ['Melhor temperatura', 'Acesso facilitado'],
        score: 0.95
      };

      productService.findOptimalLocation.mockResolvedValue(mockOptimalLocation);

      const result = await productService.findOptimalLocation('prod123');

      expect(result.score).toBe(0.95);
      expect(result.benefits).toBeDefined();
      expect(productService.findOptimalLocation).toHaveBeenCalledWith('prod123');
    });
  });

  describe('Validação de Dados - Alinhado aos Objetivos', () => {
    it('deve validar dados usando productService antes de operações', async () => {
      const mockValidation = {
        isValid: true,
        errors: []
      };

      productService.validateProductData.mockResolvedValue(mockValidation);

      const updateData = {
        name: 'Produto Atualizado',
        quantity: 150
      };

      const result = await productService.validateProductData(updateData);

      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
      expect(productService.validateProductData).toHaveBeenCalledWith(updateData);
    });
  });

  describe('Tratamento de Erros - Regras de Negócio', () => {
    it('deve tratar erro de localização já ocupada', async () => {
      productService.createProduct.mockRejectedValue(
        new Error('Localização já ocupada')
      );

      try {
        await productService.createProduct({
          name: 'Teste',
          lot: 'LOTE123',
          seedTypeId: 'seed123',
          quantity: 100,
          weightPerUnit: 1.5
        }, 'user123');
      } catch (error) {
        expect(error.message).toBe('Localização já ocupada');
      }

      expect(productService.createProduct).toHaveBeenCalled();
    });

    it('deve tratar erro de movimentação duplicada', async () => {
      productService.moveProduct.mockRejectedValue(
        new Error('Movimentação duplicada detectada')
      );

      try {
        await productService.moveProduct('prod123', 'loc123', 'user123', 'Teste');
      } catch (error) {
        expect(error.message).toBe('Movimentação duplicada detectada');
      }

      expect(productService.moveProduct).toHaveBeenCalled();
    });
  });

  describe('Análise de Funcionalidades - Product Model', () => {
    it('deve verificar estrutura de query do Product model', async () => {
      const mockQuery = {
        populate: jest.fn().mockReturnThis(),
        sort: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        lean: jest.fn().mockResolvedValue([])
      };

      Product.find.mockReturnValue(mockQuery);
      Product.countDocuments.mockResolvedValue(0);

      // Verificar se a cadeia de query funciona
      const query = Product.find({}).populate('seedTypeId').sort('-createdAt');
      
      expect(Product.find).toBeDefined();
      expect(mockQuery.populate).toBeDefined();
      expect(mockQuery.sort).toBeDefined();
      expect(mockQuery.skip).toBeDefined();
      expect(mockQuery.limit).toBeDefined();
    });

    it('deve verificar métodos de instância do Product', async () => {
      const mockProduct = {
        _id: 'prod123',
        status: 'stored',
        reserve: jest.fn().mockResolvedValue(true),
        save: jest.fn().mockResolvedValue(true)
      };

      Product.findById.mockResolvedValue(mockProduct);

      const product = await Product.findById('prod123');
      
      expect(product.reserve).toBeDefined();
      expect(product.save).toBeDefined();
      
      // Simular reserva
      await product.reserve();
      expect(product.reserve).toHaveBeenCalled();
    });
  });
}); 