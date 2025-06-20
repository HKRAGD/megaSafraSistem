/**
 * Utilitários para manipulação de localizações
 * Suporte à migração de lados números → letras
 */

import { Location } from '../types';

/**
 * Converte número do lado para letra (1=A, 2=B, etc.)
 * @param numero - Número do lado (1-20)
 * @returns Letra correspondente (A-T)
 */
export const numeroParaLetra = (numero: number): string => {
  if (numero < 1 || numero > 20) {
    throw new Error('Número deve estar entre 1 e 20');
  }
  
  const letras = 'ABCDEFGHIJKLMNOPQRST';
  return letras[numero - 1];
};

/**
 * Converte letra do lado para número (A=1, B=2, etc.)
 * @param letra - Letra do lado (A-T)
 * @returns Número correspondente (1-20)
 */
export const letraParaNumero = (letra: string): number => {
  const letraUpper = letra.toUpperCase();
  const letras = 'ABCDEFGHIJKLMNOPQRST';
  const index = letras.indexOf(letraUpper);
  
  if (index === -1) {
    throw new Error('Letra deve estar entre A e T');
  }
  
  return index + 1;
};

/**
 * Gera código de localização com formato atualizado
 * @param coordinates - Coordenadas da localização
 * @returns Código no formato "Q1-LA-F3-A4"
 */
export const gerarCodigoLocalizacao = (coordinates: {
  quadra: number;
  lado: string | number;
  fila: number;
  andar: number;
}): string => {
  // Se lado ainda for número, converter para letra
  const lado = typeof coordinates.lado === 'number' 
    ? numeroParaLetra(coordinates.lado)
    : coordinates.lado;
    
  return `Q${coordinates.quadra}-L${lado}-F${coordinates.fila}-A${coordinates.andar}`;
};

/**
 * Valida se o lado está no formato correto (letra A-T)
 * @param lado - Lado a ser validado
 * @returns true se válido
 */
export const validarLado = (lado: string): boolean => {
  return /^[A-T]$/.test(lado.toUpperCase());
};

/**
 * Formata exibição de coordenadas com suporte a migração
 * @param location - Localização
 * @returns String formatada "Q1LA3A4"
 */
export const formatarCoordenadas = (location: Location): string => {
  const lado = typeof location.coordinates.lado === 'number'
    ? numeroParaLetra(location.coordinates.lado)
    : location.coordinates.lado;
    
  return `Q${location.coordinates.quadra}L${lado}F${location.coordinates.fila}A${location.coordinates.andar}`;
};

/**
 * Formata exibição completa de localização
 * @param location - Localização
 * @returns String formatada com código
 */
export const formatarLocalizacaoCompleta = (location: Location): string => {
  return `${location.code} - ${formatarCoordenadas(location)}`;
};

/**
 * Gera texto de busca para localização (compatível com números e letras)
 * @param location - Localização
 * @returns Texto em minúsculas para busca
 */
export const gerarTextoBusca = (location: Location): string => {
  const lado = typeof location.coordinates.lado === 'number'
    ? numeroParaLetra(location.coordinates.lado)
    : location.coordinates.lado;
    
  return `${location.code} ${location.coordinates.quadra} ${lado} ${location.coordinates.fila} ${location.coordinates.andar}`.toLowerCase();
};

/**
 * Converte localizações antigas (lado numérico) para novo formato
 * @param locations - Array de localizações
 * @returns Array de localizações convertidas
 */
export const converterLocalizacoes = (locations: Location[]): Location[] => {
  return locations.map(location => ({
    ...location,
    coordinates: {
      ...location.coordinates,
      lado: typeof location.coordinates.lado === 'number'
        ? numeroParaLetra(location.coordinates.lado)
        : location.coordinates.lado
    }
  }));
};

/**
 * Lista de todas as letras válidas para lados
 */
export const LETRAS_VALIDAS = 'ABCDEFGHIJKLMNOPQRST'.split('');

/**
 * Mapeamento número → letra para referência
 */
export const MAPA_NUMERO_LETRA = LETRAS_VALIDAS.reduce((acc, letra, index) => {
  acc[index + 1] = letra;
  return acc;
}, {} as Record<number, string>);

/**
 * Mapeamento letra → número para referência
 */
export const MAPA_LETRA_NUMERO = LETRAS_VALIDAS.reduce((acc, letra, index) => {
  acc[letra] = index + 1;
  return acc;
}, {} as Record<string, number>); 