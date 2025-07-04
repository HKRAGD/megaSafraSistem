const mongoose = require('mongoose');
const { v4: uuidv4 } = require('uuid');

/**
 * ProductBatch Model - Modelo para gerenciar grupos/lotes de produtos
 * 
 * Funcionalidade: Permite nomear e organizar produtos criados em lote
 * Relação: Um ProductBatch pode ter vários Products (referenciados pelo batchId)
 * 
 * IMPORTANTE: 
 * - Usa UUID como _id para manter compatibilidade com batchId existente nos Products
 * - Campo 'name' permite personalizar o nome do grupo (ex: "Fornecedor A - Pedido 123")
 * - Fallback para "Lote de Produtos" quando não especificado
 */
const productBatchSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: () => uuidv4(),
    required: true,
    validate: {
      validator: function(value) {
        // Validar formato UUID v4
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
        return uuidRegex.test(value);
      },
      message: 'ID do lote deve ser um UUID válido'
    }
  },
  name: {
    type: String,
    required: [true, 'Nome do lote é obrigatório'],
    trim: true,
    minlength: [3, 'Nome do lote deve ter pelo menos 3 caracteres'],
    maxlength: [100, 'Nome do lote deve ter no máximo 100 caracteres'],
    validate: {
      validator: function(value) {
        // Não permitir apenas espaços em branco
        return value && value.trim().length >= 3;
      },
      message: 'Nome do lote não pode estar vazio ou conter apenas espaços'
    }
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: [true, 'Cliente do lote é obrigatório'],
    validate: {
      validator: function(value) {
        return mongoose.Types.ObjectId.isValid(value);
      },
      message: 'ID do cliente deve ser um ObjectId válido'
    }
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição não pode exceder 500 caracteres'],
    default: ''
  },
  metadata: {
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuário criador é obrigatório']
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Usuário modificador é obrigatório']
    },
    totalProducts: {
      type: Number,
      min: [0, 'Total de produtos não pode ser negativo'],
      default: 0
    },
    totalWeight: {
      type: Number,
      min: [0, 'Peso total não pode ser negativo'],
      default: 0
    }
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  collection: 'productbatches', // Nome explícito da collection
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      // Customizar saída JSON
      ret.id = ret._id;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// ============================================================================
// ÍNDICES PARA PERFORMANCE
// ============================================================================

// Índice no clientId para consultas rápidas por cliente
productBatchSchema.index({ clientId: 1 });

// Índice composto para consultas por cliente e data
productBatchSchema.index({ clientId: 1, createdAt: -1 });

// Índice no nome para busca textual (case-insensitive)
productBatchSchema.index({ name: 1 });

// ============================================================================
// MÉTODOS VIRTUAIS
// ============================================================================

// Virtual para calcular idade do lote em dias
productBatchSchema.virtual('ageInDays').get(function() {
  const now = new Date();
  const createdAt = this.createdAt;
  return Math.floor((now - createdAt) / (1000 * 60 * 60 * 24));
});

// Virtual para status baseado na idade
productBatchSchema.virtual('status').get(function() {
  const ageInDays = this.ageInDays;
  if (ageInDays <= 1) return 'RECENTE';
  if (ageInDays <= 7) return 'NORMAL';
  if (ageInDays <= 30) return 'ANTIGO';
  return 'MUITO_ANTIGO';
});

// ============================================================================
// MÉTODOS DE INSTÂNCIA
// ============================================================================

/**
 * Atualizar estatísticas do lote (total de produtos e peso)
 * @param {Number} productCount - Número total de produtos
 * @param {Number} totalWeight - Peso total dos produtos
 */
productBatchSchema.methods.updateStatistics = function(productCount, totalWeight) {
  this.metadata.totalProducts = productCount || 0;
  this.metadata.totalWeight = totalWeight || 0;
  return this.save();
};

/**
 * Verificar se o lote está vazio (sem produtos)
 * @returns {Boolean}
 */
productBatchSchema.methods.isEmpty = function() {
  return this.metadata.totalProducts === 0;
};

// ============================================================================
// MÉTODOS ESTÁTICOS
// ============================================================================

/**
 * Buscar lotes por cliente com estatísticas
 * @param {String} clientId - ID do cliente
 * @param {Object} options - Opções de busca (limit, sort, etc.)
 */
productBatchSchema.statics.findByClientWithStats = function(clientId, options = {}) {
  const { limit = 10, sort = '-createdAt' } = options;
  
  return this.find({ clientId })
    .populate('clientId', 'name contactPerson')
    .populate('metadata.createdBy', 'name email')
    .sort(sort)
    .limit(limit)
    .lean();
};

/**
 * Buscar lotes com produtos pendentes de alocação
 */
productBatchSchema.statics.findPendingAllocation = function() {
  // Este método será usado pelo aggregation pipeline no controller
  return this.find({})
    .populate('clientId', 'name contactPerson')
    .populate('metadata.createdBy', 'name email')
    .sort('-createdAt')
    .lean();
};

// ============================================================================
// MIDDLEWARE PRE/POST
// ============================================================================

// Middleware para validar cliente antes de salvar
productBatchSchema.pre('save', async function(next) {
  if (this.isNew || this.isModified('clientId')) {
    try {
      const Client = mongoose.model('Client');
      const client = await Client.findById(this.clientId);
      
      if (!client) {
        throw new Error('Cliente não encontrado');
      }
      
      if (!client.isActive) {
        throw new Error('Cliente está inativo');
      }
    } catch (error) {
      return next(error);
    }
  }
  next();
});

// Middleware para log de criação
productBatchSchema.post('save', function(doc) {
  if (doc.isNew) {
    console.log(`✅ ProductBatch criado: ${doc.name} (ID: ${doc._id})`);
  }
});

// ============================================================================
// CRIAÇÃO DO MODEL
// ============================================================================

const ProductBatch = mongoose.model('ProductBatch', productBatchSchema);

module.exports = ProductBatch;