import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
  CreateDateColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Document } from './document.entity';

export enum TranslationStatus {
  PENDING = 'pending',
  QUOTED = 'quoted',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  UNDER_REVIEW = 'under_review',
  COMPLETED = 'completed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export enum TranslationType {
  DOCUMENT = 'document',
  WEBSITE = 'website',
  LEGAL = 'legal',
  MEDICAL = 'medical',
  TECHNICAL = 'technical',
  MARKETING = 'marketing',
  ACADEMIC = 'academic',
  GENERAL = 'general',
}

export enum UrgencyLevel {
  STANDARD = 'standard',        // 5-7 business days
  RUSH = 'rush',               // 2-3 business days
  URGENT = 'urgent',           // 24-48 hours
  EMERGENCY = 'emergency',     // Same day
}

@Entity('translations')
export class Translation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: TranslationStatus,
    default: TranslationStatus.PENDING,
  })
  status: TranslationStatus;

  @Column({
    type: 'enum',
    enum: TranslationType,
    default: TranslationType.GENERAL,
  })
  type: TranslationType;

  @Column({
    type: 'enum',
    enum: UrgencyLevel,
    default: UrgencyLevel.STANDARD,
  })
  urgencyLevel: UrgencyLevel;

  @Column({ type: 'varchar', length: 10 })
  sourceLanguage: string; // ISO 639-1 language codes (e.g., 'en', 'fr', 'es')

  @Column({ type: 'varchar', length: 10 })
  targetLanguage: string;

  @Column({ type: 'int', default: 0 })
  wordCount: number;

  @Column({ type: 'int', default: 0 })
  characterCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  estimatedCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  finalCost: number;

  @Column({ type: 'varchar', length: 3, default: 'USD' })
  currency: string;

  @Column({ type: 'decimal', precision: 5, scale: 3, nullable: true })
  ratePerWord: number;

  @Column({ type: 'text', nullable: true })
  specialInstructions: string;

  @Column({ type: 'timestamp', nullable: true })
  requestedDeliveryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  estimatedDeliveryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  actualDeliveryDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  quotedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  confirmedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'text', nullable: true })
  clientFeedback: string;

  @Column({ type: 'int', nullable: true })
  rating: number;

  @Column({ type: 'text', nullable: true })
  internalNotes: string;

  @Column({ type: 'boolean', default: false })
  requiresCertification: boolean;

  @Column({ type: 'boolean', default: false })
  isConfidential: boolean;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  // Relationships
  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'clientId' })
  client: User;

  @Column({ type: 'uuid' })
  clientId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'translatorId' })
  translator: User;

  @Column({ type: 'uuid', nullable: true })
  translatorId: string;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'reviewerId' })
  reviewer: User;

  @Column({ type: 'uuid', nullable: true })
  reviewerId: string;

  @OneToMany(() => Document, document => document.translation, { cascade: true })
  documents: Document[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Virtual properties
  get isOverdue(): boolean {
    if (!this.estimatedDeliveryDate) return false;
    return new Date() > this.estimatedDeliveryDate && 
           this.status !== TranslationStatus.COMPLETED && 
           this.status !== TranslationStatus.DELIVERED;
  }

  get daysUntilDelivery(): number | null {
    if (!this.estimatedDeliveryDate) return null;
    const today = new Date();
    const delivery = new Date(this.estimatedDeliveryDate);
    const diffTime = delivery.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  get progressPercentage(): number {
    switch (this.status) {
      case TranslationStatus.PENDING:
        return 0;
      case TranslationStatus.QUOTED:
        return 15;
      case TranslationStatus.CONFIRMED:
        return 25;
      case TranslationStatus.IN_PROGRESS:
        return 60;
      case TranslationStatus.UNDER_REVIEW:
        return 85;
      case TranslationStatus.COMPLETED:
        return 95;
      case TranslationStatus.DELIVERED:
        return 100;
      case TranslationStatus.CANCELLED:
        return 0;
      default:
        return 0;
    }
  }
} 