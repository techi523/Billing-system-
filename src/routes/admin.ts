import { Router } from 'express';
import { Package, Subscriber, Invoice, Tenant, AuditLog, Payment, Session, Voucher, FraudLog, Router as RouterModel } from '../models';
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
            include: [Package],
            order: [['createdAt', 'DESC']]
        });

        // Get all active sessions for this tenant
        const activeSessions = await Session.findAll({
            where: { tenantId, status: 'ACTIVE' }
        });

        const enriched = subscribers.map(sub => {
            const session = activeSessions.find(s => s.macAddress === sub.macAddress);
            const pkg = (sub as any).package;

            let usage = 0;
            if (session && pkg && pkg.dataLimitBytes) {
                const totalBytes = BigInt(session.bytesIn) + BigInt(session.bytesOut);
                usage = Math.min(100, Math.floor((Number(totalBytes) / Number(pkg.dataLimitBytes)) * 100));
            } else if (session) {
                // If no data limit, show some activity based on time if durationMinutes exists
                const elapsed = Date.now() - new Date(session.startTime).getTime();
                const total = (pkg?.durationMinutes || 60) * 60 * 1000;
                usage = Math.min(100, Math.floor((elapsed / total) * 100));
            }

            return {
                ...sub.toJSON(),
                activeSession: session ? session.toJSON() : null,
                usagePercent: usage,
                // Map status for frontend
                displayStatus: session ? 'Active' : (sub.status === 'SUSPENDED' ? 'Warning' : 'Expired'),
                expiresIn: session ? 'Active' : (sub.lastPaymentDate ? 'Last seen ' + new Date(sub.lastPaymentDate).toLocaleDateString() : 'Never')
            };
        });

        res.json(enriched);
    } catch (error) {
        logger.error('Failed to fetch subscribers', { error });
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

// Real-time Analytics Routes
router.get('/analytics/revenue', async (req: any, res) => {
    try {
        const { AnalyticsService } = require('../services/analytics.service');
        const stats = await AnalyticsService.getRealTimeRevenue(req.user.tenantId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch revenue analytics' });
    }
});

router.get('/analytics/bandwidth', async (req: any, res) => {
    try {
        const { AnalyticsService } = require('../services/analytics.service');
        const stats = await AnalyticsService.getBandwidthUsage(req.user.tenantId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch bandwidth analytics' });
    }
});

router.get('/analytics/performance', async (req: any, res) => {
    try {
        const { AnalyticsService } = require('../services/analytics.service');
        const stats = await AnalyticsService.getPaymentPerformance(req.user.tenantId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch payment performance' });
    }
});

router.get('/analytics/sms', async (req: any, res) => {
    try {
        const { AnalyticsService } = require('../services/analytics.service');
        const stats = await AnalyticsService.getSmsMetrics(req.user.tenantId);
        res.json(stats);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch SMS metrics' });
    }
});

// MikroTik Script Center
router.get('/mikrotik/generate-script', async (req: any, res) => {
    try {
        const { type, version } = req.query;
        if (!type) return res.status(400).json({ error: 'Script type is required' });

        const { MikroTikService } = require('../services/mikrotik.service');
        const script = await MikroTikService.generateConfigScript(type as any, req.user.tenantId, version as any);

        res.setHeader('Content-Type', 'text/plain');
        res.setHeader('Content-Disposition', `attachment; filename=surfbill_${type}_${version || 'v7'}.rsc`);
        res.send(script);
    } catch (error) {
        res.status(500).json({ error: 'Failed to generate MikroTik script' });
    }
});

// --- ROUTER MANAGEMENT ---

// List routers
router.get('/routers', async (req: any, res) => {
    try {
        const routers = await RouterModel.findAll({ where: { tenantId: req.user.tenantId } });
        res.json(routers);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch routers' });
    }
});

// Add router
router.post('/routers', async (req: any, res) => {
    try {
        const { name, host, port, username, password, location } = req.body;
        const routerObj = await RouterModel.create({
            name, host, port, username, password, location,
            tenantId: req.user.tenantId,
            validationStatus: 'PENDING'
        });

        const { AuditService } = require('../services/audit.service');
        await AuditService.log('ROUTER_CREATED', `Manual router created: ${name} (${host})`, req.user.tenantId, req.user.id);

        res.status(201).json(routerObj);
    } catch (error) {
        res.status(500).json({ error: 'Failed to add router' });
    }
});

// Test router connection & compatibility
router.post('/routers/:id/test', async (req: any, res) => {
    try {
        const routerId = req.params.id;
        const routerObj = await RouterModel.findOne({ where: { id: routerId, tenantId: req.user.tenantId } });

        if (!routerObj) return res.status(404).json({ error: 'Router not found' });

        const { MikroTikService } = require('../services/mikrotik.service');

        // 1. Connectivity Test
        const connTest = await MikroTikService.testConnection(routerObj);
        if (!connTest.status) {
            routerObj.validationStatus = 'FAILED';
            routerObj.isOnline = false;
            await routerObj.save();
            return res.json({ success: false, message: connTest.message });
        }

        // 2. Compatibility Test
        const compTest = await MikroTikService.validateCompatibility(routerObj);

        routerObj.validationStatus = compTest.status ? 'VALIDATED' : 'FAILED';
        routerObj.identity = connTest.identity || routerObj.identity;
        routerObj.isOnline = true;
        routerObj.lastSeen = new Date();
        await routerObj.save();

        res.json({
            success: compTest.status,
            message: compTest.status ? 'Router validated and ready' : 'Connectivity passed but compatibility issues found',
            details: connTest,
            issues: compTest.issues
        });

    } catch (error) {
        logger.error('Router verification failed', { error });
        res.status(500).json({ error: 'Verification failed' });
    }
});

// --- PACKAGE MANAGEMENT ---

// List packages
router.get('/packages', async (req: any, res) => {
    try {
        const packages = await Package.findAll({ where: { tenantId: req.user.tenantId } });
        res.json(packages);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

// Create manual package with validation
router.post('/packages', async (req: any, res) => {
    try {
        const { name, price, durationMinutes, dataLimitBytes, speedLimit, type } = req.body;

        // Validation
        if (!name || price === undefined) return res.status(400).json({ error: 'Name and Price are required' });
        if (!durationMinutes && !dataLimitBytes) return res.status(400).json({ error: 'Package must have either a time limit or a data limit' });

        const pkg = await Package.create({
            name,
            price: BigInt(price),
            durationMinutes,
            dataLimitBytes,
            speedLimit,
            type: type || 'HOTSPOT',
            tenantId: req.user.tenantId,
            isEnabled: true
        });

        const { AuditService } = require('../services/audit.service');
        await AuditService.log('PACKAGE_CREATED', `Manual package created: ${name} (${price} cents)`, req.user.tenantId, req.user.id);

        res.status(201).json(pkg);
    } catch (error) {
        logger.error('Package creation failed', { error });
        res.status(500).json({ error: 'Failed to create package' });
    }
});

// --- PRODUCTION READINESS & GO-LIVE ---

// Get readiness checklist
router.get('/production/readiness', async (req: any, res) => {
    try {
        const { ProductionService } = require('../services/production.service');
        const readiness = await ProductionService.getReadinessChecklist(req.user.tenantId);
        res.json(readiness);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch readiness checklist' });
    }
});

// Clean for Production (Sanitize)
router.post('/production/sanitize', async (req: any, res) => {
    try {
        const { ProductionService } = require('../services/production.service');
        const result = await ProductionService.sanitizeForProduction(req.user.tenantId, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// Toggle Production Mode (Go Live)
router.post('/production/go-live', async (req: any, res) => {
    try {
        const { isProduction } = req.body;
        const { ProductionService } = require('../services/production.service');
        const result = await ProductionService.toggleProductionMode(req.user.tenantId, isProduction, req.user.id);
        res.json(result);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
