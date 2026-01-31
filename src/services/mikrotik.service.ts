import { Router as RouterModel, RouterConnectionLog } from '../models';
import logger from '../utils/logger';

// Mock MikroTik interface for now
interface MikroTikConnection {
    connect(): Promise<void>;
    run(command: string): Promise<any[]>;
    close(): Promise<void>;
}

class MockMikroTik implements MikroTikConnection {
    constructor(private config: any) { }
    async connect(): Promise<void> { }
    async run(command: string): Promise<any[]> { return []; }
    async close(): Promise<void> { }
}

export class MikroTikService {
    /**
     * Test router connection
     */
    static async testConnection(router: RouterModel): Promise<{
        status: boolean;
        message: string;
        version?: string;
        identity?: string;
    }> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            // Get system info
            const systemInfo = await connection.run('/system identity print');
            const versionInfo = await connection.run('/system resource print');

            await connection.close();

            return {
                status: true,
                message: 'Router connected successfully',
                version: versionInfo[0]?.version || 'Unknown',
                identity: systemInfo[0]?.name || 'Unknown'
            };

        } catch (error: any) {
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
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            const issues: string[] = [];
            const capabilities: any = {};

            // Check for hotspot server
            try {
                const hotspotServers = await connection.run('/ip hotspot print');
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
                const radiusClients = await connection.run('/radius print');
                capabilities.radius = radiusClients.length > 0;
                if (!capabilities.radius) {
                    issues.push('RADIUS client not configured');
                }
            } catch (error) {
                capabilities.radius = false;
            }

            // Check for queue support
            try {
                const queues = await connection.run('/queue simple print');
                capabilities.queues = true;
            } catch (error) {
                capabilities.queues = false;
            }

            // Check for PPPoE support
            try {
                const pppoeServers = await connection.run('/interface pppoe-server print');
                capabilities.pppoe = pppoeServers.length > 0;
            } catch (error) {
                capabilities.pppoe = false;
            }

            await connection.close();

            return {
                compatible: issues.length === 0,
                issues,
                capabilities
            };

        } catch (error: any) {
            return {
                compatible: false,
                issues: ['Cannot connect to router'],
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
        macAddress: string,
        ipAddress?: string,
        limitBytes?: number,
        limitTime?: number
    ): Promise<void> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            // Build user creation command
            let command = `/ip hotspot user add name="${username}" password="${password}" mac-address="${macAddress}"`;

            if (ipAddress) {
                command += ` address="${ipAddress}"`;
            }

            if (limitBytes) {
                command += ` limit-bytes-total=${limitBytes}`;
            }

            if (limitTime) {
                command += ` limit-uptime=${limitTime}m`;
            }

            await connection.run(command);
            await connection.close();

            logger.info('Hotspot user created', {
                routerId: router.id,
                username,
                macAddress
            });

        } catch (error: any) {
            logger.error('Failed to create hotspot user', {
                error: error.message,
                routerId: router.id,
                username
            });
            throw error;
        }
    }

    /**
     * Disconnect hotspot user
     */
    static async disconnectHotspotUser(
        router: RouterModel,
        username: string,
        ipAddress?: string
    ): Promise<void> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            // Find active session
            const activeSessions = await connection.run('/ip hotspot active print');

            for (const session of activeSessions) {
                if (session.user === username && (!ipAddress || session.address === ipAddress)) {
                    await connection.run(`/ip hotspot active remove [find user="${username}"]`);
                    break;
                }
            }

            await connection.close();

            logger.info('Hotspot user disconnected', {
                routerId: router.id,
                username,
                ipAddress
            });

        } catch (error: any) {
            logger.error('Failed to disconnect hotspot user', {
                error: error.message,
                routerId: router.id,
                username
            });
            throw error;
        }
    }

    /**
     * Get active hotspot sessions
     */
    static async getActiveHotspotSessions(router: RouterModel): Promise<any[]> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            const sessions = await connection.run('/ip hotspot active print');
            await connection.close();

            return sessions.map((session: any) => ({
                id: session['.id'],
                username: session.user,
                ipAddress: session.address,
                macAddress: session.mac_address,
                uptime: session.uptime,
                bytesIn: session.bytes_in,
                bytesOut: session.bytes_out,
                sessionTime: session.session_time,
                hostName: session.host_name
            }));

        } catch (error: any) {
            logger.error('Failed to get hotspot sessions', {
                error: error.message,
                routerId: router.id
            });
            throw error;
        }
    }

    /**
     * Enable/disable hotspot user
     */
    static async toggleHotspotUser(router: RouterModel, username: string, enabled: boolean): Promise<void> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            const action = enabled ? 'enable' : 'disable';
            await connection.run(`/ip hotspot user ${action} [find name="${username}"]`);
            await connection.close();

            logger.info('Hotspot user toggled', {
                routerId: router.id,
                username,
                enabled
            });

        } catch (error: any) {
            logger.error('Failed to toggle hotspot user', {
                error: error.message,
                routerId: router.id,
                username,
                enabled
            });
            throw error;
        }
    }

    /**
     * Apply speed limits to user
     */
    static async applySpeedLimit(
        router: RouterModel,
        username: string,
        uploadSpeed: string,
        downloadSpeed: string
    ): Promise<void> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            // Remove existing queue for user
            await connection.run(`/queue simple remove [find target="${username}"]`);

            // Add new queue with speed limits
            const queueName = `user_${username}_${Date.now()}`;
            await connection.run(`/queue simple add name="${queueName}" target="${username}" max-limit="${uploadSpeed}/${downloadSpeed}"`);

            await connection.close();

            logger.info('Speed limit applied', {
                routerId: router.id,
                username,
                uploadSpeed,
                downloadSpeed
            });

        } catch (error: any) {
            logger.error('Failed to apply speed limit', {
                error: error.message,
                routerId: router.id,
                username
            });
            throw error;
        }
    }

    /**
     * Get router statistics
     */
    static async fetchSessionStats(router: RouterModel): Promise<{
        totalSessions: number;
        activeSessions: number;
        totalBytesIn: number;
        totalBytesOut: number;
        averageUptime: string;
    }> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            const sessions = await connection.run('/ip hotspot active print');
            await connection.close();

            let totalBytesIn = 0;
            let totalBytesOut = 0;
            let totalUptime = 0;

            sessions.forEach((session: any) => {
                totalBytesIn += parseInt(session.bytes_in || '0');
                totalBytesOut += parseInt(session.bytes_out || '0');
                // Convert uptime to seconds for averaging
                const uptimeSeconds = this.parseUptimeToSeconds(session.uptime);
                totalUptime += uptimeSeconds;
            });

            const averageUptime = sessions.length > 0
                ? this.formatUptime(totalUptime / sessions.length)
                : '0s';

            return {
                totalSessions: sessions.length,
                activeSessions: sessions.length,
                totalBytesIn,
                totalBytesOut,
                averageUptime
            };

        } catch (error: any) {
            logger.error('Failed to fetch session stats', {
                error: error.message,
                routerId: router.id
            });
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
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            const resourceInfo = await connection.run('/system resource print');
            const healthInfo = await connection.run('/system health print');

            await connection.close();

            const resource = resourceInfo[0];
            const health = healthInfo.find((h: any) => h.name === 'temperature') || { value: '0' };

            return {
                cpuUsage: parseInt(resource.cpu_load || '0'),
                memoryUsage: parseInt(resource.memory_usage || '0'),
                diskUsage: parseInt(resource.hdd_usage || '0'),
                uptime: resource.uptime || '0s',
                temperature: parseInt(health.value || '0')
            };

        } catch (error: any) {
            logger.error('Failed to get system resources', {
                error: error.message,
                routerId: router.id
            });
            throw error;
        }
    }

    /**
     * Get interface status
     */
    static async getInterfaceStatus(router: RouterModel): Promise<any[]> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            const interfaces = await connection.run('/interface print');
            await connection.close();

            return interfaces.map((intf: any) => ({
                name: intf.name,
                type: intf.type,
                status: intf.running ? 'UP' : 'DOWN',
                macAddress: intf.mac_address,
                mtu: intf.mtu,
                actualMtu: intf.actual_mtu
            }));

        } catch (error: any) {
            logger.error('Failed to get interface status', {
                error: error.message,
                routerId: router.id
            });
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
            dnsName?: string;
            hotspotAddress?: string;
        }
    ): Promise<void> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            let command = `/ip hotspot profile add name="${profileName}"`;

            if (settings.rateLimit) {
                command += ` rate-limit="${settings.rateLimit}"`;
            }

            if (settings.sharedUsers) {
                command += ` shared-users=${settings.sharedUsers}`;
            }

            if (settings.dnsName) {
                command += ` dns-name="${settings.dnsName}"`;
            }

            if (settings.hotspotAddress) {
                command += ` hotspot-address="${settings.hotspotAddress}"`;
            }

            await connection.run(command);
            await connection.close();

            logger.info('Hotspot profile created', {
                routerId: router.id,
                profileName
            });

        } catch (error: any) {
            logger.error('Failed to create hotspot profile', {
                error: error.message,
                routerId: router.id,
                profileName
            });
            throw error;
        }
    }

    /**
     * Delete hotspot user
     */
    static async deleteHotspotUser(router: RouterModel, username: string): Promise<void> {
        try {
            const connection = new MockMikroTik({
                host: router.host,
                port: router.port || 8728,
                username: router.username,
                password: router.password
            });

            await connection.connect();

            await connection.run(`/ip hotspot user remove [find name="${username}"]`);
            await connection.close();

            logger.info('Hotspot user deleted', {
                routerId: router.id,
                username
            });

        } catch (error: any) {
            logger.error('Failed to delete hotspot user', {
                error: error.message,
                routerId: router.id,
                username
            });
            throw error;
        }
    }

    /**
     * Utility: Parse uptime string to seconds
     */
    private static parseUptimeToSeconds(uptime: string): number {
        if (!uptime) return 0;

        const parts = uptime.split(':');
        if (parts.length === 3) {
            // Format: hours:minutes:seconds
            const hours = parseInt(parts[0]);
            const minutes = parseInt(parts[1]);
            const seconds = parseInt(parts[2]);
            return hours * 3600 + minutes * 60 + seconds;
        }

        return 0;
    }

    /**
     * Utility: Format seconds to uptime string
     */
    private static formatUptime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * Log router action
     */
    static async logRouterAction(
        routerId: string,
        tenantId: string,
        action: string,
        status: 'SUCCESS' | 'FAILED',
        details: string,
        userId?: string,
        metadata?: any
    ): Promise<void> {
        try {
            await RouterConnectionLog.create({
                routerId,
                tenantId,
                action,
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