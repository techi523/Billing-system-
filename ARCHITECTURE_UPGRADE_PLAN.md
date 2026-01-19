# Enterprise Billing System Upgrade Plan

## Current System Analysis

The existing system is a basic Node.js + React application with:
- ✅ Basic user management (Super Admin, Tenant Admin, Agent)
- ✅ Package plans (time-based)
- ✅ Router management (MikroTik focused)
- ✅ Payment processing (M-Pesa)
- ✅ Voucher system
- ✅ Session tracking

## 🚀 UPGRADE ARCHITECTURE

### 1. System Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                        LOAD BALANCER                            │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                    API GATEWAY                                  │
│  - Rate Limiting                                                │
│  - Authentication                                               │
│  - Request Routing                                              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
┌───────▼──────┐ ┌────▼────┐ ┌──────▼──────┐
│   AUTH SVC   │ │  BILLING│ │  NETWORK    │
│              │ │   SVC   │ │   SVC       │
│ - JWT Auth   │ │ - Plans │ │ - RADIUS    │
│ - OAuth2     │ │ - Wallet│ │ - PPPoE     │
│ - RBAC       │ │ - Invoicing│ - Captive  │
└───────┬──────┘ └────┬────┘ └──────┬──────┘
        │             │             │
        └─────────────┼─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │        RADIUS SERVER      │
        │  - FreeRADIUS Integration │
        │  - MikroTik Compatibility │
        │  - Ubiquiti Support       │
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │        DATABASE LAYER     │
        │  ┌───────────┐ ┌─────────┐│
        │  │ PostgreSQL│ │  Redis  ││
        │  │ (Billing) │ │(Sessions││
        │  └───────────┘ └─────────┘│
        └─────────────┬─────────────┘
                      │
        ┌─────────────▼─────────────┐
        │      MESSAGE QUEUE        │
        │  - RabbitMQ/Kafka         │
        │  - Accounting Events      │
        │  - Payment Processing     │
        └───────────────────────────┘
```

### 2. Enhanced Database Schema (ERD)

```sql
-- ENHANCED TENANT MANAGEMENT
CREATE TABLE tenants (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED USER ROLES & RBAC
CREATE TABLE user_roles (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(50) NOT NULL,
    permissions JSONB, -- Granular permissions
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE users (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role_id UUID REFERENCES user_roles(id),
    status VARCHAR(20) DEFAULT 'ACTIVE',
    last_login TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED BILLING ENGINE
CREATE TABLE billing_plans (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(20) NOT NULL, -- TIME, DATA, HYBRID, SPEED
    price DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'KES',
    
    -- Time-based fields
    duration_minutes INTEGER,
    duration_type VARCHAR(20), -- HOUR, DAY, WEEK, MONTH, YEAR
    
    -- Data-based fields  
    data_limit_gb DECIMAL(10,2),
    data_reset_cycle VARCHAR(20), -- DAILY, WEEKLY, MONTHLY
    
    -- Speed-based fields
    speed_limit_mbps INTEGER,
    burst_limit_mbps INTEGER,
    burst_time_seconds INTEGER,
    
    -- Hybrid fields
    time_limit_minutes INTEGER,
    data_limit_gb_hybrid DECIMAL(10,2),
    
    -- Corporate/Family fields
    max_devices INTEGER DEFAULT 1,
    is_family_plan BOOLEAN DEFAULT FALSE,
    family_members_limit INTEGER DEFAULT 1,
    
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED SUBSCRIBERS
CREATE TABLE subscribers (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    address TEXT,
    
    -- Account fields
    account_type VARCHAR(20) DEFAULT 'PREPAID', -- PREPAID, POSTPAID, CORPORATE
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, EXPIRED, OVERDUE
    credit_limit DECIMAL(10,2) DEFAULT 0.00,
    current_debt DECIMAL(10,2) DEFAULT 0.00,
    
    -- Usage tracking
    total_data_used_gb DECIMAL(15,2) DEFAULT 0.00,
    current_cycle_data_used_gb DECIMAL(15,2) DEFAULT 0.00,
    data_reset_date TIMESTAMP,
    
    -- Session management
    current_session_id UUID,
    concurrent_sessions INTEGER DEFAULT 1,
    last_activity TIMESTAMP,
    
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED SESSIONS WITH RADIUS INTEGRATION
CREATE TABLE sessions (
    id UUID PRIMARY KEY,
    subscriber_id UUID REFERENCES subscribers(id),
    tenant_id UUID REFERENCES tenants(id),
    nas_id UUID REFERENCES nas_devices(id),
    
    -- Network details
    username VARCHAR(100) NOT NULL,
    calling_station_id VARCHAR(50), -- MAC Address
    called_station_id VARCHAR(50),  -- AP MAC
    framed_ip_address INET,
    framed_ipv6_address INET,
    
    -- Session timing
    start_time TIMESTAMP NOT NULL,
    stop_time TIMESTAMP,
    session_time INTEGER, -- Seconds
    
    -- Usage tracking
    input_octets BIGINT DEFAULT 0,
    output_octets BIGINT DEFAULT 0,
    input_packets BIGINT DEFAULT 0,
    output_packets BIGINT DEFAULT 0,
    
    -- RADIUS fields
    acct_session_id VARCHAR(64),
    acct_unique_session VARCHAR(32),
    acct_session_time INTEGER,
    acct_input_octets BIGINT,
    acct_output_octets BIGINT,
    acct_terminate_cause VARCHAR(32),
    
    -- Status
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, STOPPED, TIMEOUT, ADMIN_RESET
    is_active BOOLEAN DEFAULT TRUE,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- NETWORK ACCESS SERVERS (RADIUS)
CREATE TABLE nas_devices (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    ip_address INET NOT NULL,
    secret VARCHAR(60) NOT NULL,
    vendor VARCHAR(50), -- MIKROTIK, UBIQUITI, CISCO, etc.
    port INTEGER DEFAULT 1812,
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED PAYMENTS & WALLETS
CREATE TABLE wallets (
    id UUID PRIMARY KEY,
    owner_id UUID NOT NULL,
    owner_type VARCHAR(20) NOT NULL, -- SUBSCRIBER, AGENT, TENANT
    tenant_id UUID REFERENCES tenants(id),
    balance DECIMAL(15,2) DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'KES',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE transactions (
    id UUID PRIMARY KEY,
    wallet_id UUID REFERENCES wallets(id),
    tenant_id UUID REFERENCES tenants(id),
    amount DECIMAL(15,2) NOT NULL,
    transaction_type VARCHAR(20) NOT NULL, -- CREDIT, DEBIT, REFUND
    description TEXT,
    reference_id VARCHAR(100), -- Payment ID, Invoice ID, etc.
    status VARCHAR(20) DEFAULT 'COMPLETED',
    created_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED VOUCHER SYSTEM
CREATE TABLE voucher_batches (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(100) NOT NULL,
    plan_id UUID REFERENCES billing_plans(id),
    quantity INTEGER NOT NULL,
    code_prefix VARCHAR(10),
    code_suffix VARCHAR(10),
    length INTEGER DEFAULT 8,
    expiry_days INTEGER,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE vouchers (
    id UUID PRIMARY KEY,
    batch_id UUID REFERENCES voucher_batches(id),
    tenant_id UUID REFERENCES tenants(id),
    code VARCHAR(50) UNIQUE NOT NULL,
    plan_id UUID REFERENCES billing_plans(id),
    status VARCHAR(20) DEFAULT 'AVAILABLE', -- AVAILABLE, USED, EXPIRED, SUSPENDED
    used_by UUID REFERENCES subscribers(id),
    used_at TIMESTAMP,
    expiry_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ENHANCED ACCOUNTING & LOGS
CREATE TABLE radius_accounting (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    nas_id UUID REFERENCES nas_devices(id),
    subscriber_id UUID REFERENCES subscribers(id),
    
    -- RADIUS Accounting Fields
    acct_session_id VARCHAR(64),
    acct_unique_session VARCHAR(32),
    username VARCHAR(100),
    realm VARCHAR(64),
    nas_ip_address INET,
    nas_port_id VARCHAR(15),
    nas_port_type VARCHAR(32),
    acct_start_time TIMESTAMP,
    acct_update_time TIMESTAMP,
    acct_stop_time TIMESTAMP,
    acct_interval INTEGER,
    acct_session_time INTEGER,
    acct_authentic VARCHAR(32),
    connect_info_start VARCHAR(50),
    connect_info_stop VARCHAR(50),
    acct_input_octets BIGINT,
    acct_output_octets BIGINT,
    called_station_id VARCHAR(50),
    calling_station_id VARCHAR(50),
    acct_terminate_cause VARCHAR(32),
    service_type VARCHAR(32),
    framed_protocol VARCHAR(32),
    framed_ip_address INET,
    framed_ipv6_address INET,
    framed_ipv6_prefix INET,
    framed_interface_id VARCHAR(44),
    delegated_ipv6_prefix INET,
    
    -- Custom fields
    input_gigawords BIGINT,
    output_gigawords BIGINT,
    acct_input_packets BIGINT,
    acct_output_packets BIGINT,
    acct_start_delay INTEGER,
    acct_stop_delay INTEGER,
    xascendsessionsvr VARCHAR(15),
    xascendmultilink VARCHAR(15),
    xascenddata_rate VARCHAR(15),
    xascendxmit_rate VARCHAR(15),
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- FRAUD DETECTION
CREATE TABLE fraud_logs (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    session_id UUID REFERENCES sessions(id),
    subscriber_id UUID REFERENCES subscribers(id),
    violation_type VARCHAR(50) NOT NULL,
    details JSONB,
    severity VARCHAR(20), -- LOW, MEDIUM, HIGH, CRITICAL
    action_taken VARCHAR(50), -- WARNING, THROTTLE, SUSPEND, BLOCK
    created_at TIMESTAMP DEFAULT NOW()
);

-- CORPORATE ACCOUNTS
CREATE TABLE corporate_accounts (
    id UUID PRIMARY KEY,
    tenant_id UUID REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    billing_address TEXT,
    credit_limit DECIMAL(15,2),
    current_balance DECIMAL(15,2) DEFAULT 0.00,
    payment_terms VARCHAR(50), -- NET_7, NET_14, NET_30
    status VARCHAR(20) DEFAULT 'ACTIVE',
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE corporate_users (
    id UUID PRIMARY KEY,
    corporate_account_id UUID REFERENCES corporate_accounts(id),
    subscriber_id UUID REFERENCES subscribers(id),
    role VARCHAR(50), -- ADMIN, USER, VIEWER
    created_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Enhanced Billing Calculation Logic

```javascript
// Advanced Billing Engine
class BillingEngine {
    constructor(tenantId) {
        this.tenantId = tenantId;
    }

    // Calculate plan price based on multiple factors
    async calculatePlanPrice(planId, subscriberId, options = {}) {
        const plan = await this.getPlan(planId);
        const subscriber = await this.getSubscriber(subscriberId);
        
        let basePrice = plan.price;
        
        // Apply corporate discounts
        if (subscriber.account_type === 'CORPORATE') {
            const discount = await this.getCorporateDiscount(subscriber.corporate_account_id, plan);
            basePrice = basePrice * (1 - discount.rate);
        }
        
        // Apply family plan pricing
        if (plan.is_family_plan) {
            const familyMembers = await this.getFamilyMembers(subscriberId);
            const memberCount = familyMembers.length + 1; // +1 for primary
            basePrice = basePrice * Math.ceil(memberCount / plan.family_members_limit);
        }
        
        // Apply time-based pricing (peak/off-peak)
        if (options.timeOfDay) {
            const timeMultiplier = await this.getTimeOfDayMultiplier(plan, options.timeOfDay);
            basePrice = basePrice * timeMultiplier;
        }
        
        // Apply volume discounts
        if (options.volume) {
            const volumeDiscount = await this.getVolumeDiscount(plan, options.volume);
            basePrice = basePrice * (1 - volumeDiscount.rate);
        }
        
        return {
            basePrice,
            calculatedPrice: basePrice,
            breakdown: {
                base: plan.price,
                discounts: [],
                surcharges: []
            }
        };
    }

    // Usage-based billing calculation
    async calculateUsageBilling(subscriberId, usagePeriod) {
        const subscriber = await this.getSubscriber(subscriberId);
        const plan = await this.getCurrentPlan(subscriberId);
        
        let charges = {
            timeCharges: 0,
            dataCharges: 0,
            speedCharges: 0,
            overageCharges: 0,
            total: 0
        };
        
        // Calculate time-based charges
        if (plan.duration_minutes) {
            const timeUsed = await this.getSessionTime(subscriberId, usagePeriod);
            const timeUnits = Math.ceil(timeUsed / (plan.duration_minutes * 60));
            charges.timeCharges = timeUnits * plan.price;
        }
        
        // Calculate data-based charges
        if (plan.data_limit_gb) {
            const dataUsed = await this.getDataUsage(subscriberId, usagePeriod);
            if (dataUsed > plan.data_limit_gb) {
                const overage = dataUsed - plan.data_limit_gb;
                charges.dataCharges = overage * plan.overage_rate_per_gb;
            }
        }
        
        // Calculate speed-based charges (if applicable)
        if (plan.speed_limit_mbps) {
            const speedViolations = await this.getSpeedViolations(subscriberId, usagePeriod);
            charges.speedCharges = speedViolations * plan.speed_violation_fee;
        }
        
        charges.total = charges.timeCharges + charges.dataCharges + charges.speedCharges + charges.overageCharges;
        
        return charges;
    }

    // Fair Usage Policy enforcement
    async enforceFairUsagePolicy(subscriberId) {
        const subscriber = await this.getSubscriber(subscriberId);
        const plan = await this.getCurrentPlan(subscriberId);
        
        // Check data usage against FUP threshold
        const currentCycleUsage = await this.getCurrentCycleDataUsage(subscriberId);
        const fupThreshold = plan.data_limit_gb * 0.8; // 80% of plan limit
        
        if (currentCycleUsage > fupThreshold) {
            // Apply speed throttling
            await this.applySpeedThrottling(subscriberId, plan.speed_limit_mbps * 0.5);
            
            // Log FUP violation
            await this.logFUPViolation(subscriberId, currentCycleUsage, fupThreshold);
            
            return {
                action: 'SPEED_THROTTLED',
                newSpeedLimit: plan.speed_limit_mbps * 0.5,
                message: `Fair Usage Policy activated. Speed reduced to ${plan.speed_limit_mbps * 0.5} Mbps`
            };
        }
        
        return { action: 'NO_ACTION' };
    }
}
```

### 4. RADIUS Integration Flow

```javascript
// Enhanced RADIUS Server Integration
class RadiusServer {
    constructor(config) {
        this.config = config;
        this.freeradius = new FreeRADIUS(config);
    }

    // Handle RADIUS Access-Request
    async handleAccessRequest(packet) {
        const { username, password, nasIdentifier, callingStationId } = packet;
        
        // 1. Authenticate user
        const subscriber = await this.authenticateUser(username, password);
        if (!subscriber) {
            return this.sendAccessReject('Invalid credentials');
        }
        
        // 2. Check account status
        if (subscriber.status !== 'ACTIVE') {
            return this.sendAccessReject(`Account ${subscriber.status}`);
        }
        
        // 3. Check concurrent sessions
        const activeSessions = await this.getActiveSessions(subscriber.id);
        if (activeSessions >= subscriber.concurrent_sessions) {
            return this.sendAccessReject('Maximum concurrent sessions reached');
        }
        
        // 4. Apply Fair Usage Policy
        const fupResult = await this.enforceFairUsagePolicy(subscriber.id);
        
        // 5. Generate session attributes
        const sessionAttributes = await this.generateSessionAttributes(subscriber, fupResult);
        
        // 6. Create session record
        const session = await this.createSession(subscriber, packet, sessionAttributes);
        
        // 7. Send Access-Accept with attributes
        return this.sendAccessAccept(sessionAttributes);
    }

    // Handle RADIUS Accounting
    async handleAccountingRequest(packet) {
        const { acctStatusType, acctSessionId, username } = packet;
        
        const session = await this.getSessionBySessionId(acctSessionId);
        if (!session) {
            return this.sendAccountingResponse();
        }
        
        // Update session with accounting data
        await this.updateSessionWithAccounting(session.id, packet);
        
        // Handle session termination
        if (acctStatusType === 'Stop') {
            await this.terminateSession(session.id, packet);
            
            // Calculate usage charges
            await this.calculateUsageCharges(session);
        }
        
        return this.sendAccountingResponse();
    }

    // Generate RADIUS attributes for session
    async generateSessionAttributes(subscriber, fupResult) {
        const plan = await this.getCurrentPlan(subscriber.id);
        
        const attributes = {
            // Basic session attributes
            'Session-Timeout': plan.duration_minutes * 60,
            'Idle-Timeout': 300, // 5 minutes idle timeout
            
            // Speed limiting
            'Mikrotik-Rate-Limit': `${plan.speed_limit_mbps}M/${plan.speed_limit_mbps}M`,
            
            // Data limiting (if supported by NAS)
            'WISPr-Bandwidth-Max-Up': plan.speed_limit_mbps * 1024 * 1024,
            'WISPr-Bandwidth-Max-Down': plan.speed_limit_mbps * 1024 * 1024,
            
            // FUP adjustments
            ...(fupResult.action === 'SPEED_THROTTLED' && {
                'Mikrotik-Rate-Limit': `${fupResult.newSpeedLimit}M/${fupResult.newSpeedLimit}M`
            }),
            
            // VLAN assignment (if applicable)
            ...(plan.vlan_id && { 'Tunnel-Type': 'VLAN', 'Tunnel-Private-Group-ID': plan.vlan_id }),
            
            // Session tracking
            'Acct-Interim-Interval': 300, // Send interim updates every 5 minutes
        };
        
        return attributes;
    }
}
```

### 5. API Specification

```yaml
# Enhanced API Specification
openapi: 3.0.0
info:
  title: Enterprise Billing System API
  version: 2.0.0
  description: Comprehensive ISP and Hotspot billing platform

paths:
  /api/v2/auth/login:
    post:
      summary: User authentication
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                password:
                  type: string
                tenant_id:
                  type: string
      responses:
        '200':
          description: Authentication successful
          content:
            application/json:
              schema:
                type: object
                properties:
                  token:
                    type: string
                  user:
                    $ref: '#/components/schemas/User'

  /api/v2/subscribers:
    post:
      summary: Create new subscriber
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                username:
                  type: string
                password:
                  type: string
                full_name:
                  type: string
                email:
                  type: string
                phone:
                  type: string
                plan_id:
                  type: string
                account_type:
                  type: string
                  enum: [PREPAID, POSTPAID, CORPORATE]
      responses:
        '201':
          description: Subscriber created
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/Subscriber'

  /api/v2/subscribers/{id}/sessions:
    get:
      summary: Get active sessions for subscriber
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Active sessions
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/Session'

  /api/v2/subscribers/{id}/usage:
    get:
      summary: Get usage statistics
      security:
        - BearerAuth: []
      parameters:
        - name: id
          in: path
          required: true
          schema:
            type: string
        - name: period
          in: query
          schema:
            type: string
            enum: [DAILY, WEEKLY, MONTHLY]
      responses:
        '200':
          description: Usage statistics
          content:
            application/json:
              schema:
                type: object
                properties:
                  data_used_gb:
                    type: number
                  time_used_hours:
                    type: number
                  current_speed_mbps:
                    type: number
                  plan_limit_gb:
                    type: number

  /api/v2/billing/plans:
    get:
      summary: Get available billing plans
      security:
        - BearerAuth: []
      responses:
        '200':
          description: Available plans
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: '#/components/schemas/BillingPlan'

  /api/v2/payments:
    post:
      summary: Process payment
      security:
        - BearerAuth: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                amount:
                  type: number
                payment_method:
                  type: string
                  enum: [MPESA, CARD, WALLET]
                subscriber_id:
                  type: string
                description:
                  type: string
      responses:
        '200':
          description: Payment processed
          content:
            application/json:
              schema:
                type: object
                properties:
                  transaction_id:
                    type: string
                  status:
                    type: string
                  message:
                    type: string

components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT

  schemas:
    User:
      type: object
      properties:
        id:
          type: string
        email:
          type: string
        role:
          type: string
        tenant_id:
          type: string

    Subscriber:
      type: object
      properties:
        id:
          type: string
        username:
          type: string
        full_name:
          type: string
        email:
          type: string
        phone:
          type: string
        account_type:
          type: string
        status:
          type: string
        current_plan_id:
          type: string
        balance:
          type: number

    Session:
      type: object
      properties:
        id:
          type: string
        subscriber_id:
          type: string
        start_time:
          type: string
          format: date-time
        stop_time:
          type: string
          format: date-time
        data_used_gb:
          type: number
        status:
          type: string

    BillingPlan:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
        plan_type:
          type: string
        price:
          type: number
        duration_minutes:
          type: integer
        data_limit_gb:
          type: number
        speed_limit_mbps:
          type: integer
        max_devices:
          type: integer
        is_family_plan:
          type: boolean
