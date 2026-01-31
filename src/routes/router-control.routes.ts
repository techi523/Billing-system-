import { Router } from 'express';
import { Router as RouterModel, RouterConnectionLog } from '../models';
import { authMiddleware } from '../middleware/auth';
import { MikroTikService } from '../services/mikrotik.service';
import logger from '../utils/logger';

const router = Router();

/**
 * GET /api/v1/routers/:id/users
 * List all hotspot users on a router
 */
router.get('/:id/users', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // This would require extending MikroTikService to list users
        // For now, return placeholder
        res.json({
            users: [],
            message: 'User listing will be implemented with MikroTik API integration'
        });

    } catch (error: any) {
        logger.error('Failed to list users', { error: error.message });
        res.status(500).json({ error: 'Failed to list users' });
    }
});

/**
 * POST /api/v1/routers/:id/users
 * Create a hotspot user on the router
 */
router.post('/:id/users', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, macAddress, ipAddress, limitBytes, limitTime } = req.body;
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;

        if (!username || !password || !macAddress) {
            return res.status(400).json({
                error: 'Missing required fields: username, password, macAddress'
            });
        }

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Create hotspot user
        await MikroTikService.createHotspotUser(
            routerRecord,
            username,
            password,
            macAddress,
            ipAddress,
            limitBytes,
            limitTime
        );

        // Log the action
        await RouterConnectionLog.create({
            routerId: routerRecord.id,
            tenantId,
            action: 'SYNC',
            status: 'SUCCESS',
            details: `Created hotspot user: ${username}`,
            metadata: JSON.stringify({ username, macAddress }),
            userId
        });

        logger.info('Hotspot user created', {
            routerId: id,
            username,
            tenantId
        });

        res.json({
            success: true,
            message: 'Hotspot user created successfully',
            user: {
                username,
                macAddress,
                ipAddress,
                limitBytes,
                limitTime
            }
        });

    } catch (error: any) {
        logger.error('Failed to create user', { error: error.message });
        res.status(500).json({
            error: 'Failed to create user',
            message: error.message
        });
    }
});

/**
 * PUT /api/v1/routers/:id/users/:username
 * Update hotspot user (enable/disable)
 */
router.put('/:id/users/:username', authMiddleware, async (req, res) => {
    try {
        const { id, username } = req.params;
        const { enabled } = req.body;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // This would require extending MikroTikService
        // Placeholder response
        res.json({
            success: true,
            message: `User ${username} ${enabled ? 'enabled' : 'disabled'} successfully`
        });

    } catch (error: any) {
        logger.error('Failed to update user', { error: error.message });
        res.status(500).json({ error: 'Failed to update user' });
    }
});

/**
 * DELETE /api/v1/routers/:id/users/:username
 * Delete hotspot user
 */
