# LinguaLink Platform

> **Modern Translation & Interpretation Platform with Single-Tenant Deployments**

## 🎯 Overview

LinguaLink is a comprehensive platform for translation companies, providing dedicated deployments with complete customization for each customer. Built with React, NestJS, and PostgreSQL for enterprise-grade performance and security.

### Key Features

- **🔐 Dedicated Deployments** - Each customer gets their own isolated instance
- **🎨 Custom Branding** - Full UI customization with logos, colors, and themes  
- **🌐 Translation Services** - Document translation with automated workflows
- **🗣 Interpretation Services** - In-person, phone, and video interpretation
- **💰 Payment Processing** - Integrated billing with Stripe
- **📊 Analytics Dashboard** - Comprehensive reporting and insights
- **📱 Responsive Design** - Works seamlessly on desktop and mobile
- **🔒 Enterprise Security** - Data isolation, encryption, and compliance ready

### Business Model

**Deployment Strategy**: One codebase deployed separately for each customer
- Custom domain/subdomain for each client
- Dedicated database and infrastructure
- Personalized branding and configuration
- Independent scaling and management

## 🏗 Architecture

### Technology Stack

**Frontend**
- React 18 + TypeScript
- Material-UI (MUI) design system
- Redux Toolkit for state management
- Vite for fast development builds
- Socket.io for real-time features

**Backend**
- NestJS with TypeScript
- PostgreSQL database
- Redis for caching
- Clerk for authentication
- Stripe for payments
- SendGrid for emails

**Infrastructure**
- Docker containerization
- Kubernetes orchestration
- GitHub Actions CI/CD
- Prometheus monitoring
- ELK stack logging

### Project Structure

```
website/
├── frontend/           # React 18 application
├── backend/            # NestJS API server
├── shared/             # Shared TypeScript types
├── docs/              # Project documentation
├── scripts/           # Automation scripts
├── k8s/               # Kubernetes manifests
└── docker-compose.yml # Local development
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Development Setup

1. **Clone and Install**
   ```bash
   git clone <repository-url>
   cd website
   npm install
   ```

2. **Start Services**
   ```bash
   # Start PostgreSQL and Redis
   docker-compose up -d postgres redis
   
   # Install dependencies
   npm run install:all
   ```

3. **Configure Environment**
   ```bash
   # Backend environment
   cp backend/env.template backend/.env.development
   
   # Frontend environment  
   cp frontend/env.template frontend/.env.development
   ```

4. **Start Development Servers**
   ```bash
   # Start backend (http://localhost:3001)
   npm run dev:backend
   
   # Start frontend (http://localhost:3000) 
   npm run dev:frontend
   ```

### Production Deployment

Each customer gets their own deployment:

```bash
# Build production images
npm run build:prod

# Deploy to customer subdomain
kubectl apply -f k8s/customer-deployment.yaml
```

## 📖 Features

### Core Services

**Translation Management**
- Document upload and processing
- Multi-language support
- Quality assurance workflows
- Version control and revisions
- Automated cost calculation

**Interpretation Booking**
- In-person interpreter scheduling
- Phone interpretation services
- Video conference integration
- Interpreter matching algorithms
- Session recording capabilities

**User Management**
- Client and interpreter profiles
- Role-based access control
- Availability management
- Performance tracking
- Communication tools

### Business Features

**Payment Processing**
- Stripe integration
- Automated invoicing
- Usage-based billing
- Payment tracking
- Financial reporting

**Analytics & Reporting**
- Session analytics
- Revenue tracking
- User activity metrics
- Performance dashboards
- Export capabilities

## 🎨 Customization

### Per-Deployment Configuration

Each customer deployment can be customized with:

**Branding**
```env
COMPANY_NAME="Your Translation Company"
LOGO_URL="https://your-domain.com/logo.png"
PRIMARY_COLOR="#1976d2"
SECONDARY_COLOR="#dc004e"
CUSTOM_DOMAIN="translate.yourcompany.com"
```

**Features**
```env
ENABLE_TRANSLATION=true
ENABLE_IN_PERSON_INTERPRETATION=true
ENABLE_PHONE_INTERPRETATION=true
ENABLE_VIDEO_INTERPRETATION=true
ENABLE_RECORDING=false
ENABLE_ANALYTICS=true
```

**Pricing**
```env
TRANSLATION_RATE=0.25  # per word
IN_PERSON_RATE=75      # per hour
PHONE_RATE=85          # per hour
VIDEO_RATE=3.50        # per minute
CURRENCY=CAD
```

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start both frontend and backend
npm run dev:frontend     # Start React dev server
npm run dev:backend      # Start NestJS dev server

# Building
npm run build            # Build both applications
npm run build:frontend   # Build React for production
npm run build:backend    # Build NestJS for production

# Testing
npm run test             # Run all tests
npm run test:frontend    # Run React tests
npm run test:backend     # Run NestJS tests
npm run test:e2e         # Run end-to-end tests

# Code Quality
npm run lint             # Lint all code
npm run lint:fix         # Fix linting issues
npm run format           # Format code with Prettier

# Database
npm run db:migrate       # Run database migrations
npm run db:seed          # Seed database with test data
npm run db:reset         # Reset database
```

### Environment Variables

