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
  public description!: string | null;
  public contactPhone!: string | null;
  // Banking details for settlements
  public bankName!: string | null;
  public bankAccountNumber!: string | null;
  public bankAccountName!: string | null;
  public bankBranch!: string | null;
  public bankSwiftCode!: string | null;
  // Settlement preferences
  public minimumWithdrawalAmount!: number;
  public settlementMethod!: string;
  public settlementSchedule!: string;
  // KYC Fields
  public idNumber!: string | null;
  public businessRegistrationNumber!: string | null;
  public taxPin!: string | null;
  // Withdrawal verification
  public withdrawalVerificationMethod!: 'OTP_EMAIL' | 'OTP_SMS' | 'NONE';
  // Payment Channels
  public mpesaPaybillNumber!: string | null;
  public mpesaTillNumber!: string | null;
  public mpesaPochiNumber!: string | null;
  public bankAccountDetails!: string | null; // JSON string
  // Aggregator Model
  public aggregatorSubAccountId!: string | null;
  public commissionPercentage!: number; // e.g. 10 for 10%
  // Hybrid Pricing Model
  public baseMonthlyFee!: number;
  public transactionFee!: number;
  public smsFee!: number;
  public activeUserFee!: number;
  public subscriptionExpiry!: Date | null;
  // IntaSend Credentials (Optional per tenant)
  public intasendPublishableKey!: string | null;
  public intasendSecretKey!: string | null;
  public isProduction!: boolean;
  public isGoLiveChecked!: boolean;
  public productionReadyAt!: Date | null;
  public lastSanitizedAt!: Date | null;
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
  description: { type: DataTypes.TEXT },
  contactPhone: { type: DataTypes.STRING },
  bankName: { type: DataTypes.STRING },
  bankAccountNumber: { type: DataTypes.STRING },
  bankAccountName: { type: DataTypes.STRING },
  bankBranch: { type: DataTypes.STRING },
  bankSwiftCode: { type: DataTypes.STRING },
  minimumWithdrawalAmount: { type: DataTypes.BIGINT, defaultValue: 10000 }, // 100.00 KES
  settlementMethod: { type: DataTypes.STRING, defaultValue: 'INTASEND' },
  settlementSchedule: { type: DataTypes.STRING, defaultValue: 'MANUAL' },
  idNumber: { type: DataTypes.STRING },
  businessRegistrationNumber: { type: DataTypes.STRING },
  taxPin: { type: DataTypes.STRING },
  withdrawalVerificationMethod: { type: DataTypes.ENUM('OTP_EMAIL', 'OTP_SMS', 'NONE'), defaultValue: 'NONE' },
  mpesaPaybillNumber: { type: DataTypes.STRING },
  mpesaTillNumber: { type: DataTypes.STRING },
  mpesaPochiNumber: { type: DataTypes.STRING },
  bankAccountDetails: { type: DataTypes.TEXT },
  aggregatorSubAccountId: { type: DataTypes.STRING },
  commissionPercentage: { type: DataTypes.FLOAT, defaultValue: 10 },
  baseMonthlyFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  transactionFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  smsFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  activeUserFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  subscriptionExpiry: { type: DataTypes.DATE },
  intasendPublishableKey: { type: DataTypes.STRING },
  intasendSecretKey: { type: DataTypes.STRING },
  isProduction: { type: DataTypes.BOOLEAN, defaultValue: false },
  isGoLiveChecked: { type: DataTypes.BOOLEAN, defaultValue: false },
  productionReadyAt: { type: DataTypes.DATE },
  lastSanitizedAt: { type: DataTypes.DATE },
}, { sequelize, modelName: 'tenant' });

