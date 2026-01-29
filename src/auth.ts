import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const SECRET_KEY = process.env.JWT_SECRET || 'your-secret-key-change-me';

export interface AuthRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export function generateToken(user: { id: number; username: string }) {
  return jwt.sign({ id: user.id, username: user.username }, SECRET_KEY, { expiresIn: '24h' });
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, SECRET_KEY, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    (req as AuthRequest).user = user;
    next();
  });
}
