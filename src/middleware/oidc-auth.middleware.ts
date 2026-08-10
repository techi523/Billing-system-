import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { publicKey } from '../routes/identity.routes';
import { AdminUser, Subscriber } from '../models';
import logger from '../utils/logger';

export interface AuthenticatedOidcRequest extends Request {
    oidcUser?: {
        sub: string;
        email: string;
        scope: string;
        name?: string;
    };
    user?: any;
}

/**
 * OIDC Validation Middleware
 * Checks central OIDC signature and scopes to ensure product boundary isolation.
 * Automatically provisions local profile upon first access.
 */
export async function oidcAuthMiddleware(req: AuthenticatedOidcRequest, res: Response, next: NextFunction) {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Missing or invalid Authorization header' });
        }

        const token = authHeader.split(' ')[1];

        // Verify Central RS256 Signature
        const decoded = jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as any;

        // Ensure Product Boundary Scope Isolation
        if (!decoded.scope || !decoded.scope.split(' ').includes('surfbill')) {
            return res.status(403).json({
                error: 'FORBIDDEN_PRODUCT',
                message: 'Your token is not authorized for SurfBill. Purchase a SurfBill subscription to gain access.'
            });
        }

        req.oidcUser = decoded;

        // Local Profile Provisioning & Synced Identity check (No billing or subscription data merged)
        let adminUser = await AdminUser.findOne({ where: { email: decoded.email } });
        if (!adminUser) {
            // Find a default tenant to attach this user to
            let firstTenant = await Tenant.findOne();
            const tenantId = firstTenant ? firstTenant.id : 'test-rad-tenant-a';

            // Provision local admin profile
            adminUser = await AdminUser.create({
                id: decoded.sub, // Sync identity ID
                email: decoded.email,
                password: 'CENTRAL_MANAGED_OIDC_OAUTH2', // no local raw password stored
                role: 'TENANT', // Default local role
                tenantId, // Must be associated with a valid workspace
                displayName: decoded.name || 'Unified Identity User',
                commissionRate: 0
            });
            logger.info(`OIDC: Provisioned local SurfBill profile for ${decoded.email}`);
        }

        // Attach local user context
        req.user = adminUser;
        next();
    } catch (err: any) {
        logger.error(`OIDC Auth Middleware verification failure: ${err.message}`);
        return res.status(401).json({ error: 'OIDC Access Token is invalid or expired' });
    }
}
