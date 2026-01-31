import { Request, Response, NextFunction } from 'express';
import { AdminUser, Tenant } from '../models';
import { AuditLog } from '../models';

export interface TenantResolverRequest extends Request {
    tenant?: Tenant;
    user?: {
        id: string;
        role: string;
        tenantId?: string;
        scope?: string;
    };
}

export class TenantResolver {
    static async resolveTenant(req: TenantResolverRequest, res: Response, next: NextFunction) {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Super admin bypass
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Bypass for setup route to allow creating the first workspace
            if (req.path === '/tenants/setup' || req.path === '/api/v1/admin/tenants/setup') {
                return next();
            }

            // Check if user has tenantId
            if (!req.user.tenantId) {
                // Log the issue
                await AuditLog.create({
                    action: 'TENANT_RESOLUTION_FAILURE',
                    details: `User ${req.user!.id} has no tenant assigned`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                // Redirect to tenant setup
                return res.status(403).json({
                    error: 'You don\'t have a workspace yet',
                    action: 'NAVIGATE_TO_SETUP',
                    path: '/tenant/setup',
                    message: 'Please create a workspace to continue'
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

                // Redirect to tenant setup
                return res.status(403).json({
                    error: 'Your workspace is not available',
                    action: 'NAVIGATE_TO_SETUP',
                    path: '/tenant/setup',
                    message: 'Please create a workspace to continue'
                });
            }

            // Check tenant status
            if (tenant.status !== 'ACTIVE') {
                // Log the issue
                await AuditLog.create({
                    action: 'TENANT_SUSPENDED',
                    details: `Tenant ${tenant.id} is suspended for user ${req.user!.id}`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                return res.status(403).json({
                    error: 'Your workspace is suspended',
                    action: 'CONTACT_SUPPORT',
                    message: 'Please contact support for assistance'
                });
            }

            // Attach tenant to request
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

    static async requireTenant(req: TenantResolverRequest, res: Response, next: NextFunction) {
        if (!req.tenant) {
            return res.status(403).json({
                error: 'Workspace access required',
                action: 'SELECT_WORKSPACE',
                message: 'Please select or create a workspace to continue'
            });
        }
        next();
    }

    static async validateTenantAccess(req: TenantResolverRequest, res: Response, next: NextFunction) {
        if (req.user!.role === 'SUPER_ADMIN') {
            return next();
        }

        if (!req.tenant) {
            return res.status(403).json({
                error: 'Workspace access required',
                action: 'SELECT_WORKSPACE',
                message: 'Please select or create a workspace to continue'
            });
        }

        // Verify user has access to this tenant
        if (req.user!.tenantId !== req.tenant.id) {
            return res.status(403).json({
                error: 'Access denied to this workspace',
                action: 'SELECT_WORKSPACE',
                message: 'You don\'t have access to this workspace'
            });
        }

        next();
    }
}
