import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Like, In } from 'typeorm';
import {
  Translation,
  TranslationStatus,
  TranslationType,
  UrgencyLevel,
} from './entities/translation.entity';
import { User } from '../users/entities/user.entity';
import { PricingService } from './pricing.service';

export interface CreateTranslationDto {
  title: string;
  description?: string;
  type: TranslationType;
  urgencyLevel: UrgencyLevel;
  sourceLanguage: string;
  targetLanguage: string;
  specialInstructions?: string;
  requestedDeliveryDate?: Date;
  requiresCertification?: boolean;
  isConfidential?: boolean;
}

export interface UpdateTranslationDto {
  title?: string;
  description?: string;
  type?: TranslationType;
  urgencyLevel?: UrgencyLevel;
  sourceLanguage?: string;
  targetLanguage?: string;
  specialInstructions?: string;
  requestedDeliveryDate?: Date;
  requiresCertification?: boolean;
  isConfidential?: boolean;
  status?: TranslationStatus;
  translatorId?: string;
  reviewerId?: string;
  clientFeedback?: string;
  rating?: number;
  internalNotes?: string;
}

export interface TranslationFilters {
  status?: TranslationStatus[];
  type?: TranslationType[];
  urgencyLevel?: UrgencyLevel[];
  sourceLanguage?: string[];
  targetLanguage?: string[];
  clientId?: string;
  translatorId?: string;
  search?: string;
  dateFrom?: Date;
  dateTo?: Date;
  isOverdue?: boolean;
}

export interface PaginationOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

@Injectable()
export class TranslationsService {
  constructor(
    @InjectRepository(Translation)
    private translationRepository: Repository<Translation>,
    private pricingService: PricingService,
  ) {}

  async create(
    createTranslationDto: CreateTranslationDto,
    clientId: string,
  ): Promise<Translation> {
    // Validate language codes
    this.validateLanguageCode(createTranslationDto.sourceLanguage);
    this.validateLanguageCode(createTranslationDto.targetLanguage);

    if (createTranslationDto.sourceLanguage === createTranslationDto.targetLanguage) {
      throw new BadRequestException('Source and target languages cannot be the same');
    }

    const translation = this.translationRepository.create({
      ...createTranslationDto,
      clientId,
      status: TranslationStatus.PENDING,
      currency: 'USD', // Default currency - can be made configurable
    });

    // Calculate estimated delivery date based on urgency
    translation.estimatedDeliveryDate = this.calculateEstimatedDeliveryDate(
      createTranslationDto.urgencyLevel,
      createTranslationDto.requestedDeliveryDate,
    );

    return this.translationRepository.save(translation);
  }

