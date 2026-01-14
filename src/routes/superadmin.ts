import { Router } from 'express';
import { Tenant, AdminUser, Payment, sequelize } from '../models';
import { authMiddleware, AuthRequest, authorize } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);
router.use(authorize(['SUPER_ADMIN']));

// 1. List all Tenants
router.get('/tenants', async (req, res) => {
    const tenants = await Tenant.findAll();
    res.json(tenants);
});

// 2. Global Platforms Stats
router.get('/platform-stats', async (req, res) => {
    try {
        const totalRevenue = await Payment.sum('amount', { where: { status: 'SUCCESS' } });
        const activeTenants = await Tenant.count({ where: { status: 'ACTIVE' } });
        const totalUsers = await AdminUser.count();

        res.json({
            totalRevenue: totalRevenue || 0,
            activeTenants,
            totalUsers
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Update Tenant Status (Suspend/Active)
router.put('/tenants/:id/status', async (req, res) => {
    const { status } = req.body;
    const tenant = await Tenant.findByPk(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    await tenant.update({ status });
    res.json({ message: `Tenant ${status} successfully`, tenant });
});

export default router;
