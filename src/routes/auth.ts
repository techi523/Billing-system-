import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AdminUser, Tenant, AdminSession, AuditLog, PasswordResetToken } from '../models';
import { sendPasswordResetEmail } from '../services/emailService';

const router = Router();

router.post('/register', async (req, res) => {
    const { email, password, tenantName, subdomain } = req.body;
    try {
        // 0. Pre-validation
        const existingUser = await AdminUser.findOne({ where: { email } });
        if (existingUser) return res.status(400).json({ error: 'Email already registered' });

        const existingTenant = await Tenant.findOne({ where: { subdomain } });
        if (existingTenant) return res.status(400).json({ error: 'Subdomain already in use' });

        const hashedPassword = await bcrypt.hash(password, 12); // Production-grade entropy

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
            role: 'TENANT',
            tenantId: tenant.id
        });

        res.status(201).json({
            message: 'Tenant registered successfully',
            tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
            user: { id: user.id, email: user.email }
        });
    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: `Registration failed: ${error.message}` });
    }
});

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await AdminUser.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            // Log failed login attempt
            await AuditLog.create({
                action: 'FAILED_LOGIN',
                details: `Failed login attempt for email: ${email}`,
                ipAddress: req.ip,
                tenantId: user?.tenantId
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Expire old sessions for this user
        await AdminSession.update(
            { status: 'REVOKED' },
            { where: { userId: user.id, status: 'ACTIVE' } }
        );

        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId: user.tenantId },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '1d' }
        );

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

        // Create session
        await AdminSession.create({
            userId: user.id,
            tokenHash,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            expiryTime
        });

        // Log successful login
        await AuditLog.create({
            action: 'LOGIN',
            details: `User ${user.email} logged in`,
            userId: user.id,
            tenantId: user.tenantId,
            ipAddress: req.ip
        });

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Separate Super Admin login with additional security
router.post('/superadmin/login', async (req, res) => {
    const { email, password, ip } = req.body;
    try {
        // IP allow-listing for Super Admin
        const allowedIPs = process.env.SUPER_ADMIN_IPS?.split(',') || [];
        if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip || ip)) {
            await AuditLog.create({
                action: 'SUPER_ADMIN_IP_BLOCK',
                details: `Super admin login blocked from IP: ${req.ip}`,
                ipAddress: req.ip
            });
            return res.status(403).json({ error: 'Access denied from this location' });
        }

        const user = await AdminUser.findOne({ where: { email, role: 'SUPER_ADMIN' } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            await AuditLog.create({
                action: 'FAILED_SUPER_ADMIN_LOGIN',
                details: `Failed super admin login attempt for email: ${email}`,
                ipAddress: req.ip
            });
            return res.status(401).json({ error: 'Invalid super admin credentials' });
        }

        // Expire old sessions for this user
        await AdminSession.update(
            { status: 'REVOKED' },
            { where: { userId: user.id, status: 'ACTIVE' } }
        );

        const token = jwt.sign(
            { id: user.id, role: user.role, scope: 'SUPER_ADMIN', tenantId: null },
            process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'super_secret_key',
            { expiresIn: '2h' } // Shorter expiry for super admin
        );

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiryTime = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours

        // Create session
        await AdminSession.create({
            userId: user.id,
            tokenHash,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            expiryTime
        });

        // Log successful super admin login
        await AuditLog.create({
            action: 'SUPER_ADMIN_LOGIN',
            details: `Super admin ${user.email} logged in`,
            userId: user.id,
            ipAddress: req.ip
        });

        res.json({ token, user: { id: user.id, email: user.email, role: user.role } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

router.get('/verify', async (req: any, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret_key') as any;
        const user = await AdminUser.findByPk(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        res.json({ user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Password reset request endpoint
router.post('/password-reset/request', async (req, res) => {
    const { email } = req.body;
    const user = await AdminUser.findOne({ where: { email } });
    // Always respond with success to avoid email enumeration
    if (user) {
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
        await PasswordResetToken.create({ userId: user.id, token, expiresAt, used: false });
        await sendPasswordResetEmail(email, token);
    }
    res.json({ message: 'If the email exists, a password reset link has been sent.' });
});

// Password reset confirmation endpoint
router.post('/password-reset/confirm', async (req, res) => {
    const { token, newPassword } = req.body;
    const resetRecord = await PasswordResetToken.findOne({ where: { token, used: false } });
    if (!resetRecord || resetRecord.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Invalid or expired token' });
    }
    const user = await AdminUser.findByPk(resetRecord.userId);
    if (!user) {
        return res.status(400).json({ error: 'User not found' });
    }
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await user.update({ password: hashedPassword });
    await resetRecord.update({ used: true });
    res.json({ message: 'Password has been reset successfully' });
});

export default router;
