import { Router } from 'express';
import { Tenant, AdminUser, Payment, Wallet, WalletTransaction, PlatformFee, TieredFee, sequelize } from '../models';
import { authMiddleware, AuthRequest, authorize } from '../middleware/auth';
import { AnalyticsService } from '../services/analytics.service';
import { AuditService } from '../services/audit.service';
import { SettlementService } from '../services/settlement.service';
import { WalletService } from '../services/wallet.service';
import { AggregatorService } from '../services/aggregator.service';

const router = Router();
router.use(authMiddleware);
router.use(authorize(['SUPER_ADMIN']));

// 1. List all Tenants
router.get('/tenants', async (req, res) => {
    const tenants = await Tenant.findAll({
        attributes: ['id', 'name', 'subdomain', 'status', 'aggregatorSubAccountId', 'commissionPercentage']
    });
    res.json(tenants);
});

// Update Tenant Aggregator Settings
router.put('/tenants/:id/aggregator', async (req: any, res) => {
    try {
        const { commissionPercentage, aggregatorSubAccountId } = req.body;
        const tenant = await Tenant.findByPk(req.params.id);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        await tenant.update({
            commissionPercentage,
            aggregatorSubAccountId
        });

        await AuditService.log('TENANT_AGGREGATOR_UPDATE', `Updated aggregator settings for ${tenant.name}`, undefined, req.user?.id);
        res.json(tenant);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// Register Tenant Sub-account
router.post('/tenants/:id/register-aggregator', async (req: any, res) => {
    try {
        const tenant = await Tenant.findByPk(req.params.id);
        if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

        const subAccountId = await AggregatorService.registerSubAccount(tenant);
        res.json({ message: 'Sub-account registered', subAccountId });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Global Platforms Stats
router.get('/platform-stats', async (req, res) => {
    try {
        const stats = await AnalyticsService.getGlobalPlatformStats();
        res.json(stats);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Settlements (Platform Payouts)
router.get('/settlements', async (req, res) => {
    const settlements = await SettlementService.getTenantSettlements(req.query.tenantId as string); // If no ID, get all
    res.json(settlements);
});

router.post('/settlements/:id/approve', async (req: any, res) => {
    try {
        const result = await SettlementService.approveSettlement(req.params.id);
        await AuditService.log('SETTLEMENT_APPROVED', `Settlement ${req.params.id} approved by SuperAdmin`, undefined, req.user?.id);
        res.json(result);
    } catch (e: any) {
        res.status(400).json({ error: e.message });
    }
});

// 4. Audit Logs (SaaS-wide)
router.get('/audit-logs', async (req, res) => {
    const logs = await AuditService.getLogs(req.query.tenantId as string);
    res.json(logs);
});

// 5. Update Tenant Status (Suspend/Active)
router.put('/tenants/:id/status', async (req: any, res) => {
    const { status } = req.body;
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    await tenant.update({ status });
    await AuditService.log('TENANT_STATUS_CHANGE', `Tenant ${tenant.name} set to ${status}`, tenant.id, req.user?.id);
    res.json({ message: `Tenant ${status} successfully`, tenant });
});

// 6. Global Wallet Monitoring
router.get('/wallets', async (req, res) => {
    try {
        const wallets = await Wallet.findAll({
            where: { ownerType: 'TENANT' },
            include: [{ model: Tenant, attributes: ['name'] }]
        });

        const formatted = wallets.map((w: any) => ({
            id: w.id,
            tenantId: w.ownerId,
            tenantName: w.tenant?.name || 'Unknown',
            balance: Number(w.balance),
            pendingBalance: Number(w.pendingBalance),
            settledBalance: Number(w.settledBalance),
            frozenBalance: Number(w.frozenBalance)
        }));

        res.json(formatted);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 7. Platform Wallet Status
router.get('/platform-wallet', async (req, res) => {
    try {
        const balance = await WalletService.getPlatformWalletBalance();
        res.json(balance);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 8. Platform Fee Management
router.get('/platform-fees', async (req, res) => {
    try {
        const fees = await PlatformFee.findAll({
            include: [{ model: TieredFee, as: 'tieredFees' }]
        });
        res.json(fees);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

router.post('/platform-fees', async (req: any, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { feeType, feeValue, isPercentage, minAmount, maxAmount, isActive, description, tieredFees } = req.body;

        const platformFee = await PlatformFee.create({
            feeType, feeValue, isPercentage, minAmount, maxAmount, isActive, description
        }, { transaction });

        if (tieredFees && Array.isArray(tieredFees)) {
            for (const tier of tieredFees) {
                await TieredFee.create({
                    ...tier,
                    platformFeeId: platformFee.id
                }, { transaction });
            }
        }

        await transaction.commit();
        await AuditService.log('PLATFORM_FEE_CREATED', `Platform fee ${feeType} created`, undefined, req.user?.id);
        res.status(201).json(platformFee);
    } catch (e: any) {
        await transaction.rollback();
        res.status(400).json({ error: e.message });
    }
});

router.put('/platform-fees/:id', async (req: any, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { feeValue, isPercentage, isActive, description, tieredFees } = req.body;
        const platformFee = await PlatformFee.findByPk(req.params.id);
        if (!platformFee) return res.status(404).json({ error: 'Fee not found' });

        await platformFee.update({ feeValue, isPercentage, isActive, description }, { transaction });

        if (tieredFees && Array.isArray(tieredFees)) {
            // Simple approach: delete and recreate tiers
            await TieredFee.destroy({ where: { platformFeeId: platformFee.id }, transaction });
            for (const tier of tieredFees) {
                await TieredFee.create({
                    ...tier,
                    platformFeeId: platformFee.id
                }, { transaction });
            }
        }

        await transaction.commit();
        await AuditService.log('PLATFORM_FEE_UPDATED', `Platform fee ${platformFee.feeType} updated`, undefined, req.user?.id);
        res.json(platformFee);
    } catch (e: any) {
        await transaction.rollback();
        res.status(400).json({ error: e.message });
    }
});

export default router;
