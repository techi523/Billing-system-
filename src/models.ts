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

export class Tenant extends Model {
  public id!: string;
  public name!: string;
  public subdomain!: string;
  public logoUrl!: string | null;
  public primaryColor!: string | null;
  // M-Pesa dynamic credentials
  public mpesaShortcode!: string | null;
  public mpesaConsumerKey!: string | null;
  public mpesaConsumerSecret!: string | null;
  public mpesaPasskey!: string | null;
  public status!: 'ACTIVE' | 'SUSPENDED';
}
Tenant.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  subdomain: { type: DataTypes.STRING, unique: true, allowNull: false },
  logoUrl: { type: DataTypes.STRING },
  primaryColor: { type: DataTypes.STRING, defaultValue: '#3b82f6' },
  mpesaShortcode: { type: DataTypes.STRING },
  mpesaConsumerKey: { type: DataTypes.STRING },
  mpesaConsumerSecret: { type: DataTypes.STRING },
  mpesaPasskey: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('ACTIVE', 'SUSPENDED'), defaultValue: 'ACTIVE' },
}, { sequelize, modelName: 'tenant' });

export class AdminUser extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public role!: 'SUPER_ADMIN' | 'TENANT_ADMIN' | 'AGENT';
  public tenantId!: string | null;
  public commissionRate!: number; // Percentage (e.g., 0.1 for 10%)
}
AdminUser.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('SUPER_ADMIN', 'TENANT_ADMIN', 'AGENT'), defaultValue: 'TENANT_ADMIN' },
  tenantId: { type: DataTypes.UUID, allowNull: true }, // null for super admin
  commissionRate: { type: DataTypes.FLOAT, defaultValue: 0.0 },
}, { sequelize, modelName: 'admin_user' });

export class Router extends Model {
  public id!: string;
  public name!: string;
  public host!: string;
  public port!: number;
  public username!: string;
  public password!: string;
  public tenantId!: string;
}
Router.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  host: { type: DataTypes.STRING, allowNull: false },
  port: { type: DataTypes.INTEGER, defaultValue: 8728 },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'router' });

export class Package extends Model {
  public id!: number;
  public name!: string;
  public price!: number;
  public durationMinutes!: number | null;
  public dataLimitBytes!: number | null;
  public speedLimit!: string | null;
  public isEnabled!: boolean;
  public tenantId!: string;
  public type!: 'HOTSPOT' | 'ISP';
}
Package.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.FLOAT, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
  dataLimitBytes: { type: DataTypes.BIGINT, allowNull: true },
  speedLimit: { type: DataTypes.STRING, allowNull: true },
  isEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('HOTSPOT', 'ISP'), defaultValue: 'HOTSPOT' },
}, { sequelize, modelName: 'package' });

export class Subscriber extends Model {
  public id!: string;
  public name!: string;
  public phoneNumber!: string;
  public pppoeUsername!: string;
  public pppoePassword!: string;
  public address!: string | null;
  public status!: 'ACTIVE' | 'SUSPENDED' | 'EXPIRED';
  public tenantId!: string;
  public packageId!: number;
  public routerId!: string;
  public expiryDate!: Date | null;
}
Subscriber.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  pppoeUsername: { type: DataTypes.STRING, unique: true, allowNull: false },
  pppoePassword: { type: DataTypes.STRING, allowNull: false },
  address: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('ACTIVE', 'SUSPENDED', 'EXPIRED'), defaultValue: 'ACTIVE' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  packageId: { type: DataTypes.INTEGER, allowNull: false },
  routerId: { type: DataTypes.UUID, allowNull: false },
  expiryDate: { type: DataTypes.DATE },
}, { sequelize, modelName: 'subscriber' });

export class Invoice extends Model {
  public id!: string;
  public subscriberId!: string;
  public amount!: number;
  public dueDate!: Date;
  public status!: 'UNPAID' | 'PAID' | 'CANCELLED';
  public tenantId!: string;
}
Invoice.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  subscriberId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('UNPAID', 'PAID', 'CANCELLED'), defaultValue: 'UNPAID' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'invoice' });

export class Wallet extends Model {
  public id!: string;
  public ownerId!: string; // Subscriber ID, Agent ID, or Tenant ID
  public ownerType!: 'SUBSCRIBER' | 'TENANT' | 'AGENT';
  public balance!: number;
  public tenantId!: string;
}
Wallet.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  ownerType: { type: DataTypes.ENUM('SUBSCRIBER', 'TENANT', 'AGENT'), allowNull: false },
  balance: { type: DataTypes.FLOAT, defaultValue: 0 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'wallet' });

