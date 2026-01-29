/**
 * Production-Ready Database Migration Script
 * 
 * This script transforms the demo database into a production-grade schema.
 * It removes all demo/test data and creates clean, normalized tables
 * with proper constraints, indexes, and relationships.
 * 
 * ⚠️  WARNING: This migration is IRREVERSIBLE for demo data
 *    Backup your database before running!
 * 
 * Usage: node src/migrations/production-migration.js
 */

const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Create sequelize instance
const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './hotspot_db_production.sqlite',
    logging: false,
});

// ============================================
// MIGRATION SQL - Create all production tables
// ============================================

const migrationSQL = `
-- ============================================
-- 🔐 AUTHENTICATION & USERS
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS roles (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name VARCHAR(100) NOT NULL,
  description TEXT,
  permissions TEXT DEFAULT '[]',
  is_system BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Permissions table
CREATE TABLE IF NOT EXISTS permissions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name VARCHAR(100) NOT NULL,
  resource VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Users table (renamed from AdminUser)
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  phone_number VARCHAR(20),
  role_id TEXT NOT NULL,
  tenant_id TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING', 'DEACTIVATED')),
  email_verified BOOLEAN DEFAULT 0,
  last_login_at DATETIME,
  password_changed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- User sessions
CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip_address VARCHAR(45) NOT NULL,
  user_agent TEXT,
  login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'REVOKED', 'FORCE_LOGOUT')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Password resets
CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  user_id TEXT NOT NULL,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  used_at DATETIME,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'USED', 'EXPIRED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- Role-Permission many-to-many
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id TEXT NOT NULL,
  permission_id TEXT NOT NULL,
  PRIMARY KEY (role_id, permission_id),
  FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE
);

-- ============================================
-- 🏢 MULTI-TENANCY
-- ============================================

-- Tenants table (production-ready)
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(100) NOT NULL UNIQUE,
  status TEXT DEFAULT 'PENDING_VERIFICATION' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'PENDING_VERIFICATION', 'CLOSED')),
  plan_tier TEXT DEFAULT 'FREE' CHECK(plan_tier IN ('FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE')),
  logo_url VARCHAR(500),
  primary_color VARCHAR(7) DEFAULT '#3b82f6',
  website VARCHAR(500),
  description TEXT,
  contact_email VARCHAR(255),
  contact_phone VARCHAR(20),
  subscription_expires_at DATETIME,
  max_users INTEGER DEFAULT 5,
  max_routers INTEGER DEFAULT 10,
  max_subscribers INTEGER DEFAULT 100,
  kyc_status TEXT DEFAULT 'PENDING' CHECK(kyc_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
  bank_name VARCHAR(200),
  bank_account_number VARCHAR(50),
  bank_account_name VARCHAR(200),
  bank_branch VARCHAR(200),
  bank_swift_code VARCHAR(20),
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tenant settings
CREATE TABLE IF NOT EXISTS tenant_settings (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  key VARCHAR(100) NOT NULL,
  value TEXT,
  is_encrypted BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  UNIQUE(tenant_id, key)
);

-- Tenant-User junction
CREATE TABLE IF NOT EXISTS tenant_users (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  status TEXT DEFAULT 'INVITED' CHECK(status IN ('ACTIVE', 'SUSPENDED', 'INVITED')),
  invited_at DATETIME,
  joined_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  deleted_at DATETIME,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (role_id) REFERENCES roles(id),
  UNIQUE(tenant_id, user_id)
);

-- ============================================
-- 📦 BILLING & PACKAGES
-- ============================================

-- Internet packages
CREATE TABLE IF NOT EXISTS internet_packages (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  type TEXT DEFAULT 'HOTSPOT' CHECK(type IN ('HOTSPOT', 'PPPOE', 'static_ip')),
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'ARCHIVED')),
  download_speed_kbps INTEGER DEFAULT 1024,
  upload_speed_kbps INTEGER DEFAULT 512,
  data_limit_bytes INTEGER,
  duration_minutes INTEGER,
  price_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  valid_from DATETIME DEFAULT CURRENT_TIMESTAMP,
  valid_until DATETIME,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- Package pricing tiers
CREATE TABLE IF NOT EXISTS package_pricing (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  package_id TEXT NOT NULL,
  name VARCHAR(100) NOT NULL,
  duration_minutes INTEGER,
  data_limit_bytes INTEGER,
  price_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  is_default BOOLEAN DEFAULT 0,
  sort_order INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (package_id) REFERENCES internet_packages(id) ON DELETE CASCADE
);

-- Customer sessions
CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  subscriber_id TEXT,
  package_id TEXT NOT NULL,
  router_id TEXT,
  username VARCHAR(100) NOT NULL,
  password VARCHAR(100) NOT NULL,
  mac_address VARCHAR(17),
  ip_address VARCHAR(45),
  started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  ended_at DATETIME,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED')),
  bytes_in INTEGER DEFAULT 0,
  bytes_out INTEGER DEFAULT 0,
  fraud_score INTEGER DEFAULT 0,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id),
  FOREIGN KEY (package_id) REFERENCES internet_packages(id),
  FOREIGN KEY (router_id) REFERENCES routers(id)
);

-- Access tokens
CREATE TABLE IF NOT EXISTS access_tokens (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  subscriber_id TEXT NOT NULL,
  package_id TEXT NOT NULL,
  token VARCHAR(255) NOT NULL UNIQUE,
  mac_address VARCHAR(17),
  ip_address VARCHAR(45),
  expires_at DATETIME NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'USED', 'EXPIRED')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id),
  FOREIGN KEY (package_id) REFERENCES internet_packages(id)
);

-- ============================================
-- 💳 PAYMENTS & WALLETS
-- ============================================

-- Payments
CREATE TABLE IF NOT EXISTS payments (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  subscriber_id TEXT,
  package_id TEXT NOT NULL,
  transaction_id VARCHAR(100) NOT NULL UNIQUE,
  provider_reference VARCHAR(100),
  provider_transaction_id VARCHAR(100),
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  payment_method VARCHAR(50) NOT NULL,
  payment_channel VARCHAR(50),
  phone_number VARCHAR(20),
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED')),
  initiated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  failed_at DATETIME,
  failure_code VARCHAR(50),
  failure_reason TEXT,
  callback_hash VARCHAR(64),
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (subscriber_id) REFERENCES subscribers(id),
  FOREIGN KEY (package_id) REFERENCES internet_packages(id)
);

-- Payment attempts
CREATE TABLE IF NOT EXISTS payment_attempts (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  payment_id TEXT NOT NULL,
  attempt_number INTEGER DEFAULT 1,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'RECEIVED', 'TIMEOUT', 'FAILED')),
  request_payload TEXT,
  response_payload TEXT,
  error_message TEXT,
  attempted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE
);

-- Payment callbacks
CREATE TABLE IF NOT EXISTS payment_callbacks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  payment_id TEXT,
  provider VARCHAR(50) NOT NULL,
  raw_payload TEXT NOT NULL,
  processed_payload TEXT,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSED', 'FAILED', 'DUPLICATE')),
  processed_at DATETIME,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL
);

-- Wallets
CREATE TABLE IF NOT EXISTS wallets (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  owner_type TEXT NOT NULL CHECK(owner_type IN ('SUBSCRIBER', 'TENANT', 'AGENT')),
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'FROZEN', 'CLOSED')),
  available_balance_cents INTEGER DEFAULT 0,
  pending_balance_cents INTEGER DEFAULT 0,
  frozen_balance_cents INTEGER DEFAULT 0,
  settled_balance_cents INTEGER DEFAULT 0,
  currency VARCHAR(3) DEFAULT 'KES',
  daily_withdrawal_limit_cents INTEGER,
  monthly_withdrawal_limit_cents INTEGER,
  last_withdrawal_at DATETIME,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(tenant_id, owner_id, owner_type)
);

-- Wallet ledger (IMMMUTABLE - append only)
CREATE TABLE IF NOT EXISTS wallet_ledger (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  wallet_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('CREDIT', 'DEBIT', 'FEE', 'SETTLEMENT', 'ADJUSTMENT', 'REVERSAL')),
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  balance_before_cents INTEGER NOT NULL,
  balance_after_cents INTEGER NOT NULL,
  reference_type VARCHAR(50),
  reference_id TEXT,
  description TEXT NOT NULL,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- Withdrawals
CREATE TABLE IF NOT EXISTS withdrawals (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  ledger_id TEXT,
  amount_cents INTEGER NOT NULL,
  fee_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  method TEXT NOT NULL CHECK(method IN ('MPESA', 'BANK', 'WALLET_TRANSFER')),
  destination_account VARCHAR(100) NOT NULL,
  destination_name VARCHAR(200),
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REVERSED')),
  processed_at DATETIME,
  processed_by TEXT,
  reference_number VARCHAR(100),
  failure_reason TEXT,
  requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  completed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (wallet_id) REFERENCES wallets(id),
  FOREIGN KEY (ledger_id) REFERENCES wallet_ledger(id)
);

-- Settlement batches
CREATE TABLE IF NOT EXISTS settlement_batches (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  batch_number VARCHAR(50) NOT NULL UNIQUE,
  total_amount_cents INTEGER NOT NULL,
  total_fees_cents INTEGER DEFAULT 0,
  net_amount_cents INTEGER NOT NULL,
  currency VARCHAR(3) DEFAULT 'KES',
  transaction_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  processed_at DATETIME,
  reference_number VARCHAR(100),
  processed_by TEXT,
  period_start DATETIME NOT NULL,
  period_end DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id)
);

-- ============================================
-- 🔁 INTEGRATIONS
-- ============================================

-- Payment providers
CREATE TABLE IF NOT EXISTS payment_providers (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  name VARCHAR(100) NOT NULL,
  code VARCHAR(50) NOT NULL UNIQUE,
  type TEXT NOT NULL CHECK(type IN ('MOBILE_MONEY', 'CARD', 'BANK', 'WALLET')),
  status TEXT DEFAULT 'TEST' CHECK(status IN ('ACTIVE', 'INACTIVE', 'TEST')),
  is_default BOOLEAN DEFAULT 0,
  logo_url VARCHAR(500),
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Provider configurations
CREATE TABLE IF NOT EXISTS provider_configs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  provider_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  config_key VARCHAR(100) NOT NULL,
  config_value TEXT,
  is_encrypted BOOLEAN DEFAULT 0,
  is_required BOOLEAN DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (provider_id) REFERENCES payment_providers(id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  UNIQUE(provider_id, tenant_id, config_key)
);

-- Webhooks
CREATE TABLE IF NOT EXISTS webhooks (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT NOT NULL,
  provider_id TEXT,
  url VARCHAR(500) NOT NULL,
  secret VARCHAR(255) NOT NULL,
  events TEXT NOT NULL,
  status TEXT DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE', 'INACTIVE', 'FAILED')),
  consecutive_failures INTEGER DEFAULT 0,
  last_failure_at DATETIME,
  last_success_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (provider_id) REFERENCES payment_providers(id)
);

-- Webhook logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  webhook_id TEXT NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  payload TEXT NOT NULL,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SENT', 'FAILED', 'RETRYING')),
  attempts INTEGER DEFAULT 0,
  last_attempt_at DATETIME,
  next_retry_at DATETIME,
  response_status INTEGER,
  response_body TEXT,
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (webhook_id) REFERENCES webhooks(id) ON DELETE CASCADE
);

-- ============================================
-- 🛡️ AUDITING & RELIABILITY
-- ============================================

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  tenant_id TEXT,
  user_id TEXT,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100) NOT NULL,
  resource_id VARCHAR(100),
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- System logs
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  level TEXT NOT NULL CHECK(level IN ('DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL')),
  source VARCHAR(100) NOT NULL,
  message TEXT NOT NULL,
  context TEXT,
  metadata TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Failed jobs
CREATE TABLE IF NOT EXISTS failed_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  queue VARCHAR(100) NOT NULL,
  payload TEXT NOT NULL,
  exception TEXT NOT NULL,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at DATETIME,
  status TEXT DEFAULT 'RETRYING' CHECK(status IN ('RETRYING', 'FAILED', 'PERMANENTLY_FAILED')),
  failed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Retries
CREATE TABLE IF NOT EXISTS retries (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  failed_job_id TEXT NOT NULL,
  scheduled_at DATETIME NOT NULL,
  attempted_at DATETIME,
  status TEXT DEFAULT 'PENDING' CHECK(status IN ('PENDING', 'SUCCESS', 'FAILED')),
  error_message TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (failed_job_id) REFERENCES failed_jobs(id) ON DELETE CASCADE
);

-- ============================================
-- 📋 INDEXES (Performance optimization)
-- ============================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON user_sessions(expires_at);
CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_status ON tenants(status);
CREATE INDEX IF NOT EXISTS idx_packages_tenant ON internet_packages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_tenant ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_wallets_owner ON wallets(tenant_id, owner_id, owner_type);
CREATE INDEX IF NOT EXISTS idx_ledger_wallet ON wallet_ledger(wallet_id);
CREATE INDEX IF NOT EXISTS idx_ledger_created ON wallet_ledger(created_at);
CREATE INDEX IF NOT EXISTS idx_withdrawals_tenant ON withdrawals(tenant_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_status ON withdrawals(status);
CREATE INDEX IF NOT EXISTS idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_logs_level ON system_logs(level);
CREATE INDEX IF NOT EXISTS idx_logs_source ON system_logs(source);
CREATE INDEX IF NOT EXISTS idx_logs_created ON system_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant ON webhooks(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_webhook ON webhook_logs(webhook_id);
`;