#### Backend (.env)
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lingualink
REDIS_URL=redis://localhost:6379

# Authentication
CLERK_SECRET_KEY=sk_test_...
JWT_SECRET=your-32-character-secret

# Payments
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Communications
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@lingualink.com

# Application
NODE_ENV=development
PORT=3001
API_PREFIX=api
```

#### Frontend (.env)
```env
# API Configuration
VITE_API_URL=http://localhost:3001
VITE_WS_URL=ws://localhost:3001

# Authentication
VITE_CLERK_PUBLISHABLE_KEY=pk_test_...

# Payments
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...

# Application
VITE_APP_NAME=LinguaLink
VITE_APP_VERSION=1.0.0
```

## 🧪 Testing

### Test Coverage

- **Backend**: Unit tests with Jest (target >85% coverage)
- **Frontend**: Component tests with React Testing Library
- **E2E**: Integration tests with Cypress
- **API**: Endpoint testing with Supertest

### Running Tests

```bash
# Unit tests
npm run test:unit

# Integration tests
npm run test:integration  

# End-to-end tests
npm run test:e2e

# Test coverage report
npm run test:coverage
```

## 📊 Performance

### Targets

- **API Response Time**: <150ms average
- **Page Load Time**: <2s first contentful paint
- **Database Queries**: <50ms average
- **File Upload**: Support up to 100MB
- **Concurrent Users**: 1000+ per deployment

### Monitoring

- **Health Checks**: `/api/health` endpoints
- **Metrics**: Prometheus monitoring
- **Logging**: Structured logs with Winston
- **Error Tracking**: Comprehensive error handling
- **Performance**: APM monitoring

## 🚀 Deployment

### Customer Deployment Process

1. **Infrastructure Setup**
   ```bash
   # Create customer namespace
   kubectl create namespace customer-name
   
   # Deploy database
   helm install postgres bitnami/postgresql -n customer-name
   
   # Deploy Redis
   helm install redis bitnami/redis -n customer-name
   ```

2. **Application Deployment**
   ```bash
   # Configure customer environment
   envsubst < k8s/configmap.template.yaml > k8s/customer-configmap.yaml
   
   # Deploy application
   kubectl apply -f k8s/customer-deployment.yaml -n customer-name
   ```

3. **Domain Configuration**
   ```bash
   # Setup custom domain
   kubectl apply -f k8s/customer-ingress.yaml -n customer-name
   
   # Configure SSL certificate
   kubectl apply -f k8s/customer-certificate.yaml -n customer-name
   ```

### Scaling

Each deployment can be scaled independently:

```bash
# Scale backend pods
kubectl scale deployment backend --replicas=3 -n customer-name

# Scale frontend pods  
kubectl scale deployment frontend --replicas=2 -n customer-name
```

## 📄 API Documentation

### Swagger Documentation

Interactive API documentation available at:
- **Development**: http://localhost:3001/api/docs
- **Production**: https://customer.lingualink.com/api/docs

### API Response Format

All endpoints return standardized responses:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}
```

## 🔒 Security

### Security Features

- **Authentication**: Clerk-based JWT authentication
- **Authorization**: Role-based access control
- **Data Protection**: Encryption at rest and in transit
- **Input Validation**: Comprehensive request validation
- **Rate Limiting**: API endpoint protection
- **CORS**: Configurable cross-origin policies
- **Security Headers**: Helmet.js protection

### Compliance

- **PIPEDA**: Canadian privacy law compliance
- **GDPR**: European data protection ready
- **AODA**: Ontario accessibility standards
- **SOC 2**: Security framework compliance
- **ISO 27001**: Information security management

## 💰 Pricing

### Setup Costs
- **Basic Setup**: $2,000 - $5,000
- **Custom Branding**: $1,000 - $3,000
- **Data Migration**: $1,000 - $3,000
- **Advanced Features**: $2,000 - $5,000

### Monthly Hosting
- **Starter**: $199/month (up to 100 users)
- **Professional**: $499/month (up to 500 users)  
- **Enterprise**: $999/month (unlimited users)
- **Custom**: Quote based on requirements

### Additional Services
- **Support & Maintenance**: $100-500/month
- **Feature Development**: $100-150/hour
- **Training & Onboarding**: $1,000-3,000

## 🤝 Contributing

### Development Workflow

1. Create feature branch: `git checkout -b feature/description`
2. Follow coding standards: `npm run lint`
3. Add tests: `npm run test`
4. Update documentation
5. Submit pull request

### Code Standards

- **TypeScript**: Strict mode enabled
- **ESLint**: Airbnb configuration
- **Prettier**: Automated formatting
- **Conventional Commits**: Standardized commit messages
- **Test Coverage**: Minimum 80% required

## 📞 Support

### Documentation

- **Development Guide**: `/docs/development.md`
- **Deployment Guide**: `/docs/deployment.md`
- **API Reference**: `/docs/api.md`
- **User Manual**: `/docs/user-guide.md`

### Contact

- **Email**: dev@exls.ca
- **Documentation**: [GitHub Wiki](link-to-wiki)
- **Issues**: [GitHub Issues](link-to-issues)

---

**Built with ❤️ for the translation industry**

*Empowering translation companies with dedicated, scalable platforms* 