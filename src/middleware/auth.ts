import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, JwtPayload } from '../utils/jwt';

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('🔐 Auth middleware - Path:', req.path);
  console.log('🔐 Auth header presente:', !!authHeader);
  console.log('🔐 Token estratto:', token ? 'presente' : 'mancante');

  if (!token) {
    console.log('❌ Nessun token fornito');
    return res.status(401).json({ error: 'Access token required' });
  }

  const payload = verifyAccessToken(token);
  console.log('🔐 Token verificato:', payload ? 'valido' : 'invalido/scaduto');
  
  if (!payload) {
    console.log('❌ Token invalido o scaduto');
    return res.status(403).json({ error: 'Invalid or expired token' });
  }

  console.log('✅ Autenticazione OK per utente:', payload.email, 'ruolo:', payload.role);
  req.user = payload;
  next();
};

export const requireAdmin = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (req.user?.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};