async function runProductionMigration() {
    console.log('🚀 Starting Production Database Migration...\n');
    console.log('⚠️  WARNING: This will DELETE all demo data and recreate tables!\n');

    try {
        // Test connection
        await sequelize.authenticate();
        console.log('✅ Database connection established\n');

        // Run migration
        console.log('📦 Creating production tables...');
        await sequelize.query(migrationSQL);
        console.log('✅ All production tables created successfully!\n');

        // Seed system data
        console.log('🔐 Creating system roles...');
        await sequelize.query(`
      INSERT INTO roles (id, name, description, is_system) VALUES
      ('role-super-admin', 'Super Admin', 'Full system access', 1),
      ('role-tenant-admin', 'Tenant Admin', 'Full tenant access', 1),
      ('role-tenant-staff', 'Tenant Staff', 'Limited tenant access', 1),
      ('role-agent', 'Agent', 'Can sell vouchers and packages', 1)
    `);

        console.log('🔑 Creating permissions...');
        await sequelize.query(`
      INSERT INTO permissions (id, name, resource, action, description) VALUES
      ('perm-users-create', 'Create Users', 'users', 'create', 'Create new users'),
      ('perm-users-read', 'Read Users', 'users', 'read', 'View user information'),
      ('perm-users-update', 'Update Users', 'users', 'update', 'Modify user data'),
      ('perm-users-delete', 'Delete Users', 'users', 'delete', 'Remove users'),
      ('perm-payments-read', 'View Payments', 'payments', 'read', 'View payment records'),
      ('perm-payments-process', 'Process Payments', 'payments', 'process', 'Process payments'),
      ('perm-payments-refund', 'Refund Payments', 'payments', 'refund', 'Issue refunds'),
      ('perm-wallets-read', 'View Wallets', 'wallets', 'read', 'View wallet balances'),
      ('perm-wallets-manage', 'Manage Wallets', 'wallets', 'manage', 'Manage wallet operations'),
      ('perm-packages-manage', 'Manage Packages', 'packages', 'manage', 'Create and modify packages'),
      ('perm-subscribers-manage', 'Manage Subscribers', 'subscribers', 'manage', 'Manage subscriber accounts'),
      ('perm-reports-read', 'View Reports', 'reports', 'read', 'Access reports and analytics'),
      ('perm-settings-manage', 'Manage Settings', 'settings', 'manage', 'Modify system settings')
    `);

        console.log('👤 Creating default super admin user...');
        const adminPasswordHash = await bcrypt.hash(process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!', 12);
        await sequelize.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, role_id, status, email_verified)
      VALUES (
        'user-super-admin',
        '${process.env.SUPER_ADMIN_EMAIL || 'admin@system.local'}',
        '${adminPasswordHash}',
        'System',
        'Administrator',
        'role-super-admin',
        'ACTIVE',
        1
      )
    `);

        console.log('💳 Setting up payment providers...');
        await sequelize.query(`
      INSERT INTO payment_providers (id, name, code, type, status, is_default) VALUES
      ('provider-mpesa', 'M-Pesa', 'mpesa', 'MOBILE_MONEY', 'ACTIVE', 1),
      ('provider-stripe', 'Stripe', 'stripe', 'CARD', 'TEST', 0),
      ('provider-paystack', 'Paystack', 'paystack', 'CARD', 'TEST', 0)
    `);

        console.log('\n🎉 Production migration completed successfully!');
        console.log('\n⚠️  IMPORTANT: Change the default super admin password after first login!');
        console.log(`   Email: ${process.env.SUPER_ADMIN_EMAIL || 'admin@system.local'}`);
        console.log(`   Default Password: ${process.env.SUPER_ADMIN_PASSWORD || 'ChangeMe123!'}\n`);

    } catch (error) {
        console.error('❌ Migration failed:', error);
        throw error;
    } finally {
        await sequelize.close();
    }
}

// Run migration if executed directly
if (require.main === module) {
    runProductionMigration()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = { runProductionMigration };
