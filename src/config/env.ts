import dotenv from 'dotenv';
import path from 'path';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const requiredEnvVars = [
    'PORT',
    'NODE_ENV',
    'JWT_SECRET',
    'SUPER_ADMIN_JWT_SECRET',
    'SUPER_ADMIN_EMAIL',
    'SUPER_ADMIN_PASSWORD',
    'DB_TYPE',
    'DB_NAME',
    'DB_USER',
    // 'DB_PASS', // Can be empty
    'DB_HOST',
    'CORS_ORIGIN',
    'INTASEND_PUBLISHABLE_KEY',
    'INTASEND_SECRET_KEY',
] as const;



function validateEnv(): Record<string, string> {
    const missingVars: string[] = [];
    const envConfig: Record<string, string> = {};

    for (const key of requiredEnvVars) {
        const value = process.env[key];
        if (!value) {
            missingVars.push(key);
        }
        envConfig[key] = value || '';
    }

    if (missingVars.length > 0) {
        console.error('❌ CRITICAL ERROR: Missing required environment variables:');
        missingVars.forEach(key => console.error(` - ${key}`));
        console.error('The application cannot start without these variables.');
        process.exit(1);
    }

    return envConfig;
}

// Validate immediately on import
validateEnv();

export const config = {
    app: {
        port: Number(process.env.PORT) || 3000,
        env: process.env.NODE_ENV || 'development',
        isProduction: process.env.NODE_ENV === 'production',
        url: process.env.APP_URL || `http://localhost:${process.env.PORT || 3000}`,
        frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
    },
    auth: {
        jwtSecret: process.env.JWT_SECRET!,
        superAdminJwtSecret: process.env.SUPER_ADMIN_JWT_SECRET!,
        superAdminEmail: process.env.SUPER_ADMIN_EMAIL!,
        superAdminPassword: process.env.SUPER_ADMIN_PASSWORD!,
    },
    db: {
        type: process.env.DB_TYPE || 'sqlite',
        name: process.env.DB_NAME!,
        user: process.env.DB_USER!,
        pass: process.env.DB_PASS || '',
        host: process.env.DB_HOST!,
    },
    security: {
        corsOrigin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
        rateLimitWindow: Number(process.env.RATE_LIMIT_WINDOW_MS) || 900000,
        rateLimitMax: Number(process.env.RATE_LIMIT_MAX_REQUESTS) || 1000,
    },
    payments: {
        intasend: {
            publishableKey: process.env.INTASEND_PUBLISHABLE_KEY!,
            secretKey: process.env.INTASEND_SECRET_KEY!,
            webhookToken: process.env.INTASEND_WEBHOOK_TOKEN,
            isMock: process.env.INTASEND_MOCK === 'true',
            env: process.env.INTASEND_ENV || 'sandbox',
        },
        mpesa: {
            consumerKey: process.env.MPESA_CONSUMER_KEY,
            consumerSecret: process.env.MPESA_CONSUMER_SECRET,
            shortcode: process.env.MPESA_SHORTCODE,
            passkey: process.env.MPESA_PASSKEY,
            env: process.env.MPESA_ENV || 'sandbox',
        }
    },
    email: {
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
    sms: {
        provider: process.env.SMS_PROVIDER || 'GENERIC',
        username: process.env.SMS_USERNAME,
        apiKey: process.env.SMS_API_KEY,
        senderId: process.env.SMS_SENDER_ID,
    }
} as const;
