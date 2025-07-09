# Deployment & Infrastructure Guide - LinguaLink Platform

## Overview

This document provides comprehensive deployment procedures, infrastructure setup, and operational guidelines for the LinguaLink platform built for Exchange Language Services Inc. All procedures ensure enterprise-grade security, performance, and reliability standards.

## Production Infrastructure Architecture

### Cloud Infrastructure Setup

#### Primary Infrastructure (Supabase + Vercel/AWS)
```
Production Environment:
├── Application Hosting
│   ├── Web Application: Vercel (or AWS CloudFront + S3)
│   ├── Backend API: Railway/Render (or AWS ECS/Fargate)
│   ├── Database: Supabase (managed PostgreSQL)
│   └── Storage: Supabase Storage (with CDN)
├── Additional Services
│   ├── Authentication: Clerk (managed service)
│   ├── Email: SendGrid/Postmark
│   ├── SMS: Twilio
│   ├── Push Notifications: Firebase/OneSignal
│   └── Video Calling: Daily.co/Agora.io
├── Monitoring & Analytics
│   ├── Application Monitoring: Sentry
│   ├── Performance: DataDog/New Relic
│   ├── Uptime: Pingdom/StatusPage
│   └── Analytics: Mixpanel/PostHog
└── Security & Compliance
    ├── SSL/TLS: Let's Encrypt (auto-renewal)
    ├── WAF: Cloudflare
    ├── Backup: Automated daily backups
    └── Compliance: SOC 2 hosting providers
```

#### Environment Specifications
```
Environment Configuration:
├── Development
│   ├── Purpose: Feature development and testing
│   ├── Database: Supabase development instance
│   ├── Storage: Development bucket with test data
│   ├── Authentication: Clerk development environment
│   └── Scaling: Single instance, minimal resources
├── Staging
│   ├── Purpose: Pre-production testing and UAT
│   ├── Database: Staging instance with production-like data
│   ├── Storage: Staging bucket with realistic file sizes
│   ├── Authentication: Clerk staging environment
│   ├── Scaling: Production-like configuration
│   └── Data: Anonymized production data for testing
└── Production
    ├── Purpose: Live ELS operations
    ├── Database: High-availability PostgreSQL with replicas
    ├── Storage: Multi-region backup and CDN
    ├── Authentication: Clerk production with MFA
    ├── Scaling: Auto-scaling with load balancing
    └── Monitoring: Full observability and alerting
```

## Detailed Deployment Procedures

### Backend Deployment (NestJS API)

#### Pre-Deployment Checklist
```bash
# 1. Code Quality Verification
npm run lint
npm run test
npm run test:e2e
npm run build

# 2. Security Scanning
npm audit --audit-level high
npx retire --exitwith 1

# 3. Environment Configuration
cp .env.production.example .env.production
# Verify all environment variables are set

# 4. Database Migration Verification
npm run migration:generate
npm run migration:run --env=staging
```

#### Production Deployment Steps
```bash
# 1. Deploy to staging first
git checkout main
git pull origin main
docker build -t lingualink-api:latest .
docker tag lingualink-api:latest lingualink-api:staging
docker push lingualink-api:staging

# 2. Run staging tests
npm run test:staging

# 3. Deploy to production (blue-green deployment)
kubectl apply -f k8s/production/
kubectl rollout status deployment/lingualink-api

# 4. Verify deployment health
curl https://api.lingualink.exls.ca/health
kubectl get pods -l app=lingualink-api

# 5. Run production smoke tests
npm run test:smoke-production
```

#### Rollback Procedures
```bash
# Immediate rollback if issues detected
kubectl rollout undo deployment/lingualink-api

# Or rollback to specific version
kubectl rollout undo deployment/lingualink-api --to-revision=2

# Verify rollback success
kubectl rollout status deployment/lingualink-api
curl https://api.lingualink.exls.ca/health
```

### Web Application Deployment (React)

#### Build and Deployment Process
```bash
# 1. Environment-specific build
npm install
npm run build:production

# 2. Build verification
npm run test:build
npm run lighthouse:ci

# 3. Deploy to CDN
vercel deploy --prod
# or for AWS:
aws s3 sync dist/ s3://lingualink-web-prod
aws cloudfront create-invalidation --distribution-id XXX --paths "/*"

# 4. Verify deployment
curl -I https://lingualink.exls.ca
npm run test:e2e:production
```

