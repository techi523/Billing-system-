import { sequelize, MessageTemplate } from '../src/models';

async function fixTable() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        console.log('Forcing creation of MessageTemplates table...');
        await MessageTemplate.sync({ force: true });
        console.log('Table created successfully.');

        const tenantId = '7a829e2f-5197-466a-49ee-9d6a-61e6027a96';
        console.log(`Seeding templates for Tenant: ${tenantId}`);

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

        await MessageTemplate.bulkCreate(templates);
        console.log('Templates seeded successfully.');

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

fixTable();
