import { Package, Tenant, Router, RouterConnectionLog, sequelize } from '../models';
import { MikroTikService as MikroTikServiceInstance } from './mikrotik.service';
import { Op } from 'sequelize';
import logger from '../utils/logger';

export class PackageService {
    /**
     * Create a new package for a tenant
     */
    static async createPackage(
        tenantId: string,
        packageData: {
            name: string;
            description?: string;
            price: number;
            validityHours?: number;
            validityDays?: number;
            dataLimitMB?: number;
            uploadSpeed?: string;
            downloadSpeed?: string;
            sharedUsers?: number;
            isActive?: boolean;
        },
        userId?: string
    ): Promise<Package> {
        try {
            const tenant = await Tenant.findByPk(tenantId);
            if (!tenant) {
                throw new Error('Tenant not found');
            }

            // Validate package data
            if (!packageData.name || !packageData.price) {
                throw new Error('Package name and price are required');
            }

            if (packageData.price <= 0) {
                throw new Error('Package price must be greater than 0');
            }

            // Check for conflicting packages
            const existingPackage = await Package.findOne({
                where: {
                    tenantId,
                    name: packageData.name
                }
            });

            if (existingPackage) {
                throw new Error('A package with this name already exists');
            }

            // Create package
            const packageRecord = await Package.create({
                ...packageData,
                tenantId,
                isActive: packageData.isActive !== false // Default to true
            });

            logger.info('Package created', {
                packageId: packageRecord.id,
                name: packageRecord.name,
                tenantId,
                price: packageRecord.price
            });

            // Trigger sync to all active routers
            await this.syncPackageToAllRouters(packageRecord);

            return packageRecord;

        } catch (error: any) {
            logger.error('Failed to create package', { error: error.message });
            throw error;
        }
    }

    /**
     * Get all packages for a tenant
     */
    static async getTenantPackages(tenantId: string): Promise<Package[]> {
        try {
            const packages = await Package.findAll({
                where: { tenantId },
                order: [['price', 'ASC'], ['name', 'ASC']]
            });

            return packages;
        } catch (error: any) {
            logger.error('Failed to get tenant packages', { error: error.message });
            throw error;
        }
    }

    /**
     * Update a package
     */
    static async updatePackage(
        packageId: string,
        tenantId: string,
        updateData: Partial<{
            name: string;
            description: string;
            price: number;
            validityHours: number;
            validityDays: number;
            dataLimitMB: number;
            uploadSpeed: string;
            downloadSpeed: string;
            sharedUsers: number;
            isActive: boolean;
        }>,
        userId?: string
    ): Promise<Package> {
        try {
            const packageRecord = await Package.findOne({
                where: { id: packageId, tenantId }
            });

            if (!packageRecord) {
                throw new Error('Package not found');
            }

            // Check for name conflicts if name is being updated
            if (updateData.name && updateData.name !== packageRecord.name) {
                const existingPackage = await Package.findOne({
                    where: {
                        tenantId,
                        name: updateData.name,
                        id: { [Op.ne]: packageId }
                    }
                });

                if (existingPackage) {
                    throw new Error('A package with this name already exists');
                }
            }

            await packageRecord.update(updateData);

            logger.info('Package updated', {
                packageId,
                tenantId,
                updateData
            });

            // Trigger sync to all active routers
            await this.syncPackageToAllRouters(packageRecord);

            return packageRecord;

        } catch (error: any) {
            logger.error('Failed to update package', { error: error.message });
            throw error;
        }
    }

    /**
     * Delete a package
     */
    static async deletePackage(packageId: string, tenantId: string, userId?: string): Promise<void> {
        try {
            const packageRecord = await Package.findOne({
                where: { id: packageId, tenantId }
            });

            if (!packageRecord) {
                throw new Error('Package not found');
            }

            // Check if package is being used by active subscribers
            const activeSubscribers = await sequelize.models.Subscriber.count({
                where: {
                    packageId: packageRecord.id,
                    isActive: true,
                    expiresAt: { [Op.gt]: new Date() }
                }
            });

            if (activeSubscribers > 0) {
                throw new Error('Cannot delete package with active subscribers');
            }

            await packageRecord.destroy();

            logger.info('Package deleted', {
                packageId,
                tenantId
            });

        } catch (error: any) {
            logger.error('Failed to delete package', { error: error.message });
            throw error;
        }
    }

    /**
     * Get package details with router compatibility
     */
    static async getPackageWithCompatibility(packageId: string, tenantId: string): Promise<{
        package: Package;
        compatibleRouters: Router[];
        incompatibleRouters: Router[];
    }> {
        try {
            const packageRecord = await Package.findByPk(packageId);

            if (!packageRecord || packageRecord.tenantId !== tenantId) {
                throw new Error('Package not found');
            }

            const tenantRouters = await Router.findAll({
                where: { tenantId }
            });

            const compatibleRouters: Router[] = [];
            const incompatibleRouters: Router[] = [];

            for (const router of tenantRouters) {
                const isCompatible = await this.checkRouterCompatibility(router, packageRecord);
                if (isCompatible) {
                    compatibleRouters.push(router);
                } else {
                    incompatibleRouters.push(router);
                }
            }

            return {
                package: packageRecord,
                compatibleRouters,
                incompatibleRouters
            };

        } catch (error: any) {
            logger.error('Failed to get package compatibility', { error: error.message });
            throw error;
        }
    }

