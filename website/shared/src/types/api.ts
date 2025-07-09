import { z } from 'zod';

// Standardized API Response Interface
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination?: PaginationMeta;
  };
}

// Pagination Interface
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

// Error Codes Enumeration
export enum ErrorCode {
  // Authentication Errors (AUTH_*)
  AUTH_INVALID_TOKEN = 'AUTH_INVALID_TOKEN',
  AUTH_TOKEN_EXPIRED = 'AUTH_TOKEN_EXPIRED',
  AUTH_INSUFFICIENT_PERMISSIONS = 'AUTH_INSUFFICIENT_PERMISSIONS',
  AUTH_USER_NOT_FOUND = 'AUTH_USER_NOT_FOUND',
  AUTH_INVALID_CREDENTIALS = 'AUTH_INVALID_CREDENTIALS',

  // Validation Errors (VAL_*)
  VAL_INVALID_INPUT = 'VAL_INVALID_INPUT',
  VAL_MISSING_REQUIRED_FIELD = 'VAL_MISSING_REQUIRED_FIELD',
  VAL_INVALID_FORMAT = 'VAL_INVALID_FORMAT',
  VAL_VALUE_TOO_LARGE = 'VAL_VALUE_TOO_LARGE',
  VAL_VALUE_TOO_SMALL = 'VAL_VALUE_TOO_SMALL',

  // Request Errors (REQ_*)
  REQ_NOT_FOUND = 'REQ_NOT_FOUND',
  REQ_DUPLICATE_RESOURCE = 'REQ_DUPLICATE_RESOURCE',
  REQ_INVALID_STATE = 'REQ_INVALID_STATE',
  REQ_RESOURCE_LOCKED = 'REQ_RESOURCE_LOCKED',
  REQ_OPERATION_NOT_ALLOWED = 'REQ_OPERATION_NOT_ALLOWED',

  // Internal Errors (INT_*)
  INT_DATABASE_ERROR = 'INT_DATABASE_ERROR',
  INT_EXTERNAL_SERVICE_ERROR = 'INT_EXTERNAL_SERVICE_ERROR',
  INT_CONFIGURATION_ERROR = 'INT_CONFIGURATION_ERROR',
  INT_UNKNOWN_ERROR = 'INT_UNKNOWN_ERROR',

  // Session Errors (SES_*)
  SES_NOT_FOUND = 'SES_NOT_FOUND',
  SES_ALREADY_STARTED = 'SES_ALREADY_STARTED',
  SES_ALREADY_COMPLETED = 'SES_ALREADY_COMPLETED',
  SES_INTERPRETER_NOT_AVAILABLE = 'SES_INTERPRETER_NOT_AVAILABLE',

  // File Errors (FILE_*)
  FILE_TOO_LARGE = 'FILE_TOO_LARGE',
  FILE_INVALID_TYPE = 'FILE_INVALID_TYPE',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',

  // Payment Errors (PAY_*)
  PAY_PAYMENT_FAILED = 'PAY_PAYMENT_FAILED',
  PAY_INSUFFICIENT_FUNDS = 'PAY_INSUFFICIENT_FUNDS',
  PAY_INVALID_PAYMENT_METHOD = 'PAY_INVALID_PAYMENT_METHOD',

  // System Errors (SYS_*)
  SYS_RATE_LIMIT_EXCEEDED = 'SYS_RATE_LIMIT_EXCEEDED',
  SYS_MAINTENANCE_MODE = 'SYS_MAINTENANCE_MODE',
  SYS_SERVICE_UNAVAILABLE = 'SYS_SERVICE_UNAVAILABLE',

  // Business Logic Errors (BIZ_*)
  BIZ_INSUFFICIENT_CREDITS = 'BIZ_INSUFFICIENT_CREDITS',
  BIZ_FEATURE_NOT_AVAILABLE = 'BIZ_FEATURE_NOT_AVAILABLE',
  BIZ_SUBSCRIPTION_EXPIRED = 'BIZ_SUBSCRIPTION_EXPIRED',
}

// HTTP Status Codes
export enum HttpStatus {
  OK = 200,
  CREATED = 201,
  NO_CONTENT = 204,
  BAD_REQUEST = 400,
  UNAUTHORIZED = 401,
  FORBIDDEN = 403,
  NOT_FOUND = 404,
  CONFLICT = 409,
  UNPROCESSABLE_ENTITY = 422,
  TOO_MANY_REQUESTS = 429,
  INTERNAL_SERVER_ERROR = 500,
  SERVICE_UNAVAILABLE = 503,
}

// Request/Response Types
export interface PaginatedRequest {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    timestamp: string;
    version: string;
    requestId: string;
    pagination: PaginationMeta;
  };
}

// Health Check Response
export interface HealthCheckResponse {
  status: 'healthy' | 'unhealthy';
  services: {
    database: 'up' | 'down';
    redis: 'up' | 'down';
    external: 'up' | 'down';
  };
  timestamp: string;
  uptime: number;
}

// Zod Schemas for Validation
export const PaginatedRequestSchema = z.object({
  page: z.number().min(1).optional().default(1),
  limit: z.number().min(1).max(100).optional().default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
  search: z.string().optional(),
});

export const ApiResponseSchema = z.object({
  success: z.boolean(),
  data: z.any().optional(),
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.any().optional(),
  }).optional(),
  meta: z.object({
    timestamp: z.string(),
    version: z.string(),
    requestId: z.string(),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      total: z.number(),
      totalPages: z.number(),
      hasNext: z.boolean(),
      hasPrev: z.boolean(),
    }).optional(),
  }).optional(),
});

// Type Guards
export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: true; data: T } {
  return response.success === true && response.data !== undefined;
}

export function isErrorResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { success: false; error: NonNullable<ApiResponse<T>['error']> } {
  return response.success === false && response.error !== undefined;
} 