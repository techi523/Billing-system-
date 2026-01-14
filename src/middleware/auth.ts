import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import logger from '../utils/logger';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        tenantId?: string;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    if (!process.env.JWT_SECRET) {
        logger.error('CRITICAL: JWT_SECRET environment variable is not defined!');
        return res.status(500).json({ error: 'Internal Server Error' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET) as any;
        req.user = decoded;
        next();
    } catch (error: any) {
        logger.warn('Auth Failure', { error: error.message, ip: req.ip });
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const authorize = (roles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user || !roles.includes(req.user.role)) {
            logger.warn('Permission Denied', { user: req.user?.id, role: req.user?.role, rolesNeeded: roles });
            return res.status(403).json({ error: 'Access denied: insufficient permissions' });
        }
        next();
    };
};
