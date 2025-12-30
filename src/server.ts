import express from 'express';
import bodyParser from 'body-parser';
import { sequelize, Package, Payment, Session } from './models';
import { MpesaService } from './services/mpesa.service';
import { SessionOrchestrator } from './orchestrator';

const app = express();
app.use(bodyParser.json());
app.use(express.static('public'));

// --- USER ENDPOINTS ---

// 1. Get Packages
app.get('/api/packages', async (req, res) => {
    const packages = await Package.findAll({ where: { isEnabled: true } });
    res.json(packages);
});

// 2. Initiate Payment (Frictionless Flow)
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

// 3. Payment Status Polling (Frictionless)
app.get('/api/payment-status/:id', async (req, res) => {
    const payment = await Payment.findByPk(req.params.id);
    if (!payment) return res.status(404).send('Payment not found');
    res.json({ status: payment.get('status') });
});

// 4. M-Pesa Webhook
app.post('/api/webhooks/mpesa', async (req, res) => {
    const { Body } = req.body;
    const result = Body.stkCallback;

    if (result.ResultCode === 0) {
        const metadata = result.CallbackMetadata.Item;
        const receipt = metadata.find((i: any) => i.Name === 'MpesaReceiptNumber').Value;
        const phone = metadata.find((i: any) => i.Name === 'PhoneNumber').Value;

        const payment = await Payment.findOne({
            where: { status: 'PENDING', phoneNumber: phone.toString() },
            include: [Package],
            order: [['createdAt', 'DESC']]
        });

        if (payment) {
            const pkg = (payment as any).package;
            const paidAmount = metadata.find((i: any) => i.Name === 'Amount').Value;

            // STRICT: Match payment amount to package price exactly
            if (Number(paidAmount) !== pkg.price) {
                console.error(`Payment mismatch: Expected ${pkg.price}, got ${paidAmount}`);
                payment.set('status', 'FAILED');
                await payment.save();
                return res.status(200).send('OK');
            }

            payment.set('status', 'SUCCESS');
            payment.set('mpesaReceiptNumber', receipt);
            await payment.save();

            // Grant Access with MAC-based Transparent Login
            await SessionOrchestrator.grantAccess(
                payment.id,
                payment.get('macAddress') as string,
                payment.get('ipAddress') as string
            );
        }
    }

    res.status(200).send('OK');
});

// --- ADMIN ENDPOINTS ---

// 1. Get All Packages
app.get('/api/admin/packages', async (req, res) => {
    const packages = await Package.findAll();
    res.json(packages);
});

// 2. Update Package (Price Change, etc.)
app.put('/api/admin/packages/:id', async (req, res) => {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).send('Package not found');
    await pkg.update(req.body);
    res.json(pkg);
});

// 3. Create Package
app.post('/api/admin/packages', async (req, res) => {
    const pkg = await Package.create(req.body);
    res.json(pkg);
});

// 4. Delete Package
app.delete('/api/admin/packages/:id', async (req, res) => {
    await Package.destroy({ where: { id: req.params.id } });
    res.sendStatus(204);
});

// 5. Admin - Revenue Report
app.get('/api/admin/revenue', async (req, res) => {
    const revenue = await Payment.findAll({
        attributes: [
            [sequelize.col('package.name'), 'packageName'],
            [sequelize.fn('COUNT', sequelize.col('payment.id')), 'count'],
            [sequelize.fn('SUM', sequelize.col('payment.amount')), 'totalRevenue']
        ],
        include: [{ model: Package, attributes: [] }],
        where: { status: 'SUCCESS' },
        group: ['package.name'],
        raw: true
    });
    res.json(revenue);
});

// 6. Admin - Active Sessions
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
            { name: '1 Hour', price: 10, durationMinutes: 60, isEnabled: true },
            { name: '8 Hours', price: 50, durationMinutes: 480, isEnabled: true },
            { name: '16 Hours', price: 80, durationMinutes: 960, isEnabled: true },
            { name: '24 Hours', price: 100, durationMinutes: 1440, isEnabled: true },
            { name: '1 Week', price: 200, durationMinutes: 10080, isEnabled: true },
            { name: '1 Month', price: 600, durationMinutes: 43200, isEnabled: true }
        ]);
        console.log('Database seeded with required pricing packages.');
    }
    app.listen(PORT, () => console.log(`Hotspot server running on port ${PORT}`));
});
