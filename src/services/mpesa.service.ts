import axios from 'axios';
import { Tenant } from '../models';
import dotenv from 'dotenv';

dotenv.config();

export class MpesaService {
    private static getBaseUrl() {
        return process.env.MPESA_ENVIRONMENT === 'production'
            ? 'https://api.safaricom.co.ke'
            : 'https://sandbox.safaricom.co.ke';
    }

    private static async getAccessToken(tenant: Tenant) {
        const auth = Buffer.from(`${tenant.mpesaConsumerKey}:${tenant.mpesaConsumerSecret}`).toString('base64');
        const response = await axios.get(`${this.getBaseUrl()}/oauth/v1/generate?grant_type=client_credentials`, {
            headers: { Authorization: `Basic ${auth}` },
        });
        return response.data.access_token;
    }

    static async initiateStkPush(tenant: Tenant, phoneNumber: string, amount: number, accountReference: string) {
        const accessToken = await this.getAccessToken(tenant);
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const password = Buffer.from(`${tenant.mpesaShortcode}${tenant.mpesaPasskey}${timestamp}`).toString('base64');
        const callbackUrl = `${process.env.MPESA_CALLBACK_BASE_URL || 'https://your-domain.com'}/api/v1/webhooks/mpesa?tenantId=${tenant.id}`;

        const response = await axios.post(
            `${this.getBaseUrl()}/mpesa/stkpush/v1/processrequest`,
            {
                BusinessShortCode: tenant.mpesaShortcode,
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerBuyGoodsOnline',
                Amount: amount,
                PartyA: phoneNumber,
                PartyB: tenant.mpesaShortcode,
                PhoneNumber: phoneNumber,
                CallBackURL: callbackUrl,
                AccountReference: accountReference,
                TransactionDesc: `Internet Access - ${tenant.name}`,
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        return response.data;
    }
}
