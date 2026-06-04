import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';
import { normalizeCategoryAssetUrls, normalizeStoredAssetUrl } from '../services/storage/assetUrls';

export const getAllCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json(categories.map(normalizeCategoryAssetUrls));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar as categorias.' });
  }
};

export const getStoreCategories = async (_req: Request, res: Response) => {
  try {
    const categories = await prisma.category.findMany({
      where: {
        visible: true,
      },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return res.status(200).json(categories.map(normalizeCategoryAssetUrls));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar as categorias.' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name || '').trim();
    const imageUrl = normalizeStoredAssetUrl(req.body.imageUrl);
    const visible = req.body.visible === undefined ? true : Boolean(req.body.visible);

    if (!name) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
    }

    const existingCategory = await prisma.category.findFirst({
      where: {
        name,
      },
    });

    if (existingCategory) {
      return res.status(400).json({ error: 'Categoria já cadastrada.' });
    }

    const category = await prisma.category.create({
      data: {
        name,
        imageUrl,
        visible,
      },
    });

    return res.status(201).json(normalizeCategoryAssetUrls(category));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao criar a categoria.' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const name = String(req.body.name || '').trim();
    const imageUrl = normalizeStoredAssetUrl(req.body.imageUrl);
    const visible = req.body.visible === undefined ? undefined : Boolean(req.body.visible);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID da categoria inválido.' });
    }

    if (!name) {
      return res.status(400).json({ error: 'Nome da categoria é obrigatório.' });
    }

    const existingCategory = await prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    const duplicatedCategory = await prisma.category.findFirst({
      where: {
        name,
        id: {
          not: id,
        },
      },
    });

    if (duplicatedCategory) {
      return res.status(400).json({ error: 'Categoria já cadastrada.' });
    }

    const category = await prisma.category.update({
      where: {
        id,
      },
      data: {
        name,
        imageUrl,
        ...(visible !== undefined ? { visible } : {}),
      },
    });

    return res.status(200).json(normalizeCategoryAssetUrls(category));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao atualizar a categoria.' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID da categoria inválido.' });
    }

    const existingCategory = await prisma.category.findUnique({
      where: {
        id,
      },
    });

    if (!existingCategory) {
      return res.status(404).json({ error: 'Categoria não encontrada.' });
    }

    const linkedProducts = await prisma.product.count({
      where: {
        categoryId: id,
      },
    });

    if (linkedProducts > 0) {
      return res.status(400).json({
        error: 'Não é possível excluir uma categoria vinculada a produtos.',
      });
    }

    await prisma.category.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({ message: 'Categoria eliminada com sucesso.' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao eliminar a categoria.' });
  }
};
