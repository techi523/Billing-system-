import 'dotenv/config';
import dotenv from 'dotenv';
dotenv.config();

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
import { IspService } from './services/isp.service';
import { SettlementEngine } from './services/settlement-engine';
import { TrafficMonitorService } from './services/traffic-monitor.service';
import { ProductionService } from './services/production.service';
import { SocketService } from './services/socket.service';
import logger from './utils/logger';
import { TenantResolver } from './middleware/tenant-resolver';
import { ErrorHandler } from './middleware/error-handler';

const app = express();

// SECURITY HARDENING
app.use(helmet());
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// GLOBAL RATE LIMITING
const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: 'Too many requests, please try again later.',
});
app.use('/api/', globalLimiter);

// STRICT RATE LIMITING (Auth & Payments)
const strictLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Increased for dev
    message: 'Security threshold reached. Please try again later.',
});

// SUPER ADMIN RATE LIMITING (Extra strict)
const superAdminLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 100, // Increased for dev
    message: 'Super Admin access restricted. Please contact platform support.',
});

app.use(bodyParser.json({ limit: '10kb' }));
app.use(express.static('public'));

// REQUEST LOGGING
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip });
    next();
});

// ROUTES
app.use('/api/v1/auth', strictLimiter, authRoutes);
app.use('/api/v1/portal', TenantResolver.resolveTenant, portalRoutes);
app.use('/api/v1/portal/:tenantId/pay', strictLimiter, TenantResolver.resolveTenant);
app.use('/api/v1/admin', TenantResolver.resolveTenant, adminRoutes);
app.use('/api/v1/agent', TenantResolver.resolveTenant, agentRoutes);
app.use('/api/v1/superadmin', superAdminLimiter, superadminRoutes);
app.use('/api/v1/webhooks', webhookRoutes);
app.use('/api/v1/wallet', walletRoutes);
app.use('/api/v1/aggregator', aggregatorCallbackRoutes);
app.use('/api/v1/payments/callback', paymentCallbackRoutes);
app.use('/api/v1/routers', routerRoutes);
app.use('/api/v1/routers', routerControlRoutes);

// Security headers for sensitive routes
app.use('/api/v1/superadmin', (req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:");
    next();
});

// HEALTH CHECK
app.get('/health', async (req, res) => {
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
            logger.info('DEVELOPMENT MODE: Database schema synced.');
        }

        // Start Background Monitoring Services
        // Start Background Monitoring Services
        console.log('[System Init] Checking Environment Configuration...');

        const checkEnv = (key: string) => {
            if (process.env[key]) {
                console.log(`[System Init] ENV CHECK: ${key} -> [EXISTS]`);
            } else {
                console.error(`[System Init] ENV CHECK: ${key} -> [MISSING] ❌`);
            }
        };

        checkEnv('SUPER_ADMIN_EMAIL');
        checkEnv('SUPER_ADMIN_PASSWORD');
        checkEnv('SUPER_ADMIN_JWT_SECRET');

        if (!process.env.SUPER_ADMIN_EMAIL || !process.env.SUPER_ADMIN_PASSWORD) {
            console.error('[System Init] CRITICAL: Super Admin Credentials: [INCOMPLETE]');
        }

        TrafficMonitorService.start(5 * 60 * 1000); // Poll routers every 5 minutes

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