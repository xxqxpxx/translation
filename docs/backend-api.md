# Backend API Documentation

## Overview

The LinguaLink backend is built with NestJS and Supabase, providing a robust API that serves both web and mobile applications. It handles authentication, real-time communication, file management, and complex business logic for translation and interpretation services.

## Architecture

### Technology Stack
- **Framework**: NestJS with TypeScript
- **Database**: Supabase (PostgreSQL) with real-time subscriptions
- **Authentication**: Clerk integration with custom JWT validation
- **File Storage**: Supabase Storage with automatic cleanup
- **Real-time**: Supabase real-time + WebSocket Gateway
- **Validation**: Class-validator and class-transformer
- **Documentation**: Swagger/OpenAPI
- **Testing**: Jest with Supertest
- **Caching**: Redis for session management

### Project Structure
```
backend/
├── src/
│   ├── modules/
│   │   ├── auth/              # Authentication & authorization
│   │   ├── users/             # User management
│   │   ├── requests/          # Service request management
│   │   ├── sessions/          # Session tracking and management
│   │   ├── notifications/     # Push notifications and messaging
│   │   ├── files/             # File upload and management
│   │   ├── analytics/         # Reporting and analytics
│   │   └── realtime/          # WebSocket gateway
│   ├── common/
│   │   ├── decorators/        # Custom decorators
│   │   ├── guards/            # Auth and role guards
│   │   ├── interceptors/      # Request/response interceptors
│   │   ├── pipes/             # Validation pipes
│   │   └── types/             # Shared type definitions
│   ├── database/
│   │   ├── migrations/        # Database migrations
│   │   └── seeds/             # Test data seeds
│   └── config/                # Configuration management
├── test/                      # E2E tests
└── docs/                     # API documentation
```

## Authentication & Authorization

### Clerk Integration
```typescript
// Authentication configuration
@Injectable()
export class AuthService {
  constructor(
    private readonly clerkService: ClerkService,
    private readonly usersService: UsersService
  ) {}

  async validateToken(token: string): Promise<User> {
    try {
      const clerkUser = await this.clerkService.verifyToken(token);
      
      // Get or create user in our database
      let user = await this.usersService.findByClerkId(clerkUser.id);
      
      if (!user) {
        user = await this.usersService.create({
          clerkId: clerkUser.id,
          email: clerkUser.emailAddresses[0]?.emailAddress,
          firstName: clerkUser.firstName,
          lastName: clerkUser.lastName,
          role: UserRole.CLIENT, // Default role
          status: UserStatus.PENDING_APPROVAL
        });
      }
      
      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
```

### Role-Based Access Control
```typescript
// Custom role guard
@Injectable()
export class RoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    return requiredRoles.some((role) => user.role === role);
  }
}

// Usage in controllers
@Roles(UserRole.ADMIN, UserRole.CLIENT)
@UseGuards(JwtAuthGuard, RoleGuard)
@Post('requests')
async createRequest(@Body() createRequestDto: CreateRequestDto) {
  return this.requestsService.create(createRequestDto);
}
```

## Core Modules

### User Management Module

#### User Entity & DTOs
```typescript
// User entity
@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  clerkId: string;

  @Column()
  email: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.CLIENT
  })
  role: UserRole;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.PENDING_APPROVAL
  })
  status: UserStatus;

  @Column({ type: 'jsonb', nullable: true })
  profile: InterpreterProfile | ClientProfile;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}

// DTOs for validation
export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  firstName: string;

  @IsString()
  @MinLength(2)
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @ValidateNested()
  profile?: InterpreterProfile | ClientProfile;
}
```

#### User Controller
```typescript
@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @ApiOperation({ summary: 'Update user profile' })
  async updateProfile(
    @CurrentUser() user: User,
    @Body() updateProfileDto: UpdateProfileDto
  ) {
    return this.usersService.updateProfile(user.id, updateProfileDto);
  }

  @Post('approval')
  @Roles(UserRole.ADMIN)
  @UseGuards(RoleGuard)
  @ApiOperation({ summary: 'Approve/reject user registration' })
  async approveUser(
    @Param('id') userId: string,
    @Body() approvalDto: UserApprovalDto
  ) {
    return this.usersService.approveUser(userId, approvalDto);
  }
}
```

### Service Request Module

#### Request Entity & Business Logic
```typescript
// Service request entity
@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  requestNumber: string;

  @Column({
    type: 'enum',
    enum: ServiceType
  })
  serviceType: ServiceType;

  @Column()
  languageFrom: string;

  @Column()
  languageTo: string;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.OPEN
  })
  status: RequestStatus;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'client_id' })
  client: User;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'interpreter_id' })
  interpreter?: User;

  @Column({ type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ type: 'integer', nullable: true })
  duration?: number; // in minutes

  @Column({ type: 'text', nullable: true })
  location?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  rate?: number;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'jsonb', nullable: true })
  documents?: DocumentFile[];

  @Column({ type: 'jsonb', nullable: true })
  preferences?: RequestPreferences;

  @OneToMany(() => Session, (session) => session.request)
  sessions: Session[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Auto-generate request number
  @BeforeInsert()
  generateRequestNumber() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = now.getFullYear();
    
    const prefix = {
      [ServiceType.TRANSLATION]: 'T',
      [ServiceType.IN_PERSON]: 'IN',
      [ServiceType.SCHEDULED_PHONE]: 'SP',
      [ServiceType.INSTANT_VIRTUAL]: 'IV'
    }[this.serviceType];
    
    // Note: Counter should be managed separately to ensure uniqueness
    this.requestNumber = `${prefix}(${counter})(${month})(${year})`;
  }
}
```

