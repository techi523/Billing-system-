import { PlatformBranding, Tenant } from '../models';
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
     * Get tenant white-label branding
     */
    static async getTenantBranding(tenantId: string) {
        const tenant = await Tenant.findByPk(tenantId);
        if (!tenant) throw new Error('Tenant not found');

        const platform = await this.getPlatformBranding();

        return {
            tenantId: tenant.id,
            businessName: tenant.name,
            subdomain: tenant.subdomain,
            logoUrl: tenant.logoUrl || platform.primaryLogoUrl,
            primaryColor: tenant.primaryColor || platform.primaryColor,
            contactPhone: tenant.contactPhone || platform.supportPhone,
            description: tenant.description || platform.platformDescription,
        };
    }
}
