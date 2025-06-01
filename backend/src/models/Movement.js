const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema({
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'ID do produto é obrigatório']
  },
  type: {
    type: String,
    required: [true, 'Tipo de movimentação é obrigatório'],
    enum: {
      values: ['entry', 'exit', 'transfer', 'adjustment'],
      message: 'Tipo deve ser: entry, exit, transfer ou adjustment'
    },
    index: true
  },
  fromLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    validate: {
      validator: function(value) {
        // fromLocationId é obrigatório apenas para transfers
        if (this.type === 'transfer') {
          return value != null;
        }
        return true;
      },
      message: 'Localização de origem é obrigatória para transferências'
    }
  },
  toLocationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    validate: {
      validator: function(value) {
        // toLocationId é obrigatório para entry, transfer e adjustment
        if (['entry', 'transfer', 'adjustment'].includes(this.type)) {
          return value != null;
        }
        return true;
      },
      message: 'Localização de destino é obrigatória para esta operação'
    }
  },
  quantity: {
    type: Number,
    required: [true, 'Quantidade é obrigatória'],
    min: [0, 'Quantidade não pode ser negativa'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value) && value >= 0;
      },
      message: 'Quantidade deve ser um número válido'
    }
  },
  weight: {
    type: Number,
    required: [true, 'Peso é obrigatório'],
    min: [0, 'Peso não pode ser negativo'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value) && value >= 0;
      },
      message: 'Peso deve ser um número válido'
    }
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Usuário responsável é obrigatório']
  },
  reason: {
    type: String,
    required: [true, 'Motivo da movimentação é obrigatório'],
    trim: true,
    minlength: [3, 'Motivo deve ter pelo menos 3 caracteres'],
    maxlength: [200, 'Motivo deve ter no máximo 200 caracteres']
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas devem ter no máximo 1000 caracteres']
  },
  timestamp: {
    type: Date,
    default: Date.now,
    required: [true, 'Timestamp é obrigatório'],
    index: true
  },
  // Campos para auditoria e controle
  metadata: {
    ipAddress: {
      type: String,
      trim: true,
      maxlength: [45, 'Endereço IP inválido'] // IPv6 max length
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User Agent muito longo']
    },
    sessionId: {
      type: String,
      trim: true,
      maxlength: [100, 'Session ID muito longo']
    },
    batchId: {
      type: String,
      trim: true,
      maxlength: [50, 'Batch ID muito longo'],
      index: true // Para operações em lote
    },
    isAutomatic: {
      type: Boolean,
      default: false,
      index: true
    },
    previousValues: {
      type: mongoose.Schema.Types.Mixed // Para armazenar valores anteriores em adjustments
    }
  },
  // Status da movimentação
  status: {
    type: String,
    enum: {
      values: ['pending', 'completed', 'failed', 'cancelled'],
      message: 'Status deve ser: pending, completed, failed ou cancelled'
    },
    default: 'completed',
    index: true
  },
  // Campos para validação e controle
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    verifiedAt: {
      type: Date
    },
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notas de verificação muito longas']
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

// Índices para performance e consultas
movementSchema.index({ productId: 1, timestamp: -1 });
movementSchema.index({ userId: 1, timestamp: -1 });
movementSchema.index({ fromLocationId: 1, timestamp: -1 });
movementSchema.index({ toLocationId: 1, timestamp: -1 });
movementSchema.index({ type: 1, timestamp: -1 });
movementSchema.index({ status: 1 });
movementSchema.index({ 'metadata.batchId': 1 });
movementSchema.index({ 'metadata.isAutomatic': 1 });
movementSchema.index({ timestamp: -1 }); // Para ordenação cronológica

// Índice composto para relatórios por período
movementSchema.index({ timestamp: -1, type: 1, status: 1 });

// Virtual para duração desde a movimentação
movementSchema.virtual('timeSinceMovement').get(function() {
  const now = new Date();
  const diffMs = now - this.timestamp;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffDays > 0) return `${diffDays} dias atrás`;
  if (diffHours > 0) return `${diffHours} horas atrás`;
  if (diffMinutes > 0) return `${diffMinutes} minutos atrás`;
  return 'Agora';
});