#### Request Service with Business Logic
```typescript
@Injectable()
export class RequestsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private requestsRepository: Repository<ServiceRequest>,
    private readonly notificationsService: NotificationsService,
    private readonly realtimeGateway: RealtimeGateway
  ) {}

  async create(
    createRequestDto: CreateRequestDto,
    clientId: string
  ): Promise<ServiceRequest> {
    // Validate business rules
    await this.validateRequest(createRequestDto);
    
    const request = this.requestsRepository.create({
      ...createRequestDto,
      client: { id: clientId },
      status: RequestStatus.OPEN
    });

    const savedRequest = await this.requestsRepository.save(request);

    // Send real-time notifications to available interpreters
    if (createRequestDto.serviceType === ServiceType.INSTANT_VIRTUAL) {
      await this.notifyInstantVirtualRequest(savedRequest);
    } else {
      await this.notifyAvailableInterpreters(savedRequest);
    }

    return savedRequest;
  }

  async assignInterpreter(
    requestId: string,
    interpreterId: string,
    adminId?: string
  ): Promise<ServiceRequest> {
    const request = await this.findOne(requestId);
    
    if (request.status !== RequestStatus.OPEN) {
      throw new BadRequestException('Request is not available for assignment');
    }

    // Check interpreter availability
    const interpreter = await this.validateInterpreterAvailability(
      interpreterId,
      request.scheduledAt,
      request.duration
    );

    request.interpreter = interpreter;
    request.status = RequestStatus.ASSIGNED;
    request.assignedAt = new Date();

    const updatedRequest = await this.requestsRepository.save(request);

    // Send notifications
    await this.notificationsService.sendRequestAssigned(updatedRequest);
    
    // Real-time update
    this.realtimeGateway.emitToUser(request.client.id, 'request_assigned', {
      requestId: request.id,
      interpreter: interpreter
    });

    return updatedRequest;
  }

  private async validateRequest(createRequestDto: CreateRequestDto): Promise<void> {
    // Business rule: Interpretation services only support EN/FR -> any language
    if (createRequestDto.serviceType !== ServiceType.TRANSLATION) {
      const validSourceLanguages = ['English', 'French'];
      if (!validSourceLanguages.includes(createRequestDto.languageFrom)) {
        throw new BadRequestException(
          'Interpretation services only support English or French as source language'
        );
      }
    }

    // Business rule: Minimum duration check
    if (createRequestDto.duration && createRequestDto.duration < 60) {
      throw new BadRequestException('Minimum duration is 1 hour');
    }

    // Business rule: Duration must be in 30-minute increments
    if (createRequestDto.duration && createRequestDto.duration % 30 !== 0) {
      throw new BadRequestException('Duration must be in 30-minute increments');
    }
  }
}
```

### Session Management Module

#### Session Tracking
```typescript
@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => ServiceRequest)
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @Column({ type: 'timestamp', nullable: true })
  checkInTime?: Date;

  @Column({ type: 'timestamp', nullable: true })
  checkOutTime?: Date;

  @Column({ type: 'point', nullable: true })
  checkInLocation?: Point;

  @Column({ type: 'point', nullable: true })
  checkOutLocation?: Point;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ type: 'integer' })
  calculatedDuration: number; // in minutes

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  calculatedAmount: number;

  @CreateDateColumn()
  createdAt: Date;
}

@Injectable()
export class SessionsService {
  async checkIn(
    requestId: string,
    interpreterId: string,
    location?: { latitude: number; longitude: number }
  ): Promise<Session> {
    const request = await this.validateRequestForCheckIn(requestId, interpreterId);
    
    const session = this.sessionsRepository.create({
      request: { id: requestId },
      checkInTime: new Date(),
      checkInLocation: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      } : null
    });

    // Update request status
    await this.requestsRepository.update(requestId, {
      status: RequestStatus.IN_PROGRESS
    });

    return this.sessionsRepository.save(session);
  }

  async checkOut(
    sessionId: string,
    interpreterId: string,
    location?: { latitude: number; longitude: number },
    notes?: string
  ): Promise<Session> {
    const session = await this.findSessionForInterpreter(sessionId, interpreterId);
    
    const checkOutTime = new Date();
    const duration = Math.ceil(
      (checkOutTime.getTime() - session.checkInTime.getTime()) / (1000 * 60)
    );

    // Calculate payment based on actual time
    const rate = await this.getRateForRequest(session.request.id);
    const amount = this.calculatePayment(duration, rate);

    session.checkOutTime = checkOutTime;
    session.checkOutLocation = location ? {
      type: 'Point',
      coordinates: [location.longitude, location.latitude]
    } : null;
    session.notes = notes;
    session.calculatedDuration = duration;
    session.calculatedAmount = amount;

    // Update request status
    await this.requestsRepository.update(session.request.id, {
      status: RequestStatus.COMPLETED
    });

    return this.sessionsRepository.save(session);
  }
}
```

## Real-time Communication

### WebSocket Gateway
```typescript
@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL,
    credentials: true,
  },
})
export class RealtimeGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, Socket>();

  constructor(
    private readonly authService: AuthService,
    private readonly notificationsService: NotificationsService
  ) {}

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      const user = await this.authService.validateToken(token);
      
      client.data.user = user;
      this.connectedUsers.set(user.id, client);
      
      // Join role-specific rooms
      client.join(`role:${user.role}`);
      client.join(`user:${user.id}`);
      
      // Send user online status
      this.server.emit('user_online', { userId: user.id });
      
    } catch (error) {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const user = client.data.user;
    if (user) {
      this.connectedUsers.delete(user.id);
      this.server.emit('user_offline', { userId: user.id });
    }
  }

  // Emit instant virtual request to available interpreters
  @SubscribeMessage('instant_virtual_request')
  async handleInstantVirtualRequest(
    @MessageBody() data: InstantVirtualRequestDto,
    @ConnectedSocket() client: Socket
  ) {
    const user = client.data.user;
    
    // Find available interpreters for the language pair
    const availableInterpreters = await this.findAvailableInterpreters(
      data.languageFrom,
      data.languageTo
    );

    // Emit to available interpreters
    availableInterpreters.forEach(interpreter => {
      const interpreterSocket = this.connectedUsers.get(interpreter.id);
      if (interpreterSocket) {
        interpreterSocket.emit('instant_virtual_opportunity', {
          requestId: data.requestId,
          client: user,
          languagePair: `${data.languageFrom} → ${data.languageTo}`,
          urgency: 'high'
        });
      }
    });

    // Set timeout for request expiry
    setTimeout(() => {
      client.emit('instant_virtual_timeout', { requestId: data.requestId });
    }, 30000); // 30 seconds timeout
  }

  // Handle interpreter accepting instant virtual request
  @SubscribeMessage('accept_instant_virtual')
  async handleAcceptInstantVirtual(
    @MessageBody() data: { requestId: string },
    @ConnectedSocket() client: Socket
  ) {
    const interpreter = client.data.user;
    
    // Assign interpreter to request
    const request = await this.requestsService.assignInterpreter(
      data.requestId,
      interpreter.id
    );

    // Notify client
    const clientSocket = this.connectedUsers.get(request.client.id);
    if (clientSocket) {
      clientSocket.emit('instant_virtual_matched', {
        requestId: data.requestId,
        interpreter: interpreter,
        sessionId: `session_${data.requestId}`
      });
    }

    // Notify other interpreters that request is taken
    this.server.to('role:interpreter').emit('instant_virtual_taken', {
      requestId: data.requestId
    });
  }

  // Utility method to emit to specific user
  emitToUser(userId: string, event: string, data: any) {
    const userSocket = this.connectedUsers.get(userId);
    if (userSocket) {
      userSocket.emit(event, data);
    }
  }

  // Emit to all users with specific role
  emitToRole(role: UserRole, event: string, data: any) {
    this.server.to(`role:${role}`).emit(event, data);
  }
}
```

