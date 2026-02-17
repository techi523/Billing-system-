import { sequelize, Tenant, AdminUser, Subscriber, Payment, Session, Wallet, WalletTransaction, Invoice, Voucher, Campaign, SMSLog, AuditLog, PlatformTransaction, FraudLog } from '../src/models';


async function cleanupDatabase() {
    try {
        console.log('🚨 STARTING PRODUCTION DATABASE CLEANUP 🚨');
        console.log('This will delete all test data. Press Ctrl+C in 5 seconds to cancel...');

        await new Promise(resolve => setTimeout(resolve, 5000));

        await sequelize.authenticate();
        console.log('✅ Database connected.');

        console.log('🔄 Syncing database schema (attempting alter)...');
        try {
            await sequelize.sync({ alter: true });
            console.log('✅ Database schema synced.');
        } catch (e: any) {
            console.warn('⚠️ Schema sync failed (continuing anyway):', e.message);
        }

        // Transaction for safety
        const transaction = await sequelize.transaction();

        try {
            console.log('🧹 Truncating high-volume transactional tables...');

            // Order matters due to foreign keys if cascade isn't perfect, but TRUNCATE usually handles it or we use DELETE with force
            const options = { where: {}, truncate: true, transaction, force: true };

            await PlatformTransaction.destroy(options);
            await WalletTransaction.destroy(options);
            await Invoice.destroy(options);
            await Payment.destroy(options);
            await Session.destroy(options);
            await FraudLog.destroy(options);
            await SMSLog.destroy(options);
            await Voucher.destroy(options);
            // Verify Campaign exists before destroying? destroyed above with sync?
            try { await Campaign.destroy(options); } catch (e) { }
            await AuditLog.destroy(options);

            // Subscriptions/Users - Keep Tenants and Admins, but clear Subscribers?
            await Subscriber.destroy(options);

            console.log('✅ Transactional data cleared.');

            // Disable timestamp checks for cleanup to avoid schema errors
            try {
                Tenant.removeAttribute('createdAt');
                Tenant.removeAttribute('updatedAt');
            } catch (e) { console.warn('Could not remove attributes', e); }

            console.log('🔍 Checking for duplicate Tenants...');
            const tenants = await Tenant.findAll({ transaction });
            const subdomainMap = new Map<string, Tenant[]>();

            for (const t of tenants) {
                const sub = t.subdomain.toLowerCase();
                if (!subdomainMap.has(sub)) subdomainMap.set(sub, []);
                subdomainMap.get(sub)!.push(t);
            }

            for (const [subdomain, tenantList] of subdomainMap) {
                if (tenantList.length > 1) {
                    console.log(`⚠️ Found ${tenantList.length} duplicates for subdomain '${subdomain}'`);

                    // Keep the first one found since we wiped data and can't reliability sort by time without createdAt
                    tenantList[0];
                    const toDelete = tenantList.slice(1);

                    for (const d of toDelete) {
                        console.log(`❌ Deleting duplicate tenant ID: ${d.id}`);
                        // Delete associated AdminUsers first
                        await AdminUser.destroy({ where: { tenantId: d.id }, transaction });
                        await Wallet.destroy({ where: { tenantId: d.id }, transaction });
                        await d.destroy({ transaction });
                    }
                }
            }
            console.log('✅ Duplicate tenants resolved.');

            console.log('🔄 Resetting Wallets for remaining Tenants to 0.00...');
            const wallets = await Wallet.findAll({ transaction });
            for (const w of wallets) {
                w.balance = 0;
                w.frozenBalance = 0;
                w.pendingBalance = 0;
                await w.save({ transaction });
            }
            console.log('✅ Wallets reset.');

            await transaction.commit();
            console.log('🎉 DATABASE CLEANUP COMPLETE. READY FOR PRODUCTION.');

        } catch (error) {
            await transaction.rollback();
            console.error('❌ Error during cleanup transaction:', error);
            process.exit(1);
        }

    } catch (error) {
        console.error('❌ Connection error:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
}

cleanupDatabase();
