import { Router } from 'express';
import { Package, Payment, Tenant, Router as RouterModel, PlatformSetting } from '../models';
import { AggregatorService } from '../services/aggregator.service';
import logger from '../utils/logger';
import { body, validationResult } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation';
import { MarketingService } from '../services/marketing.service';

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

// 0c. Get Eligible Captive Portal Ads (Asynchronous & Resilient)
router.get('/:tenantId/ads', async (req: any, res) => {
    try {
        const tenantId = req.params.tenantId;
        const displayRule = (req.query.displayRule as string) || 'BEFORE_LOGIN';
        const routerId = req.query.routerId as string;
        const packageId = req.query.packageId as string;
        const deviceType = (req.query.deviceType as string) || 'DESKTOP';

        const ads = await MarketingService.getEligibleAds(tenantId, {
            displayRule,
            routerId,
            packageId,
            deviceType
        });

        // Always return array; if empty or error, portal falls back cleanly
        res.json(ads);
    } catch (error: any) {
        logger.error('Captive portal ad fetch error, returning fallback', { tenantId: req.params.tenantId, error: error.message });
        res.json([]);
    }
});

// 0d. Track Captive Portal Ad Event
router.post('/ads/:adId/track', async (req: any, res) => {
    try {
        const adId = req.params.adId;
        const { tenantId, eventType, routerId, packageId, deviceType } = req.body;

        if (!tenantId || !eventType) {
            return res.status(400).json({ error: 'Missing tenantId or eventType' });
        }

        await MarketingService.trackEvent(tenantId, adId, eventType, {
            routerId,
            packageId,
            deviceType
        });

        res.json({ success: true });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});


// 1. Get Packages for a specific tenant
router.get('/:tenantId/packages', async (req: any, res) => {
    try {
        const packages = await Package.findAll({
            where: {
                tenantId: req.params.tenantId,
                isEnabled: true,
                isVisible: true,
                type: 'HOTSPOT'
            },
            order: [['price', 'ASC']]
        });
        res.json(packages);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Initiate Payment (Hotspot or ISP)
router.post('/:tenantId/pay', [
    body('phone').isString().matches(/^(?:254|\+254|0)?(7(?:(?:[0-9][0-9])|(?:[0-9][0-9]))[0-9]{6})$/).withMessage('Invalid phone number format'),
    body('packageId').isUUID().withMessage('Invalid package ID'),
    body('mac').optional().matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).withMessage('Invalid MAC address'),
    body('ip').optional().isIP().withMessage('Invalid IP address'),
    body('routerId').optional().isUUID().withMessage('Invalid router ID'),
    body('subscriberId').optional().isUUID().withMessage('Invalid subscriber ID'),
    handleValidationErrors
], async (req: any, res: any) => {
    const { phone, packageId, mac, ip, routerId, subscriberId } = req.body;
    const tenantId = req.params.tenantId;



    // Rate limiting: Prevent spam attacks (5 requests per minute per phone)

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

    // ENFORCE PRODUCTION MODE
    if (!tenant.isProduction) {
        logger.warn('Payment blocked: Tenant not in production mode', { tenantId });
        return res.status(403).json({
            error: 'This service is currently in setup mode and cannot process payments. Please contact the administrator.'
        });
    }

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
router.post('/:tenantId/voucher/redeem', [
    body('code').isString().isLength({ min: 4, max: 20 }).withMessage('Invalid voucher code'),
    body('mac').optional().matches(/^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/).withMessage('Invalid MAC address'),
    body('ip').optional().isIP().withMessage('Invalid IP address'),
    body('routerId').isUUID().withMessage('Invalid router ID'),
    handleValidationErrors
], async (req: any, res: any) => {
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
router.get('/health', (_req, res) => {
    res.json({ status: 'UP', service: 'SurfBill Portal', timestamp: new Date() });
});

// 7. Public Platform Settings (Contacts)
router.get('/public/settings', async (_req, res) => {
    try {
        const settings = await PlatformSetting.findAll({
            where: {
                key: [
                    'CONTACT_WHATSAPP', 'CONTACT_WHATSAPP_URL',
                    'CONTACT_PHONE', 'CONTACT_PHONE_TEL',
                    'CONTACT_EMAIL', 'CONTACT_EMAIL_MAILTO',
                    'CONTACT_FACEBOOK_PAGE', 'CONTACT_FACEBOOK_URL',
                    'CONTACT_SUPPORT_MESSAGE'
                ]
            }
        });
        res.json(settings);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
});

export default router;
