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

// --- ANALYTICS ---
router.get('/revenue', async (req: AuthRequest, res) => {
    const payments = await Payment.findAll({
        where: { tenantId: req.user?.tenantId, status: 'SUCCESS' },
        include: [Package]
    });
    res.json(payments);
});

export default router;
