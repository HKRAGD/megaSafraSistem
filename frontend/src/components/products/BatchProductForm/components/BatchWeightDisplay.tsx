import { useMemo } from 'react';
import { useWatch, Control } from 'react-hook-form';
import { BatchProductFormInput } from '../../../../hooks/useBatchProducts';

interface BatchWeightDisplayProps {
  control: Control<BatchProductFormInput>;
  render: (weight: number) => React.ReactElement;
}

export const BatchWeightDisplay: React.FC<BatchWeightDisplayProps> = ({ 
  control, 
  render 
}) => {
  const products = useWatch({
    control,
    name: 'products',
  });

  const totalBatchWeight = useMemo(() => {
    if (!products) return 0;
    return products.reduce((total, product) => {
      const quantity = product?.quantity || 0;
      const weightPerUnit = product?.weightPerUnit || 0;
      return total + (quantity * weightPerUnit);
    }, 0);
  }, [products]);

  return render(totalBatchWeight);
};