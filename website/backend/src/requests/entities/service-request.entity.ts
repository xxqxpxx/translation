import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum ServiceType {
  TRANSLATION = 'translation',
  IN_PERSON_INTERPRETATION = 'in_person_interpretation',
  PHONE_INTERPRETATION = 'phone_interpretation',
  VIDEO_INTERPRETATION = 'video_interpretation',
}

export enum RequestStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  REJECTED = 'rejected',
}

export interface LanguagePair {
  source: string;
  target: string;
}

@Entity('service_requests')
export class ServiceRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'client_id' })
  clientId: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column({ name: 'interpreter_id', nullable: true })
  interpreterId?: string;

  @ManyToOne(() => User, { eager: false, nullable: true })
  @JoinColumn({ name: 'interpreter_id' })
  interpreter?: User;

  @Column({
    type: 'enum',
    enum: ServiceType,
  })
  serviceType: ServiceType;

  @Column({ type: 'jsonb' })
  language: LanguagePair;

  @Column({
    type: 'enum',
    enum: RequestStatus,
    default: RequestStatus.PENDING,
  })
  status: RequestStatus;

  @Column({ name: 'scheduled_at', type: 'timestamp', nullable: true })
  scheduledAt?: Date;

  @Column({ name: 'estimated_duration', nullable: true })
  estimatedDuration?: number; // in minutes

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ name: 'total_cost', type: 'decimal', precision: 10, scale: 2, nullable: true })
  totalCost?: number;

  @Column({ name: 'word_count', nullable: true })
  wordCount?: number; // for translation requests

  @Column({ name: 'urgency_level', default: 'normal' })
  urgencyLevel: 'low' | 'normal' | 'high' | 'urgent';

  @Column({ type: 'jsonb', nullable: true })
  files?: { name: string; url: string; size: number }[];

  @Column({ type: 'jsonb', nullable: true })
  requirements?: Record<string, any>; // special requirements

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
} 