export class AdminUser extends Model {
  public id!: string;
  public email!: string;
  public password!: string;
  public role!: 'SUPER_ADMIN' | 'TENANT' | 'STAFF' | 'AGENT';
  public tenantId!: string | null;
  public commissionRate!: number; // Percentage (e.g., 0.1 for 10%)
}
AdminUser.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('SUPER_ADMIN', 'TENANT', 'STAFF', 'AGENT'), defaultValue: 'TENANT' },
  tenantId: {
    type: DataTypes.UUID,
    allowNull: true,
    references: { model: 'tenants', key: 'id' },
    onDelete: 'SET NULL',
    onUpdate: 'CASCADE'
  },
  commissionRate: { type: DataTypes.FLOAT, defaultValue: 0.0 },
}, {
  sequelize,
  modelName: 'admin_user',
  hooks: {
    beforeCreate: async (user) => {
      if (user.role !== 'SUPER_ADMIN' && !user.tenantId) {
        throw new Error('Tenant ID is required for non-super admin users');
      }
    },
    beforeUpdate: async (user) => {
      if (user.role !== 'SUPER_ADMIN' && !user.tenantId) {
        throw new Error('Tenant ID is required for non-super admin users');
      }
    }
  }
});

export class Router extends Model {
  public id!: string;
  public name!: string;
  public host!: string;
  public port!: number;
  public username!: string;
  public password!: string;
  public tenantId!: string;
  public location!: string | null;
  public isOnline!: boolean;
  public lastSeen!: Date | null;
  public identity!: string | null;
  public validationStatus!: 'PENDING' | 'VALIDATED' | 'FAILED';
  // Auto-configuration fields
  public apiUser!: string | null;
  public apiPassword!: string | null;
  public autoConfigStatus!: 'PENDING' | 'CONFIGURED' | 'FAILED';
  public autoConfigScript!: string | null;
  public autoConfigError!: string | null;
  public capabilities!: string | null; // JSON: {hotspot: true, pppoe: true, radius: true}
  public version!: string | null; // RouterOS version
  public model!: string | null; // Hardware model
  public architecture!: string | null; // arm, mipsbe, x86, etc.
}
Router.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  host: { type: DataTypes.STRING, allowNull: false },
  port: { type: DataTypes.INTEGER, defaultValue: 8728 },
  username: { type: DataTypes.STRING, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  location: { type: DataTypes.STRING },
  isOnline: { type: DataTypes.BOOLEAN, defaultValue: false },
  lastSeen: { type: DataTypes.DATE },
  identity: { type: DataTypes.STRING },
  validationStatus: { type: DataTypes.ENUM('PENDING', 'VALIDATED', 'FAILED'), defaultValue: 'PENDING' },
  // Auto-configuration fields
  apiUser: { type: DataTypes.STRING },
  apiPassword: { type: DataTypes.STRING },
  autoConfigStatus: { type: DataTypes.ENUM('PENDING', 'CONFIGURED', 'FAILED'), defaultValue: 'PENDING' },
  autoConfigScript: { type: DataTypes.TEXT },
  autoConfigError: { type: DataTypes.TEXT },
  capabilities: { type: DataTypes.TEXT }, // JSON string
  version: { type: DataTypes.STRING },
  model: { type: DataTypes.STRING },
  architecture: { type: DataTypes.STRING },
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
  // Enhanced MikroTik fields
  public description!: string | null;
  public validity!: number | null; // Days until expiry
  public uploadSpeed!: string | null; // e.g., "10M"
  public downloadSpeed!: string | null; // e.g., "20M"
  public burstUpload!: string | null; // e.g., "15M"
  public burstDownload!: string | null; // e.g., "30M"
  public burstThreshold!: string | null; // e.g., "8M/16M"
  public burstTime!: string | null; // e.g., "8s/8s"
  public priority!: number; // Queue priority 1-8
  public sharedUsers!: number; // Max concurrent connections
  public expiryAction!: 'SUSPEND' | 'DELETE' | 'NOTIFY';
  public isVisible!: boolean; // Show on captive portal
  public category!: string | null; // e.g., 'Daily', 'Weekly', 'Monthly'
  public mikrotikProfile!: string | null; // Custom profile name
  public limitAtTime!: string | null; // Time-based limits
  public parentQueue!: string | null; // Parent queue for hierarchical QoS
}
Package.init({
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: false },
  price: { type: DataTypes.BIGINT, allowNull: false },
  durationMinutes: { type: DataTypes.INTEGER, allowNull: true },
  dataLimitBytes: { type: DataTypes.BIGINT, allowNull: true },
  speedLimit: { type: DataTypes.STRING, allowNull: true },
  isEnabled: { type: DataTypes.BOOLEAN, defaultValue: true },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  type: { type: DataTypes.ENUM('HOTSPOT', 'ISP'), defaultValue: 'HOTSPOT' },
  // Enhanced MikroTik fields
  description: { type: DataTypes.TEXT },
  validity: { type: DataTypes.INTEGER }, // Days
  uploadSpeed: { type: DataTypes.STRING },
  downloadSpeed: { type: DataTypes.STRING },
  burstUpload: { type: DataTypes.STRING },
  burstDownload: { type: DataTypes.STRING },
  burstThreshold: { type: DataTypes.STRING },
  burstTime: { type: DataTypes.STRING },
  priority: { type: DataTypes.INTEGER, defaultValue: 8 },
  sharedUsers: { type: DataTypes.INTEGER, defaultValue: 1 },
  expiryAction: { type: DataTypes.ENUM('SUSPEND', 'DELETE', 'NOTIFY'), defaultValue: 'SUSPEND' },
  isVisible: { type: DataTypes.BOOLEAN, defaultValue: true },
  category: { type: DataTypes.STRING },
  mikrotikProfile: { type: DataTypes.STRING },
  limitAtTime: { type: DataTypes.STRING },
  parentQueue: { type: DataTypes.STRING },
}, { sequelize, modelName: 'package' });

