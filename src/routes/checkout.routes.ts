import { Router } from 'express';
import { CheckoutService } from '../services/checkout.service';
import { SaaSInvoice } from '../models';
import logger from '../utils/logger';

const router = Router();

const getTenantId = (req: any): string => {
    return req.tenantId || req.user?.tenantId || req.headers['x-tenant-id'] || 'default-tenant-id';
};

// 1. Prepare Checkout Intent / Create Pending Invoice
router.post('/prepare', async (req: any, res: any) => {
    try {
        const tenantId = getTenantId(req);
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
        const tenantId = getTenantId(req);
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
        const tenantId = getTenantId(req);
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
        const tenantId = getTenantId(req);
        const invoice = await SaaSInvoice.findOne({
            where: { id: req.params.invoiceId, tenantId }
        });

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
        const tenantId = getTenantId(req);
        const { invoiceId, transactionRef, paymentMethod = 'STK_PUSH' } = req.body;

        const invoice = await SaaSInvoice.findOne({
            where: { id: invoiceId, tenantId }
        });

        if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

        await CheckoutService.processPaymentSuccess(invoiceId, transactionRef || `REF-${Date.now()}`, paymentMethod);

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
