import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { prisma } from '../lib/prisma';

function getCustomerIdFromRequest(req: Request) {
  const authorization = req.headers.authorization || '';
  const [, token] = authorization.split(' ');

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET não configurado para verificacao de token.');
      return null;
    }

    const payload = jwt.verify(token, jwtSecret) as JwtPayload | string;

    if (typeof payload === 'string' || payload.role !== 'customer') {
      return null;
    }

    const customerId = Number(payload.sub);
    return Number.isNaN(customerId) ? null : customerId;
  } catch {
    return null;
  }
}

function publicCustomer(customer: {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  leadSource?: string | null;
  lastLoginAt?: Date | null;
  marketingOptIn?: boolean;
  notifyWhatsApp?: boolean;
  preferredContact?: string | null;
  defaultAddress?: unknown;
  createdAt?: Date;
}) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    leadSource: customer.leadSource,
    lastLoginAt: customer.lastLoginAt,
    marketingOptIn: customer.marketingOptIn,
    notifyWhatsApp: customer.notifyWhatsApp,
    preferredContact: customer.preferredContact,
    defaultAddress: customer.defaultAddress || null,
    createdAt: customer.createdAt,
  };
}

function parseDefaultAddress(value: unknown) {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }

  return value;
}

async function getCustomerDefaultAddress(customerId: number) {
  try {
    const rows = await prisma.$queryRawUnsafe<Array<{ defaultAddress: unknown }>>(
      'SELECT `defaultAddress` FROM `Customer` WHERE `id` = ? LIMIT 1',
      customerId,
    );

    return parseDefaultAddress(rows[0]?.defaultAddress);
  } catch {
    return null;
  }
}

async function fetchPublicCustomer(customerId: number) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      avatarUrl: true,
      leadSource: true,
      lastLoginAt: true,
      marketingOptIn: true,
      notifyWhatsApp: true,
      preferredContact: true,
      createdAt: true,
    },
  });

  if (!customer) {
    return null;
  }

  const defaultAddress = await getCustomerDefaultAddress(customerId);

  return publicCustomer({
    ...customer,
    defaultAddress,
  });
}

async function saveCustomerDefaultAddress(customerId: number, defaultAddress: ReturnType<typeof normalizeDefaultAddress>) {
  if (!defaultAddress) {
    return;
  }

  await prisma.$executeRawUnsafe(
    'UPDATE `Customer` SET `defaultAddress` = ?, `updatedAt` = NOW(3) WHERE `id` = ?',
    JSON.stringify(defaultAddress),
    customerId,
  );
}

function normalizeDefaultAddress(value: any) {
  const address = value && typeof value === 'object' ? value : {};
  const normalized = {
    zipCode: String(address.zipCode || '').replace(/\D/g, ''),
    street: String(address.street || '').trim(),
    number: String(address.number || '').trim(),
    complement: String(address.complement || '').trim(),
    neighborhood: String(address.neighborhood || '').trim(),
    city: String(address.city || '').trim(),
    state: String(address.state || '').trim().toUpperCase().slice(0, 2),
  };

  if (
    normalized.zipCode.length !== 8 ||
    normalized.street.length < 3 ||
    !normalized.number ||
    normalized.neighborhood.length < 2 ||
    normalized.city.length < 2 ||
    normalized.state.length !== 2
  ) {
    return null;
  }

  return normalized;
}

export const getStoreCustomerProfile = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para acessar sua conta.' });
    }

    const customer = await fetchPublicCustomer(customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar sua conta.' });
  }
};

export const updateStoreCustomerDefaultAddress = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para salvar seu endereço.' });
    }

    const defaultAddress = normalizeDefaultAddress(req.body);

    if (!defaultAddress) {
      return res.status(400).json({ error: 'Preencha um endereço válido.' });
    }

    await saveCustomerDefaultAddress(customerId, defaultAddress);
    const customer = await fetchPublicCustomer(customerId);

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    return res.status(200).json(customer);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível salvar seu endereço.' });
  }
};

export const getStoreCustomerOrders = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para consultar seus pedidos.' });
    }

    const orders = await prisma.order.findMany({
      where: { customerId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                imageUrl: true,
                stock: true,
                category: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
            variant: {
              select: {
                id: true,
                name: true,
                price: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(orders);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar seus pedidos.' });
  }
};

export const getStoreCustomerAvailabilityLeads = async (req: Request, res: Response) => {
  try {
    const customerId = getCustomerIdFromRequest(req);

    if (!customerId) {
      return res.status(401).json({ error: 'Entre para consultar seus avisos.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      select: { email: true },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const leads = await prisma.productAvailabilityLead.findMany({
      where: {
        OR: [
          { email: customer.email },
          { customerId },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            imageUrl: true,
            stock: true,
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        variant: {
          select: {
            id: true,
            name: true,
            stock: true,
            price: true,
            active: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(leads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível carregar seus avisos.' });
  }
};
