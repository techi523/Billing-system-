import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export class MpesaService {
    private static consumerKey = process.env.MPESA_CONSUMER_KEY;
    private static consumerSecret = process.env.MPESA_CONSUMER_SECRET;
    private static shortcode = process.env.MPESA_SHORTCODE;
    private static passkey = process.env.MPESA_PASSKEY;
    private static callbackUrl = process.env.MPESA_CALLBACK_URL;

    private static async getAccessToken() {
        const auth = Buffer.from(`${this.consumerKey}:${this.consumerSecret}`).toString('base64');
        const response = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
            headers: { Authorization: `Basic ${auth}` },
        });
        return response.data.access_token;
    }

    static async initiateStkPush(phoneNumber: string, amount: number, accountReference: string) {
        const accessToken = await this.getAccessToken();
        const timestamp = new Date().toISOString().replace(/[-:T.Z]/g, '').slice(0, 14);
        const password = Buffer.from(`${this.shortcode}${this.passkey}${timestamp}`).toString('base64');

        // For Pochi La Biashara, we often use TransactionType 'CustomerBuyGoodsOnline'
        // and the BusinessShortCode is the recipient number.
        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            {
                BusinessShortCode: this.shortcode, // In production, this is your BuyGoods Till or MSISDN
                Password: password,
                Timestamp: timestamp,
                TransactionType: 'CustomerBuyGoodsOnline', // Changed for Pochi/BuyGoods
                Amount: amount,
                PartyA: phoneNumber,
                PartyB: this.shortcode,
                PhoneNumber: phoneNumber,
                CallBackURL: this.callbackUrl,
                AccountReference: accountReference,
                TransactionDesc: 'Hotspot Internet Access',
            },
            {
                headers: { Authorization: `Bearer ${accessToken}` },
            }
        );

        return response.data;
    }
}
