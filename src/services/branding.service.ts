import { PlatformBranding, Tenant, TenantCaptivePortalBranding, AuditLog } from '../models';
import logger from '../utils/logger';

export class BrandingService {
    /**
     * Get or initialize global platform branding
     */
    static async getPlatformBranding(): Promise<PlatformBranding> {
        try {
            let branding = await PlatformBranding.findOne();
            if (!branding) {
                branding = await PlatformBranding.create({
                    platformName: 'SurfBill Pro',
                    platformTagline: 'Next-Gen Multi-Tenant WiFi Billing & ISP Management System',
                    platformDescription: 'Enterprise WiFi billing, MikroTik integration, bandwidth control, and M-Pesa automated payments for ISPs and hotspot owners.',
                    companyName: 'SurfBill Technologies Ltd',
                    supportPhone: '0714498996',
                    supportEmail: 'surfbill0@gmail.com',
                    websiteUrl: 'https://surfbill.com',
                    socialLinks: JSON.stringify({ twitter: '', facebook: '', linkedin: '', whatsapp: 'https://wa.me/254714498996' }),
                    businessAddress: 'Nairobi, Kenya',
                    copyrightInfo: '© 2026 SurfBill Technologies Ltd. All rights reserved.',
                    legalInfo: 'SurfBill is a registered SaaS billing platform for Internet Service Providers.',
                    primaryColor: '#0284c7',
                    secondaryColor: '#0f172a',
                    accentColor: '#38bdf8',
                    successColor: '#10b981',
                    warningColor: '#f59e0b',
                    dangerColor: '#ef4444',
                    sidebarColor: '#0f172a',
                    navColor: '#0284c7',
                    buttonColor: '#0284c7',
                    chartColor: '#0284c7',
                });
            }
            return branding;
        } catch (error) {
            logger.error('Failed to fetch platform branding', { error });
            throw error;
        }
    }

    /**
     * Update Super Admin global platform branding
     */
    static async updatePlatformBranding(data: Partial<PlatformBranding>): Promise<PlatformBranding> {
        let branding = await PlatformBranding.findOne();
        if (!branding) {
            branding = await this.getPlatformBranding();
        }
        await branding.update(data);
        logger.info('Platform branding updated by Super Admin');
        return branding;
    }

