import { config } from './config/env';
import express from 'express';
import { createServer } from 'http';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import portalRoutes from './routes/portal';
import adminRoutes from './routes/admin';
import agentRoutes from './routes/agent';
import superadminRoutes from './routes/superadmin';
import webhookRoutes from './routes/webhook';
import walletRoutes from './routes/wallet.routes';
import paymentCallbackRoutes from './routes/payment-callback.routes';
import aggregatorCallbackRoutes from './routes/aggregator-callback.routes';
import routerRoutes from './routes/router.routes';
import routerControlRoutes from './routes/router-control.routes';
import campaignRoutes from './routes/campaigns';
import smsGatewayRoutes from './routes/sms-gateway.routes';
import smsRoutes from './routes/sms.routes';
import profileRoutes from './routes/profile.routes';
import marketingRoutes from './routes/marketing.routes';
import superAdminSaasRoutes from './routes/superadmin-saas.routes';
import tenantSaasRoutes from './routes/tenant-saas.routes';
import reportsRoutes from './routes/reports.routes';
import refundRoutes from './routes/refund.routes';
import subscriberRoutes from './routes/subscriber.routes';
import brandingRoutes from './routes/branding.routes';
import superadminCommandRoutes from './routes/superadmin-command.routes';
import ultimateSuperAdminRoutes from './routes/ultimate-superadmin-control.routes';
import intasendWebhookRoutes from './routes/intasend-webhook.routes';
import platformOwnerRoutes from './routes/platform-owner.routes';
import checkoutRoutes from './routes/checkout.routes';
import enterpriseCrmRoutes from './routes/enterprise-crm.routes';
import smsProcurementRoutes from './routes/sms-procurement.routes';
import { DormantRouterService } from './services/dormant-router.service';
import { IspService } from './services/isp.service';
import { SettlementEngine } from './services/settlement-engine';
import { TrafficMonitorService } from './services/traffic-monitor.service';
import { ProductionService } from './services/production.service';
import { SocketService } from './services/socket.service';
import { TemplateSeeder } from './services/template-seeder';
import logger from './utils/logger';
import { TenantResolver } from './middleware/tenant-resolver';
import { ErrorHandler } from './middleware/error-handler';

const app = express();

// Trust proxy (required for Cloudflare / reverse proxy to resolve real client IPs)
app.set('trust proxy', 1);

// SECURITY HARDENING
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"], // Consider removing unsafe-inline in production
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000, // 1 year
        includeSubDomains: true,
        preload: true
    },
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// Enforce strict CORS in production
const corsOrigin = config.security.corsOrigin;

if (process.env.NODE_ENV === 'production' && (Array.isArray(corsOrigin) && corsOrigin.length === 0)) {
    logger.warn('SECURITY WARNING: CORS_ORIGIN not set in production. APIs may be blocking requests.');
}

app.use(cors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// GLOBAL RATE LIMITING
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests, please try again later.',
    validate: false,
});
app.use('/api/', globalLimiter);

// STRICT RATE LIMITING (Auth & Payments)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    message: 'Security threshold reached. Please try again later.',
    validate: false,
});

// SUPER ADMIN RATE LIMITING (Extra strict)
const superAdminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: 'Super Admin access restricted. Please contact platform support.',
    validate: false,
});

app.use(bodyParser.json({
    limit: '10kb',
    verify: (req: any, _res, buf) => {
        req.rawBody = buf;
    }
}));
app.use(express.static('public'));

// REQUEST LOGGING
app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip });
    next();
});

import { authMiddleware } from './middleware/auth';

// ROUTES
app.use('/api/v1/auth', strictLimiter, authRoutes);

app.use('/api/v1/portal', portalRoutes); // Public portal handle its own resolution
app.use('/api/v1/portal/:tenantId/pay', strictLimiter, portalRoutes);
app.use('/api/v1/branding', brandingRoutes);

// Authenticated Routes with Tenant Resolution
app.use('/api/v1/admin/profile', authMiddleware, TenantResolver.resolveTenant, profileRoutes);
app.use('/api/v1/admin', authMiddleware, TenantResolver.resolveTenant, adminRoutes);
app.use('/api/v1/agent', authMiddleware, TenantResolver.resolveTenant, agentRoutes);
app.use('/api/v1/wallet', authMiddleware, TenantResolver.resolveTenant, walletRoutes);
app.use('/api/v1/campaigns', authMiddleware, TenantResolver.resolveTenant, campaignRoutes);

app.use('/api/v1/marketing', authMiddleware, TenantResolver.resolveTenant, marketingRoutes);
app.use('/api/v1/superadmin', authMiddleware, superAdminLimiter, superadminRoutes);
app.use('/api/v1/superadmin/command', authMiddleware, superAdminLimiter, superadminCommandRoutes);
app.use('/api/v1/superadmin/ultimate', authMiddleware, superAdminLimiter, ultimateSuperAdminRoutes);
app.use('/api/v1/superadmin/saas', authMiddleware, superAdminLimiter, superAdminSaasRoutes);
app.use('/api/v1/superadmin/sms', authMiddleware, superAdminLimiter, smsGatewayRoutes);
app.use('/api/v1/superadmin/sms-procurement', authMiddleware, superAdminLimiter, smsProcurementRoutes);
app.use('/api/v1/platform-owner', platformOwnerRoutes);
app.use('/api/v1/checkout', checkoutRoutes);
app.use('/api/v1/enterprise', enterpriseCrmRoutes);
app.use('/api/v1/tenant/saas', authMiddleware, TenantResolver.resolveTenant, tenantSaasRoutes);
app.use('/api/v1/sms', authMiddleware, TenantResolver.resolveTenant, smsRoutes);
app.use('/api/v1/admin/reports', authMiddleware, TenantResolver.resolveTenant, reportsRoutes);
app.use('/api/v1/admin/refunds', authMiddleware, TenantResolver.resolveTenant, refundRoutes);
app.use('/api/v1/admin/subscribers', authMiddleware, TenantResolver.resolveTenant, subscriberRoutes);

