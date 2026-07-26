import { Router } from 'express';
import { SaaSBillingService } from '../services/saas-billing.service';
import logger from '../utils/logger';

const router = Router();

// Public IntaSend Payment Webhook Endpoint (Idempotent & Secured)
router.post('/intasend', async (req: any, res: any) => {
    try {
        const payload = req.body;
        logger.info('Received IntaSend webhook payload', { payload });

        if (!payload || !payload.invoice_number) {
            return res.status(400).json({ error: 'Invalid webhook payload structure' });
        }

        const result = await SaaSBillingService.processIntaSendWebhook(payload);
        res.json(result);
    } catch (error: any) {
        logger.error('IntaSend webhook processing error', { error: error.message });
        res.status(500).json({ error: error.message });
    }
});

export default router;
