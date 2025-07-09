# White-Label Architecture - LinguaLink Platform
## Multi-Tenant Translation & Interpretation SaaS Solution

### Overview

The LinguaLink platform can be transformed into a comprehensive white-label SaaS solution, enabling multiple translation and interpretation companies to operate their own branded platforms while sharing the same underlying infrastructure and codebase.

## White-Label Capabilities

### Core Benefits
- **Reduced Time-to-Market**: New clients can launch in 2-4 weeks vs. 6+ months custom development
- **Cost Efficiency**: Shared infrastructure reduces operational costs by 60-80%
- **Scalability**: Single platform serving multiple brands with isolated data
- **Consistency**: Proven business logic and compliance across all tenants
- **Revenue Model**: SaaS subscription + transaction fees for sustainable growth

## 1. Multi-Tenant Architecture

### Tenant Isolation Strategy
```typescript
// Enhanced tenant-aware database schema
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR UNIQUE NOT NULL, -- URL-friendly identifier
    name VARCHAR NOT NULL, -- Company name
    domain VARCHAR UNIQUE, -- Custom domain (optional)
    
    -- Branding configuration
    branding JSONB NOT NULL DEFAULT '{}', -- Logo, colors, themes
    
    -- Business configuration
    business_config JSONB NOT NULL DEFAULT '{}', -- Services, pricing, policies
    
    -- Feature flags
    features JSONB NOT NULL DEFAULT '{}', -- Enabled/disabled features
    
    -- Subscription info
    subscription_tier tenant_tier NOT NULL DEFAULT 'starter',
    subscription_status subscription_status NOT NULL DEFAULT 'trial',
    subscription_expires_at TIMESTAMP WITH TIME ZONE,
    
    -- Compliance settings
    compliance_config JSONB NOT NULL DEFAULT '{}', -- Region-specific rules
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TYPE tenant_tier AS ENUM ('starter', 'professional', 'enterprise', 'custom');
CREATE TYPE subscription_status AS ENUM ('trial', 'active', 'suspended', 'cancelled');
```

### Enhanced User Schema
```sql
-- Updated users table with tenant association
ALTER TABLE users ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE service_requests ADD COLUMN tenant_id UUID REFERENCES tenants(id);
ALTER TABLE sessions ADD COLUMN tenant_id UUID REFERENCES tenants(id);
-- Apply to all relevant tables

-- Tenant-aware RLS policies
CREATE POLICY "Users can only access their tenant data" ON users
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);

CREATE POLICY "Requests are isolated by tenant" ON service_requests
    FOR ALL USING (tenant_id = current_setting('app.current_tenant_id')::uuid);
```

## 2. Tenant Configuration System

### Branding Configuration
```typescript
// Tenant branding interface
interface TenantBranding {
  // Visual identity
  logo: {
    primary: string; // URL to primary logo
    secondary?: string; // URL to secondary/white logo
    favicon: string; // URL to favicon
  };
  
  // Color scheme
  colors: {
    primary: string; // #hex color
    secondary: string;
    accent: string;
    background: string;
    text: string;
    success: string;
    warning: string;
    error: string;
  };
  
  // Typography
  fonts: {
    primary: string; // Font family name
    secondary?: string;
    weights: number[]; // Available font weights
  };
  
  // Layout preferences
  layout: {
    headerStyle: 'minimal' | 'full' | 'compact';
    sidebarStyle: 'collapsed' | 'expanded' | 'overlay';
    footerStyle: 'minimal' | 'full' | 'hidden';
  };
  
  // Custom CSS overrides
  customCSS?: string;
}

// Business configuration interface
interface TenantBusinessConfig {
  // Company information
  company: {
    name: string;
    legalName: string;
    registrationNumber?: string;
    taxNumber?: string;
    address: Address;
    phone: string;
    email: string;
    website?: string;
  };
  
  // Supported services
  services: {
    translation: boolean;
    inPersonInterpretation: boolean;
    phoneInterpretation: boolean;
    virtualInterpretation: boolean;
    groupInterpretation: boolean;
    messageRelay: boolean;
    sightTranslation: boolean;
  };
  
  // Language pairs
  languagePairs: Array<{
    source: string;
    target: string;
    serviceTypes: ServiceType[];
  }>;
  
  // Pricing configuration
  pricing: {
    currency: string; // USD, CAD, EUR, etc.
    translation: {
      baseRate: number;
      rateUnit: 'word' | 'page' | 'hour';
      minimumCharge?: number;
      urgencyMultipliers: Record<string, number>;
    };
    interpretation: {
      inPerson: number;
      phone: number;
      virtual: number;
      minimumDuration: number; // minutes
      overtimeRate?: number;
    };
  };
  
  // Business rules
  businessRules: {
    minimumNotice: number; // hours
    cancellationPolicy: number; // hours before session
    documentRetention: number; // days
    workingHours: {
      [key: string]: { start: string; end: string } | null;
    };
    emergencySupport: boolean;
    autoAssignment: boolean;
  };
  
  // Geographic coverage
  serviceCoverage: {
    countries: string[];
    regions?: string[];
    cities?: string[];
  };
  
  // Compliance requirements
  compliance: {
    certificationRequired: boolean;
    backgroundCheckRequired: boolean;
    insuranceRequired: boolean;
    additionalRequirements?: string[];
  };
}
```