export class Subscriber extends Model {
  public id!: string;
  public name!: string | null;
  public phoneNumber!: string;
  public macAddress!: string | null;
  public pppoeUsername!: string | null;
  public pppoePassword!: string | null;
  public address!: string | null;
  public status!: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED';
  public tenantId!: string;
  public routerId!: string | null;
  public packageId!: number | null;
  public expiryDate!: Date | null;
  public lastPaymentDate!: Date | null;
  public notes!: string | null;
}
Subscriber.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  name: { type: DataTypes.STRING, allowNull: true },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  macAddress: { type: DataTypes.STRING, allowNull: true },
  pppoeUsername: { type: DataTypes.STRING, unique: true, allowNull: true },
  pppoePassword: { type: DataTypes.STRING, allowNull: true },
  address: { type: DataTypes.STRING },
  status: { type: DataTypes.ENUM('ACTIVE', 'INACTIVE', 'SUSPENDED'), defaultValue: 'INACTIVE' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  routerId: { type: DataTypes.UUID, allowNull: true },
  packageId: { type: DataTypes.INTEGER, allowNull: true },
  expiryDate: { type: DataTypes.DATE },
  lastPaymentDate: { type: DataTypes.DATE },
  notes: { type: DataTypes.TEXT },
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
  amount: { type: DataTypes.BIGINT, allowNull: false },
  dueDate: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('UNPAID', 'PAID', 'CANCELLED'), defaultValue: 'UNPAID' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'invoice' });

export class Wallet extends Model {
  public id!: string;
  public ownerId!: string; // Subscriber ID, Agent ID, or Tenant ID
  public ownerType!: 'SUBSCRIBER' | 'TENANT' | 'AGENT';
  public balance!: number;
  public frozenBalance!: number;
  public pendingBalance!: number;
  public settledBalance!: number;
  public currency!: string;
  public tenantId!: string;
}
Wallet.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  ownerId: { type: DataTypes.UUID, allowNull: false },
  ownerType: { type: DataTypes.ENUM('SUBSCRIBER', 'TENANT', 'AGENT'), allowNull: false },
  balance: { type: DataTypes.BIGINT, defaultValue: 0 },
  frozenBalance: { type: DataTypes.BIGINT, defaultValue: 0 },
  pendingBalance: { type: DataTypes.BIGINT, defaultValue: 0 },
  settledBalance: { type: DataTypes.BIGINT, defaultValue: 0 },
  currency: { type: DataTypes.STRING, defaultValue: 'KES' },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'wallet' });

