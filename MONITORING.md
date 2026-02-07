# Production Monitoring Guide

## Overview

This guide covers monitoring, alerting, and observability for the billing system in production.

---

## Log Files

### Location
- **Application Logs**: `./logs/`
  - `combined-YYYY-MM-DD.log` - All application logs
  - `error-YYYY-MM-DD.log` - Error logs only
  - `audit-YYYY-MM-DD.log` - Critical operations (payments, auth)
- **PM2 Logs**: `./logs/`
  - `pm2-out.log` - PM2 stdout
  - `pm2-error.log` - PM2 stderr

### Log Rotation
- Automatic daily rotation
- Compressed archives (gzip)
- Retention: 14-90 days depending on type

---

## Key Metrics to Monitor

### Application Health
- **Uptime**: Target 99.9%
- **Response Time**: API endpoints < 200ms
- **Error Rate**: < 1% of total requests
- **Memory Usage**: < 400MB per instance

### Business Metrics
- **Payment Success Rate**: > 95%
- **Active Sessions**: Monitor for unusual spikes
- **Revenue per Hour**: Track trends
- **Webhook Failures**: Should be near 0%

### Infrastructure
- **CPU Usage**: < 70% average
- **Disk Space**: > 20% free
- **Database Connections**: Monitor pool usage
- **Network I/O**: Track bandwidth usage

---

## Monitoring Commands

### PM2 Monitoring

```bash
# Real-time monitoring dashboard
pm2 monit

# Process status
pm2 status

# CPU and memory usage
pm2 list

# Detailed process info
pm2 show billing-system
```

### Log Analysis

```bash
# View last 100 lines
pm2 logs billing-system --lines 100

# Follow logs in real-time
pm2 logs billing-system --raw

# Search for errors
grep "ERROR" logs/combined-$(date +%Y-%m-%d).log

# Count errors in last hour
grep "ERROR" logs/combined-$(date +%Y-%m-%d).log | grep "$(date +%H):" | wc -l

# Payment failures
grep "PAYMENT_FAILED" logs/audit-$(date +%Y-%m-%d).log
```

### Database Monitoring

```bash
# PostgreSQL active connections
psql -U billing_user -d billing_db -c "SELECT count(*) FROM pg_stat_activity;"

# Long-running queries
psql -U billing_user -d billing_db -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE state = 'active' ORDER BY duration DESC;"

# Database size
psql -U billing_user -d billing_db -c "SELECT pg_size_pretty(pg_database_size('billing_db'));"
```

---

## Alerting

### Critical Alerts (Immediate Action Required)

1. **Application Down**
   - Trigger: Health check fails for 2 consecutive minutes
   - Action: Restart application, check logs

2. **Database Connection Lost**
   - Trigger: Database connection errors in logs
   - Action: Check database server, verify credentials

3. **Payment Processing Failure Rate > 10%**
   - Trigger: More than 10% of payments failing
   - Action: Check IntaSend/M-Pesa status, review logs

4. **Disk Space < 10%**
   - Trigger: Low disk space
   - Action: Clean old logs, expand storage

### Warning Alerts (Monitor Closely)

1. **High Memory Usage (> 80%)**
   - Monitor for memory leaks
   - Consider scaling

2. **Response Time > 500ms**
   - Check database query performance
   - Review slow endpoints

3. **Error Rate > 5%**
   - Investigate error patterns
   - Check for API issues

---

## Health Check Endpoints

### Application Health
```bash
curl https://yourdomain.com/health
```

Response:
```json
{
  "status": "UP",
  "timestamp": "2026-02-07T19:00:00.000Z",
  "database": "CONNECTED",
  "uptime": 12345
}
```

### Custom Health Checks

Create monitoring script `/usr/local/bin/check-billing-health.sh`:

```bash
#!/bin/bash

HEALTH_URL="https://yourdomain.com/health"
ALERT_EMAIL="admin@yourdomain.com"

RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -ne 200 ]; then
    echo "Health check failed! HTTP $RESPONSE" | mail -s "Billing System Alert" $ALERT_EMAIL
    exit 1
fi

exit 0
```

Add to cron (every 5 minutes):
```bash
*/5 * * * * /usr/local/bin/check-billing-health.sh
```

---

## Performance Monitoring

### Application Performance

```bash
# Request rate
pm2 logs billing-system | grep "GET\|POST" | wc -l

# Average response time (requires custom logging)
grep "response_time" logs/combined-$(date +%Y-%m-%d).log | awk '{sum+=$NF; count++} END {print sum/count}'
```

### Database Performance

```bash
# Slow queries (PostgreSQL)
psql -U billing_user -d billing_db -c "SELECT query, calls, total_time, mean_time FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10;"

# Table sizes
psql -U billing_user -d billing_db -c "SELECT tablename, pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size FROM pg_tables WHERE schemaname = 'public' ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;"
```

---

## Incident Response

### 1. Application Crash

```bash
# Check PM2 status
pm2 status

# View error logs
pm2 logs billing-system --err --lines 50

# Restart if needed
pm2 restart billing-system

# Check health
curl https://yourdomain.com/health
```

### 2. High Error Rate

```bash
# Identify error patterns
grep "ERROR" logs/error-$(date +%Y-%m-%d).log | tail -50

# Check specific error types
grep "DatabaseError" logs/error-$(date +%Y-%m-%d).log | wc -l
grep "PaymentError" logs/error-$(date +%Y-%m-%d).log | wc -l

# Review recent changes
git log --oneline -10
```

### 3. Payment Processing Issues

```bash
# Check payment logs
grep "PAYMENT" logs/audit-$(date +%Y-%m-%d).log | tail -20

# Webhook failures
grep "webhook" logs/error-$(date +%Y-%m-%d).log

# IntaSend/M-Pesa status
curl https://api.intasend.com/status
```

---

## Third-Party Integrations

### Recommended Tools

1. **Log Aggregation**: ELK Stack, Datadog, Loggly
2. **APM**: New Relic, AppDynamics, Datadog APM
3. **Uptime Monitoring**: UptimeRobot, Pingdom, StatusCake
4. **Error Tracking**: Sentry, Rollbar, Bugsnag

### Sentry Integration (Example)

```bash
npm install @sentry/node
```

Add to `src/server.ts`:
```typescript
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

app.use(Sentry.Handlers.errorHandler());
```

---

## Maintenance Windows

Schedule regular maintenance:

1. **Daily** (3:00 AM):
   - Log rotation
   - Database optimization
   - Cache clearing

2. **Weekly** (Sunday 2:00 AM):
   - Full database backup
   - Security updates
   - Performance review

3. **Monthly**:
   - Dependency updates
   - Security audit
   - Capacity planning

---

## Contact & Escalation

- **Level 1**: DevOps Team - devops@yourdomain.com
- **Level 2**: Backend Team - backend@yourdomain.com
- **Level 3**: CTO - cto@yourdomain.com

**Emergency Hotline**: +254-XXX-XXXXXX
