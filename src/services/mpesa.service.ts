import axios from 'axios';
import dotenv from 'dotenv';
import logger from '../utils/logger';

dotenv.config();

interface CachedToken {
    token: string;
    expiry: number;
}

export class MpesaService {
    private static tokenCache: CachedToken | null = null;

    private static getBaseUrl() {
        return process.env.MPESA_ENV === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    private static getCredentials() {
        return {
            consumerKey: process.env.MPESA_CONSUMER_KEY,
            consumerSecret: process.env.MPESA_CONSUMER_SECRET,
            shortcode: process.env.MPESA_SHORTCODE,
            passkey: process.env.MPESA_PASSKEY,
        };
    }

    private static async getAccessToken() {
        // reuse token until expiry
        if (this.tokenCache && this.tokenCache.expiry > Date.now()) {
            return this.tokenCache.token;
        }

        const { consumerKey, consumerSecret } = this.getCredentials();
        if (!consumerKey || !consumerSecret) throw new Error('M-Pesa Consumer Key/Secret missing');

        const auth = Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64');
        const response = await axios.get(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` },
        });

        const expiresIn = response.data.expires_in; // usually 3600
        this.tokenCache = {
            token: response.data.access_token,
            expiry: Date.now() + (expiresIn - 60) * 1000, // buffer of 1 min
        };

        return response.data.access_token;
    }

    /**
     * AccountReference format: TENANTID|USERID|PACKAGEID
     */
    static async initiateStkPush(phoneNumber: string, amount: number, tenantId: string, userId: string, packageId: string) {
        try {
            const accessToken = await this.getAccessToken();
            const { shortcode, passkey } = this.getCredentials();
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

            // Format AccountReference: TENANTID|USERID|PACKAGEID
            const accountReference = `${tenantId}|${userId}|${packageId}`;
            const callbackUrl = `${process.env.MPESA_CALLBACK_BASE_URL}/api/v1/webhooks/mpesa`;

            const payload = {
                BusinessShortCode: shortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerBuyGoodsOnline', // Or CustomerPayBillOnline
                Amount: Math.round(amount),
                PartyA: phoneNumber,
                PartyB: shortcode,
                PhoneNumber: phoneNumber,
                CallBackURL: callbackUrl,
                AccountReference: accountReference,
                TransactionDesc: `SaaS Wi-Fi Payment`,
            };

            const response = await axios.post(
                `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
                payload,
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            logger.info('STK Push Initiated', { phoneNumber, amount, checkoutId: response.data.CheckoutRequestID });
            return response.data;
        } catch (error: any) {
            logger.error('STK Push Failed', { error: error.response?.data || error.message });
            throw error;
        }
    }

    /**
     * Fallback verification via Transaction Status API
     */
    static async checkTransactionStatus(checkoutRequestID: string) {
        try {
            const accessToken = await this.getAccessToken();
            const { shortcode, passkey } = this.getCredentials();
            const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
            const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

            const response = await axios.post(
                `${this.getBaseUrl()}/mpesa/stkpushquery/v1/query`,
                {
                    BusinessShortCode: shortcode,
                    Password: password,
                    Timestamp: timestamp,
                    CheckoutRequestID: checkoutRequestID
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );

            return response.data;
        } catch (error: any) {
            logger.error('STK Query Failed', { error: error.response?.data || error.message });
            return null;
        }
    }
}
