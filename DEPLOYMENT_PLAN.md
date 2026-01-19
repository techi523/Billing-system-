# Enterprise Billing System Deployment Plan

## Phase 1: Infrastructure Setup (Week 1)

### 1.1 Database Migration Strategy

```bash
# PostgreSQL Setup
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createuser --interactive billing_user
sudo -u postgres createdb billing_system

# Redis Setup
sudo apt install redis-server
sudo systemctl enable redis-server
sudo systemctl start redis-server

# Database Migration Scripts
psql -U billing_user -d billing_system -f enhanced_schema.sql
psql -U billing_user -d billing_system -f data_migration.sql
```

### 1.2 Container Orchestration

```yaml
# docker-compose.yml
version: '3.8'

services:
  # Load Balancer
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - api-gateway

  # API Gateway
  api-gateway:
    build: ./api-gateway
    environment:
      - REDIS_URL=redis://redis:6379
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - redis

  # Microservices
  auth-service:
    build: ./services/auth
    environment:
      - DATABASE_URL=postgresql://billing_user:${DB_PASSWORD}@postgres:5432/billing_system
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  billing-service:
    build: ./services/billing
    environment:
      - DATABASE_URL=postgresql://billing_user:${DB_PASSWORD}@postgres:5432/billing_system
      - RABBITMQ_URL=amqp://rabbitmq:5672
    depends_on:
      - postgres
      - rabbitmq

  network-service:
    build: ./services/network
    environment:
      - DATABASE_URL=postgresql://billing_user:${DB_PASSWORD}@postgres:5432/billing_system
      - RADIUS_SECRET=${RADIUS_SECRET}
    depends_on:
      - postgres
      - freeradius

  # RADIUS Server
  freeradius:
    image: freeradius/freeradius-server:latest
    volumes:
      - ./freeradius/config:/etc/freeradius
    ports:
      - "1812:1812/udp"
      - "1813:1813/udp"
    environment:
      - RADIUS_SECRET=${RADIUS_SECRET}

  # Message Queue
  rabbitmq:
    image: rabbitmq:3-management
    environment:
      - RABBITMQ_DEFAULT_USER=admin
      - RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}
    ports:
      - "5672:5672"
      - "15672:15672"

  # Databases
  postgres:
    image: postgres:15
    environment:
      - POSTGRES_DB=billing_system
      - POSTGRES_USER=billing_user
      - POSTGRES_PASSWORD=${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data
    ports:
      - "6379:6379"

volumes:
  postgres_data:
  redis_data:
```

### 1.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [ main ]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Build Docker Images
      run: |
        docker build -t billing/auth-service:${{ github.sha }} ./services/auth
        docker build -t billing/billing-service:${{ github.sha }} ./services/billing
        docker build -t billing/network-service:${{ github.sha }} ./services/network
        docker build -t billing/api-gateway:${{ github.sha }} ./api-gateway
    
    - name: Deploy to Production
      uses: appleboy/ssh-action@v1.0.0
      with:
        host: ${{ secrets.PRODUCTION_HOST }}
        username: ${{ secrets.PRODUCTION_USER }}
        key: ${{ secrets.PRODUCTION_SSH_KEY }}
        script: |
          docker-compose -f docker-compose.prod.yml down
          docker-compose -f docker-compose.prod.yml up -d
          docker system prune -f
```

## Phase 2: Service Implementation (Weeks 2-3)

### 2.1 Authentication Service

```typescript
// services/auth/src/app.ts
import express from 'express';
import { authRoutes } from './routes/auth';
import { userRoutes } from './routes/users';
import { rbacMiddleware } from './middleware/rbac';

const app = express();

app.use(express.json());
app.use('/api/v2/auth', authRoutes);
app.use('/api/v2/users', rbacMiddleware(['ADMIN']), userRoutes);

export default app;
```

### 2.2 Billing Service

```typescript
// services/billing/src/services/BillingEngine.ts
export class BillingEngine {
    async calculateUsageCharges(sessionId: string): Promise<Charges> {
        const session = await this.getSession(sessionId);
        const plan = await this.getPlan(session.planId);
        
        // Calculate based on session data
        const charges = await this.calculateCharges(session, plan);
        
        // Update wallet balance
        await this.updateWallet(session.subscriberId, -charges.total);
        
        // Generate invoice if postpaid
        if (session.accountType === 'POSTPAID') {
            await this.generateInvoice(session.subscriberId, charges);
        }
        
        return charges;
    }
}
```

### 2.3 Network Service (RADIUS)

```typescript
// services/network/src/radius/server.ts
import { RadiusServer } from 'node-radius';

export class EnhancedRadiusServer {
    private server: RadiusServer;
    
    constructor() {
        this.server = new RadiusServer({
            sharedSecret: process.env.RADIUS_SECRET,
            authPort: 1812,
            acctPort: 1813
        });
        
        this.setupHandlers();
    }
    
