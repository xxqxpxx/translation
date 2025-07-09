# API Standardization - LinguaLink Platform
## Complete Implementation Guide for Production Readiness

### Overview

This document provides the complete implementation specifications for standardizing the LinguaLink API according to production-ready standards. All implementations must be followed exactly to ensure consistency, security, and maintainability.

## 1. Standardized API Response Format

### Core Response Interface
```typescript
// src/common/interfaces/api-response.interface.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code: string;
    field?: string;
    details?: any;
  };
  meta?: {
    pagination?: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp?: string;
    requestId?: string;
  };
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
    timestamp: string;
    requestId: string;
  };
}
```

### Response Wrapper Service
```typescript
// src/common/services/response-wrapper.service.ts
import { Injectable } from '@nestjs/common';
import { ApiResponse, PaginatedResponse } from '../interfaces/api-response.interface';

@Injectable()
export class ResponseWrapperService {
  success<T>(data: T, meta?: Partial<ApiResponse<T>['meta']>): ApiResponse<T> {
    return {
      success: true,
      data,
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
        ...meta,
      },
    };
  }

  paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number
  ): PaginatedResponse<T> {
    const totalPages = Math.ceil(total / limit);
    
    return {
      success: true,
      data,
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      },
    };
  }

  error(
    message: string,
    code: string,
    field?: string,
    details?: any
  ): ApiResponse<null> {
    return {
      success: false,
      error: {
        message,
        code,
        field,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
        requestId: this.generateRequestId(),
      },
    };
  }

  private generateRequestId(): string {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
```

### Response Transform Interceptor
```typescript
// src/common/interceptors/response-transform.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ResponseWrapperService } from '../services/response-wrapper.service';

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  constructor(private readonly responseWrapper: ResponseWrapperService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data) => {
        // Check if response is already wrapped
        if (data && typeof data === 'object' && 'success' in data) {
          return data;
        }

        // Check if it's a paginated response
        if (data && data.items && data.pagination) {
          return this.responseWrapper.paginated(
            data.items,
            data.pagination.page,
            data.pagination.limit,
            data.pagination.total
          );
        }

        // Wrap successful response
        return this.responseWrapper.success(data);
      })
    );
  }
}
```

## 2. Comprehensive Error Handling System

