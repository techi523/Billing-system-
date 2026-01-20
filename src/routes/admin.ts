import { Router } from 'express';
import { Package, Payment, Session, Router as RouterModel, Subscriber } from '../models';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.use(authMiddleware);

// All these routes are scoped to the authenticated user's tenantId

// --- PACKAGES ---
router.get('/packages', async (req: AuthRequest, res) => {
    const packages = await Package.findAll({ where: { tenantId: req.user?.tenantId } });
    res.json(packages);
});

router.post('/packages', async (req: AuthRequest, res) => {
    const pkg = await Package.create({ ...req.body, tenantId: req.user?.tenantId });
    res.json(pkg);
});

router.put('/packages/:id', async (req: AuthRequest, res) => {
    const pkg = await Package.findOne({ where: { id: req.params.id, tenantId: req.user?.tenantId } });
    if (!pkg) return res.status(404).json({ error: 'Package not found' });
    await pkg.update(req.body);
    res.json(pkg);
});

// --- ROUTERS ---
router.get('/routers', async (req: AuthRequest, res) => {
    const routers = await RouterModel.findAll({ where: { tenantId: req.user?.tenantId } });
    res.json(routers);
});

router.post('/routers', async (req: AuthRequest, res) => {
    const routerDoc = await RouterModel.create({ ...req.body, tenantId: req.user?.tenantId });
    res.json(routerDoc);
});

router.delete('/routers/:id', async (req: AuthRequest, res) => {
    const routerDoc = await RouterModel.findOne({ where: { id: req.params.id, tenantId: req.user?.tenantId } });
    if (!routerDoc) return res.status(404).json({ error: 'Router not found' });
    await routerDoc.destroy();
    res.json({ message: 'Router removed' });
});

import { IspService } from '../services/isp.service';

// --- SUBSCRIBER (ISP) ---
router.get('/subscribers', async (req: AuthRequest, res) => {
    const subscribers = await Subscriber.findAll({ where: { tenantId: req.user?.tenantId } });
    res.json(subscribers);
});

router.post('/subscribers', async (req: AuthRequest, res) => {
    try {
        const subscriber = await IspService.registerSubscriber({
            ...req.body,
            tenantId: req.user?.tenantId
        });
        res.status(201).json(subscriber);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});


import { Voucher } from '../models';
import { VoucherService } from '../services/voucher.service';

// --- VOUCHERS ---
router.get('/vouchers', async (req: AuthRequest, res) => {
    const vouchers = await Voucher.findAll({
        where: { tenantId: req.user?.tenantId },
        include: [Package]
    });
    res.json(vouchers);
});

router.post('/vouchers', async (req: AuthRequest, res) => {
    const { packageId, count } = req.body;
    try {
        const vouchers = await VoucherService.generateVouchers(
            req.user?.tenantId as string,
            packageId,
            count
        );
        res.status(201).json(vouchers);
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

import { AnalyticsService } from '../services/analytics.service';

// --- ANALYTICS & REPORTING ---
router.get('/stats', async (req: AuthRequest, res) => {
    try {
        const stats = await AnalyticsService.getDashboardStats(req.user?.tenantId as string);
        res.json(stats);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/reports/revenue', async (req: AuthRequest, res) => {
    const { start, end } = req.query;
    try {
        const report = await AnalyticsService.getRevenueReport(
            req.user?.tenantId as string,
            start as string,
            end as string
        );
        res.json(report);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/insights', async (req: AuthRequest, res) => {
    try {
        const insights = await AnalyticsService.getTrafficInsights(req.user?.tenantId as string);
        res.json(insights);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/reports/export', async (req: AuthRequest, res) => {
    // Simple CSV generator for demonstration
    try {
        const report = await AnalyticsService.getRevenueReport(req.user?.tenantId as string);
        let csv = 'Date,Phone,Amount,Package,Status\n';
        report.forEach((p: any) => {
            const escape = (val: any) => {
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Escape quotes and wrap in quotes if contains comma, newline or quotes
                if (str.includes(',') || str.includes('\n') || str.includes('"')) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            csv += `${escape(p.createdAt)},${escape(p.phoneNumber)},${escape(p.amount)},${escape(p.package?.name)},${escape(p.status)}\n`;
        });
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=revenue_report.csv');
        res.send(csv);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
