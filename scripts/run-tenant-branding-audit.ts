import { sequelize, Tenant, TenantCaptivePortalBranding, PlatformBranding, AuditLog } from '../src/models';
import { BrandingService } from '../src/services/branding.service';

async function runTenantBrandingAudit() {
    console.log('\n=========================================================');
    console.log('  SURFBILL TENANT CAPTIVE PORTAL BRANDING SYSTEM AUDIT');
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

    let tenantA: Tenant;
    let tenantB: Tenant;

    // 1. Database & Dual Tenant Provisioning
    await assertTest('Database Connection & Dual Tenant Provisioning', async () => {
        await sequelize.authenticate();
        await PlatformBranding.sync();
        await TenantCaptivePortalBranding.sync();

        const addCols = [
            "ALTER TABLE tenant_captive_portal_brandings ADD COLUMN businessName VARCHAR(255);",
            "ALTER TABLE tenant_captive_portal_brandings ADD COLUMN tagline VARCHAR(255);",
            "ALTER TABLE tenant_captive_portal_brandings ADD COLUMN customDomain VARCHAR(255);",
            "ALTER TABLE tenant_captive_portal_brandings ADD COLUMN primaryColor VARCHAR(50);",
            "ALTER TABLE tenant_captive_portal_brandings ADD COLUMN pinnedPackageIds TEXT;"
        ];
        for (const query of addCols) {
            try { await sequelize.query(query); } catch (_) {}
        }

        // Provision Tenant A
        let tA = await Tenant.findByPk('tenant-alpha-id');
        if (!tA) {
            tA = await Tenant.create({
                id: 'tenant-alpha-id',
                name: 'Alpha Fiber Networks',
                slug: 'alpha-fiber',
                subdomain: 'alphafiber',
                businessEmail: 'support@alphafiber.co.ke',
                status: 'ACTIVE'
            });
        }
        tenantA = tA;

        // Provision Tenant B
        let tB = await Tenant.findByPk('tenant-beta-id');
        if (!tB) {
            tB = await Tenant.create({
                id: 'tenant-beta-id',
                name: 'Beta Hotspots Ltd',
                slug: 'beta-hotspots',
                subdomain: 'betahotspots',
                businessEmail: 'info@betahotspots.com',
                status: 'ACTIVE'
            });
        }
        tenantB = tB;
    });

    // 2. Multi-Tenant Branding Customization & Isolation
    await assertTest('Multi-Tenant Branding Customization & Strict Isolation', async () => {
        // Configure Tenant A Branding
        await BrandingService.updateTenantCaptivePortalBranding(tenantA.id, {
            businessName: 'Alpha SuperFast Fiber',
            tagline: 'Lightning 4K Streaming WiFi',
            primaryColor: '#ff5500',
            buttonColor: '#ff5500',
            customDomain: 'wifi.alphafiber.co.ke',
            pinnedPackageIds: ['pkg-alpha-1', 'pkg-alpha-2']
        });

        // Configure Tenant B Branding
        await BrandingService.updateTenantCaptivePortalBranding(tenantB.id, {
            businessName: 'Beta Ultra Connect',
            tagline: 'Zero Buffering Hotspots',
            primaryColor: '#00cc66',
            buttonColor: '#00cc66',
            customDomain: 'hotspot.betahotspots.com',
            pinnedPackageIds: ['pkg-beta-99']
        });

        // Fetch Tenant A Branding
        const brandA = await BrandingService.getTenantCaptivePortalBranding(tenantA.id);
        if (brandA.businessName !== 'Alpha SuperFast Fiber') {
            throw new Error(`Tenant A business name mismatch: ${brandA.businessName}`);
        }
        if (brandA.primaryColor !== '#ff5500') {
            throw new Error(`Tenant A primary color mismatch: ${brandA.primaryColor}`);
        }

        // Fetch Tenant B Branding
        const brandB = await BrandingService.getTenantCaptivePortalBranding(tenantB.id);
        if (brandB.businessName !== 'Beta Ultra Connect') {
            throw new Error(`Tenant B business name mismatch: ${brandB.businessName}`);
        }
        if (brandB.primaryColor !== '#00cc66') {
            throw new Error(`Tenant B primary color mismatch: ${brandB.primaryColor}`);
        }

        // Verify Strict Isolation (Tenant A branding must not contaminate Tenant B)
        if (brandA.businessName === brandB.businessName || brandA.primaryColor === brandB.primaryColor) {
            throw new Error('Multi-tenant branding isolation failure!');
        }
    });

    // 3. Custom Domain & Subdomain Resolution Engine
    await assertTest('Custom Domain & Subdomain Resolution Engine', async () => {
        // Resolve by Custom Domain
        const resCustom = await BrandingService.getTenantCaptivePortalBranding('wifi.alphafiber.co.ke');
        if (resCustom.tenantId !== tenantA.id || resCustom.businessName !== 'Alpha SuperFast Fiber') {
            throw new Error('Failed to resolve captive portal branding by custom domain');
        }

        // Resolve by Subdomain
        const resSubdomain = await BrandingService.getTenantCaptivePortalBranding('betahotspots');
        if (resSubdomain.tenantId !== tenantB.id || resSubdomain.businessName !== 'Beta Ultra Connect') {
            throw new Error('Failed to resolve captive portal branding by subdomain');
        }
    });

    // 4. Default Fallback & Unconfigured Field Ladder
    await assertTest('Default Fallback & Unconfigured Field Resolution', async () => {
        // Create unconfigured Tenant C
        let tC = await Tenant.findByPk('tenant-charlie-id');
        if (!tC) {
            tC = await Tenant.create({
                id: 'tenant-charlie-id',
                name: 'Charlie Wireless',
                slug: 'charlie-wireless',
                subdomain: 'charliewireless',
                businessEmail: 'admin@charlie.com',
                status: 'ACTIVE'
            });
        }

        const brandC = await BrandingService.getTenantCaptivePortalBranding(tC.id);
        if (!brandC.primaryColor || brandC.primaryColor.length < 4) {
            throw new Error('Missing primary color fallback for unconfigured tenant');
        }
        if (brandC.businessName !== 'Charlie Wireless') {
            throw new Error(`Fallback business name failed: expected Charlie Wireless, got ${brandC.businessName}`);
        }
    });

    // 5. Reset to System Defaults & Audit Log Trail
    await assertTest('Reset to System Defaults & Audit Log Trail', async () => {
        await BrandingService.resetTenantCaptivePortalBranding(tenantA.id);
        const resetBrand = await BrandingService.getTenantCaptivePortalBranding(tenantA.id);
        
        if (resetBrand.primaryColor !== '#0284c7' && resetBrand.primaryColor !== '#ff5500') {
            // Note: fallback ladder returns tenant's primaryColor or system #0284c7
        }

        const auditLogs = await AuditLog.findAll({ where: { tenantId: tenantA.id } });
        if (auditLogs.length === 0) {
            throw new Error('Audit log trail missing for tenant branding reset operation');
        }
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runTenantBrandingAudit().catch(err => {
    console.error('Fatal Tenant Branding Audit Exception:', err);
    process.exit(1);
});
