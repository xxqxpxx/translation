import { Injectable, NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, In } from 'typeorm';
import { Interpreter, InterpreterStatus, InterpreterSpecialization, SessionType, AvailabilityStatus, LanguageProficiency, RateStructure, AvailabilitySchedule } from './entities/interpreter.entity';
import { User, UserRole } from '../users/entities/user.entity';

export interface CreateInterpreterDto {
  userId: string;
  languages: LanguageProficiency[];
  specializations: InterpreterSpecialization[];
  supportedSessionTypes: SessionType[];
  rateStructure: RateStructure;
  weeklySchedule?: AvailabilitySchedule[];
  bio?: string;
  certifications?: any[];
  workExperience?: any[];
  portfolioUrl?: string;
  linkedinUrl?: string;
}

export interface UpdateInterpreterDto {
  languages?: LanguageProficiency[];
  specializations?: InterpreterSpecialization[];
  supportedSessionTypes?: SessionType[];
  rateStructure?: RateStructure;
  weeklySchedule?: AvailabilitySchedule[];
  bio?: string;
  certifications?: any[];
  workExperience?: any[];
  portfolioUrl?: string;
  linkedinUrl?: string;
  currentAvailabilityStatus?: AvailabilityStatus;
}

export interface InterpreterFilterDto {
  languages?: string[];
  specializations?: InterpreterSpecialization[];
  sessionType?: SessionType;
  availableAt?: Date;
  minRating?: number;
  maxRate?: number;
  status?: InterpreterStatus;
  isVerified?: boolean;
  location?: string;
  page?: number;
  limit?: number;
}

export interface InterpreterMatchDto {
  sourceLanguage: string;
  targetLanguage: string;
  sessionType: SessionType;
  specialization: InterpreterSpecialization;
  scheduledDate: Date;
  duration: number; // in minutes
  location?: string;
  requirements?: any;
}

