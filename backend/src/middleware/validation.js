const Joi = require('joi');
const { AppError } = require('./errorHandler');

/**
 * Middleware genérico para validação de dados usando Joi
 * @param {Object} schema - Schema Joi com validações para body, params, query
 */
const validateRequest = (schema) => {
  return (req, res, next) => {
    const validationOptions = {
      abortEarly: false, // Retornar todos os erros, não apenas o primeiro
      allowUnknown: false, // Não permitir campos desconhecidos
      stripUnknown: true // Remover campos desconhecidos
    };

    const toValidate = {};
    
    // Validar body se schema definido
    if (schema.body && req.body) {
      toValidate.body = req.body;
    }
    
    // Validar params se schema definido
    if (schema.params && req.params) {
      toValidate.params = req.params;
    }
    
    // Validar query se schema definido
    if (schema.query && req.query) {
      toValidate.query = req.query;
    }

    // Validar headers se schema definido
    if (schema.headers && req.headers) {
      toValidate.headers = req.headers;
    }

    // Executar validação
    const { error, value } = Joi.object(schema).validate(toValidate, validationOptions);

    if (error) {
      const errorMessage = error.details
        .map(detail => detail.message.replace(/"/g, ''))
        .join('; ');
      
      return next(new AppError(`Dados inválidos: ${errorMessage}`, 400));
    }

    // Substituir dados da requisição pelos dados validados
    if (value.body) req.body = value.body;
    if (value.params) req.params = value.params;
    if (value.query) req.query = value.query;
    if (value.headers) req.headers = value.headers;

    next();
  };
};

/**
 * Middleware simplificado para validar apenas o body
 */
const validateBody = (schema) => {
  return validateRequest({ body: schema });
};

/**
 * Middleware simplificado para validar apenas os params
 */
const validateParams = (schema) => {
  return validateRequest({ params: schema });
};

/**
 * Middleware simplificado para validar apenas a query
 */
const validateQuery = (schema) => {
  return validateRequest({ query: schema });
};

// Schemas de validação reutilizáveis

// Validação de ObjectId do MongoDB
const objectIdSchema = Joi.string()
  .pattern(/^[0-9a-fA-F]{24}$/)
  .message('ID deve ser um ObjectId válido do MongoDB');

// Validação de paginação
const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(10),
  sort: Joi.string().default('-createdAt')
});

// Validação de filtros de data
const dateRangeSchema = Joi.object({
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso().greater(Joi.ref('startDate'))
});

// Validação básica de pesquisa
const searchSchema = Joi.object({
  search: Joi.string().trim().min(1).max(100),
  filter: Joi.string(),
  status: Joi.string()
});

// Schemas específicos para cada entidade

// Schema de validação para usuário
const userSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('ADMIN', 'OPERATOR').default('OPERATOR')
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    email: Joi.string().email().lowercase(),
    role: Joi.string().valid('ADMIN', 'OPERATOR'),
    isActive: Joi.boolean()
  }),
  
  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(6).max(128).required(),
    confirmPassword: Joi.string().valid(Joi.ref('newPassword')).required()
  })
};

// Schema de validação para tipos de sementes
const seedTypeSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).allow(''),
    optimalTemperature: Joi.number().min(-50).max(50),
    optimalHumidity: Joi.number().min(0).max(100),
    maxStorageTimeDays: Joi.number().integer().min(1).max(3650),
    specifications: Joi.object({
      density: Joi.number().min(0),
      moistureContent: Joi.number().min(0).max(100),
      germinationRate: Joi.number().min(0).max(100)
    }),
    storageNotes: Joi.string().trim().max(1000).allow('')
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().trim().max(500).allow(''),
    optimalTemperature: Joi.number().min(-50).max(50),
    optimalHumidity: Joi.number().min(0).max(100),
    maxStorageTimeDays: Joi.number().integer().min(1).max(3650),
    specifications: Joi.object({
      density: Joi.number().min(0),
      moistureContent: Joi.number().min(0).max(100),
      germinationRate: Joi.number().min(0).max(100)
    }),
    storageNotes: Joi.string().trim().max(1000).allow(''),
    isActive: Joi.boolean()
  })
};

