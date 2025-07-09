# LinguaLink Backend API

> **NestJS-based backend for the LinguaLink single-tenant translation platform**

## 🏗 Architecture Overview

This is a production-ready NestJS backend API that provides:

- **Single-tenant Architecture** - Simple, dedicated deployments per customer
- **Standardized API Responses** - Consistent `ApiResponse<T>` format
- **Comprehensive Error Handling** - 50+ error codes across all modules  
- **Authentication & Authorization** - Clerk integration with JWT
- **Real-time Features** - WebSocket support for live sessions
- **Performance** - Redis caching and database optimization
- **Monitoring** - Health checks, logging, and metrics

## 📁 Project Structure

```
src/
├── main.ts                    # Application entry point
├── app.module.ts              # Root module
├── config/                    # Configuration files
│   ├── database.config.ts     # TypeORM configuration
│   ├── redis.config.ts        # Redis/Cache configuration
│   └── validation.config.ts   # Environment validation
├── common/                    # Shared utilities
│   ├── interceptors/          # Response transformation, logging
│   ├── filters/               # Global exception handling
│   ├── middleware/            # Authentication and security
│   └── common.module.ts
├── health/                    # Health check endpoints
├── auth/                      # Authentication module
├── users/                     # User management
├── requests/                  # Service request management
├── sessions/                  # Interpretation sessions
├── payments/                  # Payment processing
├── notifications/             # Email/SMS notifications
└── analytics/                 # Reporting and analytics
```

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- Redis 7+

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Setup
Copy the environment template and configure your values:
```bash
cp env.template .env.development
```

Required environment variables:
```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/lingualink_dev

# Redis
REDIS_URL=redis://localhost:6379

# Authentication
CLERK_SECRET_KEY=sk_test_...
JWT_SECRET=your-32-character-secret

# External Services
STRIPE_SECRET_KEY=sk_test_...
SENDGRID_API_KEY=SG....
```

### 3. Start Development Server
```bash
# Development mode with hot reload
npm run start:dev

# Debug mode
npm run start:debug

# Production mode
npm run start:prod
```

### 4. Access the API
- **API Server**: http://localhost:3001/api
- **Swagger Docs**: http://localhost:3001/api/docs
- **Health Check**: http://localhost:3001/api/health

## 📖 API Documentation

### Standardized Response Format

All API endpoints return responses in this format:

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

### Success Response Example
```json
{
  "success": true,
  "data": {
    "id": "123",
    "name": "John Doe"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "requestId": "req_abc123"
  }
}
```

### Error Response Example
```json
{
  "success": false,
  "error": {
    "code": "AUTH_INVALID_TOKEN",
    "message": "The provided token is invalid or expired"
  },
  "meta": {
    "timestamp": "2024-01-15T10:30:00Z",
    "version": "1.0",
    "requestId": "req_abc123"
  }
}
```

### Error Codes

The API uses standardized error codes:

| Category | Prefix | Examples |
|----------|--------|----------|
| Authentication | `AUTH_*` | `AUTH_INVALID_TOKEN`, `AUTH_INSUFFICIENT_PERMISSIONS` |
| Validation | `VAL_*` | `VAL_INVALID_INPUT`, `VAL_MISSING_REQUIRED_FIELD` |
| Requests | `REQ_*` | `REQ_NOT_FOUND`, `REQ_DUPLICATE_RESOURCE` |
| Internal | `INT_*` | `INT_DATABASE_ERROR`, `INT_EXTERNAL_SERVICE_ERROR` |
| Sessions | `SES_*` | `SES_NOT_FOUND`, `SES_INTERPRETER_NOT_AVAILABLE` |
| Files | `FILE_*` | `FILE_TOO_LARGE`, `FILE_INVALID_TYPE` |
| Payments | `PAY_*` | `PAY_PAYMENT_FAILED`, `PAY_INSUFFICIENT_FUNDS` |
| System | `SYS_*` | `SYS_RATE_LIMIT_EXCEEDED`, `SYS_SERVICE_UNAVAILABLE` |
| Business | `BIZ_*` | `BIZ_INSUFFICIENT_CREDITS`, `BIZ_FEATURE_NOT_AVAILABLE` |

