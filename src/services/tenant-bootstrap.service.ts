import { Wallet } from '../models';
import { WalletService } from './wallet.service';
import { sequelize } from '../models';
import logger from '../utils/logger';
import { AuditService } from './audit.service';

export class TenantBootstrapService {
    /**
     * Initialize a new tenant with essential platform data (Wallet only)
     * No routers or packages are auto-created.
     */
    static async bootstrapNewTenant(tenantId: string, createdBy?: string): Promise<void> {
        const transaction = await sequelize.transaction();

        try {
            // 1. Initialize tenant wallet (Mandatory for receiving payments)
            await WalletService.initializeTenantWallet(tenantId, transaction);

            // 2. Log the bootstrap action
            await AuditService.log('TENANT_BOOTSTRAPPED', `Tenant ${tenantId} initialized. Wallet created. No default packages allocated.`, tenantId, createdBy);

            await transaction.commit();

            logger.info(`Tenant bootstrap completed for ${tenantId}. Manual configuration required.`, {
                tenantId,
                walletInitialized: true
            });

        } catch (error) {
            if (transaction) await transaction.rollback();
            logger.error('Failed to bootstrap tenant', {
                error: error instanceof Error ? error.message : String(error),
                tenantId
            });
            throw new Error('Tenant bootstrap failed');
        }
    }

    /**
     * Check if a tenant has been initialized (has a wallet)
     */
    static async isTenantBootstrapped(tenantId: string): Promise<boolean> {
        try {
            // Check if wallet exists
            const walletExists = await Wallet.findOne({
                where: { ownerId: tenantId, ownerType: 'TENANT' }
            });

            return !!walletExists;
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