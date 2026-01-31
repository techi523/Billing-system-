import { Router as RouterModel, RouterConnectionLog } from '../models';
import logger from '../utils/logger';
import { RouterOSClient } from 'routeros-client';

export class MikroTikService {
    /**
     * Get a connection to a MikroTik router
     */
    private static async getConnection(router: RouterModel): Promise<RouterOSClient> {
        return new RouterOSClient({
            host: router.host,
            user: router.username,
            password: router.password,
            port: router.port || 8728,
            timeout: 10 // 10 seconds timeout
        });
    }

    /**
     * Test router connection
     */
    static async testConnection(router: RouterModel): Promise<{
        status: boolean;
        message: string;
        version?: string;
        identity?: string;
    }> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();

            // Get system info
            const identity = await api.menu('/system/identity').get();
            const resource = await api.menu('/system/resource').get();

            await client.close();

            return {
                status: true,
                message: 'Router connected successfully',
                version: resource[0]?.version || 'Unknown',
                identity: identity[0]?.name || 'Unknown'
            };

        } catch (error: any) {
            logger.error('MikroTik connection test failed', { host: router.host, error: error.message });
            return {
                status: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    /**
     * Validate router compatibility
     */
    static async validateCompatibility(router: RouterModel): Promise<{
        compatible: boolean;
        issues: string[];
        capabilities: any;
    }> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();

            const issues: string[] = [];
            const capabilities: any = {};

            // Check for hotspot server
            try {
                const hotspotServers = await api.menu('/ip/hotspot').get();
                capabilities.hotspot = hotspotServers.length > 0;
                if (!capabilities.hotspot) {
                    issues.push('No Hotspot server configured');
                }
            } catch (error) {
                issues.push('Cannot access hotspot configuration');
                capabilities.hotspot = false;
            }

            // Check for RADIUS client
            try {
                const radiusClients = await api.menu('/radius').get();
                capabilities.radius = radiusClients.length > 0;
            } catch (error) {
                capabilities.radius = false;
            }

            // Check for queue support (usually always true)
            capabilities.queues = true;

            await client.close();

            return {
                compatible: issues.length === 0,
                issues,
                capabilities
            };

        } catch (error: any) {
            return {
                compatible: false,
                issues: ['Cannot connect to router: ' + (error.message || 'Unknown error')],
                capabilities: {}
            };
        }
    }

    /**
     * Create hotspot user
     */
    static async createHotspotUser(
        router: RouterModel,
        username: string,
        password: string,
        macAddress?: string,
        profile: string = 'default',
        comment: string = 'Created by SurfBill'
    ): Promise<void> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();

            const userData: any = {
                name: username,
                password: password,
                profile: profile,
                comment: comment
            };

            if (macAddress) {
                userData['mac-address'] = macAddress;
            }

            await api.menu('/ip/hotspot/user').add(userData);
            await client.close();

            await this.logRouterAction(router.id, router.tenantId, 'CREATE_USER', 'SUCCESS', `User ${username} created`);
        } catch (error: any) {
            logger.error('Failed to create hotspot user', { routerId: router.id, username, error: error.message });
            await this.logRouterAction(router.id, router.tenantId, 'CREATE_USER', 'FAILED', `Failed to create user ${username}: ${error.message}`);
            throw error;
        }
    }

    /**
     * Disconnect hotspot user
     */
    static async disconnectHotspotUser(
        router: RouterModel,
        username: string
    ): Promise<void> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();

            const activeMenu = api.menu('/ip/hotspot/active');
            const activeUsers = await activeMenu.where({ user: username }).get();

            for (const session of activeUsers) {
                await activeMenu.remove(session['.id']);
            }

            await client.close();
            await this.logRouterAction(router.id, router.tenantId, 'DISCONNECT_USER', 'SUCCESS', `User ${username} disconnected`);
        } catch (error: any) {
            logger.error('Failed to disconnect user', { routerId: router.id, username, error: error.message });
            throw error;
        }
    }

    /**
     * Get active hotspot sessions
     */
    static async getActiveHotspotSessions(router: RouterModel): Promise<any[]> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();
            const sessions = await api.menu('/ip/hotspot/active').get();
            await client.close();

            return sessions.map((s: any) => ({
                id: s['.id'],
                username: s.user,
                ipAddress: s.address,
                macAddress: s['mac-address'],
                uptime: s.uptime,
                bytesIn: s['bytes-in'],
                bytesOut: s['bytes-out'],
                sessionTime: s['session-time-left']
            }));
        } catch (error: any) {
            logger.error('Failed to get hotspot sessions', { routerId: router.id, error: error.message });
            throw error;
        }
    }

    /**
     * Enable/disable hotspot user
     */
    static async toggleHotspotUser(router: RouterModel, username: string, enabled: boolean): Promise<void> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();
            const userMenu = api.menu('/ip/hotspot/user');
            const users = await userMenu.where({ name: username }).get();

            if (users.length > 0) {
                await userMenu.set({ disabled: !enabled }, users[0]['.id']);
            }

            await client.close();
            await this.logRouterAction(router.id, router.tenantId, 'TOGGLE_USER', 'SUCCESS', `User ${username} ${enabled ? 'enabled' : 'disabled'}`);
        } catch (error: any) {
            logger.error('Failed to toggle user', { routerId: router.id, username, error: error.message });
            throw error;
        }
    }

    /**
     * Get router system resources
     */
    static async getSystemResources(router: RouterModel): Promise<{
        cpuUsage: number;
        memoryUsage: number;
        diskUsage: number;
        uptime: string;
        temperature: number | null;
    }> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();
            const resource = await api.menu('/system/resource').get();
            let temperature: number | null = null;

            try {
                const health = await api.menu('/system/health').get();
                const tempObj = health.find((h: any) => h.name === 'temperature' || h.label === 'temperature');
                temperature = tempObj ? parseInt(tempObj.value) : null;
            } catch (e) {
                // Health info might not be available on all models
            }

            await client.close();

            const r = resource[0];
            const totalMemory = parseInt(r['total-memory']);
            const freeMemory = parseInt(r['free-memory']);
            const totalHdd = parseInt(r['total-hdd-space']);
            const freeHdd = parseInt(r['free-hdd-space']);

            return {
                cpuUsage: parseInt(r['cpu-load']),
                memoryUsage: Math.round(((totalMemory - freeMemory) / totalMemory) * 100),
                diskUsage: Math.round(((totalHdd - freeHdd) / totalHdd) * 100),
                uptime: r.uptime,
                temperature
            };
        } catch (error: any) {
            logger.error('Failed to get system resources', { routerId: router.id, error: error.message });
            throw error;
        }
    }

    /**
     * Create hotspot profile
     */
    static async createHotspotProfile(
        router: RouterModel,
        profileName: string,
        settings: {
            rateLimit?: string;
            sharedUsers?: number;
        }
    ): Promise<void> {
        const client = await this.getConnection(router);
        try {
            const api = await client.connect();

            const profileData: any = {
                name: profileName,
                'shared-users': settings.sharedUsers?.toString() || '1'
            };

            if (settings.rateLimit) {
                profileData['rate-limit'] = settings.rateLimit;
            }

            await api.menu('/ip/hotspot/user/profile').add(profileData);
            await client.close();
        } catch (error: any) {
            logger.error('Failed to create hotspot profile', { routerId: router.id, profileName, error: error.message });
            throw error;
        }
    }

    /**
     * Log router action
     */
    static async logRouterAction(
        routerId: string,
        tenantId: string,
        action: string,
        status: 'SUCCESS' | 'FAILED' | 'PENDING',
        details: string,
        userId?: string,
        metadata?: any
    ): Promise<void> {
        try {
            await RouterConnectionLog.create({
                routerId,
                tenantId,
                action: action as any,
                status,
                details,
                errorMessage: status === 'FAILED' ? details : null,
                userId,
                metadata: metadata ? JSON.stringify(metadata) : null
            });
        } catch (error) {
            logger.error('Failed to log router action', { error });
        }
    }
}