import { Request, Response } from 'express';

import { ShippingCalculateParams, ShippingService } from '../services/ShippingService';

const shippingService = new ShippingService();

export const calculateShipping = async (req: Request, res: Response) => {
  try {
    const { zipCode, weight, length, width, height, insuranceValue } = req.body;

    if (!zipCode) {
      return res.status(400).json({ error: 'CEP é obrigatório' });
    }

    const params: ShippingCalculateParams = {
      zipCode,
      ...(weight !== undefined && { weight: Number(weight) }),
      ...(length !== undefined && { length: Number(length) }),
      ...(width !== undefined && { width: Number(width) }),
      ...(height !== undefined && { height: Number(height) }),
      ...(insuranceValue !== undefined && { insuranceValue: Number(insuranceValue) }),
    };

    const shippingOptions = await shippingService.calculateShipping(params);

    return res.status(200).json({
      success: true,
      data: shippingOptions,
      count: shippingOptions.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Erro ao calcular frete';

    console.error('Erro em calculateShipping:', error);

    return res.status(400).json({
      error: message,
      success: false,
    });
  }
};