    /**
     * Get isolated Tenant Captive Portal Branding with system default fallbacks
     */
    static async getTenantCaptivePortalBranding(tenantIdOrIdentifier: string) {
        const platform = await this.getPlatformBranding();

        let tenant: Tenant | null = null;
        let brandingRecord: TenantCaptivePortalBranding | null = null;

        // 1. Resolve Tenant by ID, Subdomain, or Custom Domain
        tenant = await Tenant.findByPk(tenantIdOrIdentifier);
        if (!tenant) {
            tenant = await Tenant.findOne({ where: { subdomain: tenantIdOrIdentifier } });
        }

        if (tenant) {
            brandingRecord = await TenantCaptivePortalBranding.findOne({ where: { tenantId: tenant.id } });
        } else {
            // Check custom domain mapping
            brandingRecord = await TenantCaptivePortalBranding.findOne({ where: { customDomain: tenantIdOrIdentifier } });
            if (brandingRecord) {
                tenant = await Tenant.findByPk(brandingRecord.tenantId);
            }
        }

        const b = brandingRecord ? brandingRecord.toJSON() : {};
        const t = tenant ? tenant.toJSON() : {};

        return {
            tenantId: t.id || tenantIdOrIdentifier,
            businessName: b.businessName || t.name || platform.platformName || 'SurfBill Hotspot',
            tagline: b.tagline || t.tradingName || 'High-Speed Wi-Fi Access',
            description: b.description || t.description || platform.platformDescription,
            supportPhone: b.supportPhone || t.contactPhone || t.supportPhone || platform.supportPhone,
            supportEmail: b.supportEmail || t.businessEmail || t.supportEmail || platform.supportEmail,
            whatsappNumber: b.whatsappNumber || b.supportPhone || t.contactPhone || platform.supportPhone,
            websiteUrl: b.websiteUrl || t.website || platform.websiteUrl,
            physicalAddress: b.physicalAddress || t.businessAddress || platform.businessAddress,
            socialLinks: b.socialLinks ? JSON.parse(b.socialLinks) : { whatsapp: `https://wa.me/${(b.whatsappNumber || platform.supportPhone).replace(/\D/g, '')}` },
            
            // Logos with clean fallback ladder
            primaryLogoUrl: b.primaryLogoUrl || t.logoUrl || t.businessLogoUrl || platform.primaryLogoUrl,
            mobileLogoUrl: b.mobileLogoUrl || b.primaryLogoUrl || t.logoUrl || platform.primaryLogoUrl,
            darkModeLogoUrl: b.darkModeLogoUrl || b.primaryLogoUrl || t.logoUrl || platform.primaryLogoUrl,
            lightModeLogoUrl: b.lightModeLogoUrl || b.primaryLogoUrl || t.logoUrl || platform.primaryLogoUrl,
            faviconUrl: b.faviconUrl || platform.faviconUrl,
            footerLogoUrl: b.footerLogoUrl || b.primaryLogoUrl || platform.primaryLogoUrl,
            loginLogoUrl: b.loginLogoUrl || b.primaryLogoUrl || platform.primaryLogoUrl,
            welcomeScreenLogoUrl: b.welcomeScreenLogoUrl || b.primaryLogoUrl || platform.primaryLogoUrl,

            // Theme Color System
            primaryColor: b.primaryColor || t.primaryColor || platform.primaryColor || '#0284c7',
            secondaryColor: b.secondaryColor || platform.secondaryColor || '#0f172a',
            accentColor: b.accentColor || platform.accentColor || '#38bdf8',
            buttonColor: b.buttonColor || b.primaryColor || platform.buttonColor || '#0284c7',
            navColor: b.navColor || b.primaryColor || platform.navColor || '#0284c7',
            backgroundColor: b.backgroundColor || '#0f172a',
            footerColor: b.footerColor || b.primaryColor || platform.primaryColor || '#0284c7',
            textColor: b.textColor || '#ffffff',
            linkColor: b.linkColor || '#38bdf8',

            // Custom Messages
            welcomeMessage: b.welcomeMessage || 'Select an internet package below for instant network access.',
            headline: b.headline || `${b.businessName || t.name || 'SurfBill'} High-Speed Wi-Fi`,
            subheadline: b.subheadline || 'Instant M-Pesa Activation',
            termsConditions: b.termsConditions || 'Standard fair usage policies apply. Misuse may result in connection termination.',
            privacyNotice: b.privacyNotice || 'We respect your privacy. Connection details are encrypted.',
            supportInfo: b.supportInfo || `Contact Customer Support at ${b.supportPhone || platform.supportPhone}`,
            footerText: b.footerText || `© 2026 ${b.businessName || t.name || 'SurfBill Network'}. All rights reserved.`,
            copyrightText: b.copyrightText || `© 2026 ${b.businessName || t.name || 'SurfBill Network'}.`,
            loginInstructions: b.loginInstructions || 'Select a package or enter your voucher code to connect.',
            paymentInstructions: b.paymentInstructions || 'Enter M-Pesa phone number and accept STK Push prompt.',
            voucherInstructions: b.voucherInstructions || 'Enter your 8-digit pre-paid voucher code.',

            // Background Customization
            backgroundType: b.backgroundType || 'GRADIENT',
            backgroundUrl: b.backgroundUrl || null,
            backgroundVideoUrl: b.backgroundVideoUrl || null,
            gradientStartColor: b.gradientStartColor || '#0f172a',
            gradientEndColor: b.gradientEndColor || b.primaryColor || '#0284c7',
            backgroundBlur: b.backgroundBlur || 0,
            backgroundOverlayOpacity: b.backgroundOverlayOpacity || 0.2,
            mobileBackgroundUrl: b.mobileBackgroundUrl || b.backgroundUrl || null,

            // Domain & Package Controls
            customDomain: b.customDomain || null,
            pinnedPackageIds: b.pinnedPackageIds ? JSON.parse(b.pinnedPackageIds) : [],
            featuredPackageId: b.featuredPackageId || null,
            showPromotions: b.showPromotions !== undefined ? b.showPromotions : true,
            isApproved: b.isApproved !== undefined ? b.isApproved : true
        };
    }

    /**
     * Update Tenant Captive Portal Branding
     */
    static async updateTenantCaptivePortalBranding(tenantId: string, data: any) {
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) throw new Error('Tenant not found');

        let branding = await TenantCaptivePortalBranding.findOne({ where: { tenantId } });

        const payload = {
            ...data,
            tenantId,
            socialLinks: typeof data.socialLinks === 'object' ? JSON.stringify(data.socialLinks) : data.socialLinks,
            pinnedPackageIds: Array.isArray(data.pinnedPackageIds) ? JSON.stringify(data.pinnedPackageIds) : data.pinnedPackageIds
        };

        if (branding) {
            await branding.update(payload);
        } else {
            branding = await TenantCaptivePortalBranding.create(payload);
        }

        // Also update primary color on Tenant for core alignment
        if (data.primaryColor) {
            await tenant.update({ primaryColor: data.primaryColor });
        }

        await AuditLog.create({
            action: 'TENANT_BRANDING_UPDATED',
            details: `Captive Portal Branding updated for tenant ${tenant.name}`,
            tenantId
        });

        return this.getTenantCaptivePortalBranding(tenantId);
    }

    /**
     * Reset Tenant Captive Portal Branding to Defaults
     */
    static async resetTenantCaptivePortalBranding(tenantId: string) {
        await TenantCaptivePortalBranding.destroy({ where: { tenantId } });
        await AuditLog.create({
            action: 'TENANT_BRANDING_RESET',
            details: `Captive Portal Branding reset to defaults for tenant ${tenantId}`,
            tenantId
        });
        return this.getTenantCaptivePortalBranding(tenantId);
    }
}

