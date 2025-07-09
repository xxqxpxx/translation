import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Interpreter, SessionType, InterpreterSpecialization } from '../../interpreters/entities/interpreter.entity';

export enum InterpreterSessionStatus {
  REQUESTED = 'requested',
  CONFIRMED = 'confirmed',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
  RESCHEDULED = 'rescheduled',
}

export enum CancellationReason {
  CLIENT_REQUEST = 'client_request',
  INTERPRETER_UNAVAILABLE = 'interpreter_unavailable',
  TECHNICAL_ISSUES = 'technical_issues',
  EMERGENCY = 'emergency',
  NO_SHOW = 'no_show',
  OTHER = 'other',
}

export interface SessionLocation {
  type: 'address' | 'online' | 'phone';
  address?: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    additionalInfo?: string;
  };
  meetingUrl?: string;
  phoneNumber?: string;
  accessCode?: string;
}

export interface SessionRating {
  overall: number; // 1-5 stars
  punctuality: number;
  professionalism: number;
  accuracy: number;
  communication: number;
  comment?: string;
  ratedAt: Date;
}

export interface SessionRequirements {
  subjectMatter: string;
  documents?: string[]; // File URLs or IDs
  specialInstructions?: string;
  technicalTerminology?: string[];
  culturalConsiderations?: string;
  dresscode?: 'business' | 'casual' | 'formal';
}

@Entity('interpreter_sessions')
@Index(['status', 'scheduledStartTime'])
@Index(['clientId', 'status'])
@Index(['interpreterId', 'status'])
@Index(['sessionType'])
export class InterpreterSession {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, { eager: true })
  @JoinColumn({ name: 'client_id' })
  client: User;

  @Column({ type: 'uuid', name: 'client_id' })
  clientId: string;

  @ManyToOne(() => Interpreter, interpreter => interpreter.sessions, { eager: true })
  @JoinColumn({ name: 'interpreter_id' })
  interpreter: Interpreter;

  @Column({ type: 'uuid', name: 'interpreter_id', nullable: true })
  interpreterId: string;

  @Column({
    type: 'enum',
    enum: InterpreterSessionStatus,
    default: InterpreterSessionStatus.REQUESTED,
  })
  status: InterpreterSessionStatus;

  @Column({
    type: 'enum',
    enum: SessionType,
  })
  sessionType: SessionType;

  @Column({
    type: 'enum',
    enum: InterpreterSpecialization,
    default: InterpreterSpecialization.GENERAL,
  })
  specialization: InterpreterSpecialization;

  @Column({ type: 'varchar', length: 10 })
  sourceLanguage: string;

  @Column({ type: 'varchar', length: 10 })
  targetLanguage: string;

  @Column({ type: 'timestamp with time zone' })
  scheduledStartTime: Date;

  @Column({ type: 'timestamp with time zone' })
  scheduledEndTime: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actualStartTime: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  actualEndTime: Date;

  @Column({ type: 'int', default: 60 }) // Duration in minutes
  estimatedDuration: number;

  @Column({ type: 'int', nullable: true }) // Actual duration in minutes
  actualDuration: number;

  @Column('jsonb')
  location: SessionLocation;

  @Column('jsonb', { nullable: true })
  requirements: SessionRequirements;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  hourlyRate: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  totalCost: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  additionalFees: number; // Travel, equipment, etc.

  @Column({ type: 'boolean', default: false })
  isPaid: boolean;

  @Column({ type: 'timestamp with time zone', nullable: true })
  paidAt: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  paymentId: string; // Stripe payment ID

  @Column('jsonb', { nullable: true })
  clientRating: SessionRating;

  @Column('jsonb', { nullable: true })
  interpreterRating: SessionRating; // Interpreter rating of client

  @Column({ type: 'text', nullable: true })
  sessionNotes: string; // Notes taken during session

  @Column({ type: 'text', nullable: true })
  cancellationReason: string;

  @Column({
    type: 'enum',
    enum: CancellationReason,
    nullable: true,
  })
  cancellationCategory: CancellationReason;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelledAt: Date;

  @Column({ type: 'uuid', nullable: true })
  cancelledBy: string; // User ID who cancelled

  @Column({ type: 'text', nullable: true })
  recordingUrl: string; // For recorded sessions (if permitted)

  @Column({ type: 'boolean', default: false })
  recordingPermitted: boolean;

  @Column('jsonb', { nullable: true })
  participants: {
    name: string;
    role: string;
    email?: string;
  }[]; // Additional participants

  @Column({ type: 'boolean', default: false })
  isRescheduled: boolean;

  @Column({ type: 'uuid', nullable: true })
  originalSessionId: string; // Link to original session if rescheduled

  @Column({ type: 'uuid', nullable: true })
  rescheduledSessionId: string; // Link to new session if rescheduled

  @Column({ type: 'int', default: 0 })
  rescheduledCount: number;

  @Column({ type: 'boolean', default: false })
  requiresFollowUp: boolean;

  @Column({ type: 'text', nullable: true })
  followUpNotes: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  followUpDate: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  getDuration(): number {
    if (this.actualStartTime && this.actualEndTime) {
      return Math.round((this.actualEndTime.getTime() - this.actualStartTime.getTime()) / (1000 * 60));
    }
    return this.estimatedDuration;
  }

  calculateTotalCost(): number {
    const duration = this.getDuration();
    const cost = (duration / 60) * this.hourlyRate + this.additionalFees;
    return Math.round(cost * 100) / 100; // Round to 2 decimal places
  }

  canBeCancelled(): boolean {
    const now = new Date();
    const hoursUntilSession = (this.scheduledStartTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // Can cancel up to 24 hours before for regular sessions
    // Can cancel up to 2 hours before for emergency sessions
    const minimumHours = this.requirements?.specialInstructions?.includes('emergency') ? 2 : 24;
    
    return hoursUntilSession >= minimumHours && 
           this.status !== InterpreterSessionStatus.COMPLETED && 
           this.status !== InterpreterSessionStatus.CANCELLED;
  }

  canBeRescheduled(): boolean {
    return this.canBeCancelled() && this.rescheduledCount < 3;
  }

  isActive(): boolean {
    return this.status === InterpreterSessionStatus.IN_PROGRESS;
  }

  isUpcoming(): boolean {
    const now = new Date();
    return this.scheduledStartTime > now && 
           (this.status === InterpreterSessionStatus.CONFIRMED || this.status === InterpreterSessionStatus.REQUESTED);
  }

  needsPayment(): boolean {
    return !this.isPaid && 
           (this.status === InterpreterSessionStatus.COMPLETED || this.status === InterpreterSessionStatus.CONFIRMED);
  }

  updateStatus(newStatus: InterpreterSessionStatus): void {
    this.status = newStatus;
    
    if (newStatus === InterpreterSessionStatus.IN_PROGRESS && !this.actualStartTime) {
      this.actualStartTime = new Date();
    }
    
    if (newStatus === InterpreterSessionStatus.COMPLETED && !this.actualEndTime) {
      this.actualEndTime = new Date();
      this.actualDuration = this.getDuration();
      this.totalCost = this.calculateTotalCost();
    }
  }
} 