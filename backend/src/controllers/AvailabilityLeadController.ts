import { Request, Response } from 'express';
import jwt, { JwtPayload } from 'jsonwebtoken';

import { prisma } from '../lib/prisma';

const LEAD_STATUSES = new Set(['waiting', 'ready', 'notified', 'converted', 'archived']);

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function getCustomerIdFromRequest(req: Request) {
  const authorization = req.headers.authorization || '';
  const [, token] = authorization.split(' ');

  if (!token) {
    return null;
  }

  try {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
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

function includeAvailabilityLeadRelations() {
  return {
    product: {
      select: {
        id: true,
        name: true,
        stock: true,
        imageUrl: true,
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
    customer: {
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        preferredContact: true,
        notifyWhatsApp: true,
      },
    },
  };
}

export const createAvailabilityLead = async (req: Request, res: Response) => {
  try {
    const productId = Number(req.params.productId);
    const variantId = req.body.variantId ? Number(req.body.variantId) : null;
    const variantKey = variantId ? String(variantId) : 'product';
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const phone = String(req.body.phone || '').trim() || null;
    const preferredContact = String(req.body.preferredContact || '').trim() || null;
    const customerId = getCustomerIdFromRequest(req);

    if (Number.isNaN(productId) || (variantId !== null && Number.isNaN(variantId))) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail sao obrigatorios.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        variants: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    if (variantId && !product.variants.some((variant) => variant.id === variantId)) {
      return res.status(400).json({ error: 'Tamanho ou variação inválida para este produto.' });
    }

    const existingLead = await prisma.productAvailabilityLead.findFirst({
      where: {
        productId,
        email,
        variantKey,
      },
    });

    const include = includeAvailabilityLeadRelations();
    const lead = existingLead
      ? await prisma.productAvailabilityLead.update({
          where: { id: existingLead.id },
          data: {
            name,
            phone,
            preferredContact,
            customerId: customerId || existingLead.customerId,
            status: 'waiting',
            archivedAt: null,
          },
          include,
        })
      : await prisma.productAvailabilityLead.create({
          data: {
            name,
            email,
            phone,
            preferredContact,
            source: 'store-product-page',
            productId,
            variantId,
            variantKey,
            customerId,
          },
          include,
        });

    return res.status(existingLead ? 200 : 201).json({
      message: 'Cadastro recebido. Avisaremos quando o produto estiver disponível.',
      lead,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao cadastrar aviso de disponibilidade.' });
  }
};

export const getAvailabilityLeads = async (_req: Request, res: Response) => {
  try {
    const leads = await prisma.productAvailabilityLead.findMany({
      include: includeAvailabilityLeadRelations(),
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(leads);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar avisos de disponibilidade.' });
  }
};

export const updateAvailabilityLead = async (req: Request, res: Response) => {
  try {
    const leadId = Number(req.params.id);
    const status = String(req.body.status || '').trim();
    const notes = req.body.notes === undefined ? undefined : String(req.body.notes || '').trim();

    if (Number.isNaN(leadId)) {
      return res.status(400).json({ error: 'ID do aviso inválido.' });
    }

    if (status && !LEAD_STATUSES.has(status)) {
      return res.status(400).json({ error: 'Status de aviso inválido.' });
    }

    const existingLead = await prisma.productAvailabilityLead.findUnique({
      where: { id: leadId },
      select: { id: true },
    });

    if (!existingLead) {
      return res.status(404).json({ error: 'Aviso não encontrado.' });
    }

    const now = new Date();
    const data: {
      status?: string;
      notes?: string | null;
      notifiedAt?: Date | null;
      convertedAt?: Date | null;
      archivedAt?: Date | null;
    } = {};

    if (status) {
      data.status = status;

      if (status === 'notified') {
        data.notifiedAt = now;
        data.archivedAt = null;
      }

      if (status === 'converted') {
        data.convertedAt = now;
        data.archivedAt = null;
      }

      if (status === 'archived') {
        data.archivedAt = now;
      }

      if (status === 'waiting' || status === 'ready') {
        data.archivedAt = null;
      }
    }

    if (notes !== undefined) {
      data.notes = notes || null;
    }

    const lead = await prisma.productAvailabilityLead.update({
      where: { id: leadId },
      data,
      include: includeAvailabilityLeadRelations(),
    });

    return res.status(200).json(lead);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar aviso de disponibilidade.' });
  }
};
