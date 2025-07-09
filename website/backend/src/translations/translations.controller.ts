import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  Res,
  UseGuards,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { User as UserDecorator } from '../auth/decorators/user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { TranslationsService, CreateTranslationDto, UpdateTranslationDto, TranslationFilters, PaginationOptions } from './translations.service';
import { DocumentsService, CreateDocumentDto, UpdateDocumentDto } from './documents.service';
import { PricingService, PricingRequest } from './pricing.service';
import { Translation, TranslationStatus, TranslationType, UrgencyLevel } from './entities/translation.entity';
import { Document, DocumentType, DocumentStatus } from './entities/document.entity';

// DTOs for API requests
class CreateTranslationRequestDto implements CreateTranslationDto {
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

class UpdateTranslationRequestDto implements UpdateTranslationDto {
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

class TranslationQueryDto implements TranslationFilters, PaginationOptions {
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
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'ASC' | 'DESC';
}

class PricingQuoteDto implements PricingRequest {
  wordCount: number;
  sourceLanguage: string;
  targetLanguage: string;
  urgencyLevel: UrgencyLevel;
  type: TranslationType;
  requiresCertification?: boolean;
}

@Controller('translations')
@UseGuards(JwtAuthGuard, RolesGuard)
export class TranslationsController {
  constructor(
    private readonly translationsService: TranslationsService,
    private readonly documentsService: DocumentsService,
    private readonly pricingService: PricingService,
  ) {}

  // Translation Management Endpoints

  @Post()
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async create(
    @Body() createTranslationDto: CreateTranslationRequestDto,
    @UserDecorator() user: User,
  ): Promise<Translation> {
    return this.translationsService.create(createTranslationDto, user.id);
  }

  @Get()
  async findAll(
    @Query() query: TranslationQueryDto,
    @UserDecorator() user: User,
  ): Promise<{ translations: Translation[]; total: number; page: number; totalPages: number }> {
    const { status, type, urgencyLevel, sourceLanguage, targetLanguage, clientId, translatorId, search, dateFrom, dateTo, isOverdue, page, limit, sortBy, sortOrder } = query;
    
    const filters: TranslationFilters = {
      status: status ? (Array.isArray(status) ? status : [status]) : undefined,
      type: type ? (Array.isArray(type) ? type : [type]) : undefined,
      urgencyLevel: urgencyLevel ? (Array.isArray(urgencyLevel) ? urgencyLevel : [urgencyLevel]) : undefined,
      sourceLanguage: sourceLanguage ? (Array.isArray(sourceLanguage) ? sourceLanguage : [sourceLanguage]) : undefined,
      targetLanguage: targetLanguage ? (Array.isArray(targetLanguage) ? targetLanguage : [targetLanguage]) : undefined,
      clientId,
      translatorId,
      search,
      dateFrom,
      dateTo,
      isOverdue,
    };

    const pagination: PaginationOptions = {
      page,
      limit,
      sortBy,
      sortOrder,
    };

    return this.translationsService.findAll(filters, pagination, user);
  }

  @Get('statistics')
  async getStatistics(@UserDecorator() user: User): Promise<any> {
    return this.translationsService.getStatistics(user);
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @UserDecorator() user: User): Promise<Translation> {
    return this.translationsService.findOne(id, user);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateTranslationDto: UpdateTranslationRequestDto,
    @UserDecorator() user: User,
  ): Promise<Translation> {
    return this.translationsService.update(id, updateTranslationDto, user);
  }

  @Delete(':id')
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  async remove(@Param('id') id: string, @UserDecorator() user: User): Promise<void> {
    return this.translationsService.remove(id, user);
  }

  @Post(':id/assign-translator')
  @Roles(UserRole.ADMIN, UserRole.INTERPRETER)
  async assignTranslator(
    @Param('id') id: string,
    @Body('translatorId') translatorId: string,
    @UserDecorator() user: User,
  ): Promise<Translation> {
    return this.translationsService.assignTranslator(id, translatorId, user);
  }

