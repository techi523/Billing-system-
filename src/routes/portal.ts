import { Router } from 'express';
import { Package, Payment, Tenant, Router as RouterModel } from '../models';
import { MpesaService } from '../services/mpesa.service';
import { AggregatorService } from '../services/aggregator.service';
import logger from '../utils/logger';

const router = Router();

// 0. Get Tenant Configuration (Branding) - by ID
router.get('/:tenantId/config', async (req, res) => {
    const tenant = await Tenant.findByPk(req.params.tenantId, {
        attributes: ['id', 'name', 'logoUrl', 'primaryColor', 'subdomain']
    });
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    res.json(tenant);
});

// 0b. Get Tenant Configuration by Subdomain
router.get('/config/:subdomain', async (req, res) => {
    const tenant = await Tenant.findOne({
        where: { subdomain: req.params.subdomain },
        attributes: ['id', 'name', 'logoUrl', 'primaryColor', 'subdomain']
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

    // Rate limiting: Prevent spam attacks (5 requests per minute per phone)
    const rateLimitKey = `rate_limit:${phone}`;
    const now = Date.now();
    const windowStart = now - (60 * 1000); // 1 minute window

    const recentPayments = await Payment.count({
        where: {
            phoneNumber: phone,
            createdAt: { [require('sequelize').Op.gt]: new Date(windowStart) }
        }
    });

    if (recentPayments >= 5) {
        logger.warn('Rate limit exceeded for phone', { phone: phone.substring(0, 4) + '****' });
        return res.status(429).json({ error: 'Too many payment attempts. Please wait before trying again.' });
    }

    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });

    const pkg = await Package.findByPk(packageId);
    if (!pkg || pkg.tenantId !== tenantId || !pkg.isEnabled) {
        logger.warn('Unauthorized payment attempt: Package/Tenant mismatch or disabled', { packageId, tenantId });
        return res.status(403).json({ error: 'Invalid package for this tenant' });
    }

    if (routerId) {
        const routerDoc = await RouterModel.findByPk(routerId);
        if (!routerDoc || routerDoc.tenantId !== tenantId) {
            logger.warn('Unauthorized payment attempt: Router/Tenant mismatch', { routerId, tenantId });
            return res.status(403).json({ error: 'Invalid router for this tenant' });
        }
    }

    // Session-based mapping: Create encrypted session identifier
    const sessionId = require('crypto').randomBytes(32).toString('hex');
    const encryptedSession = require('crypto').createHash('sha256').update(sessionId).digest('hex');

    const payment = await Payment.create({
        phoneNumber: phone,
        amount: pkg.price,
        packageId: pkg.id,
        status: 'PENDING',
        macAddress: mac,
        ipAddress: ip,
        tenantId: tenantId,
        routerId: routerId,
        subscriberId: subscriberId,
        sessionId: encryptedSession, // Store encrypted session for security
        metadata: JSON.stringify({ sessionId, timestamp: Date.now() })
    });

    try {
        const userId = subscriberId || mac || sessionId.substring(0, 8);
        const aggregatorResponse = await AggregatorService.initiateStkPush({
            phoneNumber: phone,
            amount: pkg.price,
            tenantId: tenantId,
            callbackUrl: `${process.env.MPESA_CALLBACK_BASE_URL}/api/v1/aggregator/callback`,
            accountReference: pkg.name,
            transactionDesc: `Wifi Package: ${pkg.name}`
        });

        if (!aggregatorResponse.success) throw new Error(aggregatorResponse.message);

        // Save checkout ID for tracking/polling
        payment.checkoutRequestId = aggregatorResponse.checkoutRequestId || null;
        await payment.save();

        logger.info('Aggregator STK Push initiated', {
            paymentId: payment.id,
            sessionId: encryptedSession,
            phone: phone.substring(0, 4) + '****'
        });

        res.json({
            checkoutId: aggregatorResponse.checkoutRequestId,
            paymentId: payment.id,
            sessionId: sessionId
        });
    } catch (error: any) {
        logger.error('Aggregator STK Push initiation failed', { error: error.message, paymentId: payment.id });
        payment.status = 'FAILED';
        await payment.save();
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