### Error Codes Enum
```typescript
// src/common/enums/error-codes.enum.ts
export enum ErrorCodes {
  // Authentication Errors (AUTH_xxx)
  AUTH_INVALID_TOKEN = 'AUTH_001',
  AUTH_EXPIRED_TOKEN = 'AUTH_002',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_003',
  AUTH_USER_NOT_FOUND = 'AUTH_004',
  AUTH_INVALID_CREDENTIALS = 'AUTH_005',
  AUTH_ACCOUNT_LOCKED = 'AUTH_006',
  AUTH_MFA_REQUIRED = 'AUTH_007',

  // Validation Errors (VAL_xxx)
  VALIDATION_REQUIRED_FIELD = 'VAL_001',
  VALIDATION_INVALID_FORMAT = 'VAL_002',
  VALIDATION_BUSINESS_RULE = 'VAL_003',
  VALIDATION_DUPLICATE_VALUE = 'VAL_004',
  VALIDATION_INVALID_LENGTH = 'VAL_005',
  VALIDATION_INVALID_RANGE = 'VAL_006',
  VALIDATION_INVALID_ENUM = 'VAL_007',

  // Request Management Errors (REQ_xxx)
  REQUEST_NOT_FOUND = 'REQ_001',
  REQUEST_NOT_AVAILABLE = 'REQ_002',
  REQUEST_ALREADY_ASSIGNED = 'REQ_003',
  REQUEST_CANNOT_BE_CANCELLED = 'REQ_004',
  REQUEST_INVALID_STATUS_TRANSITION = 'REQ_005',
  REQUEST_LANGUAGE_NOT_SUPPORTED = 'REQ_006',
  REQUEST_MINIMUM_DURATION = 'REQ_007',
  REQUEST_INVALID_TIMING = 'REQ_008',

  // Interpreter Management Errors (INT_xxx)
  INTERPRETER_NOT_FOUND = 'INT_001',
  INTERPRETER_NOT_AVAILABLE = 'INT_002',
  INTERPRETER_NOT_QUALIFIED = 'INT_003',
  INTERPRETER_ALREADY_ASSIGNED = 'INT_004',
  INTERPRETER_NOT_APPROVED = 'INT_005',
  INTERPRETER_SUSPENDED = 'INT_006',

  // Session Errors (SES_xxx)
  SESSION_NOT_FOUND = 'SES_001',
  SESSION_ALREADY_STARTED = 'SES_002',
  SESSION_NOT_STARTED = 'SES_003',
  SESSION_ALREADY_COMPLETED = 'SES_004',
  SESSION_INVALID_LOCATION = 'SES_005',
  SESSION_PERMISSION_DENIED = 'SES_006',

  // File Management Errors (FILE_xxx)
  FILE_NOT_FOUND = 'FILE_001',
  FILE_UPLOAD_ERROR = 'FILE_002',
  FILE_INVALID_FORMAT = 'FILE_003',
  FILE_TOO_LARGE = 'FILE_004',
  FILE_VIRUS_DETECTED = 'FILE_005',
  FILE_PROCESSING_ERROR = 'FILE_006',
  FILE_ACCESS_DENIED = 'FILE_007',

  // Payment Errors (PAY_xxx)
  PAYMENT_PROCESSING_ERROR = 'PAY_001',
  PAYMENT_INSUFFICIENT_FUNDS = 'PAY_002',
  PAYMENT_INVALID_METHOD = 'PAY_003',
  PAYMENT_DECLINED = 'PAY_004',
  PAYMENT_REFUND_ERROR = 'PAY_005',

  // System Errors (SYS_xxx)
  DATABASE_ERROR = 'SYS_001',
  EXTERNAL_SERVICE_ERROR = 'SYS_002',
  CACHE_ERROR = 'SYS_003',
  QUEUE_ERROR = 'SYS_004',
  NETWORK_ERROR = 'SYS_005',
  CONFIGURATION_ERROR = 'SYS_006',
  RATE_LIMIT_EXCEEDED = 'SYS_007',

  // Business Logic Errors (BIZ_xxx)
  BUSINESS_RULE_VIOLATION = 'BIZ_001',
  WORKFLOW_STATE_ERROR = 'BIZ_002',
  QUOTA_EXCEEDED = 'BIZ_003',
  TIMING_CONSTRAINT_VIOLATION = 'BIZ_004',
  RESOURCE_CONFLICT = 'BIZ_005',

  // Integration Errors (INT_xxx)
  CALENDAR_SYNC_ERROR = 'INT_001',
  VIDEO_SERVICE_ERROR = 'INT_002',
  NOTIFICATION_ERROR = 'INT_003',
  TRANSLATION_SERVICE_ERROR = 'INT_004',
  STORAGE_SERVICE_ERROR = 'INT_005',
}
```

### Custom Exception Classes
```typescript
// src/common/exceptions/business.exception.ts
import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCodes } from '../enums/error-codes.enum';

export class BusinessException extends HttpException {
  constructor(
    message: string,
    code: ErrorCodes,
    field?: string,
    details?: any,
    statusCode: HttpStatus = HttpStatus.BAD_REQUEST
  ) {
    const errorResponse = {
      success: false,
      error: {
        message,
        code,
        field,
        details,
      },
      meta: {
        timestamp: new Date().toISOString(),
      },
    };

    super(errorResponse, statusCode);
  }
}

export class ValidationException extends BusinessException {
  constructor(message: string, field?: string, details?: any) {
    super(message, ErrorCodes.VALIDATION_BUSINESS_RULE, field, details);
  }
}

export class ResourceNotFoundException extends BusinessException {
  constructor(resource: string, id?: string) {
    const message = id ? `${resource} with ID ${id} not found` : `${resource} not found`;
    super(message, ErrorCodes.REQUEST_NOT_FOUND, undefined, { resource, id }, HttpStatus.NOT_FOUND);
  }
}

export class UnauthorizedException extends BusinessException {
  constructor(message: string = 'Unauthorized access') {
    super(message, ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS, undefined, undefined, HttpStatus.UNAUTHORIZED);
  }
}
```