// Schema de validação para câmaras
const chamberSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    description: Joi.string().trim().max(500).allow(''),
    currentTemperature: Joi.number().min(-50).max(50),
    currentHumidity: Joi.number().min(0).max(100),
    status: Joi.string().valid('active', 'maintenance', 'inactive').default('active'),
    dimensions: Joi.object({
      quadras: Joi.number().integer().min(1).max(100).required(),
      lados: Joi.number().integer().min(1).max(100).required(),
      filas: Joi.number().integer().min(1).max(100).required(),
      andares: Joi.number().integer().min(1).max(20).required()
    }).required(),
    settings: Joi.object({
      targetTemperature: Joi.number().min(-50).max(50),
      targetHumidity: Joi.number().min(0).max(100),
      alertThresholds: Joi.object({
        temperatureMin: Joi.number().min(-50).max(50),
        temperatureMax: Joi.number().min(-50).max(50),
        humidityMin: Joi.number().min(0).max(100),
        humidityMax: Joi.number().min(0).max(100)
      })
    }),
    lastMaintenanceDate: Joi.date().iso(),
    nextMaintenanceDate: Joi.date().iso(),
    generateLocations: Joi.boolean().default(true),
    locationOptions: Joi.object({
      defaultCapacity: Joi.number().min(1).max(10000),
      capacityVariation: Joi.boolean(),
      optimizeAccess: Joi.boolean()
    })
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    description: Joi.string().trim().max(500).allow(''),
    currentTemperature: Joi.number().min(-50).max(50),
    currentHumidity: Joi.number().min(0).max(100),
    status: Joi.string().valid('active', 'maintenance', 'inactive'),
    dimensions: Joi.object({
      quadras: Joi.number().integer().min(1).max(100),
      lados: Joi.number().integer().min(1).max(100),
      filas: Joi.number().integer().min(1).max(100),
      andares: Joi.number().integer().min(1).max(20)
    }),
    settings: Joi.object({
      targetTemperature: Joi.number().min(-50).max(50),
      targetHumidity: Joi.number().min(0).max(100),
      alertThresholds: Joi.object({
        temperatureMin: Joi.number().min(-50).max(50),
        temperatureMax: Joi.number().min(-50).max(50),
        humidityMin: Joi.number().min(0).max(100),
        humidityMax: Joi.number().min(0).max(100)
      })
    }),
    lastMaintenanceDate: Joi.date().iso(),
    nextMaintenanceDate: Joi.date().iso()
  }),

  updateConditions: Joi.object({
    temperature: Joi.number().min(-50).max(50).required(),
    humidity: Joi.number().min(0).max(100).required()
  }),

  generateLocations: Joi.object({
    maxCapacityKg: Joi.number().min(1).max(10000).default(1500),
    overwrite: Joi.boolean().default(false),
    optimizeAccess: Joi.boolean().default(true),
    capacityVariation: Joi.boolean().default(true)
  })
};

