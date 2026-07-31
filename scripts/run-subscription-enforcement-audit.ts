import { sequelize, SubscriptionPlan, TenantSubscription, TrialAgreement, FeatureViolationLog, Tenant, Router, Subscriber } from '../src/models';
import { SubscriptionEnforcementService } from '../src/services/subscription-enforcement.service';
import { SaaSBillingService } from '../src/services/saas-billing.service';

async function runSubscriptionEnforcementAudit() {
    console.log('\n=========================================================');
    console.log('  SURFBILL SUBSCRIPTION ENFORCEMENT & LICENSE SYSTEM AUDIT');
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

    // 1. Model Sync & Plan Seeding Verification
    await assertTest('Database Connection & Subscription Plan Seeding Audit', async () => {
        await sequelize.authenticate();
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS trial_agreements (
                    id CHAR(36) PRIMARY KEY,
                    tenantId CHAR(36) NOT NULL,
                    businessName VARCHAR(255) NOT NULL,
                    ownerName VARCHAR(255) NOT NULL,
                    phone VARCHAR(255) NOT NULL,
                    email VARCHAR(255) NOT NULL,
                    businessLocation VARCHAR(255) NOT NULL,
                    expectedSubscriberCount INTEGER DEFAULT 50,
                    expectedRouterCount INTEGER DEFAULT 2,
                    termsAccepted BOOLEAN DEFAULT 1,
                    trialAgreementAccepted BOOLEAN DEFAULT 1,
                    agreedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    agreedIp VARCHAR(255) NOT NULL,
                    agreedUserAgent TEXT NOT NULL,
                    agreedTextHash VARCHAR(255) NOT NULL,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS feature_violation_logs (
                    id CHAR(36) PRIMARY KEY,
                    tenantId CHAR(36) NOT NULL,
                    featureOrLimitKey VARCHAR(255) NOT NULL,
                    attemptedAction VARCHAR(255) NOT NULL,
                    currentUsage INTEGER DEFAULT 0,
                    allowedLimit INTEGER DEFAULT 0,
                    subscriptionStatus VARCHAR(50) NOT NULL,
                    requestIp VARCHAR(255),
                    userAgent TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN maxWhatsapp INTEGER DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN maxAdvertisements INTEGER DEFAULT 5;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN maxBranches INTEGER DEFAULT 1;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN maxIntegrations INTEGER DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN whiteLabelFeatures BOOLEAN DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN multiBranchFeatures BOOLEAN DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE subscription_plans ADD COLUMN customIntegrations BOOLEAN DEFAULT 0;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE tenant_subscriptions ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (_) {}
            try { await sequelize.query("ALTER TABLE tenant_subscriptions ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (_) {}
        } catch (_) {}

        const plans = await SaaSBillingService.seedSubscriptionPlans();
        if (plans.length < 4) throw new Error(`Expected at least 4 plans, found ${plans.length}`);
    });

    // Setup Test Tenant ID
    let testTenantId = 'test-tenant-license-enforce-1';
    let tenant = await Tenant.findByPk(testTenantId);
    if (!tenant) {
        tenant = await Tenant.create({
            id: testTenantId,
            name: 'Test License ISP Networks',
            slug: 'test-license-isp',
            subdomain: 'test-license-isp',
            businessEmail: 'admin@testlicense.co.ke',
            status: 'ACTIVE'
        });
    }

    // 2. Free Trial Registration & Digital Agreement Audit Log
    await assertTest('Free Trial Registration with Legally Binding Digital Agreement Log', async () => {
        const result = await SubscriptionEnforcementService.registerTrialWithAgreement({
            businessName: 'Apex Fiber ISP',
            ownerName: 'John Doe',
            phone: '254712345678',
            email: 'john@apexfiber.co.ke',
            businessLocation: 'Nairobi, Kenya',
            expectedSubscriberCount: 150,
            expectedRouterCount: 4,
            termsAccepted: true,
            trialAgreementAccepted: true,
            requestIp: '197.232.14.88',
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) SurfBill/1.0',
            trialDays: 14
        });

        testTenantId = result.tenant.id;

        if (!result.agreement) throw new Error('Trial Agreement was not recorded');
        if (result.agreement.agreedIp !== '197.232.14.88') throw new Error('Agreed IP mismatch');
        if (!result.agreement.agreedTextHash) throw new Error('Digital agreement hash missing');
        if (result.subscription.status !== 'FREE_TRIAL') throw new Error(`Subscription status mismatch (expected FREE_TRIAL, got ${result.subscription.status})`);
    });

    // 3. Real-time Subscription Evaluation & Access Authorization
    await assertTest('Real-time Subscription Status Evaluation & Feature Matrix', async () => {
        const evalResult = await SubscriptionEnforcementService.evaluateSubscriptionStatus(testTenantId);
        if (!evalResult.isAccessAllowed) throw new Error('Active trial tenant access should be allowed');
        if (evalResult.daysRemaining <= 0) throw new Error('Trial days remaining should be > 0');
    });

    // 4. Feature Restriction Enforcement (Unincluded Feature Attempt -> Block & Log)
    await assertTest('Strict Feature Access Enforcement & Violation Audit Logging', async () => {
        // Starter plan does not include whiteLabel or customIntegrations
        const check = await SubscriptionEnforcementService.enforceFeatureAccess(testTenantId, 'hasWhiteLabel', '197.232.14.88');
        if (check.allowed) throw new Error('White Label should be locked on Starter plan');

        const violation = await FeatureViolationLog.findOne({ where: { tenantId: testTenantId } });
        if (!violation) throw new Error('Feature violation log was not generated');
    });

    // 5. Usage Limit Enforcement (Router Count Limit Breach -> Block)
    await assertTest('Usage Limit Enforcement (Router Count Limit)', async () => {
        // Create 2 routers (Starter limit is 2)
        await Router.destroy({ where: { tenantId: testTenantId } });
        await Router.create({ tenantId: testTenantId, name: 'Router 1', ipAddress: '192.168.1.1', host: '192.168.1.1', username: 'admin', password: 'password', status: 'ONLINE' });
        await Router.create({ tenantId: testTenantId, name: 'Router 2', ipAddress: '192.168.1.2', host: '192.168.1.2', username: 'admin', password: 'password', status: 'ONLINE' });

        const checkLimit = await SubscriptionEnforcementService.enforceUsageLimit(testTenantId, 'routers');
        if (checkLimit.allowed) throw new Error('Adding 3rd router should be blocked when limit is 2');
    });

    // 6. Automated Dormancy & Expired Trial Lockout
    await assertTest('Expired Trial Hard Lockout & Payment Required Guard', async () => {
        const sub = await TenantSubscription.findOne({ where: { tenantId: testTenantId } });
        if (sub) {
            // Set trial end date to 2 days in the past
            const pastDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
            await sub.update({ status: 'EXPIRED', trialEndDate: pastDate });
        }

        const evalResult = await SubscriptionEnforcementService.evaluateSubscriptionStatus(testTenantId);
        if (evalResult.isAccessAllowed) throw new Error('Expired trial tenant should be blocked from platform access');
        if (evalResult.status !== 'EXPIRED') throw new Error('Status should evaluate to EXPIRED');
    });

    // 7. Super Admin Override Engine (1-Click Trial Extension & Force Activation)
    await assertTest('Super Admin Override Engine (Trial Extension & Activation)', async () => {
        const overrideResult = await SubscriptionEnforcementService.superAdminOverride(testTenantId, {
            action: 'EXTEND_TRIAL',
            extendDays: 14,
            notes: 'Customer requested 14-day extension for testing multi-router setup.'
        });

        if (!overrideResult.success) throw new Error('Super Admin trial extension failed');

        const postEval = await SubscriptionEnforcementService.evaluateSubscriptionStatus(testTenantId);
        if (!postEval.isAccessAllowed) throw new Error('Access should be restored after Super Admin trial extension');
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runSubscriptionEnforcementAudit().catch(err => {
    console.error('Fatal Subscription Enforcement Audit Exception:', err);
    process.exit(1);
});
