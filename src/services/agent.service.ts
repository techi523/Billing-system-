import { AdminUser, Wallet, Voucher, Package, sequelize } from '../models';

export class AgentService {
    static async getOrCreateWallet(agentId: string, tenantId: string) {
        let wallet = await Wallet.findOne({ where: { ownerId: agentId, ownerType: 'AGENT' } });
        if (!wallet) {
            wallet = await Wallet.create({
                ownerId: agentId,
                ownerType: 'AGENT',
                balance: 0,
                tenantId: tenantId
            });
        }
        return wallet;
    }

    static async sellVoucher(agentId: string, voucherId: string) {
        const transaction = await sequelize.transaction();
        try {
            const agent = await AdminUser.findByPk(agentId);
            if (!agent || agent.role !== 'AGENT') throw new Error('Invalid agent');

            const voucher = await Voucher.findByPk(voucherId, { include: [Package] });
            if (!voucher || voucher.status !== 'AVAILABLE') throw new Error('Voucher not available');

            const pkg = (voucher as any).package;
            const price = pkg.price;
            const commission = price * (agent.commissionRate || 0);

            // 1. Mark voucher as SOLD
            voucher.status = 'USED';
            voucher.usedAt = new Date();
            voucher.soldByAgentId = agentId;
            await voucher.save({ transaction });

            // 2. Credit Agent Wallet
            const wallet = await this.getOrCreateWallet(agentId, agent.tenantId as string);
            wallet.balance += commission;
            await wallet.save({ transaction });

            await transaction.commit();
            return { voucher, commission };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    static async getStats(agentId: string) {
        const wallet = await Wallet.findOne({ where: { ownerId: agentId, ownerType: 'AGENT' } });
        const sales = await Voucher.count({ where: { soldByAgentId: agentId, status: 'USED' } });

        return {
            balance: wallet?.balance || 0,
            totalSales: sales
        };
    }
}
