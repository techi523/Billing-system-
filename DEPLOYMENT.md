# Deployment Guide

## Prerequisites

- Node.js 16+ installed
- PostgreSQL or MySQL database
- PM2 installed globally: `npm install -g pm2`
- Environment variables configured in `.env`

---

## Production Deployment Steps

### 1. Clone and Install Dependencies

```bash
git clone <repository-url>
cd billing-system-test
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
nano .env
```

**Critical Variables:**
- `NODE_ENV=production`
- `DB_TYPE`, `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `JWT_SECRET`, `SUPER_ADMIN_JWT_SECRET`
- `INTASEND_SECRET_KEY`, `INTASEND_WEBHOOK_TOKEN`
- `MPESA_*` credentials
- `CORS_ORIGIN` (production domain)

### 3. Build the Application

```bash
npm run build
```

### 4. Database Setup

Run migrations and seed initial data:

```bash
npm run setup
```

### 5. Start with PM2

```bash
# Start all services
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Enable PM2 startup on boot
pm2 startup
```

### 6. Monitor Application

```bash
# View logs
pm2 logs billing-system

# Monitor resources
pm2 monit

# Check status
pm2 status
```

---

## Nginx Reverse Proxy (Recommended)

Create `/etc/nginx/sites-available/billing-system`:

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    # SSL certificates
    ssl_certificate /path/to/fullchain.pem;
    ssl_certificate_key /path/to/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # WebSocket support
    location /socket.io/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    # Frontend (if serving from same domain)
    location / {
        root /var/www/billing-frontend/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/billing-system /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Database Backup

### Automated Daily Backups

Create `/etc/cron.daily/backup-billing-db`:

```bash
#!/bin/bash
BACKUP_DIR="/var/backups/billing-system"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="billing_db"
DB_USER="billing_user"

mkdir -p $BACKUP_DIR

# PostgreSQL
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# MySQL
# mysqldump -u $DB_USER -p$DB_PASSWORD $DB_NAME | gzip > $BACKUP_DIR/backup_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete
```

Make executable:

```bash
sudo chmod +x /etc/cron.daily/backup-billing-db
```

---

## Monitoring & Alerts

### PM2 Plus (Optional)

```bash
pm2 link <secret> <public>
```

### Log Monitoring

```bash
# View real-time logs
pm2 logs billing-system --lines 100

# View error logs only
pm2 logs billing-system --err

# Clear logs
pm2 flush
```

---

## Graceful Shutdown

```bash
# Reload with zero downtime
pm2 reload ecosystem.config.js --env production

# Stop all processes
pm2 stop all

# Delete all processes
pm2 delete all
```

---

## Rollback Procedure

1. Stop current version:
   ```bash
   pm2 stop billing-system
   ```

2. Restore previous code:
   ```bash
   git checkout <previous-commit>
   npm install
   npm run build
   ```

3. Restart:
   ```bash
   pm2 restart billing-system
   ```

---

## Health Checks

The application exposes a health endpoint:

```bash
curl https://yourdomain.com/health
```

Expected response:
```json
{
  "status": "UP",
  "timestamp": "2026-02-07T19:00:00.000Z",
  "database": "CONNECTED",
  "uptime": 12345
}
```

---

## Troubleshooting

### Application won't start
- Check logs: `pm2 logs billing-system --err`
- Verify `.env` configuration
- Check database connectivity
- Ensure port 3000 is not in use

### High memory usage
- Check for memory leaks in logs
- Adjust `max_memory_restart` in `ecosystem.config.js`
- Review active sessions and connections

### Database connection errors
- Verify database credentials in `.env`
- Check database server status
- Ensure firewall allows connection

---

## Security Checklist

- [ ] HTTPS enabled with valid SSL certificate
- [ ] `.env` file has restricted permissions (600)
- [ ] Database uses strong passwords
- [ ] CORS_ORIGIN set to production domain only
- [ ] Rate limiting configured
- [ ] Webhook signatures validated
- [ ] Firewall configured (allow only 80, 443, SSH)
- [ ] Regular security updates applied
- [ ] Logs monitored for suspicious activity
- [ ] Backups tested and verified

---

## Support

For issues, contact: support@yourdomain.com