### Supabase Real-time Integration
```typescript
@Injectable()
export class SupabaseRealtimeService {
  private supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  async setupRealtimeSubscriptions() {
    // Listen for request status changes
    this.supabase
      .channel('request_changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'service_requests'
        },
        (payload) => this.handleRequestUpdate(payload)
      )
      .subscribe();

    // Listen for new messages
    this.supabase
      .channel('messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages'
        },
        (payload) => this.handleNewMessage(payload)
      )
      .subscribe();
  }

  private async handleRequestUpdate(payload: any) {
    const request = payload.new;
    
    // Emit to relevant users via WebSocket
    this.realtimeGateway.emitToUser(request.client_id, 'request_updated', request);
    
    if (request.interpreter_id) {
      this.realtimeGateway.emitToUser(request.interpreter_id, 'request_updated', request);
    }
  }
}
```

## File Management

### File Upload Service
```typescript
@Injectable()
export class FilesService {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly configService: ConfigService
  ) {}

  async uploadFile(
    file: Express.Multer.File,
    folder: string,
    userId: string
  ): Promise<UploadResult> {
    const fileName = `${userId}/${Date.now()}-${file.originalname}`;
    const filePath = `${folder}/${fileName}`;

    const { data, error } = await this.supabase.storage
      .from('documents')
      .upload(filePath, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      throw new BadRequestException(`Upload failed: ${error.message}`);
    }

    // Get public URL
    const { data: urlData } = this.supabase.storage
      .from('documents')
      .getPublicUrl(filePath);

    // Schedule automatic deletion (2 months for translation documents)
    await this.scheduleFileDeletion(filePath, 60); // 60 days

    return {
      filePath: data.path,
      publicUrl: urlData.publicUrl,
      fileName: file.originalname,
      fileSize: file.size,
      mimeType: file.mimetype
    };
  }

  private async scheduleFileDeletion(filePath: string, daysToKeep: number) {
    const deleteAt = new Date();
    deleteAt.setDate(deleteAt.getDate() + daysToKeep);

    // Store in database for cleanup job
    await this.scheduledDeletionsRepository.save({
      filePath,
      deleteAt,
      status: 'scheduled'
    });
  }

  // Cleanup job (run daily)
  @Cron('0 2 * * *') // Run at 2 AM daily
  async cleanupExpiredFiles() {
    const expiredFiles = await this.scheduledDeletionsRepository.find({
      where: {
        deleteAt: LessThan(new Date()),
        status: 'scheduled'
      }
    });

    for (const file of expiredFiles) {
      try {
        await this.supabase.storage
          .from('documents')
          .remove([file.filePath]);

        file.status = 'deleted';
        await this.scheduledDeletionsRepository.save(file);
        
      } catch (error) {
        console.error(`Failed to delete file ${file.filePath}:`, error);
      }
    }
  }
}
```

## Analytics & Reporting

