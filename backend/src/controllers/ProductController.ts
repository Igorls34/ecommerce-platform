import { Request, Response } from 'express';

import { prisma } from '../lib/prisma';
import { uploadProductImageFile } from '../services/imageStorage';
import { deleteStoredFile } from '../services/storage/ImageStorageService';
import { normalizeProductAssetUrls, normalizeStoredAssetUrl } from '../services/storage/assetUrls';

function parseGalleryImageUrls(value: unknown): string[] {
  if (!value) {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof value !== 'string') {
    return [];
  }

  try {
    const parsedValue = JSON.parse(value);

    if (Array.isArray(parsedValue)) {
      return parsedValue
        .map(String)
        .map((item) => item.trim())
        .filter(Boolean);
    }
  } catch {
    return value
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function buildProductImagesData(imageUrls: string[]) {
  return imageUrls.map((imageUrl, index) => ({
    imageUrl: normalizeStoredAssetUrl(imageUrl) || '',
    position: index,
  }));
}

type ProductVariantInput = {
  id?: number;
  name: string;
  price: number;
  stock: number;
  sku?: string | null;
  active?: boolean;
};

function parseProductVariants(value: unknown): ProductVariantInput[] {
  if (!value) {
    return [];
  }

  let parsedValue = value;

  if (typeof value === 'string') {
    try {
      parsedValue = JSON.parse(value);
    } catch {
      return [];
    }
  }

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  const variants: ProductVariantInput[] = [];

  for (const variant of parsedValue) {
    if (!variant || typeof variant !== 'object') {
      continue;
    }

    const input = variant as Record<string, unknown>;
    const name = String(input.name || '').trim();
    const price = Number(input.price);
    const stock = Math.max(0, Math.floor(Number(input.stock || 0)));
    const id = input.id === undefined || input.id === null ? undefined : Number(input.id);
    const sku = String(input.sku || '').trim();

    if (!name || Number.isNaN(price) || price < 0) {
      continue;
    }

    variants.push({
      ...(id && !Number.isNaN(id) ? { id } : {}),
      name,
      price,
      stock,
      sku: sku || null,
      active: input.active === undefined ? true : Boolean(input.active),
    });
  }

  return variants;
}

function buildProductVariantsData(variants: ProductVariantInput[]) {
  return variants.map((variant, index) => ({
    name: variant.name,
    price: variant.price.toFixed(2),
    stock: variant.stock,
    sku: variant.sku || null,
    active: variant.active ?? true,
    position: index,
  }));
}

function resolveProductMainNumbers(
  priceValue: unknown,
  stockValue: unknown,
  variants: ProductVariantInput[],
) {
  const parsedPrice = Number(priceValue);
  const parsedStock = Number(stockValue);
  const hasVariants = variants.length > 0;
  const hasValidPrice =
    priceValue !== undefined && priceValue !== '' && Number.isFinite(parsedPrice) && parsedPrice >= 0;
  const hasValidStock =
    stockValue !== undefined && stockValue !== '' && Number.isFinite(parsedStock) && parsedStock >= 0;

  if (hasVariants) {
    return {
      price: Math.min(...variants.map((variant) => variant.price)),
      stock: variants.reduce((total, variant) => total + Math.max(0, Math.floor(variant.stock)), 0),
    };
  }

  if (!hasVariants && (!hasValidPrice || !hasValidStock)) {
    return null;
  }

  return {
    price: parsedPrice,
    stock: Math.floor(parsedStock),
  };
}

async function replaceProductVariants(productId: number, variants: ProductVariantInput[]) {
  const productVariant = (prisma as any).productVariant;

  if (!productVariant) {
    return;
  }

  const existingVariants = await productVariant.findMany({
    where: { productId },
    select: { id: true },
  });
  const receivedIds = new Set<number>();

  for (const [index, variant] of variants.entries()) {
    const data = {
      name: variant.name,
      price: variant.price.toFixed(2),
      stock: variant.stock,
      sku: variant.sku || null,
      active: variant.active ?? true,
      position: index,
    };

    if (variant.id && existingVariants.some((existing: { id: number }) => existing.id === variant.id)) {
      receivedIds.add(variant.id);
      await productVariant.update({
        where: { id: variant.id },
        data,
      });
      continue;
    }

    await productVariant.create({
      data: {
        ...data,
        productId,
      },
    });
  }

  const omittedIds = existingVariants
    .map((variant: { id: number }) => variant.id)
    .filter((id: number) => !receivedIds.has(id));

  if (omittedIds.length) {
    await productVariant.updateMany({
      where: {
        id: { in: omittedIds },
        productId,
      },
      data: { active: false },
    });
  }
}

const productInclude = {
  category: true,
  images: {
    orderBy: {
      position: 'asc',
    },
  },
  variants: {
    orderBy: {
      position: 'asc',
    },
  },
} as const;

export const createProduct = async (req: Request, res: Response) => {
  let uploadedImage: Awaited<ReturnType<typeof uploadProductImageFile>> | null = null;

  try {
    const { name, description, price, stock, categoryId, visible } = req.body;
    let imageUrl = normalizeStoredAssetUrl(req.body.imageUrl);
    const galleryImageUrls = parseGalleryImageUrls(req.body.galleryImageUrls);
    const variants = parseProductVariants(req.body.variants);
    const productNumbers = resolveProductMainNumbers(price, stock, variants);
    const parsedCategoryId = Number(categoryId);

    if (!name || Number.isNaN(parsedCategoryId)) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios.' });
    }

    if (!productNumbers) {
      return res.status(400).json({
        error: 'Preço e estoque principais são obrigatórios quando o produto não tem variações.',
      });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!category) {
      return res.status(400).json({ error: 'Categoria inválida.' });
    }

    if (req.file) {
      uploadedImage = await uploadProductImageFile(req.file);
      imageUrl = uploadedImage.imageUrl;
    }

    const product = await prisma.product.create({
      data: {
        name,
        description,
        price: productNumbers.price.toFixed(2),
        stock: productNumbers.stock,
        visible: visible === undefined ? true : Boolean(visible),
        categoryId: parsedCategoryId,
        imageUrl,
        imageKey: uploadedImage?.imageKey || null,
        imageProvider: uploadedImage?.provider || (imageUrl ? 'external' : null),
        images: {
          create: buildProductImagesData(galleryImageUrls),
        },
        variants: {
          create: buildProductVariantsData(variants),
        },
      },
      include: productInclude,
    });

    return res.status(201).json(normalizeProductAssetUrls(product));
  } catch (error) {
    if (uploadedImage) {
      await deleteStoredFile(uploadedImage.imageKey, uploadedImage.provider);
    }

    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro ao criar o produto.';
    return res.status(500).json({ error: message });
  }
};

export const getAllProducts = async (_req: Request, res: Response) => {
  try {
    const products = await prisma.product.findMany({
      include: productInclude,
      orderBy: {
        id: 'desc',
      },
    });

    return res.status(200).json(products.map(normalizeProductAssetUrls));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar os produtos.' });
  }
};

export const getCatalogProducts = async (req: Request, res: Response) => {
  try {
    const categoryId = Number(req.query.categoryId);
    const search = String(req.query.search || '').trim();

    const products = await prisma.product.findMany({
      where: {
        visible: true,
        ...(Number.isNaN(categoryId) ? {} : { categoryId }),
        ...(search
          ? {
              name: {
                contains: search,
              },
            }
          : {}),
      },
      include: productInclude,
      orderBy: {
        id: 'desc',
      },
    });

    return res.status(200).json(products.map(normalizeProductAssetUrls));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao listar o catálogo de produtos.' });
  }
};

export const getProductById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    return res.status(200).json(normalizeProductAssetUrls(product));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar o produto.' });
  }
};

