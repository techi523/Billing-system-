import { sequelize, MessageTemplate } from '../src/models';

async function checkTemplates() {
    try {
        await sequelize.authenticate();
        const tenantId = '7a829e2f-5197-466a-49ee-9d6a-61e6027a96'; // From previous output

        console.log(`Checking templates for Tenant ID: ${tenantId}`);
        const templates = await MessageTemplate.findAll({
            where: { tenantId }
        });

        console.log(`Found ${templates.length} templates.`);
        templates.forEach(t => {
            console.log(`- ${t.channel}: ${t.name} (${t.status})`);
        });

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkTemplates();