  async findAll(
    filters: TranslationFilters = {},
    pagination: PaginationOptions = {},
    user: User,
  ): Promise<{ translations: Translation[]; total: number; page: number; totalPages: number }> {
    const {
      page = 1,
      limit = 20,
      sortBy = 'createdAt',
      sortOrder = 'DESC',
    } = pagination;

    const queryBuilder = this.translationRepository
      .createQueryBuilder('translation')
      .leftJoinAndSelect('translation.client', 'client')
      .leftJoinAndSelect('translation.translator', 'translator')
      .leftJoinAndSelect('translation.reviewer', 'reviewer')
      .leftJoinAndSelect('translation.documents', 'documents');

    // Apply role-based filtering
    if (user.role === 'client') {
      queryBuilder.where('translation.clientId = :clientId', { clientId: user.id });
    } else if (user.role === 'interpreter') {
      queryBuilder.where(
        '(translation.translatorId = :translatorId OR translation.reviewerId = :reviewerId OR translation.status = :pendingStatus)',
        {
          translatorId: user.id,
          reviewerId: user.id,
          pendingStatus: TranslationStatus.PENDING,
        },
      );
    }

    // Apply filters
    if (filters.status?.length) {
      queryBuilder.andWhere('translation.status IN (:...statuses)', {
        statuses: filters.status,
      });
    }

    if (filters.type?.length) {
      queryBuilder.andWhere('translation.type IN (:...types)', {
        types: filters.type,
      });
    }

    if (filters.urgencyLevel?.length) {
      queryBuilder.andWhere('translation.urgencyLevel IN (:...urgencyLevels)', {
        urgencyLevels: filters.urgencyLevel,
      });
    }

    if (filters.sourceLanguage?.length) {
      queryBuilder.andWhere('translation.sourceLanguage IN (:...sourceLanguages)', {
        sourceLanguages: filters.sourceLanguage,
      });
    }

    if (filters.targetLanguage?.length) {
      queryBuilder.andWhere('translation.targetLanguage IN (:...targetLanguages)', {
        targetLanguages: filters.targetLanguage,
      });
    }

    if (filters.clientId) {
      queryBuilder.andWhere('translation.clientId = :clientId', {
        clientId: filters.clientId,
      });
    }

    if (filters.translatorId) {
      queryBuilder.andWhere('translation.translatorId = :translatorId', {
        translatorId: filters.translatorId,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(translation.title ILIKE :search OR translation.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.dateFrom) {
      queryBuilder.andWhere('translation.createdAt >= :dateFrom', {
        dateFrom: filters.dateFrom,
      });
    }

    if (filters.dateTo) {
      queryBuilder.andWhere('translation.createdAt <= :dateTo', {
        dateTo: filters.dateTo,
      });
    }

    if (filters.isOverdue) {
      queryBuilder.andWhere(
        'translation.estimatedDeliveryDate < :now AND translation.status NOT IN (:...completedStatuses)',
        {
          now: new Date(),
          completedStatuses: [TranslationStatus.COMPLETED, TranslationStatus.DELIVERED],
        },
      );
    }

    // Apply sorting
    queryBuilder.orderBy(`translation.${sortBy}`, sortOrder);

    // Apply pagination
    const offset = (page - 1) * limit;
    queryBuilder.skip(offset).take(limit);

    const [translations, total] = await queryBuilder.getManyAndCount();

    return {
      translations,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, user: User): Promise<Translation> {
    const translation = await this.translationRepository.findOne({
      where: { id, isActive: true },
      relations: ['client', 'translator', 'reviewer', 'documents'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(translation, user);

    return translation;
  }

  async update(
    id: string,
    updateTranslationDto: UpdateTranslationDto,
    user: User,
  ): Promise<Translation> {
    const translation = await this.findOne(id, user);

    // Validate status transitions
    if (updateTranslationDto.status) {
      this.validateStatusTransition(translation.status, updateTranslationDto.status, user);
    }

    // Update translation
    Object.assign(translation, updateTranslationDto);

    // Handle status-specific updates
    if (updateTranslationDto.status) {
      this.handleStatusChange(translation, updateTranslationDto.status);
    }

    return this.translationRepository.save(translation);
  }

  async updateWordCount(id: string, wordCount: number, characterCount: number): Promise<Translation> {
    const translation = await this.translationRepository.findOne({
      where: { id, isActive: true },
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${id} not found`);
    }

    translation.wordCount = wordCount;
    translation.characterCount = characterCount;

    // Recalculate pricing if word count changed
    if (wordCount > 0) {
      const pricing = await this.pricingService.calculatePrice({
        wordCount,
        sourceLanguage: translation.sourceLanguage,
        targetLanguage: translation.targetLanguage,
        urgencyLevel: translation.urgencyLevel,
        type: translation.type,
        requiresCertification: translation.requiresCertification,
      });

      translation.estimatedCost = pricing.totalCost;
      translation.ratePerWord = pricing.ratePerWord;
    }

    return this.translationRepository.save(translation);
  }

  async assignTranslator(id: string, translatorId: string, user: User): Promise<Translation> {
    if (user.role !== 'admin' && user.role !== 'interpreter') {
      throw new ForbiddenException('Only admins and interpreters can assign translators');
    }

    const translation = await this.findOne(id, user);

    if (translation.status !== TranslationStatus.QUOTED && translation.status !== TranslationStatus.CONFIRMED) {
      throw new BadRequestException('Translation must be quoted or confirmed to assign translator');
    }

    translation.translatorId = translatorId;
    translation.status = TranslationStatus.CONFIRMED;
    translation.confirmedAt = new Date();

    return this.translationRepository.save(translation);
  }

  async generateQuote(id: string, user: User): Promise<Translation> {
    const translation = await this.findOne(id, user);

    if (translation.status !== TranslationStatus.PENDING) {
      throw new BadRequestException('Translation must be pending to generate quote');
    }

    if (translation.wordCount === 0) {
      throw new BadRequestException('Word count must be set before generating quote');
    }

    const pricing = await this.pricingService.calculatePrice({
      wordCount: translation.wordCount,
      sourceLanguage: translation.sourceLanguage,
      targetLanguage: translation.targetLanguage,
      urgencyLevel: translation.urgencyLevel,
      type: translation.type,
      requiresCertification: translation.requiresCertification,
    });

    translation.estimatedCost = pricing.totalCost;
    translation.ratePerWord = pricing.ratePerWord;
    translation.status = TranslationStatus.QUOTED;
    translation.quotedAt = new Date();

    return this.translationRepository.save(translation);
  }

  async getStatistics(user: User): Promise<any> {
    const queryBuilder = this.translationRepository.createQueryBuilder('translation');

    // Apply role-based filtering
    if (user.role === 'client') {
      queryBuilder.where('translation.clientId = :clientId', { clientId: user.id });
    } else if (user.role === 'interpreter') {
      queryBuilder.where(
        '(translation.translatorId = :translatorId OR translation.reviewerId = :reviewerId)',
        { translatorId: user.id, reviewerId: user.id },
      );
    }

    const [
      totalProjects,
      pendingProjects,
      inProgressProjects,
      completedProjects,
      overdueProjects,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('translation.status = :status', { status: TranslationStatus.PENDING }).getCount(),
      queryBuilder.clone().andWhere('translation.status = :status', { status: TranslationStatus.IN_PROGRESS }).getCount(),
      queryBuilder.clone().andWhere('translation.status = :status', { status: TranslationStatus.COMPLETED }).getCount(),
      queryBuilder.clone().andWhere(
        'translation.estimatedDeliveryDate < :now AND translation.status NOT IN (:...statuses)',
        {
          now: new Date(),
          statuses: [TranslationStatus.COMPLETED, TranslationStatus.DELIVERED],
        },
      ).getCount(),
    ]);

    return {
      totalProjects,
      pendingProjects,
      inProgressProjects,
      completedProjects,
      overdueProjects,
    };
  }

  async remove(id: string, user: User): Promise<void> {
    const translation = await this.findOne(id, user);

    if (user.role !== 'admin' && translation.clientId !== user.id) {
      throw new ForbiddenException('You can only delete your own translations');
    }

    if (translation.status === TranslationStatus.IN_PROGRESS) {
      throw new BadRequestException('Cannot delete translation that is in progress');
    }

    translation.isActive = false;
    await this.translationRepository.save(translation);
  }

  private validateLanguageCode(languageCode: string): void {
    // ISO 639-1 language codes validation
    const validLanguages = [
      'en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko',
      'ar', 'hi', 'th', 'vi', 'tr', 'nl', 'sv', 'da', 'no', 'fi',
      'pl', 'cs', 'hu', 'ro', 'bg', 'hr', 'sr', 'sk', 'sl', 'et',
      'lv', 'lt', 'mt', 'el', 'he', 'fa', 'ur', 'bn', 'ta', 'te',
      'ml', 'kn', 'gu', 'mr', 'ne', 'si', 'my', 'km', 'lo', 'ka',
      'am', 'sw', 'zu', 'af', 'sq', 'eu', 'be', 'bs', 'ca', 'cy',
      'eo', 'fo', 'fy', 'ga', 'gd', 'gl', 'is', 'lb', 'mk', 'ms',
      'mi', 'nn', 'oc', 'rm', 'sa', 'sc', 'tl', 'to', 'ty', 'uz',
      'wa', 'wo', 'xh', 'yi', 'yo',
    ];

    if (!validLanguages.includes(languageCode)) {
      throw new BadRequestException(`Invalid language code: ${languageCode}`);
    }
  }

  private calculateEstimatedDeliveryDate(urgencyLevel: UrgencyLevel, requestedDate?: Date): Date {
    const now = new Date();
    let businessDays: number;

    switch (urgencyLevel) {
      case UrgencyLevel.EMERGENCY:
        businessDays = 1;
        break;
      case UrgencyLevel.URGENT:
        businessDays = 2;
        break;
      case UrgencyLevel.RUSH:
        businessDays = 3;
        break;
      case UrgencyLevel.STANDARD:
      default:
        businessDays = 7;
        break;
    }

    const estimatedDate = this.addBusinessDays(now, businessDays);
    
    // Use requested date if it's later than estimated date
    if (requestedDate && requestedDate > estimatedDate) {
      return requestedDate;
    }

    return estimatedDate;
  }

  private addBusinessDays(date: Date, businessDays: number): Date {
    const result = new Date(date);
    let days = 0;

    while (days < businessDays) {
      result.setDate(result.getDate() + 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        days++;
      }
    }

    return result;
  }

  private checkAccessPermission(translation: Translation, user: User): void {
    if (user.role === 'admin') {
      return; // Admins can access everything
    }

    if (user.role === 'client' && translation.clientId !== user.id) {
      throw new ForbiddenException('You can only access your own translations');
    }

    if (
      user.role === 'interpreter' &&
      translation.translatorId !== user.id &&
      translation.reviewerId !== user.id &&
      translation.status === TranslationStatus.PENDING
    ) {
      // Interpreters can see pending translations (for assignment) and their own assigned translations
      return;
    }

    if (
      user.role === 'interpreter' &&
      translation.translatorId !== user.id &&
      translation.reviewerId !== user.id &&
      translation.status !== TranslationStatus.PENDING
    ) {
      throw new ForbiddenException('You can only access translations assigned to you');
    }
  }

  private validateStatusTransition(currentStatus: TranslationStatus, newStatus: TranslationStatus, user: User): void {
    const allowedTransitions: Record<TranslationStatus, TranslationStatus[]> = {
      [TranslationStatus.PENDING]: [TranslationStatus.QUOTED, TranslationStatus.CANCELLED],
      [TranslationStatus.QUOTED]: [TranslationStatus.CONFIRMED, TranslationStatus.CANCELLED],
      [TranslationStatus.CONFIRMED]: [TranslationStatus.IN_PROGRESS, TranslationStatus.CANCELLED],
      [TranslationStatus.IN_PROGRESS]: [TranslationStatus.UNDER_REVIEW, TranslationStatus.CANCELLED],
      [TranslationStatus.UNDER_REVIEW]: [TranslationStatus.IN_PROGRESS, TranslationStatus.COMPLETED],
      [TranslationStatus.COMPLETED]: [TranslationStatus.DELIVERED],
      [TranslationStatus.DELIVERED]: [],
      [TranslationStatus.CANCELLED]: [],
    };

    if (!allowedTransitions[currentStatus]?.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${currentStatus} to ${newStatus}`,
      );
    }

    // Role-based restrictions
    if (user.role === 'client') {
      const clientAllowedStatuses = [TranslationStatus.CONFIRMED, TranslationStatus.CANCELLED];
      if (!clientAllowedStatuses.includes(newStatus)) {
        throw new ForbiddenException('Clients can only confirm or cancel translations');
      }
    }
  }

  private handleStatusChange(translation: Translation, newStatus: TranslationStatus): void {
    const now = new Date();

    switch (newStatus) {
      case TranslationStatus.CONFIRMED:
        translation.confirmedAt = now;
        break;
      case TranslationStatus.IN_PROGRESS:
        translation.startedAt = now;
        break;
      case TranslationStatus.COMPLETED:
        translation.completedAt = now;
        translation.actualDeliveryDate = now;
        break;
      case TranslationStatus.DELIVERED:
        if (!translation.actualDeliveryDate) {
          translation.actualDeliveryDate = now;
        }
        break;
    }
  }
} 