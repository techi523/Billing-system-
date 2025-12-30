import { Payment, Session, Package } from './models';
import { MikroTikService } from './services/mikrotik.service';
import { v4 as uuidv4 } from 'uuid';

export class SessionOrchestrator {
    static async grantAccess(paymentId: string, macAddress: string, ipAddress?: string) {
        const payment = await Payment.findByPk(paymentId, { include: [Package] });
        if (!payment || payment.status !== 'SUCCESS') {
            throw new Error('Invalid payment for access grant');
        }

        const pkg = (payment as any).package;
        // Use MAC address as username (sanitized) for transparency
        const username = `HS-${macAddress.replace(/[: -]/g, '').toUpperCase()}`;
        const password = Math.random().toString(36).slice(-8);

        // Calculate expiry if time-based
        let expiryTime: Date | undefined;
        if (pkg.durationMinutes) {
            expiryTime = new Date(Date.now() + pkg.durationMinutes * 60 * 1000);
        }

        // 1. Create session in DB with device binding
        const session = await Session.create({
            paymentId: payment.id,
            mikrotikUsername: username,
            mikrotikPassword: password,
            macAddress: macAddress,
            ipAddress: ipAddress,
            startTime: new Date(),
            expiryTime: expiryTime,
            status: 'ACTIVE',
        });

        // 2. Instruct MikroTik with Anti-Sharing rules
        const limitTime = pkg.durationMinutes ? `${pkg.durationMinutes}m` : undefined;
        await MikroTikService.createHotspotUser(
            username,
            password,
            macAddress,
            ipAddress,
            pkg.dataLimitBytes,
            limitTime
        );

        return session;
    }

    static async handleExpiry(sessionId: string) {
        const session = await Session.findByPk(sessionId);
        if (!session || (session.get('status') === 'EXPIRED')) return;

        // 1. Disconnect and cleanup Mangle rules
        await MikroTikService.disconnectUser(
            session.get('mikrotikUsername') as string,
            session.get('ipAddress') as string
        );

        // 2. Update DB
        session.set('status', 'EXPIRED');
        await session.save();
    }
}