### Feature Flag System
```typescript
// Feature management service
@Injectable()
export class FeatureService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly cacheService: CacheService
  ) {}

  async isFeatureEnabled(
    tenantId: string, 
    feature: FeatureFlag
  ): Promise<boolean> {
    const cacheKey = `tenant:${tenantId}:features`;
    let features = await this.cacheService.get<Record<string, boolean>>(cacheKey);
    
    if (!features) {
      const tenant = await this.tenantService.findById(tenantId);
      features = tenant.features;
      await this.cacheService.set(cacheKey, features, 3600); // 1 hour cache
    }
    
    return features[feature] ?? this.getDefaultFeatureState(feature);
  }

  private getDefaultFeatureState(feature: FeatureFlag): boolean {
    const defaults: Record<FeatureFlag, boolean> = {
      [FeatureFlag.REAL_TIME_CHAT]: true,
      [FeatureFlag.VIDEO_CALLING]: true,
      [FeatureFlag.DOCUMENT_TRANSLATION]: true,
      [FeatureFlag.MOBILE_APP]: true,
      [FeatureFlag.ANALYTICS_DASHBOARD]: false, // Premium feature
      [FeatureFlag.API_ACCESS]: false, // Enterprise feature
      [FeatureFlag.CUSTOM_BRANDING]: false, // Paid feature
      [FeatureFlag.MULTI_LANGUAGE_SUPPORT]: true,
      [FeatureFlag.AUTOMATED_MATCHING]: true,
      [FeatureFlag.PAYMENT_PROCESSING]: false, // Requires setup
    };
    
    return defaults[feature];
  }
}

enum FeatureFlag {
  REAL_TIME_CHAT = 'realTimeChat',
  VIDEO_CALLING = 'videoCalling',
  DOCUMENT_TRANSLATION = 'documentTranslation',
  MOBILE_APP = 'mobileApp',
  ANALYTICS_DASHBOARD = 'analyticsDashboard',
  API_ACCESS = 'apiAccess',
  CUSTOM_BRANDING = 'customBranding',
  MULTI_LANGUAGE_SUPPORT = 'multiLanguageSupport',
  AUTOMATED_MATCHING = 'automatedMatching',
  PAYMENT_PROCESSING = 'paymentProcessing',
}
```

## 3. Tenant-Aware Middleware & Guards