// Virtual para tipo de movimentação em português
movementSchema.virtual('typeDescription').get(function() {
  const descriptions = {
    'entry': 'Entrada',
    'exit': 'Saída',
    'transfer': 'Transferência',
    'adjustment': 'Ajuste'
  };
  return descriptions[this.type] || this.type;
});

// Virtual para descrição completa da movimentação
movementSchema.virtual('description').get(function() {
  const typeDesc = this.typeDescription;
  
  switch (this.type) {
    case 'entry':
      return `${typeDesc} de ${this.quantity} unidades (${this.weight}kg)`;
    case 'exit':
      return `${typeDesc} de ${this.quantity} unidades (${this.weight}kg)`;
    case 'transfer':
      return `${typeDesc} de ${this.quantity} unidades (${this.weight}kg)`;
    case 'adjustment':
      return `${typeDesc} para ${this.quantity} unidades (${this.weight}kg)`;
    default:
      return `${typeDesc}: ${this.quantity} unidades (${this.weight}kg)`;
  }
});

// Middleware para validação de dados
movementSchema.pre('save', function(next) {
  // Validar que transfer tem fromLocationId
  if (this.type === 'transfer' && !this.fromLocationId) {
    return next(new Error('Transferência deve ter localização de origem'));
  }
  
  // Validar que exit não tem toLocationId desnecessário
  if (this.type === 'exit' && this.toLocationId) {
    this.toLocationId = undefined;
  }
  
  // Arredondar peso para 3 casas decimais
  this.weight = Math.round(this.weight * 1000) / 1000;
  
  next();
});

// Middleware para evitar movimentações duplicadas
movementSchema.pre('save', async function(next) {
  if (this.isNew && !this.metadata?.isAutomatic) {
    // Verificar se já existe uma movimentação idêntica nos últimos 5 minutos
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    
    const existingMovement = await this.constructor.findOne({
      productId: this.productId,
      type: this.type,
      quantity: this.quantity,
      weight: this.weight,
      userId: this.userId,
      timestamp: { $gte: fiveMinutesAgo },
      status: { $ne: 'cancelled' }
    });
    
    if (existingMovement) {
      return next(new Error('Movimentação duplicada detectada'));
    }
  }
  
  next();
});

// Método de instância para verificar movimentação
movementSchema.methods.verify = async function(verifiedBy, notes = '') {
  this.verification.isVerified = true;
  this.verification.verifiedBy = verifiedBy;
  this.verification.verifiedAt = new Date();
  this.verification.verificationNotes = notes;
  
  return await this.save();
};

// Método de instância para cancelar movimentação
movementSchema.methods.cancel = async function(userId, reason) {
  if (this.status === 'completed') {
    // Lógica para reverter movimentação se necessário
    // Isso depende do tipo de movimentação e regras de negócio
  }
  
  this.status = 'cancelled';
  this.notes = (this.notes || '') + `\nCancelada por: ${reason}`;
  this.metadata.lastModifiedBy = userId;
  
  return await this.save();
};

// Método estático para buscar movimentações por produto
movementSchema.statics.findByProduct = function(productId, limit = 50) {
  return this.find({ productId })
    .populate('userId', 'name email')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Método estático para buscar movimentações por localização
movementSchema.statics.findByLocation = function(locationId, limit = 50) {
  return this.find({
    $or: [
      { fromLocationId: locationId },
      { toLocationId: locationId }
    ]
  })
  .populate('productId', 'name lot')
  .populate('userId', 'name email')
  .populate('fromLocationId', 'code coordinates')
  .populate('toLocationId', 'code coordinates')
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Método estático para buscar movimentações por usuário
movementSchema.statics.findByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .populate('productId', 'name lot')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates')
    .sort({ timestamp: -1 })
    .limit(limit);
};

// Método estático para buscar movimentações por período
movementSchema.statics.findByDateRange = function(startDate, endDate, filters = {}) {
  const query = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    ...filters
  };
  
  return this.find(query)
    .populate('productId', 'name lot')
    .populate('userId', 'name email')
    .populate('fromLocationId', 'code coordinates')
    .populate('toLocationId', 'code coordinates')
    .sort({ timestamp: -1 });
};