### Global Exception Filter
```typescript
// src/common/filters/global-exception.filter.ts
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ResponseWrapperService } from '../services/response-wrapper.service';
import { ErrorCodes } from '../enums/error-codes.enum';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly responseWrapper: ResponseWrapperService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: HttpStatus;
    let message: string;
    let code: string;
    let field?: string;
    let details?: any;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'object' && 'error' in exceptionResponse) {
        // Already formatted business exception
        return response.status(status).json(exceptionResponse);
      }

      // Handle standard HTTP exceptions
      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        message = (exceptionResponse as any).message || 'An error occurred';
        details = exceptionResponse;
      }

      code = this.mapStatusToErrorCode(status);
    } else {
      // Handle unexpected errors
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Internal server error';
      code = ErrorCodes.SYS_001;

      this.logger.error(
        `Unexpected error: ${exception}`,
        exception instanceof Error ? exception.stack : undefined,
        `${request.method} ${request.url}`,
      );
    }

    const errorResponse = this.responseWrapper.error(message, code, field, details);

    response.status(status).json(errorResponse);
  }

  private mapStatusToErrorCode(status: HttpStatus): string {
    switch (status) {
      case HttpStatus.UNAUTHORIZED:
        return ErrorCodes.AUTH_INVALID_TOKEN;
      case HttpStatus.FORBIDDEN:
        return ErrorCodes.AUTH_INSUFFICIENT_PERMISSIONS;
      case HttpStatus.NOT_FOUND:
        return ErrorCodes.REQUEST_NOT_FOUND;
      case HttpStatus.BAD_REQUEST:
        return ErrorCodes.VALIDATION_INVALID_FORMAT;
      case HttpStatus.TOO_MANY_REQUESTS:
        return ErrorCodes.RATE_LIMIT_EXCEEDED;
      default:
        return ErrorCodes.SYS_001;
    }
  }
}
```

## 3. Complete DTO Validation System

### Base DTO Classes
```typescript
// src/common/dto/base.dto.ts
import { IsOptional, IsString, IsUUID } from 'class-validator';

export class BaseDto {
  @IsOptional()
  @IsUUID()
  id?: string;

  @IsOptional()
  createdAt?: Date;

  @IsOptional()
  updatedAt?: Date;
}

export class PaginationDto {
  @IsOptional()
  @IsString()
  page?: string = '1';

  @IsOptional()
  @IsString()
  limit?: string = '10';

  @IsOptional()
  @IsString()
  sortBy?: string;

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  get pageNumber(): number {
    return parseInt(this.page, 10);
  }

  get limitNumber(): number {
    return parseInt(this.limit, 10);
  }

  get offset(): number {
    return (this.pageNumber - 1) * this.limitNumber;
  }
}
```

### User Management DTOs
```typescript
// src/modules/users/dto/user.dto.ts
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsObject,
  ValidateNested,
  MinLength,
  MaxLength,
  IsPhoneNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDto } from '../../../common/dto/base.dto';
import { UserRole, UserStatus } from '../enums/user.enum';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName: string;

  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsObject()
  profile?: InterpreterProfile | ClientProfile;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  lastName?: string;

  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsObject()
  profile?: InterpreterProfile | ClientProfile;
}

export class UserApprovalDto {
  @IsEnum(UserStatus)
  status: UserStatus.ACTIVE | UserStatus.SUSPENDED | UserStatus.DEACTIVATED;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}

export class InterpreterProfile {
  @IsPhoneNumber('CA')
  phone: string;

  @IsString()
  sinNumber: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;

  @IsObject()
  languages: LanguageProficiency[];

  @IsOptional()
  @IsObject()
  rates?: InterpreterRates;
}

export class ClientProfile {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  companyName?: string;

  @IsString()
  @MaxLength(100)
  contactPerson: string;

  @IsPhoneNumber('CA')
  phone: string;

  @IsObject()
  @ValidateNested()
  @Type(() => AddressDto)
  address: AddressDto;
}

export class AddressDto {
  @IsString()
  @MaxLength(200)
  street: string;

  @IsString()
  @MaxLength(100)
  city: string;

  @IsString()
  @MaxLength(3)
  province: string;

  @IsString()
  postalCode: string;

  @IsString()
  @MaxLength(50)
  country: string = 'Canada';
}
```

