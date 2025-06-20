const mongoose = require('mongoose');
const { cpf, cnpj } = require('validation-br');

const clientSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Nome do cliente é obrigatório'],
    trim: true,
    minlength: [2, 'Nome deve ter pelo menos 2 caracteres'],
    maxlength: [200, 'Nome deve ter no máximo 200 caracteres']
  },
  cnpjCpf: {
    type: String,
    trim: true,
    sparse: true, // Permite múltiplos documentos com valor null/undefined
    maxlength: [20, 'CNPJ/CPF deve ter no máximo 20 caracteres'],
    validate: {
      validator: function(value) {
        if (!value) return true; // Permite valores vazios
        // Remove caracteres não numéricos para validação
        const cleaned = value.replace(/\D/g, '');
        
        // Valida CPF (11 dígitos) usando validation-br
        if (cleaned.length === 11) {
          return cpf.isValid(cleaned);
        }
        
        // Valida CNPJ (14 dígitos) usando validation-br
        if (cleaned.length === 14) {
          return cnpj.isValid(cleaned);
        }
        
        return false; // Se não for nem CPF nem CNPJ válido
      },
      message: 'CNPJ/CPF inválido. Verifique o formato e os dígitos verificadores.'
    }
  },
  documentType: {
    type: String,
    enum: ['CPF', 'CNPJ', 'OUTROS']
    // Removida a função default - será definida no middleware pre('save')
  },
  contactPerson: {
    type: String,
    trim: true,
    maxlength: [100, 'Pessoa de contato deve ter no máximo 100 caracteres']
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Permite múltiplos documentos com valor null/undefined
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Por favor, insira um email válido']
  },
  phone: {
    type: String,
    trim: true,
    maxlength: [20, 'Telefone deve ter no máximo 20 caracteres']
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Rua deve ter no máximo 200 caracteres']
    },
    number: {
      type: String,
      trim: true,
      maxlength: [20, 'Número deve ter no máximo 20 caracteres']
    },
    complement: {
      type: String,
      trim: true,
      maxlength: [100, 'Complemento deve ter no máximo 100 caracteres']
    },
    neighborhood: {
      type: String,
      trim: true,
      maxlength: [100, 'Bairro deve ter no máximo 100 caracteres']
    },
    city: {
      type: String,
      trim: true,
      maxlength: [100, 'Cidade deve ter no máximo 100 caracteres']
    },
    state: {
      type: String,
      trim: true,
      maxlength: [50, 'Estado deve ter no máximo 50 caracteres']
    },
    zipCode: {
      type: String,
      trim: true,
      maxlength: [10, 'CEP deve ter no máximo 10 caracteres']
    },
    country: {
      type: String,
      trim: true,
      default: 'Brasil',
      maxlength: [50, 'País deve ter no máximo 50 caracteres']
    }
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [1000, 'Notas devem ter no máximo 1000 caracteres']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Campos para flexibilidade - seguindo padrão do SeedType
  specifications: {
    type: mongoose.Schema.Types.Mixed,
    default: undefined
  },
  // Metadados de controle - seguindo padrão do Product
  metadata: {
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

// Índices para performance - seguindo padrões existentes
clientSchema.index({ name: 1 }, { unique: true });
clientSchema.index({ cnpjCpf: 1 }, { unique: true, sparse: true });
clientSchema.index({ email: 1 }, { unique: true, sparse: true });
clientSchema.index({ isActive: 1 });
clientSchema.index({ createdAt: -1 });
clientSchema.index({ name: 'text', contactPerson: 'text' }); // Para busca textual

// Middleware para validar e formatar dados antes de salvar
clientSchema.pre('save', function(next) {
  // Converter nome para formato title case - seguindo padrão do SeedType
  if (this.name) {
    this.name = this.name.split(' ').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    ).join(' ');
  }
  
  // Formatar CNPJ/CPF removendo caracteres especiais para armazenamento
  if (this.cnpjCpf) {
    this.cnpjCpf = this.cnpjCpf.replace(/\D/g, '');
  }
  
  // Definir tipo de documento automaticamente (ÚNICA FONTE DA VERDADE)
  if (this.cnpjCpf) {
    const cleaned = this.cnpjCpf; // Já limpo na linha acima
    this.documentType = cleaned.length === 11 ? 'CPF' : cleaned.length === 14 ? 'CNPJ' : 'OUTROS';
  } else {
    this.documentType = 'OUTROS'; // Explicitamente define para 'OUTROS' se cnpjCpf estiver vazio
  }
  
  next();
});

