import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AdminUser, Tenant, AdminSession, AuditLog, PasswordResetToken } from '../models';
import { TenantBootstrapService } from '../services/tenant-bootstrap.service';
import { sendPasswordResetEmail } from '../services/emailService';
import { TenantResolver } from '../middleware/tenant-resolver';

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

        // 3. Bootstrap tenant with essential data
        await TenantBootstrapService.bootstrapNewTenant(tenant.id, user.id);

        // Create session
        const token = jwt.sign(
            { id: user.id, role: user.role, tenantId: user.tenantId },
            process.env.JWT_SECRET || 'secret_key',
            { expiresIn: '1d' }
        );

        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiryTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 1 day

        await AdminSession.create({
            userId: user.id,
            tokenHash,
            ipAddress: req.ip || 'unknown',
            userAgent: req.get('User-Agent') || '',
            expiryTime
        });

        // Log successful registration
        await AuditLog.create({
            action: 'REGISTRATION',
            details: `User ${user.email} registered successfully`,
            userId: user.id,
            tenantId: user.tenantId,
            ipAddress: req.ip
        });

        res.status(201).json({
            message: 'Tenant registered successfully',
            tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
            user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, themePreference: user.themePreference }
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

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, themePreference: user.themePreference } });
    } catch (error: any) {
        res.status(500).json({ error: error.message });
    }
});

// Separate Super Admin login with additional security
router.post('/superadmin/login', async (req, res) => {
    const { email, password, ip } = req.body;
    try {
        console.log(`[SuperAdmin Login] Attempt for email: ${email}`);

        // IP allow-listing for Super Admin
        const allowedIPs = process.env.SUPER_ADMIN_IPS?.split(',') || [];
        if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip || ip)) {
            console.warn(`[SuperAdmin Login] IP Blocked: ${req.ip}`);
            await AuditLog.create({
                action: 'SUPER_ADMIN_IP_BLOCK',
                details: `Super admin login blocked from IP: ${req.ip}`,
                ipAddress: req.ip
            });
            return res.status(403).json({ error: 'Access denied from this location' });
        }

        // --- PRODUCTION HARDENING: .env Source of Truth ---
        const envEmail = process.env.SUPER_ADMIN_EMAIL;
        const envPass = process.env.SUPER_ADMIN_PASSWORD;

        if (!envEmail || !envPass) {
            console.error('[SuperAdmin Login] CRITICAL: Super Admin credentials missing in .env');
            return res.status(500).json({ error: 'System configuration error' });
        }

        // 1. Validate against Environment Variables (Master Record)
        if (email !== envEmail) {
            console.warn(`[SuperAdmin Login] Email mismatch with .env`);
            return res.status(401).json({ error: 'Invalid super admin credentials' });
        }

        // 2. Validate Password (Case-sensitive comparison against .env first)
        if (password !== envPass) {
            console.warn(`[SuperAdmin Login] Password verification failed against .env`);
            await AuditLog.create({
                action: 'FAILED_SUPER_ADMIN_LOGIN',
                details: `Failed super admin login attempt for email: ${email} (Password Mismatch)`,
                ipAddress: req.ip
            });
            return res.status(401).json({ error: 'Invalid super admin credentials' });
        }

        // 3. User is valid! Now Auto-Heal / Sync DB to ensure session validity
        console.log('[SuperAdmin Login] Credentials valid. Synchronizing database record...');

        let user = await AdminUser.findOne({ where: { email, role: 'SUPER_ADMIN' } });
        const hashedPassword = await bcrypt.hash(envPass, 12);

        if (!user) {
            // Emergency Create
            console.log('[SuperAdmin Login] Creating missing Super Admin user in DB');
            user = await AdminUser.create({
                email,
                password: hashedPassword,
                role: 'SUPER_ADMIN',
                tenantId: null,
                commissionRate: 0,
                themePreference: 'light'
            }) as any;
        } else {
            // Update hash if mismatched (Rotation support)
            const dbMatch = await bcrypt.compare(envPass, user.password);
            if (!dbMatch) {
                console.log('[SuperAdmin Login] Updating deprecated DB password hash');
                await user.update({ password: hashedPassword });
            }
        }

        // 4. Session & Token Issuance
        console.log('[SuperAdmin Login] Step 4.1: Validating user object...');
        if (!user) throw new Error('User creation failed unexpectedly');
        console.log('[SuperAdmin Login] Step 4.2: User validated, ID:', user.id);

        console.log('[SuperAdmin Login] Step 4.3: Revoking old sessions...');
        await AdminSession.update(
            { status: 'REVOKED' },
            { where: { userId: user.id, status: 'ACTIVE' } }
        );
        console.log('[SuperAdmin Login] Step 4.4: Old sessions revoked');

        // USE THE SPECIFIC SUPER ADMIN SECRET
        const secret = process.env.SUPER_ADMIN_JWT_SECRET;
        if (!secret) {
            console.error('[SuperAdmin Login] CRITICAL: SUPER_ADMIN_JWT_SECRET is missing!');
            return res.status(500).json({ error: 'System configuration error' });
        }

        const token = jwt.sign(
            { id: user.id, role: user.role, scope: 'SUPER_ADMIN', tenantId: null },
            secret,
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

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, themePreference: user.themePreference } });

    } catch (error: any) {
        console.error('[SuperAdmin Login] System Error:', error);
        console.error('[SuperAdmin Login] Error Stack:', error.stack);
        console.error('[SuperAdmin Login] Error Message:', error.message);
        res.status(500).json({ error: 'Authentication system error', details: error.message });
    }
});

router.get('/verify', async (req: any, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_12345') as any;
        } catch {
            decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'super_secret_platform_key_999') as any;
        }

        const user = await AdminUser.findByPk(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        res.json({ user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId, themePreference: user.themePreference } });
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

router.post('/theme', async (req: any, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Missing token' });
    }

    const token = authHeader.split(' ')[1];
    try {
        let decoded: any;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET || 'dev_secret_key_12345') as any;
        } catch {
            decoded = jwt.verify(token, process.env.SUPER_ADMIN_JWT_SECRET || process.env.JWT_SECRET || 'super_secret_platform_key_999') as any;
        }

        const { theme } = req.body;
        if (!['light', 'dark', 'system'].includes(theme)) {
            return res.status(400).json({ error: 'Invalid theme' });
        }

        const user = await AdminUser.findByPk(decoded.id);
        if (!user) return res.status(401).json({ error: 'User not found' });

        await user.update({ themePreference: theme });
        res.json({ success: true, theme: user.themePreference });
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
