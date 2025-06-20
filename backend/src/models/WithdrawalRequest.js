const mongoose = require('mongoose');

const withdrawalRequestSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'ID do produto é obrigatório']
  },
  requestedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário solicitante é obrigatório']
  },
  status: {
    type: String,
    enum: {
      values: ['PENDENTE', 'CONFIRMADO', 'CANCELADO'],
      message: 'Status deve ser: PENDENTE, CONFIRMADO ou CANCELADO'
    },
    default: 'PENDENTE'
  },
  type: {
    type: String,
    enum: {
      values: ['TOTAL', 'PARCIAL'],
      message: 'Tipo deve ser: TOTAL ou PARCIAL'
    },
    required: [true, 'Tipo de retirada é obrigatório']
  },
  quantityRequested: {
    type: Number,
    min: [1, 'Quantidade solicitada deve ser pelo menos 1'],
    validate: {
      validator: function(value) {
        // Quantidade é obrigatória apenas para retirada parcial
        if (this.type === 'PARCIAL') {
          return value && value > 0;
        }
        return true;
      },
      message: 'Quantidade é obrigatória para retirada parcial'
    }
  },
  reason: {
    type: String,
    trim: true,
    maxlength: [500, 'Motivo deve ter no máximo 500 caracteres']
  },
  requestedAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  confirmedAt: {
    type: Date
  },
  confirmedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  canceledAt: {
    type: Date
  },
  canceledBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas devem ter no máximo 1000 caracteres']
  },
  // Metadados para auditoria
  metadata: {
    originalProductData: {
      name: String,
      lot: String,
      quantity: Number,
      totalWeight: Number,
      locationCode: String
    },
    systemNotes: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices para performance
withdrawalRequestSchema.index({ productId: 1 });
withdrawalRequestSchema.index({ requestedBy: 1 });
withdrawalRequestSchema.index({ status: 1 });
withdrawalRequestSchema.index({ requestedAt: -1 });
withdrawalRequestSchema.index({ confirmedAt: -1 });

// Índice composto para buscar solicitações pendentes
withdrawalRequestSchema.index({ status: 1, requestedAt: -1 });

// Virtual para tempo de espera
withdrawalRequestSchema.virtual('waitingTimeDays').get(function() {
  const endDate = this.confirmedAt || this.canceledAt || new Date();
  return Math.floor((endDate - this.requestedAt) / (1000 * 60 * 60 * 24));
});

// Virtual para status de urgência
withdrawalRequestSchema.virtual('urgencyStatus').get(function() {
  if (this.status !== 'PENDENTE') return 'resolved';
  
  const daysPending = Math.floor((new Date() - this.requestedAt) / (1000 * 60 * 60 * 24));
  
  if (daysPending > 7) return 'overdue';
  if (daysPending > 3) return 'urgent';
  return 'normal';
});

// Middleware para validar produto antes de criar solicitação
withdrawalRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    try {
      const Product = mongoose.model('Product');
      const product = await Product.findById(this.productId);
      
      if (!product) {
        return next(new Error('Produto não encontrado'));
      }
      
      if (product.status !== 'LOCADO') {
        return next(new Error('Apenas produtos locados podem ter retirada solicitada'));
      }
      
      // Para retirada parcial, validar quantidade
      if (this.type === 'PARCIAL') {
        if (!this.quantityRequested || this.quantityRequested >= product.quantity) {
          return next(new Error('Quantidade para retirada parcial deve ser menor que a quantidade total do produto'));
        }
      }
      
      // Salvar dados originais do produto para auditoria
      this.metadata.originalProductData = {
        name: product.name,
        lot: product.lot,
        quantity: product.quantity,
        totalWeight: product.totalWeight,
        locationCode: product.locationId ? 'Localizado' : 'Sem localização'
      };
      
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Método de instância para confirmar retirada
withdrawalRequestSchema.methods.confirm = async function(userId, notes = '') {
  if (this.status !== 'PENDENTE') {
    throw new Error('Apenas solicitações pendentes podem ser confirmadas');
  }
  
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.productId);
  
  if (!product) {
    throw new Error('Produto não encontrado');
  }
  
  if (product.status !== 'AGUARDANDO_RETIRADA') {
    throw new Error('Produto não está aguardando retirada');
  }
  
  // Atualizar solicitação
  this.status = 'CONFIRMADO';
  this.confirmedAt = new Date();
  this.confirmedBy = userId;
  this.notes = notes;
  this.metadata.systemNotes = `Retirada confirmada em ${new Date().toISOString()}`;
  
  // Atualizar produto
  const quantityToWithdraw = this.type === 'PARCIAL' ? this.quantityRequested : null;
  await product.confirmWithdrawal(userId, quantityToWithdraw, `Confirmação da solicitação de retirada: ${this._id}`);
  
  await this.save();
  
  return this;
};

// Método de instância para cancelar solicitação
withdrawalRequestSchema.methods.cancel = async function(userId, reason = '') {
  if (this.status !== 'PENDENTE') {
    throw new Error('Apenas solicitações pendentes podem ser canceladas');
  }
  
  const Product = mongoose.model('Product');
  const product = await Product.findById(this.productId);
  
  if (product && product.status === 'AGUARDANDO_RETIRADA') {
    // Reverter produto para LOCADO
    product.status = 'LOCADO';
    product.metadata.lastModifiedBy = userId;
    product.version += 1;
    await product.save();
  }
  
  // Atualizar solicitação
  this.status = 'CANCELADO';
  this.canceledAt = new Date();
  this.canceledBy = userId;
  this.reason = reason;
  this.metadata.systemNotes = `Solicitação cancelada em ${new Date().toISOString()}: ${reason}`;
  
  await this.save();
  
  return this;
};

// Método estático para buscar solicitações pendentes
withdrawalRequestSchema.statics.findPending = function() {
  return this.find({ status: 'PENDENTE' })
    .populate('productId', 'name lot quantity totalWeight status')
    .populate('requestedBy', 'name email')
    .sort({ requestedAt: -1 });
};

// Método estático para buscar por produto
withdrawalRequestSchema.statics.findByProduct = function(productId) {
  return this.find({ productId })
    .populate('requestedBy', 'name email')
    .populate('confirmedBy', 'name email')
    .populate('canceledBy', 'name email')
    .sort({ requestedAt: -1 });
};

// Método estático para buscar por solicitante
withdrawalRequestSchema.statics.findByRequester = function(userId) {
  return this.find({ requestedBy: userId })
    .populate('productId', 'name lot quantity totalWeight status')
    .sort({ requestedAt: -1 });
};

// Método estático para relatório de solicitações
withdrawalRequestSchema.statics.getReport = async function(dateRange = {}) {
  const matchStage = {};
  
  if (dateRange.start || dateRange.end) {
    matchStage.requestedAt = {};
    if (dateRange.start) matchStage.requestedAt.$gte = new Date(dateRange.start);
    if (dateRange.end) matchStage.requestedAt.$lte = new Date(dateRange.end);
  }
  
  const summary = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        avgWaitingTime: {
          $avg: {
            $divide: [
              {
                $subtract: [
                  { $ifNull: ['$confirmedAt', '$canceledAt'] },
                  '$requestedAt'
                ]
              },
              1000 * 60 * 60 * 24 // Converter para dias
            ]
          }
        }
      }
    }
  ]);
  
  const byType = await this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    summary,
    byType,
    total: await this.countDocuments(matchStage),
    lastUpdated: new Date()
  };
};

// Método estático para estatísticas
withdrawalRequestSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 }
      }
    }
  ]);
  
  const urgencyStats = await this.aggregate([
    { $match: { status: 'PENDENTE' } },
    {
      $project: {
        daysPending: {
          $divide: [
            { $subtract: [new Date(), '$requestedAt'] },
            1000 * 60 * 60 * 24
          ]
        }
      }
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $gt: ['$daysPending', 7] }, then: 'overdue' },
              { case: { $gt: ['$daysPending', 3] }, then: 'urgent' }
            ],
            default: 'normal'
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    byStatus: stats,
    byUrgency: urgencyStats,
    total: await this.countDocuments(),
    pending: await this.countDocuments({ status: 'PENDENTE' })
  };
};

module.exports = mongoose.model('WithdrawalRequest', withdrawalRequestSchema);