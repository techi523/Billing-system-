import { Payment, Package, sequelize } from '../models';
import { MpesaService } from './mpesa.service';
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
                checkoutRequestId: { [Op.ne]: null },
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
                    const status = await MpesaService.checkTransactionStatus(payment.checkoutRequestId as string);

                    if (!status) return;

                    // Safaricom ResultCode 0 means Success
                    if (status.ResultCode === "0") {
                        lockedPayment.status = 'SUCCESS';
                        lockedPayment.mpesaReceiptNumber = status.MpesaReceiptNumber || `QUERY-${payment.id.slice(0, 8)}`;
                        await lockedPayment.save({ transaction: t });
                        shouldFulfill = true;
                        updatedPayment = lockedPayment; // Keep reference for fulfillment
                    } else if (["1032", "2001", "1"].includes(status.ResultCode)) {
                        lockedPayment.status = 'FAILED';
                        await lockedPayment.save({ transaction: t });
                        logger.warn('Payment marked as FAILED via polling', { paymentId: payment.id, code: status.ResultCode });
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
