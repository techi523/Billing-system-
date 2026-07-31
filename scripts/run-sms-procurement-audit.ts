import { sequelize, SmsFinancialLedger, SmsProcurementTask, SmsLedgerTransaction, TenantSmsWallet, Tenant } from '../src/models';
import { SmsProcurementService } from '../src/services/sms-procurement.service';
import logger from '../src/utils/logger';

async function runSmsProcurementAudit() {
    console.log('\n=========================================================');
    console.log('  SURFBILL AUTOMATED SMS PROCUREMENT & MARGIN PROTECTION AUDIT');
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

    // 1. Model Sync & Safe Table Initialization
    await assertTest('Database Connection & SMS Procurement Models Sync', async () => {
        await sequelize.authenticate();
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS sms_financial_ledgers (
                    id CHAR(36) PRIMARY KEY,
                    providerProcurementBalanceCents BIGINT DEFAULT 0,
                    reservedProfitBalanceCents BIGINT DEFAULT 0,
                    availableOperatingBalanceCents BIGINT DEFAULT 0,
                    smsInventoryBalanceCount INTEGER DEFAULT 0,
                    totalTenantRevenueCents BIGINT DEFAULT 0,
                    totalProcurementSpentCents BIGINT DEFAULT 0,
                    totalReservedProfitCents BIGINT DEFAULT 0,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            try { await sequelize.query("ALTER TABLE sms_financial_ledgers ADD COLUMN createdAt DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (_) {}
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS sms_procurement_tasks (
                    id CHAR(36) PRIMARY KEY,
                    procurementNumber VARCHAR(255) NOT NULL UNIQUE,
                    tenantId CHAR(36) NOT NULL,
                    invoiceId CHAR(36) NOT NULL,
                    packageId CHAR(36),
                    smsCount INTEGER NOT NULL,
                    amountPaidCents BIGINT NOT NULL,
                    providerCostCents BIGINT NOT NULL,
                    reservedProfitCents BIGINT NOT NULL,
                    executionMode VARCHAR(50) DEFAULT 'API',
                    procurementStatus VARCHAR(50) DEFAULT 'PENDING',
                    providerReference VARCHAR(255),
                    providerBalanceBeforeCents BIGINT DEFAULT 0,
                    providerBalanceAfterCents BIGINT DEFAULT 0,
                    procurementHash VARCHAR(255) NOT NULL,
                    failureReason TEXT,
                    verifiedAt DATETIME,
                    allocatedAt DATETIME,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS sms_ledger_transactions (
                    id CHAR(36) PRIMARY KEY,
                    procurementTaskId CHAR(36),
                    tenantId CHAR(36),
                    transactionType VARCHAR(50) NOT NULL,
                    amountCents BIGINT NOT NULL,
                    providerProcurementBalanceAfterCents BIGINT DEFAULT 0,
                    reservedProfitBalanceAfterCents BIGINT DEFAULT 0,
                    notes TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            try { await sequelize.query("ALTER TABLE sms_ledger_transactions ADD COLUMN updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP;"); } catch (_) {}
        } catch (_) { }
    });

    // Setup Test Tenant
    const testTenantId = 'test-tenant-sms-procurement-1';
    let tenant = await Tenant.findByPk(testTenantId);
    if (!tenant) {
        tenant = await Tenant.create({
            id: testTenantId,
            name: 'Test SMS Operator ISP',
            slug: 'test-sms-operator',
            subdomain: 'test-sms-operator',
            businessEmail: 'sms@testisp.co.ke',
            status: 'ACTIVE'
        });
    }

    // 2. Tenant SMS Purchase & Cost/Margin Separation
    let taskId = '';
    await assertTest('Tenant Purchase Processing & Atomic Margin Protection (KES 1,000 Paid)', async () => {
        const invoiceId = `INV-SMS-${Date.now()}`;
        const amountPaidCents = 100000; // KES 1,000.00
        const smsCount = 1000; // 1,000 SMS credits

        const result = await SmsProcurementService.processTenantSmsPurchase({
            tenantId: testTenantId,
            invoiceId,
            smsCount,
            amountPaidCents
        });

        if (!result.success) throw new Error('Procurement execution failed');
        if (result.task.providerCostCents !== 70000) throw new Error(`Provider cost mismatch (expected KES 700, got ${result.task.providerCostCents / 100})`);
        if (result.task.reservedProfitCents !== 30000) throw new Error(`Reserved profit mismatch (expected KES 300, got ${result.task.reservedProfitCents / 100})`);
        if (result.task.procurementStatus !== 'COMPLETED') throw new Error(`Status should be COMPLETED, got ${result.task.procurementStatus}`);

        taskId = result.task.id;
    });

    // 3. Financial Ledger Separation & Untouchable Profit Verification
    await assertTest('Financial Ledger Separation & Reserved Profit Verification', async () => {
        const ledger = await SmsProcurementService.getOrCreateLedger();
        if (ledger.reservedProfitBalanceCents < 30000) throw new Error('Reserved profit not locked in ledger');
        if (!ledger.totalTenantRevenueCents) throw new Error('Tenant revenue not tracked in ledger');
    });

    // 4. Duplicate Purchase Idempotency Protection
    await assertTest('Duplicate Purchase Idempotency & Replay Protection', async () => {
        const invoiceId = `INV-SMS-REPLAY`;
        const amountPaidCents = 50000;
        const smsCount = 500;

        const first = await SmsProcurementService.processTenantSmsPurchase({
            tenantId: testTenantId,
            invoiceId,
            smsCount,
            amountPaidCents
        });

        const second = await SmsProcurementService.processTenantSmsPurchase({
            tenantId: testTenantId,
            invoiceId,
            smsCount,
            amountPaidCents
        });

        if (first.task.id !== second.task.id) throw new Error('Duplicate purchase generated new task ID');
    });

    // 5. Failsafe Engine (Simulated Failure does NOT touch reserved profit)
    await assertTest('Failsafe Engine: Failed Procurement Leaves Profit Untouched', async () => {
        const initialLedger = await SmsProcurementService.getOrCreateLedger();
        const initialProfit = Number(initialLedger.reservedProfitBalanceCents);

        const failedTask = await SmsProcurementTask.create({
            procurementNumber: `PROC-FAIL-${Date.now()}`,
            tenantId: testTenantId,
            invoiceId: `INV-FAIL-${Date.now()}`,
            smsCount: 500,
            amountPaidCents: 50000,
            providerCostCents: 10000000, // Impossibly high provider cost exceeding balance
            reservedProfitCents: 15000,
            executionMode: 'API',
            procurementStatus: 'PENDING',
            procurementHash: `hash-fail-${Date.now()}`
        });

        const result = await SmsProcurementService.executeProcurement(failedTask.id);
        if (result.success) throw new Error('Failed task should not return success');

        const postLedger = await SmsProcurementService.getOrCreateLedger();
        if (Number(postLedger.reservedProfitBalanceCents) !== initialProfit) {
            throw new Error('Failsafe violated: Reserved profit was altered during failed procurement');
        }
    });

    // 6. Super Admin 1-Click Retry Execution
    await assertTest('Super Admin 1-Click Procurement Retry Engine', async () => {
        const retryTask = await SmsProcurementTask.create({
            procurementNumber: `PROC-RETRY-${Date.now()}`,
            tenantId: testTenantId,
            invoiceId: `INV-RETRY-${Date.now()}`,
            smsCount: 200,
            amountPaidCents: 20000,
            providerCostCents: 14000,
            reservedProfitCents: 6000,
            executionMode: 'API',
            procurementStatus: 'FAILED',
            procurementHash: `hash-retry-${Date.now()}`
        });

        // Fund procurement ledger for retry
        const ledger = await SmsProcurementService.getOrCreateLedger();
        await ledger.update({ providerProcurementBalanceCents: 50000 });

        const result = await SmsProcurementService.retryProcurement(retryTask.id);
        if (!result.success) throw new Error('Retry execution failed');
        if (result.task.procurementStatus !== 'COMPLETED') throw new Error('Retried task status is not COMPLETED');
    });

    // 7. Executive Financial Summary Metrics
    await assertTest('Executive SMS Procurement Financial Metrics Calculation', async () => {
        const summary = await SmsProcurementService.getFinancialSummary();
        if (summary.summary.totalRevenueKes <= 0) throw new Error('Total revenue KES is 0');
        if (summary.summary.totalReservedProfitKes <= 0) throw new Error('Total reserved profit KES is 0');
        if (summary.summary.profitMarginPercentage <= 0) throw new Error('Profit margin % is 0');
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runSmsProcurementAudit().catch(err => {
    console.error('Fatal SMS Procurement Audit Exception:', err);
    process.exit(1);
});
