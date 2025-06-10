const mongoose = require('mongoose');

const locationSchema = new mongoose.Schema({
  chamberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chamber',
    required: [true, 'ID da câmara é obrigatório']
  },
  coordinates: {
    quadra: {
      type: Number,
      required: [true, 'Quadra é obrigatória'],
      min: [1, 'Quadra deve ser pelo menos 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quadra deve ser um número inteiro'
      }
    },
    lado: {
      type: String,
      required: [true, 'Lado é obrigatório'],
      uppercase: true,
      enum: {
        values: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T'],
        message: 'Lado deve ser uma letra de A a T'
      },
      validate: {
        validator: function(value) {
          return /^[A-T]$/.test(value);
        },
        message: 'Lado deve ser uma letra maiúscula de A a T'
      }
    },
    fila: {
      type: Number,
      required: [true, 'Fila é obrigatória'],
      min: [1, 'Fila deve ser pelo menos 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Fila deve ser um número inteiro'
      }
    },
    andar: {
      type: Number,
      required: [true, 'Andar é obrigatório'],
      min: [1, 'Andar deve ser pelo menos 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Andar deve ser um número inteiro'
      }
    }
  },
  code: {
    type: String,
    trim: true
  },
  isOccupied: {
    type: Boolean,
    default: false
  },
  maxCapacityKg: {
    type: Number,
    default: 1000,
    min: [1, 'Capacidade máxima deve ser pelo menos 1kg'],
    max: [50000, 'Capacidade máxima não pode exceder 50.000kg'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value) && value > 0;
      },
      message: 'Capacidade máxima deve ser um número positivo'
    }
  },
  currentWeightKg: {
    type: Number,
    default: 0,
    min: [0, 'Peso atual não pode ser negativo'],
    validate: {
      validator: function(value) {
        return !isNaN(value) && isFinite(value) && value >= 0;
      },
      message: 'Peso atual deve ser um número não negativo'
    }
  },
  // Metadados adicionais
  metadata: {
    installationDate: {
      type: Date,
      default: Date.now
    },
    lastInspectionDate: {
      type: Date
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Notas devem ter no máximo 500 caracteres']
    },
    accessLevel: {
      type: String,
      enum: ['ground', 'elevated', 'high'],
      default: 'ground'
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

// Índices para performance e unicidade
locationSchema.index({ chamberId: 1, 'coordinates.quadra': 1, 'coordinates.lado': 1, 'coordinates.fila': 1, 'coordinates.andar': 1 }, { unique: true });
// CORREÇÃO: Code deve ser único apenas dentro da câmara, não globalmente
locationSchema.index({ chamberId: 1, code: 1 }, { unique: true });
locationSchema.index({ chamberId: 1 });
locationSchema.index({ isOccupied: 1 });
locationSchema.index({ currentWeightKg: 1 });
locationSchema.index({ maxCapacityKg: 1 });

// Virtual para calcular capacidade disponível
locationSchema.virtual('availableCapacityKg').get(function() {
  return this.maxCapacityKg - this.currentWeightKg;
});

// Virtual para calcular percentual de ocupação
locationSchema.virtual('occupancyPercentage').get(function() {
  if (this.maxCapacityKg === 0) return 0;
  return Math.round((this.currentWeightKg / this.maxCapacityKg) * 100);
});

// Virtual para status da capacidade
locationSchema.virtual('capacityStatus').get(function() {
  const percentage = this.occupancyPercentage;
  if (percentage === 0) return 'empty';
  if (percentage < 50) return 'low';
  if (percentage < 80) return 'medium';
  if (percentage < 100) return 'high';
  return 'full';
});

// Virtual para coordenadas formatadas
locationSchema.virtual('coordinatesText').get(function() {
  const { quadra, lado, fila, andar } = this.coordinates;
  return `Quadra ${quadra}, Lado ${lado}, Fila ${fila}, Andar ${andar}`;
});

// Middleware para gerar código automaticamente
locationSchema.pre('save', function(next) {
  if (!this.code) {
    const { quadra, lado, fila, andar } = this.coordinates;
    this.code = `Q${quadra}-L${lado}-F${fila}-A${andar}`;
  }
  next();
});

// Middleware para validar capacidade - REGRA CRÍTICA
locationSchema.pre('save', function(next) {
  // Validar se peso atual não excede capacidade máxima
  if (this.currentWeightKg > this.maxCapacityKg) {
    return next(new Error(`Peso atual (${this.currentWeightKg}kg) excede capacidade máxima (${this.maxCapacityKg}kg)`));
  }
  
  // Atualizar status de ocupação baseado no peso
  this.isOccupied = this.currentWeightKg > 0;
  
  next();
});

// Método de instância para validar se pode acomodar peso adicional
locationSchema.methods.canAccommodateWeight = function(additionalWeight) {
  const newTotalWeight = this.currentWeightKg + additionalWeight;
  return newTotalWeight <= this.maxCapacityKg;
};

// Método de instância para adicionar peso - REGRA CRÍTICA DE NEGÓCIO
locationSchema.methods.addWeight = async function(weight, session = null) {
  if (!this.canAccommodateWeight(weight)) {
    throw new Error(`Não é possível adicionar ${weight}kg. Capacidade disponível: ${this.availableCapacityKg}kg`);
  }
  
  this.currentWeightKg += weight;
  this.isOccupied = this.currentWeightKg > 0;
  
  const options = session ? { session } : {};
  return await this.save(options);
};

// Método de instância para remover peso
locationSchema.methods.removeWeight = async function(weight, session = null) {
  if (weight > this.currentWeightKg) {
    throw new Error(`Não é possível remover ${weight}kg. Peso atual: ${this.currentWeightKg}kg`);
  }
  
  this.currentWeightKg -= weight;
  this.isOccupied = this.currentWeightKg > 0;
  
  const options = session ? { session } : {};
  return await this.save(options);
};

// Método de instância para liberar localização
locationSchema.methods.release = async function(session = null) {
  this.currentWeightKg = 0;
  this.isOccupied = false;
  
  const options = session ? { session } : {};
  return await this.save(options);
};

// Método de instância para validar coordenadas contra câmara
locationSchema.methods.validateAgainstChamber = async function() {
  const Chamber = mongoose.model('Chamber');
  const chamber = await Chamber.findById(this.chamberId);
  
  if (!chamber) {
    throw new Error('Câmara não encontrada');
  }
  
  const validation = chamber.validateCoordinates(
    this.coordinates.quadra,
    this.coordinates.lado,
    this.coordinates.fila,
    this.coordinates.andar
  );
  
  if (!Object.values(validation).every(v => v)) {
    throw new Error('Coordenadas inválidas para esta câmara');
  }
  
  return true;
};

// Método estático para buscar localizações disponíveis
locationSchema.statics.findAvailable = function(minCapacity = 0) {
  return this.find({
    isOccupied: false,
    maxCapacityKg: { $gte: minCapacity }
  }).populate('chamberId', 'name status').sort({ 'coordinates.quadra': 1, 'coordinates.lado': 1, 'coordinates.fila': 1, 'coordinates.andar': 1 });
};

// Método estático para buscar localizações ocupadas
locationSchema.statics.findOccupied = function() {
  return this.find({
    isOccupied: true
  }).populate('chamberId', 'name status').sort({ 'coordinates.quadra': 1, 'coordinates.lado': 1, 'coordinates.fila': 1, 'coordinates.andar': 1 });
};

// Método estático para buscar por câmara
locationSchema.statics.findByChamber = function(chamberId, includeOccupied = true) {
  const query = { chamberId };
  if (!includeOccupied) {
    query.isOccupied = false;
  }
  
  return this.find(query)
    .populate('chamberId', 'name status')
    .sort({ 'coordinates.quadra': 1, 'coordinates.lado': 1, 'coordinates.fila': 1, 'coordinates.andar': 1 });
};

// Método estático para buscar por capacidade
locationSchema.statics.findByCapacityRange = function(minCapacity, maxCapacity) {
  return this.find({
    maxCapacityKg: { $gte: minCapacity, $lte: maxCapacity }
  }).populate('chamberId', 'name status').sort({ maxCapacityKg: 1 });
};

// Método estático para buscar localizações próximas ao limite
locationSchema.statics.findNearCapacity = function(threshold = 80) {
  return this.find({
    isOccupied: true,
    $expr: {
      $gte: [
        { $divide: ['$currentWeightKg', '$maxCapacityKg'] },
        threshold / 100
      ]
    }
  }).populate('chamberId', 'name status').sort({ occupancyPercentage: -1 });
};

// Método estático para gerar localizações para uma câmara
locationSchema.statics.generateForChamber = async function(chamberId, defaultCapacity = 1000) {
  const Chamber = mongoose.model('Chamber');
  const chamber = await Chamber.findById(chamberId);
  
  if (!chamber) {
    throw new Error('Câmara não encontrada');
  }
  
  const locations = [];
  const { quadras, lados, filas, andares } = chamber.dimensions;
  
  for (let q = 1; q <= quadras; q++) {
    for (let l = 1; l <= lados; l++) {
      for (let f = 1; f <= filas; f++) {
        for (let a = 1; a <= andares; a++) {
          const code = `Q${q}-L${l}-F${f}-A${a}`;
          
          // Verificar se já existe
          const existing = await this.findOne({ chamberId, code });
          if (!existing) {
            locations.push({
              chamberId,
              coordinates: { quadra: q, lado: l, fila: f, andar: a },
              code,
              maxCapacityKg: defaultCapacity,
              metadata: {
                accessLevel: a <= 2 ? 'ground' : a <= 5 ? 'elevated' : 'high'
              }
            });
          }
        }
      }
    }
  }
  
  if (locations.length > 0) {
    return await this.insertMany(locations);
  }
  
  return [];
};

// Método estático para estatísticas
locationSchema.statics.getStats = async function(chamberId = null) {
  const query = chamberId ? { chamberId } : {};
  
  const total = await this.countDocuments(query);
  const occupied = await this.countDocuments({ ...query, isOccupied: true });
  const available = total - occupied;
  
  const capacityStats = await this.aggregate([
    { $match: query },
    {
      $group: {
        _id: null,
        totalCapacity: { $sum: '$maxCapacityKg' },
        usedCapacity: { $sum: '$currentWeightKg' }
      }
    }
  ]);
  
  const { totalCapacity = 0, usedCapacity = 0 } = capacityStats[0] || {};
  const utilizationRate = totalCapacity > 0 ? Math.round((usedCapacity / totalCapacity) * 100) : 0;
  
  return {
    total,
    available,
    occupied,
    totalCapacity,
    usedCapacity,
    utilizationRate
  };
};

module.exports = mongoose.model('Location', locationSchema); 