### Service Request DTOs
```typescript
// src/modules/requests/dto/request.dto.ts
import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  IsDateString,
  IsUUID,
  ValidateNested,
  Min,
  Max,
  IsObject,
  IsArray,
} from 'class-validator';
import { Type } from 'class-transformer';
import { BaseDto, PaginationDto } from '../../../common/dto/base.dto';
import { ServiceType, RequestStatus } from '../enums/request.enum';

export class CreateRequestDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  languageFrom: string;

  @IsString()
  languageTo: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(30) // 30 minutes minimum
  @Max(8 * 60) // 8 hours maximum
  duration?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsObject()
  locationDetails?: any;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsString()
  specialRequirements?: string;

  @IsOptional()
  @IsObject()
  preferences?: RequestPreferences;

  @IsOptional()
  @IsArray()
  documentIds?: string[];
}

export class UpdateRequestDto {
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(30)
  duration?: number;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;
}

export class AssignInterpreterDto {
  @IsUUID()
  interpreterId: string;

  @IsOptional()
  @IsString()
  adminNotes?: string;
}

export class RequestFiltersDto extends PaginationDto {
  @IsOptional()
  @IsEnum(ServiceType)
  serviceType?: ServiceType;

  @IsOptional()
  @IsEnum(RequestStatus)
  status?: RequestStatus;

  @IsOptional()
  @IsString()
  languageFrom?: string;

  @IsOptional()
  @IsString()
  languageTo?: string;

  @IsOptional()
  @IsDateString()
  scheduledAfter?: string;

  @IsOptional()
  @IsDateString()
  scheduledBefore?: string;

  @IsOptional()
  @IsUUID()
  clientId?: string;

  @IsOptional()
  @IsUUID()
  interpreterId?: string;
}

export class RequestPreferences {
  @IsOptional()
  @IsEnum(['male', 'female', 'any'])
  genderPreference?: 'male' | 'female' | 'any';

  @IsOptional()
  @IsUUID()
  specificInterpreterId?: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high', 'urgent'])
  urgency?: 'low' | 'normal' | 'high' | 'urgent';

  @IsOptional()
  @IsString()
  specialInstructions?: string;

  @IsOptional()
  @IsArray()
  accessibilityRequirements?: string[];
}
```

### Advanced Service DTOs
```typescript
// src/modules/pricing/dto/pricing.dto.ts
import {
  IsEnum,
  IsString,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  Max,
  IsDateString,
  IsObject,
} from 'class-validator';
import { ServiceType } from '../../requests/enums/request.enum';

export class DynamicPricingConfigDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  languageFrom: string;

  @IsString()
  languageTo: string;

  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsString()
  currency?: string = 'CAD';

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  demandMultiplier?: number = 1.0;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  urgencyMultiplier?: number = 1.0;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5.0)
  complexityMultiplier?: number = 1.0;

  @IsNumber()
  @Min(0)
  minRate: number;

  @IsNumber()
  @Min(0)
  maxRate: number;

  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @IsOptional()
  @IsDateString()
  effectiveUntil?: string;
}

export class CalculateRateDto {
  @IsEnum(ServiceType)
  serviceType: ServiceType;

  @IsString()
  languageFrom: string;

  @IsString()
  languageTo: string;

  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  availableInterpretersCount?: number;

  @IsOptional()
  @IsObject()
  additionalFactors?: any;
}

// src/modules/video-quality/dto/video-quality.dto.ts
export class VideoQualityMetricsDto {
  @IsUUID()
  sessionId: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  videoBitrate?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  audioBitrate?: number;

  @IsOptional()
  @IsString()
  videoResolution?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  videoFps?: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  packetLossPercent: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  jitterMs?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  latencyMs?: number;

  @IsOptional()
  @IsEnum(['wifi', 'cellular_4g', 'cellular_5g', 'ethernet', 'unknown'])
  networkType?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  bandwidthAvailable?: number;

  @IsOptional()
  @IsNumber()
  @Min(2)
  participantsCount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  droppedConnectionCount?: number;

  @IsOptional()
  @IsObject()
  deviceInfo?: any;

  @IsOptional()
  @IsObject()
  browserInfo?: any;
}

// src/modules/document-processing/dto/document-processing.dto.ts
export class DocumentProcessingOptionsDto {
  @IsEnum(['ocr', 'format_conversion', 'text_extraction', 'validation', 'virus_scan'])
  type: string;

  @IsOptional()
  @IsString()
  outputFormat?: string;

  @IsOptional()
  @IsString()
  inputFormat?: string;

  @IsOptional()
  @IsObject()
  ocrOptions?: {
    language?: string;
    enableStructure?: boolean;
    confidenceThreshold?: number;
  };

  @IsOptional()
  @IsObject()
  conversionOptions?: {
    quality?: number;
    compression?: boolean;
    watermark?: boolean;
  };
}
```

