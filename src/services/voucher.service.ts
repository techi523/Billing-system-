import { Voucher, Package } from '../models';
import { SessionOrchestrator } from '../orchestrator';

export class VoucherService {
    static async generateVouchers(tenantId: string, packageId: number, count: number) {
        const pkg = await Package.findByPk(packageId);
        if (!pkg || pkg.tenantId !== tenantId) throw new Error('Invalid package');

        const vouchers = [];
        for (let i = 0; i < count; i++) {
            const code = Math.random().toString(16).substring(2, 8).toUpperCase();
            vouchers.push({
                code,
                packageId,
                tenantId,
                status: 'AVAILABLE'
            });
        }
        return await Voucher.bulkCreate(vouchers);
    }

    static async redeemVoucher(code: string, routerId: string, macAddress: string, ipAddress?: string) {
        const voucher = await Voucher.findOne({
            where: { code, status: 'AVAILABLE' }
        });

        if (!voucher) throw new Error('Invalid or already used voucher');

        // 1. Mark as used
        voucher.status = 'USED';
        voucher.usedAt = new Date();
        await voucher.save();

        // 2. Grant session access
        return await SessionOrchestrator.grantVoucherAccess(
            voucher.id,
            routerId,
            macAddress,
            ipAddress
        );
    }
}