export class Settlement extends Model {
  public id!: string;
  public tenantId!: string;
  public amount!: number;
  public status!: 'PENDING' | 'PAID' | 'FAILED' | 'REVERSED';
  public method!: string;
  public paidAt!: Date | null;
  public referenceNumber!: string | null;
  public transactionFee!: number;
  public walletTransactionId!: string | null;
  public processedBy!: string | null;
}
Settlement.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'PAID', 'FAILED', 'REVERSED'), defaultValue: 'PENDING' },
  method: { type: DataTypes.STRING },
  paidAt: { type: DataTypes.DATE },
  referenceNumber: { type: DataTypes.STRING },
  transactionFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  walletTransactionId: { type: DataTypes.UUID, allowNull: true },
  processedBy: { type: DataTypes.UUID, allowNull: true },
}, { sequelize, modelName: 'settlement' });

export class AuditLog extends Model {
  public id!: string;
  public tenantId!: string | null;
  public userId!: string | null;
  public action!: string;
  public details!: string;
  public ipAddress!: string | null;
}
AuditLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID },
  userId: { type: DataTypes.UUID },
  action: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.TEXT },
  ipAddress: { type: DataTypes.STRING },
}, { sequelize, modelName: 'auditLog' });

export class PlatformSetting extends Model {
  public key!: string;
  public value!: string;
}
PlatformSetting.init({
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'platformSetting' });

export class Payment extends Model {
  public id!: string;
  public mpesaReceiptNumber!: string;
  public checkoutRequestId!: string | null;
  public amount!: number;
  public phoneNumber!: string;
  public status!: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REVERSED';
  public packageId!: number;
  public macAddress!: string | null;
  public ipAddress!: string | null;
  public tenantId!: string;
  public routerId!: string | null;
  public subscriberId!: string | null;
  public rawCallback!: string | null; // Storing the full JSON payload
  public processedCallbackHash!: string | null; // For idempotency
  public completedAt!: Date | null; // Completion timestamp
  public failureReason!: string | null; // Failure details
  public sessionId!: string | null; // Session identifier for tracking
  public metadata!: string | null; // Additional metadata as JSON
  public paymentChannel!: string;
  public paymentMethod!: string;
  public transactionFee!: number;
  public platformFee!: number;
  public netAmount!: number;
  public walletTransactionId!: string | null;
  public aggregatorTransactionId!: string | null;
  public rawAggregatorPayload!: string | null;
  // IntaSend tracking
  public intasendCheckoutId!: string | null;
  public intasendTrackingId!: string | null;
  public intasendState!: string | null;
}
Payment.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  mpesaReceiptNumber: { type: DataTypes.STRING, unique: true },
  checkoutRequestId: { type: DataTypes.STRING, unique: true },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.ENUM('PENDING', 'SUCCESS', 'FAILED', 'REVERSED'), defaultValue: 'PENDING' },
  packageId: { type: DataTypes.INTEGER, allowNull: false },
  macAddress: { type: DataTypes.STRING },
  ipAddress: { type: DataTypes.STRING },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  routerId: { type: DataTypes.UUID, allowNull: true },
  subscriberId: { type: DataTypes.UUID, allowNull: true },
  rawCallback: { type: DataTypes.TEXT },
  processedCallbackHash: { type: DataTypes.STRING }, // For idempotency checks
  completedAt: { type: DataTypes.DATE }, // When payment completed
  failureReason: { type: DataTypes.STRING }, // Detailed failure reason
  sessionId: { type: DataTypes.STRING }, // Encrypted session identifier
  metadata: { type: DataTypes.TEXT }, // JSON metadata storage
  paymentChannel: { type: DataTypes.STRING, defaultValue: 'MPESA' },
  paymentMethod: { type: DataTypes.STRING, defaultValue: 'STK_PUSH' },
  transactionFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  platformFee: { type: DataTypes.BIGINT, defaultValue: 0 },
  netAmount: { type: DataTypes.BIGINT, defaultValue: 0 },
  walletTransactionId: { type: DataTypes.UUID, allowNull: true },
  aggregatorTransactionId: { type: DataTypes.STRING },
  rawAggregatorPayload: { type: DataTypes.TEXT },
  intasendCheckoutId: { type: DataTypes.STRING },
  intasendTrackingId: { type: DataTypes.STRING },
  intasendState: { type: DataTypes.STRING },
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
  // Bandwidth Tracking
  public bytesIn!: number;
  public bytesOut!: number;
  public lastUpdated!: Date | null;
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
  bytesIn: { type: DataTypes.BIGINT, defaultValue: 0 },
  bytesOut: { type: DataTypes.BIGINT, defaultValue: 0 },
  lastUpdated: { type: DataTypes.DATE },
}, { sequelize, modelName: 'session' });