### Analytics Service
```typescript
@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(ServiceRequest)
    private requestsRepository: Repository<ServiceRequest>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>,
    @InjectRepository(User)
    private usersRepository: Repository<User>
  ) {}

  async getRequestVolumeReport(
    startDate: Date,
    endDate: Date,
    filters?: AnalyticsFilters
  ): Promise<RequestVolumeReport> {
    const query = this.requestsRepository
      .createQueryBuilder('request')
      .where('request.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });

    if (filters?.clientId) {
      query.andWhere('request.client_id = :clientId', { clientId: filters.clientId });
    }

    if (filters?.language) {
      query.andWhere(
        '(request.language_from = :language OR request.language_to = :language)',
        { language: filters.language }
      );
    }

    const requests = await query.getMany();

    return {
      totalRequests: requests.length,
      requestsByType: this.groupByServiceType(requests),
      requestsByStatus: this.groupByStatus(requests),
      requestsByLanguage: this.groupByLanguagePair(requests),
      dailyBreakdown: this.getDailyBreakdown(requests, startDate, endDate)
    };
  }

  async getInterpreterPerformanceReport(
    interpreterId: string,
    year?: number
  ): Promise<InterpreterPerformanceReport> {
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.request', 'request')
      .where('request.interpreter_id = :interpreterId', { interpreterId })
      .andWhere(year ? 'EXTRACT(YEAR FROM session.created_at) = :year' : '1=1', { year })
      .getMany();

    const totalEarnings = sessions.reduce((sum, session) => sum + session.calculatedAmount, 0);
    const totalHours = sessions.reduce((sum, session) => sum + (session.calculatedDuration / 60), 0);
    const averageRating = await this.getAverageRating(interpreterId);

    return {
      interpreterId,
      year: year || new Date().getFullYear(),
      totalSessions: sessions.length,
      totalEarnings,
      totalHours,
      averageRating,
      sessionsByMonth: this.groupSessionsByMonth(sessions),
      earningsByMonth: this.groupEarningsByMonth(sessions),
      serviceTypeBreakdown: this.getServiceTypeBreakdown(sessions)
    };
  }

  // Generate T4A tax report for interpreters
  async generateT4AReport(interpreterId: string, year: number): Promise<T4AReport> {
    const sessions = await this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.request', 'request')
      .where('request.interpreter_id = :interpreterId', { interpreterId })
      .andWhere('EXTRACT(YEAR FROM session.created_at) = :year', { year })
      .getMany();

    const interpreter = await this.usersRepository.findOne({
      where: { id: interpreterId }
    });

    const totalIncome = sessions.reduce((sum, session) => sum + session.calculatedAmount, 0);

    return {
      interpreterId,
      interpreterName: `${interpreter.firstName} ${interpreter.lastName}`,
      year,
      totalIncome,
      sessionCount: sessions.length,
      monthlyBreakdown: this.getMonthlyIncomeBreakdown(sessions),
      generatedAt: new Date()
    };
  }

  async getFinancialReports(filters: FinancialReportFilters): Promise<FinancialReport> {
    const { startDate, endDate, clientId, interpreterId, serviceType } = filters;

    const query = this.sessionsRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.request', 'request')
      .leftJoinAndSelect('request.client', 'client')
      .leftJoinAndSelect('request.interpreter', 'interpreter')
      .where('session.checkOutTime BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      });

    if (clientId) {
      query.andWhere('request.clientId = :clientId', { clientId });
    }

    if (interpreterId) {
      query.andWhere('request.interpreterId = :interpreterId', { interpreterId });
    }

    if (serviceType) {
      query.andWhere('request.serviceType = :serviceType', { serviceType });
    }

    const sessions = await query.getMany();

    return {
      totalRevenue: sessions.reduce((sum, session) => sum + (session.calculatedAmount || 0), 0),
      sessionCount: sessions.length,
      averageSessionValue: sessions.length > 0 ? 
        sessions.reduce((sum, session) => sum + (session.calculatedAmount || 0), 0) / sessions.length : 0,
      revenueByServiceType: this.groupRevenueByServiceType(sessions),
      revenueByLanguage: this.groupRevenueByLanguage(sessions),
      topClients: this.getTopClientsByRevenue(sessions),
      topInterpreters: this.getTopInterpretersByRevenue(sessions),
      monthlyTrends: this.getMonthlyRevenueTrends(sessions, startDate, endDate)
    };
  }

  async getBusinessIntelligenceMetrics(dateRange: DateRange): Promise<BusinessIntelligenceReport> {
    const { startDate, endDate } = dateRange;

    // Parallel queries for better performance
    const [
      requestMetrics,
      userMetrics,
      sessionMetrics,
      financialMetrics,
      qualityMetrics
    ] = await Promise.all([
      this.getRequestMetrics(startDate, endDate),
      this.getUserMetrics(startDate, endDate),
      this.getSessionMetrics(startDate, endDate),
      this.getFinancialMetrics(startDate, endDate),
      this.getQualityMetrics(startDate, endDate)
    ]);

    return {
      reportPeriod: { startDate, endDate },
      requestMetrics,
      userMetrics,
      sessionMetrics,
      financialMetrics,
      qualityMetrics,
      performanceIndicators: this.calculateKPIs(
        requestMetrics,
        userMetrics,
        sessionMetrics,
        financialMetrics,
        qualityMetrics
      ),
      generatedAt: new Date()
    };
  }

  private async getRequestMetrics(startDate: Date, endDate: Date): Promise<RequestMetrics> {
    const requests = await this.requestsRepository.find({
      where: {
        createdAt: Between(startDate, endDate)
      },
      relations: ['sessions']
    });

    const completedRequests = requests.filter(r => r.status === RequestStatus.COMPLETED);
    const cancelledRequests = requests.filter(r => r.status === RequestStatus.CANCELLED);
    
    const averageCompletionTime = completedRequests.length > 0 ?
      completedRequests.reduce((sum, req) => {
        const completion = req.sessions[0]?.checkOutTime || req.completedAt;
        return sum + (completion ? completion.getTime() - req.createdAt.getTime() : 0);
      }, 0) / completedRequests.length : 0;

    return {
      totalRequests: requests.length,
      completedRequests: completedRequests.length,
      cancelledRequests: cancelledRequests.length,
      averageCompletionTime: Math.round(averageCompletionTime / (1000 * 60 * 60)), // hours
      requestsByServiceType: this.groupByServiceType(requests),
      requestsByLanguagePair: this.groupByLanguagePair(requests),
      urgentRequests: requests.filter(r => r.preferences?.urgency === 'urgent').length
    };
  }

  private async getQualityMetrics(startDate: Date, endDate: Date): Promise<QualityMetrics> {
    const ratings = await this.ratingsRepository.find({
      where: {
        createdAt: Between(startDate, endDate)
      },
      relations: ['request']
    });

    const averageRating = ratings.length > 0 ?
      ratings.reduce((sum, rating) => sum + rating.overallRating, 0) / ratings.length : 0;

    const satisfactionRate = ratings.length > 0 ?
      ratings.filter(r => r.overallRating >= 4).length / ratings.length : 0;

    return {
      averageRating: Math.round(averageRating * 100) / 100,
      totalRatings: ratings.length,
      satisfactionRate: Math.round(satisfactionRate * 100) / 100,
      ratingDistribution: this.getRatingDistribution(ratings),
      wouldRecommendRate: ratings.length > 0 ?
        ratings.filter(r => r.wouldRecommend).length / ratings.length : 0
    };
  }

  async generateCustomReport(reportConfig: CustomReportConfig): Promise<CustomReport> {
    const { metrics, filters, groupBy, dateRange } = reportConfig;

    const baseQuery = this.buildBaseQuery(filters, dateRange);
    const data = await this.executeCustomQuery(baseQuery, metrics, groupBy);

    return {
      reportName: reportConfig.name,
      reportPeriod: dateRange,
      metrics: metrics,
      groupBy: groupBy,
      data: data,
      totalRecords: data.length,
      generatedAt: new Date()
    };
  }

  private calculateKPIs(
    requestMetrics: RequestMetrics,
    userMetrics: UserMetrics,
    sessionMetrics: SessionMetrics,
    financialMetrics: FinancialMetrics,
    qualityMetrics: QualityMetrics
  ): PerformanceIndicators {
    return {
      requestCompletionRate: requestMetrics.totalRequests > 0 ?
        requestMetrics.completedRequests / requestMetrics.totalRequests : 0,
      averageRevenuePerRequest: requestMetrics.totalRequests > 0 ?
        financialMetrics.totalRevenue / requestMetrics.totalRequests : 0,
      interpreterUtilizationRate: userMetrics.activeInterpreters > 0 ?
        sessionMetrics.totalSessions / userMetrics.activeInterpreters : 0,
      customerSatisfactionScore: qualityMetrics.averageRating,
      repeatCustomerRate: userMetrics.repeatClients / userMetrics.totalClients,
      averageSessionDuration: sessionMetrics.averageSessionDuration,
      emergencyResponseTime: sessionMetrics.averageResponseTime
    };
  }
}
```

## Emergency Management Module

