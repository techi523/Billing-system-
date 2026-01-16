import { Router } from 'express';
import { Payment, Package, Tenant, sequelize } from '../models';
import { SessionOrchestrator } from '../orchestrator';
import logger from '../utils/logger';

const router = Router();

// SAFE SAFARICOM IPS (PROD)
const SAFARICOM_IPS = [
    '196.201.214.200', '196.201.214.206', '196.201.213.114',
    '196.201.214.207', '196.201.214.208', '196.201.213.44',
    '196.201.212.127', '196.201.212.138'
];

router.post('/mpesa', async (req, res) => {
    const { Body } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    // 1. Log Raw Callback for audit trail
    logger.info('M-Pesa Callback Received', { ip: clientIp, payload: JSON.stringify(req.body) });

    // 2. IP Validation (Optional but recommended in production)
    if (process.env.NODE_ENV === 'production' && !SAFARICOM_IPS.includes(clientIp as string)) {
        logger.warn('Unauthorized M-Pesa Callback IP', { ip: clientIp });
    }

    if (!Body || !Body.stkCallback) {
        return res.status(400).send('Invalid payload');
    }

    const callback = Body.stkCallback;
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    try {
        let shouldFulfill = false;

        await sequelize.transaction(async (t) => {
            // Find the pending payment with LOCK to prevent race conditions
            const payment = await Payment.findOne({
                where: { checkoutRequestId },
                include: [Package],
                lock: true,
                transaction: t
            });

            if (!payment) {
                logger.error('Payment not found for CheckoutRequestID', { checkoutRequestId });
                return;
            }

            // Capture raw callback
            payment.rawCallback = JSON.stringify(req.body);

            // If already processed, ignore
            if (payment.status !== 'PENDING') {
                logger.info('Payment already processed, skipping fulfillment', { paymentId: payment.id, status: payment.status });
                return;
            }

            if (resultCode === 0) {
                // SUCCESS
                const metadata = callback.CallbackMetadata.Item;
                const receipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
                const amountPaid = metadata.find((i: any) => i.Name === 'Amount')?.Value;

                const pkg = (payment as any).package;

                // 3. Validation Rules
                if (Number(amountPaid) < pkg.price) {
                    logger.warn('Payment amount mismatch', { expected: pkg.price, received: amountPaid, paymentId: payment.id });
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return;
                }

                // Check for duplicate receipt
                const duplicate = await Payment.findOne({
                    where: { mpesaReceiptNumber: receipt },
                    transaction: t
                });
                if (duplicate && duplicate.id !== payment.id) {
                    logger.error('Duplicate M-Pesa Receipt detected', { receipt, paymentId: payment.id });
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return;
                }

                payment.status = 'SUCCESS';
                payment.mpesaReceiptNumber = receipt;
                await payment.save({ transaction: t });

                logger.info('Payment SUCCESS', { paymentId: payment.id, receipt });
                shouldFulfill = true; // Signal for post-transaction fulfillment

            } else {
                // FAILURES (e.g. 1032 cancelled, 2001 insufficient)
                payment.status = 'FAILED';
                await payment.save({ transaction: t });
                logger.warn('Payment FAILED/CANCELLED', {
                    paymentId: payment.id,
                    resultCode,
                    desc: callback.ResultDesc
                });
            }
        });

        // 4. INTERNET ACTIVATION LOGIC (Outside Transaction)
        if (shouldFulfill) {
            try {
                // Re-fetch payment to ensure we have committed data
                const freshPayment = await Payment.findOne({ where: { checkoutRequestId } });

                if (freshPayment && freshPayment.subscriberId) {
                    // ISP MODE
                    const { IspService } = require('../services/isp.service');
                    await IspService.renewSubscriber(freshPayment.subscriberId);
                    logger.info('ISP Subscriber Renewed', { subscriberId: freshPayment.subscriberId });
                } else if (freshPayment && freshPayment.macAddress) {
                    // HOTSPOT MODE
                    await SessionOrchestrator.grantAccess(
                        freshPayment.id,
                        freshPayment.macAddress,
                        freshPayment.ipAddress as string
                    );
                    logger.info('Hotspot Access Granted', { mac: freshPayment.macAddress });
                }
            } catch (error: any) {
                // Note: Payment is already SUCCESS, so we log this as a critical fulfillment error
                logger.error('Fulfillment Failed', { checkoutRequestId, error: error.message });
            }
        }
    } catch (err: any) {
        logger.error('Webhook Processing Error', { error: err.message });
        return res.status(500).send('Internal Server Error');
    }

    res.status(200).send('OK');
});

export default router;