// Schema de validação para produtos
const productSchemas = {
  create: Joi.object({
    name: Joi.string().trim().min(2).max(200).required(),
    lot: Joi.string().trim().min(1).max(50).required(),
    seedTypeId: objectIdSchema.required(),
    quantity: Joi.number().integer().min(1).required(),
    storageType: Joi.string().valid('saco', 'bag').required(),
    weightPerUnit: Joi.number().min(0.001).max(1000).required(),
    locationId: objectIdSchema.allow('').optional(), // OPCIONAL: Produtos podem ser criados sem localização
    clientId: objectIdSchema.allow('').optional(), // OPCIONAL: Cliente associado ao produto
    entryDate: Joi.date().iso().default(() => new Date()),
    expirationDate: Joi.date().iso(),
    notes: Joi.string().trim().max(1000).allow(''),
    tracking: Joi.object({
      batchNumber: Joi.string().trim().max(50).allow(''),
      origin: Joi.string().trim().max(200).allow(''),
      supplier: Joi.string().trim().max(200).allow(''),
      qualityGrade: Joi.string().valid('A', 'B', 'C', 'D')
    })
  }),
  
  update: Joi.object({
    name: Joi.string().trim().min(2).max(200),
    lot: Joi.string().trim().min(1).max(50),
    seedTypeId: objectIdSchema,
    quantity: Joi.number().integer().min(1),
    storageType: Joi.string().valid('saco', 'bag'),
    weightPerUnit: Joi.number().min(0.001).max(1000),
    locationId: objectIdSchema.allow(''),
    clientId: objectIdSchema, // Cliente associado ao produto
    expirationDate: Joi.date().iso(),
    status: Joi.string().valid('CADASTRADO', 'AGUARDANDO_LOCACAO', 'LOCADO', 'AGUARDANDO_RETIRADA', 'RETIRADO', 'REMOVIDO'),
    notes: Joi.string().trim().max(1000).allow(''),
    tracking: Joi.object({
      batchNumber: Joi.string().trim().max(50).allow(''),
      origin: Joi.string().trim().max(200).allow(''),
      supplier: Joi.string().trim().max(200).allow(''),
      qualityGrade: Joi.string().valid('A', 'B', 'C', 'D')
    })
  }),

  move: Joi.object({
    newLocationId: objectIdSchema.required(),
    reason: Joi.string().trim().min(3).max(200).default('Movimentação manual')
  }),

  // NOVO: Schema para cadastro em lote de produtos
  createBatch: Joi.object({
    clientId: objectIdSchema.required().messages({
      'any.required': 'O ID do cliente é obrigatório para o cadastro em lote.',
      'string.empty': 'O ID do cliente não pode ser vazio.'
    }),
    batchName: Joi.string().trim().min(3).max(100).optional().allow('').messages({
      'string.min': 'Nome do lote deve ter pelo menos 3 caracteres.',
      'string.max': 'Nome do lote não pode exceder 100 caracteres.'
    }),
    products: Joi.array().items(Joi.object({
      name: Joi.string().trim().min(2).max(200).required().messages({
        'any.required': 'Nome do produto é obrigatório.',
        'string.min': 'Nome deve ter pelo menos 2 caracteres.',
        'string.max': 'Nome não pode exceder 200 caracteres.'
      }),
      lot: Joi.string().trim().min(1).max(50).required().messages({
        'any.required': 'Lote do produto é obrigatório.',
        'string.min': 'Lote deve ter pelo menos 1 caractere.',
        'string.max': 'Lote não pode exceder 50 caracteres.'
      }),
      seedTypeId: objectIdSchema.required().messages({
        'any.required': 'Tipo de semente é obrigatório.'
      }),
      quantity: Joi.number().integer().min(1).required().messages({
        'any.required': 'Quantidade é obrigatória.',
        'number.min': 'Quantidade deve ser pelo menos 1.',
        'number.integer': 'Quantidade deve ser um número inteiro.'
      }),
      storageType: Joi.string().valid('saco', 'bag').required().messages({
        'any.required': 'Tipo de armazenamento é obrigatório.',
        'any.only': 'Tipo de armazenamento deve ser "saco" ou "bag".'
      }),
      weightPerUnit: Joi.number().min(0.001).max(1500).required().messages({
        'any.required': 'Peso por unidade é obrigatório.',
        'number.min': 'Peso por unidade deve ser pelo menos 0.001 kg.',
        'number.max': 'Peso por unidade não pode exceder 1500 kg.'
      }),
      expirationDate: Joi.date().iso().optional().allow(null).messages({
        'date.format': 'Data de validade deve estar no formato ISO.'
      }),
      notes: Joi.string().trim().max(1000).optional().allow('').messages({
        'string.max': 'Observações não podem exceder 1000 caracteres.'
      }),
      tracking: Joi.object({
        batchNumber: Joi.string().trim().max(50).optional().allow(''),
        origin: Joi.string().trim().max(200).optional().allow(''),
        supplier: Joi.string().trim().max(200).optional().allow(''),
        qualityGrade: Joi.string().valid('A', 'B', 'C', 'D').optional().allow(null)
      }).optional().allow(null),
      // batchId e clientId são definidos pelo service, não pelo cliente
      locationId: Joi.string().optional().allow(null, ''), // Cliente pode sugerir localização
      clientId: Joi.string().optional().allow(null, '') // ClientId é definido no nível do lote
    })).min(1).max(50).required().messages({
      'array.min': 'Deve haver pelo menos 1 produto no lote.',
      'array.max': 'O número máximo de produtos por lote é 50.',
      'any.required': 'Lista de produtos é obrigatória.'
    })
  })
};

// Schema de validação para movimentações
const movementSchemas = {
  create: Joi.object({
    productId: objectIdSchema.required(),
    type: Joi.string().valid('entry', 'exit', 'transfer', 'adjustment').required(),
    fromLocationId: objectIdSchema.when('type', {
      is: 'transfer',
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    toLocationId: objectIdSchema.when('type', {
      is: Joi.string().valid('entry', 'transfer', 'adjustment'),
      then: Joi.required(),
      otherwise: Joi.optional()
    }),
    quantity: Joi.number().min(0).required(),
    weight: Joi.number().min(0).required(),
    reason: Joi.string().trim().min(3).max(200).required(),
    notes: Joi.string().trim().max(1000).allow(''),
    batchId: Joi.string().trim().max(50).allow('')
  }),

  getByProduct: Joi.object({
    productId: objectIdSchema.required()
  }),

  getByLocation: Joi.object({
    locationId: objectIdSchema.required()
  })
};

// Schema de validação para autenticação
const authSchemas = {
  login: Joi.object({
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().required()
  }),
  
  register: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    email: Joi.string().email().lowercase().required(),
    password: Joi.string().min(6).max(128).required(),
    role: Joi.string().valid('ADMIN', 'OPERATOR').default('OPERATOR')
  }),
  
  refreshToken: Joi.object({
    refreshToken: Joi.string().required()
  })
};

module.exports = {
  validateRequest,
  validateBody,
  validateParams,
  validateQuery,
  
  // Schemas básicos
  objectIdSchema,
  paginationSchema,
  dateRangeSchema,
  searchSchema,
  
  // Schemas específicos
  userSchemas,
  seedTypeSchemas,
  chamberSchemas,
  productSchemas,
  movementSchemas,
  authSchemas
}; 