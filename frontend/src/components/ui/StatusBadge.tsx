import React from 'react';
import { Chip, ChipProps, Tooltip } from '@mui/material';
import { 
  getProductStatusConfig, 
  getWithdrawalStatusConfig, 
  getWithdrawalTypeConfig,
  ProductStatus,
  WithdrawalStatus,
  WithdrawalType
} from '../../utils/fsmHelpers';

// ============================================================================
// INTERFACES
// ============================================================================

interface BaseStatusBadgeProps extends Omit<ChipProps, 'label' | 'color' | 'icon'> {
  showTooltip?: boolean;
  showIcon?: boolean;
}

interface ProductStatusBadgeProps extends BaseStatusBadgeProps {
  type: 'product';
  status: ProductStatus | string;
}

interface WithdrawalStatusBadgeProps extends BaseStatusBadgeProps {
  type: 'withdrawal-status';
  status: WithdrawalStatus | string;
}

interface WithdrawalTypeBadgeProps extends BaseStatusBadgeProps {
  type: 'withdrawal-type';
  status: WithdrawalType | string;
}

type StatusBadgeProps = ProductStatusBadgeProps | WithdrawalStatusBadgeProps | WithdrawalTypeBadgeProps;

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

/**
 * Badge padronizado para exibir status do sistema FSM
 * Suporta status de produtos, solicitações de retirada e tipos de retirada
 */
export const StatusBadge: React.FC<StatusBadgeProps> = ({
  type,
  status,
  showTooltip = true,
  showIcon = true,
  variant = 'outlined',
  size = 'small',
  ...chipProps
}) => {
  // Obter configuração baseada no tipo
  const getConfig = () => {
    switch (type) {
      case 'product':
        return getProductStatusConfig(status);
      case 'withdrawal-status':
        return getWithdrawalStatusConfig(status);
      case 'withdrawal-type':
        return getWithdrawalTypeConfig(status);
      default:
        return getProductStatusConfig(status);
    }
  };

  const config = getConfig();

  const chipElement = (
    <Chip
      label={config.label}
      color={config.color}
      icon={showIcon ? config.icon : undefined}
      variant={variant}
      size={size}
      {...chipProps}
    />
  );

  // Envolver com tooltip se solicitado
  if (showTooltip) {
    return (
      <Tooltip title={config.description} arrow placement="top">
        <span>{chipElement}</span>
      </Tooltip>
    );
  }

  return chipElement;
};

// ============================================================================
// COMPONENTES DE CONVENIÊNCIA
// ============================================================================

/**
 * Badge específico para status de produtos
 */
export const ProductStatusBadge: React.FC<Omit<ProductStatusBadgeProps, 'type'>> = (props) => (
  <StatusBadge type="product" {...props} />
);

/**
 * Badge específico para status de solicitações de retirada
 */
export const WithdrawalStatusBadge: React.FC<Omit<WithdrawalStatusBadgeProps, 'type'>> = (props) => (
  <StatusBadge type="withdrawal-status" {...props} />
);

/**
 * Badge específico para tipos de retirada
 */
export const WithdrawalTypeBadge: React.FC<Omit<WithdrawalTypeBadgeProps, 'type'>> = (props) => (
  <StatusBadge type="withdrawal-type" {...props} />
);

// ============================================================================
// COMPONENTE PARA MÚLTIPLOS BADGES
// ============================================================================

interface StatusBadgeGroupProps {
  items: Array<{
    type: 'product' | 'withdrawal-status' | 'withdrawal-type';
    status: string;
    showTooltip?: boolean;
    showIcon?: boolean;
  }>;
  spacing?: number;
  direction?: 'row' | 'column';
}

/**
 * Grupo de badges de status com espaçamento consistente
 */
export const StatusBadgeGroup: React.FC<StatusBadgeGroupProps> = ({
  items,
  spacing = 1,
  direction = 'row',
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap: `${spacing * 8}px`,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}
    >
      {items.map((item, index) => (
        <StatusBadge
          key={index}
          type={item.type}
          status={item.status}
          showTooltip={item.showTooltip}
          showIcon={item.showIcon}
        />
      ))}
    </div>
  );
};

export default StatusBadge;