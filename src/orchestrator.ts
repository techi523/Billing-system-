import { Payment, Session, Package, Router, Voucher } from './models';
import { MikroTikService } from './services/mikrotik.service';

export class SessionOrchestrator {
    /**
     * Internal method to provision access after verification
     */
    private static async provisionAccess(pkg: Package, tenantId: string, routerId: string, macAddress: string, ipAddress?: string, paymentId?: string) {
        const router = await Router.findByPk(routerId);
        if (!router) throw new Error('Router not found');

        const username = `HS-${macAddress.replace(/[: -]/g, '').toUpperCase()}`;
        const password = Math.random().toString(36).slice(-8);

        let expiryTime: Date | undefined;
        if (pkg.durationMinutes) {
            expiryTime = new Date(Date.now() + pkg.durationMinutes * 60 * 1000);
        }

        const session = await Session.create({
            paymentId: paymentId || 'VOUCHER',
            routerId: router.id,
            mikrotikUsername: username,
            mikrotikPassword: password,
            macAddress: macAddress,
            ipAddress: ipAddress,
            startTime: new Date(),
            expiryTime: expiryTime,
            status: 'ACTIVE',
            tenantId: tenantId
        });

        const limitTime = pkg.durationMinutes ? `${pkg.durationMinutes}m` : undefined;

        await MikroTikService.createHotspotUser(
            router,
            username,
            password,
            macAddress,
            ipAddress,
            pkg.dataLimitBytes || undefined,
            limitTime
        );

        return session;
    }

    static async grantAccess(paymentId: string, macAddress: string, ipAddress?: string) {
        const payment = await Payment.findByPk(paymentId, { include: [Package] });
        if (!payment || payment.status !== 'SUCCESS') {
            throw new Error('Invalid payment for access grant');
        }

        const pkg = (payment as any).package;
        if (!payment.routerId) throw new Error('No router associated with this payment');

        return await this.provisionAccess(pkg, payment.tenantId, payment.routerId, macAddress, ipAddress, payment.id);
    }

    static async grantVoucherAccess(voucherId: string, routerId: string, macAddress: string, ipAddress?: string) {
        const voucher = await Voucher.findByPk(voucherId, { include: [Package] });
        if (!voucher || voucher.status !== 'USED') {
            throw new Error('Invalid voucher for access grant');
        }

        const pkg = (voucher as any).package;
        return await this.provisionAccess(pkg, voucher.tenantId, routerId, macAddress, ipAddress);
    }

    static async handleExpiry(sessionId: string) {
        const session = await Session.findByPk(sessionId);
        if (!session || session.status === 'EXPIRED') return;

        const router = await Router.findByPk(session.routerId);
        if (!router) return;

        await MikroTikService.disconnectHotspotUser(
            router,
            session.mikrotikUsername,
            session.ipAddress
        );

        session.status = 'EXPIRED';
        await session.save();
    }
}
