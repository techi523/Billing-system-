import jwt from 'jsonwebtoken';
import axios from 'axios';
import { AdminUser, sequelize } from '../src/models';

async function verify() {
    try {
        const user = await AdminUser.findOne({ where: { role: 'SUPER_ADMIN' } });
        if (!user) throw new Error('No super admin found for testing');

        console.log(`Testing with user: ${user.email} (TenantID: ${user.tenantId || 'NULL'})`);

        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId: user.tenantId },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '1h' }
        );

        const { AdminSession } = require('../src/models');
        const crypto = require('crypto');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

        // Create a temporary session
        await AdminSession.create({
            userId: user.id,
            tokenHash,
            status: 'ACTIVE',
            expiryTime: new Date(Date.now() + 3600000),
            ipAddress: '127.0.0.1',
            userAgent: 'test-script'
        });

        const baseUrl = 'http://localhost:3010/api/v1';

        console.log('--- Testing /admin/dashboard-summary ---');
        try {
            const res = await axios.get(`${baseUrl}/admin/dashboard-summary`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('SUCCESS:', res.data.tenantName);
        } catch (e: any) {
            console.error('FAILED /admin/dashboard-summary:', e.response?.status, e.response?.data);
        }

        console.log('--- Testing /wallet/balance ---');
        try {
            const res = await axios.get(`${baseUrl}/wallet/balance`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('SUCCESS: Balance:', res.data.balance);
        } catch (e: any) {
            console.error('FAILED /wallet/balance:', e.response?.status, e.response?.data);
        }

    } catch (e) {
        console.error('Verification failed:', e);
    } finally {
        await sequelize.close();
    }
}

verify();
