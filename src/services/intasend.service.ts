import axios from 'axios';
import crypto from 'crypto';
import logger from '../utils/logger';
import { Payment, Tenant } from '../models';

export class IntaSendService {
    private static getBaseUrl() {
        return process.env.INTASEND_ENV === 'production'
            ? 'https://payment.intasend.com'
            : 'https://sandbox.intasend.com';
    }

    private static getSecretKey() {
        return process.env.INTASEND_SECRET_KEY;
    }

    /**
     * Initiate M-Pesa STK Push via IntaSend
     */
    static async initiateStkPush(params: {
        paymentId: string;
        amount: bigint; // Amount in cents
        phoneNumber: string;
        firstName?: string;
        lastName?: string;
        email?: string;
    }) {
        if (process.env.INTASEND_MOCK === 'true') {
            logger.warn('IntaSend running in MOCK mode. Returning success simulation.');
            return {
                id: `MOCK-CH-ID-${params.paymentId}`,
                tracking_id: `MOCK-TR-ID-${params.paymentId}`,
                state: 'PENDING'
            };
        }

        try {
            const secretKey = this.getSecretKey();
            if (!secretKey) throw new Error('IntaSend Secret Key missing');

            // IntaSend expects amount in base currency (e.g. KES)
            const amountInBase = Number(params.amount) / 100;

            const payload = {
                phone_number: params.phoneNumber,
                amount: amountInBase,
                api_ref: params.paymentId,
                first_name: params.firstName || 'Customer',
                last_name: params.lastName || 'Guest',
                email: params.email || 'customer@example.com',
                method: 'MPESA_STK_PUSH'
            };

            const response = await axios.post(
                `${this.getBaseUrl()}/api/v1/payment/mpesa-stk-push/`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            logger.info('IntaSend STK Push Initiated', {
                paymentId: params.paymentId,
                trackingId: response.data.tracking_id
            });

            return response.data;
        } catch (error: any) {
            logger.error('IntaSend STK Push Failed', {
                error: error.response?.data || error.message,
                paymentId: params.paymentId
            });
            throw error;
        }
    }

    /**
     * Check transaction status via IntaSend API
     */
    static async checkStatus(trackingId: string) {
        if (process.env.INTASEND_MOCK === 'true') {
            return {
                invoice_id: `MOCK-INV-${trackingId}`,
                state: 'COMPLETE',
                tracking_id: trackingId,
                api_ref: trackingId.split('-').pop() // Assuming mock tracking ID contains payment ID
            };
        }

        try {
            const secretKey = this.getSecretKey();
            if (!secretKey) throw new Error('IntaSend Secret Key missing');

            const response = await axios.post(
                `${this.getBaseUrl()}/api/v1/payment/status/`,
                { tracking_id: trackingId },
                {
                    headers: {
                        'Authorization': `Bearer ${secretKey}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            return response.data;
        } catch (error: any) {
            logger.error('IntaSend Status Check Failed', {
                error: error.response?.data || error.message,
                trackingId
            });
            return null;
        }
    }

    /**
     * Verify IntaSend Webhook Signature
     */
    static verifySignature(payload: string, signature: string, token: string): boolean {
        // IntaSend uses HMAC SHA256 of the token + message (or just message depending on version)
        // Standard payload verification often involves the secret token or key.
        // For simplicity and security, we'll use a configurable webhook token.
        const computedSignature = crypto
            .createHmac('sha256', token)
            .update(payload)
            .digest('hex');

        return computedSignature === signature;
    }
}
