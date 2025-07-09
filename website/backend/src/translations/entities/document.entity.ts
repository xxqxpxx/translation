import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { Translation } from './translation.entity';

export enum DocumentType {
  SOURCE = 'source',           // Original document to be translated
  TRANSLATED = 'translated',   // Completed translation
  REFERENCE = 'reference',     // Reference materials
  CERTIFICATION = 'certification', // Certification documents
}

export enum DocumentStatus {
  UPLOADED = 'uploaded',
  PROCESSING = 'processing',
  READY = 'ready',
  TRANSLATED = 'translated',
  REVIEWED = 'reviewed',
  DELIVERED = 'delivered',
  ARCHIVED = 'archived',
}

@Entity('documents')
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  originalName: string;

  @Column({ type: 'varchar', length: 255 })
  fileName: string; // Stored filename (usually UUID + extension)

  @Column({ type: 'varchar', length: 500 })
  filePath: string;

  @Column({ type: 'varchar', length: 100 })
  mimeType: string;

  @Column({ type: 'varchar', length: 10 })
  fileExtension: string;

  @Column({ type: 'bigint' })
  fileSize: number; // in bytes

  @Column({ type: 'varchar', length: 64, nullable: true })
  fileHash: string; // SHA-256 hash for integrity verification

  @Column({
    type: 'enum',
    enum: DocumentType,
    default: DocumentType.SOURCE,
  })
  type: DocumentType;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.UPLOADED,
  })
  status: DocumentStatus;

  @Column({ type: 'text', nullable: true })
  extractedText: string; // Text content extracted from document

  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'int', default: 0 })
  characterCount: number;

  @Column({ type: 'int', default: 1 })
  pageCount: number;

  @Column({ type: 'varchar', length: 10, nullable: true })
  language: string; // Detected or specified language

  @Column({ type: 'text', nullable: true })
  processingNotes: string;

  @Column({ type: 'json', nullable: true })
  metadata: Record<string, any>; // Additional file metadata

  @Column({ type: 'varchar', length: 500, nullable: true })
  downloadUrl: string; // Signed URL for download

  @Column({ type: 'timestamp', nullable: true })
  downloadExpiresAt: Date;

  @Column({ type: 'boolean', default: false })
  isEncrypted: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @Column({ type: 'text', nullable: true })
  description: string;

  // Relationships
  @ManyToOne(() => Translation, translation => translation.documents)
  @JoinColumn({ name: 'translationId' })
  translation: Translation;

  @Column({ type: 'uuid' })
  translationId: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get fileSizeFormatted(): string {
    const bytes = this.fileSize;
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  get isImage(): boolean {
    const imageTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
    return imageTypes.includes(this.mimeType);
  }

  get isPdf(): boolean {
    return this.mimeType === 'application/pdf';
  }

  get isDocument(): boolean {
    const docTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
      'text/rtf',
    ];
    return docTypes.includes(this.mimeType);
  }

  get canPreview(): boolean {
    return this.isImage || this.isPdf || this.mimeType === 'text/plain';
  }
} 