#### Performance Optimization
```bash
# Bundle analysis
npm run analyze-bundle

# Performance testing
npm run lighthouse:performance
npm run test:performance

# SEO and accessibility verification
npm run lighthouse:seo
npm run test:accessibility
```

### Mobile Application Deployment

#### Android Deployment (Google Play)
```bash
# 1. Build release APK/AAB
./gradlew assembleRelease
./gradlew bundleRelease

# 2. Sign the build
jarsigner -verbose -sigalg SHA256withRSA -digestalg SHA-256 \
  -keystore lingualink-release.keystore \
  app-release-unsigned.apk lingualink

# 3. Optimize and align
zipalign -v 4 app-release-unsigned.apk lingualink-release.apk

# 4. Upload to Google Play Console
# - Upload AAB file
# - Set rollout percentage (5% → 50% → 100%)
# - Monitor crash reports and reviews
```

#### iOS Deployment (App Store)
```bash
# 1. Archive the app in Xcode
xcodebuild -workspace LinguaLink.xcworkspace \
  -scheme LinguaLink \
  -configuration Release \
  -archivePath LinguaLink.xcarchive \
  archive

# 2. Export IPA
xcodebuild -exportArchive \
  -archivePath LinguaLink.xcarchive \
  -exportPath . \
  -exportOptionsPlist ExportOptions.plist

# 3. Upload to App Store Connect
xcrun altool --upload-app -f LinguaLink.ipa \
  -u your-apple-id@exls.ca \
  -p your-app-specific-password

# 4. Submit for review through App Store Connect
```

## Database Deployment & Management

### Supabase Configuration

#### Production Database Setup
```sql
-- 1. Create production database
CREATE DATABASE lingualink_production;

-- 2. Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- 3. Set up Row Level Security
ALTER DATABASE lingualink_production SET row_security = on;

-- 4. Configure connection pooling
-- Set max_connections = 200 in Supabase dashboard
-- Configure pgBouncer with pool_mode = transaction
```

#### Migration Strategy
```bash
# 1. Backup current production data
pg_dump postgresql://[connection_string] > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Test migration on staging
npm run migration:run --env=staging
npm run test:integration --env=staging

# 3. Schedule maintenance window
# Send notification to ELS team and users
# Put API in maintenance mode

# 4. Run production migration
npm run migration:run --env=production

# 5. Verify migration success
npm run migration:verify --env=production
npm run test:smoke --env=production

# 6. Remove maintenance mode
```

#### Backup and Recovery Procedures
```bash
# Automated daily backups (configured in Supabase)
# Manual backup before major deployments
pg_dump postgresql://[prod_connection] > pre_deployment_backup.sql

# Point-in-time recovery (available with Supabase Pro)
# Recovery procedures:
# 1. Identify recovery point
# 2. Create new instance from backup
# 3. Verify data integrity
# 4. Update DNS to point to new instance
# 5. Notify ELS team of any data loss window
```

## Security Configuration

### SSL/TLS Configuration
```nginx
# Nginx configuration for enhanced security
server {
    listen 443 ssl http2;
    server_name api.lingualink.exls.ca;
    
    ssl_certificate /etc/letsencrypt/live/api.lingualink.exls.ca/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.lingualink.exls.ca/privkey.pem;
    
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;
    ssl_prefer_server_ciphers off;
    
    add_header Strict-Transport-Security "max-age=63072000" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header Referrer-Policy "strict-origin-when-cross-origin";
}
```

