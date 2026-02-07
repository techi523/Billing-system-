import { sequelize } from '../src/models';

async function test() {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully.');
    } catch (error) {
        console.error('Database connection failed:', error);
    } finally {
        await sequelize.close();
    }
}

test();
