import bcrypt from 'bcryptjs';

import { prisma } from '../lib/prisma';

export async function ensureDefaultAdminUser() {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminEmail || !adminPassword) {
    throw new Error('ADMIN_EMAIL e ADMIN_PASSWORD precisam estar definidos no .env');
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  await prisma.adminUser.upsert({
    where: { email: adminEmail },
    update: {
      name: 'Administrador',
      password: hashedPassword,
    },
    create: {
      name: 'Administrador',
      email: adminEmail,
      password: hashedPassword,
    },
  });
}

export async function ensureDefaultCategory() {
  const existingCategoriesCount = await prisma.category.count();

  if (existingCategoriesCount > 0) {
    return;
  }

  await prisma.category.create({
    data: {
      name: process.env.DEFAULT_CATEGORY_NAME || 'Categoria Padrão',
    },
  });
}
