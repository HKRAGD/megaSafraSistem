import * as yup from 'yup';

export const batchIndividualProductSchema = yup.object({
  name: yup.string().min(2, 'Nome deve ter pelo menos 2 caracteres').required('Nome é obrigatório'),
  lot: yup.string().min(1, 'Lote é obrigatório').required('Lote é obrigatório'),
  seedTypeId: yup.string().required('Tipo de semente é obrigatório'),
  quantity: yup.number().integer('Quantidade deve ser um número inteiro').min(1, 'Quantidade deve ser pelo menos 1').required('Quantidade é obrigatória'),
  storageType: yup.string().oneOf(['saco', 'bag'], 'Tipo de armazenamento inválido').required('Tipo de armazenamento é obrigatório'),
  weightPerUnit: yup.number().min(0.001, 'Peso deve ser pelo menos 0.001kg').max(1500, 'Peso não pode exceder 1500kg').required('Peso por unidade é obrigatório'),
  expirationDate: yup.date().nullable().min(new Date(), 'Data de expiração deve ser futura').optional(),
  notes: yup.string().max(1000, 'Observações devem ter no máximo 1000 caracteres').optional()
});

export const batchFormSchema = yup.object({
  clientId: yup.string().required('Cliente é obrigatório para cadastro em lote'),
  batchName: yup.string()
    .min(3, 'Nome do grupo deve ter pelo menos 3 caracteres')
    .max(100, 'Nome do grupo deve ter no máximo 100 caracteres')
    .optional(),
  products: yup.array()
    .of(batchIndividualProductSchema)
    .min(1, 'É necessário adicionar pelo menos 1 produto ao lote')
    .max(50, 'O número máximo de produtos por lote é 50')
    .required('A lista de produtos não pode ser vazia')
});