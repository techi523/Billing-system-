import { sequelize, MessageTemplate } from '../src/models';

async function dump() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const templates = await MessageTemplate.findAll();
        console.log(`Total templates in DB: ${templates.length}`);
        templates.forEach(t => {
            console.log(`- ID: ${t.id}, Name: ${t.name}, Tenant: ${t.tenantId}`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

dump();
