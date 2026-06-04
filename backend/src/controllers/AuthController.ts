import bcrypt from 'bcryptjs';
import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';

export const loginAdmin = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    const adminUser = await prisma.adminUser.findUnique({
      where: { email },
    });

    if (!adminUser) {
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    const isPasswordValid = await bcrypt.compare(password, adminUser.password);

    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Credenciais invalidas.' });
    }

    const jwtSecret = process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET_ADMIN não configurado.' });
    }

    const token = jwt.sign(
      {
        sub: String(adminUser.id),
        email: adminUser.email,
        role: 'admin',
      },
      jwtSecret,
      { expiresIn: '1h' },
    );

    return res.status(200).json({
      token,
      admin: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Erro ao fazer login.' });
  }
};
