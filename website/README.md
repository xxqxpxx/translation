# LinguaLink Platform 🌐

> **Multi-tenant translation and interpretation platform with white-label capabilities**

A comprehensive three-sided marketplace platform for Exchange Language Services Inc. (ELS) connecting clients, interpreters/translators, and administrators. Built with modern technologies and designed for scalability, security, and multi-tenancy.

## 🚀 Features

### Core Services
- **Translation Services** ($0.18-0.35 CAD/word)
- **In-Person Interpretation** ($75-125 CAD/hour)
- **Scheduled Phone Interpretation** ($75-100 CAD/hour)
- **Instant Virtual Interpretation** ($2.50-3.85 CAD/minute)

### Platform Capabilities
- ✅ **Multi-Tenant Architecture** - White-label ready
- ✅ **Real-time Communication** - WebSocket-based chat and video
- ✅ **Automated Matching** - AI-powered interpreter-client matching
- ✅ **Document Management** - Secure file upload and processing
- ✅ **Payment Processing** - Stripe integration with multiple currencies
- ✅ **Mobile Ready** - Responsive design + future React Native app
- ✅ **Compliance Ready** - PIPEDA, AODA, SOC 2, PCI DSS, ISO 27001

## 🛠 Technology Stack

### Backend
- **Framework**: NestJS with TypeScript
- **Database**: PostgreSQL with Supabase
- **Authentication**: Clerk (JWT-based)
- **Caching**: Redis
- **Real-time**: WebSockets (Socket.io)
- **Payments**: Stripe
- **Email/SMS**: SendGrid & Twilio

### Frontend
- **Framework**: React 18 with TypeScript
- **State Management**: Redux Toolkit + RTK Query
- **UI Library**: Material-UI (MUI)
- **Build Tool**: Vite
- **Testing**: Jest + Cypress

### Infrastructure
- **Containerization**: Docker + Kubernetes
- **CI/CD**: GitHub Actions
- **Monitoring**: Prometheus + Grafana
- **Logging**: Winston + ELK Stack

## 🏗 Project Structure

```
website/
├── backend/          # NestJS API server
├── frontend/         # React web application
├── shared/           # Shared TypeScript types & utilities
├── docs/            # Project documentation
├── k8s/             # Kubernetes manifests
└── scripts/         # Build and deployment scripts
```

## ⚡ Quick Start

### Prerequisites
- **Node.js** 18+ 
- **Docker** & Docker Compose
- **Git**

### 1. Clone & Setup
```bash
git clone <repository-url>
cd website

# Install all dependencies
npm run setup

# Copy environment templates
cp backend/env.template backend/.env.development
cp frontend/env.template frontend/.env.development
```

### 2. Configure Environment Variables

**Backend** (`backend/.env.development`):
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/lingualink_dev
REDIS_URL=redis://localhost:6379
CLERK_SECRET_KEY=your-clerk-secret-key
STRIPE_SECRET_KEY=your-stripe-secret-key
```

**Frontend** (`frontend/.env.development`):
```env
VITE_API_URL=http://localhost:3001
VITE_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
VITE_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

### 3. Start Development Environment
```bash
# Start all services (PostgreSQL, Redis, API, Frontend)
npm run docker:dev

# Or start individually
npm run dev:backend    # Backend on :3001
npm run dev:frontend   # Frontend on :3000
```

### 4. Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api/docs
- **Database Admin**: http://localhost:8080
- **Redis Commander**: http://localhost:8081

## 🧪 Testing

```bash
# Run all tests
npm test

# Backend tests with coverage
npm run test:backend

# Frontend tests with coverage
npm run test:frontend

# E2E tests
npm run test:e2e
```

## 🚀 Deployment

### Development
```bash
# Start development environment
npm run docker:dev
```

### Production
```bash
# Build all applications
npm run build

# Deploy to production
npm run docker:prod
```

### Kubernetes
```bash
# Deploy to Kubernetes cluster
kubectl apply -f k8s/
```

## 📖 API Documentation

The API follows a standardized response format with comprehensive error handling:

```typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}
```

### Key Endpoints
- `GET /api/v1/health` - Health check
- `POST /api/v1/auth/login` - User authentication
- `GET /api/v1/requests` - Service requests
- `POST /api/v1/sessions` - Create interpretation session
- `POST /api/v1/payments` - Process payments

## 🏢 Multi-Tenant Architecture

The platform supports white-label deployments with:

### Tenant Isolation
- **Database**: Row-Level Security (RLS) policies
- **Caching**: Tenant-aware Redis keys
- **File Storage**: Isolated storage buckets

### Customization Options
- **Branding**: Custom logos, colors, themes
- **Domain**: Custom domains (client.com)
- **Features**: Per-tenant feature flags
- **Pricing**: Configurable pricing models

### Subscription Tiers
- **Starter**: $99/month - 10 users, basic features
- **Professional**: $299/month - 50 users, advanced features
- **Enterprise**: $999/month - Unlimited users, all features

## 🔒 Security & Compliance

### Security Measures
- JWT-based authentication with Clerk
- AES-256-GCM encryption for sensitive data
- Rate limiting (100 requests/minute)
- Input validation and sanitization
- HTTPS everywhere with SSL certificates

### Compliance Standards
- **PIPEDA** - Canadian privacy legislation
- **AODA** - Ontario accessibility standards (WCAG 2.1 AA)
- **SOC 2** - Security controls framework
- **PCI DSS** - Payment card security
- **ISO 27001** - Information security management

## 📊 Performance Targets

### Backend
- API Response Time: <150ms average
- Database Query Time: <50ms average
- File Upload: Up to 100MB support
- Concurrent Users: 1000+ simultaneous

### Frontend
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Time to Interactive: <3.0s
- Bundle Size: <500KB gzipped

## 🤝 Development Workflow

### Git Strategy
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/*` - Feature development
- `hotfix/*` - Critical fixes

### Code Quality
- **TypeScript** strict mode enabled
- **ESLint** + Prettier configured
- **Test coverage** >80% required
- **Conventional commits** enforced

## 📱 Mobile Development (Future)

React Native app planned with:
- Shared business logic from `shared/` package
- Native features: push notifications, camera
- Offline support for key features
- App Store & Google Play deployment

## 🔧 Useful Commands

```bash
# Development
npm run dev                 # Start both frontend & backend
npm run build              # Build all applications
npm run test               # Run all tests
npm run lint               # Lint all code
npm run format             # Format all code

# Docker
npm run docker:dev         # Start development containers
npm run docker:prod        # Start production containers
npm run docker:down        # Stop all containers

# Database
npm run migration:generate # Generate new migration
npm run migration:run      # Run pending migrations
npm run seed              # Seed database with test data
```

## 📚 Documentation

- [Development Plan](./DEVELOPMENT_PLAN.md) - Comprehensive development roadmap
- [White-Label Architecture](./docs/white-label-architecture.md) - Multi-tenant design
- [API Documentation](./docs/backend-api.md) - Backend API specifications
- [Testing Framework](./docs/testing-framework.md) - Testing strategies
- [Production Deployment](./docs/production-deployment.md) - Deployment guides

## 🆘 Troubleshooting

### Common Issues

**Docker containers won't start:**
```bash
docker-compose down -v
docker system prune -f
npm run docker:dev
```

**Database connection issues:**
```bash
# Check if PostgreSQL is running
docker ps | grep postgres

# Reset database
docker-compose down postgres
docker volume rm website_postgres_data
npm run docker:dev
```

**Frontend build errors:**
```bash
# Clear node_modules and reinstall
rm -rf frontend/node_modules
cd frontend && npm install
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the UNLICENSED License - see the [LICENSE](LICENSE) file for details.

## 🏢 About Exchange Language Services Inc.

Exchange Language Services Inc. (ELS) is a leading provider of translation and interpretation services in Canada, committed to breaking down language barriers and fostering inclusive communication.

---

**Made with ❤️ by the ELS Development Team**

For support, email: dev@exls.ca 