### Emergency Escalation Service
```typescript
@Injectable()
export class EmergencyService {
  constructor(
    @InjectRepository(EmergencyEscalation)
    private emergencyRepository: Repository<EmergencyEscalation>,
    @InjectRepository(ServiceRequest)
    private requestsRepository: Repository<ServiceRequest>,
    private notificationsService: NotificationsService,
    private emailService: EmailService
  ) {}

  async createEscalation(createEscalationDto: CreateEscalationDto): Promise<EmergencyEscalation> {
    const { requestId, escalationType, severity, description, location, contactInfo } = createEscalationDto;

    // Validate request exists
    const request = await this.requestsRepository.findOne({
      where: { id: requestId },
      relations: ['client', 'interpreter']
    });

    if (!request) {
      throw new NotFoundException('Service request not found');
    }

    const escalation = this.emergencyRepository.create({
      request: { id: requestId },
      escalationType,
      severity,
      description,
      emergencyLocation: location ? {
        type: 'Point',
        coordinates: [location.longitude, location.latitude]
      } : null,
      emergencyContactPhone: contactInfo?.phone,
      emergencyContactName: contactInfo?.name
    });

    const savedEscalation = await this.emergencyRepository.save(escalation);

    // Notify administrators immediately
    await this.notifyAdministrators(savedEscalation, request);

    // Send emergency notifications
    if (severity === EmergencySeverity.CRITICAL || severity === EmergencySeverity.HIGH) {
      await this.sendEmergencyAlerts(savedEscalation, request);
    }

    return savedEscalation;
  }

  async assignEscalation(escalationId: string, adminId: string): Promise<EmergencyEscalation> {
    const escalation = await this.emergencyRepository.findOne({
      where: { id: escalationId },
      relations: ['request']
    });

    if (!escalation) {
      throw new NotFoundException('Emergency escalation not found');
    }

    if (escalation.status !== EscalationStatus.OPEN) {
      throw new BadRequestException('Escalation is not available for assignment');
    }

    escalation.assignedTo = { id: adminId } as User;
    escalation.status = EscalationStatus.IN_PROGRESS;
    escalation.responseTime = new Date().getTime() - escalation.escalatedAt.getTime();

    return this.emergencyRepository.save(escalation);
  }

  async resolveEscalation(
    escalationId: string, 
    resolutionNotes: string,
    adminId: string
  ): Promise<EmergencyEscalation> {
    const escalation = await this.emergencyRepository.findOne({
      where: { id: escalationId },
      relations: ['request', 'assignedTo']
    });

    if (!escalation) {
      throw new NotFoundException('Emergency escalation not found');
    }

    if (escalation.assignedTo?.id !== adminId) {
      throw new ForbiddenException('Only assigned administrator can resolve this escalation');
    }

    const now = new Date();
    escalation.status = EscalationStatus.RESOLVED;
    escalation.resolvedAt = now;
    escalation.resolutionNotes = resolutionNotes;
    escalation.resolutionTime = now.getTime() - escalation.escalatedAt.getTime();

    return this.emergencyRepository.save(escalation);
  }

  private async notifyAdministrators(escalation: EmergencyEscalation, request: ServiceRequest) {
    // Get all active administrators
    const admins = await this.usersRepository.find({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE }
    });

    // Send immediate notifications to all admins
    const notifications = admins.map(admin => 
      this.notificationsService.create({
        userId: admin.id,
        type: NotificationType.EMERGENCY_ESCALATION,
        title: `Emergency Escalation: ${escalation.escalationType}`,
        message: `Severity: ${escalation.severity}. Request #${request.requestNumber}`,
        requestId: request.id,
        channels: ['in_app', 'email', 'push'],
        actionData: { escalationId: escalation.id }
      })
    );

    await Promise.all(notifications);
  }

  private async sendEmergencyAlerts(escalation: EmergencyEscalation, request: ServiceRequest) {
    // For critical/high severity escalations, send additional alerts
    if (escalation.severity === EmergencySeverity.CRITICAL) {
      // Could integrate with PagerDuty, Twilio for SMS, etc.
      await this.emailService.sendEmergencyAlert({
        escalation,
        request,
        urgency: 'immediate'
      });
    }
  }
}
```

## Geolocation & Validation Module

### Location Validation Service
```typescript
@Injectable()
export class LocationValidationService {
  constructor(
    @InjectRepository(LocationValidation)
    private locationRepository: Repository<LocationValidation>,
    @InjectRepository(Session)
    private sessionsRepository: Repository<Session>
  ) {}

  async validateLocation(validateLocationDto: ValidateLocationDto): Promise<LocationValidation> {
    const { sessionId, recordedLocation, expectedLocation, accuracyRadius, source, deviceInfo } = validateLocationDto;

    // Get session details
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId },
      relations: ['request']
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const validation = this.locationRepository.create({
      session: { id: sessionId },
      request: { id: session.request.id },
      recordedLocation: {
        type: 'Point',
        coordinates: [recordedLocation.longitude, recordedLocation.latitude]
      },
      expectedLocation: expectedLocation ? {
        type: 'Point',
        coordinates: [expectedLocation.longitude, expectedLocation.latitude]
      } : null,
      accuracyRadius,
      locationSource: source,
      deviceInfo
    });

    // Calculate validation results
    await this.performLocationValidation(validation);

    return this.locationRepository.save(validation);
  }

  private async performLocationValidation(validation: LocationValidation): Promise<void> {
    if (!validation.expectedLocation) {
      // No expected location to validate against
      validation.isValid = true;
      validation.validationMethod = ValidationMethodType.AUTOMATIC;
      validation.confidenceScore = 0.5;
      return;
    }

    // Calculate distance between recorded and expected locations
    const distance = this.calculateDistance(
      validation.recordedLocation,
      validation.expectedLocation
    );

    validation.distanceVariance = distance;

    // Validation logic based on service type and accuracy requirements
    const maxAllowedDistance = this.getMaxAllowedDistance(validation.accuracyRadius || 100);
    
    validation.isValid = distance <= maxAllowedDistance;
    validation.validationMethod = ValidationMethodType.AUTOMATIC;
    
    // Calculate confidence score based on multiple factors
    validation.confidenceScore = this.calculateConfidenceScore(
      distance,
      maxAllowedDistance,
      validation.accuracyRadius,
      validation.locationSource
    );
  }

  private calculateDistance(point1: Point, point2: Point): number {
    // Haversine formula for calculating distance between two GPS coordinates
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.coordinates[1] * Math.PI) / 180;
    const φ2 = (point2.coordinates[1] * Math.PI) / 180;
    const Δφ = ((point2.coordinates[1] - point1.coordinates[1]) * Math.PI) / 180;
    const Δλ = ((point2.coordinates[0] - point1.coordinates[0]) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  private getMaxAllowedDistance(accuracyRadius: number): number {
    // Allow for GPS accuracy plus reasonable margin for in-person services
    return Math.max(accuracyRadius * 2, 50); // Minimum 50m tolerance
  }

  private calculateConfidenceScore(
    distance: number,
    maxDistance: number,
    accuracyRadius: number | null,
    source: LocationSourceType
  ): number {
    // Base confidence on distance accuracy
    let confidence = Math.max(0, 1 - (distance / maxDistance));

    // Adjust based on location source reliability
    const sourceMultipliers = {
      [LocationSourceType.GPS]: 1.0,
      [LocationSourceType.NETWORK]: 0.8,
      [LocationSourceType.WIFI]: 0.7,
      [LocationSourceType.CELLULAR]: 0.6,
      [LocationSourceType.MANUAL]: 0.5
    };

    confidence *= sourceMultipliers[source] || 0.5;

    // Adjust based on reported accuracy
    if (accuracyRadius) {
      if (accuracyRadius <= 10) confidence *= 1.1;
      else if (accuracyRadius > 100) confidence *= 0.8;
    }

    return Math.min(1.0, Math.max(0.0, confidence));
  }

  async adminOverrideValidation(
    validationId: string,
    adminId: string,
    isValid: boolean,
    notes: string
  ): Promise<LocationValidation> {
    const validation = await this.locationRepository.findOne({
      where: { id: validationId }
    });

    if (!validation) {
      throw new NotFoundException('Location validation not found');
    }

    validation.isValid = isValid;
    validation.validationMethod = ValidationMethodType.MANUAL_ADMIN;
    validation.validationNotes = notes;
    validation.confidenceScore = isValid ? 1.0 : 0.0;

    return this.locationRepository.save(validation);
  }
}
```

## Audit Trail Module

### Audit Service
```typescript
@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private auditRepository: Repository<AuditLog>
  ) {}

  async logAction(auditData: CreateAuditLogDto): Promise<AuditLog> {
    const auditLog = this.auditRepository.create({
      userId: auditData.userId,
      userRole: auditData.userRole,
      action: auditData.action,
      resourceType: auditData.resourceType,
      resourceId: auditData.resourceId,
      oldValues: auditData.oldValues,
      newValues: auditData.newValues,
      changesSummary: auditData.changesSummary,
      ipAddress: auditData.ipAddress,
      userAgent: auditData.userAgent,
      sessionId: auditData.sessionId,
      requestId: auditData.requestId,
      success: auditData.success,
      errorMessage: auditData.errorMessage,
      executionTimeMs: auditData.executionTimeMs
    });

    return this.auditRepository.save(auditLog);
  }

  async getAuditTrail(filters: AuditTrailFilters): Promise<AuditLog[]> {
    const query = this.auditRepository.createQueryBuilder('audit');

    if (filters.userId) {
      query.andWhere('audit.userId = :userId', { userId: filters.userId });
    }

    if (filters.action) {
      query.andWhere('audit.action = :action', { action: filters.action });
    }

    if (filters.resourceType) {
      query.andWhere('audit.resourceType = :resourceType', { resourceType: filters.resourceType });
    }

    if (filters.startDate) {
      query.andWhere('audit.createdAt >= :startDate', { startDate: filters.startDate });
    }

    if (filters.endDate) {
      query.andWhere('audit.createdAt <= :endDate', { endDate: filters.endDate });
    }

    return query
      .orderBy('audit.createdAt', 'DESC')
      .limit(filters.limit || 100)
      .offset(filters.offset || 0)
      .getMany();
  }

  async exportAuditData(filters: AuditTrailFilters): Promise<Buffer> {
    const auditLogs = await this.getAuditTrail({ ...filters, limit: 10000 });
    
    // Convert to CSV format for export
    const csv = this.convertToCSV(auditLogs);
    return Buffer.from(csv, 'utf-8');
  }

  private convertToCSV(auditLogs: AuditLog[]): string {
    const headers = [
      'Timestamp', 'User ID', 'User Role', 'Action', 'Resource Type', 
      'Resource ID', 'Success', 'IP Address', 'Changes Summary'
    ].join(',');

    const rows = auditLogs.map(log => [
      log.createdAt.toISOString(),
      log.userId || '',
      log.userRole || '',
      log.action,
      log.resourceType,
      log.resourceId || '',
      log.success.toString(),
      log.ipAddress || '',
      `"${log.changesSummary || ''}"`
    ].join(','));

    return [headers, ...rows].join('\n');
  }
}
```

## Calendar Integration Module

### Calendar Sync Service
```typescript
@Injectable()
export class CalendarIntegrationService {
  constructor(
    @InjectRepository(CalendarIntegration)
    private calendarRepository: Repository<CalendarIntegration>,
    @InjectRepository(CalendarConflict)
    private conflictRepository: Repository<CalendarConflict>,
    private googleCalendarService: GoogleCalendarService,
    private outlookCalendarService: OutlookCalendarService
  ) {}

