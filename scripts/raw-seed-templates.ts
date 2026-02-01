import { sequelize } from '../src/models';

async function rawSeed() {
    try {
        await sequelize.authenticate();
        const tenantId = '7a829e2f-5197-466a-49ee-9d6a-61e6027a96';
        const now = new Date().toISOString();
        const uuid1 = '11111111-1111-1111-1111-111111111111';
        const uuid2 = '22222222-2222-2222-2222-222222222222';
        const uuid3 = '33333333-3333-3333-3333-333333333333';

        console.log('Inserting templates via Raw SQL...');

        await sequelize.query(`
            INSERT INTO messageTemplates (id, name, content, channel, status, tenantId, createdAt, updatedAt)
            VALUES 
            ('${uuid1}', 'Welcome Message', 'Hello {name}, welcome to Hotspot! We hope you enjoy our services.', 'WHATSAPP', 'APPROVED', '${tenantId}', '${now}', '${now}'),
            ('${uuid2}', 'Payment Reminder', 'Hi {name}, your hotspot subscription is about to expire. Top up now to stay connected!', 'WHATSAPP', 'APPROVED', '${tenantId}', '${now}', '${now}'),
            ('${uuid3}', 'Promotion Alert', 'Special Weekend Offer! Get 24 Hours for only KES 40. Buy now at the dashboard.', 'WHATSAPP', 'APPROVED', '${tenantId}', '${now}', '${now}')
        `);

        console.log('Raw SQL Insert Completed.');

    } catch (error) {
        console.error('Raw Seed Error:', error);
    } finally {
        await sequelize.close();
    }
}

rawSeed();
