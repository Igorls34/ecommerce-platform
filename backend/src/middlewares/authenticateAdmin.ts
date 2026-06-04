import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export const authenticateAdmin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não informado.' });
    }

    const token = authHeader.split(' ')[1];
    const jwtSecret = process.env.JWT_SECRET_ADMIN || process.env.JWT_SECRET;

    if (!jwtSecret) {
      return res.status(500).json({ error: 'JWT_SECRET_ADMIN não configurado.' });
    }

    const decoded = jwt.verify(token, jwtSecret) as jwt.JwtPayload;

    if (decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso restrito a administradores.' });
    }

    return next();
  } catch (error) {
    console.error(error);
    return res.status(401).json({ error: 'Token inválido.' });
  }
};
