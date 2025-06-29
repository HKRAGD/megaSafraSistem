import * as yup from 'yup';
import { productSchema } from '../../ProductForm/utils/productFormValidation';

// Schema for a single product within the batch (reusing existing productSchema)
// Client and Location are batch-level, so we omit them from individual products
export const batchProductItemSchema = productSchema.omit(['clientId', 'locationId']);

// Schema for the entire batch form
export const batchFormSchema = yup.object({
  products: yup
    .array(batchProductItemSchema)
    .min(1, 'Deve haver pelo menos 1 produto no lote')
    .max(50, 'Máximo de 50 produtos por lote')
    .required('Produtos são obrigatórios'),
  clientId: yup
    .string()
    .required('Cliente é obrigatório para o lote'),
});

// Type inferred from the schema for type safety
export type BatchFormData = yup.InferType<typeof batchFormSchema>;

// Helper to get errors for a specific product item
export const getProductItemErrors = (errors: any, index: number) => {
  if (!errors || !errors.products || !errors.products[index]) return {};
  return errors.products[index];
};