## 🔧 Single-Tenant Deployment

### Deployment Model

Each customer receives their own dedicated deployment:

```
customer-company.lingualink.com
├── Frontend (React app)
├── Backend API (NestJS)
├── Database (PostgreSQL)
├── Cache (Redis)
└── File Storage (S3/equivalent)
```

### Configuration Options

**Branding Customization:**
- Company name and logo
- Primary and secondary colors
- Custom domain support
- Email template customization

**Feature Configuration:**
- Enable/disable translation services
- Enable/disable interpretation types
- Recording capabilities
- Analytics and reporting

**Pricing Configuration:**
- Translation rates per word
- Interpretation rates per hour/minute
- Currency settings
- Custom billing rules

### Environment-based Configuration
```env
# Company Branding
COMPANY_NAME="Translation Company Inc"
PRIMARY_COLOR="#1976d2"
SECONDARY_COLOR="#dc004e"
LOGO_URL="https://..."

# Feature Flags
ENABLE_TRANSLATION=true
ENABLE_IN_PERSON_INTERPRETATION=true
ENABLE_PHONE_INTERPRETATION=true
ENABLE_VIDEO_INTERPRETATION=true
ENABLE_RECORDING=false
```

## 🧪 Testing

```bash
# Unit tests
npm run test

# Integration tests  
npm run test:e2e

# Test coverage
npm run test:cov

# Watch mode
npm run test:watch
```

## 🐳 Docker Support

### Development
```bash
# Build development image
docker build -f Dockerfile.dev -t lingualink-api:dev .

# Run with Docker Compose
docker-compose up backend
```

### Production
```bash
# Build production image
docker build -t lingualink-api:latest .

# Run production container
docker run -p 3001:3001 lingualink-api:latest
```

## 📊 Monitoring & Health Checks

### Health Endpoints
- `GET /api/health` - Overall health status
- `GET /api/health/live` - Liveness probe (K8s)  
- `GET /api/health/ready` - Readiness probe (K8s)

### Logging
- Structured JSON logs with Winston
- Request/response logging with correlation IDs
- Error tracking with stack traces
- Customer deployment context

### Metrics
- Prometheus metrics endpoint: `/metrics`
- Request duration, error rates, active connections
- Custom business metrics (sessions, translations, etc.)

## 🚀 Production Deployment

### Environment Variables

Critical production settings:
```env
NODE_ENV=production
DATABASE_SSL=true
REDIS_URL=rediss://...
LOG_LEVEL=warn
ENABLE_SWAGGER=false
ENABLE_DEBUG_ROUTES=false
```

### Security Considerations
- JWT tokens with short expiration
- Rate limiting (100 req/min per IP)
- CORS configuration
- Input validation and sanitization
- Helmet.js security headers

### Performance Optimizations
- Redis caching with configurable TTL
- Database connection pooling
- Compression middleware
- Query optimization with indexes

## 🔧 Database Management

### Migrations
```bash
# Generate migration
npm run migration:generate -- -n CreateUsersTable

# Run migrations
npm run migration:run

# Revert migration
npm run migration:revert
```

### Seeding
```bash
# Run database seeds
npm run seed
```

## 🛠 Development Tools

### Code Quality
- **ESLint** - Code linting
- **Prettier** - Code formatting  
- **Husky** - Git hooks
- **TypeScript** - Strict type checking

### API Testing
- **Swagger UI** - Interactive API documentation
- **Jest** - Unit and integration testing
- **Supertest** - HTTP endpoint testing

## 📈 Performance Targets

- **API Response Time**: <150ms average
- **Database Query Time**: <50ms average  
- **File Upload**: Support up to 100MB
- **Concurrent Users**: 1000+ simultaneous connections
- **Uptime**: 99.9% availability

## 🤝 Contributing

1. Create feature branch: `git checkout -b feature/amazing-feature`
2. Follow coding standards: `npm run lint`
3. Add tests: `npm run test`
4. Submit pull request

## 📄 License

This project is licensed under the UNLICENSED License.

---

**Built with ❤️ by the ELS Development Team**

For support: dev@exls.ca 