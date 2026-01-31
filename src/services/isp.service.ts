import { Subscriber, Package, Router, Payment, Invoice } from '../models';
import { Op } from 'sequelize';
import { MikroTikService } from './mikrotik.service';

export class IspService {
    static async registerSubscriber(data: any) {
        const { name, phoneNumber, pppoeUsername, pppoePassword, packageId, routerId, tenantId } = data;

        const pkg = await Package.findByPk(packageId);
        if (!pkg) throw new Error('Package not found');

        const router = await Router.findByPk(routerId);
        if (!router) throw new Error('Router not found');

        // 1. Create in DB
        const subscriber = await Subscriber.create({
            name,
            phoneNumber,
            pppoeUsername,
            pppoePassword,
            packageId,
            routerId,
            tenantId,
            status: 'ACTIVE' // Start as active (usually after first payment)
        });

        // 2. Create on MikroTik (using profile from package)
        await MikroTikService.createHotspotUser(
            router,
            pppoeUsername,
            pppoePassword,
            undefined, // macAddress
            pkg.name,
            `Subscriber: ${name}`
        );

        return subscriber;
    }

    static async renewSubscriber(subscriberId: string, durationDays: number = 30) {
        const subscriber = await Subscriber.findByPk(subscriberId);
        if (!subscriber) throw new Error('Subscriber not found');

        if (!subscriber.routerId) throw new Error('Subscriber has no associated router');
        const router = await Router.findByPk(subscriber.routerId);

        if (!router) throw new Error('Router not found');

        // Update expiry date
        const currentExpiry = subscriber.expiryDate ? new Date(subscriber.expiryDate) : new Date();
        const newExpiry = new Date(currentExpiry.getTime() + durationDays * 24 * 60 * 60 * 1000);

        subscriber.expiryDate = newExpiry;
        subscriber.status = 'ACTIVE';
        await subscriber.save();

        // Ensure active on MikroTik (using hotspot user for now)
        if (subscriber.pppoeUsername) {
            await MikroTikService.toggleHotspotUser(router, subscriber.pppoeUsername, true);
        }

        return subscriber;
    }

    static async suspendExpiredSubscribers() {
        const now = new Date();
        const expired = await Subscriber.findAll({
            where: {
                status: 'ACTIVE',
                expiryDate: { [Op.lt]: now }
            }
        });

        for (const sub of expired) {
            try {
                if (!sub.routerId || !sub.pppoeUsername) continue;

                const router = await Router.findByPk(sub.routerId);
                if (router) {
                    await MikroTikService.toggleHotspotUser(router, sub.pppoeUsername, false);
                }
                sub.status = 'SUSPENDED';
                await sub.save();
                console.log(`Suspended subscriber: ${sub.pppoeUsername}`);
            } catch (error) {
                console.error(`Failed to suspend ${sub.pppoeUsername}:`, error);
            }
        }
    }
}
