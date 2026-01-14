import { Request, Response, NextFunction } from 'express';
import { Tenant } from '../models';

export interface TenantRequest extends Request {
    tenant?: Tenant;
}

export const tenantMiddleware = async (req: TenantRequest, res: Response, next: NextFunction) => {
    // We can identify tenant by Subdomain or Header
    const host = req.headers.host;
    const tenantIdFromHeader = req.headers['x-tenant-id'];

    let tenant: Tenant | null = null;

    if (tenantIdFromHeader) {
        tenant = await Tenant.findByPk(tenantIdFromHeader as string);
    } else if (host) {
        const subdomain = host.split('.')[0];
        // Skip for local or main domain if needed
        if (subdomain !== 'localhost' && subdomain !== 'www' && subdomain !== 'app') {
            tenant = await Tenant.findOne({ where: { subdomain } });
        }
    }

    // For public portal endpoints, tenant must be found
    if (!tenant && req.path.startsWith('/api/portal/')) {
        const id = req.path.split('/')[3]; // /api/portal/:id
        if (id) {
            tenant = await Tenant.findByPk(id);
        }
    }

    if (tenant) {
        req.tenant = tenant;
    }

    next();
};
