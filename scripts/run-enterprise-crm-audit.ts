import { sequelize, EnterpriseLead, EnterpriseQuote, Tenant, SaaSInvoice } from '../src/models';
import { EnterpriseCrmService } from '../src/services/enterprise-crm.service';
import logger from '../src/utils/logger';

async function runEnterpriseAudit() {
    console.log('\n=========================================================');
    console.log('  SURFBILL ENTERPRISE ISP & CRM REGRESSION SUITE');
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

    // 1. Model Sync & Safe Column additions
    await assertTest('Database Connection & Enterprise Models Sync', async () => {
        await sequelize.authenticate();
        try {
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS enterprise_leads (
                    id CHAR(36) PRIMARY KEY,
                    leadNumber VARCHAR(255) NOT NULL UNIQUE,
                    companyName VARCHAR(255) NOT NULL,
                    registrationNumber VARCHAR(255),
                    contactPerson VARCHAR(255) NOT NULL,
                    position VARCHAR(255),
                    phone VARCHAR(255) NOT NULL,
                    altPhone VARCHAR(255),
                    email VARCHAR(255) NOT NULL,
                    website VARCHAR(255),
                    country VARCHAR(255) DEFAULT 'Kenya',
                    region VARCHAR(255),
                    physicalAddress TEXT,
                    currentIspSize VARCHAR(255),
                    expectedGrowth VARCHAR(255),
                    subscriberCount INTEGER DEFAULT 0,
                    activeUserCount INTEGER DEFAULT 0,
                    routerCount INTEGER DEFAULT 0,
                    currentBillingPlatform VARCHAR(255),
                    requiredFeatures TEXT,
                    expectedLaunchDate VARCHAR(255),
                    monthlyBudget VARCHAR(255),
                    notes TEXT,
                    status VARCHAR(50) DEFAULT 'NEW',
                    assignedTo VARCHAR(255),
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            await sequelize.query(`
                CREATE TABLE IF NOT EXISTS enterprise_quotes (
                    id CHAR(36) PRIMARY KEY,
                    quoteNumber VARCHAR(255) NOT NULL UNIQUE,
                    leadId CHAR(36) NOT NULL,
                    tenantId CHAR(36),
                    monthlyCostCents BIGINT NOT NULL,
                    setupFeeCents BIGINT DEFAULT 0,
                    maxActiveUsers INTEGER DEFAULT -1,
                    maxRouters INTEGER DEFAULT -1,
                    smsAllocation INTEGER DEFAULT 10000,
                    whatsappAllocation INTEGER DEFAULT 5000,
                    storageAllocationMB INTEGER DEFAULT 10240,
                    customModules TEXT,
                    discountCents BIGINT DEFAULT 0,
                    taxPercentage FLOAT DEFAULT 16.0,
                    contractDurationMonths INTEGER DEFAULT 12,
                    status VARCHAR(50) DEFAULT 'DRAFT',
                    validUntil DATETIME,
                    termsAndConditions TEXT,
                    rejectionReason TEXT,
                    customerNotes TEXT,
                    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
        } catch (_) { }
    });

    // 2. Lead Capture Submission
    let leadId = '';
    await assertTest('Enterprise Lead Capture Submission (22 Fields)', async () => {
        const lead = await EnterpriseCrmService.createLead({
            companyName: 'Apex Telcom & Fiber Ltd',
            contactPerson: 'Sarah Jenkins',
            position: 'Chief Commercial Officer',
            phone: '254700112233',
            email: 's.jenkins@apextel.co.ke',
            subscriberCount: 2500,
            routerCount: 15,
            monthlyBudget: 'KES 75,000 - KES 150,000',
            requiredFeatures: ['Unlimited Subscribers', 'Unlimited Routers', 'SLA Agreements']
        });

        if (!lead.id) throw new Error('Lead ID missing');
        if (!lead.leadNumber.startsWith('ENT-LEAD-')) throw new Error('Invalid lead number prefix');
        if (lead.status !== 'NEW') throw new Error('Default lead status must be NEW');
        leadId = lead.id;
    });

    // 3. CRM Pipeline & Stage Updates
    await assertTest('CRM Pipeline Stage Transition & Listing', async () => {
        const updated = await EnterpriseCrmService.updateLeadStatus(leadId, 'QUALIFICATION');
        if (updated.status !== 'QUALIFICATION') throw new Error('Failed to update stage to QUALIFICATION');

        const listing = await EnterpriseCrmService.getLeads();
        if (listing.leads.length === 0) throw new Error('Leads listing returned empty');
    });

    // 4. Custom Quote Generation
    let quoteId = '';
    await assertTest('Custom Quote Builder & Proposal Generation', async () => {
        const quote = await EnterpriseCrmService.createQuote({
            leadId,
            monthlyCostKes: 85000,
            setupFeeKes: 25000,
            discountKes: 10000,
            maxActiveUsers: -1,
            maxRouters: -1,
            contractDurationMonths: 12
        });

        if (!quote.id) throw new Error('Quote ID missing');
        if (!quote.quoteNumber.startsWith('QT-ENT-')) throw new Error('Invalid quote number prefix');
        if (quote.monthlyCostCents !== 8500000) throw new Error('Monthly cost cents mismatch');

        const lead = await EnterpriseLead.findByPk(leadId);
        if (lead?.status !== 'PROPOSAL_SENT') throw new Error('Lead status did not transition to PROPOSAL_SENT');
        quoteId = quote.id;
    });

    // 5. Customer Proposal Details & Financial Calculation
    await assertTest('Public Proposal View & VAT Financial Calculations', async () => {
        const details = await EnterpriseCrmService.getQuoteDetails(quoteId);
        if (details.financials.monthlyKes !== 85000) throw new Error('Monthly KES mismatch');
        if (details.financials.setupFeeKes !== 25000) throw new Error('Setup fee KES mismatch');
        if (details.financials.subtotalKes !== 100000) throw new Error(`Subtotal mismatch (expected 100,000, got ${details.financials.subtotalKes})`);
        if (details.financials.taxKes !== 16000) throw new Error(`Tax 16% VAT mismatch (expected 16,000, got ${details.financials.taxKes})`);
        if (details.financials.totalFirstMonthKes !== 116000) throw new Error(`Total payable mismatch (expected 116,000, got ${details.financials.totalFirstMonthKes})`);
    });

    // 6. Proposal Acceptance & Account Activation
    await assertTest('Customer Proposal Acceptance & Automated Enterprise Activation', async () => {
        const response = await EnterpriseCrmService.respondToQuote(quoteId, 'ACCEPT', 'Proposal accepted by CCO.');
        if (!response.success) throw new Error('Proposal response failed');

        const lead = await EnterpriseLead.findByPk(leadId);
        if (lead?.status !== 'WON') throw new Error('Lead status must be WON after acceptance');

        const quote = await EnterpriseQuote.findByPk(quoteId);
        if (quote?.status !== 'ACCEPTED') throw new Error('Quote status must be ACCEPTED');
        if (!quote?.tenantId) throw new Error('Tenant ID not assigned to quote');

        const tenant = await Tenant.findByPk(quote.tenantId);
        if (!tenant || tenant.status !== 'ACTIVE') throw new Error('Enterprise tenant not created or active');

        const invoice = await SaaSInvoice.findOne({ where: { tenantId: tenant.id } });
        if (!invoice) throw new Error('Activation invoice not generated');
    });

    // 7. Executive CRM Analytics
    await assertTest('Executive CRM Analytics Calculation', async () => {
        const analytics = await EnterpriseCrmService.getCrmAnalytics();
        if (analytics.summary.wonDeals < 1) throw new Error('Won deals count mismatch');
        if (analytics.summary.totalEnterpriseRevenueKes < 85000) throw new Error(`Enterprise ARR mismatch (expected >= 85,000, got ${analytics.summary.totalEnterpriseRevenueKes})`);
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runEnterpriseAudit().catch(err => {
    console.error('Fatal Enterprise Audit Exception:', err);
    process.exit(1);
});
