import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import logger from '../utils/logger';
import { AuditLog } from '../models';

dotenv.config();

/**
 * Production-grade Email Service
 * Uses SMTP configuration from .env
 */
export const sendPasswordResetEmail = async (to: string, token: string) => {
    const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${token}`;
    const subject = 'SurfBill Password Reset';
    const html = `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; rounded: 8px;">
            <h2 style="color: #4f46e5;">Password Reset Request</h2>
            <p>You requested to reset your password. Click the button below to proceed:</p>
            <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Reset Password</a>
            </div>
            <p style="color: #64748b; font-size: 14px;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
            <p style="color: #94a3b8; font-size: 12px; text-align: center;">© 2026 SurfBill Pro. All rights reserved.</p>
        </div>
    `;

    return sendEmail({ to, subject, html, action: 'PASSWORD_RESET' });
};

export const sendEmail = async ({ to, subject, html, text, tenantId, userId, action }: {
    to: string;
    subject: string;
    html?: string;
    text?: string;
    tenantId?: string;
    userId?: string;
    action?: string;
}) => {
    try {
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: Number(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
        });

        const info = await transporter.sendMail({
            from: `"SurfBill" <${process.env.SMTP_USER}>`,
            to,
            subject,
            text,
            html,
        });

        logger.info(`Email sent to ${to}: ${info.messageId}`);

        if (action) {
            await AuditLog.create({
                action: `EMAIL_${action}`,
                details: `Email sent to ${to}. Subject: ${subject}`,
                tenantId,
                userId,
            });
        }

        return { success: true, messageId: info.messageId };
    } catch (error: any) {
        logger.error(`Failed to send email to ${to}: ${error.message}`);

        if (action) {
            await AuditLog.create({
                action: `EMAIL_${action}_FAILURE`,
                details: `Failed to send email to ${to}. Error: ${error.message}`,
                tenantId,
                userId,
            });
        }

        throw new Error(`Email delivery failed: ${error.message}`);
    }
};
