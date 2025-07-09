import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();
    const { method, url, ip, headers } = request;
    const userAgent = headers['user-agent'] || '';
    
    const now = Date.now();
    
    this.logger.log(
      `${method} ${url} - ${ip} - ${userAgent} - Started`,
    );

    return next.handle().pipe(
      tap(() => {
        const { statusCode } = response;
        const duration = Date.now() - now;
        
        this.logger.log(
          `${method} ${url} - ${statusCode} - ${duration}ms - Completed`,
        );
      }),
    );
  }
} 