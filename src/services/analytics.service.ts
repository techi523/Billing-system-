import { Payment, Session, Package, Subscriber, Voucher, SMSLog, sequelize } from '../models';
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
            totalRevenue: Number(totalRevenue || 0),
            activeSessions,
            totalSubscribers,
            voucherSales,
            dailyRevenue: dailyRevenue.map((r: any) => ({
                date: r.date,
                total: Number(r.total)
            }))
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
            topPackage: (popularPackage[0] as any)?.package?.name || 'N/A',
            recommendation: "Consider a discount on your least popular plan to boost traffic."
        };
    }

    static async getGlobalPlatformStats() {
        const { Tenant } = require('../models');
        const totalRevenue = await Payment.sum('amount', { where: { status: 'SUCCESS' } }) || 0;
        const totalTenants = await Tenant.count();
        const totalPayments = await Payment.count({ where: { status: 'SUCCESS' } });
        const activeTenants = await Tenant.count({ where: { status: 'ACTIVE' } });

        return {
            totalRevenue,
            totalTenants,
            totalPayments,
            activeTenants
        };
    }

    /**
     * Real-time Revenue Tracking (Today / Week / Month)
     */
    static async getRealTimeRevenue(tenantId: string) {
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [today, week, month] = await Promise.all([
            Payment.sum('amount', { where: { tenantId, status: 'SUCCESS', createdAt: { [Op.gte]: startOfToday } } }),
            Payment.sum('amount', { where: { tenantId, status: 'SUCCESS', createdAt: { [Op.gte]: startOfWeek } } }),
            Payment.sum('amount', { where: { tenantId, status: 'SUCCESS', createdAt: { [Op.gte]: startOfMonth } } })
        ]);

        return {
            today: today || 0,
            week: week || 0,
            month: month || 0
        };
    }

    /**
     * Advanced Bandwidth Usage Analytics
     */
    static async getBandwidthUsage(tenantId: string) {
        const sessions = await Session.findAll({
            where: { tenantId, status: 'ACTIVE' },
            attributes: ['bytesIn', 'bytesOut', 'routerId']
        });

        const usageByRouter: Record<string, { in: number, out: number }> = {};
        let totalIn = 0;
        let totalOut = 0;

        sessions.forEach(s => {
            if (!usageByRouter[s.routerId]) usageByRouter[s.routerId] = { in: 0, out: 0 };
            usageByRouter[s.routerId].in += Number(s.bytesIn);
            usageByRouter[s.routerId].out += Number(s.bytesOut);
            totalIn += Number(s.bytesIn);
            totalOut += Number(s.bytesOut);
        });

        return {
            totalIn,
            totalOut,
            usageByRouter,
            activeSessions: sessions.length
        };
    }

    /**
     * Payment Performance (Success vs Failure Rates)
     */
    static async getPaymentPerformance(tenantId: string) {
        const [success, failed] = await Promise.all([
            Payment.count({ where: { tenantId, status: 'SUCCESS' } }),
            Payment.count({ where: { tenantId, status: 'FAILED' } })
        ]);

        const total = success + failed;
        return {
            success,
            failed,
            rate: total > 0 ? (success / total) * 100 : 0
        };
    }

    /**
     * SMS Usage and Metrics
     */
    static async getSmsMetrics(tenantId: string) {
        const stats = await (SMSLog as any).findAll({
            where: { tenantId },
            attributes: [
                'status',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
                [sequelize.fn('SUM', sequelize.col('cost')), 'totalCost']
            ],
            group: ['status'],
            raw: true
        });

        return stats;
    }

    /**
     * Get hourly trends for the last 24 hours (Revenue & Active Sessions)
     */
    static async getHourlyTrends(tenantId: string) {
        const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

        // Revenue trend
        const isMySQL = process.env.DB_TYPE === 'mysql';
        const dateFunc = isMySQL ? 'DATE_FORMAT' : 'STRFTIME';
        const format = isMySQL ? '%Y-%m-%d %H:00' : '%Y-%m-%d %H:00';

        const revenueTrend = await Payment.findAll({
            attributes: [
                [sequelize.fn(dateFunc, sequelize.col('createdAt'), format), 'hour'],
                [sequelize.fn('SUM', sequelize.col('amount')), 'amount']
            ],
            where: { tenantId, status: 'SUCCESS', createdAt: { [Op.gte]: last24h } },
            group: ['hour'],
            order: [['hour', 'ASC']],
            raw: true
        });

        // Current active users count
        const activeUsersCount = await Session.count({
            where: { tenantId, status: 'ACTIVE' }
        });

        return {
            revenueTrend: revenueTrend.map((r: any) => ({
                hour: r.hour,
                amount: Number(r.amount) // Cents to Number for charts
            })),
            activeUsersCount
        };
    }
}
