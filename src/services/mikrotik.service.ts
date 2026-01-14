import { RouterOSClient } from 'routeros-client';
import { Router as RouterModel } from '../models';

export class MikroTikService {
    private static async getClient(router: RouterModel) {
        const client = new RouterOSClient({
            host: router.host,
            user: router.username,
            password: router.password,
            port: router.port || 8728
        });
        return client;
    }

    // HOTSPOT METHODS
    static async createHotspotUser(router: RouterModel, username: string, password: string, macAddress: string, ipAddress?: string, limitBytes?: number, limitTime?: string) {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();

            const userData: any = {
                name: username,
                password: password,
                profile: 'default',
                macAddress: macAddress,
            };

            if (limitBytes) userData.limitBytesTotal = limitBytes.toString();
            if (limitTime) userData.limitUptime = limitTime;

            await api.menu('/ip/hotspot/user').add(userData);

            if (ipAddress) {
                // Anti-Tethering Mangle Rule
                await api.menu('/ip/firewall/mangle').add({
                    chain: 'prerouting',
                    srcAddress: ipAddress,
                    action: 'change-ttl',
                    newTtl: 'set:1',
                    comment: `Anti-Share-${username}`
                });

                const userMenu = api.menu('/ip/hotspot/user');
                const user = await userMenu.where('name', username).find();
                if (user) {
                    await userMenu.update({ sharedUsers: '1' }, (user as any).id);
                }
            }
        } finally {
            await client.close();
        }
    }

    static async disconnectHotspotUser(router: RouterModel, username: string, ipAddress?: string) {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();

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
                const rules = await mangleMenu.where('srcAddress', ipAddress).get();
                for (const rule of (rules as any[])) {
                    await mangleMenu.remove(rule.id);
                }
            }
        } finally {
            await client.close();
        }
    }

    // PPPoE METHODS (ISP MODE)
    static async createPppoeUser(router: RouterModel, username: string, password: string, profile: string = 'default', remoteAddress?: string) {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();
            const userData: any = {
                name: username,
                password: password,
                service: 'pppoe',
                profile: profile,
            };
            if (remoteAddress) userData.remoteAddress = remoteAddress;

            await api.menu('/ppp/secret').add(userData);
        } finally {
            await client.close();
        }
    }

    static async suspendPppoeUser(router: RouterModel, username: string) {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();
            const secretMenu = api.menu('/ppp/secret');
            const secret = await secretMenu.where('name', username).find();
            if (secret) {
                await secretMenu.update({ disabled: 'yes' }, (secret as any).id);
            }

            // Also kick from active sessions
            const activeMenu = api.menu('/ppp/active');
            const active = await activeMenu.where('name', username).find();
            if (active) {
                await activeMenu.remove((active as any).id);
            }
        } finally {
            await client.close();
        }
    }

    static async activatePppoeUser(router: RouterModel, username: string) {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();
            const secretMenu = api.menu('/ppp/secret');
            const secret = await secretMenu.where('name', username).find();
            if (secret) {
                await secretMenu.update({ disabled: 'no' }, (secret as any).id);
            }
        } finally {
            await client.close();
        }
    }

    static async getActiveHotspotSessions(router: RouterModel) {
        const client = await this.getClient(router);
        try {
            const api = await client.connect();
            return await api.menu('/ip/hotspot/active').get();
        } finally {
            await client.close();
        }
    }
}

