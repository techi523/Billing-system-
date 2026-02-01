import { sequelize, AdminUser, Tenant, MessageTemplate } from '../src/models';

async function checkVisibility() {
    try {
        await sequelize.authenticate();
        console.log('Database connected.');

        const email = 'admin@demoisp.com';
        const user = await AdminUser.findOne({ where: { email } });

        if (!user) {
            console.error(`User ${email} not found!`);
            return;
        }

        console.log(`User found: ${user.email} (Role: ${user.role})`);
        console.log(`User Tenant ID: ${user.tenantId}`);

        if (user.tenantId) {
            const tenant = await Tenant.findByPk(user.tenantId);
            console.log(`Tenant Details: Name=${tenant?.name}, Subdomain=${tenant?.subdomain}`);

            const templates = await MessageTemplate.findAll({
                where: { tenantId: user.tenantId, channel: 'WHATSAPP' }
            });

            console.log(`\nFound ${templates.length} WhatsApp templates for this tenant:`);
            templates.forEach(t => {
                console.log(`- [${t.status}] ${t.name} (ID: ${t.id})`);
            });
        } else {
            console.log('User has no Tenant ID!');
        }

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

checkVisibility();
