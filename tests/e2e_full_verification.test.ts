import { Tenant, Package, Router as RouterModel, AdCampaign, MediaItem, MarketingCoupon, QRCampaign, AdAnalytic } from '../src/models';
import { MarketingService } from '../src/services/marketing.service';
import { AggregatorService } from '../src/services/aggregator.service';

describe('SurfBill End-to-End Real Data & Integration Audit Suite', () => {

    const testTenantId = 'e2e-tenant-0000-0000-0000-000000000001';

    beforeAll(async () => {
        // Clean up test data if existing
        await AdAnalytic.destroy({ where: { tenantId: testTenantId } });
        await MarketingCoupon.destroy({ where: { tenantId: testTenantId } });
        await QRCampaign.destroy({ where: { tenantId: testTenantId } });
        await AdCampaign.destroy({ where: { tenantId: testTenantId } });
        await Package.destroy({ where: { tenantId: testTenantId } });
        await Tenant.destroy({ where: { id: testTenantId } });

        // Seed clean tenant
        await Tenant.create({
            id: testTenantId,
            name: 'E2E Test ISP Tenant',
            subdomain: `e2e-test-${Date.now()}`,
            primaryColor: '#3b82f6',
            status: 'ACTIVE',
            isProduction: true
        });
    });

    afterAll(async () => {
        // Cleanup after suite
        await AdAnalytic.destroy({ where: { tenantId: testTenantId } });
        await MarketingCoupon.destroy({ where: { tenantId: testTenantId } });
        await QRCampaign.destroy({ where: { tenantId: testTenantId } });
        await AdCampaign.destroy({ where: { tenantId: testTenantId } });
        await Package.destroy({ where: { tenantId: testTenantId } });
        await Tenant.destroy({ where: { id: testTenantId } });
    });

    test('1. Database Tenant Read/Write Verification', async () => {
        const tenant = await Tenant.findByPk(testTenantId);
        expect(tenant).not.toBeNull();
        expect(tenant?.name).toBe('E2E Test ISP Tenant');
        expect(tenant?.status).toBe('ACTIVE');
    });

    test('2. Package Creation & Database Persistence', async () => {
        const pkg = await Package.create({
            tenantId: testTenantId,
            name: 'E2E 24-Hour Unlimited Pass',
            price: 5000, // KES 50.00
            durationMinutes: 1440,
            type: 'HOTSPOT',
            isEnabled: true,
            isVisible: true
        });

        expect(pkg.id).toBeDefined();

        const fetchedPkg = await Package.findByPk(pkg.id);
        expect(fetchedPkg?.name).toBe('E2E 24-Hour Unlimited Pass');
        expect(fetchedPkg?.price).toBe(5000);
    });

    test('3. Captive Portal Advertisement Campaign Lifecycle', async () => {
        // Create Campaign
        const campaign = await AdCampaign.create({
            tenantId: testTenantId,
            name: 'E2E Summer Banner Ad',
            campaignType: 'IMAGE_BANNER',
            headline: 'Special 50% Off WiFi Pass',
            buttonText: 'Claim Discount',
            destinationUrl: 'https://example.com/promo',
            priority: 5,
            status: 'RUNNING',
            approvalStatus: 'APPROVED',
            displayRules: JSON.stringify(['BEFORE_LOGIN'])
        });

        expect(campaign.id).toBeDefined();

        // Query eligible ads via AdMatchingEngine
        const eligibleAds = await MarketingService.getEligibleAds(testTenantId, {
            displayRule: 'BEFORE_LOGIN',
            deviceType: 'DESKTOP'
        });

        expect(eligibleAds.length).toBeGreaterThan(0);
        expect(eligibleAds[0].id).toBe(campaign.id);
        expect(eligibleAds[0].headline).toBe('Special 50% Off WiFi Pass');
    });

    test('4. Real Impression & Click Analytics Tracking', async () => {
        const campaign = await AdCampaign.findOne({ where: { tenantId: testTenantId } });
        expect(campaign).not.toBeNull();

        // Track 10 impressions and 2 clicks in database
        for (let i = 0; i < 10; i++) {
            await MarketingService.trackEvent(testTenantId, campaign!.id, 'IMPRESSION', { deviceType: 'MOBILE' });
        }
        for (let i = 0; i < 2; i++) {
            await MarketingService.trackEvent(testTenantId, campaign!.id, 'CLICK', { deviceType: 'MOBILE' });
        }

        const metrics = await MarketingService.getCampaignMetrics(testTenantId, campaign!.id);

        expect(metrics.impressions).toBe(10);
        expect(metrics.clicks).toBe(2);
        expect(metrics.ctr).toBe(20.00); // 2/10 * 100 = 20%
    });

    test('5. Coupon Code & QR Code Database Lifecycle', async () => {
        const code = MarketingService.generateCouponCode('E2E');
        const qrUrl = MarketingService.generateQRCodeDataUrl(code);

        const coupon = await MarketingCoupon.create({
            tenantId: testTenantId,
            couponCode: code,
            discountType: 'PERCENTAGE',
            discountValue: 25,
            validityDays: 14,
            maxUses: 50,
            currentUses: 0,
            qrCodeUrl: qrUrl,
            status: 'ACTIVE'
        });

        expect(coupon.couponCode).toBe(code);
        expect(coupon.qrCodeUrl).toContain('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=');

        // Verify database persistence
        const found = await MarketingCoupon.findOne({ where: { tenantId: testTenantId, couponCode: code } });
        expect(found).not.toBeNull();
        expect(found?.discountValue).toBe(25);
    });

    test('6. Non-Blocking Captive Portal Ad Fallback Safety', async () => {
        // Query ads for a non-existent tenant or invalid display rule
        const fallbackAds = await MarketingService.getEligibleAds('non-existent-tenant-id', {
            displayRule: 'BEFORE_LOGIN'
        });

        // Must return empty array without crashing or throwing
        expect(Array.isArray(fallbackAds)).toBe(true);
        expect(fallbackAds.length).toBe(0);
    });
});
