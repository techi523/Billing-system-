import { Router } from 'express';
import { Tenant, AdminUser, Payment, sequelize } from '../models';
import { authMiddleware, AuthRequest, authorize } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.use(authorize(['SUPER_ADMIN']));

import { AnalyticsService } from '../services/analytics.service';
import { AuditService } from '../services/audit.service';
import { SettlementService } from '../services/settlement.service';

// 1. List all Tenants
router.get('/tenants', async (req, res) => {
    const tenants = await Tenant.findAll();
    res.json(tenants);
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

export default router;