  @Post(':id/generate-quote')
  @Roles(UserRole.ADMIN, UserRole.INTERPRETER)
  async generateQuote(@Param('id') id: string, @UserDecorator() user: User): Promise<Translation> {
    return this.translationsService.generateQuote(id, user);
  }

  // Document Management Endpoints

  @Post(':id/documents')
  @UseInterceptors(FileInterceptor('file'))
  async uploadDocument(
    @Param('id') translationId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('type') type: DocumentType,
    @Body('description') description: string,
    @UserDecorator() user: User,
  ): Promise<Document> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const createDocumentDto: CreateDocumentDto = {
      translationId,
      type: type || DocumentType.SOURCE,
      description,
    };

    return this.documentsService.create(file, createDocumentDto, user);
  }

  @Post(':id/documents/multiple')
  @UseInterceptors(FilesInterceptor('files', 10))
  async uploadMultipleDocuments(
    @Param('id') translationId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Body('type') type: DocumentType,
    @Body('description') description: string,
    @UserDecorator() user: User,
  ): Promise<Document[]> {
    if (!files || files.length === 0) {
      throw new BadRequestException('At least one file is required');
    }

    const createDocumentDto: CreateDocumentDto = {
      translationId,
      type: type || DocumentType.SOURCE,
      description,
    };

    return this.documentsService.createMultiple(files, createDocumentDto, user);
  }

  @Get(':id/documents')
  async getDocuments(@Param('id') translationId: string, @UserDecorator() user: User): Promise<Document[]> {
    return this.documentsService.findAll(translationId, user);
  }

  @Get(':id/documents/statistics')
  async getDocumentStatistics(@Param('id') translationId: string, @UserDecorator() user: User): Promise<any> {
    return this.documentsService.getStatistics(translationId, user);
  }

  @Get(':id/documents/type/:type')
  async getDocumentsByType(
    @Param('id') translationId: string,
    @Param('type') type: DocumentType,
    @UserDecorator() user: User,
  ): Promise<Document[]> {
    return this.documentsService.findByType(translationId, type, user);
  }

  @Get('documents/:documentId')
  async getDocument(@Param('documentId') documentId: string, @UserDecorator() user: User): Promise<Document> {
    return this.documentsService.findOne(documentId, user);
  }

  @Patch('documents/:documentId')
  async updateDocument(
    @Param('documentId') documentId: string,
    @Body() updateDocumentDto: UpdateDocumentDto,
    @UserDecorator() user: User,
  ): Promise<Document> {
    return this.documentsService.update(documentId, updateDocumentDto, user);
  }

  @Delete('documents/:documentId')
  async deleteDocument(@Param('documentId') documentId: string, @UserDecorator() user: User): Promise<void> {
    return this.documentsService.remove(documentId, user);
  }

  @Get('documents/:documentId/download')
  async downloadDocument(
    @Param('documentId') documentId: string,
    @UserDecorator() user: User,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, document } = await this.documentsService.download(documentId, user);

    res.set({
      'Content-Type': document.mimeType,
      'Content-Disposition': `attachment; filename="${document.originalName}"`,
      'Content-Length': buffer.length,
    });

    res.end(buffer);
  }

  @Get('documents/:documentId/download-url')
  async generateDocumentDownloadUrl(
    @Param('documentId') documentId: string,
    @Query('expirationMinutes') expirationMinutes: number = 60,
    @UserDecorator() user: User,
  ): Promise<{ url: string; expiresAt: Date }> {
    return this.documentsService.generateDownloadUrl(documentId, user, expirationMinutes);
  }

  @Patch('documents/:documentId/status')
  @Roles(UserRole.ADMIN, UserRole.INTERPRETER)
  async updateDocumentStatus(
    @Param('documentId') documentId: string,
    @Body('status') status: DocumentStatus,
    @Body('notes') notes: string,
    @UserDecorator() user: User,
  ): Promise<Document> {
    return this.documentsService.updateStatus(documentId, status, user, notes);
  }

  // Pricing Endpoints

  @Post('pricing/quote')
  async getPricingQuote(@Body() pricingRequest: PricingQuoteDto): Promise<any> {
    return this.pricingService.getQuote(pricingRequest);
  }

