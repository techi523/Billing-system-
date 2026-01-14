import { Payment, Package } from '../models';
import { MpesaService } from './mpesa.service';
import { SessionOrchestrator } from '../orchestrator';
import logger from '../utils/logger';
import { Op } from 'sequelize';

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
            try {
                logger.info('Polling status for pending payment', { paymentId: payment.id });
                const status = await MpesaService.checkTransactionStatus(payment.checkoutRequestId as string);

                if (!status) continue;

                // Safaricom ResultCode 0 means Success
                if (status.ResultCode === "0") {
                    payment.status = 'SUCCESS';
                    payment.mpesaReceiptNumber = status.MpesaReceiptNumber || `QUERY-${payment.id.slice(0, 8)}`;
                    await payment.save();

                    await this.fulfillPayment(payment);
                } else if (["1032", "2001", "1"].includes(status.ResultCode)) {
                    payment.status = 'FAILED';
                    await payment.save();
                    logger.warn('Payment marked as FAILED via polling', { paymentId: payment.id, code: status.ResultCode });
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
