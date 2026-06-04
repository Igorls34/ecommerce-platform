import { useCallback, useState } from 'react';

export interface ShippingOption {
  id: number;
  name: string;
  price: number;
  deadline: number;
  custom?: string;
}

export function useShippingCalculate() {
  const [shippingOptions, setShippingOptions] = useState<ShippingOption[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<ShippingOption | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const calculateShipping = useCallback(async (zipCode: string, weight?: number) => {
    setLoading(true);
    setError('');
    setShippingOptions([]);

    try {
      const cleanZipCode = String(zipCode || '').replace(/\D/g, '');

      if (cleanZipCode.length !== 8) {
        setError('CEP inválido para cálculo de frete.');
        return;
      }

      const response = await fetch('/store/shipping/calculate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          zipCode: cleanZipCode,
          ...(weight && { weight }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao calcular frete');
      }

      if (data.data && data.data.length > 0) {
        setShippingOptions(data.data);
        // Seleciona a opção mais barata por padrão
        const cheapest = data.data.reduce((prev: ShippingOption, current: ShippingOption) =>
          prev.price < current.price ? prev : current,
        );
        setSelectedShipping(cheapest);
      } else {
        setError('Nenhuma opção de frete disponível para este CEP.');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao calcular frete';
      setError(message);
      console.error('Erro em calculateShipping:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    shippingOptions,
    selectedShipping,
    setSelectedShipping,
    calculateShipping,
    loading,
    error,
  };
}