### Environment Variables Management
```bash
# Production environment variables (stored in secure vault)
# Never commit these to git

# Application
NODE_ENV=production
API_URL=https://api.lingualink.exls.ca
WEB_URL=https://lingualink.exls.ca

# Database
DATABASE_URL=postgresql://[supabase_connection_string]
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=[anon_key]
SUPABASE_SERVICE_KEY=[service_key]

# Authentication
CLERK_PUBLISHABLE_KEY=[clerk_publishable_key]
CLERK_SECRET_KEY=[clerk_secret_key]
CLERK_JWT_KEY=[clerk_jwt_key]

# External Services
SENDGRID_API_KEY=[sendgrid_key]
TWILIO_ACCOUNT_SID=[twilio_sid]
TWILIO_AUTH_TOKEN=[twilio_token]
STRIPE_SECRET_KEY=[stripe_secret]

# Security
JWT_SECRET=[strong_random_secret]
ENCRYPTION_KEY=[encryption_key]
SESSION_SECRET=[session_secret]

# Monitoring
SENTRY_DSN=[sentry_dsn]
DATADOG_API_KEY=[datadog_key]
```

## Monitoring and Alerting Setup

### Application Monitoring Configuration
```javascript
// Sentry configuration for error tracking
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
  beforeSend(event) {
    // Filter out PII and sensitive data
    if (event.user) {
      delete event.user.email;
      delete event.user.ip_address;
    }
    return event;
  }
});
```

### Health Check Endpoints
```typescript
// API health check endpoint
@Get('/health')
async healthCheck() {
  const checks = await Promise.allSettled([
    this.databaseService.ping(),
    this.redisService.ping(),
    this.supabaseService.ping(),
    this.clerkService.ping()
  ]);
  
  const health = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: process.env.APP_VERSION,
    checks: {
      database: checks[0].status === 'fulfilled' ? 'ok' : 'error',
      redis: checks[1].status === 'fulfilled' ? 'ok' : 'error',
      supabase: checks[2].status === 'fulfilled' ? 'ok' : 'error',
      clerk: checks[3].status === 'fulfilled' ? 'ok' : 'error'
    }
  };
  
  const allHealthy = Object.values(health.checks).every(status => status === 'ok');
  
  return {
    ...health,
    status: allHealthy ? 'ok' : 'degraded'
  };
}
```

### Alert Configuration
```yaml
# DataDog alert configuration
alerts:
  - name: "High Error Rate"
    query: "avg(last_5m):sum:api.errors{env:production} > 10"
    message: "Error rate exceeded 10 errors/5min in production"
    escalation: "critical"
    notify: ["ops-team@exls.ca", "dev-team@exls.ca"]
  
  - name: "Database Connection Issues"
    query: "avg(last_2m):sum:database.connection.errors{env:production} > 5"
    message: "Database connection errors detected"
    escalation: "critical"
    notify: ["ops-team@exls.ca"]
  
  - name: "High Response Time"
    query: "avg(last_10m):avg:api.response_time{env:production} > 2000"
    message: "API response time exceeded 2 seconds"
    escalation: "warning"
    notify: ["dev-team@exls.ca"]
```

## Performance Optimization

### CDN Configuration
```javascript
// Cloudflare settings for optimal performance
const cloudflareConfig = {
  // Cache static assets for 1 year
  cacheLevel: 'aggressive',
  cacheTtl: 31536000,
  
  // Optimize images automatically
  polish: 'lossy',
  imageResizing: true,
  
  // Enable compression
  compression: 'gzip',
  brotli: true,
  
  // Security settings
  securityLevel: 'medium',
  challengePassage: 86400,
  
  // Performance features
  rocketLoader: true,
  mirage: true,
  webp: true
};
```

### Database Performance Tuning
```sql
-- Production database optimization
-- 1. Create performance indexes
CREATE INDEX CONCURRENTLY idx_requests_status_created 
ON requests(status, created_at) WHERE status IN ('pending', 'active');

CREATE INDEX CONCURRENTLY idx_users_role_active 
ON users(role, is_active) WHERE is_active = true;

-- 2. Optimize connection pooling
ALTER SYSTEM SET max_connections = 200;
ALTER SYSTEM SET shared_buffers = '256MB';
ALTER SYSTEM SET effective_cache_size = '1GB';
ALTER SYSTEM SET maintenance_work_mem = '64MB';

-- 3. Enable query optimization
ALTER SYSTEM SET random_page_cost = 1.1;
ALTER SYSTEM SET effective_io_concurrency = 200;
```

## Disaster Recovery Procedures

