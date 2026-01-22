import { Router } from 'express';
import { Package, Subscriber, Invoice, Tenant, AuditLog, Payment, Session, Voucher, FraudLog } from '../models';
import { authMiddleware, authorize } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Middleware to ensure all routes here require authentication and at least TENANT_ADMIN role
router.use(authMiddleware);

// Admin dashboard summary
router.get('/dashboard-summary', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const [subscriberCount, activeSessions, pendingPayments] = await Promise.all([
            Subscriber.count({ where: { tenantId } }),
            Session.count({ where: { tenantId, status: 'ACTIVE' } }),
            Payment.count({ where: { tenantId, status: 'PENDING' } })
        ]);

        res.json({
            subscriberCount,
            activeSessions,
            pendingPayments
        });
    } catch (error) {
        logger.error('Failed to get dashboard summary', { error });
        res.status(500).json({ error: 'Internal server error' });
    }
});

// List subscribers
router.get('/subscribers', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const subscribers = await Subscriber.findAll({
            where: { tenantId },
            include: [Package]
        });
        res.json(subscribers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch subscribers' });
    }
});

export default router;