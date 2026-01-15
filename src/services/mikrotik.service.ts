import { RouterOSClient } from 'routeros-client';
import { Router as RouterModel } from '../models';
import { logger } from '../utils/logger';

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
}