### Tenant Resolution Middleware
```typescript
// Tenant context middleware
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly tenantService: TenantService,
    private readonly cacheService: CacheService
  ) {}

  async use(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantIdentifier = this.extractTenantIdentifier(req);
    
    if (!tenantIdentifier) {
      throw new BadRequestException('Tenant not specified');
    }

    // Get tenant from cache or database
    const tenant = await this.resolveTenant(tenantIdentifier);
    
    if (!tenant) {
      throw new NotFoundException('Tenant not found');
    }

    if (tenant.subscriptionStatus !== 'active') {
      throw new ForbiddenException('Tenant subscription inactive');
    }

    // Set tenant context
    req['tenant'] = tenant;
    req['tenantId'] = tenant.id;
    
    // Set database context for RLS
    if (req['db']) {
      await req['db'].query(`SET app.current_tenant_id = '${tenant.id}'`);
    }

    next();
  }

  private extractTenantIdentifier(req: Request): string | null {
    // 1. Check custom domain
    const host = req.get('host');
    if (host && !this.isMainDomain(host)) {
      return host;
    }

    // 2. Check subdomain
    const subdomain = this.extractSubdomain(host);
    if (subdomain && subdomain !== 'www' && subdomain !== 'api') {
      return subdomain;
    }

    // 3. Check header (for API access)
    const tenantHeader = req.get('X-Tenant-ID');
    if (tenantHeader) {
      return tenantHeader;
    }

    // 4. Check URL path prefix
    const pathTenant = req.path.match(/^\/t\/([^\/]+)/);
    if (pathTenant) {
      return pathTenant[1];
    }

    return null;
  }

  private async resolveTenant(identifier: string): Promise<Tenant | null> {
    const cacheKey = `tenant:resolve:${identifier}`;
    let tenant = await this.cacheService.get<Tenant>(cacheKey);
    
    if (!tenant) {
      // Try by domain first, then by slug
      tenant = await this.tenantService.findByDomain(identifier) ||
               await this.tenantService.findBySlug(identifier);
      
      if (tenant) {
        await this.cacheService.set(cacheKey, tenant, 1800); // 30 minutes
      }
    }
    
    return tenant;
  }

  private isMainDomain(host: string): boolean {
    const mainDomains = ['lingualink.com', 'localhost:3000', 'api.lingualink.com'];
    return mainDomains.some(domain => host === domain || host.endsWith(`.${domain}`));
  }

  private extractSubdomain(host: string): string | null {
    if (!host) return null;
    
    const parts = host.split('.');
    if (parts.length > 2) {
      return parts[0];
    }
    
    return null;
  }
}
```

### Feature-Aware Guards
```typescript
// Feature guard decorator and implementation
@Injectable()
export class FeatureGuard implements CanActivate {
  constructor(
    private readonly featureService: FeatureService,
    private readonly reflector: Reflector
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredFeatures = this.reflector.getAllAndOverride<FeatureFlag[]>(
      'features',
      [context.getHandler(), context.getClass()]
    );

    if (!requiredFeatures?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;

    if (!tenantId) {
      return false;
    }

    // Check all required features
    for (const feature of requiredFeatures) {
      const isEnabled = await this.featureService.isFeatureEnabled(tenantId, feature);
      if (!isEnabled) {
        throw new ForbiddenException(`Feature ${feature} not available for this tenant`);
      }
    }

    return true;
  }
}

// Feature decorator
export const RequireFeatures = (...features: FeatureFlag[]) =>
  SetMetadata('features', features);

// Usage example
@Controller('analytics')
@UseGuards(TenantGuard, FeatureGuard)
export class AnalyticsController {
  @Get('dashboard')
  @RequireFeatures(FeatureFlag.ANALYTICS_DASHBOARD)
  async getDashboard(@CurrentTenant() tenant: Tenant) {
    // Only accessible if analytics dashboard feature is enabled
    return this.analyticsService.getDashboard(tenant.id);
  }
}
```

## 4. Dynamic Frontend Theming

