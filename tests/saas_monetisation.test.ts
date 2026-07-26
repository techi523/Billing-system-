import { sequelize, Tenant, Subscriber, SaaSInvoice, TenantSubscription, SaaSPayment, SubscriptionPlan } from '../src/models';
import { SaaSBillingService } from '../src/services/saas-billing.service';

describe('SaaS Monetisation & Subscription Management Test Suite', () => {

    const testTenantId = 'saas-tenant-0000-0000-0000-000000000001';

    beforeAll(async () => {
        // Ensure database tables are synchronized
        await sequelize.sync();

        // Clean up pre-existing test records safely
        try {
            await SaaSPayment.destroy({ where: { tenantId: testTenantId } });
            await SaaSInvoice.destroy({ where: { tenantId: testTenantId } });
            await TenantSubscription.destroy({ where: { tenantId: testTenantId } });
            await Subscriber.destroy({ where: { tenantId: testTenantId } });
            await Tenant.destroy({ where: { id: testTenantId } });
        } catch (e) {
            // Ignore teardown FK error
        }

        // Seed or find clean tenant
        await Tenant.findOrCreate({
            where: { id: testTenantId },
            defaults: {
                id: testTenantId,
                name: 'SaaS Test ISP Tenant',
                subdomain: `saas-test-${Date.now()}`,
                primaryColor: '#3b82f6',
                status: 'ACTIVE',
                isProduction: true
            }
        });

        // Seed default plans
        await SaaSBillingService.seedSubscriptionPlans();
    });

    afterAll(async () => {
        try {
            await SaaSPayment.destroy({ where: { tenantId: testTenantId } });
            await SaaSInvoice.destroy({ where: { tenantId: testTenantId } });
            await TenantSubscription.destroy({ where: { tenantId: testTenantId } });
            await Subscriber.destroy({ where: { tenantId: testTenantId } });
            await Tenant.destroy({ where: { id: testTenantId } });
        } catch (e) {
            // Teardown cleanup catch
        }
    });

    test('1. Global Pricing Config & Base Subscription (KSh 1,500 Default)', async () => {
        const config = await SaaSBillingService.getPricingConfig();
        expect(config).not.toBeNull();
        expect(config.baseSubscriptionPriceCents).toBe(150000); // KSh 1,500
        expect(config.vatPercentage).toBe(16.0);
        expect(config.gracePeriodDays).toBe(7);

        // Update pricing without code changes
        await SaaSBillingService.updatePricingConfig({ baseSubscriptionPriceCents: 200000 });
        const updated = await SaaSBillingService.getPricingConfig();
        expect(updated.baseSubscriptionPriceCents).toBe(200000); // KSh 2,000

        // Reset back to KSh 1,500
        await SaaSBillingService.updatePricingConfig({ baseSubscriptionPriceCents: 150000 });
    });

    test('2. Active User Billing Engine Computation', async () => {
        // Create 5 subscribers for tenant with valid phoneNumber
        for (let i = 1; i <= 5; i++) {
            await Subscriber.create({
                tenantId: testTenantId,
                username: `sub_${i}_${Date.now()}`,
                phoneNumber: `+2547000000${i}`,
                status: 'ACTIVE',
                lastLoginAt: new Date()
            });
        }

        const activeUsers = await SaaSBillingService.calculateActiveUsers(testTenantId);
        expect(activeUsers.todayActive).toBeGreaterThanOrEqual(5);
        expect(activeUsers.monthlyActive).toBeGreaterThanOrEqual(5);
        expect(activeUsers.cycleActive).toBeGreaterThanOrEqual(5);
        expect(activeUsers.historicalActive).toBeGreaterThanOrEqual(5);
    });

    test('3. Automatic Invoice Generation with Itemized Taxes & Fees', async () => {
        const invoice = await SaaSBillingService.generateInvoice(testTenantId);
        expect(invoice).not.toBeNull();
        expect(invoice.invoiceNumber).toMatch(/^INV-2026-\d{5}$/);
        expect(invoice.subscriptionAmountCents).toBe(150000); // KSh 1,500
        expect(invoice.taxAmountCents).toBe(24000); // 16% of 150,000 = 24,000 cents (KSh 240)
        expect(invoice.totalAmountCents).toBe(174000); // KSh 1,740.00
        expect(invoice.paymentStatus).toBe('UNPAID');
    });

    test('4. IntaSend Webhook Processing & Idempotency Duplicate Protection', async () => {
        const invoice = await SaaSInvoice.findOne({ where: { tenantId: testTenantId } });
        expect(invoice).not.toBeNull();

        const trackingId = `TEST-INTASEND-TX-${Date.now()}`;
        const webhookPayload = {
            invoice_number: invoice!.invoiceNumber,
            tracking_id: trackingId,
            state: 'COMPLETE',
            amount: 1740.00
        };

        // First execution -> Must succeed
        const res1 = await SaaSBillingService.processIntaSendWebhook(webhookPayload);
        expect(res1.success).toBe(true);
        expect(res1.message).toBe('Payment processed successfully.');

        // Check invoice status updated to PAID
        const paidInvoice = await SaaSInvoice.findByPk(invoice!.id);
        expect(paidInvoice?.paymentStatus).toBe('PAID');
        expect(paidInvoice?.paymentReference).toBe(trackingId);

        // Second execution (duplicate webhook) -> Must be caught as duplicate
        const res2 = await SaaSBillingService.processIntaSendWebhook(webhookPayload);
        expect(res2.success).toBe(true);
        expect(res2.message).toContain('idempotent');
    });

    test('5. Grace Period & Overdue State Machine', async () => {
        // Create 2 days overdue subscription (within 7 days grace period)
        const recentPastDate = new Date(Date.now() - (2 * 24 * 60 * 60 * 1000));

        await TenantSubscription.update(
            {
                status: 'ACTIVE',
                currentPeriodEnd: recentPastDate
            },
            { where: { tenantId: testTenantId } }
        );

        // Run grace period evaluation
        const result = await SaaSBillingService.evaluateGracePeriods();
        expect(result.gracePeriodCount).toBeGreaterThanOrEqual(1);

        const sub = await TenantSubscription.findOne({ where: { tenantId: testTenantId } });
        expect(sub?.status).toBe('GRACE_PERIOD');
        expect(sub?.gracePeriodEndDate).not.toBeNull();
    });

    test('6. Super Admin SaaS Metrics & Financial Dashboard Summary', async () => {
        const metrics = await SaaSBillingService.getSuperAdminMetrics();
        expect(metrics).not.toBeNull();
        expect(metrics.mrr).toBeGreaterThanOrEqual(0);
        expect(metrics.arr).toBeGreaterThanOrEqual(0);
        expect(metrics.baseSubscriptionPrice).toBe(1500);
    });
});
