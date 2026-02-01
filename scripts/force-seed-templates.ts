import { sequelize, MessageTemplate } from '../src/models';

async function forceSeed() {
    try {
        await sequelize.authenticate();
        const tenantId = '7a829e2f-5197-466a-49ee-9d6a-61e6027a96';

        console.log(`Forcing template seed for Tenant: ${tenantId}`);

        const templates = [
            {
                name: 'Welcome Message',
                content: 'Hello {name}, welcome to Hotspot! We hope you enjoy our services.',
                channel: 'WHATSAPP',
                status: 'APPROVED',
                tenantId: tenantId
            },
            {
                name: 'Payment Reminder',
                content: 'Hi {name}, your hotspot subscription is about to expire. Top up now to stay connected!',
                channel: 'WHATSAPP',
                status: 'APPROVED',
                tenantId: tenantId
            },
            {
                name: 'Promotion Alert',
                content: 'Special Weekend Offer! Get 24 Hours for only KES 40. Buy now at the dashboard.',
                channel: 'WHATSAPP',
                status: 'APPROVED',
                tenantId: tenantId
            }
        ];

        for (const t of templates) {
            try {
                // Try create directly first
                await MessageTemplate.create(t);
                console.log(`SUCCESS: Created ${t.name}`);
            } catch (err: any) {
                console.error(`FAILED to create ${t.name}:`, err.message);
                if (err.name === 'SequelizeUniqueConstraintError') {
                    console.log('Template already exists (Unique Constraint).');
                }
            }
        }
    } catch (error) {
        console.error('Fatal Script Error:', error);
    } finally {
        await sequelize.close();
    }
}

forceSeed();
