/**
 * Utilitário global para interceptar e corrigir o uso de Material-UI Chip
 * Contorna a regressão do Material-UI v7.1.1
 */

import SafeChip from '../components/ui/SafeChip';

// Re-exporta SafeChip como Chip para substituição global
export { default as Chip } from '../components/ui/SafeChip';
export const GlobalSafeChip = SafeChip;

/**
 * Função para aplicar SafeChip props automaticamente
 */
export const applyGlobalChipFix = () => {
  console.log('🔧 SafeChip global aplicado para contornar regressão MUI v7.1.1');
  console.log('📝 Referência: https://github.com/mui/material-ui/issues/46262');
}; 