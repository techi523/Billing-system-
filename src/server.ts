import express from 'express';
import bodyParser from 'body-parser';
import { sequelize, Package, Payment, Session } from './models';
import { MpesaService } from './services/mpesa.service';
import { SessionOrchestrator } from './orchestrator';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// 1. Get Packages
app.get('/api/packages', async (req, res) => {
    const packages = await Package.findAll();
    res.json(packages);
});

// 2. Initiate Payment (Updated for Pochi & Device Binding)
app.post('/api/pay', async (req, res) => {
    const { phone, packageId, mac, ip } = req.body;
    const pkg = await Package.findByPk(packageId);
    if (!pkg) return res.status(404).send('Package not found');

    const payment = await Payment.create({
        phoneNumber: phone,
        amount: pkg.get('price') as number,
        packageId: pkg.get('id') as number,
        status: 'PENDING',
        macAddress: mac,
        ipAddress: ip
    });

    try {
        const stkResponse = await MpesaService.initiateStkPush(phone, pkg.get('price') as number, `HSP-${payment.id.slice(0, 8)}`);
        res.json({ checkoutId: stkResponse.CheckoutRequestID, paymentId: payment.id });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// 3. M-Pesa Webhook (Updated for Pochi & Device Binding)
app.post('/api/webhooks/mpesa', async (req, res) => {
    const { Body } = req.body;
    const result = Body.stkCallback;

    if (result.ResultCode === 0) {
        const metadata = result.CallbackMetadata.Item;
        const receipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
        const phone = metadata.find((i: any) => i.Name === 'PhoneNumber').Value;

        // Reliability: Find the actual payment record
        const payment = await Payment.findOne({
            where: { status: 'PENDING', phoneNumber: phone.toString() },
            order: [['createdAt', 'DESC']]
        });

        if (payment) {
            payment.set('status', 'SUCCESS');
            payment.set('mpesaReceiptNumber', receipt);
            await payment.save();

            // Grant Access with Mandatory Device Binding
            await SessionOrchestrator.grantAccess(
                payment.id,
                payment.get('macAddress') as string,
                payment.get('ipAddress') as string
            );
        }
    }

    res.status(200).send('OK');
});

// 4. Admin - Active Sessions
app.get('/api/admin/sessions', async (req, res) => {
    const sessions = await Session.findAll({ where: { status: 'ACTIVE' } });
    res.json(sessions);
});

const PORT = process.env.PORT || 3000;
sequelize.sync().then(async () => {
    // Auto-seed packages if empty
    const count = await Package.count();
    if (count === 0) {
        await Package.bulkCreate([
            { name: '30 Minutes', price: 20, durationMinutes: 30, speedLimit: '2M/2M' },
            { name: '1 Hour', price: 35, durationMinutes: 60, speedLimit: '3M/3M' },
            { name: '1 GB Data', price: 50, dataLimitBytes: 1073741824, speedLimit: '10M/10M' }
        ]);
        console.log('Database seeded with initial packages.');
    }
    app.listen(PORT, () => console.log(`Hotspot server running on port ${PORT}`));
});
