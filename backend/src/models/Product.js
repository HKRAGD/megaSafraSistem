const mongoose = require('mongoose');
const { PRODUCT_STATUS, STORAGE_TYPE, EXPIRATION_STATUS, VALID_TRANSITIONS } = require('../utils/constants');

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
    maxlength: [50, 'Lote deve ter no máximo 50 caracteres']
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
      values: Object.values(STORAGE_TYPE),
      message: 'Tipo de armazenamento deve ser: saco ou bag'
    }
  },
  weightPerUnit: {
    type: Number,
    required: [true, 'Peso por unidade é obrigatório'],
    min: [0.001, 'Peso por unidade deve ser pelo menos 0.001kg'],
    max: [1500, 'Peso por unidade não pode exceder 1500kg'],
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
    required: false // MUDANÇA: Agora é opcional conforme especificação
  },
  clientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Client',
    required: false // Campo opcional para vincular produto a cliente
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
      values: Object.values(PRODUCT_STATUS),
      message: 'Status deve ser: CADASTRADO, AGUARDANDO_LOCACAO, LOCADO, AGUARDANDO_RETIRADA, RETIRADO ou REMOVIDO'
    },
    default: PRODUCT_STATUS.CADASTRADO
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas devem ter no máximo 1000 caracteres']
  },
  version: {
    type: Number,
    default: 0 // Para optimistic locking conforme especificação
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
      enum: ['A', 'B', 'C', 'D']
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
productSchema.index({ clientId: 1 }); // Índice para consultas por cliente

// Índice composto para unicidade de produto ativo por localização
productSchema.index(
  { locationId: 1, status: 1 },
  { 
    unique: true,
    partialFilterExpression: { status: PRODUCT_STATUS.LOCADO },
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

// Middleware para definir status inicial baseado na localização
productSchema.pre('save', function(next) {
  // Se é um novo produto, definir status baseado na localização
  if (this.isNew) {
    if (this.locationId) {
      this.status = 'LOCADO';
    } else {
      this.status = 'AGUARDANDO_LOCACAO';
    }
  }
  
  next();
});

// Middleware para validar localização única - REGRA CRÍTICA
productSchema.pre('save', async function(next) {
  // Verificar se a localização já está ocupada por outro produto ativo
  if (this.locationId && this.status === 'LOCADO' && (this.isNew || this.isModified('locationId'))) {
    const existingProduct = await this.constructor.findOne({
      locationId: this.locationId,
      status: 'LOCADO',
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
      } else if (doc.isModified('status') && doc.status === 'REMOVIDO') {
        movementType = 'exit';
        reason = 'Produto removido do sistema';
      } else {
        // Outras modificações não geram movimentação
        return next();
      }
    }
    
    // Criar registro de movimentação automática
    await Movement.create({
      productId: doc._id,
      type: movementType,
      toLocationId: doc.locationId,
      fromLocationId: movementType === 'exit' ? doc.locationId : null,
      quantity: doc.quantity,
      weight: doc.totalWeight,
      userId: doc.metadata?.lastModifiedBy || doc.metadata?.createdBy,
      reason,
      notes: `Movimentação automática: ${reason}`,
      metadata: {
        isAutomatic: true,
        verified: true
      }
    });
    
  } catch (error) {
    // Usar um logger mais robusto em produção
    console.error(`CRITICAL ERROR: Failed to register automatic movement for product ${doc._id}:`, error);
    // TODO: Implementar notificação para sistema de monitoramento
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
    status: PRODUCT_STATUS.LOCADO, // Usar a constante
    _id: { $ne: this._id }
  });
  
  if (existingProduct) {
    throw new Error(`Nova localização já está ocupada pelo produto: ${existingProduct.name} (${existingProduct.lot})`);
  }
  
  const oldLocationId = this.locationId;
  this.locationId = newLocationId;
  this.status = PRODUCT_STATUS.LOCADO; // Garantir status correto
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  this.version += 1; // Incrementar versão para optimistic locking
  
  // Registrar movimentação será feito automaticamente pelo middleware
  await this.save();
  
  return {
    fromLocation: oldLocationId,
    toLocation: newLocationId,
    product: this
  };
};

// Método de instância para localizar produto (OPERATOR)
productSchema.methods.locate = async function(locationId, userId, reason = 'Localização de produto') {
  if (this.status !== 'AGUARDANDO_LOCACAO') {
    throw new Error('Apenas produtos aguardando locação podem ser localizados');
  }
  
  // Verificar se localização está disponível
  const Location = mongoose.model('Location');
  const location = await Location.findById(locationId);
  
  if (!location) {
    throw new Error('Localização não encontrada');
  }
  
  if (!location.canAccommodateWeight(this.totalWeight)) {
    throw new Error(`Localização não tem capacidade suficiente. Disponível: ${location.availableCapacityKg}kg`);
  }
  
  // Verificar se localização está ocupada
  const existingProduct = await this.constructor.findOne({
    locationId: locationId,
    status: 'LOCADO',
    _id: { $ne: this._id }
  });
  
  if (existingProduct) {
    throw new Error(`Localização já está ocupada pelo produto: ${existingProduct.name} (${existingProduct.lot})`);
  }
  
  this.locationId = locationId;
  this.status = PRODUCT_STATUS.LOCADO;
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  this.version += 1;
  
  await this.save();
  
  return this;
};

// Método de instância para remover produto (ADMIN)
productSchema.methods.remove = async function(userId, reason = 'Remoção manual') {
  // Produtos podem ser removidos se estão LOCADO ou AGUARDANDO_RETIRADA
  if (![PRODUCT_STATUS.LOCADO, PRODUCT_STATUS.AGUARDANDO_RETIRADA].includes(this.status)) {
    throw new Error('Apenas produtos locados ou aguardando retirada podem ser removidos');
  }
  
  this.status = PRODUCT_STATUS.REMOVIDO;
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  this.version += 1;
  
  await this.save();
  
  return this;
};

// Método de instância para cancelar retirada (ADMIN/OPERATOR)
productSchema.methods.cancelWithdrawal = async function(userId, reason = 'Cancelamento de solicitação') {
  if (this.status !== PRODUCT_STATUS.AGUARDANDO_RETIRADA) {
    throw new Error('Apenas produtos aguardando retirada podem ter solicitação cancelada');
  }
  
  // Validar transição FSM
  const validTransitions = VALID_TRANSITIONS[this.status];
  if (!validTransitions.includes(PRODUCT_STATUS.LOCADO)) {
    throw new Error(`Transição inválida: ${this.status} → ${PRODUCT_STATUS.LOCADO}`);
  }
  
  this.status = PRODUCT_STATUS.LOCADO;
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  this.version += 1;
  
  await this.save();
  
  return this;
};

// Método de instância para solicitar retirada (ADMIN)
productSchema.methods.requestWithdrawal = async function(userId, reason = 'Solicitação de retirada') {
  if (this.status !== PRODUCT_STATUS.LOCADO) {
    throw new Error('Apenas produtos locados podem ter retirada solicitada');
  }
  
  this.status = PRODUCT_STATUS.AGUARDANDO_RETIRADA;
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  this.version += 1;
  
  await this.save();
  
  return this;
};

// Método de instância para confirmar retirada com suporte a parcial (OPERATOR)
productSchema.methods.confirmWithdrawal = async function(userId, quantityToWithdraw = null, reason = 'Confirmação de retirada') {
  if (this.status !== PRODUCT_STATUS.AGUARDANDO_RETIRADA) {
    throw new Error('Apenas produtos aguardando retirada podem ser confirmados');
  }
  
  // Se quantidade especificada, validar retirada parcial
  if (quantityToWithdraw !== null) {
    if (quantityToWithdraw <= 0 || quantityToWithdraw >= this.quantity) {
      throw new Error('Quantidade para retirada parcial deve ser maior que 0 e menor que a quantidade total');
    }
    
    // Retirada parcial - reduzir quantidade
    this.quantity = this.quantity - quantityToWithdraw;
    this.totalWeight = this.quantity * this.weightPerUnit;
    this.status = PRODUCT_STATUS.LOCADO; // Volta para LOCADO com quantidade reduzida
  } else {
    // Retirada total
    this.status = PRODUCT_STATUS.RETIRADO;
  }
  
  this.metadata.lastModifiedBy = userId;
  this.metadata.lastMovementDate = new Date();
  this.version += 1;
  
  await this.save();
  
  return this;
};

// Método estático para buscar produtos por status
productSchema.statics.findByStatus = function(status) {
  return this.find({ status })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .populate('clientId', 'name cnpjCpf')
    .sort({ createdAt: -1 });
};

// Método estático para buscar produtos próximos ao vencimento
productSchema.statics.findNearExpiration = function(days = 30) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() + days);
  
  return this.find({
    status: { $in: [PRODUCT_STATUS.LOCADO, PRODUCT_STATUS.AGUARDANDO_RETIRADA] },
    expirationDate: { 
      $lte: targetDate,
      $gte: new Date()
    }
  })
  .populate('seedTypeId', 'name')
  .populate('locationId', 'code coordinates chamberId')
  .populate('clientId', 'name cnpjCpf')
  .sort({ expirationDate: 1 });
};

// Método estático para buscar produtos vencidos
productSchema.statics.findExpired = function() {
  return this.find({
    status: { $in: [PRODUCT_STATUS.LOCADO, PRODUCT_STATUS.AGUARDANDO_RETIRADA] },
    expirationDate: { $lt: new Date() }
  })
  .populate('seedTypeId', 'name')
  .populate('locationId', 'code coordinates chamberId')
  .populate('clientId', 'name cnpjCpf')
  .sort({ expirationDate: 1 });
};

// Método estático para buscar por localização
productSchema.statics.findByLocation = function(locationId) {
  return this.find({ locationId, status: { $ne: PRODUCT_STATUS.REMOVIDO } })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .populate('clientId', 'name cnpjCpf')
    .sort({ createdAt: -1 });
};

// Método estático para buscar por tipo de semente
productSchema.statics.findBySeedType = function(seedTypeId) {
  return this.find({ seedTypeId, status: { $ne: PRODUCT_STATUS.REMOVIDO } })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .populate('clientId', 'name cnpjCpf')
    .sort({ createdAt: -1 });
};

// Método estático para buscar produtos aguardando locação
productSchema.statics.findPendingLocation = function() {
  return this.find({ status: PRODUCT_STATUS.AGUARDANDO_LOCACAO })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('clientId', 'name cnpjCpf')
    .sort({ createdAt: -1 });
};

// Método estático para buscar produtos aguardando retirada
productSchema.statics.findPendingWithdrawal = function() {
  return this.find({ status: PRODUCT_STATUS.AGUARDANDO_RETIRADA })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .populate('clientId', 'name cnpjCpf')
    .sort({ createdAt: -1 });
};

// Método estático para buscar produtos por cliente
productSchema.statics.findByClient = function(clientId) {
  return this.find({ clientId, status: { $ne: PRODUCT_STATUS.REMOVIDO } })
    .populate('seedTypeId', 'name optimalTemperature optimalHumidity')
    .populate('locationId', 'code coordinates chamberId')
    .populate('clientId', 'name cnpjCpf')
    .sort({ createdAt: -1 });
};

// Método estático para relatório de estoque
productSchema.statics.getInventoryReport = async function(filterOptions = {}) {
  const activeStatuses = [PRODUCT_STATUS.LOCADO, PRODUCT_STATUS.AGUARDANDO_LOCACAO, PRODUCT_STATUS.AGUARDANDO_RETIRADA];
  let matchQuery = { status: { $in: activeStatuses } };

  // Adicionar filtro por cliente se fornecido
  if (filterOptions.clientId) {
    matchQuery.clientId = mongoose.Types.ObjectId(filterOptions.clientId);
  }
  
  const summary = await this.aggregate([
    { $match: matchQuery },
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
    { $match: matchQuery },
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

  // Relatório por cliente
  const byClient = await this.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: 'clients',
        localField: 'clientId',
        foreignField: '_id',
        as: 'client'
      }
    },
    { $unwind: { path: '$client', preserveNullAndEmptyArrays: true } },
    {
      $group: {
        _id: {
          clientId: '$clientId',
          clientName: '$client.name'
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
    byClient,
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
  
  const activeStatuses = [PRODUCT_STATUS.LOCADO, PRODUCT_STATUS.AGUARDANDO_RETIRADA];
  
  const expirationStats = await this.aggregate([
    { $match: { status: { $in: activeStatuses } } },
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
              { case: { $lt: ['$daysUntilExpiration', 0] }, then: EXPIRATION_STATUS.EXPIRED },
              { case: { $lt: ['$daysUntilExpiration', 7] }, then: EXPIRATION_STATUS.CRITICAL },
              { case: { $lt: ['$daysUntilExpiration', 30] }, then: EXPIRATION_STATUS.WARNING }
            ],
            default: EXPIRATION_STATUS.GOOD
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
    active: await this.countDocuments({ status: { $in: activeStatuses } })
  };
};

module.exports = mongoose.model('Product', productSchema); 