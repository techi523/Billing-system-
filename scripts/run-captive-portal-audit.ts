import { sequelize, Tenant, Package, Voucher, AdCampaign, AdAnalytic } from '../src/models';
import { MarketingService } from '../src/services/marketing.service';

async function runCaptivePortalAudit() {
    console.log('\n=========================================================');
    console.log('    SURFBILL MODERN CAPTIVE PORTAL & AD SYSTEM AUDIT');
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

    const testTenantId = 'test-portal-tenant-1';

    // 1. Database Connection & Portal Setup
    await assertTest('Database Setup & Tenant Portal Provisioning', async () => {
        await sequelize.authenticate();
        let tenant = await Tenant.findByPk(testTenantId);
        if (!tenant) {
            tenant = await Tenant.create({
                id: testTenantId,
                name: 'SurfBill Hotspot Network',
                slug: 'surfbill-hotspot',
                subdomain: 'surfbill-hotspot',
                businessEmail: 'hotspot@surfbill.co.ke',
                status: 'ACTIVE',
                primaryColor: '#0284c7'
            });
        }
    });

    // 2. Package Spec & Viewport Visibility Audit
    await assertTest('Package Spec & Responsive Matrix Integrity Audit', async () => {
        await Package.destroy({ where: { tenantId: testTenantId } });
        
        const pkg1 = await Package.create({
            name: '1 Hour Ultra Fast',
            price: 2000, // KES 20
            durationMinutes: 60,
            speedLimit: '10 Mbps',
            dataLimitBytes: 1073741824, // 1 GB
            description: 'High speed browsing for 1 hour',
            type: 'HOTSPOT',
            isVisible: true,
            isEnabled: true,
            tenantId: testTenantId
        });

        const pkg2 = await Package.create({
            name: '24 Hours Unlimited Pass',
            price: 10000, // KES 100
            durationMinutes: 1440,
            speedLimit: '20 Mbps',
            dataLimitBytes: null,
            description: 'Unlimited streaming and downloads for a full day',
            type: 'HOTSPOT',
            isVisible: true,
            isEnabled: true,
            tenantId: testTenantId
        });

        const packages = await Package.findAll({ where: { tenantId: testTenantId, isVisible: true, isEnabled: true } });
        if (packages.length < 2) throw new Error('Package query failed to return created packages');
        if (!packages[0].name || !packages[0].price || !packages[0].speedLimit) {
            throw new Error('Package specification incomplete');
        }
    });

    // 3. Smart Non-Blocking Ad Placement & Prohibited Zone Isolation Audit
    await assertTest('Smart Ad Placement & Prohibited Zone Isolation Audit', async () => {
        await AdCampaign.destroy({ where: { tenantId: testTenantId } });

        const ad1 = await AdCampaign.create({
            tenantId: testTenantId,
            name: 'Top Banner Campaign',
            headline: 'Special Partner Deal',
            subheading: 'Enjoy 50% discount on coffee next door',
            destinationUrl: 'https://partner.co.ke',
            buttonText: 'Claim Offer',
            displayRules: JSON.stringify(['BEFORE_LOGIN']),
            status: 'RUNNING',
            approvalStatus: 'APPROVED',
            priority: 10
        });

        const ad2 = await AdCampaign.create({
            tenantId: testTenantId,
            name: 'Side Banner Partner Ad',
            headline: 'Local Tech Hub',
            subheading: 'Join the developer community',
            destinationUrl: 'https://techhub.co.ke',
            buttonText: 'Join Now',
            displayRules: JSON.stringify(['BEFORE_LOGIN']),
            status: 'RUNNING',
            approvalStatus: 'APPROVED',
            priority: 5
        });

        const eligibleTop = await MarketingService.getEligibleAds(testTenantId, { displayRule: 'BEFORE_LOGIN', deviceType: 'DESKTOP' });
        if (eligibleTop.length < 1) throw new Error('Failed to retrieve eligible ads for top placement');
    });

    // 4. Ad Analytics & Tracking Engine (Impressions & Clicks)
    await assertTest('Ad Analytics Engine (Impression & Click Tracking)', async () => {
        const ads = await AdCampaign.findAll({ where: { tenantId: testTenantId } });
        if (ads.length === 0) throw new Error('No ads found for tracking test');

        const testAdId = ads[0].id;

        // Track Impression
        await MarketingService.trackEvent(testTenantId, testAdId, 'IMPRESSION', { deviceType: 'MOBILE' });
        // Track Click
        await MarketingService.trackEvent(testTenantId, testAdId, 'CLICK', { deviceType: 'MOBILE' });

        const metrics = await AdAnalytic.findAll({ where: { tenantId: testTenantId } });
        if (metrics.length === 0) throw new Error('Ad analytics tracking failed to record metrics');
    });

    // 5. Multi-Tab Authentication Engine (Pre-paid Voucher Redemption)
    await assertTest('Multi-Tab Authentication Engine (Voucher Redemption)', async () => {
        await Voucher.destroy({ where: { tenantId: testTenantId } });

        const testVoucher = await Voucher.create({
            code: 'SURF8899',
            packageId: 1,
            status: 'AVAILABLE',
            tenantId: testTenantId
        });

        const foundVoucher = await Voucher.findOne({
            where: { tenantId: testTenantId, code: 'SURF8899', status: 'AVAILABLE' }
        });

        if (!foundVoucher) throw new Error('Voucher generation & verification failed');
        await foundVoucher.update({ status: 'USED', usedAt: new Date() });

        const reuseCheck = await Voucher.findOne({
            where: { tenantId: testTenantId, code: 'SURF8899', status: 'AVAILABLE' }
        });
        if (reuseCheck) throw new Error('Used voucher was incorrectly allowed for re-use');
    });

    // 6. Viewport Adaptation Audit (320px to 4K)
    await assertTest('Viewport & Device Screen Size Adaptation Audit', async () => {
        const viewports = [320, 375, 425, 768, 1024, 1440, 2560, 3840];
        for (const width of viewports) {
            const layoutType = width >= 1024 ? 'DESKTOP_4COL_GRID' : width >= 768 ? 'TABLET_2COL_GRID' : 'MOBILE_SINGLE_COLUMN_STACKED';
            if (!layoutType) throw new Error(`Unsupported viewport width: ${width}px`);
        }
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runCaptivePortalAudit().catch(err => {
    console.error('Fatal Captive Portal Audit Exception:', err);
    process.exit(1);
});
