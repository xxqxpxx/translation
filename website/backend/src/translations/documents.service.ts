import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Document, DocumentType, DocumentStatus } from './entities/document.entity';
import { Translation } from './entities/translation.entity';
import { User } from '../users/entities/user.entity';
import { FileUploadService, UploadedFile } from './file-upload.service';

export interface CreateDocumentDto {
  translationId: string;
  type: DocumentType;
  description?: string;
}

export interface UpdateDocumentDto {
  type?: DocumentType;
  status?: DocumentStatus;
  description?: string;
  processingNotes?: string;
  language?: string;
}

@Injectable()
export class DocumentsService {
  constructor(
    @InjectRepository(Document)
    private documentRepository: Repository<Document>,
    @InjectRepository(Translation)
    private translationRepository: Repository<Translation>,
    private fileUploadService: FileUploadService,
  ) {}

  async create(
    file: Express.Multer.File,
    createDocumentDto: CreateDocumentDto,
    user: User,
  ): Promise<Document> {
    // Verify translation exists and user has access
    const translation = await this.translationRepository.findOne({
      where: { id: createDocumentDto.translationId, isActive: true },
      relations: ['client'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${createDocumentDto.translationId} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(translation, user);

    // Upload file
    const uploadedFile: UploadedFile = await this.fileUploadService.uploadFile(file);

    // Create document record
    const document = this.documentRepository.create({
      ...createDocumentDto,
      originalName: uploadedFile.originalName,
      fileName: uploadedFile.fileName,
      filePath: uploadedFile.filePath,
      mimeType: uploadedFile.mimeType,
      fileExtension: uploadedFile.fileExtension,
      fileSize: uploadedFile.fileSize,
      fileHash: uploadedFile.fileHash,
      extractedText: uploadedFile.extractedText,
      wordCount: uploadedFile.wordCount || 0,
      characterCount: uploadedFile.characterCount || 0,
      pageCount: uploadedFile.pageCount || 1,
      metadata: uploadedFile.metadata,
      status: DocumentStatus.UPLOADED,
    });

    const savedDocument = await this.documentRepository.save(document);

    // Update translation word count if this is a source document
    if (createDocumentDto.type === DocumentType.SOURCE && uploadedFile.wordCount) {
      await this.updateTranslationWordCount(createDocumentDto.translationId, uploadedFile.wordCount, uploadedFile.characterCount || 0);
    }

    return savedDocument;
  }

  async createMultiple(
    files: Express.Multer.File[],
    createDocumentDto: CreateDocumentDto,
    user: User,
  ): Promise<Document[]> {
    // Verify translation exists and user has access
    const translation = await this.translationRepository.findOne({
      where: { id: createDocumentDto.translationId, isActive: true },
      relations: ['client'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${createDocumentDto.translationId} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(translation, user);

    // Upload files
    const uploadedFiles: UploadedFile[] = await this.fileUploadService.uploadMultipleFiles(files);

    // Create document records
    const documents = uploadedFiles.map(uploadedFile => 
      this.documentRepository.create({
        ...createDocumentDto,
        originalName: uploadedFile.originalName,
        fileName: uploadedFile.fileName,
        filePath: uploadedFile.filePath,
        mimeType: uploadedFile.mimeType,
        fileExtension: uploadedFile.fileExtension,
        fileSize: uploadedFile.fileSize,
        fileHash: uploadedFile.fileHash,
        extractedText: uploadedFile.extractedText,
        wordCount: uploadedFile.wordCount || 0,
        characterCount: uploadedFile.characterCount || 0,
        pageCount: uploadedFile.pageCount || 1,
        metadata: uploadedFile.metadata,
        status: DocumentStatus.UPLOADED,
      })
    );

    const savedDocuments = await this.documentRepository.save(documents);

    // Update translation word count for source documents
    if (createDocumentDto.type === DocumentType.SOURCE) {
      const totalWordCount = uploadedFiles.reduce((sum, file) => sum + (file.wordCount || 0), 0);
      const totalCharCount = uploadedFiles.reduce((sum, file) => sum + (file.characterCount || 0), 0);
      
      if (totalWordCount > 0) {
        await this.updateTranslationWordCount(createDocumentDto.translationId, totalWordCount, totalCharCount);
      }
    }

    return savedDocuments;
  }

  async findAll(translationId: string, user: User): Promise<Document[]> {
    // Verify translation exists and user has access
    const translation = await this.translationRepository.findOne({
      where: { id: translationId, isActive: true },
      relations: ['client'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${translationId} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(translation, user);

    return this.documentRepository.find({
      where: { translationId, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: string, user: User): Promise<Document> {
    const document = await this.documentRepository.findOne({
      where: { id, isActive: true },
      relations: ['translation', 'translation.client'],
    });

    if (!document) {
      throw new NotFoundException(`Document with ID ${id} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(document.translation, user);

    return document;
  }

  async update(id: string, updateDocumentDto: UpdateDocumentDto, user: User): Promise<Document> {
    const document = await this.findOne(id, user);

    // Only allow certain updates based on user role
    if (user.role === 'client') {
      // Clients can only update description
      if (updateDocumentDto.type || updateDocumentDto.status || updateDocumentDto.processingNotes) {
        throw new ForbiddenException('Clients can only update document description');
      }
    }

    Object.assign(document, updateDocumentDto);
    return this.documentRepository.save(document);
  }

  async remove(id: string, user: User): Promise<void> {
    const document = await this.findOne(id, user);

    // Check if user can delete this document
    if (user.role === 'client' && document.translation.clientId !== user.id) {
      throw new ForbiddenException('You can only delete your own documents');
    }

    if (document.status === DocumentStatus.PROCESSING) {
      throw new BadRequestException('Cannot delete document that is being processed');
    }

    // Soft delete
    document.isActive = false;
    await this.documentRepository.save(document);

    // Delete physical file
    await this.fileUploadService.deleteFile(document.filePath);
  }

  async download(id: string, user: User): Promise<{ buffer: Buffer; document: Document }> {
    const document = await this.findOne(id, user);

    const buffer = await this.fileUploadService.getFileBuffer(document.filePath);
    
    return { buffer, document };
  }

  async generateDownloadUrl(id: string, user: User, expirationMinutes = 60): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    const document = await this.findOne(id, user);
    
    return this.fileUploadService.generateDownloadUrl(document.filePath, expirationMinutes);
  }

  async updateStatus(id: string, status: DocumentStatus, user: User, notes?: string): Promise<Document> {
    const document = await this.findOne(id, user);

    // Only translators and admins can update status
    if (user.role !== 'admin' && user.role !== 'interpreter') {
      throw new ForbiddenException('Only translators and admins can update document status');
    }

    document.status = status;
    if (notes) {
      document.processingNotes = notes;
    }

    // Update timestamps based on status
    const now = new Date();
    document.updatedAt = now;

    return this.documentRepository.save(document);
  }

  async getStatistics(translationId: string, user: User): Promise<any> {
    // Verify translation exists and user has access
    const translation = await this.translationRepository.findOne({
      where: { id: translationId, isActive: true },
      relations: ['client'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${translationId} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(translation, user);

    const queryBuilder = this.documentRepository
      .createQueryBuilder('document')
      .where('document.translationId = :translationId AND document.isActive = true', { translationId });

    const [
      totalDocuments,
      sourceDocuments,
      translatedDocuments,
      totalFileSize,
      totalWordCount,
    ] = await Promise.all([
      queryBuilder.getCount(),
      queryBuilder.clone().andWhere('document.type = :type', { type: DocumentType.SOURCE }).getCount(),
      queryBuilder.clone().andWhere('document.type = :type', { type: DocumentType.TRANSLATED }).getCount(),
      queryBuilder.clone().select('SUM(document.fileSize)', 'total').getRawOne().then(result => parseInt(result.total) || 0),
      queryBuilder.clone().select('SUM(document.wordCount)', 'total').getRawOne().then(result => parseInt(result.total) || 0),
    ]);

    return {
      totalDocuments,
      sourceDocuments,
      translatedDocuments,
      totalFileSize,
      totalWordCount,
    };
  }

  async findByType(translationId: string, type: DocumentType, user: User): Promise<Document[]> {
    // Verify translation exists and user has access
    const translation = await this.translationRepository.findOne({
      where: { id: translationId, isActive: true },
      relations: ['client'],
    });

    if (!translation) {
      throw new NotFoundException(`Translation with ID ${translationId} not found`);
    }

    // Check access permissions
    this.checkAccessPermission(translation, user);

    return this.documentRepository.find({
      where: { translationId, type, isActive: true },
      order: { createdAt: 'DESC' },
    });
  }

  private async updateTranslationWordCount(translationId: string, additionalWordCount: number, additionalCharCount: number): Promise<void> {
    const translation = await this.translationRepository.findOne({
      where: { id: translationId },
    });

    if (translation) {
      translation.wordCount += additionalWordCount;
      translation.characterCount += additionalCharCount;
      await this.translationRepository.save(translation);
    }
  }

  private checkAccessPermission(translation: Translation, user: User): void {
    if (user.role === 'admin') {
      return; // Admins can access everything
    }

    if (user.role === 'client' && translation.clientId !== user.id) {
      throw new ForbiddenException('You can only access documents from your own translations');
    }

    if (
      user.role === 'interpreter' &&
      translation.translatorId !== user.id &&
      translation.reviewerId !== user.id
    ) {
      throw new ForbiddenException('You can only access documents from translations assigned to you');
    }
  }
} 