  async connectCalendar(connectCalendarDto: ConnectCalendarDto): Promise<CalendarIntegration> {
    const { userId, provider, accessToken, refreshToken, externalCalendarId } = connectCalendarDto;

    // Encrypt tokens before storing
    const encryptedAccessToken = await this.encryptToken(accessToken);
    const encryptedRefreshToken = refreshToken ? await this.encryptToken(refreshToken) : null;

    const integration = this.calendarRepository.create({
      userId,
      provider,
      externalCalendarId,
      accessTokenEncrypted: encryptedAccessToken,
      refreshTokenEncrypted: encryptedRefreshToken,
      tokenExpiresAt: new Date(Date.now() + 3600000), // 1 hour from now
      syncEnabled: true,
      conflictDetectionEnabled: true
    });

    const savedIntegration = await this.calendarRepository.save(integration);

    // Trigger initial synchronization
    await this.syncCalendar(savedIntegration.id);

    return savedIntegration;
  }

  async syncCalendar(integrationId: string): Promise<CalendarSyncResult> {
    const integration = await this.calendarRepository.findOne({
      where: { id: integrationId },
      relations: ['user']
    });

    if (!integration || !integration.syncEnabled) {
      throw new BadRequestException('Calendar integration not found or disabled');
    }

    try {
      const calendarService = this.getCalendarService(integration.provider);
      const accessToken = await this.decryptToken(integration.accessTokenEncrypted);

      // Get events from external calendar
      const externalEvents = await calendarService.getEvents(
        accessToken,
        integration.externalCalendarId,
        {
          timeMin: new Date(),
          timeMax: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
        }
      );

      // Detect conflicts with existing service requests
      const conflicts = await this.detectConflicts(integration.userId, externalEvents);

      // Update sync status
      integration.lastSyncAt = new Date();
      integration.syncStatus = CalendarSyncStatus.ACTIVE;
      integration.syncErrorsCount = 0;
      await this.calendarRepository.save(integration);

      return {
        success: true,
        eventsProcessed: externalEvents.length,
        conflictsDetected: conflicts.length,
        conflicts
      };

    } catch (error) {
      // Handle sync errors
      integration.syncErrorsCount += 1;
      integration.lastErrorMessage = error.message;
      
      if (integration.syncErrorsCount >= 5) {
        integration.syncStatus = CalendarSyncStatus.ERROR;
      }

      await this.calendarRepository.save(integration);
      throw error;
    }
  }

  private async detectConflicts(
    userId: string, 
    externalEvents: ExternalCalendarEvent[]
  ): Promise<CalendarConflict[]> {
    // Get user's service requests in the same timeframe
    const userRequests = await this.requestsRepository.find({
      where: {
        interpreter: { id: userId },
        status: In([RequestStatus.ASSIGNED, RequestStatus.IN_PROGRESS]),
        scheduledAt: Between(
          new Date(),
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        )
      }
    });

    const conflicts: CalendarConflict[] = [];

    for (const event of externalEvents) {
      for (const request of userRequests) {
        if (this.hasTimeOverlap(event, request)) {
          const conflict = await this.createConflict(userId, event, request);
          conflicts.push(conflict);
        }
      }
    }

    return conflicts;
  }

  private hasTimeOverlap(
    event: ExternalCalendarEvent,
    request: ServiceRequest
  ): boolean {
    const eventStart = new Date(event.start);
    const eventEnd = new Date(event.end);
    const requestStart = request.scheduledAt!;
    const requestEnd = new Date(requestStart.getTime() + (request.duration || 60) * 60000);

    return eventStart < requestEnd && eventEnd > requestStart;
  }

  async resolveConflict(
    conflictId: string,
    resolution: ConflictResolutionDto
  ): Promise<CalendarConflict> {
    const conflict = await this.conflictRepository.findOne({
      where: { id: conflictId },
      relations: ['request']
    });

    if (!conflict) {
      throw new NotFoundException('Calendar conflict not found');
    }

    conflict.status = ConflictResolutionStatus.RESOLVED;
    conflict.resolutionAction = resolution.action;
    conflict.resolvedBy = { id: resolution.resolvedBy } as User;
    conflict.resolvedAt = new Date();
    conflict.resolutionNotes = resolution.notes;

    // Execute the resolution action
    await this.executeResolutionAction(conflict, resolution);

    return this.conflictRepository.save(conflict);
  }
}
```

## Advanced Notification Service

### Notification Preferences Service
```typescript
@Injectable()
export class NotificationPreferencesService {
  constructor(
    @InjectRepository(NotificationPreferences)
    private preferencesRepository: Repository<NotificationPreferences>,
    @InjectRepository(Notification)
    private notificationRepository: Repository<Notification>,
    private emailService: EmailService,
    private smsService: SmsService,
    private pushService: PushNotificationService
  ) {}