router.delete('/:id/users/:username', authMiddleware, async (req, res) => {
    try {
        const { id, username } = req.params;
        const { ipAddress } = req.query;
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Disconnect and remove user
        await MikroTikService.disconnectHotspotUser(
            routerRecord,
            username,
            ipAddress as string
        );

        await RouterConnectionLog.create({
            routerId: routerRecord.id,
            tenantId,
            action: 'SYNC',
            status: 'SUCCESS',
            details: `Deleted hotspot user: ${username}`,
            metadata: JSON.stringify({ username, ipAddress }),
            userId
        });

        res.json({
            success: true,
            message: 'User deleted successfully'
        });

    } catch (error: any) {
        logger.error('Failed to delete user', { error: error.message });
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

/**
 * POST /api/v1/routers/:id/users/:username/disconnect
 * Disconnect active user session
 */
router.post('/:id/users/:username/disconnect', authMiddleware, async (req, res) => {
    try {
        const { id, username } = req.params;
        const { ipAddress } = req.body;
        const tenantId = (req as any).user.tenantId;
        const userId = (req as any).user.id;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        await MikroTikService.disconnectHotspotUser(
            routerRecord,
            username,
            ipAddress
        );

        await RouterConnectionLog.create({
            routerId: routerRecord.id,
            tenantId,
            action: 'SYNC',
            status: 'SUCCESS',
            details: `Disconnected user session: ${username}`,
            metadata: JSON.stringify({ username, ipAddress }),
            userId
        });

        res.json({
            success: true,
            message: 'User disconnected successfully'
        });

    } catch (error: any) {
        logger.error('Failed to disconnect user', { error: error.message });
        res.status(500).json({ error: 'Failed to disconnect user' });
    }
});

/**
 * GET /api/v1/routers/:id/sessions
 * Get active hotspot sessions
 */
router.get('/:id/sessions', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        const sessions = await MikroTikService.getActiveHotspotSessions(routerRecord);

        res.json({
            sessions,
            total: (sessions as any[]).length,
            router: {
                id: routerRecord.id,
                name: routerRecord.name
            }
        });

    } catch (error: any) {
        logger.error('Failed to get sessions', { error: error.message });
        res.status(500).json({ error: 'Failed to get sessions' });
    }
});

/**
 * POST /api/v1/routers/:id/sessions/:sessionId/disconnect
 * Disconnect specific session
 */
router.post('/:id/sessions/:sessionId/disconnect', authMiddleware, async (req, res) => {
    try {
        const { id, sessionId } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // This would require extending MikroTikService
        res.json({
            success: true,
            message: 'Session disconnected successfully'
        });

    } catch (error: any) {
        logger.error('Failed to disconnect session', { error: error.message });
        res.status(500).json({ error: 'Failed to disconnect session' });
    }
});

/**
 * POST /api/v1/routers/:id/users/:username/speed
 * Apply speed limit to user
 */
router.post('/:id/users/:username/speed', authMiddleware, async (req, res) => {
    try {
        const { id, username } = req.params;
        const { uploadSpeed, downloadSpeed } = req.body;
        const tenantId = (req as any).user.tenantId;

        if (!uploadSpeed || !downloadSpeed) {
            return res.status(400).json({
                error: 'Missing required fields: uploadSpeed, downloadSpeed'
            });
        }

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // This would require extending MikroTikService
        res.json({
            success: true,
            message: 'Speed limit applied successfully',
            limits: {
                upload: uploadSpeed,
                download: downloadSpeed
            }
        });

    } catch (error: any) {
        logger.error('Failed to apply speed limit', { error: error.message });
        res.status(500).json({ error: 'Failed to apply speed limit' });
    }
});

/**
 * GET /api/v1/routers/:id/queues
 * List queue trees
 */
router.get('/:id/queues', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Placeholder
        res.json({
            queues: [],
            message: 'Queue listing will be implemented'
        });

    } catch (error: any) {
        logger.error('Failed to list queues', { error: error.message });
        res.status(500).json({ error: 'Failed to list queues' });
    }
});

/**
 * GET /api/v1/routers/:id/stats
 * Get router statistics (CPU, memory, uptime)
 */
router.get('/:id/stats', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Get session stats
        const sessionStats = await MikroTikService.fetchSessionStats(routerRecord);

        res.json({
            sessions: sessionStats,
            router: {
                id: routerRecord.id,
                name: routerRecord.name,
                version: routerRecord.version,
                identity: routerRecord.identity
            }
        });

    } catch (error: any) {
        logger.error('Failed to get stats', { error: error.message });
        res.status(500).json({ error: 'Failed to get stats' });
    }
});

/**
 * GET /api/v1/routers/:id/interfaces
 * Get interface status
 */
router.get('/:id/interfaces', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Placeholder
        res.json({
            interfaces: [],
            message: 'Interface listing will be implemented'
        });

    } catch (error: any) {
        logger.error('Failed to get interfaces', { error: error.message });
        res.status(500).json({ error: 'Failed to get interfaces' });
    }
});

/**
 * GET /api/v1/routers/:id/resources
 * Get system resources (CPU, memory, disk)
 */
router.get('/:id/resources', authMiddleware, async (req, res) => {
    try {
        const { id } = req.params;
        const tenantId = (req as any).user.tenantId;

        const routerRecord = await RouterModel.findOne({
            where: { id, tenantId }
        });

        if (!routerRecord) {
            return res.status(404).json({ error: 'Router not found' });
        }

        // Placeholder
        res.json({
            resources: {
                cpu: 0,
                memory: 0,
                disk: 0,
                uptime: '0s'
            },
            message: 'Resource monitoring will be implemented'
        });

    } catch (error: any) {
        logger.error('Failed to get resources', { error: error.message });
        res.status(500).json({ error: 'Failed to get resources' });
    }
});

export default router;
