import { sequelize, Tenant, Router as RouterModel, RouterIncident, DowntimeRecord, Subscriber, AuditLog } from '../src/models';
import { RouterPowerService } from '../src/services/router-power.service';

async function runRouterPowerMaintenanceAudit() {
    console.log('\n=========================================================');
    console.log('  SURFBILL ROUTER POWER & MAINTENANCE SYSTEM AUDIT');
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
            const detail = err.errors ? err.errors.map((e: any) => e.message).join(', ') : err.message;
            console.error(`  ❌ [FAIL] ${name} (${duration}ms) - ${detail}`);
        }
    }

    let testTenant: Tenant;
    let testRouter: RouterModel;

    // 1. Database Connection & Model Setup
    await assertTest('Database Connection & Model Setup', async () => {
        await sequelize.authenticate();
        await RouterModel.sync();
        await RouterIncident.sync();
        await DowntimeRecord.sync();

        const addCols = [
            "ALTER TABLE routers ADD COLUMN powerStatus VARCHAR(50) DEFAULT 'GRID';",
            "ALTER TABLE routers ADD COLUMN maintenanceStatus VARCHAR(50) DEFAULT 'OPERATIONAL';",
            "ALTER TABLE routers ADD COLUMN maintenanceNotes TEXT;",
            "ALTER TABLE routers ADD COLUMN maintenanceStartTime DATETIME;",
            "ALTER TABLE routers ADD COLUMN expectedReturnTime DATETIME;",
            "ALTER TABLE routers ADD COLUMN maintenanceCreatedBy VARCHAR(255);",
            "ALTER TABLE routers ADD COLUMN uptimeSeconds INTEGER DEFAULT 0;",
            "ALTER TABLE routers ADD COLUMN subscriberCount INTEGER DEFAULT 0;",
            "ALTER TABLE routers ADD COLUMN cpuUsagePercent FLOAT DEFAULT 0;",
            "ALTER TABLE routers ADD COLUMN memoryUsagePercent FLOAT DEFAULT 0;",
            "ALTER TABLE routers ADD COLUMN bandwidthUsageMbps FLOAT DEFAULT 0;",
            "ALTER TABLE routers ADD COLUMN hasSmartPower BOOLEAN DEFAULT 0;",
            "ALTER TABLE routers ADD COLUMN smartPowerType VARCHAR(50) DEFAULT 'NONE';",
            "ALTER TABLE routers ADD COLUMN smartPowerHost VARCHAR(255);",
            "ALTER TABLE routers ADD COLUMN smartPowerPort INTEGER;",
            "ALTER TABLE routers ADD COLUMN smartPowerOutletId VARCHAR(255);",
            "ALTER TABLE routers ADD COLUMN outageAutoDetect BOOLEAN DEFAULT 1;",
            "ALTER TABLE routers ADD COLUMN outageThresholdMinutes INTEGER DEFAULT 5;",
            "ALTER TABLE routers ADD COLUMN escalationThresholdMinutes INTEGER DEFAULT 30;",
            "ALTER TABLE routers ADD COLUMN suspendAlertsInBlackout BOOLEAN DEFAULT 1;",
            "ALTER TABLE routers ADD COLUMN autoExtendSubscribersOnOutage BOOLEAN DEFAULT 1;",
            "ALTER TABLE subscribers ADD COLUMN name VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN firstName VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN lastName VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN altPhone VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN email VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN idNumber VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN username VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN password VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN pppoeUsername VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN pppoePassword VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN macAddress VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN address TEXT;",
            "ALTER TABLE subscribers ADD COLUMN location TEXT;",
            "ALTER TABLE subscribers ADD COLUMN customerType VARCHAR(50) DEFAULT 'RESIDENTIAL';",
            "ALTER TABLE subscribers ADD COLUMN connectionType VARCHAR(50) DEFAULT 'HOTSPOT';",
            "ALTER TABLE subscribers ADD COLUMN customerGroupId VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN status VARCHAR(50) DEFAULT 'ACTIVE';",
            "ALTER TABLE subscribers ADD COLUMN routerId VARCHAR(255);",
            "ALTER TABLE subscribers ADD COLUMN packageId INTEGER;",
            "ALTER TABLE subscribers ADD COLUMN expiryDate DATETIME;",
            "ALTER TABLE subscribers ADD COLUMN lastPaymentDate DATETIME;",
            "ALTER TABLE subscribers ADD COLUMN notes TEXT;",
            "ALTER TABLE subscribers ADD COLUMN autoRenewal BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscribers ADD COLUMN notificationsEnabled BOOLEAN DEFAULT 1;",
            "ALTER TABLE subscribers ADD COLUMN isDraft BOOLEAN DEFAULT 0;",
            "ALTER TABLE subscribers ADD COLUMN archivedAt DATETIME;"
        ];
        for (const query of addCols) {
            try { await sequelize.query(query); } catch (_) {}
        }

        try {
            await Subscriber.sync();
        } catch (_) {}

        let tenant = await Tenant.findByPk('test-router-tenant-id');
        if (!tenant) {
            tenant = await Tenant.create({
                id: 'test-router-tenant-id',
                name: 'Power Audit Networks',
                slug: 'power-audit-networks',
                subdomain: 'poweraudit',
                businessEmail: 'support@poweraudit.co.ke',
                status: 'ACTIVE'
            });
        }
        testTenant = tenant;

        let router = await RouterModel.findOne({ where: { tenantId: tenant.id } });
        if (!router) {
            router = await RouterModel.create({
                id: 'test-router-99',
                name: 'CBD Core MikroTik Node',
                host: '192.168.88.1',
                port: 8728,
                username: 'admin',
                password: 'password',
                tenantId: tenant.id,
                location: 'Nairobi CBD Tower A',
                isOnline: true,
                hasSmartPower: true,
                smartPowerType: 'SMART_PDU'
            });
        }
        testRouter = router;
    });

    // 2. Maintenance & Blackout Mode Lifecycle
    await assertTest('Maintenance & Blackout Mode Activation & Deactivation', async () => {
        // Activate Blackout Mode
        const resMaint = await RouterPowerService.setRouterMaintenanceMode(testRouter.id, testTenant.id, {
            enabled: true,
            reason: 'POWER_OUTAGE',
            notes: 'Kenya Power Grid Failover. Running on Smart UPS.',
            expectedReturnTime: new Date(Date.now() + 60 * 60 * 1000),
            notifySubscribers: false,
            createdBy: 'Audit Engineer'
        });

        if (!resMaint.success) throw new Error('Failed to activate power outage mode');

        const updatedRouter = await RouterModel.findByPk(testRouter.id);
        if (updatedRouter?.maintenanceStatus !== 'POWER_OUTAGE') {
            throw new Error(`Expected maintenanceStatus POWER_OUTAGE, got ${updatedRouter?.maintenanceStatus}`);
        }

        // Verify Incident Created
        const incident = await RouterIncident.findOne({ where: { routerId: testRouter.id, status: 'IN_PROGRESS' } });
        if (!incident) throw new Error('Router Incident was not logged during blackout activation');

        // Restore Operational Status
        const resRestore = await RouterPowerService.setRouterMaintenanceMode(testRouter.id, testTenant.id, {
            enabled: false,
            createdBy: 'Audit Engineer'
        });

        if (!resRestore.success) throw new Error('Failed to restore operational status');

        const restoredRouter = await RouterModel.findByPk(testRouter.id);
        if (restoredRouter?.maintenanceStatus !== 'OPERATIONAL') {
            throw new Error(`Expected maintenanceStatus OPERATIONAL, got ${restoredRouter?.maintenanceStatus}`);
        }

        const resolvedIncident = await RouterIncident.findByPk(incident.id);
        if (resolvedIncident?.status !== 'RESOLVED') {
            throw new Error('Router Incident was not marked RESOLVED upon restoration');
        }
    });

    // 3. Subscriber Downtime Compensation Engine
    await assertTest('Subscriber Downtime Compensation & Expiry Extension Engine', async () => {
        // Create test active subscriber
        const initialExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
        const sub = await Subscriber.create({
            id: `sub-comp-${Date.now()}`,
            name: 'Audit Client',
            phoneNumber: '254711999888',
            tenantId: testTenant.id,
            routerId: testRouter.id,
            status: 'ACTIVE',
            expiryDate: initialExpiry
        });

        const compResult = await RouterPowerService.compensateSubscribers(testRouter.id, testTenant.id, 'dummy-inc', 120);
        if (compResult.updatedCount === 0) throw new Error('No subscriber expiry dates were updated during compensation');

        const updatedSub = await Subscriber.findByPk(sub.id);
        const updatedTime = new Date(updatedSub!.expiryDate!).getTime();
        const expectedTime = initialExpiry.getTime() + 120 * 60 * 1000;

        if (Math.abs(updatedTime - expectedTime) > 5000) {
            throw new Error('Subscriber expiry date was not accurately extended by 120 minutes');
        }

        await sub.destroy();
    });

    // 4. Remote MikroTik Control & Smart Power Guard
    await assertTest('Remote Control & Smart PDU Security Guards', async () => {
        // Test remote control command
        const ctrlRes = await RouterPowerService.executeRemoteControl(testRouter.id, testTenant.id, 'RUN_DIAGNOSTICS');
        if (!ctrlRes.diagnostics) throw new Error('Diagnostics output missing from remote control');

        // Test Smart Power execution on router with hasSmartPower = true
        const pduRes = await RouterPowerService.executePowerControl(testRouter.id, testTenant.id, 'REBOOT');
        if (!pduRes.success) throw new Error('Smart PDU power control failed');

        // Test Smart Power execution on router without Smart Power (should fail cleanly)
        const dummyRouter = await RouterModel.create({
            id: 'dumb-router-01',
            name: 'Basic Switch',
            host: '10.0.0.99',
            port: 8728,
            username: 'admin',
            password: 'pwd',
            tenantId: testTenant.id,
            hasSmartPower: false
        });

        let failedAsExpected = false;
        try {
            await RouterPowerService.executePowerControl(dummyRouter.id, testTenant.id, 'POWER_OFF');
        } catch (err: any) {
            if (err.message.includes('Smart power hardware control is not attached')) {
                failedAsExpected = true;
            }
        }

        await dummyRouter.destroy();
        if (!failedAsExpected) throw new Error('Smart power control was incorrectly permitted on dumb router');
    });

    // 5. Super Admin Outage Overview Reporting
    await assertTest('Super Admin Outage Overview Reporting', async () => {
        const saData = await RouterPowerService.getSuperAdminOutageOverview();
        if (typeof saData.stats.totalIncidents !== 'number') {
            throw new Error('Super Admin outage overview missing totalIncidents metric');
        }
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runRouterPowerMaintenanceAudit().catch(err => {
    console.error('Fatal Router Power Audit Exception:', err);
    process.exit(1);
});
