import { Module } from '@nestjs/common';
import { ResponseTransformInterceptor } from './interceptors/response-transform.interceptor';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AllExceptionsFilter } from './filters/all-exceptions.filter';
import { TenantMiddleware } from './middleware/tenant.middleware';

@Module({
  providers: [
    ResponseTransformInterceptor,
    LoggingInterceptor,
    AllExceptionsFilter,
    TenantMiddleware,
  ],
  exports: [
    ResponseTransformInterceptor,
    LoggingInterceptor,
    AllExceptionsFilter,
    TenantMiddleware,
  ],
})
export class CommonModule {} 