import { Router } from 'express';
import { Payment, Package, Tenant } from '../models';
import { SessionOrchestrator } from '../orchestrator';

const router = Router();

router.post('/mpesa', async (req, res) => {
    const { Body } = req.body;
    const { tenantId } = req.query;

    if (!tenantId) {
        console.error('Webhook received without tenantId');
        return res.status(400).send('No tenantId');
    }

    const result = Body.stkCallback;

    if (result.ResultCode === 0) {
        const metadata = result.CallbackMetadata.Item;
        const receipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
        const phone = metadata.find((i: any) => i.Name === 'PhoneNumber').Value;
        const amountPaid = metadata.find((i: any) => i.Name === 'Amount').Value;

        // Find the pending payment for this phone number and tenant
        const payment = await Payment.findOne({
            where: {
                status: 'PENDING',
                phoneNumber: phone.toString(),
                tenantId: tenantId as string
            },
            include: [Package],
            order: [['createdAt', 'DESC']]
        });

        if (payment) {
            const pkg = (payment as any).package;

            if (Number(amountPaid) !== pkg.price) {
                console.error(`Payment mismatch: Expected ${pkg.price}, got ${amountPaid}`);
                payment.set('status', 'FAILED');
                await payment.save();
                return res.status(200).send('OK');
            }

            payment.set('status', 'SUCCESS');
            payment.set('mpesaReceiptNumber', receipt);
            await payment.save();

            // Handle based on payment type (ISP vs Hotspot)
            try {
                if (payment.subscriberId) {
                    // ISP MODE RECHARGE
                    const { IspService } = require('../services/isp.service');
                    await IspService.renewSubscriber(payment.subscriberId);
                    console.log(`ISP Subscriber ${payment.subscriberId} renewed for tenant ${tenantId}`);
                } else if (payment.macAddress) {
                    // HOTSPOT MODE
                    await SessionOrchestrator.grantAccess(
                        payment.id,
                        payment.macAddress,
                        payment.ipAddress as string
                    );
                    console.log(`Hotspot Access granted for phone ${phone} on tenant ${tenantId}`);
                }
            } catch (error) {
                console.error('Error processing payment fulfillment:', error);
            }

        }
    }

    res.status(200).send('OK');
});

export default router;
