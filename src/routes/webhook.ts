import { Router } from 'express';
import { Payment, Package, Tenant, sequelize } from '../models';
import { SessionOrchestrator } from '../orchestrator';
import { AuditService } from '../services/audit.service';
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

    // 1. Enhanced Security: IP Validation with logging
    if (process.env.NODE_ENV === 'production' && !SAFARICOM_IPS.includes(clientIp as string)) {
        logger.warn('Unauthorized M-Pesa Callback IP', { ip: clientIp });
        return res.status(403).send('Unauthorized IP');
    }

    // 2. Payload validation
    if (!Body || !Body.stkCallback) {
        logger.warn('Invalid M-Pesa callback payload', { ip: clientIp });
        return res.status(400).send('Invalid payload');
    }

    const callback = Body.stkCallback;
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    // 3. Idempotency check: Prevent duplicate processing
    const callbackHash = require('crypto').createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex');

    try {
        let shouldFulfill = false;
        let fulfillmentData: {
            paymentId: string;
            subscriberId: string | null;
            macAddress: string | null;
            ipAddress: string | null;
            routerId: string | null;
        } | null = null;

        await sequelize.transaction(async (t) => {
            // Find the pending payment with row-level locking
            const payment = await Payment.findOne({
                where: { checkoutRequestId },
                include: [Package],
                lock: true,
                transaction: t
            });

            if (!payment) {
                logger.error('Payment not found for CheckoutRequestID', { checkoutRequestId });
                return res.status(404).send('Payment not found');
            }

            // Idempotency: Check if this exact callback was already processed
            if (payment.processedCallbackHash === callbackHash) {
                logger.info('Duplicate callback detected, ignoring', { paymentId: payment.id });
                return res.status(200).send('Already processed');
            }

            // Store callback data with hash for idempotency
            payment.rawCallback = JSON.stringify(req.body);
            payment.processedCallbackHash = callbackHash;

            // If already processed, ignore
            if (payment.status !== 'PENDING') {
                logger.info('Payment already processed, skipping fulfillment', {
                    paymentId: payment.id,
                    status: payment.status
                });
                await payment.save({ transaction: t });
                return res.status(200).send('Already processed');
            }

            if (resultCode === 0) {
                // SUCCESS: Enhanced validation
                const metadata = callback.CallbackMetadata.Item;
                const receipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
                const amountPaid = metadata.find((i: any) => i.Name === 'Amount')?.Value;
                const phoneNumber = metadata.find((i: any) => i.Name === 'PhoneNumber')?.Value;

                const pkg = (payment as any).package;

                // Security validations
                if (!receipt || !amountPaid) {
                    logger.error('Missing required callback metadata', { paymentId: payment.id });
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return res.status(200).send('OK');
                }

                if (Number(amountPaid) !== pkg.price) {
                    logger.warn('Payment amount mismatch', {
                        expected: pkg.price,
                        received: amountPaid,
                        paymentId: payment.id
                    });
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return res.status(200).send('OK');
                }

                // Duplicate receipt check with time window (24 hours)
                const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
                const duplicate = await Payment.findOne({
                    where: {
                        mpesaReceiptNumber: receipt,
                        createdAt: { [require('sequelize').Op.gt]: yesterday }
                    },
                    transaction: t
                });

                if (duplicate && duplicate.id !== payment.id) {
                    logger.error('Duplicate M-Pesa Receipt detected', {
                        receipt,
                        paymentId: payment.id,
                        duplicateId: duplicate.id
                    });
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return res.status(200).send('OK');
                }

                // SUCCESS: Update payment atomically
                payment.status = 'SUCCESS';
                payment.mpesaReceiptNumber = receipt;
                payment.completedAt = new Date();
                await payment.save({ transaction: t });

                // Prepare fulfillment data for post-transaction processing
                fulfillmentData = {
                    paymentId: payment.id,
                    subscriberId: payment.subscriberId,
                    macAddress: payment.macAddress,
                    ipAddress: payment.ipAddress,
                    routerId: payment.routerId
                };

                logger.info('Payment SUCCESS - Ready for fulfillment', {
                    paymentId: payment.id,
                    receipt,
                    amount: amountPaid
                });
                shouldFulfill = true;

            } else {
                // FAILURE: Enhanced failure handling
                const failureReasons: { [key: number]: string } = {
                    1: 'Insufficient funds',
                    1032: 'Cancelled by user',
                    2001: 'Insufficient funds',
                    1037: 'Internal error',
                    1025: 'Timeout',
                    2000: 'Invalid phone number'
                };

                payment.status = 'FAILED';
                payment.failureReason = failureReasons[resultCode] || `M-Pesa Error ${resultCode}`;
                await payment.save({ transaction: t });

                logger.warn('Payment FAILED/CANCELLED', {
                    paymentId: payment.id,
                    resultCode,
                    reason: payment.failureReason,
                    desc: callback.ResultDesc
                });
            }
        });

        // 4. ASYNC FULFILLMENT: Execute outside transaction for instant access
        if (shouldFulfill && fulfillmentData) {
            const dataToProcess = { ...(fulfillmentData as any) };
            setImmediate(async () => {
                try {
                    await processFulfillment(dataToProcess);
                } catch (error: any) {
                    logger.error('Async fulfillment failed', {
                        paymentId: dataToProcess.paymentId,
                        error: error.message
                    });
                }
            });
        }

        res.status(200).send('OK');

    } catch (err: any) {
        logger.error('Webhook Processing Error', { error: err.message, checkoutRequestId });
        return res.status(500).send('Internal Server Error');
    }
});

// Async fulfillment function with retry logic
async function processFulfillment(fulfillmentData: any) {
    const { paymentId, subscriberId, macAddress, ipAddress, routerId } = fulfillmentData;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (subscriberId) {
                // ISP MODE: Renew subscriber
                const { IspService } = require('../services/isp.service');
                await IspService.renewSubscriber(subscriberId);
                logger.info('ISP Subscriber Renewed', { subscriberId, paymentId, attempt });
            } else if (macAddress && routerId) {
                // HOTSPOT MODE: Grant instant access
                await SessionOrchestrator.grantAccess(paymentId, macAddress, ipAddress);
                logger.info('Hotspot Access Granted', { mac: macAddress, paymentId, attempt });
            }

            // Audit log successful fulfillment
            await require('../services/audit.service').logEvent('PAYMENT_FULFILLED', {
                paymentId,
                macAddress,
                subscriberId,
                routerId,
                timestamp: new Date()
            });

            break; // Success, exit retry loop

        } catch (error: any) {
            logger.warn(`Fulfillment attempt ${attempt} failed`, {
                paymentId,
                error: error.message,
                willRetry: attempt < maxRetries
            });

            if (attempt === maxRetries) {
                logger.error('Fulfillment failed after all retries', { paymentId, error: error.message });
                // TODO: Alert admin, queue for manual processing
            } else {
                // Exponential backoff: 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            }
        }
    }
}

export default router;
