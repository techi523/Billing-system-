import { Sequelize, DataTypes, Model } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const useMySQL = process.env.DB_TYPE === 'mysql';

const sequelize = useMySQL
  ? new Sequelize(
    process.env.DB_NAME || 'hotspot_db',
    process.env.DB_USER || 'root',
    process.env.DB_PASS || '',
    {
      host: process.env.DB_HOST || 'localhost',
      dialect: 'mysql',
      logging: false,
    }
  )
  : new Sequelize({
    dialect: 'sqlite',
    storage: './hotspot_db.sqlite',
    logging: false,
  });

export class Package extends Model {
  public id!: number;
  public name!: string;
  public price!: number;
  public durationMinutes!: number | null;
  public dataLimitBytes!: number | null;
  public speedLimit!: string | null;
  public isEnabled!: boolean;
}
Package.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
  dataLimitBytes: { type: DataTypes.BIGINT, allowNull: true },
  speedLimit: { type: DataTypes.STRING, allowNull: true },
  isEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'package' });

export class Payment extends Model {
  public id!: string;
  public mpesaReceiptNumber!: string;
  public amount!: number;
  public phoneNumber!: string;
  public status!: 'PENDING' | 'SUCCESS' | 'FAILED';
  public packageId!: number;
  public macAddress!: string;
  public ipAddress!: string;
}
Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mpesaReceiptNumber: { type: DataTypes.STRING, unique: true },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'), defaultValue: 'PENDING' },
  packageId: { type: DataTypes.INTEGER, allowNull: false },
  macAddress: { type: DataTypes.STRING },
  ipAddress: { type: DataTypes.STRING },
}, { sequelize, modelName: 'payment' });

export class Session extends Model {
  public id!: string;
  public paymentId!: string;
  public mikrotikUsername!: string;
  public mikrotikPassword!: string;
  public macAddress!: string;
  public ipAddress!: string;
  public startTime!: Date;
  public expiryTime!: Date;
  public status!: 'ACTIVE' | 'EXPIRED';
  public fraudScore!: number;
}
Session.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  paymentId: { type: DataTypes.UUID, allowNull: false },
  mikrotikUsername: { type: DataTypes.STRING, allowNull: false },
  mikrotikPassword: { type: DataTypes.STRING, allowNull: false },
  macAddress: { type: DataTypes.STRING, allowNull: false },
  ipAddress: { type: DataTypes.STRING },
  startTime: { type: DataTypes.DATE },
  expiryTime: { type: DataTypes.DATE },
  status: { type: DataTypes.ENUM('ACTIVE', 'EXPIRED'), defaultValue: 'ACTIVE' },
  fraudScore: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { sequelize, modelName: 'session' });

export class FraudLog extends Model { }
FraudLog.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sessionId: { type: DataTypes.UUID },
  violationType: { type: DataTypes.STRING },
  details: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'fraud_log' });

// Relationships
Payment.hasOne(Session, { foreignKey: 'payment_id' });
Session.belongsTo(Payment, { foreignKey: 'payment_id' });
Payment.belongsTo(Package, { foreignKey: 'package_id' });

export { sequelize };
