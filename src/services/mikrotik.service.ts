import { RouterOSClient } from 'routeros-client';
import { Router as RouterModel } from '../models';
import logger from '../utils/logger';

export class MikroTikService {
    private static async getClient(router: RouterModel) {
        return new RouterOSClient({
            host: router.host,
            user: router.username,
            password: router.password,
            port: router.port || 8728,
            timeout: 10 // 10 second timeout for production stability
        });
    }

    private static async executeWithRetry<T>(router: RouterModel, action: (api: any) => Promise<T>, retries = 3): Promise<T> {
        let lastError: any;
        for (let i = 0; i < retries; i++) {
            const client = await this.getClient(router);
            try {
                const api = await client.connect();
                const result = await action(api);
                await client.close();
                return result;
            } catch (err: any) {
                lastError = err;
                logger.warn(`MikroTik Attempt ${i + 1} Failed`, {
                    routerId: router.id,
                    host: router.host,
                    error: err.message
                });
                try { await client.close(); } catch { /* ignore close error */ }
                if (i < retries - 1) await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
            }
        }
        logger.error('MikroTik Operation Failed after retries', {
            routerId: router.id,
            error: lastError.message
        });
        throw new Error(`Router connection failed: ${lastError.message}`);
    }

    // HOTSPOT METHODS
    static async createHotspotUser(router: RouterModel, username: string, password: string, macAddress: string, ipAddress?: string, limitBytes?: number, limitTime?: string) {
        return this.executeWithRetry(router, async (api) => {
            const userData: any = {
                name: username,
                password: password,
                profile: 'default',
                'mac-address': macAddress,
            };

            if (limitBytes) userData['limit-bytes-total'] = limitBytes.toString();
            if (limitTime) userData['limit-uptime'] = limitTime;

            await api.menu('/ip/hotspot/user').add(userData);

            if (ipAddress) {
                // Anti-Tethering Mangle Rule
                await api.menu('/ip/firewall/mangle').add({
                    chain: 'prerouting',
                    'src-address': ipAddress,
                    action: 'change-ttl',
                    'new-ttl': 'set:1',
                    comment: `Anti-Share-${username}`
                });

                const userMenu = api.menu('/ip/hotspot/user');
                const user = await userMenu.where('name', username).find();
                if (user) {
                    await userMenu.update({ 'shared-users': '1' }, (user as any).id);
                }
            }
        });
    }

    static async disconnectHotspotUser(router: RouterModel, username: string, ipAddress?: string) {
        return this.executeWithRetry(router, async (api) => {
            const activeMenu = api.menu('/ip/hotspot/active');
            const active = await activeMenu.where('user', username).find();
            if (active) {
                await activeMenu.remove((active as any).id);
            }

            const userMenu = api.menu('/ip/hotspot/user');
            const user = await userMenu.where('name', username).find();
            if (user) {
                await userMenu.remove((user as any).id);
            }

            if (ipAddress) {
                const mangleMenu = api.menu('/ip/firewall/mangle');
                const rules = await mangleMenu.where('src-address', ipAddress).get();
                for (const rule of (rules as any[])) {
                    await mangleMenu.remove(rule.id);
                }
            }
        });
    }

    // PPPoE METHODS (ISP MODE)
    static async createPppoeUser(router: RouterModel, username: string, password: string, profile: string = 'default', remoteAddress?: string) {
        return this.executeWithRetry(router, async (api) => {
            const userData: any = {
                name: username,
                password: password,
                service: 'pppoe',
                profile: profile,
            };
            if (remoteAddress) userData['remote-address'] = remoteAddress;

            await api.menu('/ppp/secret').add(userData);
        });
    }

    static async suspendPppoeUser(router: RouterModel, username: string) {
        return this.executeWithRetry(router, async (api) => {
            const secretMenu = api.menu('/ppp/secret');
            const secret = await secretMenu.where('name', username).find();
            if (secret) {
                await secretMenu.update({ disabled: 'yes' }, (secret as any).id);
            }

            const activeMenu = api.menu('/ppp/active');
            const active = await activeMenu.where('name', username).find();
            if (active) {
                await activeMenu.remove((active as any).id);
            }
        });
    }

    static async activatePppoeUser(router: RouterModel, username: string) {
        return this.executeWithRetry(router, async (api) => {
            const secretMenu = api.menu('/ppp/secret');
            const secret = await secretMenu.where('name', username).find();
            if (secret) {
                await secretMenu.update({ disabled: 'no' }, (secret as any).id);
            }
        });
    }

    static async getActiveHotspotSessions(router: RouterModel) {
        return this.executeWithRetry(router, async (api) => {
            return await api.menu('/ip/hotspot/active').get();
        });
    }

