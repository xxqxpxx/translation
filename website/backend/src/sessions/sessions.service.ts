import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, MoreThan, LessThan } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InterpreterSession, InterpreterSessionStatus, CancellationReason, SessionLocation, SessionRequirements, SessionRating } from './entities/interpreter-session.entity';
import { Interpreter, SessionType, InterpreterSpecialization } from '../interpreters/entities/interpreter.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { InterpretersService } from '../interpreters/interpreters.service';

export interface CreateSessionDto {
  clientId: string;
  interpreterId?: string; // Optional - can be auto-assigned
  sessionType: SessionType;
  specialization: InterpreterSpecialization;
  sourceLanguage: string;
  targetLanguage: string;
  scheduledStartTime: Date;
  estimatedDuration: number; // in minutes
  location: SessionLocation;
  requirements?: SessionRequirements;
  hourlyRate?: number; // If not provided, will use interpreter's rate
  additionalFees?: number;
  recordingPermitted?: boolean;
  participants?: any[];
}

export interface UpdateSessionDto {
  scheduledStartTime?: Date;
  scheduledEndTime?: Date;
  estimatedDuration?: number;
  location?: SessionLocation;
  requirements?: SessionRequirements;
  hourlyRate?: number;
  additionalFees?: number;
  sessionNotes?: string;
  followUpNotes?: string;
  followUpDate?: Date;
}

export interface SessionFilterDto {
  clientId?: string;
  interpreterId?: string;
  status?: InterpreterSessionStatus[];
  sessionType?: SessionType;
  specialization?: InterpreterSpecialization;
  dateFrom?: Date;
  dateTo?: Date;
  language?: string;
  isPaid?: boolean;
  needsRating?: boolean;
  page?: number;
  limit?: number;
}

export interface RescheduleSessionDto {
  newStartTime: Date;
  newDuration?: number;
  reason: string;
}

export interface CancelSessionDto {
  reason: string;
  category: CancellationReason;
  refundAmount?: number;
}

@Injectable()
export class SessionsService {
  constructor(
    @InjectRepository(InterpreterSession)
    private sessionRepository: Repository<InterpreterSession>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private interpretersService: InterpretersService,
    private eventEmitter: EventEmitter2,
  ) {}

  async createSession(createSessionDto: CreateSessionDto): Promise<InterpreterSession> {
    // Validate client exists
    const client = await this.userRepository.findOne({
      where: { id: createSessionDto.clientId }
    });

    if (!client || client.role !== UserRole.CLIENT) {
      throw new NotFoundException('Client not found or invalid role');
    }

    // Calculate end time
    const scheduledEndTime = new Date(createSessionDto.scheduledStartTime);
    scheduledEndTime.setMinutes(scheduledEndTime.getMinutes() + createSessionDto.estimatedDuration);

    // Validate session time is in the future
    if (createSessionDto.scheduledStartTime <= new Date()) {
      throw new BadRequestException('Session must be scheduled for a future time');
    }

    let interpreter: Interpreter;
    let hourlyRate = createSessionDto.hourlyRate;

    if (createSessionDto.interpreterId) {
      // Specific interpreter requested
      interpreter = await this.interpretersService.findOne(createSessionDto.interpreterId);
      
      // Check interpreter availability
      if (!interpreter.isAvailableForSession(createSessionDto.sessionType, createSessionDto.scheduledStartTime)) {
        throw new BadRequestException('Interpreter is not available at the requested time');
      }

      // Check for conflicting sessions
      const conflictingSession = await this.checkConflictingSessions(
        createSessionDto.interpreterId,
        createSessionDto.scheduledStartTime,
        scheduledEndTime
      );

      if (conflictingSession) {
        throw new BadRequestException('Interpreter has a conflicting session at this time');
      }

      // Use interpreter's rate if not specified
      if (!hourlyRate) {
        hourlyRate = interpreter.getRateForSession(
          createSessionDto.sessionType,
          createSessionDto.specialization
        );
      }
    } else {
      // Auto-assign interpreter
      const matchingInterpreters = await this.interpretersService.findMatchingInterpreters({
        sourceLanguage: createSessionDto.sourceLanguage,
        targetLanguage: createSessionDto.targetLanguage,
        sessionType: createSessionDto.sessionType,
        specialization: createSessionDto.specialization,
        scheduledDate: createSessionDto.scheduledStartTime,
        duration: createSessionDto.estimatedDuration,
      });

      if (matchingInterpreters.length === 0) {
        throw new NotFoundException('No available interpreters found for the requested criteria');
      }

      // Select the best matching interpreter (first one since they're ordered by ranking)
      interpreter = matchingInterpreters[0];
      
      if (!hourlyRate) {
        hourlyRate = interpreter.getRateForSession(
          createSessionDto.sessionType,
          createSessionDto.specialization
        );
      }
    }

    // Calculate total cost
    const totalCost = this.calculateSessionCost(
      createSessionDto.estimatedDuration,
      hourlyRate,
      createSessionDto.additionalFees || 0
    );

    const session = this.sessionRepository.create({
      ...createSessionDto,
      interpreterId: interpreter.id,
      scheduledEndTime,
      hourlyRate,
      totalCost,
      status: InterpreterSessionStatus.REQUESTED,
      isPaid: false,
    });

    const savedSession = await this.sessionRepository.save(session);
    this.eventEmitter.emit('session.created', savedSession);
    return savedSession;
  }

