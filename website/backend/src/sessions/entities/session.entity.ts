import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ServiceRequest } from '../../requests/entities/service-request.entity';

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

@Entity('sessions')
export class Session {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'request_id' })
  requestId: string;

  @ManyToOne(() => ServiceRequest, { eager: false })
  @JoinColumn({ name: 'request_id' })
  request: ServiceRequest;

  @Column({ name: 'started_at', type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ name: 'ended_at', type: 'timestamp', nullable: true })
  endedAt?: Date;

  @Column({ nullable: true })
  duration?: number; // in minutes

  @Column({
    type: 'enum',
    enum: SessionStatus,
    default: SessionStatus.SCHEDULED,
  })
  status: SessionStatus;

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'session_url', nullable: true })
  sessionUrl?: string; // for video calls

  @Column({ name: 'recording_url', nullable: true })
  recordingUrl?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>; // session-specific data

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // Virtual field for actual duration
  get actualDuration(): number | null {
    if (this.startedAt && this.endedAt) {
      return Math.floor((this.endedAt.getTime() - this.startedAt.getTime()) / (1000 * 60));
    }
    return null;
  }
} 