// Método estático para relatório de movimentações
movementSchema.statics.getMovementReport = async function(startDate, endDate, groupBy = 'day') {
  const matchStage = {
    timestamp: {
      $gte: new Date(startDate),
      $lte: new Date(endDate)
    },
    status: { $ne: 'cancelled' }
  };

  let dateGrouping;
  switch (groupBy) {
    case 'hour':
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' },
        hour: { $hour: '$timestamp' }
      };
      break;
    case 'day':
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
      break;
    case 'month':
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' }
      };
      break;
    default:
      dateGrouping = {
        year: { $year: '$timestamp' },
        month: { $month: '$timestamp' },
        day: { $dayOfMonth: '$timestamp' }
      };
  }

  const pipeline = [
    { $match: matchStage },
    {
      $group: {
        _id: {
          date: dateGrouping,
          type: '$type'
        },
        count: { $sum: 1 },
        totalWeight: { $sum: '$weight' },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    {
      $group: {
        _id: '$_id.date',
        movements: {
          $push: {
            type: '$_id.type',
            count: '$count',
            totalWeight: '$totalWeight',
            totalQuantity: '$totalQuantity'
          }
        },
        totalMovements: { $sum: '$count' }
      }
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1, '_id.hour': 1 } }
  ];

  return await this.aggregate(pipeline);
};

// Método estático para estatísticas gerais
movementSchema.statics.getStats = async function(days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const stats = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: '$type',
        count: { $sum: 1 },
        totalWeight: { $sum: '$weight' },
        avgWeight: { $avg: '$weight' },
        totalQuantity: { $sum: '$quantity' }
      }
    }
  ]);

  const recent = await this.find({
    timestamp: { $gte: startDate },
    status: { $ne: 'cancelled' }
  }).countDocuments();

  const automatic = await this.find({
    timestamp: { $gte: startDate },
    'metadata.isAutomatic': true,
    status: { $ne: 'cancelled' }
  }).countDocuments();

  const verified = await this.find({
    timestamp: { $gte: startDate },
    'verification.isVerified': true,
    status: { $ne: 'cancelled' }
  }).countDocuments();

  return {
    byType: stats,
    summary: {
      total: recent,
      automatic,
      manual: recent - automatic,
      verified,
      verificationRate: recent > 0 ? Math.round((verified / recent) * 100) : 0
    },
    period: {
      days,
      startDate,
      endDate: new Date()
    }
  };
};

// Método estático para buscar movimentações não verificadas
movementSchema.statics.findUnverified = function(limit = 100) {
  return this.find({
    'verification.isVerified': false,
    status: 'completed',
    'metadata.isAutomatic': false
  })
  .populate('productId', 'name lot')
  .populate('userId', 'name email')
  .populate('fromLocationId', 'code')
  .populate('toLocationId', 'code')
  .sort({ timestamp: -1 })
  .limit(limit);
};

// Método estático para análise de padrões
movementSchema.statics.analyzePatterns = async function(days = 90) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const patterns = await this.aggregate([
    {
      $match: {
        timestamp: { $gte: startDate },
        status: { $ne: 'cancelled' }
      }
    },
    {
      $group: {
        _id: {
          hour: { $hour: '$timestamp' },
          dayOfWeek: { $dayOfWeek: '$timestamp' },
          type: '$type'
        },
        count: { $sum: 1 },
        avgWeight: { $avg: '$weight' }
      }
    },
    {
      $group: {
        _id: {
          hour: '$_id.hour',
          dayOfWeek: '$_id.dayOfWeek'
        },
        totalMovements: { $sum: '$count' },
        typeDistribution: {
          $push: {
            type: '$_id.type',
            count: '$count',
            avgWeight: '$avgWeight'
          }
        }
      }
    },
    { $sort: { '_id.dayOfWeek': 1, '_id.hour': 1 } }
  ]);

  return patterns;
};

module.exports = mongoose.model('Movement', movementSchema); 