### Theme Configuration System
```typescript
// Frontend theme service
export interface TenantTheme {
  branding: TenantBranding;
  features: Record<FeatureFlag, boolean>;
  businessConfig: TenantBusinessConfig;
}

@Injectable()
export class ThemeService {
  private currentTheme$ = new BehaviorSubject<TenantTheme | null>(null);

  constructor(
    private readonly http: HttpClient,
    private readonly tenantService: TenantService
  ) {}

  async loadTenantTheme(tenantSlug: string): Promise<void> {
    try {
      const theme = await this.http.get<TenantTheme>(`/api/tenants/${tenantSlug}/theme`).toPromise();
      this.applyTheme(theme);
      this.currentTheme$.next(theme);
    } catch (error) {
      console.error('Failed to load tenant theme:', error);
      this.loadDefaultTheme();
    }
  }

  private applyTheme(theme: TenantTheme): void {
    const { branding } = theme;
    
    // Apply CSS custom properties
    const root = document.documentElement;
    
    Object.entries(branding.colors).forEach(([key, value]) => {
      root.style.setProperty(`--color-${key}`, value);
    });

    // Update favicon
    this.updateFavicon(branding.logo.favicon);

    // Apply custom CSS if provided
    if (branding.customCSS) {
      this.injectCustomCSS(branding.customCSS);
    }

    // Update page title
    document.title = `${theme.businessConfig.company.name} - Translation Services`;
  }

  private updateFavicon(faviconUrl: string): void {
    const link = document.querySelector("link[rel*='icon']") as HTMLLinkElement ||
                 document.createElement('link');
    link.type = 'image/x-icon';
    link.rel = 'shortcut icon';
    link.href = faviconUrl;
    document.getElementsByTagName('head')[0].appendChild(link);
  }

  private injectCustomCSS(css: string): void {
    const existingStyle = document.getElementById('tenant-custom-css');
    if (existingStyle) {
      existingStyle.remove();
    }

    const style = document.createElement('style');
    style.id = 'tenant-custom-css';
    style.textContent = css;
    document.head.appendChild(style);
  }

  getCurrentTheme(): Observable<TenantTheme | null> {
    return this.currentTheme$.asObservable();
  }

  isFeatureEnabled(feature: FeatureFlag): Observable<boolean> {
    return this.currentTheme$.pipe(
      map(theme => theme?.features[feature] ?? false)
    );
  }
}
```

### Dynamic Component System
```typescript
// Feature-aware component wrapper
@Component({
  selector: 'app-feature-wrapper',
  template: `
    <ng-container *ngIf="isEnabled$ | async">
      <ng-content></ng-content>
    </ng-container>
    <ng-container *ngIf="!(isEnabled$ | async) && showUpgrade">
      <div class="feature-upgrade-prompt">
        <h3>{{ feature }} Not Available</h3>
        <p>This feature is not included in your current plan.</p>
        <button (click)="showUpgradeDialog()">Upgrade Plan</button>
      </div>
    </ng-container>
  `
})
export class FeatureWrapperComponent {
  @Input() feature!: FeatureFlag;
  @Input() showUpgrade: boolean = false;

  isEnabled$: Observable<boolean>;

  constructor(private readonly themeService: ThemeService) {
    this.isEnabled$ = this.themeService.isFeatureEnabled(this.feature);
  }

  showUpgradeDialog(): void {
    // Show upgrade dialog
  }
}

// Usage in templates
// <app-feature-wrapper feature="analyticsDashboard" showUpgrade="true">
//   <app-analytics-dashboard></app-analytics-dashboard>
// </app-feature-wrapper>
```

## 5. Multi-Tenant Deployment Strategy

### Deployment Options

#### Option 1: Shared Infrastructure (Recommended)
```yaml
# Single deployment serving all tenants
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lingualink-multi-tenant
spec:
  replicas: 5
  template:
    spec:
      containers:
      - name: api
        image: lingualink/api:latest
        env:
        - name: DEPLOYMENT_MODE
          value: "multi-tenant"
        - name: DEFAULT_TENANT
          value: "lingualink"
        resources:
          requests:
            memory: "512Mi"
            cpu: "500m"
          limits:
            memory: "1Gi"
            cpu: "1000m"
```

#### Option 2: Tenant-Specific Deployments (Enterprise)
```yaml
# Individual deployments for high-value clients
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lingualink-tenant-{{TENANT_SLUG}}
  namespace: tenant-{{TENANT_SLUG}}
spec:
  replicas: 3
  template:
    spec:
      containers:
      - name: api
        image: lingualink/api:latest
        env:
        - name: DEPLOYMENT_MODE
          value: "single-tenant"
        - name: TENANT_ID
          value: "{{TENANT_ID}}"
```

