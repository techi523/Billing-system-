import crypto from 'crypto';
import { Router as RouterModel, Tenant, RouterConnectionLog } from '../models';
import { MikroTikService } from './mikrotik.service';
import logger from '../utils/logger';
import http from 'http';

export class MikroTikAutoConfigService {
    /**
     * Generate unique API credentials for a router
     */
    private static generateApiCredentials(tenantId: string, routerId: string): { apiUser: string; apiPassword: string } {
        const apiUser = `surfbill_${tenantId.substring(0, 8)}_${routerId.substring(0, 8)}`;
        const apiPassword = crypto.randomBytes(16).toString('hex');
        return { apiUser, apiPassword };
    }

    /**
     * Get the billing system's public IP for firewall rules.
     * RouterOS src-address requires an IP, not a domain name.
     */
    private static async getBillingServerIP(): Promise<string> {
        const appUrl = process.env.APP_URL || 'http://localhost:3010';
        const hostname = new URL(appUrl).hostname;

        if (/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(hostname)) {
            return hostname;
        }

        try {
            const dns = await import('dns');
            const { promisify } = await import('util');
            const resolve4 = promisify(dns.resolve4);
            const addresses = await resolve4(hostname);
            if (addresses.length > 0) return addresses[0];
        } catch { }

        return new Promise((resolve) => {
            http.get('http://ifconfig.me', (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve(data.trim()));
            }).on('error', () => resolve('0.0.0.0'));
        });
    }

    /**
     * Generate auto-configuration script for a router
     */
    static async generateAutoConfigScript(
        router: RouterModel,
        tenant: Tenant,
        version: 'v6' | 'v7' = 'v7'
    ): Promise<string> {
        const { apiUser, apiPassword } = this.generateApiCredentials(tenant.id, router.id);
        const billingHost = (await this.getBillingServerIP()).trim();

        await router.update({
            apiUser,
            apiPassword,
            username: apiUser,
            password: apiPassword,
            autoConfigStatus: 'PENDING'
        });

        const script = version === 'v7' ? this.generateV7Script(router, tenant, apiUser, apiPassword, billingHost)
            : this.generateV6Script(router, tenant, apiUser, apiPassword, billingHost);

        await router.update({ autoConfigScript: script });

        await RouterConnectionLog.create({
            routerId: router.id,
            tenantId: tenant.id,
            action: 'CONNECT',
            status: 'PENDING',
            details: `Auto-config script generated for RouterOS ${version}`,
            metadata: JSON.stringify({ version, apiUser })
        });

        return script;
    }

    /**
     * Generate RouterOS v7 configuration script.
     * All commands are single-line for reliable paste into Winbox terminal.
     */
    private static generateV7Script(
        router: RouterModel,
        tenant: Tenant,
        apiUser: string,
        apiPassword: string,
        billingHost: string
    ): string {
        const tenantName = tenant.name.replace(/[^a-zA-Z0-9]/g, '_');
        const tenantSubdomain = tenant.subdomain || tenantName.toLowerCase();

        return `# ============================================================
# SurfBill Auto-Configuration Script (RouterOS v7)
# ============================================================
# Tenant: ${tenant.name}
# Router: ${router.name}
# Generated: ${new Date().toISOString()}
# Server IP: ${billingHost}
# ============================================================
# INSTRUCTIONS:
# 1. Open MikroTik Winbox
# 2. Go to New Terminal
# 3. Copy ALL commands below and paste, then press Enter
# ============================================================

# STEP 1: Create API User Group (Least Privilege)
/user group add name=surfbill_api policy=api,read,write,test comment="SurfBill API group"

# STEP 2: Create API User
/user add name="${apiUser}" password="${apiPassword}" group=surfbill_api comment="SurfBill Billing System API"

# STEP 3: Firewall - Allow API Access from Billing Server
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=${billingHost} action=accept comment="SurfBill API Access"

# STEP 4: Create Hotspot Profile
/ip hotspot profile add name="SurfBill_${tenantSubdomain}" login-by=http-chap,http-pap,mac use-radius=no dns-name="${tenantSubdomain}.surfbill.link" hotspot-address=10.5.50.1

# STEP 5: Walled Garden - Payment Gateways
/ip hotspot walled-garden add dst-host="intasend.com" comment="IntaSend Payments"
/ip hotspot walled-garden add dst-host="api.intasend.com" comment="IntaSend API"
/ip hotspot walled-garden add dst-host="iframe.intasend.com" comment="IntaSend Checkout"

# STEP 6: Walled Garden - M-Pesa
/ip hotspot walled-garden add dst-host="safaricom.co.ke" comment="Safaricom M-Pesa"
/ip hotspot walled-garden add dst-host="mpesa.co.ke" comment="M-Pesa Portal"

# STEP 7: Walled Garden - Billing System
/ip hotspot walled-garden add dst-host="surfbill.net" comment="SurfBill Platform"
/ip hotspot walled-garden add dst-host="surfbill.link" comment="SurfBill Hotspot Portal"

# STEP 8: Walled Garden - DNS & CDN
/ip hotspot walled-garden add dst-host="googleapis.com" comment="Google APIs"
/ip hotspot walled-garden add dst-host="cloudflare.com" comment="Cloudflare"

# STEP 9: Create SurfBill Default User Profile
/ip hotspot user profile add name="SurfBill_Default" shared-users=1 rate-limit=512k/512k status-autorefresh=1m

# STEP 10: Scheduler Scripts
/system script add name=SurfBill_Sync source=":log info \"SurfBill sync\""
/system scheduler add name=SurfBill_Sync interval=5m on-event=SurfBill_Sync comment="SurfBill Auto-Sync"
/system script add name=SurfBill_Cleanup source=":log info \"SurfBill cleanup\""
/system scheduler add name=SurfBill_Cleanup interval=1d start-time=02:00:00 on-event=SurfBill_Cleanup comment="SurfBill Daily Cleanup"

# STEP 11: Set Router Identity
/system identity set name="SurfBill_${tenantName}_${router.name}"

# ============================================================
# CONFIGURATION COMPLETE
# Next: Return to SurfBill dashboard and click "Verify Connection"
# ============================================================`;
    }

    /**
     * Generate RouterOS v6 configuration script (Legacy)
     */
    private static generateV6Script(
        router: RouterModel,
        tenant: Tenant,
        apiUser: string,
        apiPassword: string,
        billingHost: string
    ): string {
        const tenantName = tenant.name.replace(/[^a-zA-Z0-9]/g, '_');
        const tenantSubdomain = tenant.subdomain || tenantName.toLowerCase();

        return `# ============================================================
# SurfBill Auto-Configuration Script (RouterOS v6)
# ============================================================
# Tenant: ${tenant.name}
# Router: ${router.name}
# Generated: ${new Date().toISOString()}
# Server IP: ${billingHost}
# ============================================================
# INSTRUCTIONS:
# 1. Open MikroTik Winbox
# 2. Go to New Terminal
# 3. Copy ALL commands below and paste, then press Enter
# ============================================================

# STEP 1: Create API User Group
/user group add name=surfbill_api policy=api,read,write,test comment="SurfBill API group"

# STEP 2: Create API User
/user add name="${apiUser}" password="${apiPassword}" group=surfbill_api comment="SurfBill API"

# STEP 3: Firewall - Allow API Access
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=${billingHost} action=accept comment="SurfBill API Access" place-before=0

# STEP 4: Create Hotspot Profile
/ip hotspot profile add name="SurfBill_${tenantSubdomain}" login-by=http-chap,http-pap,mac use-radius=no dns-name="${tenantSubdomain}.surfbill.link" hotspot-address=10.5.50.1

# STEP 5: Walled Garden - Payment Gateways
/ip hotspot walled-garden add dst-host="intasend.com" comment="IntaSend"
/ip hotspot walled-garden add dst-host="api.intasend.com" comment="IntaSend API"

# STEP 6: Walled Garden - M-Pesa
/ip hotspot walled-garden add dst-host="safaricom.co.ke" comment="M-Pesa"

# STEP 7: Walled Garden - Billing System
/ip hotspot walled-garden add dst-host="surfbill.net" comment="SurfBill"

# STEP 8: Create SurfBill Default User Profile
/ip hotspot user profile add name="SurfBill_Default" shared-users=1 rate-limit=512k/512k status-autorefresh=1m

# STEP 9: Scheduler Scripts
/system script add name=SurfBill_Sync source=":log info \"SurfBill sync\""
/system scheduler add name=SurfBill_Sync interval=5m on-event=SurfBill_Sync comment="SurfBill Auto-Sync"

# STEP 10: Set Identity
/system identity set name="SurfBill_${tenantName}_${router.name}"

# ============================================================
# CONFIGURATION COMPLETE
# ============================================================`;
    }

    /**
     * Verify router configuration after script execution
     */
    static async verifyConfiguration(router: RouterModel, userId?: string): Promise<{
        success: boolean;
        message: string;
        details?: any;
    }> {
        try {
            const testResult = await MikroTikService.testConnection(router);

            if (!testResult.status) {
                await router.update({
                    autoConfigStatus: 'FAILED',
                    autoConfigError: testResult.message
                });

                await RouterConnectionLog.create({
                    routerId: router.id,
                    tenantId: router.tenantId,
                    action: 'VERIFY',
                    status: 'FAILED',
                    errorMessage: testResult.message,
                    userId
                });

                return {
                    success: false,
                    message: 'Connection test failed: ' + testResult.message
                };
            }

            await router.update({
                autoConfigStatus: 'CONFIGURED',
                isOnline: true,
                lastSeen: new Date(),
                identity: testResult.identity,
                version: testResult.version,
                autoConfigError: null
            });

            const capabilities = await this.detectCapabilities(router);
            await router.update({
                capabilities: JSON.stringify(capabilities)
            });

            await RouterConnectionLog.create({
                routerId: router.id,
                tenantId: router.tenantId,
                action: 'VERIFY',
                status: 'SUCCESS',
                details: 'Router configured and verified successfully',
                metadata: JSON.stringify({
                    version: testResult.version,
                    identity: testResult.identity,
                    capabilities
                }),
                userId
            });

            return {
                success: true,
                message: 'Router configured successfully',
                details: {
                    version: testResult.version,
                    identity: testResult.identity,
                    capabilities
                }
            };

        } catch (error: any) {
            logger.error('Router verification failed', {
                routerId: router.id,
                error: error.message
            });

            await router.update({
                autoConfigStatus: 'FAILED',
                autoConfigError: error.message
            });

            await RouterConnectionLog.create({
                routerId: router.id,
                tenantId: router.tenantId,
                action: 'VERIFY',
                status: 'FAILED',
                errorMessage: error.message,
                userId
            });

            return {
                success: false,
                message: 'Verification failed: ' + error.message
            };
        }
    }

    /**
     * Detect router capabilities
     */
    private static async detectCapabilities(router: RouterModel): Promise<{
        hotspot: boolean;
        pppoe: boolean;
        radius: boolean;
        queues: boolean;
    }> {
        try {
            const compatibility = await MikroTikService.validateCompatibility(router);
            return {
                hotspot: !compatibility.issues.includes('No Hotspot server configured'),
                pppoe: true,
                radius: !compatibility.issues.includes('RADIUS client not configured'),
                queues: true
            };
        } catch {
            return { hotspot: false, pppoe: false, radius: false, queues: false };
        }
    }

    /**
     * Generate rollback script to remove SurfBill configuration
     */
    static async generateRollbackScript(router: RouterModel): Promise<string> {
        const apiUser = router.apiUser || 'surfbill_api';

        return `# ============================================================
# SurfBill Rollback Script
# ============================================================
# This removes all SurfBill configuration from the router.
# ============================================================

# Remove API User
/user remove [find name="${apiUser}"]

# Remove API User Group
/user group remove [find name="surfbill_api"]

# Remove Firewall Rules
/ip firewall filter remove [find comment="SurfBill API Access"]

# Remove Walled Garden Entries
/ip hotspot walled-garden remove [find comment~"SurfBill"]
/ip hotspot walled-garden remove [find comment~"IntaSend"]
/ip hotspot walled-garden remove [find comment~"M-Pesa"]

# Remove Scheduler Jobs
/system scheduler remove [find name~"SurfBill"]

# Remove Scripts
/system script remove [find name~"SurfBill"]

# Remove Hotspot Profile
/ip hotspot profile remove [find name~"SurfBill"]

# Remove User Profile
/ip hotspot user profile remove [find name~"SurfBill"]

# Configuration Removed
:log info "SurfBill configuration has been removed"`;
    }

    /**
     * Test router connection before generating script
     */
    static async testInitialConnection(
        host: string,
        port: number,
        username: string,
        password: string
    ): Promise<{ success: boolean; message: string; version?: string; identity?: string }> {
        try {
            const tempRouter = {
                host,
                port,
                username,
                password
            } as RouterModel;

            const result = await MikroTikService.testConnection(tempRouter);

            return {
                success: result.status,
                message: result.message,
                version: result.version,
                identity: result.identity
            };
        } catch (error: any) {
            return {
                success: false,
                message: error.message || 'Connection test failed'
            };
        }
    }
}
