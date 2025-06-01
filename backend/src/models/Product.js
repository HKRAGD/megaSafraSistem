const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do produto é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [200, 'Nome deve ter no máximo 200 caracteres']
  },
  lot: {
    type: String,
    required: [true, 'Lote é obrigatório'],
    trim: true,
    minlength: [1, 'Lote deve ter pelo menos 1 caractere'],
    maxlength: [50, 'Lote deve ter no máximo 50 caracteres'],
    index: true
  },
  seedTypeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SeedType',
    required: [true, 'Tipo de semente é obrigatório']
  },
  quantity: {
    type: Number,
    required: [true, 'Quantidade é obrigatória'],
    min: [1, 'Quantidade deve ser pelo menos 1'],
    validate: {
      validator: Number.isInteger,
      message: 'Quantidade deve ser um número inteiro'
    }
  },
  storageType: {
    type: String,
    required: [true, 'Tipo de armazenamento é obrigatório'],
    enum: {
      values: ['saco', 'bag'],
      message: 'Tipo de armazenamento deve ser: saco ou bag'
    }
  },
  weightPerUnit: {
    type: Number,
    required: [true, 'Peso por unidade é obrigatório'],
    min: [0.001, 'Peso por unidade deve ser pelo menos 0.001kg'],
    max: [1000, 'Peso por unidade não pode exceder 1000kg'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value) && value > 0;
      },
      message: 'Peso por unidade deve ser um número positivo'
    }
  },
  totalWeight: {
    type: Number,
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value) && value > 0;
      },
      message: 'Peso total deve ser um número positivo'
    }
  },
  locationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Location',
    required: [true, 'Localização é obrigatória']
  },
  entryDate: {
    type: Date,
    default: Date.now,
    required: [true, 'Data de entrada é obrigatória']
  },
  expirationDate: {
    type: Date,
    validate: {
      validator: function(value) {
        return !value || value > this.entryDate;
      },
      message: 'Data de expiração deve ser posterior à data de entrada'
    }
  },
  status: {
    type: String,
    enum: {
      values: ['stored', 'reserved', 'removed'],
      message: 'Status deve ser: stored, reserved ou removed'
    },
    default: 'stored'
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas devem ter no máximo 1000 caracteres']
  },
  // Campos adicionais para rastreabilidade
  tracking: {
    batchNumber: {
      type: String,
      trim: true,
      maxlength: [50, 'Número do lote deve ter no máximo 50 caracteres']
    },
    origin: {
      type: String,
      trim: true,
      maxlength: [200, 'Origem deve ter no máximo 200 caracteres']
    },
    supplier: {
      type: String,
      trim: true,
      maxlength: [200, 'Fornecedor deve ter no máximo 200 caracteres']
    },
    qualityGrade: {
      type: String,
      enum: ['A', 'B', 'C', 'D'],
      index: true
    }
  },
  // Metadados de controle
  metadata: {
    lastMovementDate: {
      type: Date,
      default: Date.now
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
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
productSchema.index({ lot: 1, seedTypeId: 1 });
productSchema.index({ locationId: 1 });
productSchema.index({ status: 1 });
productSchema.index({ expirationDate: 1 });
productSchema.index({ 'tracking.qualityGrade': 1 });
productSchema.index({ createdAt: -1 });
productSchema.index({ entryDate: -1 });

// Índice composto para unicidade de produto ativo por localização
productSchema.index(
  { locationId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: 'stored' },
    name: 'one_product_per_location'
  }
);

// Virtual para calcular peso total automaticamente
productSchema.virtual('calculatedTotalWeight').get(function() {
  return this.quantity * this.weightPerUnit;
});

// Virtual para verificar se está próximo do vencimento
productSchema.virtual('isNearExpiration').get(function() {
  if (!this.expirationDate) return false;
  
  const today = new Date();
  const daysUntilExpiration = Math.ceil((this.expirationDate - today) / (1000 * 60 * 60 * 24));
  return daysUntilExpiration <= 30; // 30 dias antes do vencimento
});

// Virtual para status de vencimento
productSchema.virtual('expirationStatus').get(function() {
  if (!this.expirationDate) return 'no-expiration';
  
  const today = new Date();
  const daysUntilExpiration = Math.ceil((this.expirationDate - today) / (1000 * 60 * 60 * 24));
  
  if (daysUntilExpiration < 0) return 'expired';
  if (daysUntilExpiration <= 7) return 'critical';
  if (daysUntilExpiration <= 30) return 'warning';
  return 'good';
});

// Virtual para tempo de armazenamento
productSchema.virtual('storageTimeDays').get(function() {
  const today = new Date();
  return Math.floor((today - this.entryDate) / (1000 * 60 * 60 * 24));
});

// Middleware para calcular peso total automaticamente
productSchema.pre('save', function(next) {
  // Calcular peso total se não fornecido
  if (!this.totalWeight || this.isModified('quantity') || this.isModified('weightPerUnit')) {
    this.totalWeight = this.quantity * this.weightPerUnit;
  }
  
  // Arredondar peso total para 3 casas decimais
  this.totalWeight = Math.round(this.totalWeight * 1000) / 1000;
  
  next();
});

// Middleware para validar localização única - REGRA CRÍTICA
productSchema.pre('save', async function(next) {
  // Verificar se a localização já está ocupada por outro produto ativo
  if (this.status === 'stored' && (this.isNew || this.isModified('locationId'))) {
    const existingProduct = await this.constructor.findOne({
      locationId: this.locationId,
      status: 'stored',
      _id: { $ne: this._id }
    });
    
    if (existingProduct) {
      return next(new Error(`Localização já ocupada pelo produto: ${existingProduct.name} (${existingProduct.lot})`));
    }
  }
  
  next();
});

// Middleware para calcular data de expiração baseada no tipo de semente
productSchema.pre('save', async function(next) {
  if (!this.expirationDate && this.seedTypeId) {
    try {
      const SeedType = mongoose.model('SeedType');
      const seedType = await SeedType.findById(this.seedTypeId);
      
      if (seedType && seedType.maxStorageTimeDays) {
        this.expirationDate = seedType.calculateExpirationDate(this.entryDate);
      }
    } catch (error) {
      // Se não conseguir calcular, continua sem data de expiração
      console.warn('Não foi possível calcular data de expiração:', error.message);
    }
  }
  
  next();
});

// Middleware para registrar movimentação automática - REGRA CRÍTICA
productSchema.post('save', async function(doc, next) {
  try {
    const Movement = mongoose.model('Movement');
    
    // Determinar tipo de movimentação
    let movementType = 'entry';
    let reason = 'Entrada de produto';
    
    if (doc.isNew) {
      movementType = 'entry';
      reason = 'Cadastro inicial do produto';
    } else {
      // Verificar se houve mudança de localização
      if (doc.isModified('locationId')) {
        movementType = 'transfer';
        reason = 'Transferência de localização';
      } else if (doc.isModified('quantity') || doc.isModified('weightPerUnit')) {
        movementType = 'adjustment';
        reason = 'Ajuste de quantidade/peso';
      } else if (doc.isModified('status') && doc.status === 'removed') {
        movementType = 'exit';
        reason = 'Remoção do produto';
      } else {
        // Outras modificações não geram movimentação
        return next();
      }
    }
    
    // Criar registro de movimentação
    await Movement.create({
      productId: doc._id,
      type: movementType,
      toLocationId: doc.locationId,
      quantity: doc.quantity,
      weight: doc.totalWeight,
      userId: doc.metadata?.lastModifiedBy || doc.metadata?.createdBy,
      reason,
      notes: `Movimentação automática: ${reason}`
    });
    
  } catch (error) {
    console.error('Erro ao registrar movimentação automática:', error);
  }
  
  next();
});

// Middleware para atualizar peso na localização
productSchema.post('save', async function(doc, next) {
  try {
    const Location = mongoose.model('Location');
    const location = await Location.findById(doc.locationId);
    
    if (location && doc.status === 'stored') {
      // Verificar se a localização pode acomodar o peso
      if (!location.canAccommodateWeight(doc.totalWeight)) {
        console.warn(`Aviso: Produto ${doc.name} excede capacidade da localização ${location.code}`);
      }
    }
  } catch (error) {
    console.error('Erro ao validar capacidade da localização:', error);
  }
  
  next();
});

// Método de instância para mover produto para nova localização
productSchema.methods.moveTo = async function(newLocationId, userId, reason = 'Movimentação manual') {
  const Location = mongoose.model('Location');
  const newLocation = await Location.findById(newLocationId);
  
  if (!newLocation) {
    throw new Error('Nova localização não encontrada');
  }
  
  // Verificar se nova localização pode acomodar o produto
  if (!newLocation.canAccommodateWeight(this.totalWeight)) {
    throw new Error(`Nova localização não tem capacidade suficiente. Disponível: ${newLocation.availableCapacityKg}kg`);
  }
  
  // Verificar se nova localização está ocupada
  const existingProduct = await this.constructor.findOne({
    locationId: newLocationId,
    status: 'stored',
    _id: { $ne: this._id }
  });
  
  if (existingProduct) {
    throw new Error(`Nova localização já está ocupada pelo produto: ${existingProduct.name} (${existingProduct.lot})`);
  }
  
  const oldLocationId = this.locationId;
  this.locationId = newLocationId;
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  
  // Registrar movimentação será feito automaticamente pelo middleware
  await this.save();
  
  return {
    fromLocation: oldLocationId,
    toLocation: newLocationId,
    product: this
  };
};

// Método de instância para remover produto
productSchema.methods.remove = async function(userId, reason = 'Remoção manual') {
  this.status = 'removed';
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  
  await this.save();
  
  return this;
};

// Método de instância para reservar produto
productSchema.methods.reserve = async function(userId, reason = 'Reserva manual') {
  if (this.status !== 'stored') {
    throw new Error('Apenas produtos armazenados podem ser reservados');
  }
  
  this.status = 'reserved';
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  
  await this.save();
  
  return this;
};

// Método estático para buscar produtos por status
productSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .sort({ createdAt: -1 });
};

