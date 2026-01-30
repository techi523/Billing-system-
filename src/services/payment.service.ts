import { Payment, Package, sequelize } from '../models';
import { MpesaService } from './mpesa.service';
import { IntaSendService } from './intasend.service';
import { WalletService } from './wallet.service';
import { SessionOrchestrator } from '../orchestrator';
import logger from '../utils/logger';
import { Op, Transaction } from 'sequelize';

export class PaymentService {
    /**
     * Finds payments that have been PENDING for too long and checks Safaricom status
     */
    static async pollPendingPayments() {
        const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);

        const pendingPayments = await Payment.findAll({
            where: {
                status: 'PENDING',
                [Op.or]: [
                    { checkoutRequestId: { [Op.ne]: null } },
                    { intasendTrackingId: { [Op.ne]: null } }
                ],
                createdAt: { [Op.lt]: twoMinutesAgo }
            }
        });

        for (const payment of pendingPayments) {
            let shouldFulfill = false;
            let updatedPayment = payment;

            try {
                await sequelize.transaction(async (t: Transaction) => {
                    // Lock the row for the duration of the check
                    const lockedPayment = await Payment.findByPk(payment.id, {
                        lock: true,
                        transaction: t
                    });

                    if (!lockedPayment || lockedPayment.status !== 'PENDING') return;

                    logger.info('Polling status for pending payment', { paymentId: payment.id });

                    let isSuccess = false;

                    if (lockedPayment.checkoutRequestId) {
                        // Original M-Pesa polling
                        const status = await MpesaService.checkTransactionStatus(lockedPayment.checkoutRequestId);
                        if (status && status.ResultCode === "0") {
                            lockedPayment.mpesaReceiptNumber = status.MpesaReceiptNumber || `QUERY-${payment.id.slice(0, 8)}`;
                            isSuccess = true;
                        } else if (status && ["1032", "2001", "1"].includes(status.ResultCode)) {
                            lockedPayment.status = 'FAILED';
                            await lockedPayment.save({ transaction: t });
                        }
                    } else if (lockedPayment.intasendTrackingId) {
                        // IntaSend polling
                        const status = await IntaSendService.checkStatus(lockedPayment.intasendTrackingId);
                        if (status && status.state === "COMPLETE") {
                            lockedPayment.intasendState = status.state;
                            isSuccess = true;
                        } else if (status && ["FAILED", "CANCELLED"].includes(status.state)) {
                            lockedPayment.status = 'FAILED';
                            lockedPayment.intasendState = status.state;
                            await lockedPayment.save({ transaction: t });
                        }
                    }

                    if (isSuccess) {
                        lockedPayment.status = 'SUCCESS';
                        lockedPayment.completedAt = new Date();
                        await lockedPayment.save({ transaction: t });

                        // Process Revenue Split
                        await WalletService.processPayment(lockedPayment);

                        shouldFulfill = true;
                        updatedPayment = lockedPayment;
                    }
                });

                // Execute fulfillment OUTSIDE the transaction to ensure Orchestrator sees committed data
                if (shouldFulfill) {
                    await this.fulfillPayment(updatedPayment);
                }

            } catch (error: any) {
                logger.error('Polling error', { paymentId: payment.id, error: error.message });
            }
        }
    }

    private static async fulfillPayment(payment: any) {
        try {
            if (payment.subscriberId) {
                const { IspService } = require('./isp.service');
                await IspService.renewSubscriber(payment.subscriberId);
            } else if (payment.macAddress) {
                await SessionOrchestrator.grantAccess(
                    payment.id,
                    payment.macAddress,
                    payment.ipAddress as string
                );
            }
        } catch (error: any) {
            logger.error('Fulfillment error during polling', { paymentId: payment.id, error: error.message });
        }
    }
}