export class AdminSession extends Model {
  public id!: string;
  public userId!: string;
  public tokenHash!: string;
  public ipAddress!: string;
  public userAgent!: string;
  public loginTime!: Date;
  public lastActivity!: Date;
  public expiryTime!: Date;
  public status!: 'ACTIVE' | 'EXPIRED' | 'REVOKED';
}
AdminSession.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  tokenHash: { type: DataTypes.STRING, allowNull: false },
  ipAddress: { type: DataTypes.STRING, allowNull: false },
  userAgent: { type: DataTypes.STRING },
  loginTime: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  lastActivity: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  expiryTime: { type: DataTypes.DATE, allowNull: false },
  status: { type: DataTypes.ENUM('ACTIVE', 'EXPIRED', 'REVOKED'), defaultValue: 'ACTIVE' },
}, { sequelize, modelName: 'adminSession' });

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

export class SMSLog extends Model {
  public id!: string;
  public tenantId!: string;
  public phoneNumber!: string;
  public message!: string;
  public status!: 'SENT' | 'FAILED' | 'PENDING';
  public cost!: number;
  public providerReference!: string | null;
}
SMSLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  phoneNumber: { type: DataTypes.STRING, allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  status: { type: DataTypes.ENUM('SENT', 'FAILED', 'PENDING'), defaultValue: 'PENDING' },
  cost: { type: DataTypes.BIGINT, defaultValue: 0 },
  providerReference: { type: DataTypes.STRING },
}, { sequelize, modelName: 'sms_log' });

export class PlatformTransaction extends Model {
  public id!: string;
  public type!: 'FEE_SUBSCRIPTION' | 'FEE_TRANSACTION' | 'FEE_SMS' | 'COMMISSION';
  public amount!: number;
  public tenantId!: string;
  public referenceId!: string | null; // e.g. Payment ID or SMS Log ID
  public metadata!: string | null;
}
PlatformTransaction.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  type: { type: DataTypes.ENUM('FEE_SUBSCRIPTION', 'FEE_TRANSACTION', 'FEE_SMS', 'COMMISSION'), allowNull: false },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  referenceId: { type: DataTypes.UUID },
  metadata: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'platform_transaction' });

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

Package.hasMany(Voucher, { foreignKey: 'packageId' });

Tenant.hasMany(AuditLog, { foreignKey: 'tenantId' });
AuditLog.belongsTo(Tenant, { foreignKey: 'tenantId' });

AdminUser.hasMany(AuditLog, { foreignKey: 'userId' });
AuditLog.belongsTo(AdminUser, { foreignKey: 'userId' });

Settlement.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(SMSLog, { foreignKey: 'tenantId' });
SMSLog.belongsTo(Tenant, { foreignKey: 'tenantId' });

