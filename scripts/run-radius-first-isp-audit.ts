import {
    sequelize,
    Tenant,
    Subscriber,
    Package,
    Voucher,
    Nas,
    RadCheck,
    RadReply,
    RadGroupCheck,
    RadGroupReply,
    RadUserGroup,
    RadAcct,
    RadPostAuth,
    RadiusPolicy
} from '../src/models';
import { RadiusService } from '../src/services/radius.service';

async function runRadiusFirstIspAudit() {
    console.log('\n=========================================================');
    console.log('  SURFBILL FREERADIUS-FIRST ISP PLATFORM AUDIT');
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

    let tenantA: Tenant;
    let tenantB: Tenant;

    // 1. Database Connection & FreeRADIUS Models Sync
    await assertTest('Database & FreeRADIUS Schema Sync', async () => {
        await sequelize.authenticate();
        await Nas.sync();
        await RadCheck.sync();
        await RadReply.sync();
        await RadGroupCheck.sync();
        await RadGroupReply.sync();
        await RadUserGroup.sync();
        await RadAcct.sync();
        await RadPostAuth.sync();
        await RadiusPolicy.sync();

        tenantA = await Tenant.findOrCreate({
            where: { id: 'test-rad-tenant-a' },
            defaults: {
                name: 'Alpha ISP Radius',
                slug: 'alpha-isp-rad',
                subdomain: 'alpharad',
                businessEmail: 'alpha@radius.isp',
                status: 'ACTIVE'
            }
        }).then(r => r[0]);

        tenantB = await Tenant.findOrCreate({
            where: { id: 'test-rad-tenant-b' },
            defaults: {
                name: 'Beta ISP Radius',
                slug: 'beta-isp-rad',
                subdomain: 'betarad',
                businessEmail: 'beta@radius.isp',
                status: 'ACTIVE'
            }
        }).then(r => r[0]);
    });

    // 2. NAS Device Registration & Tenant Isolation
    await assertTest('NAS Device Registration & Isolation', async () => {
        const nasA = await Nas.create({
            id: `nas-a-${Date.now()}`,
            nasname: `192.168.88.${Math.floor(Math.random() * 200 + 10)}`,
            shortname: 'Alpha-CCR2004-Router',
            type: 'mikrotik',
            secret: 'alphaSecret123',
            tenantId: tenantA.id
        });

        const nasB = await Nas.create({
            id: `nas-b-${Date.now()}`,
            nasname: `10.0.0.${Math.floor(Math.random() * 200 + 10)}`,
            shortname: 'Beta-CCR1036-Router',
            type: 'mikrotik',
            secret: 'betaSecret999',
            tenantId: tenantB.id
        });

        const nasListA = await Nas.findAll({ where: { tenantId: tenantA.id } });
        if (nasListA.some(n => n.id === nasB.id)) {
            throw new Error('Tenant A can access Tenant B NAS device! Isolation failed.');
        }

        await nasA.destroy();
        await nasB.destroy();
    });

    // 3. Subscriber Attribute Generation & Policy Sync
    await assertTest('Subscriber Attribute Generation & Policy Sync', async () => {
        const pkg = await Package.create({
            id: Math.floor(Math.random() * 100000),
            name: 'Radius 50M Fibre',
            price: 3500,
            durationHours: 720,
            uploadSpeed: '50M',
            downloadSpeed: '50M',
            tenantId: tenantA.id
        });

        const sub = await Subscriber.create({
            id: `sub-rad-${Date.now()}`,
            name: 'Radius Test User',
            phoneNumber: '254700111222',
            pppoeUsername: 'john_pppoe',
            pppoePassword: 'secretpassword',
            packageId: pkg.id,
            tenantId: tenantA.id,
            status: 'ACTIVE'
        });

        await RadiusService.syncSubscriberAttributes(sub.id, tenantA.id);

        const checkRecord = await RadCheck.findOne({ where: { username: 'john_pppoe', tenantId: tenantA.id } });
        if (!checkRecord || checkRecord.value !== 'secretpassword') {
            throw new Error('radcheck Cleartext-Password attribute was not synced properly');
        }

        const replyRecord = await RadReply.findOne({ where: { username: 'john_pppoe', attribute: 'Mikrotik-Rate-Limit' } });
        if (!replyRecord || replyRecord.value !== '50M/50M') {
            throw new Error(`Expected Mikrotik-Rate-Limit 50M/50M, got ${replyRecord?.value}`);
        }

        await sub.destroy();
        await pkg.destroy();
    });

    // 4. AAA Authentication Engine (PPPoE, Hotspot, Voucher, MAC)
    await assertTest('AAA Authentication Engine (PPPoE, Voucher, MAC)', async () => {
        // Create test package & voucher
        const vPkg = await Package.create({
            id: Math.floor(Math.random() * 100000 + 10000),
            name: 'Voucher 24hr Pkg',
            price: 100,
            durationHours: 24,
            tenantId: tenantA.id
        });

        const voucherCode = `VOUCHER-${Date.now()}`;
        await Voucher.create({
            id: `vouch-${Date.now()}`,
            code: voucherCode,
            packageId: vPkg.id,
            tenantId: tenantA.id,
            status: 'AVAILABLE' as any
        });

        // Test Voucher Authentication
        const vRes = await RadiusService.authenticateSubscriber({
            username: voucherCode,
            voucherCode,
            nasIp: '192.168.88.1',
            serviceType: 'Voucher',
            tenantId: tenantA.id
        });

        if (vRes.reply !== 'Access-Accept') {
            throw new Error(`Voucher authentication failed: ${vRes.reason}`);
        }

        // Test MAC Authentication
        const macAddr = 'AA:BB:CC:DD:EE:FF';
        const macSub = await Subscriber.create({
            id: `mac-sub-${Date.now()}`,
            name: 'MAC Client',
            phoneNumber: '254788990011',
            macAddress: macAddr,
            tenantId: tenantA.id,
            status: 'ACTIVE'
        });

        const macRes = await RadiusService.authenticateSubscriber({
            username: macAddr,
            macAddress: macAddr,
            nasIp: '192.168.88.1',
            serviceType: 'MAC',
            tenantId: tenantA.id
        });

        if (macRes.reply !== 'Access-Accept') {
            throw new Error(`MAC authentication failed: ${macRes.reason}`);
        }

        await macSub.destroy();
    });

    // 5. RADIUS Accounting Processor (Start, Interim-Update, Stop)
    await assertTest('RADIUS Accounting Processor', async () => {
        const sessionId = `sess-${Date.now()}`;
        const uniqueId = `192.168.88.1_${sessionId}_john_pppoe`;

        // Accounting-Start
        await RadiusService.processAccounting({
            acctsessionid: sessionId,
            acctuniqueid: uniqueId,
            username: 'john_pppoe',
            nasipaddress: '192.168.88.1',
            acctstatusType: 'Start',
            framedipaddress: '10.5.5.100',
            tenantId: tenantA.id
        });

        // Accounting-Interim-Update
        await RadiusService.processAccounting({
            acctsessionid: sessionId,
            acctuniqueid: uniqueId,
            username: 'john_pppoe',
            nasipaddress: '192.168.88.1',
            acctstatusType: 'Interim-Update',
            acctsessiontime: 600,
            acctinputoctets: 10485760, // 10MB
            acctoutputoctets: 52428800, // 50MB
            tenantId: tenantA.id
        });

        const acct = await RadAcct.findOne({ where: { acctuniqueid: uniqueId } });
        if (!acct || acct.acctsessiontime !== 600) {
            throw new Error('radacct interim update metrics were not logged correctly');
        }

        // Accounting-Stop
        await RadiusService.processAccounting({
            acctsessionid: sessionId,
            acctuniqueid: uniqueId,
            username: 'john_pppoe',
            nasipaddress: '192.168.88.1',
            acctstatusType: 'Stop',
            acctsessiontime: 1200,
            acctinputoctets: 20971520,
            acctoutputoctets: 104857600,
            acctterminatecause: 'User-Request',
            tenantId: tenantA.id
        });

        const stoppedAcct = await RadAcct.findOne({ where: { acctuniqueid: uniqueId } });
        if (!stoppedAcct?.acctstoptime) {
            throw new Error('radacct stop time was not set on Accounting-Stop');
        }
    });

    // 6. Packet of Disconnect (PoD) & CoA Packet Generation
    await assertTest('CoA & Packet-of-Disconnect (PoD) Engine', async () => {
        const podRes: any = await RadiusService.sendDisconnectMessage({
            nasIp: '127.0.0.1',
            secret: 'testing123',
            username: 'test_user',
            sessionId: 'sess-99'
        });

        if (!podRes.success) throw new Error(`PoD Packet construction failed: ${podRes.error}`);

        const coaRes: any = await RadiusService.sendCoAMessage({
            nasIp: '127.0.0.1',
            secret: 'testing123',
            username: 'test_user',
            rateLimit: '30M/30M'
        });

        if (!coaRes.success) throw new Error(`CoA Packet construction failed: ${coaRes.error}`);
    });

    // 7. Super Admin RADIUS Overview Reporting
    await assertTest('Super Admin RADIUS Overview Reporting', async () => {
        const saData = await RadiusService.getRadiusOverview();
        if (typeof saData.stats.activeSessions !== 'number') {
            throw new Error('Super Admin RADIUS overview missing activeSessions count');
        }
    });

    console.log('\n=========================================================');
    console.log(`  REGRESSION RESULTS: ${passedTests} PASSED, ${totalTests - passedTests} FAILED`);
    console.log('=========================================================\n');

    if (totalTests - passedTests > 0) {
        process.exit(1);
    }
}

runRadiusFirstIspAudit().catch(err => {
    console.error('Fatal RADIUS Audit Exception:', err);
    process.exit(1);
});
