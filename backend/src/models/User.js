const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [100, 'Nome deve ter no máximo 100 caracteres']
  },
  email: {
    type: String,
    required: [true, 'Email é obrigatório'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Por favor, forneça um email válido'
    ]
  },
  password: {
    type: String,
    required: [true, 'Senha é obrigatória'],
    minlength: [6, 'Senha deve ter pelo menos 6 caracteres'],
    select: false // Não retornar a senha por padrão nas consultas
  },
  passwordChangedAt: {
    type: Date,
    select: false // Campo para controle de alteração de senha
  },
  role: {
    type: String,
    enum: {
      values: ['admin', 'operator', 'viewer'],
      message: 'Role deve ser: admin, operator ou viewer'
    },
    default: 'viewer'
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true, // Adiciona createdAt e updatedAt automaticamente
  toJSON: { 
    virtuals: true,
    transform: function(doc, ret) {
      delete ret.password;
      delete ret.passwordChangedAt;
      delete ret.__v;
      return ret;
    }
  },
  toObject: { virtuals: true }
});

// Índices para performance
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ createdAt: -1 });

// Middleware para hash da senha antes de salvar
userSchema.pre('save', async function(next) {
  // Só fazer hash se a senha foi modificada
  if (!this.isModified('password')) return next();

  try {
    // Hash da senha
    const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
    this.password = await bcrypt.hash(this.password, saltRounds);
    
    // Definir passwordChangedAt apenas se não for um novo usuário
    if (!this.isNew) {
      this.passwordChangedAt = new Date(Date.now() - 1000); // 1 segundo antes para garantir
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Middleware para hash da senha no findOneAndUpdate
userSchema.pre('findOneAndUpdate', async function(next) {
  const update = this.getUpdate();
  
  if (update.password) {
    try {
      const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
      update.password = await bcrypt.hash(update.password, saltRounds);
      update.passwordChangedAt = new Date(Date.now() - 1000);
    } catch (error) {
      return next(error);
    }
  }
  
  next();
});

// Método de instância para verificar senha
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Método de instância para verificar se a senha foi alterada após o token
userSchema.methods.passwordChangedAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  
  // Se não há registro de mudança, significa que não foi alterada
  return false;
};

// Método de instância para verificar se o usuário é admin
userSchema.methods.isAdmin = function() {
  return this.role === 'admin';
};

// Método de instância para verificar se o usuário pode operar
userSchema.methods.canOperate = function() {
  return ['admin', 'operator'].includes(this.role);
};

// Método estático para buscar por email
userSchema.statics.findByEmail = function(email) {
  return this.findOne({ email: email.toLowerCase() });
};

// Método estático para buscar usuários ativos
userSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

// Método estático para buscar por role
userSchema.statics.findByRole = function(role) {
  return this.find({ role, isActive: true });
};

// Virtual para nome completo (se necessário no futuro)
userSchema.virtual('displayName').get(function() {
  return this.name;
});

// Método estático para estatísticas
userSchema.statics.getStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: '$role',
        count: { $sum: 1 },
        active: {
          $sum: {
            $cond: [{ $eq: ['$isActive', true] }, 1, 0]
          }
        }
      }
    }
  ]);

  return {
    total: await this.countDocuments(),
    active: await this.countDocuments({ isActive: true }),
    byRole: stats
  };
};

module.exports = mongoose.model('User', userSchema); 