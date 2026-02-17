import { Router } from 'express';
import { Payment, Package, Subscriber, CampaignLog, sequelize } from '../models';
import { SessionOrchestrator } from '../orchestrator';
import { IntaSendService } from '../services/intasend.service';
import { WalletService } from '../services/wallet.service';
import { SocketService } from '../services/socket.service';
import logger from '../utils/logger';
import { config } from '../config/env';

const router = Router();

// SAFE SAFARICOM IPS (PROD)
const SAFARICOM_IPS = [
    '196.201.214.200', '196.201.214.206', '196.201.213.114',
    '196.201.214.207', '196.201.214.208', '196.201.213.44',
    '196.201.212.127', '196.201.212.138'
];

/**
 * Async fulfillment function with retry logic
 */
async function processFulfillment(fulfillmentData: any) {
    const { paymentId, subscriberId, macAddress, ipAddress: _ipAddress, routerId: _routerId } = fulfillmentData;
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            if (subscriberId) {
                // ISP MODE: Renew subscriber
                const { IspService } = require('../services/isp.service');
                await IspService.renewSubscriber(subscriberId);
                logger.info('ISP Subscriber Renewed', { subscriberId, paymentId, attempt });
            } else if (macAddress && _routerId) {
                // HOTSPOT MODE: Grant instant access
                await SessionOrchestrator.grantAccess(paymentId, macAddress, _ipAddress);
                logger.info('Hotspot Access Granted', { mac: macAddress, paymentId, attempt });
            }

            // Audit log successful fulfillment
            await require('../services/audit.service').logEvent('PAYMENT_FULFILLED', {
                paymentId,
                macAddress,
                subscriberId,
                routerId: _routerId,
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
            } else {
                // Exponential backoff: 1s, 2s, 4s
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt - 1) * 1000));
            }
        }
    }
}

// WHATSAPP STATUS WEBHOOK
router.post('/whatsapp-status', async (req, res) => {
    const { MessageSid, MessageStatus, ErrorCode } = req.body;
    logger.info('WhatsApp status callback received', { MessageSid, MessageStatus });

    try {
        const log = await CampaignLog.findOne({ where: { providerReference: MessageSid } });
        if (log) {
            let status: any = 'SENT';
            if (MessageStatus === 'delivered') status = 'DELIVERED';
            if (MessageStatus === 'read') status = 'READ';
            if (MessageStatus === 'failed') status = 'FAILED';

            await log.update({
                status,
                error: ErrorCode ? `Twilio Error: ${ErrorCode}` : null
            });
        }
        res.status(200).send('OK');
    } catch (err: any) {
        logger.error('WhatsApp Status Webhook Error', { error: err.message });
        res.status(500).send('Error');
    }
});

// M-PESA WEBHOOK
router.post('/mpesa', async (req, res) => {
    const { Body } = req.body;
    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress;

    if (process.env.NODE_ENV === 'production' && !SAFARICOM_IPS.includes(clientIp as string)) {
        logger.warn('Unauthorized M-Pesa Callback IP', { ip: clientIp });
        return res.status(403).send('Unauthorized IP');
    }

    if (!Body || !Body.stkCallback) {
        logger.warn('Invalid M-Pesa callback payload', { ip: clientIp });
        return res.status(400).send('Invalid payload');
    }

    const callback = Body.stkCallback;
    const checkoutRequestId = callback.CheckoutRequestID;
    const resultCode = callback.ResultCode;

    const callbackHash = require('crypto').createHash('sha256')
        .update(JSON.stringify(req.body))
        .digest('hex');

    try {
        let shouldFulfill = false;
        let fulfillmentData: any = null;

        await sequelize.transaction(async (t) => {
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

            if (payment.processedCallbackHash === callbackHash) {
                return res.status(200).send('Already processed');
            }

            payment.rawCallback = JSON.stringify(req.body);
            payment.processedCallbackHash = callbackHash;

            if (payment.status !== 'PENDING') {
                await payment.save({ transaction: t });
                return res.status(200).send('Already processed');
            }

            if (resultCode === 0) {
                const metadata = callback.CallbackMetadata.Item;
                const receipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber')?.Value;
                const amountPaid = metadata.find((i: any) => i.Name === 'Amount')?.Value;

                const pkg = (payment as any).package;

                if (!receipt || !amountPaid) {
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return res.status(200).send('OK');
                }

                if (Number(amountPaid) !== Number(pkg.price) / 100) { // pkg.price is in cents
                    logger.warn('Payment amount mismatch', { expected: pkg.price, received: amountPaid });
                    payment.status = 'FAILED';
                    await payment.save({ transaction: t });
                    return res.status(200).send('OK');
                }

                payment.status = 'SUCCESS';
                payment.mpesaReceiptNumber = receipt;
                payment.completedAt = new Date();

                // Auto-provision Subscriber
                let subscriber = await Subscriber.findOne({
                    where: { phoneNumber: payment.phoneNumber, tenantId: payment.tenantId }
                });

                if (!subscriber) {
                    subscriber = await Subscriber.create({
                        phoneNumber: payment.phoneNumber,
                        tenantId: payment.tenantId,
                        status: 'ACTIVE',
                        lastPaymentDate: new Date(),
                        macAddress: payment.macAddress // Link the current device
                    });
                    logger.info('Auto-created new subscriber', { phoneNumber: payment.phoneNumber, tenantId: payment.tenantId });
                } else {
                    await subscriber.update({
                        status: 'ACTIVE',
                        lastPaymentDate: new Date(),
                        macAddress: payment.macAddress || subscriber.macAddress
                    });
                }

                payment.subscriberId = subscriber.id;
                await payment.save({ transaction: t });

                // Real-time broadcast
                SocketService.emitToTenant(payment.tenantId, 'PAYMENT_SUCCESS', {
                    paymentId: payment.id,
                    amount: payment.amount,
                    phoneNumber: payment.phoneNumber,
                    macAddress: payment.macAddress
                });

                // Process Revenue Split
                await WalletService.processPayment(payment, t);

                fulfillmentData = {
                    paymentId: payment.id,
                    subscriberId: payment.subscriberId,
                    macAddress: payment.macAddress,
                    ipAddress: payment.ipAddress,
                    routerId: payment.routerId
                };
                shouldFulfill = true;
            } else {
                payment.status = 'FAILED';
                await payment.save({ transaction: t });
            }
        });

        if (shouldFulfill && fulfillmentData) {
            setImmediate(() => processFulfillment(fulfillmentData));
        }

        res.status(200).send('OK');
    } catch (err: any) {
        logger.error('M-Pesa Webhook Error', { error: err.message });
        res.status(500).send('Internal Server Error');
    }
});

