import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();

    const requestId = request.headers['x-request-id'] || uuidv4();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let code = 'INT_UNKNOWN_ERROR';
    let message = 'Internal server error';
    let details: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || exception.message;
        code = responseObj.code || this.getErrorCodeFromStatus(status);
        details = responseObj.details || null;
      } else {
        message = exceptionResponse as string;
        code = this.getErrorCodeFromStatus(status);
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      // Map specific error types
      if (exception.name === 'ValidationError') {
        status = HttpStatus.BAD_REQUEST;
        code = 'VAL_INVALID_INPUT';
      } else if (exception.name === 'UnauthorizedError') {
        status = HttpStatus.UNAUTHORIZED;
        code = 'AUTH_INVALID_TOKEN';
      }
    }

    // Log the error
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${code} - ${message}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Send standardized error response
    response.status(status).json({
      success: false,
      error: {
        code,
        message,
        ...(details && { details }),
      },
      meta: {
        timestamp: new Date().toISOString(),
        version: '1.0',
        requestId,
      },
    });
  }

  private getErrorCodeFromStatus(status: number): string {
    switch (status) {
      case HttpStatus.BAD_REQUEST:
        return 'VAL_INVALID_INPUT';
      case HttpStatus.UNAUTHORIZED:
        return 'AUTH_INVALID_TOKEN';
      case HttpStatus.FORBIDDEN:
        return 'AUTH_INSUFFICIENT_PERMISSIONS';
      case HttpStatus.NOT_FOUND:
        return 'REQ_NOT_FOUND';
      case HttpStatus.CONFLICT:
        return 'REQ_DUPLICATE_RESOURCE';
      case HttpStatus.UNPROCESSABLE_ENTITY:
        return 'VAL_INVALID_INPUT';
      case HttpStatus.TOO_MANY_REQUESTS:
        return 'SYS_RATE_LIMIT_EXCEEDED';
      case HttpStatus.INTERNAL_SERVER_ERROR:
        return 'INT_UNKNOWN_ERROR';
      case HttpStatus.SERVICE_UNAVAILABLE:
        return 'SYS_SERVICE_UNAVAILABLE';
      default:
        return 'INT_UNKNOWN_ERROR';
    }
  }
} 