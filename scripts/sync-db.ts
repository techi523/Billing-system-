import { sequelize } from '../src/models';

async function syncSchema() {
    try {
        console.log('Starting schema synchronization...');
        await sequelize.sync({ alter: true });
        console.log('Schema synchronization completed successfully.');
    } catch (error) {
        console.error('Schema synchronization failed:', error);
    } finally {
        await sequelize.close();
    }
}

syncSchema();
