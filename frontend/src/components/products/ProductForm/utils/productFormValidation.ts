import * as yup from 'yup';

// Schema de validação baseado na documentação da API
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
  storageType: yup
    .string()
    .oneOf(['saco', 'bag'], 'Tipo de armazenamento inválido')
    .required('Tipo de armazenamento é obrigatório'),
  weightPerUnit: yup
    .number()
    .min(0.001, 'Peso deve ser pelo menos 0.001kg')
    .max(1000, 'Peso não pode exceder 1000kg')
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
    .max(1000, 'Observações devem ter no máximo 1000 caracteres'),
  tracking: yup.object({
    batchNumber: yup
      .string()
      .max(50, 'Número do lote deve ter no máximo 50 caracteres'),
    origin: yup
      .string()
      .max(200, 'Origem deve ter no máximo 200 caracteres'),
    supplier: yup
      .string()
      .max(200, 'Fornecedor deve ter no máximo 200 caracteres'),
    qualityGrade: yup
      .string()
      .oneOf(['A', 'B', 'C', 'D'], 'Grau de qualidade inválido'),
  }),
});

// Tipo inferido do schema para type safety
export type ProductFormData = yup.InferType<typeof productSchema>; 