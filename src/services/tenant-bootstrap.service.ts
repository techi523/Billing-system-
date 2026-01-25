import { Tenant, Package, Wallet, AdminUser } from '../models';
import { WalletService } from './wallet.service';
import { sequelize } from '../models';
import logger from '../utils/logger';
import { AuditService } from './audit.service';

export class TenantBootstrapService {
    /**
     * Initialize a new tenant with essential bootstrap data
     */
    static async bootstrapNewTenant(tenantId: string, createdBy?: string): Promise<void> {
        const transaction = await sequelize.transaction();

        try {
            // 1. Initialize tenant wallet
            await WalletService.initializeTenantWallet(tenantId);

            // 2. Create default packages for the tenant
            const defaultPackages = [
                {
                    name: '1 Hour Access',
                    price: 50,
                    durationMinutes: 60,
                    dataLimitBytes: null,
                    speedLimit: '10M/10M',
                    isEnabled: true,
                    tenantId: tenantId,
                    type: 'HOTSPOT'
                },
                {
                    name: 'Daily Pass',
                    price: 100,
                    durationMinutes: 1440, // 24 hours
                    dataLimitBytes: null,
                    speedLimit: '10M/10M',
                    isEnabled: true,
                    tenantId: tenantId,
                    type: 'HOTSPOT'
                },
                {
                    name: 'Weekly Pass',
                    price: 500,
                    durationMinutes: 10080, // 7 days
                    dataLimitBytes: null,
                    speedLimit: '10M/10M',
                    isEnabled: true,
                    tenantId: tenantId,
                    type: 'HOTSPOT'
                },
                {
                    name: 'Monthly Pass',
                    price: 1500,
                    durationMinutes: 43200, // 30 days
                    dataLimitBytes: null,
                    speedLimit: '10M/10M',
                    isEnabled: true,
                    tenantId: tenantId,
                    type: 'HOTSPOT'
                }
            ];

            await Package.bulkCreate(defaultPackages, { transaction });

            // 3. Log the bootstrap action
            await AuditService.log('TENANT_BOOTSTRAPPED', `Tenant ${tenantId} initialized with wallet and default packages`, tenantId, createdBy);

            await transaction.commit();

            logger.info(`Tenant bootstrap completed for ${tenantId}`, {
                tenantId,
                packagesCreated: defaultPackages.length,
                walletInitialized: true
            });

        } catch (error) {
            await transaction.rollback();
            logger.error('Failed to bootstrap tenant', {
                error: error instanceof Error ? error.message : String(error),
                tenantId
            });
            throw new Error('Tenant bootstrap failed');
        }
    }

    /**
     * Check if a tenant has been bootstrapped
     */
    static async isTenantBootstrapped(tenantId: string): Promise<boolean> {
        try {
            // Check if wallet exists
            const walletExists = await Wallet.findOne({
                where: { ownerId: tenantId, ownerType: 'TENANT' }
            });

            // Check if packages exist
            const packagesExist = await Package.findOne({
                where: { tenantId }
            });

            return !!walletExists && !!packagesExist;
        } catch (error) {
            logger.error('Failed to check tenant bootstrap status', {
                error: error instanceof Error ? error.message : String(error),
                tenantId
            });
            return false;
        }
    }

    /**
     * Ensure tenant is bootstrapped (idempotent)
     */
    static async ensureTenantBootstrapped(tenantId: string, createdBy?: string): Promise<void> {
        const isBootstrapped = await this.isTenantBootstrapped(tenantId);
        if (!isBootstrapped) {
            await this.bootstrapNewTenant(tenantId, createdBy);
        }
    }
}