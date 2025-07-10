import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CacheModule } from '@nestjs/cache-manager';
import { ThrottlerModule } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';

import { DatabaseConfig } from '@/config/database.config';
import { RedisConfig } from '@/config/redis.config';
import { ValidationConfig } from '@/config/validation.config';

import { AuthModule } from '@/auth/auth.module';
import { UsersModule } from '@/users/users.module';
import { RequestsModule } from '@/requests/requests.module';
import { SessionsModule } from '@/sessions/sessions.module';
import { PaymentsModule } from '@/payments/payments.module';
import { NotificationsModule } from '@/notifications/notifications.module';
import { AnalyticsModule } from '@/analytics/analytics.module';
import { HealthModule } from '@/health/health.module';
import { CommonModule } from '@/common/common.module';
import { TranslationsModule } from '@/translations/translations.module';
import { InterpretersModule } from './interpreters/interpreters.module';
import { RealtimeModule } from './realtime/realtime.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.development', '.env.production', '.env'],
      validationSchema: ValidationConfig,
      validationOptions: {
        allowUnknown: true,
        abortEarly: true,
      },
    }),

    // Database
    TypeOrmModule.forRootAsync({
      useClass: DatabaseConfig,
    }),

    // Cache (Redis)
    CacheModule.registerAsync({
      useClass: RedisConfig,
      isGlobal: true,
    }),

    // Rate limiting
    ThrottlerModule.forRoot([
      {
        name: 'short',
        ttl: 1000,
        limit: 3,
      },
      {
        name: 'medium',
        ttl: 10000,
        limit: 20,
      },
      {
        name: 'long',
        ttl: 60000,
        limit: 100,
      },
    ]),

    // Scheduling
    ScheduleModule.forRoot(),

    // Event handling
    EventEmitterModule.forRoot(),

    // Application modules
    CommonModule,
    HealthModule,
    AuthModule,
    UsersModule,
    TranslationsModule,
    RequestsModule,
    SessionsModule,
    PaymentsModule,
    NotificationsModule,
    AnalyticsModule,
    InterpretersModule,
    RealtimeModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {} 