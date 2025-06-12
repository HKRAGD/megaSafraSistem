import * as yup from 'yup';

// Esquema de validação para login
export const loginSchema = yup.object({
  email: yup
    .string()
    .email('Digite um email válido')
    .required('Email é obrigatório'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .required('Senha é obrigatória'),
});

// Tipos inferidos dos esquemas
export type LoginFormData = yup.InferType<typeof loginSchema>;

// Esquema para produto
export const productSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(200, 'Nome deve ter no máximo 200 caracteres')
    .required('Nome é obrigatório'),
  lot: yup
    .string()
    .min(1, 'Lote é obrigatório')
    .max(50, 'Lote deve ter no máximo 50 caracteres')
    .required('Lote é obrigatório'),
  seedTypeId: yup
    .string()
    .required('Tipo de semente é obrigatório'),
  quantity: yup
    .number()
    .integer('Quantidade deve ser um número inteiro')
    .min(1, 'Quantidade deve ser pelo menos 1')
    .required('Quantidade é obrigatória'),
  weightPerUnit: yup
    .number()
    .min(0.001, 'Peso deve ser pelo menos 0.001kg')
    .max(1500, 'Peso não pode exceder 1500kg')
    .required('Peso por unidade é obrigatório'),
  locationId: yup
    .string()
    .required('Localização é obrigatória'),
  expirationDate: yup
    .date()
    .min(new Date(), 'Data de expiração deve ser futura')
    .nullable(),
  notes: yup
    .string()
    .max(1000, 'Notas devem ter no máximo 1000 caracteres')
    .optional(),
});

export type ProductFormData = yup.InferType<typeof productSchema>;

// Esquema para usuário
export const userSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .required('Nome é obrigatório'),
  email: yup
    .string()
    .email('Digite um email válido')
    .required('Email é obrigatório'),
  role: yup
    .string()
    .oneOf(['admin', 'operator', 'viewer'], 'Role inválido')
    .required('Função é obrigatória'),
  password: yup
    .string()
    .min(6, 'Senha deve ter pelo menos 6 caracteres')
    .when('isEdit', {
      is: false,
      then: (schema) => schema.required('Senha é obrigatória'),
      otherwise: (schema) => schema.optional(),
    }),
});

export type UserFormData = yup.InferType<typeof userSchema>;

// Esquema para câmara
export const chamberSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .required('Nome é obrigatório'),
  description: yup
    .string()
    .default('')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  dimensions: yup.object({
    quadras: yup
      .number()
      .integer('Quadras deve ser um número inteiro')
      .min(1, 'Deve ter pelo menos 1 quadra')
      .max(100, 'Máximo 100 quadras')
      .required('Quadras é obrigatório'),
    lados: yup
      .number()
      .integer('Lados deve ser um número inteiro')
      .min(1, 'Deve ter pelo menos 1 lado')
      .max(20, 'Máximo 20 lados (A-T)')
      .required('Lados é obrigatório'),
    filas: yup
      .number()
      .integer('Filas deve ser um número inteiro')
      .min(1, 'Deve ter pelo menos 1 fila')
      .max(100, 'Máximo 100 filas')
      .required('Filas é obrigatório'),
    andares: yup
      .number()
      .integer('Andares deve ser um número inteiro')
      .min(1, 'Deve ter pelo menos 1 andar')
      .max(20, 'Máximo 20 andares')
      .required('Andares é obrigatório'),
  }).required('Dimensões são obrigatórias'),
  status: yup
    .string()
    .oneOf(['active', 'maintenance', 'inactive'], 'Status inválido')
    .default('active'),
  settings: yup.object({
    targetTemperature: yup
      .number()
      .min(-50, 'Temperatura não pode ser menor que -50°C')
      .max(50, 'Temperatura não pode ser maior que 50°C')
      .optional(),
    targetHumidity: yup
      .number()
      .min(0, 'Umidade não pode ser menor que 0%')
      .max(100, 'Umidade não pode ser maior que 100%')
      .optional(),
    alertThresholds: yup.object({
      temperatureMin: yup.number().optional(),
      temperatureMax: yup.number().optional(),
      humidityMin: yup.number().optional(),
      humidityMax: yup.number().optional(),
    }).optional(),
  }).optional(),
});

export type ChamberFormData = yup.InferType<typeof chamberSchema>;

// Esquema para tipo de semente
export const seedTypeSchema = yup.object({
  name: yup
    .string()
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres')
    .required('Nome é obrigatório'),
  description: yup
    .string()
    .max(500, 'Descrição deve ter no máximo 500 caracteres')
    .optional(),
  optimalTemperature: yup
    .number()
    .min(-50, 'Temperatura não pode ser menor que -50°C')
    .max(50, 'Temperatura não pode ser maior que 50°C')
    .optional(),
  optimalHumidity: yup
    .number()
    .min(0, 'Umidade não pode ser menor que 0%')
    .max(100, 'Umidade não pode ser maior que 100%')
    .optional(),
  maxStorageTimeDays: yup
    .number()
    .integer('Dias deve ser um número inteiro')
    .min(1, 'Deve ser pelo menos 1 dia')
    .optional(),
});

export type SeedTypeFormData = yup.InferType<typeof seedTypeSchema>; 