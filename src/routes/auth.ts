import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { AdminUser, Tenant } from '../models';

const router = Router();

router.post('/register', async (req, res) => {
    const { email, password, tenantName, subdomain } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        
        // 1. Create Tenant
        const tenant = await Tenant.create({
            name: tenantName,
            subdomain: subdomain,
            status: 'ACTIVE'
        });

        // 2. Create Tenant Admin
        const user = await AdminUser.create({
            email,
            password: hashedPassword,
            role: 'TENANT_ADMIN',
            tenantId: tenant.id
        });

        res.status(201).json({ message: 'Tenant registered successfully', tenant, user: { id: user.id, email: user.email } });
    } catch (error: any) {
        res.status(400).json({ error: error.message });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await AdminUser.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId: user.tenantId },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '1d' }
        );

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
