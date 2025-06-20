const mongoose = require('mongoose');

const chamberSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome da câmara é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Descrição deve ter no máximo 500 caracteres']
  },
  currentTemperature: {
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
  currentHumidity: {
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
  dimensions: {
    quadras: {
      type: Number,
      required: [true, 'Número de quadras é obrigatório'],
      min: [1, 'Deve ter pelo menos 1 quadra'],
      max: [100, 'Máximo de 100 quadras'],
      validate: {
        validator: Number.isInteger,
        message: 'Número de quadras deve ser um inteiro'
      }
    },
    lados: {
      type: Number,
      required: [true, 'Número de lados é obrigatório'],
      min: [1, 'Deve ter pelo menos 1 lado'],
      max: [100, 'Máximo de 100 lados'],
      validate: {
        validator: Number.isInteger,
        message: 'Número de lados deve ser um inteiro'
      }
    },
    filas: {
      type: Number,
      required: [true, 'Número de filas é obrigatório'],
      min: [1, 'Deve ter pelo menos 1 fila'],
      max: [100, 'Máximo de 100 filas'],
      validate: {
        validator: Number.isInteger,
        message: 'Número de filas deve ser um inteiro'
      }
    },
    andares: {
      type: Number,
      required: [true, 'Número de andares é obrigatório'],
      min: [1, 'Deve ter pelo menos 1 andar'],
      max: [20, 'Máximo de 20 andares'],
      validate: {
        validator: Number.isInteger,
        message: 'Número de andares deve ser um inteiro'
      }
    }
  },
  status: {
    type: String,
    enum: {
      values: ['active', 'maintenance', 'inactive'],
      message: 'Status deve ser: active, maintenance ou inactive'
    },
    default: 'active'
  },
  // Configurações adicionais
  settings: {
    targetTemperature: {
      type: Number,
      min: [-50, 'Temperatura alvo não pode ser menor que -50°C'],
      max: [50, 'Temperatura alvo não pode ser maior que 50°C']
    },
    targetHumidity: {
      type: Number,
      min: [0, 'Umidade alvo não pode ser menor que 0%'],
      max: [100, 'Umidade alvo não pode ser maior que 100%']
    },
    alertThresholds: {
      temperatureMin: { type: Number },
      temperatureMax: { type: Number },
      humidityMin: { type: Number },
      humidityMax: { type: Number }
    }
  },
  lastMaintenanceDate: {
    type: Date
  },
  nextMaintenanceDate: {
    type: Date
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
chamberSchema.index({ name: 1 }, { unique: true });
chamberSchema.index({ status: 1 });
chamberSchema.index({ createdAt: -1 });
chamberSchema.index({ 'dimensions.quadras': 1 });

// Virtual para calcular capacidade total de localizações
chamberSchema.virtual('totalLocations').get(function() {
  return this.dimensions.quadras * this.dimensions.lados * 
         this.dimensions.filas * this.dimensions.andares;
});

// Virtual para status de temperatura
chamberSchema.virtual('temperatureStatus').get(function() {
  if (!this.currentTemperature || !this.settings?.alertThresholds) return 'unknown';
  
  const { temperatureMin, temperatureMax } = this.settings.alertThresholds;
  
  if (temperatureMin && this.currentTemperature < temperatureMin) return 'low';
  if (temperatureMax && this.currentTemperature > temperatureMax) return 'high';
  return 'normal';
});

// Virtual para status de umidade
chamberSchema.virtual('humidityStatus').get(function() {
  if (!this.currentHumidity || !this.settings?.alertThresholds) return 'unknown';
  
  const { humidityMin, humidityMax } = this.settings.alertThresholds;
  
  if (humidityMin && this.currentHumidity < humidityMin) return 'low';
  if (humidityMax && this.currentHumidity > humidityMax) return 'high';
  return 'normal';
});

// Virtual para status geral de condições
chamberSchema.virtual('conditionsStatus').get(function() {
  const tempStatus = this.temperatureStatus;
  const humidityStatus = this.humidityStatus;
  
  if (tempStatus === 'unknown' || humidityStatus === 'unknown') return 'unknown';
  if (tempStatus === 'normal' && humidityStatus === 'normal') return 'optimal';
  if ((tempStatus === 'low' || tempStatus === 'high') || 
      (humidityStatus === 'low' || humidityStatus === 'high')) return 'alert';
  return 'normal';
});

// Middleware para validar dimensões
chamberSchema.pre('save', function(next) {
  // Validar se as dimensões não excedem limites práticos
  const totalLocations = this.totalLocations;
  if (totalLocations > 100000) {
    return next(new Error('Total de localizações não pode exceder 100.000'));
  }
  
  next();
});

// Método de instância para validar coordenadas
chamberSchema.methods.validateCoordinates = function(quadra, lado, fila, andar) {
  return {
    quadra: quadra >= 1 && quadra <= this.dimensions.quadras,
    lado: lado >= 1 && lado <= this.dimensions.lados,
    fila: fila >= 1 && fila <= this.dimensions.filas,
    andar: andar >= 1 && andar <= this.dimensions.andares
  };
};

// Método de instância para gerar código de localização
chamberSchema.methods.generateLocationCode = function(quadra, lado, fila, andar) {
  const validation = this.validateCoordinates(quadra, lado, fila, andar);
  if (!Object.values(validation).every(v => v)) {
    throw new Error('Coordenadas inválidas para esta câmara');
  }
  
  return `Q${quadra}-L${lado}-F${fila}-A${andar}`;
};

// Método de instância para atualizar condições
chamberSchema.methods.updateConditions = function(temperature, humidity) {
  this.currentTemperature = temperature;
  this.currentHumidity = humidity;
  return this.save();
};

// Método de instância para verificar se precisa de manutenção
chamberSchema.methods.needsMaintenance = function() {
  if (!this.nextMaintenanceDate) return false;
  return new Date() >= this.nextMaintenanceDate;
};

// Método estático para buscar câmaras ativas
chamberSchema.statics.findActive = function() {
  return this.find({ status: 'active' }).sort({ name: 1 });
};

// Método estático para buscar câmaras por status
chamberSchema.statics.findByStatus = function(status) {
  return this.find({ status }).sort({ name: 1 });
};

// Método estático para buscar câmaras com alertas
chamberSchema.statics.findWithAlerts = function() {
  return this.find({
    status: 'active',
    $or: [
      {
        $expr: {
          $and: [
            { $ne: ['$currentTemperature', null] },
            { $ne: ['$settings.alertThresholds.temperatureMin', null] },
            { $lt: ['$currentTemperature', '$settings.alertThresholds.temperatureMin'] }
          ]
        }
      },
      {
        $expr: {
          $and: [
            { $ne: ['$currentTemperature', null] },
            { $ne: ['$settings.alertThresholds.temperatureMax', null] },
            { $gt: ['$currentTemperature', '$settings.alertThresholds.temperatureMax'] }
          ]
        }
      },
      {
        $expr: {
          $and: [
            { $ne: ['$currentHumidity', null] },
            { $ne: ['$settings.alertThresholds.humidityMin', null] },
            { $lt: ['$currentHumidity', '$settings.alertThresholds.humidityMin'] }
          ]
        }
      },
      {
        $expr: {
          $and: [
            { $ne: ['$currentHumidity', null] },
            { $ne: ['$settings.alertThresholds.humidityMax', null] },
            { $gt: ['$currentHumidity', '$settings.alertThresholds.humidityMax'] }
          ]
        }
      }
    ]
  });
};

// Método estático para estatísticas
chamberSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ status: 'active' });
  const maintenance = await this.countDocuments({ status: 'maintenance' });
  const inactive = await this.countDocuments({ status: 'inactive' });
  
  // Calcular capacidade total
  const capacityResult = await this.aggregate([
    {
      $group: {
        _id: null,
        totalCapacity: { 
          $sum: { 
            $multiply: [
              '$dimensions.quadras',
              '$dimensions.lados', 
              '$dimensions.filas',
              '$dimensions.andares'
            ]
          }
        }
      }
    }
  ]);
  
  const totalCapacity = capacityResult.length > 0 ? capacityResult[0].totalCapacity : 0;
  
  return {
    total,
    active,
    maintenance,
    inactive,
    totalCapacity
  };
};

// Método estático para buscar por faixa de capacidade
chamberSchema.statics.findByCapacityRange = function(minCapacity, maxCapacity) {
  return this.find({
    $expr: {
      $and: [
        {
          $gte: [
            { $multiply: ['$dimensions.quadras', '$dimensions.lados', '$dimensions.filas', '$dimensions.andares'] },
            minCapacity
          ]
        },
        {
          $lte: [
            { $multiply: ['$dimensions.quadras', '$dimensions.lados', '$dimensions.filas', '$dimensions.andares'] },
            maxCapacity
          ]
        }
      ]
    }
  }).sort({ name: 1 });
};

module.exports = mongoose.model('Chamber', chamberSchema); 