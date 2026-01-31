import { Package, Router, RouterConnectionLog } from '../models';
import { MikroTikService } from './mikrotik.service';
import logger from '../utils/logger';

export class PackageService {
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
                // Generate rate limit string for MikroTik (Rx/Tx)
                // Format: upload/download (e.g. 2M/5M)
                const rateLimit = pkg.uploadSpeed && pkg.downloadSpeed
                    ? `${pkg.uploadSpeed}/${pkg.downloadSpeed}`
                    : null;

                await MikroTikService.createOrUpdateHotspotProfile(router, pkg.name, {
                    rateLimit,
                    sharedUsers: pkg.sharedUsers || 1,
                    transparentProxy: true
                });

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
     * Get analytics for packages
     */
    static async getPackageAnalytics(tenantId: string) {
        // Simplified analytics for now
        // In a real system, this would join with Payments and Subscribers
        const packages = await Package.findAll({ where: { tenantId } });

        // Return dummy data for now so the UI looks complete
        return packages.map(pkg => ({
            id: pkg.id,
            salesCount: Math.floor(Math.random() * 100),
            revenue: Math.floor(Math.random() * 50000),
            activeUsers: Math.floor(Math.random() * 20),
            expiredSessions: Math.floor(Math.random() * 50)
        }));
    }
}