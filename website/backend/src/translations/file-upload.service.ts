import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { promises as fs } from 'fs';
import { join, extname } from 'path';
import { v4 as uuidv4 } from 'uuid';

export interface UploadedFile {
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileExtension: string;
  fileSize: number;
  fileHash: string;
  extractedText?: string;
  wordCount?: number;
  characterCount?: number;
  pageCount?: number;
  metadata?: Record<string, any>;
}

export interface FileValidationOptions {
  maxFileSize?: number; // in bytes
  allowedMimeTypes?: string[];
  allowedExtensions?: string[];
  maxFiles?: number;
}

@Injectable()
export class FileUploadService {
  private readonly uploadPath = process.env.UPLOAD_PATH || './uploads/documents';
  private readonly maxFileSize = 100 * 1024 * 1024; // 100MB

  // Supported file types for translation
  private readonly allowedMimeTypes = [
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/rtf',
    'application/rtf',
    
    // Images (for OCR processing)
    'image/jpeg',
    'image/png',
    'image/tiff',
    'image/bmp',
    
    // Other formats
    'application/vnd.oasis.opendocument.text',
    'application/vnd.oasis.opendocument.spreadsheet',
    'application/vnd.oasis.opendocument.presentation',
  ];

  private readonly allowedExtensions = [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.rtf', '.odt', '.ods', '.odp',
    '.jpg', '.jpeg', '.png', '.tiff', '.bmp',
  ];

  constructor() {
    this.ensureUploadDirectoryExists();
  }

  async uploadFile(
    file: Express.Multer.File,
    validationOptions?: FileValidationOptions,
  ): Promise<UploadedFile> {
    try {
      // Validate file
      this.validateFile(file, validationOptions);

      // Generate unique filename
      const fileExtension = extname(file.originalname).toLowerCase();
      const fileName = `${uuidv4()}${fileExtension}`;
      const filePath = join(this.uploadPath, fileName);

      // Calculate file hash
      const fileHash = await this.calculateFileHash(file.buffer);

      // Save file to disk
      await fs.writeFile(filePath, file.buffer);

      // Extract text content
      const extractedText = await this.extractText(filePath, file.mimetype);
      const { wordCount, characterCount } = this.analyzeText(extractedText);

      // Get additional metadata
      const metadata = await this.extractMetadata(filePath, file.mimetype);

      const uploadedFile: UploadedFile = {
        originalName: file.originalname,
        fileName,
        filePath,
        mimeType: file.mimetype,
        fileExtension,
        fileSize: file.size,
        fileHash,
        extractedText,
        wordCount,
        characterCount,
        pageCount: metadata.pageCount || 1,
        metadata,
      };

      return uploadedFile;
    } catch (error) {
      console.error('File upload error:', error);
      throw new InternalServerErrorException('Failed to upload file');
    }
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    validationOptions?: FileValidationOptions,
  ): Promise<UploadedFile[]> {
    if (validationOptions?.maxFiles && files.length > validationOptions.maxFiles) {
      throw new BadRequestException(`Maximum ${validationOptions.maxFiles} files allowed`);
    }

    const uploadPromises = files.map(file => this.uploadFile(file, validationOptions));
    return Promise.all(uploadPromises);
  }

