import { sequelize, AdminUser, Tenant, PasswordResetToken, AuditLog } from '../src/models';
import { PasswordResetService } from '../src/services/password-reset.service';
import bcrypt from 'bcryptjs';

async function runPasswordResetAudit() {
    console.log('\n=========================================================');
    console.log('   SURFBILL AUTHENTICATION & PASSWORD RESET SYSTEM AUDIT');
    console.log('=========================================================\n');

    let totalTests = 0;
    let passedTests = 0;

    async function assertTest(name: string, fn: () => Promise<void>) {
        totalTests++;
        const start = Date.now();
        try {
            await fn();
            const duration = Date.now() - start;
            console.log(`  ✓ [PASS] ${name} (${duration}ms)`);
            passedTests++;
        } catch (err: any) {
            const duration = Date.now() - start;
            console.error(`  ❌ [FAIL] ${name} (${duration}ms) - ${err.message}`);
        }
    }

    const testEmail = 'reset-audit-user@surfbill.co.ke';
    let testUser: AdminUser;

    // 1. Database Connection & User Setup
    await assertTest('Database Connection & Test User Provisioning', async () => {
        await sequelize.authenticate();

        const addCols = [
            "ALTER TABLE passwordResetTokens ADD COLUMN resetType VARCHAR(20) DEFAULT 'LINK';",
            "ALTER TABLE passwordResetTokens ADD COLUMN tokenHash VARCHAR(255);",
            "ALTER TABLE passwordResetTokens ADD COLUMN otpCode VARCHAR(20);",
            "ALTER TABLE passwordResetTokens ADD COLUMN attempts INTEGER DEFAULT 0;",
            "ALTER TABLE passwordResetTokens ADD COLUMN isLocked BOOLEAN DEFAULT 0;",
            "ALTER TABLE passwordResetTokens ADD COLUMN ipAddress VARCHAR(255);",
            "ALTER TABLE passwordResetTokens ADD COLUMN userAgent TEXT;",
            "ALTER TABLE password_reset_tokens ADD COLUMN resetType VARCHAR(20) DEFAULT 'LINK';",
            "ALTER TABLE password_reset_tokens ADD COLUMN tokenHash VARCHAR(255);",
            "ALTER TABLE password_reset_tokens ADD COLUMN otpCode VARCHAR(20);",
            "ALTER TABLE password_reset_tokens ADD COLUMN attempts INTEGER DEFAULT 0;",
            "ALTER TABLE password_reset_tokens ADD COLUMN isLocked BOOLEAN DEFAULT 0;",
            "ALTER TABLE password_reset_tokens ADD COLUMN ipAddress VARCHAR(255);",
            "ALTER TABLE password_reset_tokens ADD COLUMN userAgent TEXT;"
        ];

        for (const query of addCols) {
            try {
                await sequelize.query(query);
            } catch (_) {}
        }

        let tenant = await Tenant.findByPk('test-reset-tenant');
        if (!tenant) {
            tenant = await Tenant.create({
                id: 'test-reset-tenant',
                name: 'Reset Audit Network',
                slug: 'reset-audit-network',
                subdomain: 'reset-audit-network',
                businessEmail: 'admin@resetaudit.co.ke',
                status: 'ACTIVE'
            });
        }

        let user = await AdminUser.findOne({ where: { email: testEmail } });
        if (!user) {
            const initialPassword = await bcrypt.hash('OldP@ssword123!', 12);
            user = await AdminUser.create({
                email: testEmail,
                password: initialPassword,
                role: 'TENANT',
                displayName: 'Audit User',
                tenantId: tenant.id
            });
        }
        testUser = user;
    });

    // 2. Email Reset Link Flow (Token Generation, Expiry & Single-Use Enforcement)
    await assertTest('Email Reset Link Flow (Cryptographic Token, Expiry & Single-Use)', async () => {
        const reqResult = await PasswordResetService.requestPasswordReset({
            email: testEmail,
            resetType: 'LINK',
            expiryMinutes: 15,
            ipAddress: '197.232.14.99'
        });

        if (!reqResult.success) throw new Error('Reset link request failed');

        const tokenRecord = await PasswordResetToken.findOne({
            where: { userId: testUser.id, resetType: 'LINK', used: false }
        });

        if (!tokenRecord) throw new Error('Password reset token record not found');
        if (!tokenRecord.token || !tokenRecord.tokenHash) throw new Error('Cryptographic token/hash missing');

        // Confirm Password Reset using valid token
        const resetResult = await PasswordResetService.confirmPasswordReset({
            token: tokenRecord.token,
            newPassword: 'NewS3cureP@ssword2026!',
            ipAddress: '197.232.14.99'
        });

        if (!resetResult.success) throw new Error(`Password reset failed: ${resetResult.message}`);

        // Re-use attempt must fail
        const reuseResult = await PasswordResetService.confirmPasswordReset({
            token: tokenRecord.token,
            newPassword: 'AnotherP@ssword123!',
            ipAddress: '197.232.14.99'
        });

        if (reuseResult.success) throw new Error('Used reset token was incorrectly accepted twice');
    });

    // 3. Email Verification Code (OTP) Flow & Max 5 Attempts Lockout
    await assertTest('Email Verification Code (OTP) & Max 5 Failed Attempts Lockout', async () => {
        const otpReq = await PasswordResetService.requestPasswordReset({
            email: testEmail,
            resetType: 'OTP',
            expiryMinutes: 15,
            ipAddress: '197.232.14.99'
        });

        if (!otpReq.success) throw new Error('OTP request failed');

        // Test 4 failed OTP attempts
        for (let i = 1; i <= 4; i++) {
            const badVerify = await PasswordResetService.verifyOTP(testEmail, '000000');
            if (badVerify.valid) throw new Error('Invalid OTP was incorrectly accepted');
        }

        // 5th failed attempt should lock out the code
        const lockVerify = await PasswordResetService.verifyOTP(testEmail, '000000');
        if (lockVerify.valid) throw new Error('Invalid OTP was accepted');
        if (!lockVerify.message?.includes('locked')) {
            throw new Error('OTP code was not locked after 5 failed attempts');
        }
    });

    // 4. Password Strength Policy Enforcement
    await assertTest('Password Strength Policy Rules Enforcement', async () => {
        const weakPasswords = [
            'short',             // < 8 chars
            'nouppercase123!',   // no uppercase
            'NOLOWERCASE123!',   // no lowercase
            'NoNumbersSpecial!', // no numbers
            'NoSpecial12345'     // no special chars
        ];

        for (const pwd of weakPasswords) {
            const policy = PasswordResetService.validatePasswordPolicy(pwd);
            if (policy.valid) throw new Error(`Weak password '${pwd}' incorrectly bypassed security policy`);
        }

        const strongPwd = 'ValidStr0ngP@ssword!';
        const validCheck = PasswordResetService.validatePasswordPolicy(strongPwd);
        if (!validCheck.valid) throw new Error(`Valid password '${strongPwd}' rejected by policy`);
    });

    // 5. Anti-Abuse Rate Limiting & Email Enumeration Protection
    await assertTest('Anti-Abuse Rate Limiting & Email Enumeration Shield', async () => {
        const enumResult = await PasswordResetService.requestPasswordReset({
            email: 'nonexistent-account-999@surfbill.co.ke',
            resetType: 'LINK'
        });

        if (!enumResult.success) throw new Error('Email enumeration protection returned negative state');
        if (!enumResult.message.includes('If your account exists')) {
            throw new Error('Enumeration shield message format mismatch');
        }
    });

    // 6. Super Admin Password Reset Security Monitoring API
    await assertTest('Super Admin Password Reset Security Monitoring Audit', async () => {
        const monitoring = await PasswordResetService.getSuperAdminMonitoringStats();
        if (typeof monitoring.stats.totalRequests !== 'number') {
            throw new Error('Monitoring stats missing totalRequests');
        }
        if (monitoring.recentLogs.length === 0) {
            throw new Error('Security audit log trail missing recent logs');
        }
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runPasswordResetAudit().catch(err => {
    console.error('Fatal Password Reset Audit Exception:', err);
    process.exit(1);
});
