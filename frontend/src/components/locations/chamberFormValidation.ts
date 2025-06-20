import * as yup from 'yup';

// Schema de validação baseado na documentação da API
export const chamberSchema = yup.object({
  name: yup
    .string()
    .required('Nome é obrigatório')
    .min(2, 'Nome deve ter pelo menos 2 caracteres')
    .max(100, 'Nome deve ter no máximo 100 caracteres'),
  description: yup
    .string()
    .default('')
    .max(500, 'Descrição deve ter no máximo 500 caracteres'),
  // Campos de condições atuais da câmara (esperados pelo backend)
  currentTemperature: yup
    .number()
    .nullable()
    .default(null)
    .min(-50, 'Temperatura mínima: -50°C')
    .max(50, 'Temperatura máxima: 50°C'),
  currentHumidity: yup
    .number()
    .nullable()
    .default(null)
    .min(0, 'Umidade mínima: 0%')
    .max(100, 'Umidade máxima: 100%'),
  dimensions: yup.object({
    quadras: yup
      .number()
      .required('Quadras é obrigatório')
      .min(1, 'Deve haver pelo menos 1 quadra')
      .max(100, 'Máximo de 100 quadras'),
    lados: yup
      .number()
      .required('Lados é obrigatório')
      .min(1, 'Deve haver pelo menos 1 lado')
      .max(100, 'Máximo de 100 lados'),
    filas: yup
      .number()
      .required('Filas é obrigatório')
      .min(1, 'Deve haver pelo menos 1 fila')
      .max(100, 'Máximo de 100 filas'),
    andares: yup
      .number()
      .required('Andares é obrigatório')
      .min(1, 'Deve haver pelo menos 1 andar')
      .max(20, 'Máximo de 20 andares'),
  }),
  status: yup
    .string()
    .required('Status é obrigatório')
    .oneOf(['active', 'maintenance', 'inactive'], 'Status inválido'),
  settings: yup.object({
    targetTemperature: yup
      .number()
      .default(18)
      .min(-50, 'Temperatura mínima: -50°C')
      .max(50, 'Temperatura máxima: 50°C'),
    targetHumidity: yup
      .number()
      .default(60)
      .min(0, 'Umidade mínima: 0%')
      .max(100, 'Umidade máxima: 100%'),
    alertThresholds: yup.object({
      temperatureMin: yup
        .number()
        .default(15)
        .min(-50, 'Temperatura mínima: -50°C')
        .max(50, 'Temperatura máxima: 50°C'),
      temperatureMax: yup
        .number()
        .default(25)
        .min(-50, 'Temperatura mínima: -50°C')
        .max(50, 'Temperatura máxima: 50°C'),
      humidityMin: yup
        .number()
        .default(50)
        .min(0, 'Umidade mínima: 0%')
        .max(100, 'Umidade máxima: 100%'),
      humidityMax: yup
        .number()
        .default(70)
        .min(0, 'Umidade mínima: 0%')
        .max(100, 'Umidade máxima: 100%'),
    }),
  }),
});

// Tipo inferido do schema
export type ChamberFormData = yup.InferType<typeof chamberSchema>;

// Valores padrão para novo formulário
export const chamberFormDefaults: ChamberFormData = {
  name: '',
  description: '',
  currentTemperature: null,
  currentHumidity: null,
  dimensions: {
    quadras: 1,
    lados: 1,
    filas: 1,
    andares: 1,
  },
  status: 'active',
  settings: {
    targetTemperature: 18,
    targetHumidity: 60,
    alertThresholds: {
      temperatureMin: 15,
      temperatureMax: 25,
      humidityMin: 50,
      humidityMax: 70,
    },
  },
}; 