### Domain Management
```typescript
// Domain routing configuration
@Injectable()
export class DomainRoutingService {
  constructor(
    private readonly tenantService: TenantService,
    private readonly dnsService: DNSService
  ) {}

  async setupCustomDomain(tenantId: string, domain: string): Promise<void> {
    // 1. Validate domain ownership
    await this.validateDomainOwnership(domain);
    
    // 2. Generate SSL certificate
    await this.generateSSLCertificate(domain);
    
    // 3. Configure CDN routing
    await this.configureCDNRouting(domain, tenantId);
    
    // 4. Update tenant configuration
    await this.tenantService.updateDomain(tenantId, domain);
    
    // 5. Clear relevant caches
    await this.clearDomainCaches(domain);
  }

  private async validateDomainOwnership(domain: string): Promise<void> {
    const verificationToken = this.generateVerificationToken();
    
    // Require customer to add TXT record
    const txtRecord = `lingualink-verification=${verificationToken}`;
    
    // Check for TXT record
    const records = await this.dnsService.resolveTXT(domain);
    const isVerified = records.some(record => record.includes(verificationToken));
    
    if (!isVerified) {
      throw new BadRequestException(
        `Domain verification failed. Please add TXT record: ${txtRecord}`
      );
    }
  }
}
```

## 6. Billing & Subscription Management

### Subscription Tiers
```typescript
interface SubscriptionTier {
  id: string;
  name: string;
  monthlyPrice: number;
  annualPrice: number;
  features: FeatureFlag[];
  limits: {
    maxUsers: number;
    maxRequestsPerMonth: number;
    maxStorageGB: number;
    maxCustomDomains: number;
  };
  support: 'community' | 'email' | 'priority' | 'dedicated';
}

const SUBSCRIPTION_TIERS: SubscriptionTier[] = [
  {
    id: 'starter',
    name: 'Starter',
    monthlyPrice: 99,
    annualPrice: 990,
    features: [
      FeatureFlag.REAL_TIME_CHAT,
      FeatureFlag.DOCUMENT_TRANSLATION,
      FeatureFlag.MOBILE_APP,
      FeatureFlag.MULTI_LANGUAGE_SUPPORT,
    ],
    limits: {
      maxUsers: 10,
      maxRequestsPerMonth: 500,
      maxStorageGB: 10,
      maxCustomDomains: 0,
    },
    support: 'community',
  },
  {
    id: 'professional',
    name: 'Professional',
    monthlyPrice: 299,
    annualPrice: 2990,
    features: [
      FeatureFlag.REAL_TIME_CHAT,
      FeatureFlag.VIDEO_CALLING,
      FeatureFlag.DOCUMENT_TRANSLATION,
      FeatureFlag.MOBILE_APP,
      FeatureFlag.ANALYTICS_DASHBOARD,
      FeatureFlag.CUSTOM_BRANDING,
      FeatureFlag.MULTI_LANGUAGE_SUPPORT,
      FeatureFlag.AUTOMATED_MATCHING,
    ],
    limits: {
      maxUsers: 50,
      maxRequestsPerMonth: 2000,
      maxStorageGB: 100,
      maxCustomDomains: 1,
    },
    support: 'email',
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    monthlyPrice: 999,
    annualPrice: 9990,
    features: Object.values(FeatureFlag), // All features
    limits: {
      maxUsers: -1, // Unlimited
      maxRequestsPerMonth: -1, // Unlimited
      maxStorageGB: 1000,
      maxCustomDomains: 5,
    },
    support: 'dedicated',
  },
];
```

### Usage Tracking & Billing
```typescript
@Injectable()
export class UsageTrackingService {
  constructor(
    private readonly metricsService: MetricsService,
    private readonly billingService: BillingService
  ) {}

  async trackUsage(tenantId: string, usageType: UsageType, quantity: number = 1): Promise<void> {
    const usage = {
      tenantId,
      type: usageType,
      quantity,
      timestamp: new Date(),
    };

    // Store usage data
    await this.metricsService.recordUsage(usage);

    // Check limits
    await this.checkUsageLimits(tenantId, usageType);
  }

  private async checkUsageLimits(tenantId: string, usageType: UsageType): Promise<void> {
    const tenant = await this.tenantService.findById(tenantId);
    const tier = SUBSCRIPTION_TIERS.find(t => t.id === tenant.subscriptionTier);
    
    if (!tier) return;

    const currentUsage = await this.getCurrentMonthUsage(tenantId, usageType);
    const limit = this.getUsageLimit(tier, usageType);

    if (limit > 0 && currentUsage >= limit) {
      throw new ForbiddenException(`Usage limit exceeded for ${usageType}`);
    }

    // Send warning at 80% usage
    if (limit > 0 && currentUsage >= limit * 0.8) {
      await this.notifyUsageWarning(tenantId, usageType, currentUsage, limit);
    }
  }
}

enum UsageType {
  API_REQUESTS = 'api_requests',
  USERS = 'users',
  STORAGE_GB = 'storage_gb',
  TRANSLATION_WORDS = 'translation_words',
  INTERPRETATION_MINUTES = 'interpretation_minutes',
}
```