// Método estático para buscar produtos próximos ao vencimento
productSchema.statics.findNearExpiration = function(days = 30) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  return this.find({
    status: { $in: ['stored', 'reserved'] },
    expirationDate: { 
      $lte: targetDate,
      $gte: new Date()
    }
  })
  .populate('seedTypeId', 'name')
  .populate('locationId', 'code coordinates chamberId')
  .sort({ expirationDate: 1 });
};

// Método estático para buscar produtos vencidos
productSchema.statics.findExpired = function() {
  return this.find({
    status: { $in: ['stored', 'reserved'] },
    expirationDate: { $lt: new Date() }
  })
  .populate('seedTypeId', 'name')
  .populate('locationId', 'code coordinates chamberId')
  .sort({ expirationDate: 1 });
};

// Método estático para buscar por localização
productSchema.statics.findByLocation = function(locationId) {
  return this.find({ locationId, status: { $ne: 'removed' } })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .sort({ createdAt: -1 });
};

// Método estático para buscar por tipo de semente
productSchema.statics.findBySeedType = function(seedTypeId) {
  return this.find({ seedTypeId, status: { $ne: 'removed' } })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .sort({ createdAt: -1 });
};

// Método estático para relatório de estoque
productSchema.statics.getInventoryReport = async function() {
  const summary = await this.aggregate([
    { $match: { status: { $in: ['stored', 'reserved'] } } },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalWeight: { $sum: '$totalWeight' },
        totalQuantity: { $sum: '$quantity' }
      }
    }
  ]);
  
  const bySeedType = await this.aggregate([
    { $match: { status: { $in: ['stored', 'reserved'] } } },
    {
      $lookup: {
        from: 'seedtypes',
        localField: 'seedTypeId',
        foreignField: '_id',
        as: 'seedType'
      }
    },
    { $unwind: '$seedType' },
    {
      $group: {
        _id: {
          seedTypeId: '$seedTypeId',
          seedTypeName: '$seedType.name'
        },
        count: { $sum: 1 },
        totalWeight: { $sum: '$totalWeight' },
        totalQuantity: { $sum: '$quantity' }
      }
    },
    { $sort: { totalWeight: -1 } }
  ]);
  
  return {
    summary,
    bySeedType,
    lastUpdated: new Date()
  };
};

