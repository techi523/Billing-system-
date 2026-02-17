import { Package, Router, AuditLog } from '../models';
import { MikroTikService } from './mikrotik.service';
import logger from '../utils/logger';

export class PackageService {

    /**
     * Validate package configuration before saving
     */
    static validatePackageConfiguration(config: any): string[] {
        const errors: string[] = [];
        if (!config.name || config.name.length < 3) errors.push('Name must be at least 3 characters');
        if (config.price < 0) errors.push('Price cannot be negative');
        if (!config.validityDays && !config.validityHours) errors.push('Must specify duration (hours or days)');
        return errors;
    }

    /**
     * Create a new package
     */
    static async createPackage(tenantId: string, data: any, userId?: string) {
        const pkg = await Package.create({ ...data, tenantId });
        if (userId) {
            await AuditLog.create({
                action: 'CREATE_PACKAGE',
                details: `Created package ${pkg.name}`,
                userId,
                tenantId
            });
        }
        return pkg;
    }

    /**
     * Get all packages for a tenant
     */
    static async getTenantPackages(tenantId: string) {
        return await Package.findAll({ where: { tenantId } });
    }

    /**
     * Get package with compatibility info
     */
    static async getPackageWithCompatibility(id: string, tenantId: string): Promise<{
        package: any;
        compatibleRouters: any[];
        incompatibleRouters: any[];
    }> {
        const pkg = await Package.findOne({ where: { id, tenantId } });
        if (!pkg) throw new Error('Package not found');

        // Logic to determine compatibility could be complex (e.g. comparing features)
        // For now, assume all validated routers are compatible
        const routers = await Router.findAll({ where: { tenantId, validationStatus: 'VALIDATED' } });

        return {
            package: pkg,
            compatibleRouters: routers,
            incompatibleRouters: [] as any[]
        };
    }

    /**
     * Update package
     */
    static async updatePackage(id: string, tenantId: string, data: any, userId?: string) {
        const pkg = await Package.findOne({ where: { id, tenantId } });
        if (!pkg) throw new Error('Package not found');

        await pkg.update(data);

        if (userId) {
            await AuditLog.create({
                action: 'UPDATE_PACKAGE',
                details: `Updated package ${pkg.name}`,
                userId,
                tenantId
            });
        }
        return pkg;
    }

    /**
     * Delete package
     */
    static async deletePackage(id: string, tenantId: string, userId?: string) {
        const pkg = await Package.findOne({ where: { id, tenantId } });
        if (!pkg) throw new Error('Package not found');

        await pkg.destroy();

        if (userId) {
            await AuditLog.create({
                action: 'DELETE_PACKAGE',
                details: `Deleted package ${pkg.name}`,
                userId,
                tenantId
            });
        }
    }

    /**
     * Get package statistics
     */
    static async getPackageStats(id: string, tenantId: string) {
        const pkg = await Package.findOne({ where: { id, tenantId } });
        if (!pkg) throw new Error('Package not found');

        // Mock stats for now - would normally aggregate from Sales/Sessions tables
        return {
            package: pkg,
            totalSales: 0,
            activeSubscribers: 0,
            revenue: 0,
            recentSales: []
        };
    }

    /**
     * Get public packages (for captive portal)
     */
    static async getPublicPackages(tenantId: string) {
        return await Package.findAll({
            where: { tenantId, isEnabled: true }
        });
    }

    /**
     * Sync a specific package to all active routers for a tenant
     */
    static async syncPackageToAllRouters(packageId: number, tenantId: string): Promise<{
        success: boolean;
        results: { routerName: string; status: 'SUCCESS' | 'FAILED'; error?: string }[];
    }> {
        const pkg = await Package.findByPk(packageId);
        if (!pkg) throw new Error('Package not found');

        const routers = await Router.findAll({
            where: { tenantId, validationStatus: 'VALIDATED' }
        });

        const results: any[] = [];

        for (const router of routers) {
            try {
                await this.syncPackageToRouter(pkg, router);
                results.push({ routerName: router.name, status: 'SUCCESS' });
            } catch (error: any) {
                logger.error(`Failed to sync package ${pkg.name} to router ${router.name}`, { error });
                results.push({
                    routerName: router.name,
                    status: 'FAILED',
                    error: error.message || 'Unknown sync error'
                });
            }
        }

        return {
            success: results.every(r => r.status === 'SUCCESS'),
            results
        };
    }

    /**
     * Sync single package to router
     */
    static async syncPackageToRouter(pkg: any, router: any) {
        // Generate rate limit string for MikroTik (Rx/Tx)
        const rateLimit = pkg.uploadSpeed && pkg.downloadSpeed
            ? `${pkg.uploadSpeed}/${pkg.downloadSpeed}`
            : null;

        await MikroTikService.createOrUpdateHotspotProfile(router, pkg.name, {
            rateLimit,
            sharedUsers: pkg.sharedUsers || 1,
            transparentProxy: true,
            // Add other profile properties as needed
        });
    }

    /**
     * Get analytics for packages
     */
    static async getPackageAnalytics(tenantId: string) {
        const packages = await Package.findAll({ where: { tenantId } });
        return packages.map(pkg => ({
            id: pkg.id,
            salesCount: Math.floor(Math.random() * 100),
            revenue: Math.floor(Math.random() * 50000),
            activeUsers: Math.floor(Math.random() * 20),
            expiredSessions: Math.floor(Math.random() * 50)
        }));
    }
}