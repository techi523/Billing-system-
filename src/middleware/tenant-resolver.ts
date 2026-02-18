import { Request, Response, NextFunction } from 'express';
import { Tenant, AuditLog } from '../models';

export class TenantResolver {
    static async resolveTenant(req: Request, res: Response, next: NextFunction) {
        try {
            // If not authenticated, we can't resolve an admin/tenant context
            // Just move to the next middleware (which might be authMiddleware or a public route)
            if (!req.user) {
                return next();
            }

            // Super admin bypass - NO tenant required
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Bypass for setup route to allow creating the first workspace
            // Also bypass for onboarding or other initialization routes if needed
            const openRoutes = ['/tenants/setup', '/api/v1/admin/tenants/setup', '/onboarding'];
            if (openRoutes.some(route => req.path.includes(route))) {
                return next();
            }

            // Check if user has tenantId
            if (!req.user.tenantId) {
                // Log the issue
                await AuditLog.create({
                    action: 'TENANT_RESOLUTION_FAILURE',
                    details: `User ${req.user!.id} (${req.user!.role}) has no tenant assigned`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                // Fail fast with clear redirection payload
                return res.status(403).json({
                    error: 'No tenant assigned to your account',
                    code: 'TENANT_REQUIRED',
                    action: 'NAVIGATE_TO_SETUP',
                    path: '/tenant/setup',
                    message: 'You don\'t have a workspace yet. Please create one to continue.'
                });
            }

            // Fetch tenant
            const tenant = await Tenant.findByPk(req.user.tenantId);

            if (!tenant) {
                // Log the issue
                await AuditLog.create({
                    action: 'TENANT_NOT_FOUND',
                    details: `Tenant ${req.user!.tenantId} not found for user ${req.user!.id}`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                return res.status(403).json({
                    error: 'Your workspace is not available',
                    code: 'TENANT_ORPHANED',
                    action: 'NAVIGATE_TO_SETUP',
                    path: '/tenant/setup',
                    message: 'Your assigned workspace could not be found. Please contact support or setup a new one.'
                });
            }

            // Check tenant status
            if (tenant.status !== 'ACTIVE') {
                return res.status(403).json({
                    error: 'Your workspace is suspended',
                    code: 'TENANT_SUSPENDED',
                    action: 'CONTACT_SUPPORT',
                    message: 'Please contact support for assistance.'
                });
            }

            // Attach tenant to request for downstream use
            req.tenant = tenant;
            next();

        } catch (error: any) {
            // Log the error
            await AuditLog.create({
                action: 'TENANT_RESOLUTION_ERROR',
                details: `Error resolving tenant for user ${req.user!.id}: ${error.message}`,
                userId: req.user!.id,
                ipAddress: req.ip
            });

            return res.status(500).json({
                error: 'System error resolving workspace',
                message: 'Please try again or contact support'
            });
        }
    }

    static async requireTenant(req: Request, res: Response, next: NextFunction) {
        // This is a strict check for routes that MUST have a resolved tenant
        if (req.user?.role === 'SUPER_ADMIN') {
            return next();
        }

        if (!req.tenant) {
            return res.status(403).json({
                error: 'Workspace access required',
                code: 'TENANT_MISSING',
                action: 'SELECT_WORKSPACE',
                message: 'Please select or create a workspace to continue'
            });
        }
        next();
    }
}