// WEBHOOK RATE LIMITING (Prevent webhook flooding)
const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    message: 'Webhook rate limit exceeded',
    validate: false,
});
app.use('/api/v1/webhooks/saas', webhookLimiter, intasendWebhookRoutes);
app.use('/api/v1/webhooks', webhookLimiter, webhookRoutes);
app.use('/api/v1/aggregator', aggregatorCallbackRoutes);
app.use('/api/v1/payments/callback', paymentCallbackRoutes);
app.use('/api/v1/routers', authMiddleware, routerRoutes);
app.use('/api/v1/routers', authMiddleware, routerControlRoutes);

// Security headers for sensitive routes
app.use('/api/v1/superadmin', (_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
    next();
});

// HEALTH CHECK
app.get('/health', async (_req, res) => {
    try {
        await sequelize.authenticate();
        res.status(200).json({
            status: 'UP',
            timestamp: new Date().toISOString(),
            database: 'CONNECTED',
            uptime: process.uptime()
        });
    } catch (error) {
        res.status(503).json({
            status: 'DOWN',
            timestamp: new Date().toISOString(),
            database: 'DISCONNECTED'
        });
    }
});

// ERROR HANDLING
app.use(ErrorHandler.handleTenantError);
app.use(ErrorHandler.handleGeneralError);

const PORT = process.env.PORT || 3000;

// DATABASE & STARTUP
async function startServer() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully.');

        if (process.env.NODE_ENV === 'production') {
            logger.warn('PRODUCTION MODE: Skipping automated schema synchronization. Use migrations.');
        } else {
            await sequelize.sync();
            try { await sequelize.query("ALTER TABLE saas_invoices ADD COLUMN metadata TEXT;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE saas_invoices ADD COLUMN subtotalCents BIGINT DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE saas_invoices ADD COLUMN taxCents BIGINT DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE sms_financial_ledgers ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE sms_ledger_transactions ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (_) {}
            logger.info('DEVELOPMENT MODE: Database schema synced.');
        }

        // Auto-seed templates on startup
        await TemplateSeeder.seedDefaults();

        // Start Background Monitoring Services
        // Start Background Monitoring Services
        // Start Background Monitoring Services
        // Start Background Monitoring Services
        console.log('[System Init] Environment Configuration: [OK]');

        TrafficMonitorService.start(30 * 1000); // Poll routers every 30 seconds

        // Schedule Production Purge (Every 24 hours)
        setInterval(() => {
            ProductionService.purgeOldData();
        }, 24 * 60 * 60 * 1000);

        // Initial purge on startup
        ProductionService.purgeOldData();

        setInterval(async () => {
            logger.info('Running automated billing/suspension checks...');
            try {
                await IspService.suspendExpiredSubscribers();

                // M-Pesa Status Polling (for delayed callbacks)
                const { PaymentService } = require('./services/payment.service');
                await PaymentService.pollPendingPayments();

            } catch (err) {
                logger.error('Background Job Failed', { error: (err as Error).message });
            }
        }, 60 * 60 * 1000); // Main cycle: 1 hour (suspensions)

        // Frequent cycle for payment polling (e.g. every 2 minutes)
        setInterval(async () => {
            try {
                const { PaymentService } = require('./services/payment.service');
                await PaymentService.pollPendingPayments();
            } catch (err) { }
        }, 2 * 60 * 1000);

        // Periodically clear matured pending balances (e.g. every 15 minutes)
        setInterval(async () => {
            try {
                const { WalletService } = require('./services/wallet.service');
                await WalletService.clearAllMaturedPendingBalances();
            } catch (err) {
                logger.error('Matured balance clearing failed', { error: (err as Error).message });
            }
        }, 15 * 60 * 1000);

        // Periodically scan for dormant routers and enforce policies (every 5 minutes)
        setInterval(async () => {
            try {
                await DormantRouterService.scanAndEnforceDormantRouters();
            } catch (err) {
                logger.error('Dormant router scan background job failed', { error: (err as Error).message });
            }
        }, 5 * 60 * 1000);

        // Initial scan on startup
        DormantRouterService.scanAndEnforceDormantRouters().catch(err => {
            logger.warn('Initial dormant router scan failed', { error: err.message });
        });

        // Daily cycle for automated settlements
        setInterval(async () => {
            logger.info('Checking for automated settlements...');
            try {
                await SettlementEngine.runAutomatedSettlements();
            } catch (err) {
                logger.error('Settlement Engine failed', { error: (err as Error).message });
            }
        }, 24 * 60 * 60 * 1000);

        const httpServer = createServer(app);
        SocketService.init(httpServer);

        httpServer.listen(PORT, () => {
            logger.info(`Production SaaS Billing System running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start server:', { error: (err as Error).message });
        process.exit(1);
    }
}

startServer();