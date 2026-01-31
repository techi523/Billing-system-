import { Router } from 'express';
import { Router as RouterModel, Tenant, RouterConnectionLog } from '../models';
import { authMiddleware } from '../middleware/auth';
import { MikroTikAutoConfigService } from '../services/mikrotik-auto-config.service';
import { MikroTikService } from '../services/mikrotik.service';
import logger from '../utils/logger';

const router = Router();

/**
 * POST /api/v1/routers/connect
 * Initiate router connection and generate auto-config script
 */
router.post('/connect', authMiddleware, async (req, res) => {
    try {
        const { name, host, port, username, password, location } = req.body;
        const tenantId = (req as any).user.tenantId;

        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant access required' });
        }

        // Validate required fields
        if (!name || !host || !username || !password) {
            return res.status(400).json({
                error: 'Missing required fields: name, host, username, password'
            });
        }

        // Test initial connection with admin credentials
        const testResult = await MikroTikAutoConfigService.testInitialConnection(
            host,
            port || 8728,
            username,
            password
        );

        if (!testResult.success) {
            return res.status(400).json({
                error: 'Connection test failed',
                message: testResult.message,
                suggestion: 'Please verify router IP, credentials, and ensure API service is enabled on port 8728'
            });
        }

        // Create router record
        const routerRecord = await RouterModel.create({
            name,
            host,
            port: port || 8728,
            username,
            password,
            tenantId,
            location: location || null,
            isOnline: true,
            lastSeen: new Date(),
            identity: testResult.identity,
            version: testResult.version,
            validationStatus: 'PENDING',
            autoConfigStatus: 'PENDING'
        });

        // Get tenant info
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) {
            return res.status(404).json({ error: 'Tenant not found' });
        }

        // Detect RouterOS version
        const version = testResult.version?.startsWith('7') ? 'v7' : 'v6';

        // Generate auto-config script
        const script = await MikroTikAutoConfigService.generateAutoConfigScript(
            routerRecord,
            tenant,
            version
        );

        logger.info('Router connection initiated', {
            routerId: routerRecord.id,
            tenantId,
            host,
            version
        });

        res.json({
            success: true,
            message: 'Router connection initiated successfully',
            router: {
                id: routerRecord.id,
                name: routerRecord.name,
                host: routerRecord.host,
                port: routerRecord.port,
                location: routerRecord.location,
                version: testResult.version,
                identity: testResult.identity,
                autoConfigStatus: routerRecord.autoConfigStatus
            },
            script,
            version,
            nextSteps: [
                'Copy the script above',
                'Open Winbox and connect to your router',
                'Go to New Terminal',
                'Paste the entire script and press Enter',
                'Wait for execution to complete',
                'Click "Verify Connection" in the dashboard'
            ]
        });

    } catch (error: any) {
        logger.error('Router connection failed', { error: error.message });
        res.status(500).json({
            error: 'Failed to initiate router connection',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/routers/:id/script
 * Get auto-config script for a router
 */
router.get('/:id/script', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        if (!routerRecord.autoConfigScript) {
            return res.status(404).json({
                error: 'Auto-config script not available',
                message: 'Please reconnect the router to generate a new script'
            });
        }

        res.json({
            script: routerRecord.autoConfigScript,
            router: {
                id: routerRecord.id,
                name: routerRecord.name,
                version: routerRecord.version
            }
        });

    } catch (error: any) {
        logger.error('Failed to retrieve script', { error: error.message });
        res.status(500).json({ error: 'Failed to retrieve script' });
    }
});

/**
 * POST /api/v1/routers/:id/verify
 * Verify router configuration after script execution
 */
router.post('/:id/verify', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Verify configuration
        const verificationResult = await MikroTikAutoConfigService.verifyConfiguration(
            routerRecord,
            userId
        );

        if (!verificationResult.success) {
            return res.status(400).json({
                success: false,
                message: verificationResult.message,
                troubleshooting: [
                    'Ensure you pasted the entire script in the terminal',
                    'Check if there were any error messages in the terminal',
                    'Verify that the router can reach the billing system',
                    'Ensure API service is enabled on port 8728',
                    'Check firewall rules on the router'
                ]
            });
        }

        res.json({
            success: true,
            message: 'Router configured and verified successfully!',
            router: {
                id: routerRecord.id,
                name: routerRecord.name,
                host: routerRecord.host,
                status: routerRecord.autoConfigStatus,
                version: routerRecord.version,
                identity: routerRecord.identity,
                capabilities: routerRecord.capabilities ? JSON.parse(routerRecord.capabilities) : null
            },
            details: verificationResult.details
        });

    } catch (error: any) {
        logger.error('Router verification failed', { error: error.message });
        res.status(500).json({
            error: 'Verification failed',
            message: error.message
        });
    }
});

