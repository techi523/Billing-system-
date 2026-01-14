import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { sequelize } from './models';
import authRoutes from './routes/auth';
import portalRoutes from './routes/portal';
import adminRoutes from './routes/admin';
import agentRoutes from './routes/agent';
import webhookRoutes from './routes/webhook';
import { IspService } from './services/isp.service';
import logger from './utils/logger';

const app = express();

// SECURITY HARDENING
app.use(helmet()); // Sets various HTTP headers for security
app.use(cors({
    origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id']
}));

// RATE LIMITING (Prevent Abuse)
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 mins
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // Limit each IP
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
});
app.use('/api/', limiter);

app.use(bodyParser.json({ limit: '10kb' })); // Limit body size to prevent DoS
app.use(express.static('public'));

// REQUEST LOGGING
app.use((req, res, next) => {
    logger.info(`${req.method} ${req.url}`, { ip: req.ip });
    next();
});

// ROUTES
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/portal', portalRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/v1/agent', agentRoutes);
app.use('/api/v1/webhooks', webhookRoutes);

// ERROR HANDLING (Catch-all)
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    logger.error('Unhandled Error', { error: err.message, stack: err.stack });
    res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3000;

// DATABASE & STARTUP
async function startServer() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully.');

        // NOTE: In production, migrations (e.g. Umzug or Sequelize-CLI) are preferred over .sync()
        if (process.env.NODE_ENV !== 'production') {
            await sequelize.sync({ alter: true });
            logger.info('Database synchronized (Development Mode).');
        }

        // Background Tasks
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

        app.listen(PORT, () => {
            logger.info(`Production SaaS Billing System running on port ${PORT}`);
        });
    } catch (err) {
        logger.error('Failed to start server:', { error: (err as Error).message });
        process.exit(1);
    }
}

startServer();