## 4. Security Implementation

### Security Interceptor
```typescript
// src/common/interceptors/security.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class SecurityInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // Add security headers
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('X-Frame-Options', 'DENY');
    response.setHeader('X-XSS-Protection', '1; mode=block');
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.setHeader('Content-Security-Policy', "default-src 'self'");

    // Log security-relevant information
    this.logSecurityEvent(request);

    return next.handle().pipe(
      tap(() => {
        // Additional security logging on response
        this.logResponseSecurity(request, response);
      })
    );
  }

  private logSecurityEvent(request: any): void {
    const securityData = {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      method: request.method,
      url: request.url,
      timestamp: new Date().toISOString(),
    };

    // Log to security audit system
    console.log('Security Event:', securityData);
  }

  private logResponseSecurity(request: any, response: any): void {
    // Log successful/failed operations for security monitoring
    if (response.statusCode >= 400) {
      console.log('Security Alert - Failed Request:', {
        ip: request.ip,
        statusCode: response.statusCode,
        url: request.url,
        timestamp: new Date().toISOString(),
      });
    }
  }
}
```

### Rate Limiting Guard
```typescript
// src/common/guards/rate-limiting.guard.ts
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ErrorCodes } from '../enums/error-codes.enum';

interface RateLimitConfig {
  requests: number;
  windowMs: number;
  skipSuccessfulRequests?: boolean;
}

@Injectable()
export class RateLimitingGuard implements CanActivate {
  private readonly requestCounts = new Map<string, { count: number; resetTime: number }>();

  constructor(private reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const rateLimitConfig = this.reflector.get<RateLimitConfig>(
      'rateLimit',
      context.getHandler()
    );

    if (!rateLimitConfig) {
      return true; // No rate limiting configured
    }

    const key = this.generateKey(request);
    const now = Date.now();
    const windowStart = now - rateLimitConfig.windowMs;

    // Clean up expired entries
    this.cleanupExpiredEntries(windowStart);

    const requestData = this.requestCounts.get(key);

    if (!requestData || requestData.resetTime <= now) {
      // First request in window or window expired
      this.requestCounts.set(key, {
        count: 1,
        resetTime: now + rateLimitConfig.windowMs,
      });
      return true;
    }

    if (requestData.count >= rateLimitConfig.requests) {
      throw new HttpException(
        {
          success: false,
          error: {
            message: 'Rate limit exceeded',
            code: ErrorCodes.RATE_LIMIT_EXCEEDED,
          },
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }

    // Increment request count
    requestData.count++;
    return true;
  }

  private generateKey(request: any): string {
    const userId = request.user?.id || 'anonymous';
    const ip = request.ip;
    return `${userId}:${ip}`;
  }

  private cleanupExpiredEntries(windowStart: number): void {
    for (const [key, data] of this.requestCounts.entries()) {
      if (data.resetTime <= windowStart) {
        this.requestCounts.delete(key);
      }
    }
  }
}

// Decorator for rate limiting
export const RateLimit = (config: RateLimitConfig) => {
  return (target: any, propertyKey: string, descriptor: PropertyDescriptor) => {
    Reflector.createDecorator<RateLimitConfig>('rateLimit')(config)(target, propertyKey, descriptor);
  };
};
```

