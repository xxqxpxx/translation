# Testing Framework - LinguaLink Platform
## Comprehensive Testing Strategy Implementation

### Overview
This document provides complete testing infrastructure to achieve >80% code coverage and ensure production readiness.

## 1. Unit Testing Framework

### Jest Configuration
```typescript
// jest.config.js
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: { '^.+\\.(t|j)s$': 'ts-jest' },
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.spec.ts',
    '!**/*.interface.ts',
    '!**/dto/*.ts',
    '!main.ts',
  ],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

### Service Unit Tests
```typescript
// src/modules/requests/requests.service.spec.ts
describe('RequestsService', () => {
  let service: RequestsService;
  let mockRepository: jest.Mocked<Repository<ServiceRequest>>;
  let mockNotificationService: jest.Mocked<NotificationsService>;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: getRepositoryToken(ServiceRequest),
          useValue: createMockRepository(),
        },
        {
          provide: NotificationsService,
          useValue: createMockNotificationService(),
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    mockRepository = module.get(getRepositoryToken(ServiceRequest));
    mockNotificationService = module.get(NotificationsService);
  });

  describe('create', () => {
    it('should create translation request successfully', async () => {
      const createDto: CreateRequestDto = {
        serviceType: ServiceType.TRANSLATION,
        languageFrom: 'English',
        languageTo: 'French',
        notes: 'Test translation',
      };

      const expectedRequest = {
        id: 'uuid',
        requestNumber: 'T(001)(01)(2024)',
        ...createDto,
        status: RequestStatus.OPEN,
      };

      mockRepository.create.mockReturnValue(expectedRequest as any);
      mockRepository.save.mockResolvedValue(expectedRequest as any);

      const result = await service.create(createDto, 'client-id');

      expect(result.serviceType).toBe(ServiceType.TRANSLATION);
      expect(result.status).toBe(RequestStatus.OPEN);
      expect(mockRepository.save).toHaveBeenCalled();
    });

    it('should validate business rules for interpretation services', async () => {
      const createDto: CreateRequestDto = {
        serviceType: ServiceType.IN_PERSON,
        languageFrom: 'Spanish', // Invalid source language
        languageTo: 'French',
      };

      await expect(
        service.create(createDto, 'client-id')
      ).rejects.toThrow(BusinessException);
    });

    it('should enforce minimum duration for interpretation', async () => {
      const createDto: CreateRequestDto = {
        serviceType: ServiceType.IN_PERSON,
        languageFrom: 'English',
        languageTo: 'French',
        duration: 30, // Below minimum
      };

      await expect(
        service.create(createDto, 'client-id')
      ).rejects.toThrow('Minimum duration is 1 hour');
    });
  });

  describe('assignInterpreter', () => {
    it('should assign available interpreter successfully', async () => {
      const request = createMockRequest();
      const interpreter = createMockInterpreter();

      mockRepository.findOne.mockResolvedValue(request);
      jest.spyOn(service, 'validateInterpreterAvailability')
        .mockResolvedValue(interpreter);

      const result = await service.assignInterpreter(
        request.id, 
        interpreter.id
      );

      expect(result.interpreter).toBe(interpreter);
      expect(result.status).toBe(RequestStatus.ASSIGNED);
      expect(mockNotificationService.sendRequestAssigned).toHaveBeenCalled();
    });
  });
});
```

## 2. Integration Testing

### API Integration Tests
```typescript
// test/requests.e2e-spec.ts
describe('RequestsController (e2e)', () => {
  let app: INestApplication;
  let authToken: string;

  beforeEach(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    // Get auth token for testing
    authToken = await getTestAuthToken();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/requests (POST)', () => {
    it('should create new translation request', () => {
      return request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceType: 'translation',
          languageFrom: 'English',
          languageTo: 'French',
          notes: 'Test document',
        })
        .expect(201)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data.requestNumber).toBeDefined();
          expect(res.body.data.serviceType).toBe('translation');
        });
    });

    it('should return validation error for invalid data', () => {
      return request(app.getHttpServer())
        .post('/requests')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          serviceType: 'invalid_type',
          languageFrom: '', // Required field
        })
        .expect(400)
        .expect(res => {
          expect(res.body.success).toBe(false);
          expect(res.body.error.code).toBe('VAL_001');
        });
    });
  });

  describe('/requests (GET)', () => {
    it('should return paginated requests', () => {
      return request(app.getHttpServer())
        .get('/requests?page=1&limit=10')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200)
        .expect(res => {
          expect(res.body.success).toBe(true);
          expect(res.body.data).toBeInstanceOf(Array);
          expect(res.body.meta.pagination).toBeDefined();
        });
    });
  });
});
```

## 3. Mock Factory Functions

### Repository Mocks
```typescript
// test/helpers/mock-factories.ts
export function createMockRepository<T = any>(): jest.Mocked<Repository<T>> {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    createQueryBuilder: jest.fn(() => ({
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
      getOne: jest.fn(),
      getManyAndCount: jest.fn(),
    })),
  } as any;
}

export function createMockRequest(): ServiceRequest {
  return {
    id: 'test-request-id',
    requestNumber: 'T(001)(01)(2024)',
    serviceType: ServiceType.TRANSLATION,
    languageFrom: 'English',
    languageTo: 'French',
    status: RequestStatus.OPEN,
    clientId: 'client-id',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as ServiceRequest;
}

export function createMockUser(role: UserRole = UserRole.CLIENT): User {
  return {
    id: 'test-user-id',
    clerkId: 'clerk-id',
    email: 'test@example.com',
    firstName: 'Test',
    lastName: 'User',
    role,
    status: UserStatus.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as User;
}
```

## 4. Performance Testing

### Load Testing with Artillery
```yaml
# artillery.yml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Load test"
    - duration: 60
      arrivalRate: 100
      name: "Stress test"

scenarios:
  - name: "API Load Test"
    weight: 100
    flow:
      - get:
          url: "/health"
      - post:
          url: "/auth/login"
          json:
            email: "test@example.com"
            password: "testpass"
          capture:
            - json: "$.data.token"
              as: "token"
      - get:
          url: "/requests"
          headers:
            Authorization: "Bearer {{ token }}"
```

## 5. Test Coverage Reports

### Coverage Script
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:cov": "jest --coverage",
    "test:e2e": "jest --config ./test/jest-e2e.json",
    "test:debug": "node --inspect-brk -r tsconfig-paths/register -r ts-node/register node_modules/.bin/jest --runInBand"
  }
}
```

### CI/CD Pipeline Integration
```yaml
# .github/workflows/test.yml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:cov
      
      - name: Run integration tests
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v1
        with:
          file: ./coverage/lcov.info
```

## 6. Testing Checklist

### Unit Tests (70% of total tests)
- [x] Service layer business logic
- [x] Controller request/response handling
- [x] Validation pipe functionality
- [x] Guard authentication/authorization
- [x] Interceptor transformations
- [x] Utility functions and helpers

### Integration Tests (20% of total tests)
- [x] API endpoint functionality
- [x] Database operations
- [x] Authentication flows
- [x] File upload/download
- [x] Real-time features
- [x] External service integrations

### End-to-End Tests (10% of total tests)
- [ ] Complete user workflows
- [ ] Cross-platform compatibility
- [ ] Performance under load
- [ ] Security penetration testing

### Coverage Targets
- **Functions**: 80% minimum
- **Lines**: 80% minimum
- **Branches**: 80% minimum
- **Statements**: 80% minimum

This testing framework ensures comprehensive quality assurance with automated validation, performance monitoring, and continuous integration support. 