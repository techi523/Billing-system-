import axios from 'axios';
import logger from '../utils/logger';
import { Tenant, Payment } from '../models';

export interface AggregatorStkRequest {
    phoneNumber: string;
    amount: number;
    tenantId: string;
    callbackUrl: string;
    accountReference: string;
    transactionDesc: string;
}

export interface AggregatorResponse {
    success: boolean;
    transactionId?: string;
    checkoutRequestId?: string;
    message: string;
}

export class AggregatorService {
    private static API_BASE_URL = process.env.AGGREGATOR_API_URL || 'https://api.aggregator.com/v1';
    private static API_KEY = process.env.AGGREGATOR_API_KEY || 'sk_test_surfbill_key';

    /**
     * Initiate STK Push via Aggregator
     * Directed to the single SurfBill Paybill
     */
    static async initiateStkPush(request: AggregatorStkRequest): Promise<AggregatorResponse> {
        try {
            const tenant = await Tenant.findByPk(request.tenantId);
            if (!tenant) throw new Error('Tenant not found');

            logger.info('Initiating aggregator STK push', {
                tenant: tenant.name,
                phone: request.phoneNumber,
                amount: request.amount
            });

            // MOCK: In a real implementation, this would be a POST request to Cellulant/Flutterwave/etc.
            // const response = await axios.post(`${this.API_BASE_URL}/stk/push`, {
            //     ...request,
            //     subAccountId: tenant.aggregatorSubAccountId,
            //     split: {
            //         type: 'PERCENTAGE',
            //         commission: tenant.commissionPercentage
            //     }
            // }, {
            //     headers: { 'Authorization': `Bearer ${this.API_KEY}` }
            // });

            // Simulating successful initiation
            return {
                success: true,
                checkoutRequestId: `AGGR-${Math.random().toString(36).substring(7).toUpperCase()}`,
                message: 'STK Push initiated successfully'
            };
        } catch (error: any) {
            logger.error('Aggregator STK Push failed', { error: error.message });
            return {
                success: false,
                message: error.message
            };
        }
    }

    /**
     * Register a tenant as a sub-account on the aggregator platform
     */
    static async registerSubAccount(tenant: Tenant): Promise<string> {
        try {
            logger.info('Registering tenant sub-account', { tenant: tenant.name });

            // MOCK: External API call to create a virtual wallet/sub-account
            const subAccountId = `V-WAL-${tenant.id.substring(0, 8).toUpperCase()}`;

            await tenant.update({ aggregatorSubAccountId: subAccountId });

            return subAccountId;
        } catch (error: any) {
            logger.error('Failed to register sub-account', { error: error.message });
            throw error;
        }
    }

    /**
     * Reconcile/Verify transaction status
     */
    static async verifyTransaction(checkoutRequestId: string): Promise<any> {
        try {
            // External check to aggregator
            return { status: 'SUCCESS', amount: 0, reference: '...' };
        } catch (error) {
            return { status: 'PENDING' };
        }
    }
}
