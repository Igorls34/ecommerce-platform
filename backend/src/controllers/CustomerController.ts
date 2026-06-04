import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';
import { decryptCpf, encryptCpf } from '../services/SensitiveDataService';

export const getAdminCustomers = async (_req: Request, res: Response) => {
  try {
    const customers = await prisma.customer.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        avatarUrl: true,
        leadSource: true,
        marketingOptIn: true,
        lastLoginAt: true,
        createdAt: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json(customers);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar clientes.' });
  }
};

export const getAdminCustomerById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do cliente inválido.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        avatarUrl: true,
        leadSource: true,
        marketingOptIn: true,
        notifyWhatsApp: true,
        preferredContact: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    const availabilityLeads = await prisma.productAvailabilityLead.findMany({
      where: { email: customer.email },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      ...customer,
      cpf: decryptCpf(customer.cpf),
      availabilityLeads,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao carregar cliente.' });
  }
};

export const updateAdminCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do cliente inválido.' });
    }

    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '').trim().toLowerCase();
    const phone = String(req.body.phone || '').trim();
    const cpf = String(req.body.cpf || '').trim();
    const preferredContact = String(req.body.preferredContact || '').trim();
    const encryptedCpf = cpf ? encryptCpf(cpf) : null;

    if (!name || !email) {
      return res.status(400).json({ error: 'Nome e e-mail sao obrigatorios.' });
    }

    if (cpf && !encryptedCpf) {
      return res
        .status(500)
        .json({ error: 'ENCRYPTION_KEY não configurada. CPF nao foi salvo.' });
    }

    const customer = await prisma.customer.update({
      where: { id },
      data: {
        name,
        email,
        phone: phone || null,
        cpf: encryptedCpf,
        notifyWhatsApp: Boolean(req.body.notifyWhatsApp),
        preferredContact: preferredContact || null,
        marketingOptIn: Boolean(req.body.marketingOptIn),
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        avatarUrl: true,
        leadSource: true,
        marketingOptIn: true,
        notifyWhatsApp: true,
        preferredContact: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        orders: {
          include: {
            items: {
              include: {
                product: {
                  select: {
                    id: true,
                    name: true,
                    imageUrl: true,
                  },
                },
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    const availabilityLeads = await prisma.productAvailabilityLead.findMany({
      where: { email: customer.email },
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
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return res.status(200).json({
      ...customer,
      cpf: decryptCpf(customer.cpf),
      availabilityLeads,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar cliente.' });
  }
};

export const deleteAdminCustomer = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do cliente inválido.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Cliente não encontrado.' });
    }

    if (customer._count.orders > 0) {
      return res.status(409).json({
        error: 'Não é possível excluir cliente com pedidos vinculados. Mantenha o historico.',
      });
    }

    await prisma.productAvailabilityLead.deleteMany({
      where: { email: customer.email },
    });

    await prisma.customer.delete({
      where: { id },
    });

    return res.status(204).send();
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao excluir cliente.' });
  }
};