### Data Encryption Service
```typescript
// src/common/services/encryption.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

export interface EncryptedData {
  data: string;
  iv: string;
  tag: string;
}

@Injectable()
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key: Buffer;

  constructor(private configService: ConfigService) {
    const encryptionKey = this.configService.get<string>('ENCRYPTION_KEY');
    if (!encryptionKey) {
      throw new Error('ENCRYPTION_KEY environment variable is required');
    }
    this.key = crypto.scryptSync(encryptionKey, 'salt', 32);
  }

  encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('LinguaLink-PII', 'utf8'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      data: encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex'),
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('LinguaLink-PII', 'utf8'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.data, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    const [salt, hash] = storedHash.split(':');
    const testHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === testHash;
  }

  generateSecureToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }
}
```

## 5. Performance Optimization

### Redis Caching Service
```typescript
// src/common/services/cache.service.ts
import { Injectable, Inject } from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class CacheService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await this.redis.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error);
      return null;
    }
  }

  async set(key: string, value: any, ttl: number = 3600): Promise<void> {
    try {
      await this.redis.setex(key, ttl, JSON.stringify(value));
    } catch (error) {
      console.error('Cache set error:', error);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.redis.del(key);
    } catch (error) {
      console.error('Cache delete error:', error);
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Cache invalidate error:', error);
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      const result = await this.redis.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error);
      return false;
    }
  }

  async increment(key: string, value: number = 1, ttl?: number): Promise<number> {
    try {
      const result = await this.redis.incrby(key, value);
      if (ttl && result === value) {
        // First increment, set TTL
        await this.redis.expire(key, ttl);
      }
      return result;
    } catch (error) {
      console.error('Cache increment error:', error);
      return 0;
    }
  }
}
```

### Caching Decorator
```typescript
// src/common/decorators/cache.decorator.ts
import { SetMetadata } from '@nestjs/common';

export interface CacheOptions {
  ttl?: number; // Time to live in seconds
  key?: string; // Custom cache key
  useArgs?: boolean; // Include method arguments in cache key
}

export const CACHE_METADATA = 'cache_metadata';

export const Cache = (options: CacheOptions = {}) => 
  SetMetadata(CACHE_METADATA, {
    ttl: 3600,
    useArgs: true,
    ...options,
  });
```

### Cache Interceptor
```typescript
// src/common/interceptors/cache.interceptor.ts
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { CacheService } from '../services/cache.service';
import { CACHE_METADATA, CacheOptions } from '../decorators/cache.decorator';

@Injectable()
export class CacheInterceptor implements NestInterceptor {
  constructor(
    private cacheService: CacheService,
    private reflector: Reflector
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const cacheOptions = this.reflector.get<CacheOptions>(
      CACHE_METADATA,
      context.getHandler()
    );

    if (!cacheOptions) {
      return next.handle();
    }

    const cacheKey = this.generateCacheKey(context, cacheOptions);
    const cachedResult = await this.cacheService.get(cacheKey);

    if (cachedResult !== null) {
      return of(cachedResult);
    }

    return next.handle().pipe(
      tap(async (result) => {
        await this.cacheService.set(cacheKey, result, cacheOptions.ttl);
      })
    );
  }

  private generateCacheKey(context: ExecutionContext, options: CacheOptions): string {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler().name;
    const className = context.getClass().name;

    let key = options.key || `${className}:${handler}`;

    if (options.useArgs) {
      const args = context.getArgs();
      const argsString = JSON.stringify(args);
      key += `:${this.hashString(argsString)}`;
    }

    // Include user context if available
    if (request.user?.id) {
      key += `:user:${request.user.id}`;
    }

    return key;
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }
}
```

## 6. Updated Controller Examples