Tenant.hasMany(PlatformTransaction, { foreignKey: 'tenantId' });
PlatformTransaction.belongsTo(Tenant, { foreignKey: 'tenantId' });

Payment.hasMany(PlatformTransaction, { foreignKey: 'referenceId', constraints: false });
PlatformTransaction.belongsTo(Payment, { foreignKey: 'referenceId', constraints: false });

SMSLog.hasMany(PlatformTransaction, { foreignKey: 'referenceId', constraints: false });
PlatformTransaction.belongsTo(SMSLog, { foreignKey: 'referenceId', constraints: false });

// Add new models for wallet transactions and ledger
export class WalletTransaction extends Model {
  public id!: string;
  public walletId!: string;
  public sourceWalletId!: string | null;
  public destinationWalletId!: string | null;
  public amount!: number;
  public transactionType!: 'CREDIT' | 'DEBIT' | 'FEE' | 'SETTLEMENT' | 'REVERSAL';
  public referenceId!: string | null;
  public referenceType!: string | null;
  public balanceAfter!: number;
  public description!: string;
  public status!: 'PENDING' | 'COMPLETED' | 'FAILED' | 'REVERSED';
  public settlementStatus!: 'PENDING' | 'SETTLED' | 'NA';
  public maturesAt!: Date | null;
  public createdBy!: string | null;
  public metadata!: string | null;
  public tenantId!: string;
}
WalletTransaction.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  walletId: { type: DataTypes.UUID, allowNull: false },
  sourceWalletId: { type: DataTypes.UUID },
  destinationWalletId: { type: DataTypes.UUID },
  amount: { type: DataTypes.BIGINT, allowNull: false },
  transactionType: { type: DataTypes.ENUM('CREDIT', 'DEBIT', 'FEE', 'SETTLEMENT', 'REVERSAL'), allowNull: false },
  referenceId: { type: DataTypes.UUID },
  referenceType: { type: DataTypes.STRING },
  balanceAfter: { type: DataTypes.BIGINT, allowNull: false },
  description: { type: DataTypes.TEXT },
  status: { type: DataTypes.ENUM('PENDING', 'COMPLETED', 'FAILED', 'REVERSED'), defaultValue: 'COMPLETED' },
  settlementStatus: { type: DataTypes.ENUM('PENDING', 'SETTLED', 'NA'), defaultValue: 'NA' },
  maturesAt: { type: DataTypes.DATE },
  createdBy: { type: DataTypes.UUID },
  metadata: { type: DataTypes.TEXT },
  tenantId: { type: DataTypes.UUID, allowNull: false },
}, { sequelize, modelName: 'walletTransaction' });

export class TieredFee extends Model {
  public id!: string;
  public platformFeeId!: string;
  public minAmount!: number;
  public maxAmount!: number;
  public feeValue!: number;
  public isPercentage!: boolean;
}
TieredFee.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  platformFeeId: { type: DataTypes.UUID, allowNull: false },
  minAmount: { type: DataTypes.BIGINT, defaultValue: 0 },
  maxAmount: { type: DataTypes.BIGINT, defaultValue: 0 },
  feeValue: { type: DataTypes.BIGINT, allowNull: false },
  isPercentage: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { sequelize, modelName: 'tieredFee' });

export class PlatformWallet extends Model {
  public id!: string;
  public balance!: number;
  public pendingBalance!: number;
  public currency!: string;
}
PlatformWallet.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  balance: { type: DataTypes.BIGINT, defaultValue: 0 },
  pendingBalance: { type: DataTypes.BIGINT, defaultValue: 0 },
  currency: { type: DataTypes.STRING, defaultValue: 'KES' },
}, { sequelize, modelName: 'platformWallet' });

