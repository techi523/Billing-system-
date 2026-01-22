import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../utils/logger';
import { AdminUser, AdminSession, AuditLog } from '../models';

export interface AuthRequest extends Request {
    user?: {
        id: string;
        role: string;
        tenantId?: string;
        scope?: string;
    };
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
        // Determine which secret to use
        let secret = process.env.JWT_SECRET || 'secret_key';
        let decoded: any;

        try {
            decoded = jwt.verify(token, secret) as any;
        } catch {
            // Try super admin secret
            secret = process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'super_secret_key';
            decoded = jwt.verify(token, secret) as any;
        }

        // Check session validity
        const session = await AdminSession.findOne({
            where: { tokenHash, userId: decoded.id, status: 'ACTIVE' }
        });

        if (!session) {
            return res.status(401).json({ error: 'Session expired or revoked' });
        }

        // Check if session expired
        if (new Date() > session.expiryTime) {
            await session.update({ status: 'EXPIRED' });
            return res.status(401).json({ error: 'Session expired' });
        }

        // Update last activity
        await session.update({ lastActivity: new Date() });

        req.user = decoded;
        next();
    } catch (error: any) {
        logger.warn('Auth Failure', { error: error.message, ip: req.ip });

        // Log failed auth attempt
        if (req.ip) {
            await AuditLog.create({
                action: 'FAILED_AUTH',
                details: `Failed authentication from IP: ${req.ip}`,
                ipAddress: req.ip
            });
        }

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

export const tenantGuard = (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    // Super admins cannot access tenant-specific routes
    if (req.user.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Super admin cannot access tenant routes' });
    }

    // Tenant admins must have a tenantId
    if (!req.user.tenantId) {
        return res.status(403).json({ error: 'Invalid tenant access' });
    }

    next();
};
