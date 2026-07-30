import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import logger from '../utils/logger';
import { AdminSession, AuditLog } from '../models';
import { config } from '../config/env';

import { UserAuth } from '../types/express';

export interface AuthRequest extends Request {
    user?: UserAuth;
}

export const authMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing or malformed Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
        let decoded: any;
        let tokenType: 'TENANT' | 'SUPER_ADMIN' = 'TENANT';

        try {
            decoded = jwt.verify(token, config.auth.jwtSecret) as any;
        } catch (err) {
            try {
                decoded = jwt.verify(token, config.auth.superAdminJwtSecret) as any;
                tokenType = 'SUPER_ADMIN';
            } catch (e) {
                throw new Error('Invalid token signature');
            }
        }

        // Strict Role Check based on Secret used
        if (tokenType === 'SUPER_ADMIN' && decoded.role !== 'SUPER_ADMIN' && decoded.role !== 'PLATFORM_OWNER') {
            throw new Error('Role mismatch for token type');
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
        if (!req.user) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        // PLATFORM_OWNER inherits and bypasses all role restrictions
        if (req.user.role === 'PLATFORM_OWNER') {
            return next();
        }

        if (!roles.includes(req.user.role)) {
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

    // Platform Owners and Super Admins bypass single-tenant restrictions
    if (req.user.role === 'SUPER_ADMIN' || req.user.role === 'PLATFORM_OWNER') {
        return next();
    }

    // All other roles MUST have a tenantId
    if (!req.user.tenantId) {
        return res.status(403).json({
            error: 'No tenant assigned to your account',
            code: 'TENANT_REQUIRED',
            action: 'NAVIGATE_TO_SETUP'
        });
    }

    next();
};