export class PlatformFee extends Model {
  public id!: string;
  public feeType!: string;
  public feeValue!: number;
  public isPercentage!: boolean;
  public minAmount!: number;
  public maxAmount!: number;
  public isActive!: boolean;
  public description!: string;
}
PlatformFee.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  feeType: { type: DataTypes.STRING, allowNull: false },
  feeValue: { type: DataTypes.BIGINT, allowNull: false },
  isPercentage: { type: DataTypes.BOOLEAN, defaultValue: true },
  minAmount: { type: DataTypes.BIGINT, defaultValue: 0 },
  maxAmount: { type: DataTypes.BIGINT, defaultValue: 0 },
  isActive: { type: DataTypes.BOOLEAN, defaultValue: true },
  description: { type: DataTypes.TEXT },
}, { sequelize, modelName: 'platformFee' });

export class PasswordResetToken extends Model {
  public id!: string;
  public userId!: string;
  public token!: string;
  public expiresAt!: Date;
  public used!: boolean;
}
PasswordResetToken.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  userId: { type: DataTypes.UUID, allowNull: false },
  token: { type: DataTypes.STRING, allowNull: false, unique: true },
  expiresAt: { type: DataTypes.DATE, allowNull: false },
  used: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { sequelize, modelName: 'passwordResetToken' });

export class RouterConnectionLog extends Model {
  public id!: string;
  public routerId!: string;
  public tenantId!: string;
  public action!: 'CONNECT' | 'VERIFY' | 'DISCONNECT' | 'TEST' | 'SYNC' | 'ERROR';
  public status!: 'SUCCESS' | 'FAILED' | 'PENDING';
  public details!: string | null;
  public errorMessage!: string | null;
  public ipAddress!: string | null;
  public userId!: string | null;
  public metadata!: string | null; // JSON for additional data
}
RouterConnectionLog.init({
  id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
  routerId: { type: DataTypes.UUID, allowNull: false },
  tenantId: { type: DataTypes.UUID, allowNull: false },
  action: { type: DataTypes.ENUM('CONNECT', 'VERIFY', 'DISCONNECT', 'TEST', 'SYNC', 'ERROR'), allowNull: false },
  status: { type: DataTypes.ENUM('SUCCESS', 'FAILED', 'PENDING'), defaultValue: 'PENDING' },
  details: { type: DataTypes.TEXT },
  errorMessage: { type: DataTypes.TEXT },
  ipAddress: { type: DataTypes.STRING },
  userId: { type: DataTypes.UUID },
  metadata: { type: DataTypes.TEXT }, // JSON string
}, { sequelize, modelName: 'routerConnectionLog' });

// Add relationships for new models
AdminUser.hasMany(PasswordResetToken, { foreignKey: 'userId' });
PasswordResetToken.belongsTo(AdminUser, { foreignKey: 'userId' });

Wallet.hasMany(WalletTransaction, { foreignKey: 'walletId' });
WalletTransaction.belongsTo(Wallet, { foreignKey: 'walletId' });

Payment.belongsTo(WalletTransaction, { foreignKey: 'walletTransactionId' });
WalletTransaction.hasOne(Payment, { foreignKey: 'walletTransactionId' });

Settlement.belongsTo(WalletTransaction, { foreignKey: 'walletTransactionId' });
WalletTransaction.hasOne(Settlement, { foreignKey: 'walletTransactionId' });

PlatformFee.hasMany(TieredFee, { foreignKey: 'platformFeeId', as: 'tieredFees' });
TieredFee.belongsTo(PlatformFee, { foreignKey: 'platformFeeId', as: 'platformFee' });

// Router Connection Log relationships
Router.hasMany(RouterConnectionLog, { foreignKey: 'routerId' });
RouterConnectionLog.belongsTo(Router, { foreignKey: 'routerId' });

Tenant.hasMany(RouterConnectionLog, { foreignKey: 'tenantId' });
RouterConnectionLog.belongsTo(Tenant, { foreignKey: 'tenantId' });

AdminUser.hasMany(RouterConnectionLog, { foreignKey: 'userId' });
RouterConnectionLog.belongsTo(AdminUser, { foreignKey: 'userId' });

export { sequelize };