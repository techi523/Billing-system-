import crypto from 'crypto';
import { Router as RouterModel, Tenant, RouterConnectionLog } from '../models';
import { MikroTikService } from './mikrotik.service';
import logger from '../utils/logger';

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
     * Generate auto-configuration script for a router
     */
    static async generateAutoConfigScript(
        router: RouterModel,
        tenant: Tenant,
        version: 'v6' | 'v7' = 'v7'
    ): Promise<string> {
        const { apiUser, apiPassword } = this.generateApiCredentials(tenant.id, router.id);
        const billingSystemIP = process.env.APP_URL || 'http://localhost:3010';
        const billingHost = new URL(billingSystemIP).hostname;

        // Store credentials in router model
        await router.update({
            apiUser,
            apiPassword,
            username: apiUser, // Use apiUser for future connections
            password: apiPassword, // Use apiPassword for future connections
            autoConfigStatus: 'PENDING'
        });

        const script = version === 'v7' ? this.generateV7Script(router, tenant, apiUser, apiPassword, billingHost)
            : this.generateV6Script(router, tenant, apiUser, apiPassword, billingHost);

        // Store script in router
        await router.update({ autoConfigScript: script });

        // Log the generation
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
     * Generate RouterOS v7 configuration script
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

        return `# ========================================
# SurfBill Auto-Configuration Script
# RouterOS v7
# ========================================
# Tenant: ${tenant.name}
# Router: ${router.name}
# Generated: ${new Date().toISOString()}
# ========================================

# STEP 1: Create API User (Least Privilege)
/user group add name=surfbill_api policy=api,read,write,test,!local,!telnet,!ssh,!ftp,!reboot,!policy,!password,!web,!winbox,!sensitive
/user add name=${apiUser} password=${apiPassword} group=surfbill_api comment="SurfBill Billing System API Access"

# STEP 2: Firewall Rules (Allow Billing System API Access)
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=${billingHost} action=accept comment="SurfBill API Access" place-before=0

# STEP 3: Hotspot Profile Configuration
/ip hotspot profile
add name=SurfBill_${tenantSubdomain} \\
    login-by=http-chap,http-pap,mac \\
    use-radius=no \\
    dns-name=${tenantSubdomain}.surfbill.link \\
    hotspot-address=10.5.50.1 \\
    smtp-server=0.0.0.0 \\
    http-cookie-lifetime=1d \\
    trial-uptime-limit=0s \\
    trial-user-profile=default

# STEP 4: Walled Garden (Payment Gateways & APIs)
/ip hotspot walled-garden
add dst-host=*.intasend.com comment="IntaSend Payment Gateway"
add dst-host=*.safaricom.co.ke comment="M-Pesa Gateway"
add dst-host=${billingHost} comment="SurfBill Billing System"
add dst-host=*.googleapis.com comment="Google APIs"
add dst-host=*.cloudflare.com comment="Cloudflare CDN"

# STEP 5: User Profile (Default Settings)
/ip hotspot user profile
set [ find default=yes ] shared-users=1 rate-limit=512k/512k

# STEP 6: Scheduler - Sync with Billing System (Every 5 minutes)
/system script
add name=SurfBill_Sync_Script source={
    :log info "SurfBill: Running sync with billing system"
    # This script will be enhanced by the billing system via API
    # to perform automated user cleanup and session management
}

/system scheduler
add name=SurfBill_Sync interval=5m on-event=SurfBill_Sync_Script comment="SurfBill Auto-Sync"

# STEP 7: Scheduler - Cleanup Expired Users (Daily at 2 AM)
/system script
add name=SurfBill_Cleanup_Script source={
    :log info "SurfBill: Cleaning up expired users"
    # Cleanup logic will be managed by billing system
}

/system scheduler
add name=SurfBill_Cleanup interval=1d start-time=02:00:00 on-event=SurfBill_Cleanup_Script comment="SurfBill Daily Cleanup"

# STEP 8: Set Router Identity
/system identity set name="SurfBill_${tenantName}_${router.name}"

# ========================================
# CONFIGURATION COMPLETE
# ========================================
# Next Steps:
# 1. Verify connection in SurfBill dashboard
# 2. Create your first package
# 3. Start accepting payments!
# ========================================
`;
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

        return `# ========================================
# SurfBill Auto-Configuration Script
# RouterOS v6 (Legacy)
# ========================================
# Tenant: ${tenant.name}
# Router: ${router.name}
# Generated: ${new Date().toISOString()}
# ========================================

# STEP 1: Create API User
/user group add name=surfbill_api policy=api,read,write,test
/user add name=${apiUser} password=${apiPassword} group=surfbill_api comment="SurfBill API"

# STEP 2: Firewall Rules
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=${billingHost} action=accept comment="SurfBill API" place-before=0

# STEP 3: Hotspot Profile
/ip hotspot profile add name=SurfBill_${tenantSubdomain} login-by=http-chap,http-pap,mac use-radius=no dns-name=${tenantSubdomain}.surfbill.link hotspot-address=10.5.50.1

# STEP 4: Walled Garden
/ip hotspot walled-garden add dst-host=*.intasend.com comment="Payment Gateway"
/ip hotspot walled-garden add dst-host=*.safaricom.co.ke comment="M-Pesa"
/ip hotspot walled-garden add dst-host=${billingHost} comment="SurfBill"

# STEP 5: User Profile
/ip hotspot user profile set [ find default=yes ] shared-users=1

# STEP 6: Scheduler Scripts
/system script add name=SurfBill_Sync_Script source=":log info \\"SurfBill Sync\\""
/system scheduler add name=SurfBill_Sync interval=5m on-event=SurfBill_Sync_Script

# STEP 7: Set Identity
/system identity set name="SurfBill_${tenantName}_${router.name}"

# Configuration Complete
`;
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
            // Test connection with API credentials
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

            // Update router with system info
            await router.update({
                autoConfigStatus: 'CONFIGURED',
                isOnline: true,
                lastSeen: new Date(),
                identity: testResult.identity,
                version: testResult.version,
                autoConfigError: null
            });

            // Check capabilities
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
     * Detect router capabilities (hotspot, pppoe, etc.)
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
                pppoe: true, // Assume PPPoE is available
                radius: !compatibility.issues.includes('RADIUS client not configured'),
                queues: true // Assume queue support
            };
        } catch (error) {
            return {
                hotspot: false,
                pppoe: false,
                radius: false,
                queues: false
            };
        }
    }

    /**
     * Generate rollback script to remove SurfBill configuration
     */
    static async generateRollbackScript(router: RouterModel): Promise<string> {
        const apiUser = router.apiUser || 'surfbill_api';

        return `# ========================================
# SurfBill Rollback Script
# ========================================
# This script removes SurfBill configuration
# ========================================

# Remove API User
/user remove [find name="${apiUser}"]

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

# Configuration Removed
:log info "SurfBill configuration has been removed"
`;
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
            // Create temporary router object for testing
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
