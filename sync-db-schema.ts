import { sequelize } from './src/models';

async function syncDbSchema() {
    try {
        console.log('Syncing database schema (altering tables with new profile columns)...');
        await sequelize.sync({ alter: true });
        console.log('✅ Database schema synced successfully!');
    } catch (e: any) {
        console.error('❌ Database Sync Error:', e.message);
    } finally {
        await sequelize.close();
    }
}

syncDbSchema();
