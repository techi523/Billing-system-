import { RouterOSClient } from 'routeros-client';
import dotenv from 'dotenv';

dotenv.config();

export class MikroTikService {
    private static config = {
        host: process.env.MIKROTIK_HOST || '192.168.88.1',
        user: process.env.MIKROTIK_USER || 'admin',
        password: process.env.MIKROTIK_PASSWORD || '',
    };

    private static async getClient() {
        const client = new RouterOSClient(this.config);
        return client;
    }

    static async createHotspotUser(username: string, password: string, macAddress: string, ipAddress?: string, limitBytes?: number, limitTime?: string) {
        const client = await this.getClient();
        try {
            const api = await client.connect();

            // 1. Create user with MAC locking
            const userData: any = {
                name: username,
                password: password,
                profile: 'default',
                macAddress: macAddress, // routeros-client translates this to mac-address
            };

            if (limitBytes) userData.limitBytesTotal = limitBytes.toString();
            if (limitTime) userData.limitUptime = limitTime;

            await api.menu('/ip/hotspot/user').add(userData);

            // 2. Anti-Tethering Mangle Rule (TTL=1)
            if (ipAddress) {
                await api.menu('/ip/firewall/mangle').add({
                    chain: 'prerouting',
                    srcAddress: ipAddress,
                    action: 'change-ttl',
                    newTtl: 'set:1',
                    comment: `Anti-Share-${username}`
                });

                // 3. Limit Concurrent Connections (Max 1)
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

    static async disconnectUser(username: string, ipAddress?: string) {
        const client = await this.getClient();
        try {
            const api = await client.connect();

            // 1. Remove from active sessions
            const activeMenu = api.menu('/ip/hotspot/active');
            const active = await activeMenu.where('user', username).find();
            if (active) {
                await activeMenu.remove((active as any).id);
            }

            // 2. Remove user completely
            const userMenu = api.menu('/ip/hotspot/user');
            const user = await userMenu.where('name', username).find();
            if (user) {
                await userMenu.remove((user as any).id);
            }

            // 3. Cleanup Mangle rules
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

    static async getActiveSessions() {
        const client = await this.getClient();
        try {
            const api = await client.connect();
            return await api.menu('/ip/hotspot/active').get();
        } finally {
            await client.close();
        }
    }
}