  async getPreferences(userId: string): Promise<NotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId }
    });

    if (!preferences) {
      // Create default preferences
      preferences = await this.createDefaultPreferences(userId);
    }

    return preferences;
  }

  async updatePreferences(
    userId: string,
    updateDto: UpdateNotificationPreferencesDto
  ): Promise<NotificationPreferences> {
    let preferences = await this.preferencesRepository.findOne({
      where: { userId }
    });

    if (!preferences) {
      preferences = this.preferencesRepository.create({ userId, ...updateDto });
    } else {
      Object.assign(preferences, updateDto);
    }

    return this.preferencesRepository.save(preferences);
  }

  async sendTemplateNotification(templateNotificationDto: TemplateNotificationDto): Promise<void> {
    const { userId, templateId, templateData, channels, scheduledFor } = templateNotificationDto;

    // Get user preferences
    const preferences = await this.getPreferences(userId);

    // Filter channels based on user preferences
    const enabledChannels = this.filterEnabledChannels(channels, preferences);

    if (enabledChannels.length === 0) {
      return; // User has disabled all requested channels
    }

    // Create notification record
    const notification = this.notificationRepository.create({
      userId,
      type: NotificationType.SYSTEM_ANNOUNCEMENT,
      title: templateData.title,
      message: templateData.message,
      channels: enabledChannels,
      scheduledFor: scheduledFor || new Date(),
      actionData: templateData.actionData
    });

    await this.notificationRepository.save(notification);

    // Send via enabled channels
    if (scheduledFor && scheduledFor > new Date()) {
      // Schedule for later delivery
      await this.scheduleNotification(notification);
    } else {
      // Send immediately
      await this.deliverNotification(notification, preferences);
    }
  }

  private async deliverNotification(
    notification: Notification,
    preferences: NotificationPreferences
  ): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];

    for (const channel of notification.channels) {
      switch (channel) {
        case NotificationChannel.EMAIL:
          if (preferences.emailEnabled && preferences.emailAddress) {
            deliveryPromises.push(
              this.emailService.sendNotification(preferences.emailAddress, notification)
            );
          }
          break;

        case NotificationChannel.SMS:
          if (preferences.smsEnabled && preferences.phoneNumber && preferences.phoneVerified) {
            deliveryPromises.push(
              this.smsService.sendNotification(preferences.phoneNumber, notification)
            );
          }
          break;

        case NotificationChannel.PUSH:
          if (preferences.pushEnabled) {
            deliveryPromises.push(
              this.pushService.sendNotification(preferences.userId, notification)
            );
          }
          break;

        case NotificationChannel.IN_APP:
          // In-app notifications are stored in database and delivered via real-time subscriptions
          break;
      }
    }

    try {
      await Promise.allSettled(deliveryPromises);
      
      // Update delivery status
      notification.deliveredAt = new Date();
      await this.notificationRepository.save(notification);

    } catch (error) {
      console.error('Failed to deliver notification:', error);
    }
  }

  async getDeliveryStatistics(userId: string, dateRange: DateRange): Promise<DeliveryStatistics> {
    const { startDate, endDate } = dateRange;

    const stats = await this.notificationRepository
      .createQueryBuilder('notification')
      .select([
        'COUNT(*) as total_sent',
        'COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) as delivered',
        'COUNT(CASE WHEN read_at IS NOT NULL THEN 1 END) as read',
        'AVG(EXTRACT(EPOCH FROM (delivered_at - created_at))) as avg_delivery_time'
      ])
      .where('notification.userId = :userId', { userId })
      .andWhere('notification.createdAt BETWEEN :startDate AND :endDate', {
        startDate,
        endDate
      })
      .getRawOne();

    return {
      totalSent: parseInt(stats.total_sent),
      delivered: parseInt(stats.delivered),
      read: parseInt(stats.read),
      deliveryRate: stats.total_sent > 0 ? stats.delivered / stats.total_sent : 0,
      readRate: stats.delivered > 0 ? stats.read / stats.delivered : 0,
      averageDeliveryTime: parseFloat(stats.avg_delivery_time) || 0
    };
  }

  async verifyContactMethod(
    userId: string,
    method: ContactMethod,
    verificationCode: string
  ): Promise<boolean> {
    // Implementation for email/phone verification
    const isValid = await this.validateVerificationCode(userId, method, verificationCode);
    
    if (isValid) {
      const preferences = await this.getPreferences(userId);
      
      if (method === ContactMethod.EMAIL) {
        preferences.emailVerified = true;
      } else if (method === ContactMethod.PHONE) {
        preferences.phoneVerified = true;
      }

      await this.preferencesRepository.save(preferences);
    }

    return isValid;
  }
}
```

## Integration Monitoring Service

### Service Health Monitoring
```typescript
@Injectable()
export class IntegrationMonitoringService {
  constructor(
    @InjectRepository(IntegrationMonitoring)
    private monitoringRepository: Repository<IntegrationMonitoring>
  ) {}

  async checkServiceHealth(serviceName: string): Promise<ServiceHealthStatus> {
    const integration = await this.monitoringRepository.findOne({
      where: { serviceName }
    });

    if (!integration) {
      throw new NotFoundException(`Service ${serviceName} not found in monitoring`);
    }

    try {
      const startTime = Date.now();
      const response = await this.performHealthCheck(integration);
      const responseTime = Date.now() - startTime;

      // Update monitoring record
      integration.status = IntegrationStatus.HEALTHY;
      integration.responseTimeMs = responseTime;
      integration.lastCheckAt = new Date();
      integration.lastSuccessAt = new Date();
      integration.consecutiveFailures = 0;

      await this.monitoringRepository.save(integration);

      return {
        serviceName,
        status: IntegrationStatus.HEALTHY,
        responseTime,
        lastCheck: integration.lastCheckAt
      };

    } catch (error) {
      return this.handleHealthCheckFailure(integration, error);
    }
  }

  async getAllServiceStatuses(): Promise<ServiceHealthStatus[]> {
    const integrations = await this.monitoringRepository.find({
      where: { environment: process.env.NODE_ENV }
    });

    const healthChecks = integrations.map(integration =>
      this.checkServiceHealth(integration.serviceName)
    );

    return Promise.allSettled(healthChecks).then(results =>
      results.map((result, index) => ({
        serviceName: integrations[index].serviceName,
        status: result.status === 'fulfilled' ? 
          result.value.status : IntegrationStatus.UNHEALTHY,
        responseTime: result.status === 'fulfilled' ? 
          result.value.responseTime : null,
        lastCheck: new Date(),
        error: result.status === 'rejected' ? result.reason.message : null
      }))
    );
  }

