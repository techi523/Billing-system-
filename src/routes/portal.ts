import { Router } from 'express';
import { Package, Payment, Tenant, Router as RouterModel, PlatformSetting, Subscriber } from '../models';
import { AggregatorService } from '../services/aggregator.service';
import { v4 as uuidv4 } from 'uuid';
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

// 1b. Subscriber Self-Registration (Public)
router.post('/:tenantId/register', async (req, res) => {
    const { name, phoneNumber, email, packageId } = req.body;
    const tenantId = req.params.tenantId;

    try {
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        if (!packageId) {
            return res.status(400).json({ error: 'Please select a package' });
        }

        const phoneRegex = /^(?:254|\+254|0)?(7(?:(?:[0-9][0-9])|(?:[0-9][0-9]))[0-9]{6})$/;
        if (!phoneRegex.test(phoneNumber.toString().replace(/\s/g, ''))) {
            return res.status(400).json({ error: 'Invalid phone number format' });
        }

        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) return res.status(404).json({ error: 'Network provider not found' });

        const pkg = await Package.findByPk(packageId);
        if (!pkg || pkg.tenantId !== tenantId || !pkg.isEnabled) {
            return res.status(400).json({ error: 'Invalid package selected' });
        }

        const normalizedPhone = phoneNumber.replace(/^0/, '254').replace(/^\+/, '').replace(/\s/g, '');

        const existingSubscriber = await Subscriber.findOne({
            where: { phoneNumber: normalizedPhone, tenantId }
        });

        if (existingSubscriber) {
            return res.status(400).json({
                error: 'An account with this phone number already exists. Please contact support.',
                subscriberId: existingSubscriber.id
            });
        }

        const pppoeUsername = `SUB-${normalizedPhone.slice(-8)}`;
        const pppoePassword = Math.random().toString(36).slice(-8);

        const subscriber = await Subscriber.create({
            name: name || `Subscriber ${normalizedPhone.slice(-4)}`,
            phoneNumber: normalizedPhone,
            email: email || null,
            pppoeUsername,
            pppoePassword,
            packageId,
            tenantId,
            status: 'INACTIVE'
        });

        logger.info('Subscriber self-registered', {
            subscriberId: subscriber.id,
            tenantId,
            phone: normalizedPhone.substring(0, 4) + '****'
        });

        res.status(201).json({
            message: 'Registration successful. Please complete payment to activate your account.',
            subscriber: {
                id: subscriber.id,
                name: subscriber.name,
                phoneNumber: subscriber.phoneNumber,
                pppoeUsername: subscriber.pppoeUsername,
                package: { id: pkg.id, name: pkg.name, price: pkg.price, durationMinutes: pkg.durationMinutes }
            }
        });
    } catch (error: any) {
        logger.error('Subscriber registration failed', { error: error.message, tenantId });
        res.status(500).json({ error: 'Registration failed. Please try again.' });
    }
});

// 1c. Get available routers for a tenant (public)
router.get('/:tenantId/routers', async (req, res) => {
    try {
        const routers = await RouterModel.findAll({
            where: { tenantId: req.params.tenantId },
            attributes: ['id', 'name', 'host']
        });
        res.json(routers);
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 2. Initiate Payment (Hotspot or ISP)
router.post('/:tenantId/pay', async (req, res) => {
    const { phone, packageId, mac, ip, routerId, subscriberId } = req.body;
    const tenantId = req.params.tenantId;

    // Validate phone format (Basic Kenya/Intl format)
    const phoneRegex = /^(?:254|\+254|0)?(7(?:(?:[0-9][0-9])|(?:[0-9][0-9]))[0-9]{6})$/;
    if (!phone || !phoneRegex.test(phone.toString().replace(/\s/g, ''))) {
        return res.status(400).json({ error: 'Invalid phone number format' });
    }

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
