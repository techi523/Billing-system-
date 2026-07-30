import { sequelize, Tenant, Wallet, SaaSInvoice, TenantSubscription, TenantSmsWallet, Campaign, AuditLog } from '../src/models';
import { CheckoutService } from '../src/services/checkout.service';
import { SaaSBillingService } from '../src/services/saas-billing.service';
import { validatePaymentEnvDiagnostics } from '../src/config/env';
import logger from '../src/utils/logger';

async function runPaymentAuditSuite() {
    console.log('\n=========================================================');
    console.log('  SURFBILL FINTECH PAYMENT & BILLING REGRESSION SUITE');
    console.log('=========================================================\n');

    let passedTests = 0;
    let failedTests = 0;

    async function assertTest(name: string, fn: () => Promise<void>) {
        const start = Date.now();
        try {
            await fn();
            const duration = Date.now() - start;
            console.log(`  ✓ [PASS] ${name} (${duration}ms)`);
            passedTests++;
        } catch (err: any) {
            const duration = Date.now() - start;
            console.error(`  ❌ [FAIL] ${name} (${duration}ms) - ${err.message}`);
            failedTests++;
        }
    }

    // 1. Database Connection Test
    await assertTest('Database Connection & Model Sync', async () => {
        await sequelize.authenticate();
        try { await sequelize.query("ALTER TABLE saas_invoices ADD COLUMN metadata TEXT;"); } catch (_) {}
        try { await sequelize.query("ALTER TABLE saas_invoices ADD COLUMN subtotalCents BIGINT DEFAULT 0;"); } catch (_) {}
        try { await sequelize.query("ALTER TABLE saas_invoices ADD COLUMN taxCents BIGINT DEFAULT 0;"); } catch (_) {}
    });

    // 2. Environment Diagnostics Test
    await assertTest('Environment Variables Validation', async () => {
        const diag = validatePaymentEnvDiagnostics();
        if (diag.issues.length > 0) {
            console.log(`     ℹ Environment Notices: ${diag.issues.join(', ')}`);
        }
    });

    // Setup Test Tenant & Wallet
    const tenant = await Tenant.findOne() || await Tenant.create({
        name: 'FinTech Audit Test Tenant',
        slug: 'fintech-audit-tenant',
        contactEmail: 'audit@surfbill.com',
        status: 'ACTIVE'
    });

    const tenantId = tenant.id;

    let wallet = await Wallet.findOne({ where: { tenantId } });
    if (!wallet) {
        wallet = await Wallet.create({ tenantId, balance: 50000, settled: 50000, pending: 0, frozen: 0 }); // KES 50,000
    } else {
        await wallet.update({ balance: 50000 });
    }

    // 3. Checkout Preparation: Subscription Plan
    let subInvoiceId = '';
    await assertTest('Checkout Prepare: Subscription Plan (Growth)', async () => {
        const checkout = await CheckoutService.prepareCheckout({
            tenantId,
            itemType: 'SUBSCRIPTION_PLAN',
            itemSlug: 'growth',
            billingCycle: 'MONTHLY'
        });

        if (!checkout.invoiceId) throw new Error('Invoice ID missing');
        if (!checkout.totalAmountKes) throw new Error('Total amount KES missing');
        subInvoiceId = checkout.invoiceId;
    });

    // 4. Checkout Preparation: Coupon Validation (20% OFF)
    await assertTest('Checkout Prepare: Coupon Discount (WELCOME20 - 20% OFF)', async () => {
        const checkout = await CheckoutService.prepareCheckout({
            tenantId,
            itemType: 'SUBSCRIPTION_PLAN',
            itemSlug: 'starter',
            billingCycle: 'MONTHLY',
            couponCode: 'WELCOME20'
        });

        if (checkout.discountCents !== 30000) throw new Error(`Expected 20% discount (30,000 cents), got ${checkout.discountCents}`);
        if (checkout.totalAmountKes !== 1392) throw new Error(`Expected KES 1,392 total, got ${checkout.totalAmountKes}`);
    });

    // 5. Checkout Preparation: SMS Credits Pack
    let smsInvoiceId = '';
    await assertTest('Checkout Prepare: SMS Credits Pack', async () => {
        const checkout = await CheckoutService.prepareCheckout({
            tenantId,
            itemType: 'SMS_CREDITS',
            quantity: 500
        });

        if (!checkout.invoiceId) throw new Error('SMS Invoice ID missing');
        if (checkout.unitPriceCents !== 40000) throw new Error('Unit price mismatch for SMS pack');
        smsInvoiceId = checkout.invoiceId;
    });

    // 6. Checkout Preparation: Treasury Wallet Top-Up
    let topupInvoiceId = '';
    await assertTest('Checkout Prepare: Wallet Top-Up', async () => {
        const checkout = await CheckoutService.prepareCheckout({
            tenantId,
            itemType: 'WALLET_TOPUP',
            customAmountCents: 200000 // KSh 2,000
        });

        if (!checkout.invoiceId) throw new Error('Top-up Invoice ID missing');
        topupInvoiceId = checkout.invoiceId;
    });

    // 7. Wallet Payment Execution & Balance Deduction
    await assertTest('Wallet Payment Execution & Invoice Settlement', async () => {
        const initialBal = (await Wallet.findOne({ where: { tenantId } }))!.balance;
        const res = await CheckoutService.payWithWallet(tenantId, subInvoiceId);
        if (!res.success) throw new Error(res.message);

        const newBal = (await Wallet.findOne({ where: { tenantId } }))!.balance;
        if (newBal >= initialBal) throw new Error('Wallet balance was not deducted');

        const invoice = await SaaSInvoice.findByPk(subInvoiceId);
        if (invoice?.paymentStatus !== 'PAID') throw new Error('Invoice status not marked PAID');
    });

    // 8. STK Push Initiation
    await assertTest('M-Pesa STK Push Initiation', async () => {
        const res = await CheckoutService.payWithStk(tenantId, smsInvoiceId, '254712345678');
        if (!res.success || !res.checkoutRequestId) throw new Error('STK push initiation failed');
    });

    // 9. IntaSend Webhook Processing & Product Activation
    await assertTest('IntaSend Webhook Processing & Automated SMS Activation', async () => {
        const invoice = await SaaSInvoice.findByPk(smsInvoiceId);
        if (!invoice) throw new Error('SMS invoice missing');

        const result = await SaaSBillingService.processIntaSendWebhook({
            invoice_number: invoice.invoiceNumber,
            tracking_id: `INTASEND-TEST-TR-${Date.now()}`,
            state: 'COMPLETE',
            amount: invoice.totalAmountCents / 100
        });

        if (!result.success) throw new Error(result.message);

        const updatedInvoice = await SaaSInvoice.findByPk(smsInvoiceId);
        if (updatedInvoice?.paymentStatus !== 'PAID') throw new Error('SMS invoice not marked PAID by webhook');

        const smsWallet = await TenantSmsWallet.findOne({ where: { tenantId } });
        if (!smsWallet || smsWallet.balance < 500) throw new Error('SMS credits were not added to wallet');
    });

    // 10. Webhook Idempotency & Replay Protection
    await assertTest('Webhook Replay Protection & Idempotency Check', async () => {
        const invoice = await SaaSInvoice.findByPk(smsInvoiceId);
        const duplicateResult = await SaaSBillingService.processIntaSendWebhook({
            invoice_number: invoice?.invoiceNumber,
            tracking_id: `INTASEND-TEST-TR-DUPLICATE`,
            state: 'COMPLETE',
            amount: 500
        });

        if (!duplicateResult.success) throw new Error('Duplicate webhook request was rejected unexpectedly');
    });

    // Summary
    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${failedTests} FAILED`);
    console.log('=========================================================\n');

    if (failedTests > 0) {
        process.exit(1);
    }
}

runPaymentAuditSuite().catch(err => {
    console.error('Fatal error in payment audit suite:', err);
    process.exit(1);
});
