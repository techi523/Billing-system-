import { Router } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { SaaSInvoice, Tenant } from '../models';
import logger from '../utils/logger';

const router = Router();

const getTenantId = async (req: any): Promise<string> => {
    let id = req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'];
    if (!id || typeof id !== 'string' || !id.includes('-')) {
        const firstTenant = await Tenant.findOne({ order: [['createdAt', 'ASC']] });
        if (firstTenant) {
            return firstTenant.id;
        }
        return '00000000-0000-0000-0000-000000000001';
    }
    return id;
};

// 1. Prepare Checkout Intent / Create Pending Invoice
router.post('/prepare', async (req: any, res: any) => {
    try {
        const tenantId = await getTenantId(req);
        const { itemType, itemId, itemSlug, quantity, billingCycle, couponCode, customAmountCents } = req.body;

        if (!itemType) {
            return res.status(400).json({ error: 'itemType is required' });
        }

        const checkout = await CheckoutService.prepareCheckout({
            tenantId,
            itemType,
            itemId,
            itemSlug,
            quantity: Number(quantity) || 1,
            billingCycle: billingCycle === 'YEARLY' ? 'YEARLY' : 'MONTHLY',
            couponCode,
            customAmountCents: customAmountCents ? Number(customAmountCents) : undefined
        });

        res.json(checkout);
    } catch (error: any) {
        logger.error('Checkout prepare error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 2. Validate Coupon Code
router.post('/validate-coupon', (req: any, res: any) => {
    const { couponCode } = req.body;
    if (!couponCode) return res.status(400).json({ error: 'Coupon code is required' });

    const code = couponCode.trim().toUpperCase();
    if (code === 'SURFBILL10' || code === 'SAVE10') {
        return res.json({ valid: true, discountPercent: 10, code, message: '10% discount applied!' });
    } else if (code === 'SURFBILL20' || code === 'WELCOME20') {
        return res.json({ valid: true, discountPercent: 20, code, message: '20% welcome discount applied!' });
    } else {
        return res.status(404).json({ valid: false, message: 'Invalid or expired coupon code.' });
    }
});

// 3. Initiate M-Pesa STK Push Payment
router.post('/pay-stk', async (req: any, res: any) => {
    try {
        const tenantId = await getTenantId(req);
        const { invoiceId, phoneNumber } = req.body;

        if (!invoiceId || !phoneNumber) {
            return res.status(400).json({ error: 'invoiceId and phoneNumber are required' });
        }

        const result = await CheckoutService.payWithStk(tenantId, invoiceId, phoneNumber);
        res.json(result);
    } catch (error: any) {
        logger.error('STK Push checkout error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

// 4. Pay via Tenant Wallet Balance
router.post('/pay-wallet', async (req: any, res: any) => {
    try {
        const tenantId = await getTenantId(req);
        const { invoiceId } = req.body;

        if (!invoiceId) {
            return res.status(400).json({ error: 'invoiceId is required' });
        }

        const result = await CheckoutService.payWithWallet(tenantId, invoiceId);
        res.json(result);
    } catch (error: any) {
        logger.error('Wallet checkout error', { error: error.message });
        res.status(400).json({ error: error.message });
    }
});

// 5. Poll Payment & Activation Status
router.get('/status/:invoiceId', async (req: any, res: any) => {
    try {
        const tenantId = await getTenantId(req);
        let invoice = await SaaSInvoice.findOne({
            where: { id: req.params.invoiceId, tenantId }
        });

        if (!invoice) {
            invoice = await SaaSInvoice.findOne({ where: { id: req.params.invoiceId } });
        }

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        res.json({
            invoiceId: invoice.id,
            invoiceNumber: invoice.invoiceNumber,
            paymentStatus: invoice.paymentStatus,
            paidAt: invoice.paidAt,
            paymentMethod: invoice.paymentMethod,
            totalAmountKes: Number(invoice.totalAmountCents) / 100
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 6. Direct Verification / Simulate STK Completion (for testing / instant callback)
router.post('/verify', async (req: any, res: any) => {
    try {
        const tenantId = await getTenantId(req);
        const { invoiceId, transactionRef, paymentMethod = 'STK_PUSH' } = req.body;

        let invoice = await SaaSInvoice.findOne({
            where: { id: invoiceId, tenantId }
        });

        if (!invoice) {
            invoice = await SaaSInvoice.findOne({ where: { id: invoiceId } });
        }

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        await CheckoutService.processPaymentSuccess(invoice.id, transactionRef || `REF-${Date.now()}`, paymentMethod);

        res.json({
            success: true,
            paymentStatus: 'PAID',
            message: 'Payment verified and service activated successfully.'
        });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
