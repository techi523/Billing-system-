import { sequelize } from '../src/models';

async function listTables() {
    try {
        await sequelize.authenticate();
        const [results, metadata] = await sequelize.query("SELECT name FROM sqlite_master WHERE type='table';");
        console.log('Tables in DB:', results);
    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

listTables();