/**
 * GET /api/v1/routers
 * List all routers for tenant
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const tenantId = (req as any).user.tenantId;

        if (!tenantId) {
            return res.status(403).json({ error: 'Tenant access required' });
        }

        const routers = await RouterModel.findAll({
            where: { tenantId },
            attributes: [
                'id', 'name', 'host', 'port', 'location', 'isOnline',
                'lastSeen', 'identity', 'version', 'model', 'architecture',
                'validationStatus', 'autoConfigStatus', 'capabilities',
                'createdAt', 'updatedAt'
            ],
            order: [['createdAt', 'DESC']]
        });

        const routersWithStats = routers.map(r => ({
            ...r.toJSON(),
            capabilities: r.capabilities ? JSON.parse(r.capabilities) : null
        }));

        res.json({
            routers: routersWithStats,
            total: routers.length
        });

    } catch (error: any) {
        logger.error('Failed to list routers', { error: error.message });
        res.status(500).json({ error: 'Failed to list routers' });
    }
});

/**
 * PUT /api/v1/routers/:id
 * Update router details
 */
router.put('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, location } = req.body;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        await routerRecord.update({
            name: name || routerRecord.name,
            location: location !== undefined ? location : routerRecord.location
        });

        res.json({
            success: true,
            message: 'Router updated successfully',
            router: {
                id: routerRecord.id,
                name: routerRecord.name,
                location: routerRecord.location
            }
        });

    } catch (error: any) {
        logger.error('Failed to update router', { error: error.message });
        res.status(500).json({ error: 'Failed to update router' });
    }
});

/**
 * DELETE /api/v1/routers/:id
 * Remove router and cleanup configuration
 */
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Generate rollback script
        const rollbackScript = await MikroTikAutoConfigService.generateRollbackScript(routerRecord);

        // Log the disconnection
        await RouterConnectionLog.create({
            routerId: routerRecord.id,
            tenantId,
            action: 'DISCONNECT',
            status: 'SUCCESS',
            details: 'Router removed from billing system',
            userId
        });

        // Delete router
        await routerRecord.destroy();

        res.json({
            success: true,
            message: 'Router removed successfully',
            rollbackScript,
            note: 'Optional: Run the rollback script on your router to remove SurfBill configuration'
        });

    } catch (error: any) {
        logger.error('Failed to delete router', { error: error.message });
        res.status(500).json({ error: 'Failed to delete router' });
    }
});

/**
 * GET /api/v1/routers/:id/health
 * Check router health and status
 */
router.get('/:id/health', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Test connection
        const connectionTest = await MikroTikService.testConnection(routerRecord);

        // Update online status
        await routerRecord.update({
            isOnline: connectionTest.status,
            lastSeen: connectionTest.status ? new Date() : routerRecord.lastSeen
        });

        res.json({
            online: connectionTest.status,
            message: connectionTest.message,
            lastSeen: routerRecord.lastSeen,
            identity: connectionTest.identity,
            version: connectionTest.version
        });

    } catch (error: any) {
        logger.error('Health check failed', { error: error.message });
        res.status(500).json({
            online: false,
            error: 'Health check failed',
            message: error.message
        });
    }
});

/**
 * POST /api/v1/routers/:id/test
 * Test router connection
 */
router.post('/:id/test', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const testResult = await MikroTikService.testConnection(routerRecord);

        await RouterConnectionLog.create({
            routerId: routerRecord.id,
            tenantId,
            action: 'TEST',
            status: testResult.status ? 'SUCCESS' : 'FAILED',
            details: testResult.message,
            metadata: JSON.stringify({
                version: testResult.version,
                identity: testResult.identity
            }),
            userId
        });

        res.json({
            success: testResult.status,
            message: testResult.message,
            version: testResult.version,
            identity: testResult.identity
        });

    } catch (error: any) {
        logger.error('Connection test failed', { error: error.message });
        res.status(500).json({
            success: false,
            error: 'Connection test failed',
            message: error.message
        });
    }
});

export default router;