  private async performHealthCheck(integration: IntegrationMonitoring): Promise<any> {
    const timeout = integration.timeoutSeconds * 1000;
    
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new Error('Health check timeout'));
      }, timeout);

      // Perform actual health check based on service type
      this.executeServiceSpecificHealthCheck(integration)
        .then(result => {
          clearTimeout(timeoutId);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }

  private async handleHealthCheckFailure(
    integration: IntegrationMonitoring,
    error: Error
  ): Promise<ServiceHealthStatus> {
    integration.status = IntegrationStatus.UNHEALTHY;
    integration.lastCheckAt = new Date();
    integration.lastFailureAt = new Date();
    integration.consecutiveFailures += 1;
    integration.lastErrorMessage = error.message;

    // Update 24-hour failure count
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (integration.lastFailureAt > twentyFourHoursAgo) {
      integration.totalFailures24h += 1;
    }

    // Calculate failure rate
    const totalChecks = await this.getTotalChecksLast24Hours(integration.serviceName);
    integration.failureRatePercent = totalChecks > 0 ? 
      (integration.totalFailures24h / totalChecks) * 100 : 0;

    await this.monitoringRepository.save(integration);

    // Trigger alerts if needed
    if (integration.consecutiveFailures >= integration.maxFailuresBeforeAlert) {
      await this.triggerServiceAlert(integration);
    }

    return {
      serviceName: integration.serviceName,
      status: IntegrationStatus.UNHEALTHY,
      responseTime: null,
      lastCheck: integration.lastCheckAt,
      error: error.message
    };
  }
}
```

## API Documentation

### Swagger Configuration
```typescript
// Swagger setup in main.ts
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  const config = new DocumentBuilder()
    .setTitle('LinguaLink API')
    .setDescription('Comprehensive translation and interpretation platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management')
    .addTag('requests', 'Service requests')
    .addTag('sessions', 'Session management')
    .addTag('files', 'File upload and management')
    .addTag('analytics', 'Analytics and reporting')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(3000);
}
```

### API Endpoints Overview

#### Authentication Endpoints
```
POST /auth/login              # Clerk token validation
POST /auth/refresh            # Refresh access token  
POST /auth/logout             # Logout user
GET  /auth/profile            # Get current user profile
```

#### User Management Endpoints
```
GET    /users                 # List users (admin only)
GET    /users/:id             # Get user by ID
POST   /users                 # Create new user
PATCH  /users/:id             # Update user
DELETE /users/:id             # Deactivate user (admin only)
POST   /users/:id/approve     # Approve user registration (admin only)
```

#### Service Request Endpoints
```
GET    /requests              # List requests (with filters)
GET    /requests/:id          # Get request details
POST   /requests              # Create new request
PATCH  /requests/:id          # Update request
DELETE /requests/:id          # Cancel request
POST   /requests/:id/assign   # Assign interpreter (admin/auto)
POST   /requests/:id/accept   # Accept request (interpreter)
POST   /requests/:id/decline  # Decline request (interpreter)
```

#### Session Management Endpoints
```
GET    /sessions              # List sessions
GET    /sessions/:id          # Get session details
POST   /sessions/check-in     # Check in to session
POST   /sessions/check-out    # Check out of session
PATCH  /sessions/:id          # Update session notes
```

#### File Management Endpoints
```
POST   /files/upload          # Upload document
GET    /files/:id             # Download file
DELETE /files/:id             # Delete file
GET    /files/:id/info        # Get file metadata
```

#### Analytics Endpoints
```
GET    /analytics/requests    # Request volume reports
GET    /analytics/interpreters # Interpreter performance
GET    /analytics/t4a/:id     # Generate T4A report
GET    /analytics/dashboard   # Admin dashboard metrics
```

#### Emergency Management Endpoints
```
POST   /emergency/escalate    # Create emergency escalation
GET    /emergency             # List emergency escalations (admin)
GET    /emergency/:id         # Get escalation details
PATCH  /emergency/:id         # Update escalation status
POST   /emergency/:id/assign  # Assign escalation to admin
POST   /emergency/:id/resolve # Mark escalation as resolved
```

#### Geolocation & Validation Endpoints
```
POST   /location/validate     # Validate check-in/check-out location
GET    /location/history/:id  # Get location history for session
POST   /location/override     # Admin location validation override
GET    /location/accuracy     # Get location accuracy statistics
```

#### System Health & Monitoring Endpoints
```
GET    /health                # System health check
GET    /health/metrics        # Detailed health metrics
GET    /health/alerts         # Active system alerts
POST   /health/metrics        # Record custom metric
```

#### Audit & Compliance Endpoints
```
GET    /audit/logs            # Get audit trail (admin only)
GET    /audit/user/:id        # Get user activity logs
GET    /audit/export          # Export audit data
POST   /audit/log             # Create audit log entry
```

#### Calendar Integration Endpoints
```
GET    /calendar/integrations # Get user's calendar integrations
POST   /calendar/connect      # Connect external calendar
DELETE /calendar/:id          # Disconnect calendar integration
POST   /calendar/sync         # Trigger manual synchronization
GET    /calendar/conflicts    # Get detected conflicts
POST   /calendar/resolve      # Resolve scheduling conflict
```

#### Integration Monitoring Endpoints
```
GET    /integrations/status   # Get all integration statuses
GET    /integrations/health   # Health check for external services
POST   /integrations/test     # Test specific integration
GET    /integrations/metrics  # Get integration performance metrics
```

#### Advanced Notification Endpoints
```
GET    /notifications/preferences # Get user notification preferences
PUT    /notifications/preferences # Update notification preferences
POST   /notifications/template    # Send template-based notification
GET    /notifications/delivery    # Get delivery tracking statistics
POST   /notifications/verify      # Verify email/phone for notifications
GET    /notifications/digest      # Get notification digest
```

## Deployment & Infrastructure

### Environment Configuration
```typescript
// Configuration validation
export class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  SUPABASE_URL: string;

  @IsString()
  SUPABASE_ANON_KEY: string;

  @IsString()
  SUPABASE_SERVICE_KEY: string;

  @IsString()
  CLERK_SECRET_KEY: string;

  @IsString()
  REDIS_URL: string;

  @IsOptional()
  @IsNumber()
  PORT: number = 3000;

  @IsEnum(['development', 'staging', 'production'])
  NODE_ENV: 'development' | 'staging' | 'production';
}
```

### Docker Configuration
```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist

EXPOSE 3000

CMD ["node", "dist/main"]
```

### Health Check Endpoints
```typescript
@Controller('health')
export class HealthController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly redisService: RedisService
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      () => this.supabaseService.pingCheck('supabase'),
      () => this.redisService.pingCheck('redis'),
    ]);
  }
}
``` 