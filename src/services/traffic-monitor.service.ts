import { Router as RouterModel, Session } from '../models';
import { MikroTikService } from './mikrotik.service';
import { SessionOrchestrator } from '../orchestrator';
import { SocketService } from './socket.service';
import logger from '../utils/logger';

export class TrafficMonitorService {
    private static interval: NodeJS.Timeout | null = null;

    /**
     * Start the background monitoring process
     */
    static start(intervalMs: number = 300000) { // Default 5 minutes
        if (this.interval) return;

        logger.info('Traffic Monitor Service Started', { intervalMs });
        this.interval = setInterval(() => this.monitorAllRouters(), intervalMs);

        // Initial run in background
        setImmediate(() => this.monitorAllRouters());
    }

    /**
     * Stop the background monitoring process
     */
    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info('Traffic Monitor Service Stopped');
        }
    }

    /**
     * Iterate through all routers and update status and statistics
     */
    private static async monitorAllRouters() {
        try {
            const routers = await RouterModel.findAll();

            for (const router of routers) {
                try {
                    // 1. Connectivity Check & Identity Update
                    // We use getActiveHotspotSessions as a simple connectivity test
                    await MikroTikService.getActiveHotspotSessions(router);

                    await router.update({
                        isOnline: true,
                        lastSeen: new Date()
                    });

                    // Real-time broadcast
                    SocketService.emitToTenant(router.tenantId, 'ROUTER_STATUS', {
                        routerId: router.id,
                        isOnline: true,
                        lastSeen: new Date()
                    });

                    // 2. Synchronize Session Statistics
                    await SessionOrchestrator.refreshAllSessionStats(router.id);

                    logger.debug('Router monitoring successful', {
                        routerId: router.id,
                        name: router.name
                    });

                    // 3. Broadcast Active Sessions to Dashboard
                    const activeSessions = await Session.findAll({
                        where: { routerId: router.id, status: 'ACTIVE' }
                    });
                    SocketService.emitToTenant(router.tenantId, 'LIVE_SESSIONS_UPDATE', {
                        routerId: router.id,
                        sessions: activeSessions
                    });
                } catch (error: any) {
                    // Update online status on failure
                    await router.update({ isOnline: false });

                    // Real-time broadcast
                    SocketService.emitToTenant(router.tenantId, 'ROUTER_STATUS', {
                        routerId: router.id,
                        isOnline: false
                    });

                    logger.warn('Router offline or connection failed', {
                        routerId: router.id,
                        host: router.host,
                        error: error.message
                    });
                }
            }
        } catch (error: any) {
            logger.error('Traffic Monitor loop encountered an error', {
                error: error.message
            });
        }
    }
}