    /**
     * Fetch real-time bandwidth stats for active sessions
     */
    static async fetchSessionStats(router: RouterModel) {
        return this.executeWithRetry(router, async (api) => {
            const activeSessions = await api.menu('/ip/hotspot/active').get();
            return (activeSessions as any[]).map(s => ({
                user: s.user,
                address: s.address,
                macAddress: s['mac-address'],
                uptime: s.uptime,
                bytesIn: parseInt(s['bytes-in'] || '0'),
                bytesOut: parseInt(s['bytes-out'] || '0'),
                packetsIn: parseInt(s['packets-in'] || '0'),
                packetsOut: parseInt(s['packets-out'] || '0')
            }));
        });
    }

    /**
     * Test connectivity to a router
     */
    static async testConnection(router: RouterModel): Promise<{ status: boolean; message: string; version?: string; identity?: string }> {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();

            // Fetch system info
            const identity = await api.menu('/system/identity').get();
            const resource = await api.menu('/system/resource').get();

            await client.close();

            return {
                status: true,
                message: 'Connected successfully',
                version: resource?.[0]?.version,
                identity: identity?.[0]?.name
            };
        } catch (error: any) {
            return {
                status: false,
                message: error.message || 'Connection failed'
            };
        }
    }

    /**
     * Validate RouterOS compatibility (Check if required services are configured)
     */
    static async validateCompatibility(router: RouterModel): Promise<{ status: boolean; issues: string[] }> {
        const client = await this.getClient(router);
        const issues: string[] = [];

        try {
            const api = await client.connect();

            // 1. Check for Hotspot Servers
            const hotspotServers = await api.menu('/ip/hotspot').get();
            if (hotspotServers.length === 0) {
                issues.push('No Hotspot server configured');
            }

            // 2. Check for RADIUS configuration if needed
            const radius = await api.menu('/radius').get();
            if (radius.length === 0) {
                issues.push('RADIUS client not configured (required for central billing)');
            }

            await client.close();

            return {
                status: issues.length === 0,
                issues
            };
        } catch (error: any) {
            return {
                status: false,
                issues: ['Could not determine compatibility: ' + error.message]
            };
        }
    }

    /**
     * Generate pre-configured MikroTik .rsc scripts
     */
    static async generateConfigScript(type: 'HOTSPOT' | 'PPPOE' | 'RADIUS', tenantId: string, version: 'v6' | 'v7' = 'v7'): Promise<string> {
        const portalUrl = process.env.PUBLIC_PORTAL_URL || 'http://your-server.com';
        const tenant = await RouterModel.sequelize?.models.tenant.findByPk(tenantId) as any;
        const tenantSubdomain = tenant?.subdomain || 'hotspot';
        const tenantName = tenant?.name || 'SurfBill';

        if (type === 'HOTSPOT') {
            return `# SurfBill Hotspot Configuration Script (${version}) for ${tenantName}
/system identity set name="SurfBill-${tenantSubdomain}"
/ip hotspot profile
add dns-name=${tenantSubdomain}.surfbill.link hotspot-address=10.5.50.1 login-by=http-chap,http-pap,mac name=SurfBill_Profile use-radius=yes
/ip hotspot
add address-pool=hs-pool-1 disabled=no interface=bridge-lan name=SurfBill_Hotspot profile=SurfBill_Profile
/ip hotspot user profile
set [ find default=yes ] shared-users=1
/ip hotspot walled-garden
add comment="Allow SurfBill Portal" dst-host=${new URL(portalUrl).hostname}
add comment="Allow M-Pesa Callbacks" dst-host=safaricom.co.ke
add comment="Allow IntaSend" dst-host=intasend.com
add comment="Allow IntaSend Payments" dst-host=payment.intasend.com
`;
        }

        if (type === 'PPPOE') {
            return `# SurfBill PPPoE Configuration Script (${version}) for ${tenantName}
/ppp profile
add name=SurfBill_PPPoE_Profile use-radius=yes
/interface pppoe-server server
add disabled=no interface=bridge-lan service-name=SurfBill_PPPoE profile=SurfBill_PPPoE_Profile
`;
        }

        if (type === 'RADIUS') {
            const radiusSecret = process.env.RADIUS_SECRET || 'surfbill_secret';
            const portalHost = new URL(portalUrl).hostname;
            return `# SurfBill RADIUS Configuration Script (${version}) for ${tenantName}
/radius
add address=${portalHost} secret=${radiusSecret} service=hotspot,ppp authentication-port=1812 accounting-port=1813 src-address=0.0.0.0
/radius incoming
set accept=yes port=3799
/ip hotspot profile
set [ find name=SurfBill_Profile ] use-radius=yes nas-port-type=19
`;
        }

        return "# No script template found for this type";
    }
}