// Método estático para estatísticas
productSchema.statics.getStats = async function() {
  const totalStats = await this.aggregate([
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        totalWeight: { $sum: '$totalWeight' }
      }
    }
  ]);
  
  const expirationStats = await this.aggregate([
    { $match: { status: { $in: ['stored', 'reserved'] } } },
    {
      $project: {
        daysUntilExpiration: {
          $cond: {
            if: { $ne: ['$expirationDate', null] },
            then: {
              $divide: [
                { $subtract: ['$expirationDate', new Date()] },
                1000 * 60 * 60 * 24
              ]
            },
            else: 999
          }
        }
      }
    },
    {
      $group: {
        _id: {
          $switch: {
            branches: [
              { case: { $lt: ['$daysUntilExpiration', 0] }, then: 'expired' },
              { case: { $lt: ['$daysUntilExpiration', 7] }, then: 'critical' },
              { case: { $lt: ['$daysUntilExpiration', 30] }, then: 'warning' }
            ],
            default: 'good'
          }
        },
        count: { $sum: 1 }
      }
    }
  ]);
  
  return {
    byStatus: totalStats,
    byExpiration: expirationStats,
    total: await this.countDocuments(),
    active: await this.countDocuments({ status: { $in: ['stored', 'reserved'] } })
  };
};

module.exports = mongoose.model('Product', productSchema); 