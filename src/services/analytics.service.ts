import { Payment, Session, Package, Subscriber, Voucher, sequelize } from '../models';
import { Op } from 'sequelize';

export class AnalyticsService {
    static async getDashboardStats(tenantId: string) {
        const totalRevenue = await Payment.sum('amount', {
            where: { tenantId, status: 'SUCCESS' }
        });

        const activeSessions = await Session.count({
            where: { tenantId, status: 'ACTIVE' }
        });

        const totalSubscribers = await Subscriber.count({
            where: { tenantId }
        });

        const voucherSales = await Voucher.count({
            where: { tenantId, status: 'USED' }
        });

        // Revenue over the last 7 days
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        const dailyRevenue = await Payment.findAll({
            attributes: [
                [sequelize.fn('DATE', sequelize.col('createdAt')), 'date'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'total']
            ],
            where: {
                tenantId,
                status: 'SUCCESS',
                createdAt: { [Op.gte]: sevenDaysAgo }
            },
            group: [sequelize.fn('DATE', sequelize.col('createdAt'))],
            raw: true
        });

        return {
            totalRevenue: totalRevenue || 0,
            activeSessions,
            totalSubscribers,
            voucherSales,
            dailyRevenue
        };
    }

    static async getRevenueReport(tenantId: string, startDate?: string, endDate?: string) {
        const where: any = { tenantId, status: 'SUCCESS' };
        if (startDate || endDate) {
            where.createdAt = {};
            if (startDate) where.createdAt[Op.gte] = new Date(startDate);
            if (endDate) where.createdAt[Op.lte] = new Date(endDate);
        }

        return await Payment.findAll({
            where,
            include: [Package],
            order: [['createdAt', 'DESC']]
        });
    }

    static async getTrafficInsights(tenantId: string) {
        // Simple mock insight: Most popular package
        const popularPackage = await Payment.findAll({
            attributes: [
                'packageId',
                [sequelize.fn('COUNT', sequelize.col('packageId')), 'count']
            ],
            where: { tenantId, status: 'SUCCESS' },
            group: ['packageId'],
            order: [[sequelize.literal('count'), 'DESC']],
            limit: 1,
            include: [Package],
            raw: true,
            nest: true
        });

        return {
            topPackage: popularPackage[0]?.package?.name || 'N/A',
            recommendation: "Consider a discount on your least popular plan to boost traffic."
        };
    }
}
