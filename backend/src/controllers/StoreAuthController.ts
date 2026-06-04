import { Request, Response } from 'express';
import { OAuth2Client } from 'google-auth-library';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

import { prisma } from '../lib/prisma';
import { EmailService } from '../services/EmailService';
import { PasswordService } from '../services/PasswordService';

const googleClient = new OAuth2Client();
const emailService = new EmailService();
const PASSWORD_RESET_EXPIRATION_MINUTES = 60;
const PASSWORD_RESET_RESPONSE = {
  message: 'Se existir uma conta com este e-mail, enviaremos um link para redefinir a senha.',
};

function publicCustomer(customer: {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  avatarUrl?: string | null;
  leadSource?: string | null;
  marketingOptIn?: boolean;
}) {
  return {
    id: customer.id,
    name: customer.name,
    email: customer.email,
    phone: customer.phone,
    avatarUrl: customer.avatarUrl,
    leadSource: customer.leadSource,
    marketingOptIn: customer.marketingOptIn,
  };
}

function createCustomerToken(customerId: number, email: string) {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error('JWT_SECRET não configurado.');
  }

  return jwt.sign(
    {
      sub: String(customerId),
      email,
      role: 'customer',
    },
    jwtSecret,
    { expiresIn: '7d' },
  );
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function hashResetToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function getStoreBaseUrl() {
  return String(
    process.env.STORE_BASE_URL || process.env.PUBLIC_STORE_URL || 'http://localhost:5600',
  ).replace(/\/$/, '');
}

function getPasswordResetTokenModel() {
  const model = (prisma as any).passwordResetToken;

  if (!model) {
    throw new Error('PasswordResetToken model não está disponível. Execute prisma generate.');
  }

  return model;
}

export const loginStoreWithGoogle = async (req: Request, res: Response) => {
  try {
    const credential = String(req.body.credential || '').trim();
    const googleClientId = process.env.GOOGLE_CLIENT_ID;

    if (!credential) {
      return res.status(400).json({ error: 'Credencial do Google e obrigatoria.' });
    }

    if (!googleClientId) {
      return res.status(500).json({ error: 'GOOGLE_CLIENT_ID não configurado no backend.' });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: googleClientId,
    });

    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email || payload.email_verified === false) {
      return res.status(401).json({ error: 'Conta Google não validada.' });
    }

    const email = payload.email.toLowerCase();
    const name = payload.name || email.split('@')[0];
    const now = new Date();

    const existingCustomer = await prisma.customer.findFirst({
      where: {
        OR: [{ googleId: payload.sub }, { email }],
      },
    });

    const customer = existingCustomer
      ? await prisma.customer.update({
          where: { id: existingCustomer.id },
          data: {
            name,
            email,
            googleId: payload.sub,
            avatarUrl: payload.picture || existingCustomer.avatarUrl,
            leadSource: existingCustomer.leadSource || 'google',
            lastLoginAt: now,
          },
        })
      : await prisma.customer.create({
          data: {
            name,
            email,
            googleId: payload.sub,
            avatarUrl: payload.picture || null,
            leadSource: 'google',
            lastLoginAt: now,
          },
        });

    return res.status(200).json({
      token: createCustomerToken(customer.id, customer.email),
      customer: publicCustomer(customer),
    });
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Não foi possível autenticar com Google.' });
  }
};

export const registerStoreCustomer = async (req: Request, res: Response) => {
  try {
    const name = String(req.body.name || '').trim();
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '').trim();
    const phone = String(req.body.phone || '').trim() || null;
    const marketingOptIn = Boolean(req.body.marketingOptIn);

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, e-mail e senha sao obrigatorios.' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Informe um e-mail válido.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const existingCustomer = await prisma.customer.findUnique({
      where: { email },
    });

    if (existingCustomer) {
      return res.status(409).json({ error: 'Este e-mail já está registrado.' });
    }

    const hashedPassword = await PasswordService.hash(password);
    const now = new Date();

    const customer = await prisma.customer.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone,
        leadSource: 'store_register',
        marketingOptIn,
        lastLoginAt: now,
      },
    });

    return res.status(201).json({
      token: createCustomerToken(customer.id, customer.email),
      customer: publicCustomer(customer),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível criar sua conta.' });
  }
};

export const loginStoreCustomer = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '').trim();

    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha sao obrigatorios.' });
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      return res.status(404).json({ error: 'Não encontramos uma conta com este e-mail.' });
    }

    if (!customer.password) {
      return res.status(409).json({
        error: 'Esta conta ainda não tem senha cadastrada. Crie uma nova conta para continuar.',
      });
    }

    const passwordMatch = await PasswordService.verify(password, customer.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Senha incorreta.' });
    }

    const now = new Date();
    await prisma.customer.update({
      where: { id: customer.id },
      data: { lastLoginAt: now },
    });

    return res.status(200).json({
      token: createCustomerToken(customer.id, customer.email),
      customer: publicCustomer(customer),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível fazer login.' });
  }
};

export const requestStorePasswordReset = async (req: Request, res: Response) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    if (!email || !isValidEmail(email)) {
      return res.status(200).json(PASSWORD_RESET_RESPONSE);
    }

    const customer = await prisma.customer.findUnique({
      where: { email },
    });

    if (!customer) {
      return res.status(200).json(PASSWORD_RESET_RESPONSE);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashResetToken(rawToken);
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_EXPIRATION_MINUTES * 60 * 1000);
    const passwordResetToken = getPasswordResetTokenModel();

    await passwordResetToken.deleteMany({
      where: {
        customerId: customer.id,
        usedAt: null,
      },
    });

    await passwordResetToken.create({
      data: {
        customerId: customer.id,
        tokenHash,
        expiresAt,
      },
    });

    await emailService.sendPasswordReset(email, `${getStoreBaseUrl()}/redefinir-senha/${rawToken}`);

    return res.status(200).json(PASSWORD_RESET_RESPONSE);
  } catch (error) {
    console.error(error);
    return res.status(200).json(PASSWORD_RESET_RESPONSE);
  }
};

export const confirmStorePasswordReset = async (req: Request, res: Response) => {
  try {
    const token = String(req.body.token || '').trim();
    const password = String(req.body.password || '').trim();

    if (!token || !password) {
      return res.status(400).json({ error: 'Token e nova senha sao obrigatorios.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'A senha deve ter pelo menos 8 caracteres.' });
    }

    const tokenHash = hashResetToken(token);
    const passwordResetToken = getPasswordResetTokenModel();
    const resetToken = await passwordResetToken.findUnique({
      where: { tokenHash },
      include: { customer: true },
    });

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() <= Date.now()) {
      return res.status(400).json({
        error: 'Link de redefinição inválido ou expirado. Solicite um novo link.',
      });
    }

    const hashedPassword = await PasswordService.hash(password);
    const now = new Date();

    await prisma.$transaction([
      prisma.customer.update({
        where: { id: resetToken.customerId },
        data: {
          password: hashedPassword,
          lastLoginAt: now,
        },
      }),
      passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: now },
      }),
      passwordResetToken.deleteMany({
        where: {
          customerId: resetToken.customerId,
          usedAt: null,
          expiresAt: {
            lt: now,
          },
        },
      }),
    ]);

    return res.status(200).json({
      token: createCustomerToken(resetToken.customer.id, resetToken.customer.email),
      customer: publicCustomer(resetToken.customer),
      message: 'Senha redefinida com sucesso.',
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Não foi possível redefinir sua senha.' });
  }
};
