# Production Verification Checklist

Use this checklist before deploying to production and after each major update.

---

## Pre-Deployment Checklist

### Environment Configuration
- [ ] `.env` file configured with production values
- [ ] `NODE_ENV=production` set
- [ ] All required environment variables present (run `npm start` to verify)
- [ ] Database credentials tested and working
- [ ] IntaSend/M-Pesa credentials configured
- [ ] JWT secrets are strong and unique
- [ ] CORS_ORIGIN set to production domain only
- [ ] Email/SMS service credentials configured

### Security
- [ ] All secrets stored in `.env` (not hardcoded)
- [ ] `.env` file has restricted permissions (600)
- [ ] HTTPS enabled with valid SSL certificate
- [ ] Security headers configured (HSTS, CSP)
- [ ] Rate limiting enabled
- [ ] Webhook signature validation active
- [ ] Input validation on all routes
- [ ] SQL injection protection verified (using Sequelize ORM)
- [ ] XSS protection enabled
- [ ] Password hashing uses bcrypt with salt rounds >= 12

### Database
- [ ] Database migrations run successfully
- [ ] Indexes created for performance
- [ ] Unique constraints enforced
- [ ] Test data cleaned (run `npm run cleanup-db` if needed)
- [ ] Backup strategy implemented
- [ ] Connection pooling configured

### Application
- [ ] Application builds without errors (`npm run build`)
- [ ] All tests passing (`npm test`)
- [ ] No TypeScript errors
- [ ] Dependencies up to date (check `npm outdated`)
- [ ] No critical security vulnerabilities (`npm audit`)

### Logging & Monitoring
- [ ] Winston logger configured with rotation
- [ ] Log retention policies set
- [ ] Sensitive data redaction enabled
- [ ] PM2 logging configured
- [ ] Health check endpoint accessible
- [ ] Monitoring alerts configured

### Performance
- [ ] Database queries optimized
- [ ] Proper indexes on frequently queried columns
- [ ] Connection pooling enabled
- [ ] Static assets cached (if applicable)
- [ ] Response times < 200ms for API endpoints

---

## Deployment Checklist

### Build & Deploy
- [ ] Code pushed to production branch
- [ ] `npm install --production` completed
- [ ] `npm run build` successful
- [ ] PM2 ecosystem file configured
- [ ] Application started with PM2
- [ ] PM2 startup script enabled
- [ ] Nginx reverse proxy configured (if applicable)

### Post-Deployment Verification
- [ ] Application running (`pm2 status`)
- [ ] Health check returns 200 OK
- [ ] Database connection successful
- [ ] Logs being written correctly
- [ ] No errors in PM2 logs
- [ ] Memory usage within limits
- [ ] CPU usage normal

### Functional Testing
- [ ] User registration works
- [ ] User login works
- [ ] Super admin login works
- [ ] Payment initiation works
- [ ] Webhook processing works
- [ ] Session creation works
- [ ] Real-time updates via WebSocket work
- [ ] Email notifications sent
- [ ] SMS notifications sent (if configured)

---

## Payment System Verification

### IntaSend Integration
- [ ] STK push initiated successfully
- [ ] Payment status polling works
- [ ] Webhook signature validation passes
- [ ] Payment success flow completes
- [ ] Payment failure handled gracefully
- [ ] Wallet split calculated correctly
- [ ] Transaction records created

### M-Pesa Integration
- [ ] M-Pesa callback received
- [ ] IP whitelisting configured (production)
- [ ] Payment reconciliation works
- [ ] Duplicate payment prevention works

---

## Security Audit

### Authentication
- [ ] JWT tokens expire correctly
- [ ] Token refresh works
- [ ] Session invalidation works
- [ ] Password reset flow secure
- [ ] No token leakage in logs
- [ ] Role-based access control enforced

### API Security
- [ ] Rate limiting prevents abuse
- [ ] CORS blocks unauthorized domains
- [ ] Input validation prevents injection
- [ ] File upload restrictions (if applicable)
- [ ] Error messages don't leak sensitive info

### Data Protection
- [ ] Passwords hashed (never stored plain text)
- [ ] Sensitive data encrypted at rest (if required)
- [ ] PII handled according to regulations
- [ ] Audit logs for critical operations

---

## Performance Testing

### Load Testing
- [ ] Application handles expected concurrent users
- [ ] Database connection pool adequate
- [ ] No memory leaks under load
- [ ] Response times acceptable under load
- [ ] Graceful degradation under extreme load

### Stress Testing
- [ ] Application recovers from crashes
- [ ] Database reconnection works
- [ ] PM2 auto-restart functions
- [ ] No data corruption after crash

---

## Monitoring & Alerting

### Metrics
- [ ] Application uptime tracked
- [ ] Error rate monitored
- [ ] Response time tracked
- [ ] Payment success rate monitored
- [ ] Database performance tracked

### Alerts
- [ ] Critical errors trigger alerts
- [ ] Application down alert configured
- [ ] High error rate alert set
- [ ] Disk space alert enabled
- [ ] Payment failure alert active

---

## Backup & Recovery

### Backups
- [ ] Database backup automated
- [ ] Backup restoration tested
- [ ] Backup retention policy set
- [ ] Off-site backup configured (recommended)

### Disaster Recovery
- [ ] Recovery procedure documented
- [ ] Rollback procedure tested
- [ ] Data recovery plan in place
- [ ] RTO/RPO defined and achievable

---

## Documentation

- [ ] API documentation up to date
- [ ] Deployment guide reviewed
- [ ] Monitoring guide accessible
- [ ] Runbook for common issues created
- [ ] Contact information current

---

## Final Sign-Off

**Deployment Date**: _______________

**Deployed By**: _______________

**Verified By**: _______________

**Production URL**: _______________

**Notes**:
_______________________________________________
_______________________________________________
_______________________________________________

---

## Post-Launch Monitoring (First 24 Hours)

- [ ] Hour 1: Check logs for errors
- [ ] Hour 2: Verify payment processing
- [ ] Hour 4: Check memory/CPU usage
- [ ] Hour 8: Review error rates
- [ ] Hour 24: Full system health check

**Issues Encountered**:
_______________________________________________
_______________________________________________

**Resolution**:
_______________________________________________
_______________________________________________