// INTASEND WEBHOOK
router.post('/intasend', async (req, res) => {
    const signature = req.headers['intasend-signature'] as string;
    const rawBody = (req as any).rawBody;

    // Use rawBody for signature verification if available, otherwise fall back to stringified body
    const bodyForVerification = rawBody || JSON.stringify(req.body);

    if (!config.payments.intasend.isMock) {
        if (!signature || !IntaSendService.verifySignature(bodyForVerification, signature)) {
            logger.warn('Invalid IntaSend Signature', { signature });
            return res.status(403).send('Invalid Signature');
        }
    }

    const { tracking_id, state, api_ref } = req.body;
    const paymentId = api_ref;

    try {
        let shouldFulfill = false;
        let fulfillmentData: any = null;

        await sequelize.transaction(async (t) => {
            const payment = await Payment.findByPk(paymentId, {
                include: [Package],
                lock: true,
                transaction: t
            });

            if (!payment) {
                logger.error('Payment not found for IntaSend api_ref', { paymentId });
                return res.status(404).send('Payment not found');
            }

            if (payment.status !== 'PENDING') {
                return res.status(200).send('Already processed');
            }

            payment.intasendTrackingId = tracking_id;
            payment.intasendState = state;
            payment.rawCallback = bodyForVerification.toString();

            if (state === 'COMPLETE') {
                payment.status = 'SUCCESS';
                payment.completedAt = new Date();

                // Auto-provision Subscriber
                let subscriber = await Subscriber.findOne({
                    where: { phoneNumber: payment.phoneNumber, tenantId: payment.tenantId }
                });

                if (!subscriber) {
                    subscriber = await Subscriber.create({
                        phoneNumber: payment.phoneNumber,
                        tenantId: payment.tenantId,
                        status: 'ACTIVE',
                        lastPaymentDate: new Date(),
                        macAddress: payment.macAddress
                    });
                } else {
                    await subscriber.update({
                        status: 'ACTIVE',
                        lastPaymentDate: new Date(),
                        macAddress: payment.macAddress || subscriber.macAddress
                    });
                }

                payment.subscriberId = subscriber.id;
                await payment.save({ transaction: t });

                // Real-time broadcast
                SocketService.emitToTenant(payment.tenantId, 'PAYMENT_SUCCESS', {
                    paymentId: payment.id,
                    amount: payment.amount,
                    channel: 'INTASEND',
                    macAddress: payment.macAddress
                });

                // Process Revenue Split
                await WalletService.processPayment(payment, t);

                fulfillmentData = {
                    paymentId: payment.id,
                    subscriberId: payment.subscriberId,
                    macAddress: payment.macAddress,
                    ipAddress: payment.ipAddress,
                    routerId: payment.routerId
                };
                shouldFulfill = true;
            } else if (['FAILED', 'CANCELLED'].includes(state)) {
                payment.status = 'FAILED';
                await payment.save({ transaction: t });
            }
        });

        if (shouldFulfill && fulfillmentData) {
            setImmediate(() => processFulfillment(fulfillmentData));
        }

        res.status(200).send('OK');
    } catch (err: any) {
        logger.error('IntaSend Webhook Error', { error: err.message, paymentId });
        res.status(500).send('Internal Server Error');
    }
});

export default router;