    /**
     * Check if router is compatible with package
     */
    private static async checkRouterCompatibility(router: Router, packageRecord: Package): Promise<boolean> {
        try {
            // Test router connection
            const connectionTest = await MikroTikServiceInstance.testConnection(router);
            if (!connectionTest.status) {
                return false;
            }

            // Check if router supports required features
            const capabilities = router.capabilities ? JSON.parse(router.capabilities) : {};

            // Basic compatibility check
            if (!capabilities.hotspot) {
                return false;
            }

            // Check speed limit compatibility
            if ((packageRecord.uploadSpeed || packageRecord.downloadSpeed) && !capabilities.queues) {
                return false;
            }

            return true;

        } catch (error) {
            return false;
        }
    }

    /**
     * Sync package to router
     */
    static async syncPackageToRouter(packageRecord: Package, router: Router): Promise<void> {
        try {
            logger.info('Syncing package to router', {
                packageId: packageRecord.id,
                routerId: router.id
            });

            // Map package speeds to MikroTik rate limit format (e.g., "512k/1M")
            const upload = packageRecord.uploadSpeed || '512k';
            const download = packageRecord.downloadSpeed || '512k';
            const rateLimit = `${upload}/${download}`;

            // Create or update the profile on the router
            await MikroTikServiceInstance.createHotspotProfile(router, packageRecord.name, {
                rateLimit,
                sharedUsers: packageRecord.sharedUsers || 1
            });

            logger.info('Package synced to router', {
                packageId: packageRecord.id,
                routerId: router.id
            });

            await MikroTikServiceInstance.logRouterAction(
                router.id,
                router.tenantId,
                'SYNC_PACKAGE',
                'SUCCESS',
                `Synced package ${packageRecord.name}`
            );

        } catch (error: any) {
            logger.error('Failed to sync package to router', {
                error: error.message,
                packageId: packageRecord.id,
                routerId: router.id
            });

            await MikroTikServiceInstance.logRouterAction(
                router.id,
                router.tenantId,
                'SYNC_PACKAGE',
                'FAILED',
                `Failed to sync package ${packageRecord.name}: ${error.message}`
            );

            throw error;
        }
    }

    /**
     * Sync package to all active routers for the tenant
     */
    private static async syncPackageToAllRouters(packageRecord: Package): Promise<void> {
        try {
            const routers = await Router.findAll({
                where: {
                    tenantId: packageRecord.tenantId,
                    status: 'ACTIVE'
                }
            });

            for (const router of routers) {
                try {
                    await this.syncPackageToRouter(packageRecord, router);
                } catch (err) {
                    // Log but continue with other routers
                    logger.error('Failed to sync package to specific router', {
                        routerId: router.id,
                        packageId: packageRecord.id
                    });
                }
            }
        } catch (error: any) {
            logger.error('Failed to sync package to all routers', { error: error.message });
        }
    }

    /**
     * Get package statistics
     */
    static async getPackageStats(packageId: string, tenantId: string): Promise<{
        package: Package;
        totalSales: number;
        activeSubscribers: number;
        revenue: number;
        recentSales: any[];
    }> {
        try {
            const packageRecord = await Package.findByPk(packageId);

            if (!packageRecord || packageRecord.tenantId !== tenantId) {
                throw new Error('Package not found');
            }

            // Get active subscribers count
            const activeSubscribers = await sequelize.models.Subscriber.count({
                where: {
                    packageId: packageRecord.id,
                    isActive: true,
                    expiresAt: { [Op.gt]: new Date() }
                }
            });

            // Get total sales (all subscribers for this package)
            const totalSales = await sequelize.models.Subscriber.count({
                where: { packageId: packageRecord.id }
            });

            // Calculate revenue (simplified - would need payment integration)
            const revenue = totalSales * packageRecord.price;

            // Get recent sales (last 10)
            const recentSales = await sequelize.models.Subscriber.findAll({
                where: { packageId: packageRecord.id },
                limit: 10,
                order: [['createdAt', 'DESC']],
                attributes: ['id', 'username', 'createdAt', 'expiresAt']
            });

            return {
                package: packageRecord,
                totalSales,
                activeSubscribers,
                revenue,
                recentSales
            };

        } catch (error: any) {
            logger.error('Failed to get package stats', { error: error.message });
            throw error;
        }
    }

    /**
     * Validate package configuration
     */
    static validatePackageConfiguration(packageData: any): string[] {
        const errors: string[] = [];

        if (!packageData.name || packageData.name.trim().length === 0) {
            errors.push('Package name is required');
        }

        if (!packageData.price || packageData.price <= 0) {
            errors.push('Package price must be greater than 0');
        }

        if (packageData.validityHours && packageData.validityHours <= 0) {
            errors.push('Validity hours must be greater than 0');
        }

        if (packageData.validityDays && packageData.validityDays <= 0) {
            errors.push('Validity days must be greater than 0');
        }

        if (packageData.dataLimitMB && packageData.dataLimitMB <= 0) {
            errors.push('Data limit must be greater than 0');
        }

        if (packageData.sharedUsers && packageData.sharedUsers <= 0) {
            errors.push('Shared users must be greater than 0');
        }

        // Check if at least one validity type is set
        if (!packageData.validityHours && !packageData.validityDays) {
            errors.push('At least one validity type (hours or days) must be specified');
        }

        return errors;
    }

    /**
     * Get packages available for sale on captive portal
     */
    static async getPublicPackages(tenantId: string): Promise<Package[]> {
        try {
            const packages = await Package.findAll({
                where: {
                    tenantId,
                    isActive: true
                },
                order: [['price', 'ASC'], ['name', 'ASC']]
            });

            return packages;
        } catch (error: any) {
            logger.error('Failed to get public packages', { error: error.message });
            throw error;
        }
    }
}