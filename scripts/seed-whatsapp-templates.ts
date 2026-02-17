import { sequelize, Tenant, MessageTemplate } from '../src/models';

async function seedTemplatesWithSync() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        // Sync to ensure table exists
        await sequelize.sync({ alter: true });
        console.log('Database synced.');

        const tenants = await Tenant.findAll();
        if (tenants.length === 0) {
            console.error('No tenants found in the database.');
            process.exit(1);
        }

        console.log(`Found ${tenants.length} tenants. Seeding templates...`);

        for (const tenant of tenants) {
            console.log(`Processing tenant: ${tenant.name} (${tenant.subdomain})`);

            const templates = [
                {
                    name: 'Welcome Message',
                    content: 'Hello {name}, welcome to Hotspot! We hope you enjoy our services.',
                    channel: 'WHATSAPP',
                    status: 'APPROVED',
                    tenantId: tenant.id
                },
                {
                    name: 'Payment Reminder',
                    content: 'Hi {name}, your hotspot subscription is about to expire. Top up now to stay connected!',
                    channel: 'WHATSAPP',
                    status: 'APPROVED',
                    tenantId: tenant.id
                },
                {
                    name: 'Promotion Alert',
                    content: 'Special Weekend Offer! Get 24 Hours for only KES 40. Buy now at the dashboard.',
                    channel: 'WHATSAPP',
                    status: 'APPROVED',
                    tenantId: tenant.id
                }
            ];

            for (const t of templates) {
                const [_template, created] = await MessageTemplate.findOrCreate({
                    where: { name: t.name, tenantId: t.tenantId, channel: 'WHATSAPP' },
                    defaults: t
                });
                if (created) {
                    console.log(`- Created template: ${t.name}`);
                } else {
                    console.log(`- Template already exists: ${t.name}`);
                }
            }
        }

        console.log('WhatsApp templates seeding completed successfully.');
    } catch (error) {
        console.error('Seeding templates failed:', error);
    } finally {
        await sequelize.close();
    }
}

seedTemplatesWithSync();
