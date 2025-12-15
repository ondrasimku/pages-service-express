import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config/config';
import { asyncContext } from '../logging/context';

export interface JwtPayload {
  sub: string;
  iss: string;
  aud: string | string[];
  iat: number;
  exp: number;
  nbf?: number;
  org_id?: string | null;
  roles?: string[];
  permissions?: string[];
  email?: string;
  name?: string;
  [key: string]: unknown;
}

export interface AuthContext {
  userId: string;
  orgId: string | null;
  roles: string[];
  permissions: string[];
  email?: string;
  name?: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
  auth?: AuthContext;
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Missing or invalid token' });
    }

    const token = authHeader.substring(7);

    if (!config.jwt.publicKey) {
      return res.status(500).json({ message: 'JWT public key not configured' });
    }

    jwt.verify(
      token,
      config.jwt.publicKey,
      {
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) {
          return res.status(401).json({ message: 'Invalid token', error: err.message });
        }

        const payload = decoded as JwtPayload;
        req.user = payload;

        const authContext: AuthContext = {
          userId: payload.sub,
          orgId: payload.org_id || null,
          roles: payload.roles || [],
          permissions: payload.permissions || [],
          email: payload.email,
          name: payload.name,
        };
        req.auth = authContext;
        
        if (authContext.userId) {
          asyncContext.updateContext({ userId: authContext.userId });
        }
        
        next();
      },
    );
  } catch (error) {
    next(error);
  }
};