  @Post('pricing/bulk-quote')
  async getBulkPricingQuote(@Body() pricingRequests: PricingQuoteDto[]): Promise<any> {
    return this.pricingService.getBulkPricing(pricingRequests);
  }

  @Get('pricing/language-info/:sourceLanguage/:targetLanguage')
  async getLanguagePairInfo(
    @Param('sourceLanguage') sourceLanguage: string,
    @Param('targetLanguage') targetLanguage: string,
  ): Promise<any> {
    return this.pricingService.getLanguagePairInfo(sourceLanguage, targetLanguage);
  }

  @Get('pricing/urgency-info/:urgencyLevel')
  async getUrgencyInfo(@Param('urgencyLevel') urgencyLevel: UrgencyLevel): Promise<any> {
    return this.pricingService.getUrgencyInfo(urgencyLevel);
  }

  @Get('pricing/type-info/:type')
  async getTypeInfo(@Param('type') type: TranslationType): Promise<any> {
    return this.pricingService.getTypeInfo(type);
  }

  // Admin Configuration Endpoints

  @Patch('pricing/base-rates')
  @Roles(UserRole.ADMIN)
  async updateBaseRates(@Body() rates: any): Promise<void> {
    return this.pricingService.updateBaseRates(rates);
  }

  @Patch('pricing/urgency-multipliers')
  @Roles(UserRole.ADMIN)
  async updateUrgencyMultipliers(@Body() multipliers: any): Promise<void> {
    return this.pricingService.updateUrgencyMultipliers(multipliers);
  }

  @Patch('pricing/type-multipliers')
  @Roles(UserRole.ADMIN)
  async updateTypeMultipliers(@Body() multipliers: any): Promise<void> {
    return this.pricingService.updateTypeMultipliers(multipliers);
  }

  @Patch('pricing/fixed-fees')
  @Roles(UserRole.ADMIN)
  async updateFixedFees(@Body() fees: { certificationFee?: number; minimumProjectFee?: number }): Promise<void> {
    return this.pricingService.updateFixedFees(fees);
  }

  // Utility Endpoints

  @Get('supported-file-types')
  async getSupportedFileTypes(): Promise<{ mimeTypes: string[]; extensions: string[]; maxFileSize: number }> {
    // This would typically come from the FileUploadService
    return {
      mimeTypes: [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'text/plain',
        'image/jpeg',
        'image/png',
      ],
      extensions: ['.pdf', '.doc', '.docx', '.txt', '.jpg', '.png'],
      maxFileSize: 100 * 1024 * 1024, // 100MB
    };
  }

  @Get('supported-languages')
  async getSupportedLanguages(): Promise<{ code: string; name: string }[]> {
    // This would typically come from a configuration service
    return [
      { code: 'en', name: 'English' },
      { code: 'es', name: 'Spanish' },
      { code: 'fr', name: 'French' },
      { code: 'de', name: 'German' },
      { code: 'it', name: 'Italian' },
      { code: 'pt', name: 'Portuguese' },
      { code: 'ru', name: 'Russian' },
      { code: 'zh', name: 'Chinese' },
      { code: 'ja', name: 'Japanese' },
      { code: 'ko', name: 'Korean' },
      { code: 'ar', name: 'Arabic' },
      { code: 'hi', name: 'Hindi' },
      { code: 'th', name: 'Thai' },
      { code: 'vi', name: 'Vietnamese' },
      { code: 'tr', name: 'Turkish' },
      { code: 'nl', name: 'Dutch' },
      { code: 'sv', name: 'Swedish' },
      { code: 'da', name: 'Danish' },
      { code: 'no', name: 'Norwegian' },
      { code: 'fi', name: 'Finnish' },
      { code: 'pl', name: 'Polish' },
      { code: 'cs', name: 'Czech' },
      { code: 'hu', name: 'Hungarian' },
      { code: 'ro', name: 'Romanian' },
      { code: 'bg', name: 'Bulgarian' },
      { code: 'hr', name: 'Croatian' },
      { code: 'el', name: 'Greek' },
    ];
  }
} 