    private setupHandlers() {
        this.server.on('access-request', this.handleAccessRequest.bind(this));
        this.server.on('accounting-request', this.handleAccountingRequest.bind(this));
    }
}
```

## Phase 3: Frontend Deployment (Week 4)

### 3.1 Admin Dashboard

```typescript
// frontend/src/services/api.ts
export const api = {
    auth: {
        login: (credentials: LoginCredentials) => 
            axios.post('/api/v2/auth/login', credentials),
        logout: () => axios.post('/api/v2/auth/logout')
    },
    
    subscribers: {
        getAll: () => axios.get('/api/v2/subscribers'),
        create: (data: CreateSubscriber) => 
            axios.post('/api/v2/subscribers', data),
        getUsage: (id: string, period: string) =>
            axios.get(`/api/v2/subscribers/${id}/usage?period=${period}`)
    },
    
    billing: {
        getPlans: () => axios.get('/api/v2/billing/plans'),
        calculateCharges: (subscriberId: string, period: string) =>
            axios.get(`/api/v2/billing/${subscriberId}/charges?period=${period}`)
    }
};
```

### 3.2 Captive Portal

```html
<!-- public/captive-portal.html -->
<!DOCTYPE html>
<html>
<head>
    <title>Wi-Fi Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        /* Responsive design for all devices */
        .container { max-width: 400px; margin: 50px auto; padding: 20px; }
        .plan-card { border: 1px solid #ddd; padding: 15px; margin: 10px 0; }
        .btn { background: #007bff; color: white; padding: 10px; border: none; }
    </style>
</head>
<body>
    <div class="container">
        <h2>Wi-Fi Access</h2>
        <div id="plans"></div>
        <form id="login-form">
            <input type="text" id="username" placeholder="Username" required>
            <input type="password" id="password" placeholder="Password" required>
            <button type="submit" class="btn">Connect</button>
        </form>
    </div>
    
    <script>
        // Dynamic plan loading and form submission
        async function loadPlans() {
            const response = await fetch('/api/v2/billing/plans');
            const plans = await response.json();
            // Render plans
        }
        
        document.getElementById('login-form').addEventListener('submit', async (e) => {
            e.preventDefault();
            // Handle login
        });
    </script>
</body>
</html>
```

## Phase 4: Monitoring & Security (Week 5)

### 4.1 Monitoring Stack

```yaml
# monitoring/docker-compose.yml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml

  grafana:
    image: grafana/grafana
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana

  node-exporter:
    image: prom/node-exporter
    ports:
      - "9100:9100"

  cadvisor:
    image: gcr.io/cadvisor/cadvisor
    ports:
      - "8080:8080"
    volumes:
      - /:/rootfs:ro
      - /var/run:/var/run:ro

volumes:
  grafana_data:
```

### 4.2 Security Hardening

```yaml
# security/security-config.yaml
security:
  jwt:
    secret: ${JWT_SECRET}
    expiration: 3600
    refresh_expiration: 86400
  
  rate_limiting:
    window_ms: 900000
    max_requests: 100
    strict_max: 10
  
  encryption:
    algorithm: aes-256-gcm
    key_rotation_days: 90
  
  audit:
    log_level: INFO
    retention_days: 365
    encryption: true
```

## Phase 5: Testing & Validation (Week 6)

### 5.1 Load Testing

```javascript
// tests/load-test.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
    stages: [
        { duration: '2m', target: 100 },
        { duration: '5m', target: 100 },
        { duration: '2m', target: 200 },
        { duration: '5m', target: 200 },
        { duration: '2m', target: 0 },
    ],
};

export default function() {
    let response = http.get('http://localhost/api/v2/subscribers');
    check(response, {
        'status is 200': (r) => r.status === 200,
        'response time < 500ms': (r) => r.timings.duration < 500,
    });
    sleep(1);
}
```

### 5.2 Integration Tests

```typescript
// tests/integration/radius.test.ts
describe('RADIUS Integration', () => {
    test('should authenticate valid user', async () => {
        const response = await radiusClient.sendAccessRequest({
            username: 'testuser',
            password: 'testpass',
            nasIdentifier: 'test-nas'
        });
        
        expect(response.code).toBe('Access-Accept');
    });
    
    test('should reject invalid credentials', async () => {
        const response = await radiusClient.sendAccessRequest({
            username: 'invalid',
            password: 'invalid',
            nasIdentifier: 'test-nas'
        });
        
        expect(response.code).toBe('Access-Reject');
    });
});
```

## Phase 6: Production Rollout (Week 7)

### 6.1 Blue-Green Deployment

```bash
# Deployment script
#!/bin/bash

# Deploy to green environment
docker-compose -f docker-compose.green.yml up -d

# Health check
curl -f http://green.example.com/health || exit 1

# Switch traffic
nginx -s reload

# Monitor for 10 minutes
sleep 600

# If successful, keep green as production
# If failed, rollback to blue
```

### 6.2 Rollback Plan

```bash
# Rollback script
#!/bin/bash

# Stop current services
docker-compose down

# Restore previous version
git checkout HEAD~1

# Rebuild and deploy
docker-compose build
docker-compose up -d

# Verify rollback
curl -f http://production.example.com/health
```

## Success Criteria

### Performance Metrics
- ✅ 1000+ concurrent users
- ✅ <100ms API response time
- ✅ 99.9% uptime
- ✅ <1s RADIUS authentication

### Business Metrics
- ✅ Zero data loss during migration
- ✅ <5 minute deployment time
- ✅ <1 minute rollback time
- ✅ 100% PCI-DSS compliance

### Technical Metrics
- ✅ 95%+ test coverage
- ✅ All security scans pass
- ✅ Zero critical vulnerabilities
- ✅ Complete audit trail

## Risk Mitigation

### High Risk
- **Data Migration**: Use phased migration with rollback points
- **Service Downtime**: Implement blue-green deployment
- **Security Breach**: Regular security audits and penetration testing

### Medium Risk
- **Performance Issues**: Load testing and auto-scaling
- **Integration Failures**: Comprehensive integration testing
- **Configuration Drift**: Infrastructure as Code (IaC)

### Low Risk
- **User Training**: Comprehensive documentation
- **Vendor Lock-in**: Use standard protocols and APIs
