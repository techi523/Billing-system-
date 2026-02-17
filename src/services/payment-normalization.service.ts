import { Payment } from '../models';
import logger from '../utils/logger';
import { WalletService } from './wallet.service';

export interface NormalizedPayment {
    transactionReference: string;
    amount: number;
    phoneNumber: string;
    paymentChannel: 'MPESA_PAYBILL' | 'MPESA_TILL' | 'MPESA_POCHI' | 'BANK_TRANSFER';
    paymentMethod: string;
    rawPayload: any;
    tenantId: string;
    externalId?: string;
}

export class PaymentNormalizationService {
    /**
     * Normalize M-Pesa STK Push result
     */
    static normalizeStkPush(payload: any, tenantId: string): NormalizedPayment {
        const body = payload.Body.stkCallback;
        const meta = body.CallbackMetadata?.Item || [];

        const getVal = (name: string) => meta.find((i: any) => i.Name === name)?.Value;

        return {
            transactionReference: getVal('MpesaReceiptNumber'),
            amount: getVal('Amount'),
            phoneNumber: getVal('PhoneNumber'),
            paymentChannel: 'MPESA_PAYBILL', // Standard STK push usually flows to Paybill
            paymentMethod: 'STK_PUSH',
            rawPayload: payload,
            tenantId: tenantId,
            externalId: body.CheckoutRequestID
        };
    }

    /**
     * Normalize M-Pesa C2B (Paybill/Till) callback
     */
    static normalizeC2B(payload: any, tenantId: string, channel: 'MPESA_PAYBILL' | 'MPESA_TILL'): NormalizedPayment {
        return {
            transactionReference: payload.TransID,
            amount: parseFloat(payload.TransAmount),
            phoneNumber: payload.MSISDN,
            paymentChannel: channel,
            paymentMethod: 'C2B',
            rawPayload: payload,
            tenantId: tenantId,
            externalId: payload.BillRefNumber
        };
    }

    /**
     * Normalize Bank Transfer (Generic)
     */
    static normalizeBankTransfer(payload: any, tenantId: string): NormalizedPayment {
        return {
            transactionReference: payload.reference,
            amount: payload.amount,
            phoneNumber: payload.senderPhone || '',
            paymentChannel: 'BANK_TRANSFER',
            paymentMethod: 'EFT_RTGS',
            rawPayload: payload,
            tenantId: tenantId
        };
    }

    /**
     * Process normalized payment into the system
     */
    static async processPayment(normalized: NormalizedPayment) {
        try {
            // Find or update payment record
            let payment = await Payment.findOne({
                where: {
                    [normalized.externalId ? 'checkoutRequestId' : 'mpesaReceiptNumber']:
                        normalized.externalId || normalized.transactionReference
                }
            });

            if (!payment) {
                // If STK push was initiated elsewhere or it's a direct C2B/Bank transfer
                payment = await Payment.create({
                    mpesaReceiptNumber: normalized.transactionReference,
                    amount: normalized.amount,
                    phoneNumber: normalized.phoneNumber,
                    status: 'PENDING',
                    tenantId: normalized.tenantId,
                    paymentChannel: normalized.paymentChannel,
                    paymentMethod: normalized.paymentMethod,
                    rawCallback: JSON.stringify(normalized.rawPayload),
                    packageId: 0, // Needs to be resolved or handled as generic credit
                });
            }

            if (payment.status === 'SUCCESS') {
                logger.info('Payment already processed', { ref: normalized.transactionReference });
                return payment;
            }

            // Update payment to SUCCESS
            await payment.update({
                status: 'SUCCESS',
                mpesaReceiptNumber: normalized.transactionReference,
                completedAt: new Date(),
                rawCallback: JSON.stringify(normalized.rawPayload)
            });

            // Credit the wallet
            await WalletService.processPayment(payment);

            return payment;
        } catch (error: any) {
            logger.error('Failed to process normalized payment', { error: error.message, ref: normalized.transactionReference });
            throw error;
        }
    }
}