// Virtual para status detalhado - seguindo padrão do SeedType
clientSchema.virtual('status').get(function() {
  if (!this.isActive) return 'Inativo';
  
  const hasContact = this.email || this.phone;
  const hasAddress = this.address && (this.address.city || this.address.state);
  const hasDocument = this.cnpjCpf;
  
  if (hasContact && hasAddress && hasDocument) return 'Completo';
  if (hasContact || hasAddress || hasDocument) return 'Parcial';
  return 'Básico';
});

// Virtual para endereço formatado
clientSchema.virtual('formattedAddress').get(function() {
  if (!this.address) return '';
  
  const parts = [];
  if (this.address.street) parts.push(this.address.street);
  if (this.address.number) parts.push(this.address.number);
  if (this.address.neighborhood) parts.push(this.address.neighborhood);
  if (this.address.city) parts.push(this.address.city);
  if (this.address.state) parts.push(this.address.state);
  if (this.address.zipCode) parts.push(`CEP: ${this.address.zipCode}`);
  
  return parts.join(', ');
});

// Virtual para documento formatado
clientSchema.virtual('formattedDocument').get(function() {
  if (!this.cnpjCpf) return '';
  
  const doc = this.cnpjCpf.replace(/\D/g, '');
  
  if (doc.length === 11) {
    // CPF: 000.000.000-00
    return doc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
  } else if (doc.length === 14) {
    // CNPJ: 00.000.000/0000-00
    return doc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
  
  return doc;
});

// Método estático para buscar clientes ativos - seguindo padrão do SeedType
clientSchema.statics.findActive = function() {
  return this.find({ isActive: true }).sort({ name: 1 });
};

// Método estático para busca por texto - seguindo padrão do SeedType
clientSchema.statics.searchByText = function(searchTerm) {
  return this.find({
    $and: [
      { isActive: true },
      {
        $or: [
          { name: { $regex: searchTerm, $options: 'i' } },
          { contactPerson: { $regex: searchTerm, $options: 'i' } },
          { email: { $regex: searchTerm, $options: 'i' } },
          { cnpjCpf: { $regex: searchTerm.replace(/\D/g, ''), $options: 'i' } }
        ]
      }
    ]
  }).sort({ name: 1 });
};

// Método estático para buscar por tipo de documento
clientSchema.statics.findByDocumentType = function(documentType) {
  return this.find({
    isActive: true,
    documentType: documentType
  }).sort({ name: 1 });
};

// Método de instância para verificar se tem informações completas
clientSchema.methods.hasCompleteInfo = function() {
  return !!(this.email || this.phone) && 
         !!(this.address && (this.address.city || this.address.state)) &&
         !!this.cnpjCpf;
};

// Método de instância para obter informações de contato
clientSchema.methods.getContactInfo = function() {
  return {
    email: this.email,
    phone: this.phone,
    contactPerson: this.contactPerson,
    hasEmail: !!this.email,
    hasPhone: !!this.phone,
    preferredContact: this.email ? 'email' : this.phone ? 'phone' : 'none'
  };
};

// Método estático para estatísticas - seguindo padrão do SeedType
clientSchema.statics.getStats = async function() {
  const total = await this.countDocuments();
  const active = await this.countDocuments({ isActive: true });
  const withEmail = await this.countDocuments({ 
    isActive: true, 
    email: { $ne: null, $ne: '' } 
  });
  const withPhone = await this.countDocuments({ 
    isActive: true, 
    phone: { $ne: null, $ne: '' } 
  });
  const withDocument = await this.countDocuments({ 
    isActive: true, 
    cnpjCpf: { $ne: null, $ne: '' } 
  });
  
  // Estatísticas por tipo de documento
  const cpfCount = await this.countDocuments({ 
    isActive: true, 
    documentType: 'CPF' 
  });
  const cnpjCount = await this.countDocuments({ 
    isActive: true, 
    documentType: 'CNPJ' 
  });
  
  return {
    total,
    active,
    inactive: total - active,
    withEmail,
    withPhone,
    withDocument,
    contactRate: active > 0 ? Math.round(((withEmail + withPhone) / active) * 100) : 0,
    documentationRate: active > 0 ? Math.round((withDocument / active) * 100) : 0,
    byDocumentType: {
      cpf: cpfCount,
      cnpj: cnpjCount,
      others: active - cpfCount - cnpjCount
    }
  };
};

// Método estático para validar se cliente pode ser removido
clientSchema.statics.canBeDeleted = async function(clientId) {
  const Product = mongoose.model('Product');
  const associatedProductsCount = await Product.countDocuments({ clientId: clientId });
  
  return {
    canDelete: associatedProductsCount === 0,
    associatedProductsCount,
    message: associatedProductsCount > 0 
      ? `Cliente possui ${associatedProductsCount} produtos associados`
      : 'Cliente pode ser removido'
  };
};

module.exports = mongoose.model('Client', clientSchema);