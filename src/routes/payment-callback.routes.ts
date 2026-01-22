import { Router } from 'express';
import { PaymentNormalizationService } from '../services/payment-normalization.service';
import logger from '../utils/logger';

const router = Router();

// M-Pesa STK Push Callback
router.post('/mpesa/stk-push/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const normalized = PaymentNormalizationService.normalizeStkPush(req.body, tenantId);
        await PaymentNormalizationService.processPayment(normalized);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error: any) {
        logger.error('M-Pesa STK Callback failed', { error: error.message });
        res.status(500).json({ ResultCode: 1, ResultDesc: 'Failed' });
    }
});

// M-Pesa C2B (Paybill/Till) Callback
router.post('/mpesa/c2b/:tenantId/:channel', async (req, res) => {
    try {
        const { tenantId, channel } = req.params;
        const normalized = PaymentNormalizationService.normalizeC2B(
            req.body,
            tenantId,
            channel as 'MPESA_PAYBILL' | 'MPESA_TILL'
        );
        await PaymentNormalizationService.processPayment(normalized);
        res.json({ ResultCode: 0, ResultDesc: 'Success' });
    } catch (error: any) {
        logger.error('M-Pesa C2B Callback failed', { error: error.message });
        res.status(500).json({ ResultCode: 1, ResultDesc: 'Failed' });
    }
});

// Bank Transfer Callback (Generic)
router.post('/bank-transfer/:tenantId', async (req, res) => {
    try {
        const { tenantId } = req.params;
        const normalized = PaymentNormalizationService.normalizeBankTransfer(req.body, tenantId);
        await PaymentNormalizationService.processPayment(normalized);
        res.json({ status: 'success' });
    } catch (error: any) {
        logger.error('Bank Transfer Callback failed', { error: error.message });
        res.status(500).json({ status: 'failed' });
    }
});

export default router;