### Standardized Controller Implementation
```typescript
// src/modules/requests/controllers/requests.controller.ts
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerResponse } from '@nestjs/swagger';
import { RequestsService } from '../services/requests.service';
import { CreateRequestDto, UpdateRequestDto, RequestFiltersDto } from '../dto/request.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { ResponseTransformInterceptor } from '../../../common/interceptors/response-transform.interceptor';
import { CacheInterceptor } from '../../../common/interceptors/cache.interceptor';
import { RateLimitingGuard, RateLimit } from '../../../common/guards/rate-limiting.guard';
import { Cache } from '../../../common/decorators/cache.decorator';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { UserRole } from '../../users/enums/user.enum';
import { ApiResponse } from '../../../common/interfaces/api-response.interface';

@ApiTags('requests')
@Controller('requests')
@UseGuards(JwtAuthGuard, RoleGuard, RateLimitingGuard)
@UseInterceptors(ResponseTransformInterceptor)
export class RequestsController {
  constructor(private readonly requestsService: RequestsService) {}

  @Post()
  @Roles(UserRole.CLIENT, UserRole.ADMIN)
  @RateLimit({ requests: 10, windowMs: 60000 }) // 10 requests per minute
  @ApiOperation({ summary: 'Create a new service request' })
  @SwaggerResponse({ status: 201, description: 'Request created successfully' })
  @SwaggerResponse({ status: 400, description: 'Invalid request data' })
  async create(
    @Body() createRequestDto: CreateRequestDto,
    @CurrentUser() user: any
  ): Promise<ApiResponse> {
    const request = await this.requestsService.create(createRequestDto, user.id);
    return { success: true, data: request };
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.INTERPRETER)
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 300 }) // 5 minutes cache
  @ApiOperation({ summary: 'Get requests with filtering and pagination' })
  async findAll(
    @Query() filters: RequestFiltersDto,
    @CurrentUser() user: any
  ): Promise<ApiResponse> {
    const result = await this.requestsService.findAll(filters, user);
    return {
      success: true,
      data: result.items,
      meta: {
        pagination: {
          page: filters.pageNumber,
          limit: filters.limitNumber,
          total: result.total,
          totalPages: Math.ceil(result.total / filters.limitNumber),
        },
      },
    };
  }

  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.CLIENT, UserRole.INTERPRETER)
  @UseInterceptors(CacheInterceptor)
  @Cache({ ttl: 600, key: 'request:detail' }) // 10 minutes cache
  @ApiOperation({ summary: 'Get request by ID' })
  async findOne(
    @Param('id') id: string,
    @CurrentUser() user: any
  ): Promise<ApiResponse> {
    const request = await this.requestsService.findOne(id, user);
    return { success: true, data: request };
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @RateLimit({ requests: 20, windowMs: 60000 })
  @ApiOperation({ summary: 'Update request' })
  async update(
    @Param('id') id: string,
    @Body() updateRequestDto: UpdateRequestDto,
    @CurrentUser() user: any
  ): Promise<ApiResponse> {
    const request = await this.requestsService.update(id, updateRequestDto, user);
    return { success: true, data: request };
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.CLIENT)
  @RateLimit({ requests: 5, windowMs: 60000 })
  @ApiOperation({ summary: 'Cancel request' })
  async remove(
    @Param('id') id: string,
    @CurrentUser() user: any
  ): Promise<ApiResponse> {
    await this.requestsService.remove(id, user);
    return { success: true, data: null };
  }
}
```

## Implementation Checklist

### Phase 1: Critical Infrastructure ✅
- [x] Standardized API response format
- [x] Comprehensive error handling system
- [x] Security interceptors and guards
- [x] Rate limiting implementation
- [x] Data encryption services

### Phase 2: Core Services 🔄
- [x] Complete DTO validation system
- [x] Redis caching implementation
- [x] Performance optimization interceptors
- [ ] Health check endpoints (to be implemented)
- [ ] Comprehensive logging system (to be implemented)

### Phase 3: Testing & Quality 📋
- [ ] Unit testing framework setup
- [ ] Integration test suites
- [ ] Performance testing infrastructure
- [ ] Monitoring and alerting systems

### Phase 4: Production Readiness 🚀
- [ ] Security audit implementation
- [ ] Deployment configurations
- [ ] Documentation finalization
- [ ] Production deployment procedures

This comprehensive implementation provides a solid foundation for the LinguaLink platform with enterprise-grade standards for API consistency, security, performance, and maintainability. 