export const getStoreProductById = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    const product = await prisma.product.findUnique({
      where: { id, visible: true },
      include: productInclude,
    });

    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    return res.status(200).json(normalizeProductAssetUrls(product));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao buscar o produto.' });
  }
};

export const updateProduct = async (req: Request, res: Response) => {
  let uploadedImage: Awaited<ReturnType<typeof uploadProductImageFile>> | null = null;

  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    const { name, description, price, stock, categoryId, visible } = req.body;
    let imageUrl = normalizeStoredAssetUrl(req.body.imageUrl);
    const galleryImageUrls = parseGalleryImageUrls(req.body.galleryImageUrls);
    const variants = parseProductVariants(req.body.variants);
    const productNumbers = resolveProductMainNumbers(price, stock, variants);
    const parsedCategoryId = Number(categoryId);

    if (!name || Number.isNaN(parsedCategoryId)) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios.' });
    }

    if (!productNumbers) {
      return res.status(400).json({
        error: 'Preço e estoque principais são obrigatórios quando o produto não tem variações.',
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const category = await prisma.category.findUnique({
      where: { id: parsedCategoryId },
    });

    if (!category) {
      return res.status(400).json({ error: 'Categoria inválida.' });
    }

    if (req.file) {
      uploadedImage = await uploadProductImageFile(req.file);
      imageUrl = uploadedImage.imageUrl;
    }

    await prisma.product.update({
      where: { id },
      data: {
        name,
        description,
        price: productNumbers.price.toFixed(2),
        stock: productNumbers.stock,
        visible: visible === undefined ? undefined : Boolean(visible),
        categoryId: parsedCategoryId,
        imageUrl,
        imageKey: uploadedImage?.imageKey || (imageUrl ? (existingProduct as any).imageKey : null),
        imageProvider:
          uploadedImage?.provider ||
          (imageUrl ? (existingProduct as any).imageProvider || 'external' : null),
        images: {
          deleteMany: {},
          create: buildProductImagesData(galleryImageUrls),
        },
      },
    });

    await replaceProductVariants(id, variants);

    const product = await prisma.product.findUnique({
      where: { id },
      include: productInclude,
    });

    if (uploadedImage) {
      await deleteStoredFile(
        (existingProduct as any).imageKey,
        (existingProduct as any).imageProvider,
      );
    } else if (!imageUrl && (existingProduct as any).imageKey) {
      await deleteStoredFile(
        (existingProduct as any).imageKey,
        (existingProduct as any).imageProvider,
      );
    }

    return res.status(200).json(normalizeProductAssetUrls(product));
  } catch (error) {
    if (uploadedImage) {
      await deleteStoredFile(uploadedImage.imageKey, uploadedImage.provider);
    }

    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro ao atualizar o produto.';
    return res.status(500).json({ error: message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ error: 'ID do produto inválido.' });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id },
    });

    if (!existingProduct) {
      return res.status(404).json({ error: 'Produto não encontrado.' });
    }

    const linkedOrderItems = await prisma.orderItem.count({
      where: { productId: id },
    });

    if (linkedOrderItems > 0) {
      return res.status(409).json({
        error:
          'Não é possível excluir este produto porque ele já está vinculado a pedidos. Para manter o histórico de vendas, ajuste o estoque para 0 ou edite o produto em vez de excluir.',
      });
    }

    await prisma.product.delete({
      where: { id },
    });

    try {
      await deleteStoredFile(
        (existingProduct as any).imageKey,
        (existingProduct as any).imageProvider,
      );
    } catch (storageError) {
      console.error('Produto removido, mas a imagem não pode ser apagada:', storageError);
    }

    return res.status(200).json({ message: 'Produto eliminado com sucesso.' });
  } catch (error) {
    console.error(error);
    const message = error instanceof Error ? error.message : 'Erro ao eliminar o produto.';
    return res.status(500).json({ error: message });
  }
};