### Backup Strategy
```bash
#!/bin/bash
# Automated backup script

# 1. Database backup
pg_dump $DATABASE_URL > "db_backup_$(date +%Y%m%d_%H%M%S).sql"

# 2. File storage backup
aws s3 sync s3://lingualink-storage s3://lingualink-backup-$(date +%Y%m%d)

# 3. Configuration backup
kubectl get configmaps -o yaml > "config_backup_$(date +%Y%m%d).yaml"
kubectl get secrets -o yaml > "secrets_backup_$(date +%Y%m%d).yaml"

# 4. Upload to secure backup location
aws s3 cp *.sql s3://lingualink-disaster-recovery/
aws s3 cp *.yaml s3://lingualink-disaster-recovery/

# 5. Test backup integrity
pg_restore --list "db_backup_$(date +%Y%m%d_%H%M%S).sql"
```

### Recovery Procedures
```bash
# Complete system recovery procedure

# 1. Assess damage and determine recovery point
# 2. Notify ELS team and users of downtime
echo "Service disruption - recovery in progress" > maintenance.html

# 3. Restore database
psql $RECOVERY_DATABASE_URL < latest_backup.sql

# 4. Restore file storage
aws s3 sync s3://lingualink-disaster-recovery/files s3://lingualink-storage

# 5. Redeploy application
kubectl apply -f k8s/production/
kubectl rollout status deployment/lingualink-api

# 6. Verify system integrity
npm run test:smoke-production
curl -f https://api.lingualink.exls.ca/health

# 7. Remove maintenance mode and notify users
rm maintenance.html
echo "System recovery complete - service restored"
```

## Security Hardening

### Server Security Configuration
```bash
# Security hardening checklist

# 1. Update system packages
apt update && apt upgrade -y

# 2. Configure firewall
ufw allow ssh
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# 3. Secure SSH configuration
echo "PermitRootLogin no" >> /etc/ssh/sshd_config
echo "PasswordAuthentication no" >> /etc/ssh/sshd_config
echo "PubkeyAuthentication yes" >> /etc/ssh/sshd_config
systemctl reload sshd

# 4. Install security monitoring
apt install fail2ban -y
systemctl enable fail2ban
systemctl start fail2ban

# 5. Configure automatic security updates
apt install unattended-upgrades -y
dpkg-reconfigure -plow unattended-upgrades
```

### Application Security Headers
```typescript
// Security middleware configuration
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "https://js.clerk.dev"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "https://api.lingualink.exls.ca"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

## Operational Procedures

### Deployment Schedule
```
Standard Deployment Schedule:
├── Emergency Fixes: Immediate deployment 24/7
├── Regular Updates: Tuesday/Thursday 10 AM EST
├── Major Releases: First Tuesday of month
└── Security Updates: Within 24 hours of discovery

Maintenance Windows:
├── Weekly: Sunday 2-4 AM EST (minor updates)
├── Monthly: First Sunday 2-6 AM EST (major updates)
└── Emergency: As needed with 1-hour notice to ELS
```

### Communication Protocol
```
Deployment Communication:
├── 48 hours notice: Major releases to ELS team
├── 24 hours notice: Minor updates to ELS team
├── 1 hour notice: Emergency fixes to ELS team
├── Real-time: Status page updates for all deployments
└── Post-deployment: Summary report to ELS management

Contact Escalation:
├── Level 1: dev-team@exls.ca (response: 2 hours)
├── Level 2: ops-team@exls.ca (response: 1 hour)
├── Level 3: emergency@exls.ca (response: 30 minutes)
└── Critical: Direct phone to ELS management (immediate)
```

### Performance Benchmarks
```
Production Performance Targets:
├── API Response Time: < 200ms (95th percentile)
├── Web Page Load: < 2 seconds initial load
├── Mobile App Launch: < 3 seconds cold start
├── Database Queries: < 50ms simple, < 200ms complex
├── File Upload: < 5 seconds for 10MB files
├── Video Call Setup: < 3 seconds connection
├── Real-time Notifications: < 100ms delivery
└── System Uptime: 99.9% availability (8.76 hours downtime/year max)
```

This comprehensive deployment and infrastructure guide ensures reliable, secure, and performant operation of the LinguaLink platform for Exchange Language Services Inc. 