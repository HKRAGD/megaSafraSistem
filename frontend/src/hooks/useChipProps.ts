import React from 'react';
import { ChipProps } from '@mui/material';

// Define uma interface para as props que o hook pode receber/retornar
interface UseChipPropsOptions {
  // Pode ser mais flexível na entrada, se necessário
  initialOnClick?: ((event: React.MouseEvent<HTMLDivElement>) => void) | any;
  label: string;
  // Outras props comuns que você queira padronizar
  variant?: ChipProps['variant'];
  color?: ChipProps['color'];
  deletable?: boolean;
  onDelete?: ChipProps['onDelete'];
  size?: ChipProps['size'];
  // ... outras props do Chip
}

/**
 * Hook para padronizar a criação de props para o SafeChip.
 * Pode incluir lógica de negócios ou sanitização inicial.
 */
export const useChipProps = (options: UseChipPropsOptions): ChipProps => {
  const { initialOnClick, label, ...rest } = options;

  // Lógica de sanitização inicial ou transformação antes de chegar ao SafeChip.
  // Embora SafeChip faça a sanitização final, este hook pode ser usado
  // para garantir que a lógica upstream já esteja gerando props corretas.
  const onClick = typeof initialOnClick === 'function' ? initialOnClick : undefined;

  return {
    label,
    onClick,
    ...rest,
  };
}; 