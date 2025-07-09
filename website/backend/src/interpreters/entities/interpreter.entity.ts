import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { InterpreterSession } from '../../sessions/entities/interpreter-session.entity';

export enum InterpreterStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  PENDING_APPROVAL = 'pending_approval',
  SUSPENDED = 'suspended',
}

export enum InterpreterSpecialization {
  MEDICAL = 'medical',
  LEGAL = 'legal',
  BUSINESS = 'business',
  TECHNICAL = 'technical',
  ACADEMIC = 'academic',
  GOVERNMENT = 'government',
  CONFERENCE = 'conference',
  COMMUNITY = 'community',
  GENERAL = 'general',
}

export enum SessionType {
  IN_PERSON = 'in_person',
  PHONE = 'phone',
  VIDEO = 'video',
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  BREAK = 'break',
  OFFLINE = 'offline',
}

export interface LanguageProficiency {
  language: string;
  proficiencyLevel: 'native' | 'fluent' | 'advanced' | 'intermediate';
  certifications: string[];
}

export interface AvailabilitySchedule {
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  timezone: string;
}

export interface RateStructure {
  hourlyRate: number;
  minimumHours: number;
  sessionTypes: {
    [key in SessionType]: {
      rate: number;
      minimumDuration: number;
    };
  };
  specializations: {
    [key in InterpreterSpecialization]?: {
      multiplier: number;
    };
  };
}

@Entity('interpreters')
@Index(['status', 'languages'])
@Index(['specializations'])
@Index(['currentAvailabilityStatus'])
export class Interpreter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, { eager: true })
  @JoinColumn()
  user: User;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({
    type: 'enum',
    enum: InterpreterStatus,
    default: InterpreterStatus.PENDING_APPROVAL,
  })
  status: InterpreterStatus;

  @Column('jsonb')
  languages: LanguageProficiency[];

  @Column({
    type: 'enum',
    enum: InterpreterSpecialization,
    array: true,
    default: [InterpreterSpecialization.GENERAL],
  })
  specializations: InterpreterSpecialization[];

  @Column({
    type: 'enum',
    enum: SessionType,
    array: true,
    default: [SessionType.PHONE, SessionType.VIDEO],
  })
  supportedSessionTypes: SessionType[];

  @Column('jsonb')
  rateStructure: RateStructure;

  @Column('jsonb', { nullable: true })
  weeklySchedule: AvailabilitySchedule[];

  @Column({
    type: 'enum',
    enum: AvailabilityStatus,
    default: AvailabilityStatus.OFFLINE,
  })
  currentAvailabilityStatus: AvailabilityStatus;

  @Column({ type: 'text', nullable: true })
  bio: string;

  @Column('jsonb', { nullable: true })
  certifications: {
    name: string;
    issuingBody: string;
    dateIssued: Date;
    expiryDate?: Date;
    credentialId?: string;
  }[];

  @Column('jsonb', { nullable: true })
  workExperience: {
    company: string;
    position: string;
    startDate: Date;
    endDate?: Date;
    description: string;
  }[];

  @Column({ type: 'text', nullable: true })
  portfolioUrl: string;

  @Column({ type: 'text', nullable: true })
  linkedinUrl: string;

  @Column({ type: 'int', default: 0 })
  totalSessionsCompleted: number;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  averageRating: number;

  @Column({ type: 'int', default: 0 })
  totalRatings: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  totalEarnings: number;

  @Column({ type: 'boolean', default: false })
  isVerified: boolean;

  @Column({ type: 'boolean', default: false })
  backgroundCheckCompleted: boolean;

  @Column({ type: 'date', nullable: true })
  backgroundCheckDate: Date;

  @Column({ type: 'date', nullable: true })
  lastActiveDate: Date;

  @Column('jsonb', { nullable: true })
  preferredClients: string[]; // Array of client user IDs

  @Column('jsonb', { nullable: true })
  blockedClients: string[]; // Array of blocked client user IDs

  @OneToMany(() => InterpreterSession, session => session.interpreter)
  sessions: InterpreterSession[];

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  // Helper methods
  isAvailableForSession(sessionType: SessionType, date: Date): boolean {
    if (this.status !== InterpreterStatus.ACTIVE) {
      return false;
    }

    if (!this.supportedSessionTypes.includes(sessionType)) {
      return false;
    }

    if (this.currentAvailabilityStatus !== AvailabilityStatus.AVAILABLE) {
      return false;
    }

    return this.isAvailableAtTime(date);
  }

  private isAvailableAtTime(date: Date): boolean {
    if (!this.weeklySchedule) return false;

    const dayOfWeek = date.getDay();
    const timeStr = date.toTimeString().slice(0, 5); // HH:mm format

    const daySchedule = this.weeklySchedule.find(
      schedule => schedule.dayOfWeek === dayOfWeek
    );

    if (!daySchedule) return false;

    return timeStr >= daySchedule.startTime && timeStr <= daySchedule.endTime;
  }

  getRateForSession(sessionType: SessionType, specialization?: InterpreterSpecialization): number {
    const baseRate = this.rateStructure.sessionTypes[sessionType]?.rate || this.rateStructure.hourlyRate;
    
    if (specialization && this.rateStructure.specializations[specialization]) {
      return baseRate * this.rateStructure.specializations[specialization].multiplier;
    }

    return baseRate;
  }

  updateRating(newRating: number): void {
    const totalScore = this.averageRating * this.totalRatings + newRating;
    this.totalRatings += 1;
    this.averageRating = totalScore / this.totalRatings;
  }
} 