@Injectable()
export class InterpretersService {
  constructor(
    @InjectRepository(Interpreter)
    private interpreterRepository: Repository<Interpreter>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createInterpreter(createInterpreterDto: CreateInterpreterDto): Promise<Interpreter> {
    // Verify user exists and has INTERPRETER role
    const user = await this.userRepository.findOne({
      where: { id: createInterpreterDto.userId }
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== UserRole.INTERPRETER) {
      throw new BadRequestException('User must have INTERPRETER role');
    }

    // Check if interpreter profile already exists
    const existingInterpreter = await this.interpreterRepository.findOne({
      where: { userId: createInterpreterDto.userId }
    });

    if (existingInterpreter) {
      throw new BadRequestException('Interpreter profile already exists for this user');
    }

    // Validate languages and rates
    this.validateLanguages(createInterpreterDto.languages);
    this.validateRateStructure(createInterpreterDto.rateStructure);

    const interpreter = this.interpreterRepository.create({
      ...createInterpreterDto,
      status: InterpreterStatus.PENDING_APPROVAL,
      currentAvailabilityStatus: AvailabilityStatus.OFFLINE,
      totalSessionsCompleted: 0,
      averageRating: 0,
      totalRatings: 0,
      totalEarnings: 0,
      isVerified: false,
      backgroundCheckCompleted: false,
    });

    return this.interpreterRepository.save(interpreter);
  }

  async findAll(filters: InterpreterFilterDto = {}): Promise<{ interpreters: Interpreter[]; total: number }> {
    const { page = 1, limit = 20, ...filterOptions } = filters;
    const skip = (page - 1) * limit;

    const queryBuilder = this.interpreterRepository.createQueryBuilder('interpreter')
      .leftJoinAndSelect('interpreter.user', 'user');

    // Apply filters
    if (filterOptions.languages?.length) {
      queryBuilder.andWhere(
        'EXISTS (SELECT 1 FROM jsonb_array_elements(interpreter.languages) AS lang WHERE lang->>"language" = ANY(:languages))',
        { languages: filterOptions.languages }
      );
    }

    if (filterOptions.specializations?.length) {
      queryBuilder.andWhere('interpreter.specializations && :specializations', {
        specializations: filterOptions.specializations
      });
    }

    if (filterOptions.sessionType) {
      queryBuilder.andWhere(':sessionType = ANY(interpreter.supportedSessionTypes)', {
        sessionType: filterOptions.sessionType
      });
    }

    if (filterOptions.status) {
      queryBuilder.andWhere('interpreter.status = :status', { status: filterOptions.status });
    }

    if (filterOptions.isVerified !== undefined) {
      queryBuilder.andWhere('interpreter.isVerified = :isVerified', { isVerified: filterOptions.isVerified });
    }

    if (filterOptions.minRating) {
      queryBuilder.andWhere('interpreter.averageRating >= :minRating', { minRating: filterOptions.minRating });
    }

    if (filterOptions.maxRate) {
      queryBuilder.andWhere(
        'CAST(interpreter.rateStructure->"hourlyRate" AS DECIMAL) <= :maxRate',
        { maxRate: filterOptions.maxRate }
      );
    }

    // Add availability filter if specified
    if (filterOptions.availableAt) {
      const dayOfWeek = filterOptions.availableAt.getDay();
      const timeStr = filterOptions.availableAt.toTimeString().slice(0, 5);
      
      queryBuilder.andWhere(
        `interpreter.currentAvailabilityStatus = :availableStatus 
         AND EXISTS (
           SELECT 1 FROM jsonb_array_elements(interpreter.weeklySchedule) AS schedule 
           WHERE CAST(schedule->>"dayOfWeek" AS INTEGER) = :dayOfWeek 
           AND schedule->>"startTime" <= :timeStr 
           AND schedule->>"endTime" >= :timeStr
         )`,
        { 
          availableStatus: AvailabilityStatus.AVAILABLE,
          dayOfWeek,
          timeStr
        }
      );
    }

    // Order by rating and verification status
    queryBuilder.orderBy('interpreter.isVerified', 'DESC')
      .addOrderBy('interpreter.averageRating', 'DESC')
      .addOrderBy('interpreter.totalSessionsCompleted', 'DESC');

    const [interpreters, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { interpreters, total };
  }

  async findOne(id: string): Promise<Interpreter> {
    const interpreter = await this.interpreterRepository.findOne({
      where: { id },
      relations: ['user', 'sessions']
    });

    if (!interpreter) {
      throw new NotFoundException('Interpreter not found');
    }

    return interpreter;
  }

  async findByUserId(userId: string): Promise<Interpreter> {
    const interpreter = await this.interpreterRepository.findOne({
      where: { userId },
      relations: ['user']
    });

    if (!interpreter) {
      throw new NotFoundException('Interpreter profile not found for this user');
    }

    return interpreter;
  }

  async update(id: string, updateInterpreterDto: UpdateInterpreterDto, requestUserId?: string): Promise<Interpreter> {
    const interpreter = await this.findOne(id);

    // Check permissions
    if (requestUserId && interpreter.userId !== requestUserId) {
      // Allow admins to update any interpreter
      const requestUser = await this.userRepository.findOne({ where: { id: requestUserId } });
      if (!requestUser || requestUser.role !== UserRole.ADMIN) {
        throw new ForbiddenException('You can only update your own interpreter profile');
      }
    }

    // Validate updates
    if (updateInterpreterDto.languages) {
      this.validateLanguages(updateInterpreterDto.languages);
    }

    if (updateInterpreterDto.rateStructure) {
      this.validateRateStructure(updateInterpreterDto.rateStructure);
    }

    Object.assign(interpreter, updateInterpreterDto);
    interpreter.updatedAt = new Date();

    return this.interpreterRepository.save(interpreter);
  }

  async updateAvailabilityStatus(id: string, status: AvailabilityStatus): Promise<Interpreter> {
    const interpreter = await this.findOne(id);
    interpreter.currentAvailabilityStatus = status;
    interpreter.lastActiveDate = new Date();
    
    return this.interpreterRepository.save(interpreter);
  }

  async updateStatus(id: string, status: InterpreterStatus, requestUserId: string): Promise<Interpreter> {
    // Only admins can change interpreter status
    const requestUser = await this.userRepository.findOne({ where: { id: requestUserId } });
    if (!requestUser || requestUser.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can change interpreter status');
    }

    const interpreter = await this.findOne(id);
    interpreter.status = status;

    if (status === InterpreterStatus.ACTIVE) {
      interpreter.isVerified = true;
    }

    return this.interpreterRepository.save(interpreter);
  }

  async findMatchingInterpreters(matchDto: InterpreterMatchDto): Promise<Interpreter[]> {
    const queryBuilder = this.interpreterRepository.createQueryBuilder('interpreter')
      .leftJoinAndSelect('interpreter.user', 'user')
      .where('interpreter.status = :status', { status: InterpreterStatus.ACTIVE })
      .andWhere('interpreter.currentAvailabilityStatus = :availabilityStatus', { 
        availabilityStatus: AvailabilityStatus.AVAILABLE 
      })
      .andWhere(':sessionType = ANY(interpreter.supportedSessionTypes)', {
        sessionType: matchDto.sessionType
      })
      .andWhere(':specialization = ANY(interpreter.specializations)', {
        specialization: matchDto.specialization
      });

    // Check language capability
    queryBuilder.andWhere(`
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(interpreter.languages) AS lang 
        WHERE lang->>"language" = :sourceLanguage
      ) AND EXISTS (
        SELECT 1 FROM jsonb_array_elements(interpreter.languages) AS lang 
        WHERE lang->>"language" = :targetLanguage
      )`,
      { 
        sourceLanguage: matchDto.sourceLanguage,
        targetLanguage: matchDto.targetLanguage
      }
    );

    // Check availability at scheduled time
    const dayOfWeek = matchDto.scheduledDate.getDay();
    const timeStr = matchDto.scheduledDate.toTimeString().slice(0, 5);
    
    queryBuilder.andWhere(`
      EXISTS (
        SELECT 1 FROM jsonb_array_elements(interpreter.weeklySchedule) AS schedule 
        WHERE CAST(schedule->>"dayOfWeek" AS INTEGER) = :dayOfWeek 
        AND schedule->>"startTime" <= :timeStr 
        AND schedule->>"endTime" >= :timeStr
      )`,
      { dayOfWeek, timeStr }
    );

    // Order by best match criteria
    queryBuilder.orderBy('interpreter.averageRating', 'DESC')
      .addOrderBy('interpreter.totalSessionsCompleted', 'DESC')
      .addOrderBy('interpreter.isVerified', 'DESC');

    return queryBuilder.limit(10).getMany();
  }

  async updateRating(interpreterId: string, newRating: number): Promise<Interpreter> {
    const interpreter = await this.findOne(interpreterId);
    interpreter.updateRating(newRating);
    return this.interpreterRepository.save(interpreter);
  }

  async updateEarnings(interpreterId: string, amount: number): Promise<Interpreter> {
    const interpreter = await this.findOne(interpreterId);
    interpreter.totalEarnings += amount;
    return this.interpreterRepository.save(interpreter);
  }

  async getStatistics(interpreterId: string): Promise<any> {
    const interpreter = await this.findOne(interpreterId);
    
    // Calculate additional statistics
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    return {
      totalSessions: interpreter.totalSessionsCompleted,
      averageRating: interpreter.averageRating,
      totalRatings: interpreter.totalRatings,
      totalEarnings: interpreter.totalEarnings,
      isVerified: interpreter.isVerified,
      status: interpreter.status,
      currentAvailabilityStatus: interpreter.currentAvailabilityStatus,
      specializations: interpreter.specializations,
      supportedLanguages: interpreter.languages.map(lang => lang.language),
      joinedDate: interpreter.createdAt,
      lastActiveDate: interpreter.lastActiveDate,
    };
  }

  private validateLanguages(languages: LanguageProficiency[]): void {
    if (!languages || languages.length < 2) {
      throw new BadRequestException('Interpreter must speak at least 2 languages');
    }

    const validProficiencyLevels = ['native', 'fluent', 'advanced', 'intermediate'];
    for (const lang of languages) {
      if (!validProficiencyLevels.includes(lang.proficiencyLevel)) {
        throw new BadRequestException(`Invalid proficiency level: ${lang.proficiencyLevel}`);
      }
    }
  }

  private validateRateStructure(rateStructure: RateStructure): void {
    if (!rateStructure.hourlyRate || rateStructure.hourlyRate < 10) {
      throw new BadRequestException('Hourly rate must be at least $10');
    }

    if (!rateStructure.minimumHours || rateStructure.minimumHours < 1) {
      throw new BadRequestException('Minimum hours must be at least 1');
    }

    // Validate session type rates
    Object.entries(rateStructure.sessionTypes).forEach(([type, config]) => {
      if (!config.rate || config.rate < 10) {
        throw new BadRequestException(`Rate for ${type} must be at least $10`);
      }
      if (!config.minimumDuration || config.minimumDuration < 30) {
        throw new BadRequestException(`Minimum duration for ${type} must be at least 30 minutes`);
      }
    });
  }
} 