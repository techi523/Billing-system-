# MikroTik Integration Guide

## Why Connect Your MikroTik to Our System?

**Eliminate Manual Router Configuration**
- No more Winbox/Terminal sessions for basic tasks
- Automated user management and package assignments
- Real-time network monitoring and control

**Remote Management & Control**
- Create, enable, disable hotspot users from anywhere
- Apply speed limits and bandwidth controls instantly
- Monitor active sessions and network usage in real-time

**Automated Billing & Revenue**
- Automatic user activation after payment
- Scheduled suspension and expiry management
- Real-time revenue tracking and analytics

**Professional Network Management**
- Centralized dashboard for all routers
- Bulk operations across multiple devices
- Detailed audit logs and compliance reporting

**No More Router Headaches**
- One-click setup with auto-generated scripts
- Tenant isolation and security
- Professional-grade monitoring and alerts

## Auto-Generated MikroTik Command

### What It Does

Our system generates a ready-to-run MikroTik terminal command that:

1. **Creates API User** - Secure, least-privilege access for our system
2. **Sets Up Firewall Rules** - Allows secure communication with billing backend
3. **Configures Hotspot Profiles** - Optimized for your packages and pricing
4. **Installs Scheduler Jobs** - Automated cleanup and sync operations
5. **Sets Up Scripts** - For user management and session cleanup
6. **Enables Secure Communication** - Encrypted API access

### Example Generated Command

```bash
# ========================================
# SurfBill Auto-Configuration Script
# RouterOS v7
# ========================================
# Tenant: Acme WiFi Services
# Router: Main Office Router
# Generated: 2024-01-31T12:00:00Z
# ========================================

# STEP 1: Create API User (Least Privilege)
/user group add name=surfbill_api policy=api,read,write,test,!local,!telnet,!ssh,!ftp,!reboot,!policy,!password,!web,!winbox,!sensitive
/user add name=surfbill_acme_main password=abc123def456 group=surfbill_api comment="SurfBill Billing System API Access"

# STEP 2: Firewall Rules (Allow Billing System API Access)
/ip firewall filter add chain=input protocol=tcp dst-port=8728 src-address=192.168.1.100 action=accept comment="SurfBill API Access" place-before=0

# STEP 3: Hotspot Profile Configuration
/ip hotspot profile
add name=SurfBill_acme_wifi \\
    login-by=http-chap,http-pap,mac \\
    use-radius=no \\
    dns-name=acme.surfbill.link \\
    hotspot-address=10.5.50.1 \\
    smtp-server=0.0.0.0 \\
    http-cookie-lifetime=1d \\
    trial-uptime-limit=0s \\
    trial-user-profile=default

# STEP 4: Walled Garden (Payment Gateways & APIs)
/ip hotspot walled-garden
add dst-host=*.intasend.com comment="IntaSend Payment Gateway"
add dst-host=*.safaricom.co.ke comment="M-Pesa Gateway"
add dst-host=192.168.1.100 comment="SurfBill Billing System"
add dst-host=*.googleapis.com comment="Google APIs"
add dst-host=*.cloudflare.com comment="Cloudflare CDN"

# STEP 5: User Profile (Default Settings)
/ip hotspot user profile
set [ find default=yes ] shared-users=1 rate-limit=512k/512k

# STEP 6: Scheduler - Sync with Billing System (Every 5 minutes)
/system script
add name=SurfBill_Sync_Script source={:log info "SurfBill: Running sync with billing system"}

/system scheduler
add name=SurfBill_Sync interval=5m on-event=SurfBill_Sync_Script comment="SurfBill Auto-Sync"

# STEP 7: Scheduler - Cleanup Expired Users (Daily at 2 AM)
/system script
add name=SurfBill_Cleanup_Script source={:log info "SurfBill: Cleaning up expired users"}

/system scheduler
add name=SurfBill_Cleanup interval=1d start-time=02:00:00 on-event=SurfBill_Cleanup_Script comment="SurfBill Daily Cleanup"

# STEP 8: Set Router Identity
/system identity set name="SurfBill_Acme_Main_Office"

# ========================================
# CONFIGURATION COMPLETE
# ========================================
# Next Steps:
# 1. Verify connection in SurfBill dashboard
# 2. Create your first package
# 3. Start accepting payments!
# ========================================
```

## Easy Connection Flow

### Step 1: Click "Connect MikroTik"
- Navigate to Settings > Router Management
- Click "Add New Router"
- Enter router IP and admin credentials

### Step 2: Generate Command
- System detects RouterOS version automatically
- Generates optimized script for your setup
- Provides copy-paste ready command

### Step 3: Execute on Router
- Open Winbox or Terminal
- Connect to your MikroTik
- Paste the entire script
- Press Enter to execute

### Step 4: Verify Connection
- System automatically tests connection
- Validates all components are working
- Dashboard unlocks router controls

### Step 5: Start Managing
- Create packages and pricing
- Monitor network usage
- Accept payments and manage users

## Full Dashboard Control

After connection, you can perform everything from the dashboard:

### User Management
- **Create Users** - Instant hotspot user creation
- **Enable/Disable** - Toggle user access remotely
- **Disconnect Sessions** - Force disconnect active users
- **Apply Speed Limits** - Set bandwidth caps per user
- **Assign Packages** - Link users to billing packages

