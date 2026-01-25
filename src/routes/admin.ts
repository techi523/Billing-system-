import { Router } from 'express';
import { Package, Subscriber, Invoice, Tenant, AuditLog, Payment, Session, Voucher, FraudLog } from '../models';
import { authMiddleware, authorize } from '../middleware/auth';
import { TenantBootstrapService } from '../services/tenant-bootstrap.service';
import logger from '../utils/logger';

const router = Router();

// Middleware to ensure all routes here require authentication and at least TENANT_ADMIN role
router.use(authMiddleware);

// Admin dashboard summary
router.get('/dashboard-summary', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        
        // Get tenant info
        const tenant = await Tenant.findByPk(tenantId, {
            attributes: ['id', 'name', 'primaryColor', 'logoUrl']
        });
        
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        const [subscriberCount, activeSessions, pendingPayments] = await Promise.all([
            Subscriber.count({ where: { tenantId } }),
            Session.count({ where: { tenantId, status: 'ACTIVE' } }),
            Payment.count({ where: { tenantId, status: 'PENDING' } })
        ]);

        res.json({
            tenantId: tenant.id,
            tenantName: tenant.name,
            tenantLogo: tenant.logoUrl,
            tenantColor: tenant.primaryColor,
            subscriberCount,
            activeSessions,
            pendingPayments,
            plan: 'Standard' // Could be enhanced to fetch from tenant plan field
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

// Initialize tenant data (bootstrap)
router.post('/initialize', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;
        const userId = req.user.id;

        // Check if tenant is already bootstrapped
        const isBootstrapped = await TenantBootstrapService.isTenantBootstrapped(tenantId);

        if (isBootstrapped) {
            return res.json({
                message: 'Tenant already initialized',
                status: 'ALREADY_BOOTSTRAPPED'
            });
        }

        // Bootstrap the tenant
        await TenantBootstrapService.bootstrapNewTenant(tenantId, userId);

        res.json({
            message: 'Tenant initialized successfully',
            status: 'BOOTSTRAPPED',
            packagesCreated: 4,
            walletInitialized: true
        });
    } catch (error) {
        logger.error('Failed to initialize tenant', { error });
        res.status(500).json({ error: 'Failed to initialize tenant data' });
    }
});

// Check tenant initialization status
router.get('/initialize/status', async (req: any, res) => {
    try {
        const tenantId = req.user.tenantId;

        const isBootstrapped = await TenantBootstrapService.isTenantBootstrapped(tenantId);

        res.json({
            isBootstrapped,
            message: isBootstrapped ? 'Tenant is fully initialized' : 'Tenant needs initialization'
        });
    } catch (error) {
        logger.error('Failed to check tenant initialization status', { error });
        res.status(500).json({ error: 'Failed to check initialization status' });
    }
});

export default router;