  async findAll(filters: SessionFilterDto = {}): Promise<{ sessions: InterpreterSession[]; total: number }> {
    const { page = 1, limit = 20, ...filterOptions } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.client', 'client')
      .leftJoinAndSelect('session.interpreter', 'interpreter')
      .leftJoinAndSelect('interpreter.user', 'interpreterUser');

    // Apply filters
    if (filterOptions.clientId) {
      queryBuilder.andWhere('session.clientId = :clientId', { clientId: filterOptions.clientId });
    }

    if (filterOptions.interpreterId) {
      queryBuilder.andWhere('session.interpreterId = :interpreterId', { interpreterId: filterOptions.interpreterId });
    }

    if (filterOptions.status?.length) {
      queryBuilder.andWhere('session.status IN (:...statuses)', { statuses: filterOptions.status });
    }

    if (filterOptions.sessionType) {
      queryBuilder.andWhere('session.sessionType = :sessionType', { sessionType: filterOptions.sessionType });
    }

    if (filterOptions.specialization) {
      queryBuilder.andWhere('session.specialization = :specialization', { specialization: filterOptions.specialization });
    }

    if (filterOptions.dateFrom && filterOptions.dateTo) {
      queryBuilder.andWhere('session.scheduledStartTime BETWEEN :dateFrom AND :dateTo', {
        dateFrom: filterOptions.dateFrom,
        dateTo: filterOptions.dateTo
      });
    }

    if (filterOptions.language) {
      queryBuilder.andWhere(
        '(session.sourceLanguage = :language OR session.targetLanguage = :language)',
        { language: filterOptions.language }
      );
    }

    if (filterOptions.isPaid !== undefined) {
      queryBuilder.andWhere('session.isPaid = :isPaid', { isPaid: filterOptions.isPaid });
    }

    if (filterOptions.needsRating) {
      queryBuilder.andWhere('session.status = :completedStatus AND session.clientRating IS NULL', {
        completedStatus: InterpreterSessionStatus.COMPLETED
      });
    }

    queryBuilder.orderBy('session.scheduledStartTime', 'DESC');

    const [sessions, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { sessions, total };
  }

  async findOne(id: string): Promise<InterpreterSession> {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['client', 'interpreter', 'interpreter.user']
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  async update(id: string, updateSessionDto: UpdateSessionDto, userId: string): Promise<InterpreterSession> {
    const session = await this.findOne(id);
    
    // Check permissions
    if (session.clientId !== userId && session.interpreter?.userId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only update your own sessions');
      }
    }

    // Validate that session can be updated
    if (session.status === InterpreterSessionStatus.COMPLETED || session.status === InterpreterSessionStatus.CANCELLED) {
      throw new BadRequestException('Cannot update completed or cancelled sessions');
    }

    // Update scheduled end time if start time or duration changes
    if (updateSessionDto.scheduledStartTime || updateSessionDto.estimatedDuration) {
      const startTime = updateSessionDto.scheduledStartTime || session.scheduledStartTime;
      const duration = updateSessionDto.estimatedDuration || session.estimatedDuration;
      
      session.scheduledEndTime = new Date(startTime);
      session.scheduledEndTime.setMinutes(session.scheduledEndTime.getMinutes() + duration);
    }

    // Recalculate cost if rate or duration changes
    if (updateSessionDto.hourlyRate || updateSessionDto.estimatedDuration) {
      const duration = updateSessionDto.estimatedDuration || session.estimatedDuration;
      const rate = updateSessionDto.hourlyRate || session.hourlyRate;
      session.totalCost = this.calculateSessionCost(duration, rate, session.additionalFees);
    }

    Object.assign(session, updateSessionDto);
    const updatedSession = await this.sessionRepository.save(session);
    this.eventEmitter.emit('session.updated', updatedSession);
    return updatedSession;
  }

  async updateStatus(id: string, status: InterpreterSessionStatus, userId: string): Promise<InterpreterSession> {
    const session = await this.findOne(id);
    
    // Check permissions and validate status transitions
    await this.validateStatusTransition(session, status, userId);
    
    session.updateStatus(status);
    
    // Update interpreter statistics if session is completed
    if (status === InterpreterSessionStatus.COMPLETED) {
      await this.interpretersService.updateEarnings(session.interpreterId, session.totalCost);
      const interpreter = await this.interpretersService.findOne(session.interpreterId);
      interpreter.totalSessionsCompleted += 1;
      await this.interpretersService.update(interpreter.id, {}, userId);
    }

    const updatedSession = await this.sessionRepository.save(session);
    this.eventEmitter.emit('session.status-updated', updatedSession);
    return updatedSession;
  }

  async rescheduleSession(id: string, rescheduleDto: RescheduleSessionDto, userId: string): Promise<InterpreterSession> {
    const session = await this.findOne(id);

    // Check permissions
    if (session.clientId !== userId && session.interpreter?.userId !== userId) {
      throw new ForbiddenException('You can only reschedule your own sessions');
    }

    if (!session.canBeRescheduled()) {
      throw new BadRequestException('Session cannot be rescheduled');
    }

    // Check interpreter availability at new time
    if (session.interpreter && !session.interpreter.isAvailableForSession(session.sessionType, rescheduleDto.newStartTime)) {
      throw new BadRequestException('Interpreter is not available at the new time');
    }

    const newEndTime = new Date(rescheduleDto.newStartTime);
    newEndTime.setMinutes(newEndTime.getMinutes() + (rescheduleDto.newDuration || session.estimatedDuration));

    session.scheduledStartTime = rescheduleDto.newStartTime;
    session.scheduledEndTime = newEndTime;
    
    if (rescheduleDto.newDuration) {
      session.estimatedDuration = rescheduleDto.newDuration;
      session.totalCost = this.calculateSessionCost(rescheduleDto.newDuration, session.hourlyRate, session.additionalFees);
    }

    session.isRescheduled = true;
    session.rescheduledCount += 1;
    session.status = InterpreterSessionStatus.CONFIRMED;
    
    // Add rescheduling note
    const rescheduleNote = `Rescheduled by ${userId}: ${rescheduleDto.reason}`;
    session.sessionNotes = session.sessionNotes ? 
      `${session.sessionNotes}\n\n${rescheduleNote}` : 
      rescheduleNote;

    const updatedSession = await this.sessionRepository.save(session);
    this.eventEmitter.emit('session.rescheduled', updatedSession);
    return updatedSession;
  }

  async cancelSession(id: string, cancelDto: CancelSessionDto, userId: string): Promise<InterpreterSession> {
    const session = await this.findOne(id);

    // Check permissions
    if (session.clientId !== userId && session.interpreter?.userId !== userId) {
      const user = await this.userRepository.findOne({ where: { id: userId } });
      if (!user || user.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only cancel your own sessions');
      }
    }

    if (!session.canBeCancelled()) {
      throw new BadRequestException('Session cannot be cancelled');
    }

    session.status = InterpreterSessionStatus.CANCELLED;
    session.cancellationReason = cancelDto.reason;
    session.cancellationCategory = cancelDto.category;
    session.cancelledAt = new Date();
    session.cancelledBy = userId;

    const updatedSession = await this.sessionRepository.save(session);
    this.eventEmitter.emit('session.cancelled', updatedSession);
    return updatedSession;
  }

  async addRating(id: string, rating: SessionRating, raterRole: 'client' | 'interpreter'): Promise<InterpreterSession> {
    const session = await this.findOne(id);

    if (session.status !== InterpreterSessionStatus.COMPLETED) {
      throw new BadRequestException('Can only rate completed sessions');
    }

    if (raterRole === 'client') {
      if (session.clientRating) {
        throw new BadRequestException('Session has already been rated by client');
      }
      session.clientRating = { ...rating, ratedAt: new Date() };
      
      // Update interpreter's average rating
      await this.interpretersService.updateRating(session.interpreterId, rating.overall);
    } else {
      if (session.interpreterRating) {
        throw new BadRequestException('Session has already been rated by interpreter');
      }
      session.interpreterRating = { ...rating, ratedAt: new Date() };
    }

    const updatedSession = await this.sessionRepository.save(session);
    this.eventEmitter.emit('session.rated', updatedSession);
    return updatedSession;
  }

  async getUpcomingSessions(userId: string, role: UserRole): Promise<InterpreterSession[]> {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const queryBuilder = this.sessionRepository.createQueryBuilder('session')
      .leftJoinAndSelect('session.client', 'client')
      .leftJoinAndSelect('session.interpreter', 'interpreter')
      .leftJoinAndSelect('interpreter.user', 'interpreterUser')
      .where('session.scheduledStartTime <= :tomorrow', { tomorrow })
      .andWhere('session.scheduledStartTime > :now', { now: new Date() })
      .andWhere('session.status IN (:...statuses)', { 
        statuses: [InterpreterSessionStatus.CONFIRMED, InterpreterSessionStatus.REQUESTED] 
      });

    if (role === UserRole.CLIENT) {
      queryBuilder.andWhere('session.clientId = :userId', { userId });
    } else if (role === UserRole.INTERPRETER) {
      const interpreter = await this.interpretersService.findByUserId(userId);
      queryBuilder.andWhere('session.interpreterId = :interpreterId', { interpreterId: interpreter.id });
    }

    return queryBuilder
      .orderBy('session.scheduledStartTime', 'ASC')
      .getMany();
  }

  async getSessionStatistics(userId: string, role: UserRole): Promise<any> {
    const baseQuery = this.sessionRepository.createQueryBuilder('session');

    if (role === UserRole.CLIENT) {
      baseQuery.where('session.clientId = :userId', { userId });
    } else if (role === UserRole.INTERPRETER) {
      const interpreter = await this.interpretersService.findByUserId(userId);
      baseQuery.where('session.interpreterId = :interpreterId', { interpreterId: interpreter.id });
    }

    const [
      totalSessions,
      completedSessions,
      cancelledSessions,
      upcomingSessions
    ] = await Promise.all([
      baseQuery.getCount(),
      baseQuery.clone().andWhere('session.status = :status', { status: InterpreterSessionStatus.COMPLETED }).getCount(),
      baseQuery.clone().andWhere('session.status = :status', { status: InterpreterSessionStatus.CANCELLED }).getCount(),
      baseQuery.clone().andWhere('session.status IN (:...statuses)', { 
        statuses: [InterpreterSessionStatus.CONFIRMED, InterpreterSessionStatus.REQUESTED] 
      }).andWhere('session.scheduledStartTime > :now', { now: new Date() }).getCount(),
    ]);

    return {
      totalSessions,
      completedSessions,
      cancelledSessions,
      upcomingSessions,
      completionRate: totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(1) : 0,
      cancellationRate: totalSessions > 0 ? (cancelledSessions / totalSessions * 100).toFixed(1) : 0,
    };
  }

  private async checkConflictingSessions(interpreterId: string, startTime: Date, endTime: Date): Promise<InterpreterSession | null> {
    return this.sessionRepository.findOne({
      where: {
        interpreterId,
        status: InterpreterSessionStatus.CONFIRMED,
        scheduledStartTime: LessThan(endTime),
        scheduledEndTime: MoreThan(startTime),
      }
    });
  }

  private calculateSessionCost(durationMinutes: number, hourlyRate: number, additionalFees: number = 0): number {
    const hours = durationMinutes / 60;
    const baseCost = hours * hourlyRate;
    return Math.round((baseCost + additionalFees) * 100) / 100;
  }

  private async validateStatusTransition(session: InterpreterSession, newStatus: InterpreterSessionStatus, userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { id: userId } });
    
