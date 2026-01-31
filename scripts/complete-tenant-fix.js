const { AdminUser, Tenant, AuditLog, sequelize } = require('../../models');
const logger = require('../../utils/logger');

async function completeTenantFix() {
    try {
        console.log('Starting comprehensive tenant fix...');

        // Step 1: Fix database schema to make tenantId non-nullable for non-super admin users
        console.log('Step 1: Updating database schema...');
        await sequelize.query(`
            ALTER TABLE admin_users 
            MODIFY COLUMN tenant_id VARCHAR(36) NOT NULL DEFAULT NULL;
        `);

        // Add constraint to prevent non-super admin users from having null tenantId
        await sequelize.query(`
            ALTER TABLE admin_users 
            ADD CONSTRAINT chk_tenant_id 
            CHECK (
                (role = 'SUPER_ADMIN') OR 
                (role != 'SUPER_ADMIN' AND tenant_id IS NOT NULL)
            );
        `);

        console.log('Step 1: Database schema updated successfully');

        // Step 2: Clean up existing bad data
        console.log('Step 2: Cleaning up existing bad data...');
        const usersWithoutTenants = await AdminUser.findAll({
            where: {
                tenantId: null,
                role: { [require('sequelize').Op.ne]: 'SUPER_ADMIN' }
            }
        });

        console.log(`Found ${usersWithoutTenants.length} users without tenants`);

        for (const user of usersWithoutTenants) {
            try {
                // Create a default tenant for this user
                const tenant = await Tenant.create({
                    name: `${user.email}'s Workspace`,
                    subdomain: `${user.email.split('@')[0].toLowerCase()}-workspace`,
                    status: 'ACTIVE'
                });

                // Update user with tenantId
                await user.update({ tenantId: tenant.id });

                // Log the fix
                await AuditLog.create({
                    action: 'TENANT_AUTO_ASSIGNMENT',
                    details: `Auto-assigned tenant to user ${user.email}`,
                    userId: user.id,
                    tenantId: tenant.id
                });

                console.log(`Fixed user: ${user.email} -> Tenant: ${tenant.name}`);
            } catch (error) {
                console.error(`Failed to fix user ${user.email}:`, error.message);
            }
        }

        console.log('Step 2: Existing bad data cleaned up');

        // Step 3: Find orphaned tenants (tenants with no users) and clean them up
        console.log('Step 3: Cleaning up orphaned tenants...');
        const orphanedTenants = await Tenant.findAll({
            include: [{
                model: AdminUser,
                where: { tenantId: sequelize.col('tenant.id') },
                required: false
            }],
            where: sequelize.where(
                sequelize.fn('COUNT', sequelize.col('admin_users.id')),
                '=',
                0
            )
        });

        console.log(`Found ${orphanedTenants.length} orphaned tenants`);

        for (const tenant of orphanedTenants) {
            try {
                await tenant.destroy();
                console.log(`Removed orphaned tenant: ${tenant.name}`);
            } catch (error) {
                console.error(`Failed to remove orphaned tenant ${tenant.name}:`, error.message);
            }
        }

        console.log('Step 3: Orphaned tenants cleaned up');

        // Step 4: Update tenant resolver middleware to be more robust
        console.log('Step 4: Updating tenant resolver middleware...');
        const tenantResolverPath = '../src/middleware/tenant-resolver.ts';
        const tenantResolverContent = `
import { Request, Response, NextFunction } from 'express';
import { AdminUser, Tenant } from '../models';
import { AuditLog } from '../models';

export interface TenantResolverRequest extends Request {
    tenant?: Tenant;
    user?: {
        id: string;
        role: string;
        tenantId?: string;
        scope?: string;
    };
}

export class TenantResolver {
    static async resolveTenant(req: TenantResolverRequest, res: Response, next: NextFunction) {
        try {
            // Check if user is authenticated
            if (!req.user) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            // Super admin bypass
            if (req.user.role === 'SUPER_ADMIN') {
                return next();
            }

            // Check if user has tenantId (should never be null due to DB constraints)
            if (!req.user.tenantId) {
                // This should never happen due to DB constraints, but handle gracefully
                await AuditLog.create({
                    action: 'TENANT_RESOLUTION_FAILURE',
                    details: \`User \${req.user!.id} has no tenant assigned (should be impossible)\`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                return res.status(403).json({
                    error: 'You don\\'t have a workspace yet',
                    action: 'CREATE_WORKSPACE',
                    message: 'Please create a workspace to continue'
                });
            }

            // Fetch tenant
            const tenant = await Tenant.findByPk(req.user.tenantId);

            if (!tenant) {
                // This should never happen due to DB constraints, but handle gracefully
                await AuditLog.create({
                    action: 'TENANT_NOT_FOUND',
                    details: \`Tenant \${req.user!.tenantId} not found for user \${req.user!.id} (should be impossible)\`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                return res.status(403).json({
                    error: 'Your workspace is not available',
                    action: 'CREATE_WORKSPACE',
                    message: 'Please create a workspace to continue'
                });
            }

            // Check tenant status
            if (tenant.status !== 'ACTIVE') {
                await AuditLog.create({
                    action: 'TENANT_SUSPENDED',
                    details: \`Tenant \${tenant.id} is suspended for user \${req.user!.id}\`,
                    userId: req.user!.id,
                    ipAddress: req.ip
                });

                return res.status(403).json({
                    error: 'Your workspace is suspended',
                    action: 'CONTACT_SUPPORT',
                    message: 'Please contact support for assistance'
                });
            }

            // Attach tenant to request
            req.tenant = tenant;
            next();

        } catch (error: any) {
            // Log the error
            await AuditLog.create({
                action: 'TENANT_RESOLUTION_ERROR',
                details: \`Error resolving tenant for user \${req.user!.id}: \${error.message}\`,
                userId: req.user!.id,
                ipAddress: req.ip
            });

            return res.status(500).json({
                error: 'System error resolving workspace',
                message: 'Please try again or contact support'
            });
        }
    }

    static async requireTenant(req: TenantResolverRequest, res: Response, next: NextFunction) {
        if (!req.tenant) {
            return res.status(403).json({
                error: 'Workspace access required',
                action: 'SELECT_WORKSPACE',
                message: 'Please select or create a workspace to continue'
            });
        }
        next();
    }

    static async validateTenantAccess(req: TenantResolverRequest, res: Response, next: NextFunction) {
        if (req.user!.role === 'SUPER_ADMIN') {
            return next();
        }

        if (!req.tenant) {
            return res.status(403).json({
                error: 'Workspace access required',
                action: 'SELECT_WORKSPACE',
                message: 'Please select or create a workspace to continue'
            });
        }

        // Verify user has access to this tenant
        if (req.user!.tenantId !== req.tenant.id) {
            return res.status(403).json({
                error: 'Access denied to this workspace',
                action: 'SELECT_WORKSPACE',
                message: 'You don\\'t have access to this workspace'
            });
        }

        next();
    }
}
        `;

        // Write the updated tenant resolver
        const fs = require('fs');
        fs.writeFileSync(tenantResolverPath, tenantResolverContent);
        console.log('Step 4: Tenant resolver middleware updated');

        // Step 5: Update auth route to handle tenant assignment more robustly
        console.log('Step 5: Updating auth route...');
        const authRoutePath = '../src/routes/auth.ts';
        const authRouteContent = `
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { AdminUser, Tenant, AdminSession, AuditLog, PasswordResetToken } from '../models';
import { TenantBootstrapService } from '../services/tenant-bootstrap.service';
import { sendPasswordResetEmail } from '../services/emailService';
import { TenantResolver } from '../middleware/tenant-resolver';

const router = Router();

// Enhanced registration with better tenant handling
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
            details: \`User \${user.email} registered successfully\`,
            userId: user.id,
            tenantId: user.tenantId,
            ipAddress: req.ip
        });

        res.status(201).json({
            message: 'Tenant registered successfully',
            tenant: { id: tenant.id, name: tenant.name, subdomain: tenant.subdomain },
            user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId }
        });
    } catch (error: any) {
        console.error('Registration Error:', error);
        res.status(500).json({ error: \`Registration failed: \${error.message}\` });
    }
});

// Enhanced login with better tenant handling
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await AdminUser.findOne({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            // Log failed login attempt
            await AuditLog.create({
                action: 'FAILED_LOGIN',
                details: \`Failed login attempt for email: \${email}\`,
                ipAddress: req.ip,
                tenantId: user?.tenantId
            });
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Check if user has tenant (should always be true due to DB constraints)
        if (user.role !== 'SUPER_ADMIN' && !user.tenantId) {
            // This should never happen due to DB constraints, but handle gracefully
            await AuditLog.create({
                action: 'LOGIN_TENANT_MISSING',
                details: \`User \${user.email} has no tenant assigned (should be impossible)\`,
                userId: user.id,
                ipAddress: req.ip
            });

            return res.status(403).json({
                error: 'You don\\'t have a workspace yet',
                action: 'CREATE_WORKSPACE',
                message: 'Please create a workspace to continue'
            });
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
            details: \`User \${user.email} logged in\`,
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
        console.log(\`[SuperAdmin Login] Attempt for email: \${email}\`);
        console.log(\`[DEBUG] Env Email: '\${process.env.SUPER_ADMIN_EMAIL}'\`);
        console.log(\`[DEBUG] Received Email: '\${email}'\`);
        console.log(\`[DEBUG] Env Pass Length: \${process.env.SUPER_ADMIN_PASSWORD?.length}\`);
        console.log(\`[DEBUG] Received Pass Length: \${password?.length}\`);
        console.log(\`[DEBUG] Env Pass: '\${process.env.SUPER_ADMIN_PASSWORD}'\`); // TEMPORARY: Remove after debug
        console.log(\`[DEBUG] Received Pass: '\${password}'\`);     // TEMPORARY: Remove after debug

        // IP allow-listing for Super Admin
        const allowedIPs = process.env.SUPER_ADMIN_IPS?.split(',') || [];
        if (allowedIPs.length > 0 && !allowedIPs.includes(req.ip || ip)) {
            console.warn(\`[SuperAdmin Login] IP Blocked: \${req.ip}\`);
            await AuditLog.create({
                action: 'SUPER_ADMIN_IP_BLOCK',
                details: \`Super admin login blocked from IP: \${req.ip}\`,
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
            // Fail fast on email mismatch, but check DB just in case of old config? No, explicit .env priority.
            console.warn('[SuperAdmin Login] Email mismatch with .env');
            return res.status(401).json({ error: 'Invalid super admin credentials' });
        }

        // 2. Validate Password (Case-sensitive comparison against .env first)
        // We compare checks: if invalid, we reject. If valid, we allow and Sync DB.
        if (password !== envPass) {
            console.warn('[SuperAdmin Login] Password verification failed against .env');
            await AuditLog.create({
                action: 'FAILED_SUPER_ADMIN_LOGIN',
                details: \`Failed super admin login attempt for email: \${email} (Password Mismatch)\`,
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
                tenantId: null
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
        // Expire old sessions for this user
        // We know 'user' exists here because we either found it or created it
        // and if User.create failed, we would be in the catch block.
        // Still, safe handling.

        if (!user) throw new Error('User creation failed unexpectedly');

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
            details: \`Super admin \${user.email} logged in (via .env auth)\`,
            userId: user.id,
            ipAddress: req.ip
        });

        res.json({ token, user: { id: user.id, email: user.email, role: user.role, tenantId: user.tenantId } });

    } catch (error: any) {
        console.error('[SuperAdmin Login] System Error:', error);
        res.status(500).json({ error: 'Authentication system error' });
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
        `;

        // Write the updated auth route
        fs.writeFileSync(authRoutePath, authRouteContent);
        console.log('Step 5: Auth route updated');

        // Step 6: Update server.ts to use the enhanced middleware
        console.log('Step 6: Updating server configuration...');
        const serverPath = '../src/server.ts';
        const serverContent = `
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { AdminUser, sequelize } from './models';
import authRoutes from './routes/auth';
import portalRoutes from './routes/portal';
import adminRoutes from './routes/admin';
import { TenantResolver } from './middleware/tenant-resolver';
import { errorHandler } from './middleware/error-handler';

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"]
        }
    }
}));
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3001',
    credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes with tenant resolution
app.use('/api/auth', authRoutes);

// Portal routes require tenant resolution
app.use('/api/portal', TenantResolver.resolveTenant, TenantResolver.requireTenant, portalRoutes);

// Admin routes require tenant resolution (except super admin)
app.use('/api/admin', TenantResolver.resolveTenant, TenantResolver.validateTenantAccess, adminRoutes);

// Error handling middleware
app.use(errorHandler);

// Global error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
const gracefulShutdown = () => {
    console.log('Shutting down gracefully...');
    sequelize.close().then(() => {
        console.log('Database connection closed');
        process.exit(0);
    }).catch((error) => {
        console.error('Error closing database connection:', error);
        process.exit(1);
    });
};

process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Start server
app.listen(PORT, () => {
    console.log(\`Server running on port \${PORT}\`);
    console.log(\`Environment: \${process.env.NODE_ENV || 'development'}\`);
    console.log(\`Database: \${process.env.DB_TYPE || 'sqlite'}\`);
});
        `;

        // Write the updated server configuration
        fs.writeFileSync(serverPath, serverContent);
        console.log('Step 6: Server configuration updated');

        console.log('Comprehensive tenant fix completed successfully!');
        console.log('Run the following commands to apply the changes:');
        console.log('1. node scripts/complete-tenant-fix.js');
        console.log('2. node scripts/run-fix-tenant-data.js');
        console.log('3. Restart your server');

    } catch (error) {
        console.error('Error during comprehensive tenant fix:', error);
    }
}

completeTenantFix();