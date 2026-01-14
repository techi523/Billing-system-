import { Router } from 'express';
import { Package, Payment, Tenant, Router as RouterModel } from '../models';
import { MpesaService } from '../services/mpesa.service';

const router = Router();

// 0. Get Tenant Configuration (Branding)
router.get('/:tenantId/config', async (req, res) => {
    const tenant = await Tenant.findByPk(req.params.tenantId, {
        attributes: ['name', 'logoUrl', 'primaryColor']
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
});

// 1. Get Packages for a specific tenant
router.get('/:tenantId/packages', async (req, res) => {
    const packages = await Package.findAll({
        where: {
            tenantId: req.params.tenantId,
            isEnabled: true,
            type: 'HOTSPOT'
        }
    });
    res.json(packages);
});

// 2. Initiate Payment (Hotspot or ISP)
router.post('/:tenantId/pay', async (req, res) => {
    const { phone, packageId, mac, ip, routerId, subscriberId } = req.body;
    const tenantId = req.params.tenantId;

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const pkg = await Package.findByPk(packageId);
    if (!pkg || pkg.tenantId !== tenantId) return res.status(404).json({ error: 'Package not found' });

    const payment = await Payment.create({
        phoneNumber: phone,
        amount: pkg.price,
        packageId: pkg.id,
        status: 'PENDING',
        macAddress: mac,
        ipAddress: ip,
        tenantId: tenantId,
        routerId: routerId,
        subscriberId: subscriberId
    });

    try {
        const userId = subscriberId || mac || 'GUEST';
        const stkResponse = await MpesaService.initiateStkPush(
            phone,
            pkg.price,
            tenantId,
            userId,
            pkg.id.toString()
        );

        // Save checkout ID for tracking/polling
        payment.checkoutRequestId = stkResponse.CheckoutRequestID;
        await payment.save();

        res.json({ checkoutId: stkResponse.CheckoutRequestID, paymentId: payment.id });
    } catch (error: any) {
        res.status(500).json({ error: 'Payment initiation failed. Please try again later.' });
    }
});


import { VoucherService } from '../services/voucher.service';

// 4. Redeem Voucher
router.post('/:tenantId/voucher/redeem', async (req, res) => {
    const { code, mac, ip, routerId } = req.body;
    try {
        const session = await VoucherService.redeemVoucher(code, routerId, mac, ip);
        res.json({ message: 'Voucher redeemed', session });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

// 5. Payment Status (Polling)
router.get('/payment-status/:id', async (req, res) => {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).json({ error: 'Payment not found' });
    res.json({ status: payment.status });
});

// 6. SaaS Health Check
router.get('/health', (req, res) => {
    res.json({ status: 'UP', service: 'SurfBill Portal', timestamp: new Date() });
});

export default router;