### Network Monitoring
- **Active Sessions** - Real-time user connections
- **Bandwidth Usage** - Track data consumption
- **Router Health** - CPU, memory, uptime monitoring
- **Session History** - Connection logs and analytics

### Package Management
- **Create Packages** - Time, data, and speed-based plans
- **Set Pricing** - Configure prices and validity periods
- **Auto-Activation** - Users get access immediately after payment
- **Auto-Expiry** - Automatic suspension when time/data runs out

### Router Configuration
- **Hotspot Profiles** - Manage authentication settings
- **Queue Trees** - Bandwidth management and QoS
- **Firewall Rules** - Security and access control
- **Scheduler Jobs** - Automated maintenance tasks

## Package Creation & Sales

### Create Packages
Navigate to Packages > Create New Package

**Time-Based Packages**
- Duration: 1 hour, 1 day, 1 week, 1 month
- Price: Set your desired amount
- Speed Limits: Upload/download caps
- Shared Users: Maximum concurrent connections

**Data-Based Packages**
- Data Limit: 100MB, 1GB, 5GB, etc.
- Validity: Time window for data usage
- Speed Limits: Bandwidth caps
- Auto-Reset: Renewal options

**Speed-Based Packages**
- Upload Speed: Maximum upload bandwidth
- Download Speed: Maximum download bandwidth
- Priority: Queue priority for QoS
- Burst Settings: Temporary speed boosts

### Sell Packages
Packages automatically appear on your captive portal

**Integration Points**
- Payment gateway integration (M-Pesa, cards, etc.)
- Automatic user creation after payment
- Real-time balance updates
- Expiry notifications and renewals

**Customer Experience**
- Simple package selection
- Secure payment processing
- Instant network access
- Usage tracking and notifications

## Dashboard Features

### Real-Time Analytics
- **Revenue Reports** - Daily, weekly, monthly earnings
- **Active Users** - Current network usage
- **Session History** - Connection patterns and trends
- **Package Performance** - Best-selling plans

### Network Overview
- **Router Status** - Online/offline status
- **Resource Usage** - CPU, memory, disk utilization
- **Bandwidth Monitoring** - Total data in/out
- **User Activity** - Active sessions and locations

### Financial Management
- **Payment Tracking** - All transactions logged
- **Commission Reports** - Platform fees and splits
- **Settlement History** - Payout records
- **Invoice Generation** - Customer billing

## Security & Safety

### Least Privilege Access
- API user with minimal required permissions
- No access to sensitive router functions
- Read-only access to critical system areas

### Tenant Isolation
- Each tenant has separate API credentials
- No cross-tenant access or data leakage
- Independent router management

### Secure Communication
- Encrypted API communication
- Webhook signature verification
- Rate limiting and DDoS protection

### Audit Logging
- All actions logged with user details
- Change tracking for compliance
- Security event monitoring

## Failure Handling & Rollback

### Connection Failures
**Common Issues**
- Router offline or unreachable
- Incorrect credentials
- Firewall blocking API port (8728)
- API service disabled on router

**Troubleshooting Steps**
1. Verify router is online and accessible
2. Check admin credentials are correct
3. Ensure API service is enabled on port 8728
4. Verify firewall allows connections from billing system
5. Check router logs for connection attempts

### Script Execution Failures
**If Script Fails**
1. Check router logs for specific error messages
2. Verify sufficient disk space and memory
3. Ensure no conflicting configurations exist
4. Try running script in smaller sections

**Manual Rollback**
```bash
# Remove SurfBill configuration
/user remove [find name~"surfbill"]
/ip firewall filter remove [find comment~"SurfBill"]
/ip hotspot walled-garden remove [find comment~"SurfBill"]
/system scheduler remove [find name~"SurfBill"]
/system script remove [find name~"SurfBill"]
/system identity set name="Router"
```

### Verification Failures
**If Verification Fails**
1. Check API user permissions
2. Verify firewall rules are applied
3. Ensure hotspot server is configured
4. Test manual API connection

**Recovery Process**
1. Re-run verification from dashboard
2. Manually check router configuration
3. Contact support with error details
4. Consider re-running setup script

### Data Loss Prevention
**Backup Strategy**
- Router configuration exported before changes
- Package and user data backed up daily
- Transaction history maintained separately

**Recovery Options**
- Router configuration restore from backup
- User data restoration from system
- Payment history reconciliation

## Production Readiness

### Clean Data Policy
- No sample routers or test data
- Real client onboarding only
- Professional-grade data handling

### Dynamic Handling
- Automatic subscriber/session management
- Real-time package synchronization
- Live network monitoring

### Scalability
- Multiple router support per tenant
- High-traffic network optimization
- Enterprise-grade performance

### Compliance
- Data protection and privacy
- Financial transaction security
- Audit trail maintenance

## Support & Documentation

### Getting Help
- Comprehensive documentation available
- Video tutorials for common tasks
- Live chat support during business hours
- Email support for complex issues

### Best Practices
- Regular router firmware updates
- Monitor system performance
- Keep API credentials secure
- Review audit logs periodically

### Advanced Features
- Custom hotspot themes
- Advanced QoS configurations
- Multi-router load balancing
- Custom payment integrations

---

**Ready to get started?** Click "Connect MikroTik" in your dashboard and follow the simple steps to revolutionize your WiFi billing!