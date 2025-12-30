import { Package, sequelize } from './models';

async function seed() {
    await sequelize.sync({ force: true });

    await Package.bulkCreate([
        { name: '30 Minutes', price: 20, durationMinutes: 30, speedLimit: '2M/2M' },
        { name: '1 Hour', price: 35, durationMinutes: 60, speedLimit: '3M/3M' },
        { name: '24 Hours', price: 100, durationMinutes: 1440, speedLimit: '5M/5M' },
        { name: '1 GB Data', price: 50, dataLimitBytes: 1073741824, speedLimit: '10M/10M' },
        { name: '5 GB Data', price: 200, dataLimitBytes: 5368709120, speedLimit: '10M/10M' }
    ]);

    console.log('Database seeded with hotspot packages!');
    process.exit(0);
}

seed();
