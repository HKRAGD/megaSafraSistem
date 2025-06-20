const mongoose = require('mongoose');

const seedTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do tipo de semente é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  optimalTemperature: {
    type: Number,
    min: [-50, 'Temperatura não pode ser menor que -50°C'],
    max: [50, 'Temperatura não pode ser maior que 50°C'],
    validate: {
      validator: function(value) {
        return value === null || value === undefined || (!isNaN(value) && isFinite(value));
      },
      message: 'Temperatura deve ser um número válido'
    }
  },
  optimalHumidity: {
    type: Number,
    min: [0, 'Umidade não pode ser menor que 0%'],
    max: [100, 'Umidade não pode ser maior que 100%'],
    validate: {
      validator: function(value) {
        return value === null || value === undefined || (!isNaN(value) && isFinite(value));
      },
      message: 'Umidade deve ser um número válido'
    }
  },
  maxStorageTimeDays: {
    type: Number,
    min: [1, 'Tempo máximo de armazenamento deve ser pelo menos 1 dia'],
    max: [3650, 'Tempo máximo de armazenamento não pode exceder 10 anos'],
    validate: {
      validator: function(value) {
        return value === null || value === undefined || (Number.isInteger(value) && value > 0);
      },
      message: 'Tempo de armazenamento deve ser um número inteiro positivo'
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Campos adicionais para flexibilidade - CORREÇÃO para tipos dinâmicos
  specifications: {
    type: mongoose.Schema.Types.Mixed, // Permite qualquer estrutura dinâmica
    default: undefined // Retorna undefined quando vazio
  },
  storageNotes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas de armazenamento devem ter no máximo 1000 caracteres']
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
seedTypeSchema.index({ name: 1 }, { unique: true });
seedTypeSchema.index({ isActive: 1 });
seedTypeSchema.index({ createdAt: -1 });
seedTypeSchema.index({ name: 'text', description: 'text' }); // Para busca textual

// Middleware para validar dados antes de salvar
seedTypeSchema.pre('save', function(next) {
  // Converter nome para formato title case - CORREÇÃO para caracteres acentuados
  if (this.name) {
    this.name = this.name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  next();
});

// Virtual para status detalhado - CORREÇÃO da lógica
seedTypeSchema.virtual('status').get(function() {
  if (!this.isActive) return 'Inativo';
  
  const hasOptimalConditions = this.optimalTemperature !== null && 
                               this.optimalTemperature !== undefined && 
                               this.optimalHumidity !== null && 
                               this.optimalHumidity !== undefined;
  const hasStorageTime = this.maxStorageTimeDays !== null && 
                         this.maxStorageTimeDays !== undefined;
  
  if (hasOptimalConditions && hasStorageTime) return 'Completo';
  if (hasOptimalConditions || hasStorageTime) return 'Parcial';
  return 'Básico';
});

// Virtual para condições ótimas de armazenamento
seedTypeSchema.virtual('optimalConditions').get(function() {
  return {
    temperature: this.optimalTemperature,
    humidity: this.optimalHumidity,
    maxDays: this.maxStorageTimeDays
  };
});

// Método estático para buscar tipos ativos
seedTypeSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Método estático para busca por texto
seedTypeSchema.statics.searchByText = function(searchTerm) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { description: { $regex: searchTerm, $options: 'i' } }
        ]
      }
    ]
  }).sort({ name: 1 });
};

// Método estático para validar condições de temperatura
seedTypeSchema.statics.findByTemperatureRange = function(minTemp, maxTemp) {
  return this.find({
    isActive: true,
    optimalTemperature: {
      $gte: minTemp,
      $lte: maxTemp
    }
  }).sort({ optimalTemperature: 1 });
};

// Método de instância para verificar se está dentro das condições ótimas
seedTypeSchema.methods.isWithinOptimalConditions = function(temperature, humidity) {
  const tempTolerance = 2; // ±2°C de tolerância
  const humidityTolerance = 5; // ±5% de tolerância
  
  let tempOk = true;
  let humidityOk = true;
  
  if (this.optimalTemperature !== null && this.optimalTemperature !== undefined) {
    tempOk = Math.abs(temperature - this.optimalTemperature) <= tempTolerance;
  }
  
  if (this.optimalHumidity !== null && this.optimalHumidity !== undefined) {
    humidityOk = Math.abs(humidity - this.optimalHumidity) <= humidityTolerance;
  }
  
  return { tempOk, humidityOk, overall: tempOk && humidityOk };
};

// Método de instância para calcular data de expiração
seedTypeSchema.methods.calculateExpirationDate = function(entryDate = new Date()) {
  if (!this.maxStorageTimeDays) return null;
  
  const expiration = new Date(entryDate);
  expiration.setDate(expiration.getDate() + this.maxStorageTimeDays);
  return expiration;
};

// Método estático para estatísticas
seedTypeSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const withOptimalConditions = await this.countDocuments({
    isActive: true,
    optimalTemperature: { $ne: null },
    optimalHumidity: { $ne: null }
  });
  
  return {
    total,
    active,
    inactive: total - active,
    withOptimalConditions,
    completionRate: active > 0 ? Math.round((withOptimalConditions / active) * 100) : 0
  };
};

module.exports = mongoose.model('SeedType', seedTypeSchema); 