interface InvalidChipOnClickLog {
  value: any; // O valor que foi passado como onClick
  type: string; // O typeof do valor
  componentSource?: string; // Opcional: nome do componente pai, se puder ser rastreado
  props?: Record<string, any>; // Opcional: outras props do Chip para contexto
}

/**
 * Função para logar tentativas de passar um onClick inválido para um Chip.
 * Em um ambiente de produção, isso enviaria para um serviço de telemetria.
 */
export const logInvalidChipOnClick = (data: InvalidChipOnClickLog) => {
  const message = `Invalid 'onClick' prop received by SafeChip. Expected 'function' or 'undefined', but got '${data.type}' with value: ${JSON.stringify(data.value)}.`;
  console.warn(message, data);

  // Exemplo de integração com um serviço de telemetria (descomente e configure conforme necessário):
  // if (process.env.NODE_ENV === 'production' && window.Sentry) {
  //   window.Sentry.captureMessage(message, {
  //     level: 'warning',
  //     extra: data,
  //   });
  // }
  // if (window.datadogLogger) {
  //   window.datadogLogger.warn(message, data);
  // }
}; 