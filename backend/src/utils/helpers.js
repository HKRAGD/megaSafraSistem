/**
 * Utilitários do Sistema de Câmaras Refrigeradas
 * Funções auxiliares para manipulação de dados
 * 
 * NOVA ADIÇÃO: Funções de conversão para migração de lados números → letras
 */

/**
 * Converte número do lado para letra (1=A, 2=B, etc.)
 * @param {number} numero - Número do lado (1-20)
 * @returns {string} - Letra correspondente (A-T)
 */
const numeroParaLetra = (numero) => {
  if (typeof numero !== 'number' || numero < 1 || numero > 20) {
    throw new Error('Número deve estar entre 1 e 20');
  }
  
  const letras = 'ABCDEFGHIJKLMNOPQRST';
  return letras[numero - 1];
};

/**
 * Converte letra do lado para número (A=1, B=2, etc.)
 * @param {string} letra - Letra do lado (A-T)
 * @returns {number} - Número correspondente (1-20)
 */
const letraParaNumero = (letra) => {
  if (typeof letra !== 'string' || letra.length !== 1) {
    throw new Error('Deve fornecer exatamente uma letra');
  }
  
  const letraUpper = letra.toUpperCase();
  const letras = 'ABCDEFGHIJKLMNOPQRST';
  const index = letras.indexOf(letraUpper);
  
  if (index === -1) {
    throw new Error('Letra deve estar entre A e T');
  }
  
  return index + 1;
};

/**
 * Converte código de localização antigo para novo formato
 * Q1-L2-F3-A4 → Q1-LA-F3-A4
 * @param {string} codigoAntigo - Código no formato antigo
 * @returns {string} - Código no formato novo
 */
const converterCodigoLocalizacao = (codigoAntigo) => {
  if (typeof codigoAntigo !== 'string') {
    throw new Error('Código deve ser uma string');
  }
  
  const regex = /^Q(\d+)-L(\d+)-F(\d+)-A(\d+)$/;
  const match = codigoAntigo.match(regex);
  
  if (!match) {
    throw new Error('Formato de código inválido. Esperado: Q1-L2-F3-A4');
  }
  
  const [, quadra, lado, fila, andar] = match;
  const letraLado = numeroParaLetra(parseInt(lado));
  
  return `Q${quadra}-L${letraLado}-F${fila}-A${andar}`;
};

/**
 * Valida se uma letra de lado é válida
 * @param {string} letra - Letra a ser validada
 * @returns {boolean} - True se válida
 */
const isLetraLadoValida = (letra) => {
  if (typeof letra !== 'string' || letra.length !== 1) {
    return false;
  }
  
  const letraUpper = letra.toUpperCase();
  const letrasValidas = 'ABCDEFGHIJKLMNOPQRST';
  
  return letrasValidas.includes(letraUpper);
};

/**
 * Gera código de localização com novo formato
 * @param {Object} coordinates - Coordenadas {quadra, lado, fila, andar}
 * @returns {string} - Código no formato Q1-LA-F3-A4
 */
const gerarCodigoLocalizacao = (coordinates) => {
  const { quadra, lado, fila, andar } = coordinates;
  
  // Se lado já é uma letra, usar diretamente
  if (typeof lado === 'string' && isLetraLadoValida(lado)) {
    return `Q${quadra}-L${lado.toUpperCase()}-F${fila}-A${andar}`;
  }
  
  // Se lado é número, converter para letra
  if (typeof lado === 'number') {
    const letraLado = numeroParaLetra(lado);
    return `Q${quadra}-L${letraLado}-F${fila}-A${andar}`;
  }
  
  throw new Error('Formato de lado inválido');
};

module.exports = {
  // ... existing exports ...
  
  // Novas funções para migração
  numeroParaLetra,
  letraParaNumero,
  converterCodigoLocalizacao,
  isLetraLadoValida,
  gerarCodigoLocalizacao
}; 