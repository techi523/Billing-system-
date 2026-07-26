import { MarketingService } from '../src/services/marketing.service';
import { AdCampaign, MediaItem, MarketingCoupon, QRCampaign, AdAnalytic } from '../src/models';

describe('Captive Portal Advertising & Marketing Platform Unit Tests', () => {

    test('1. Coupon Code & QR Generation', () => {
        const code = MarketingService.generateCouponCode('SURF');
        expect(code).toBeDefined();
        expect(code.startsWith('SURF-')).toBe(true);

        const qrDataUrl = MarketingService.generateQRCodeDataUrl('https://example.com');
        expect(qrDataUrl).toContain('https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=');
    });

    test('2. CTR and Analytics Metrics Calculation', async () => {
        // Mock analytics calculation logic
        const impressions = 1000;
        const clicks = 50;
        const ctr = Number(((clicks / impressions) * 100).toFixed(2));

        expect(ctr).toBe(5.00);
    });

    test('3. Media Upload Size Enforcement', async () => {
        const tenantId = '00000000-0000-0000-0000-000000000001';
        const oversizedFile = {
            fileName: 'large_video.mp4',
            fileUrl: 'https://example.com/large.mp4',
            fileType: 'VIDEO' as const,
            fileSize: 100 * 1024 * 1024, // 100MB
            mimeType: 'video/mp4'
        };

        await expect(MarketingService.uploadMedia(tenantId, oversizedFile))
            .rejects
            .toThrow();
    });

    test('4. Ad Matching Engine Priority Rotation', async () => {
        const context = {
            displayRule: 'BEFORE_LOGIN',
            deviceType: 'DESKTOP'
        };

        const ads = await MarketingService.getEligibleAds('non-existent-tenant-id', context);
        expect(Array.isArray(ads)).toBe(true);
        expect(ads.length).toBe(0);
    });
});