  async deleteFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch (error) {
      console.error('File deletion error:', error);
      // Don't throw error if file doesn't exist
    }
  }

  async getFileBuffer(filePath: string): Promise<Buffer> {
    try {
      return await fs.readFile(filePath);
    } catch (error) {
      throw new BadRequestException('File not found');
    }
  }

  async generateDownloadUrl(filePath: string, expirationMinutes = 60): Promise<{
    url: string;
    expiresAt: Date;
  }> {
    // In a real implementation, this would generate a signed URL
    // For now, we'll return a simple path-based URL
    const token = this.generateDownloadToken(filePath, expirationMinutes);
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);
    
    return {
      url: `/api/translations/download/${token}`,
      expiresAt,
    };
  }

  private validateFile(file: Express.Multer.File, options?: FileValidationOptions): void {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    // Check file size
    const maxSize = options?.maxFileSize || this.maxFileSize;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size exceeds maximum allowed size of ${this.formatFileSize(maxSize)}`,
      );
    }

    // Check MIME type
    const allowedTypes = options?.allowedMimeTypes || this.allowedMimeTypes;
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `File type ${file.mimetype} is not supported. Allowed types: ${allowedTypes.join(', ')}`,
      );
    }

    // Check file extension
    const fileExtension = extname(file.originalname).toLowerCase();
    const allowedExts = options?.allowedExtensions || this.allowedExtensions;
    if (!allowedExts.includes(fileExtension)) {
      throw new BadRequestException(
        `File extension ${fileExtension} is not supported. Allowed extensions: ${allowedExts.join(', ')}`,
      );
    }

    // Check for malicious files (basic check)
    if (this.isSuspiciousFile(file)) {
      throw new BadRequestException('File appears to be malicious or corrupted');
    }
  }

  private async calculateFileHash(buffer: Buffer): Promise<string> {
    return createHash('sha256').update(buffer).digest('hex');
  }

  private async extractText(filePath: string, mimeType: string): Promise<string> {
    try {
      switch (mimeType) {
        case 'text/plain':
          return await this.extractTextFromPlainText(filePath);
        case 'application/pdf':
          return await this.extractTextFromPdf(filePath);
        case 'application/msword':
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
          return await this.extractTextFromWord(filePath);
        default:
          return ''; // For unsupported types, return empty string
      }
    } catch (error) {
      console.error('Text extraction error:', error);
      return ''; // Return empty string if extraction fails
    }
  }

  private async extractTextFromPlainText(filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8');
  }

  private async extractTextFromPdf(filePath: string): Promise<string> {
    // In a real implementation, you would use a PDF parsing library like pdf-parse
    // For now, return placeholder text
    return '[PDF content - text extraction not implemented yet]';
  }

  private async extractTextFromWord(filePath: string): Promise<string> {
    // In a real implementation, you would use a library like mammoth for .docx files
    // For now, return placeholder text
    return '[Word document content - text extraction not implemented yet]';
  }

  private analyzeText(text: string): { wordCount: number; characterCount: number } {
    if (!text) {
      return { wordCount: 0, characterCount: 0 };
    }

    const characterCount = text.length;
    
    // Count words (split by whitespace and filter empty strings)
    const words = text.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;

    return { wordCount, characterCount };
  }

  private async extractMetadata(filePath: string, mimeType: string): Promise<Record<string, any>> {
    const metadata: Record<string, any> = {
      mimeType,
      extractedAt: new Date().toISOString(),
    };

    try {
      const stats = await fs.stat(filePath);
      metadata.createdAt = stats.birthtime;
      metadata.modifiedAt = stats.mtime;
      metadata.fileSize = stats.size;
    } catch (error) {
      console.error('Metadata extraction error:', error);
    }

    // Add type-specific metadata
    switch (mimeType) {
      case 'application/pdf':
        metadata.pageCount = await this.getPdfPageCount(filePath);
        break;
      case 'image/jpeg':
      case 'image/png':
        metadata.imageInfo = await this.getImageInfo(filePath);
        break;
    }

    return metadata;
  }

  private async getPdfPageCount(filePath: string): Promise<number> {
    // In a real implementation, you would use a PDF library to get page count
    // For now, return 1 as placeholder
    return 1;
  }

  private async getImageInfo(filePath: string): Promise<Record<string, any>> {
    // In a real implementation, you would use an image library to get dimensions, etc.
    // For now, return basic info
    return {
      type: 'image',
      // width, height, etc. would be extracted here
    };
  }

  private isSuspiciousFile(file: Express.Multer.File): boolean {
    // Basic suspicious file checks
    const suspiciousExtensions = ['.exe', '.bat', '.cmd', '.scr', '.pif', '.com'];
    const fileExtension = extname(file.originalname).toLowerCase();
    
    if (suspiciousExtensions.includes(fileExtension)) {
      return true;
    }

    // Check for suspicious MIME types
    const suspiciousMimeTypes = ['application/x-executable', 'application/x-msdownload'];
    if (suspiciousMimeTypes.includes(file.mimetype)) {
      return true;
    }

    // Check file size (empty files or unreasonably large files)
    if (file.size === 0 || file.size > this.maxFileSize) {
      return true;
    }

    return false;
  }

  private generateDownloadToken(filePath: string, expirationMinutes: number): string {
    // In a real implementation, this would generate a proper JWT token
    // For now, use a simple base64 encoding
    const data = {
      filePath,
      expiresAt: Date.now() + expirationMinutes * 60 * 1000,
    };
    return Buffer.from(JSON.stringify(data)).toString('base64');
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private async ensureUploadDirectoryExists(): Promise<void> {
    try {
      await fs.mkdir(this.uploadPath, { recursive: true });
    } catch (error) {
      console.error('Failed to create upload directory:', error);
    }
  }

  // Public utility methods
  getSupportedMimeTypes(): string[] {
    return [...this.allowedMimeTypes];
  }

  getSupportedExtensions(): string[] {
    return [...this.allowedExtensions];
  }

  getMaxFileSize(): number {
    return this.maxFileSize;
  }
} 