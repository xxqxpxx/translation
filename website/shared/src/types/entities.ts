// Base entity interface
export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// User types
export interface User extends BaseEntity {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
}

export enum UserRole {
  CLIENT = 'client',
  INTERPRETER = 'interpreter',
  ADMIN = 'admin',
}

// Service request types
export interface ServiceRequest extends BaseEntity {
  clientId: string;
  interpreterId?: string;
  serviceType: ServiceType;
  language: LanguagePair;
  status: RequestStatus;
  scheduledAt?: Date;
  estimatedDuration?: number;
  description?: string;
  totalCost?: number;
}

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

// Session types
export interface Session extends BaseEntity {
  requestId: string;
  startedAt?: Date;
  endedAt?: Date;
  duration?: number;
  status: SessionStatus;
  notes?: string;
}

export enum SessionStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  NO_SHOW = 'no_show',
}

// Configuration types for deployment customization
export interface PlatformConfig {
  branding: BrandingConfig;
  features: FeatureConfig;
  pricing: PricingConfig;
}

export interface BrandingConfig {
  companyName: string;
  logo?: string;
  primaryColor: string;
  secondaryColor: string;
  customDomain?: string;
}

export interface FeatureConfig {
  enableTranslation: boolean;
  enableInPersonInterpretation: boolean;
  enablePhoneInterpretation: boolean;
  enableVideoInterpretation: boolean;
  enableRecording: boolean;
  enableAnalytics: boolean;
}

export interface PricingConfig {
  translationRate: number; // per word
  inPersonRate: number; // per hour
  phoneRate: number; // per hour
  videoRate: number; // per minute
  currency: string;
}

// Translation Types
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

export interface Translation {
  id: string;
  title: string;
  description?: string;
  status: TranslationStatus;
  type: TranslationType;
  urgencyLevel: UrgencyLevel;
  sourceLanguage: string;
  targetLanguage: string;
  wordCount: number;
  characterCount: number;
  estimatedCost?: number;
  finalCost?: number;
  currency: string;
  ratePerWord?: number;
  specialInstructions?: string;
  requestedDeliveryDate?: Date;
  estimatedDeliveryDate?: Date;
  actualDeliveryDate?: Date;
  quotedAt?: Date;
  confirmedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  clientFeedback?: string;
  rating?: number;
  internalNotes?: string;
  requiresCertification: boolean;
  isConfidential: boolean;
  isActive: boolean;

  // Relationships
  clientId: string;
  client?: User;
  translatorId?: string;
  translator?: User;
  reviewerId?: string;
  reviewer?: User;
  documents?: Document[];

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  isOverdue?: boolean;
  daysUntilDelivery?: number;
  progressPercentage?: number;
}

// Document Types
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

export interface Document {
  id: string;
  originalName: string;
  fileName: string;
  filePath: string;
  mimeType: string;
  fileExtension: string;
  fileSize: number;
  fileHash?: string;
  type: DocumentType;
  status: DocumentStatus;
  extractedText?: string;
  wordCount: number;
  characterCount: number;
  pageCount: number;
  language?: string;
  processingNotes?: string;
  metadata?: Record<string, any>;
  downloadUrl?: string;
  downloadExpiresAt?: Date;
  isEncrypted: boolean;
  isActive: boolean;
  description?: string;

  // Relationships
  translationId: string;
  translation?: Translation;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;

  // Virtual properties
  fileSizeFormatted?: string;
  isImage?: boolean;
  isPdf?: boolean;
  isDocument?: boolean;
  canPreview?: boolean;
} 