    // Define valid transitions
    const validTransitions: Record<InterpreterSessionStatus, InterpreterSessionStatus[]> = {
      [InterpreterSessionStatus.REQUESTED]: [InterpreterSessionStatus.CONFIRMED, InterpreterSessionStatus.CANCELLED],
      [InterpreterSessionStatus.CONFIRMED]: [InterpreterSessionStatus.IN_PROGRESS, InterpreterSessionStatus.CANCELLED, InterpreterSessionStatus.RESCHEDULED],
      [InterpreterSessionStatus.IN_PROGRESS]: [InterpreterSessionStatus.COMPLETED, InterpreterSessionStatus.CANCELLED],
      [InterpreterSessionStatus.COMPLETED]: [], // No transitions from completed
      [InterpreterSessionStatus.CANCELLED]: [], // No transitions from cancelled
      [InterpreterSessionStatus.NO_SHOW]: [], // No transitions from no-show
      [InterpreterSessionStatus.RESCHEDULED]: [InterpreterSessionStatus.CONFIRMED, InterpreterSessionStatus.CANCELLED],
    };

    if (!validTransitions[session.status].includes(newStatus)) {
      throw new BadRequestException(`Invalid status transition from ${session.status} to ${newStatus}`);
    }

    // Check role-based permissions
    if (newStatus === InterpreterSessionStatus.CONFIRMED) {
      // Only interpreters can confirm sessions
      if (session.interpreter?.userId !== userId && user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only the assigned interpreter can confirm sessions');
      }
    }

    if (newStatus === InterpreterSessionStatus.IN_PROGRESS || newStatus === InterpreterSessionStatus.COMPLETED) {
      // Only interpreters can start/complete sessions
      if (session.interpreter?.userId !== userId && user?.role !== UserRole.ADMIN) {
        throw new ForbiddenException('Only the assigned interpreter can update session progress');
      }
    }
  }
} 