## 7. White-Label Administration

### Master Admin Dashboard
```typescript
// Super admin controls for managing all tenants
@Controller('admin/tenants')
@UseGuards(SuperAdminGuard)
export class TenantAdminController {
  constructor(
    private readonly tenantService: TenantService,
    private readonly billingService: BillingService,
    private readonly analyticsService: AnalyticsService
  ) {}

  @Get()
  async getAllTenants(@Query() filters: TenantFiltersDto): Promise<PaginatedResponse<Tenant>> {
    return this.tenantService.findAll(filters);
  }

  @Post()
  async createTenant(@Body() createTenantDto: CreateTenantDto): Promise<Tenant> {
    return this.tenantService.create(createTenantDto);
  }

  @Patch(':id/subscription')
  async updateSubscription(
    @Param('id') tenantId: string,
    @Body() updateSubscriptionDto: UpdateSubscriptionDto
  ): Promise<Tenant> {
    return this.tenantService.updateSubscription(tenantId, updateSubscriptionDto);
  }

  @Get(':id/analytics')
  async getTenantAnalytics(@Param('id') tenantId: string): Promise<TenantAnalytics> {
    return this.analyticsService.getTenantAnalytics(tenantId);
  }

  @Post(':id/suspend')
  async suspendTenant(@Param('id') tenantId: string): Promise<void> {
    await this.tenantService.suspend(tenantId);
  }
}
```

## 8. Migration Strategy

### Existing ELS to Multi-Tenant
```typescript
// Migration plan for converting single-tenant ELS to multi-tenant
@Injectable()
export class MigrationService {
  async migrateToMultiTenant(): Promise<void> {
    // 1. Create default ELS tenant
    const elsTenant = await this.createElsTenant();
    
    // 2. Associate all existing data with ELS tenant
    await this.associateExistingData(elsTenant.id);
    
    // 3. Update all database policies
    await this.updateRLSPolicies();
    
    // 4. Deploy multi-tenant version
    await this.deployMultiTenantVersion();
  }

  private async createElsTenant(): Promise<Tenant> {
    return this.tenantService.create({
      slug: 'els',
      name: 'Exchange Language Services Inc.',
      domain: 'lingualink.exls.ca',
      branding: {
        // ELS branding configuration
        logo: { primary: '/assets/els-logo.png', favicon: '/assets/els-favicon.ico' },
        colors: { /* ELS colors */ },
        // ... other ELS branding
      },
      businessConfig: {
        // ELS business configuration
        company: { name: 'Exchange Language Services Inc.', /* ... */ },
        services: { /* ELS services */ },
        // ... other ELS config
      },
      subscriptionTier: 'enterprise',
      subscriptionStatus: 'active',
    });
  }
}
```

## ROI Analysis

### Revenue Model
- **Setup Fee**: $2,000-$10,000 per tenant (based on customization)
- **Monthly SaaS Fee**: $99-$999 per tenant (based on tier)
- **Transaction Fee**: 2-5% of transaction value (optional)
- **Professional Services**: $150-$250/hour for customization

### Cost Structure
- **Infrastructure**: 20-30% of revenue (shared costs)
- **Support**: 15-25% of revenue
- **Development**: 10-15% of revenue (feature development)
- **Margin**: 40-55% (healthy SaaS margins)

### Market Opportunity
- **Target Market**: 500+ translation/interpretation companies in North America
- **Market Size**: $50M+ annual opportunity
- **Time to Market**: 3-6 months for white-label launch
- **Break-even**: 25-30 paying tenants

This white-label architecture transforms LinguaLink from a single-company solution into a scalable SaaS platform, opening significant revenue opportunities while leveraging the solid technical foundation we've established. 