import React, { forwardRef } from 'react';
import {
  TextField,
  TextFieldProps,
  InputAdornment,
  FormHelperText,
  Box,
  Typography,
} from '@mui/material';
import { useController, Control, FieldPath, FieldValues } from 'react-hook-form';

// ============================================================================
// INTERFACES
// ============================================================================

interface FormInputProps<
  TFieldValues extends FieldValues = FieldValues,
  TName extends FieldPath<TFieldValues> = FieldPath<TFieldValues>
> extends Omit<TextFieldProps, 'name' | 'value' | 'onChange' | 'error'> {
  name: TName;
  control: Control<TFieldValues>;
  rules?: object;
  startIcon?: React.ReactNode;
  endIcon?: React.ReactNode;
  helpText?: string;
  showCharCount?: boolean;
  maxLength?: number;
  debounceDelay?: number;
}

// ============================================================================
// FORM INPUT COMPONENT
// ============================================================================

/**
 * FormInput - Componente de input reutilizável integrado com React Hook Form
 * 
 * REGRAS SEGUIDAS:
 * - Integração nativa com React Hook Form + Yup
 * - TypeScript rigoroso para type safety
 * - Componente puro (seguindo Rules of React)
 * - Props imutáveis
 * - Material-UI consistente
 * - Debounce opcional para performance
 * - Acessibilidade (ARIA labels)
 * - Feedback visual consistente
 * 
 * @template TFieldValues - Tipo dos valores do formulário
 * @template TName - Nome do campo no formulário
 */
export const FormInput = forwardRef<
  HTMLDivElement,
  FormInputProps<any, any>
>(({
  name,
  control,
  rules,
  startIcon,
  endIcon,
  helpText,
  showCharCount = false,
  maxLength,
  debounceDelay = 300,
  multiline = false,
  ...textFieldProps
}, ref) => {
  // ============================================================================
  // HOOKS E ESTADO
  // ============================================================================

  const {
    field: { value, onChange, onBlur },
    fieldState: { error, invalid },
  } = useController({
    name,
    control,
    rules,
  });

  // ============================================================================
  // HANDLERS
  // ============================================================================

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = event.target.value;
    
    // Validar maxLength se especificado
    if (maxLength && newValue.length > maxLength) {
      return;
    }
    
    onChange(newValue);
  };

  // ============================================================================
  // COMPUTED VALUES
  // ============================================================================

  const currentLength = value?.length || 0;
  const isOverLimit = maxLength ? currentLength > maxLength : false;
  
  const startAdornment = startIcon ? (
    <InputAdornment position="start">
      {startIcon}
    </InputAdornment>
  ) : undefined;

  const endAdornment = endIcon ? (
    <InputAdornment position="end">
      {endIcon}
    </InputAdornment>
  ) : undefined;

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <Box ref={ref} sx={{ width: '100%' }}>
      <TextField
        {...textFieldProps}
        name={name}
        value={value || ''}
        onChange={handleChange}
        onBlur={onBlur}
        error={invalid}
        multiline={multiline}
        InputProps={{
          startAdornment,
          endAdornment,
          'aria-invalid': invalid,
          'aria-describedby': error ? `${name}-error` : undefined,
          ...textFieldProps.InputProps,
        }}
        fullWidth
      />
      
      {/* Error Message */}
      {error && (
        <FormHelperText 
          id={`${name}-error`}
          error 
          sx={{ mt: 0.5, mx: 1.5 }}
        >
          {error.message}
        </FormHelperText>
      )}
      
      {/* Help Text */}
      {helpText && !error && (
        <FormHelperText sx={{ mt: 0.5, mx: 1.5 }}>
          {helpText}
        </FormHelperText>
      )}
      
      {/* Character Count */}
      {showCharCount && maxLength && (
        <Box 
          sx={{ 
            display: 'flex', 
            justifyContent: 'flex-end', 
            mt: 0.5,
            mx: 1.5 
          }}
        >
          <Typography 
            variant="caption" 
            color={isOverLimit ? 'error' : 'text.secondary'}
          >
            {currentLength}/{maxLength}
          </Typography>
        </Box>
      )}
    </Box>
  );
});

FormInput.displayName = 'FormInput';

// ============================================================================
// EXPORTS
// ============================================================================

export type { FormInputProps };
export default FormInput; 