export class Payment extends Model {
  public id!: string;
  public mpesaReceiptNumber!: string;
  public checkoutRequestId!: string | null;
  public amount!: number;
  public phoneNumber!: string;
  public status!: 'PENDING' | 'SUCCESS' | 'FAILED';
  public packageId!: number;
  public macAddress!: string | null;
  public ipAddress!: string | null;
  public tenantId!: string;
  public routerId!: string | null;
  public subscriberId!: string | null;
  public rawCallback!: string | null; // Storing the full JSON payload
}
Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mpesaReceiptNumber: { type: DataTypes.STRING, unique: true },
  checkoutRequestId: { type: DataTypes.STRING, unique: true },
  amount: { type: DataTypes.FLOAT, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED'), defaultValue: 'PENDING' },
  packageId: { type: DataTypes.INTEGER, allowNull: false },
  macAddress: { type: DataTypes.STRING },
  ipAddress: { type: DataTypes.STRING },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  routerId: { type: DataTypes.UUID, allowNull: true },
  subscriberId: { type: DataTypes.UUID, allowNull: true },
  rawCallback: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'payment' });

export class Session extends Model {
  public id!: string;
  public paymentId!: string;
  public routerId!: string;
  public mikrotikUsername!: string;
  public mikrotikPassword!: string;
  public macAddress!: string;
  public ipAddress!: string;
  public startTime!: Date;
  public expiryTime!: Date;
  public status!: 'ACTIVE' | 'EXPIRED';
  public fraudScore!: number;
  public tenantId!: string;
}
Session.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  paymentId: { type: DataTypes.UUID, allowNull: false },
  routerId: { type: DataTypes.UUID, allowNull: false },
  mikrotikUsername: { type: DataTypes.STRING, allowNull: false },
  mikrotikPassword: { type: DataTypes.STRING, allowNull: false },
  macAddress: { type: DataTypes.STRING, allowNull: false },
  ipAddress: { type: DataTypes.STRING },
  startTime: { type: DataTypes.DATE },
  expiryTime: { type: DataTypes.DATE },
  status: { type: DataTypes.ENUM('ACTIVE', 'EXPIRED'), defaultValue: 'ACTIVE' },
  fraudScore: { type: DataTypes.INTEGER, defaultValue: 0 },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'session' });

export class Voucher extends Model {
  public id!: string;
  public code!: string;
  public packageId!: number;
  public status!: 'AVAILABLE' | 'USED' | 'EXPIRED';
  public tenantId!: string;
  public usedAt!: Date | null;
  public soldByAgentId!: string | null;
}
Voucher.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  code: { type: DataTypes.STRING, unique: true, allowNull: false },
  packageId: { type: DataTypes.INTEGER, allowNull: false },
  status: { type: DataTypes.ENUM('AVAILABLE', 'USED', 'EXPIRED'), defaultValue: 'AVAILABLE' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  usedAt: { type: DataTypes.DATE },
  soldByAgentId: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'voucher' });

export class FraudLog extends Model {
  public id!: number;
  public sessionId!: string;
  public violationType!: string;
  public details!: string;
  public tenantId!: string;
}
FraudLog.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  sessionId: { type: DataTypes.UUID },
  violationType: { type: DataTypes.STRING },
  details: { type: DataTypes.TEXT },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'fraud_log' });

// Relationships
Tenant.hasMany(AdminUser, { foreignKey: 'tenantId' });
AdminUser.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Router, { foreignKey: 'tenantId' });
Router.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Package, { foreignKey: 'tenantId' });
Package.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Subscriber, { foreignKey: 'tenantId' });
Subscriber.belongsTo(Tenant, { foreignKey: 'tenantId' });

Subscriber.belongsTo(Package, { foreignKey: 'packageId' });
Package.hasMany(Subscriber, { foreignKey: 'packageId' });

Tenant.hasMany(Payment, { foreignKey: 'tenantId' });
Payment.belongsTo(Tenant, { foreignKey: 'tenantId' });

Payment.hasOne(Session, { foreignKey: 'paymentId' });
Session.belongsTo(Payment, { foreignKey: 'paymentId' });

Payment.belongsTo(Package, { foreignKey: 'packageId' });
Package.hasMany(Payment, { foreignKey: 'packageId' });

Payment.belongsTo(Subscriber, { foreignKey: 'subscriberId' });
Subscriber.hasMany(Payment, { foreignKey: 'subscriberId' });

Tenant.hasMany(Session, { foreignKey: 'tenantId' });
Session.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(FraudLog, { foreignKey: 'tenantId' });
FraudLog.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Invoice, { foreignKey: 'tenantId' });
Invoice.belongsTo(Tenant, { foreignKey: 'tenantId' });

Subscriber.hasMany(Invoice, { foreignKey: 'subscriberId' });
Invoice.belongsTo(Subscriber, { foreignKey: 'subscriberId' });

Tenant.hasMany(Wallet, { foreignKey: 'tenantId' });
Wallet.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(Voucher, { foreignKey: 'tenantId' });
Voucher.belongsTo(Tenant, { foreignKey: 'tenantId' });

Voucher.belongsTo(Package, { foreignKey: 'packageId' });
Package.hasMany(Voucher, { foreignKey: 'packageId' });

export { sequelize };
