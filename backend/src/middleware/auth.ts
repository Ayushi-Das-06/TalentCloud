import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';

export interface AuthUser {
  id: string;
  email: string;
  role: 'FREELANCER' | 'CLIENT' | 'ADMIN';
  freelancerProfileId?: string;
  clientProfileId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

export async function authenticateToken(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    let token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;

    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication token required' });
    }

    const decoded = jwt.verify(token, config.jwt.secret) as { id: string; email: string; role: any };

    // Fetch user to ensure account is active and fetch profile IDs
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      include: {
        freelancerProfile: { select: { id: true } },
        clientProfile: { select: { id: true } },
      },
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or session expired' });
    }

    if (user.isSuspended) {
      return res.status(403).json({ success: false, error: 'Account has been suspended' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      freelancerProfileId: user.freelancerProfile?.id,
      clientProfileId: user.clientProfile?.id,
    };

    next();
  } catch (err: any) {
    return res.status(401).json({ success: false, error: 'Invalid or expired authentication token' });
  }
}

export function requireRole(allowedRoles: ('FREELANCER' | 'CLIENT' | 'ADMIN')[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]`,
      });
    }

    next();
  };
}
