import { Injectable } from '@nestjs/common';
import { TypeOrmOptionsFactory, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { ServiceRequest } from '../requests/entities/service-request.entity';
import { Session } from '../sessions/entities/session.entity';
import { Translation } from '../translations/entities/translation.entity';
import { Document } from '../translations/entities/document.entity';
import { Interpreter } from '../interpreters/entities/interpreter.entity';
import { InterpreterSession } from '../sessions/entities/interpreter-session.entity';
import { Invoice } from '../payments/entities/invoice.entity';

@Injectable()
export class DatabaseConfig implements TypeOrmOptionsFactory {
  constructor(private configService: ConfigService) {}

  createTypeOrmOptions(): TypeOrmModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    
    // Use SQLite for development/testing if no DATABASE_URL is provided
    const databaseUrl = this.configService.get<string>('DATABASE_URL');
    
    if (!databaseUrl && nodeEnv === 'development') {
      // For development without DATABASE_URL, you need to provide one
      throw new Error('DATABASE_URL is required. Please provide your Supabase connection string.');
    }

    return {
      type: 'postgres',
      url: databaseUrl,
      host: this.configService.get<string>('DATABASE_HOST', 'localhost'),
      port: this.configService.get<number>('DATABASE_PORT', 5432),
      username: this.configService.get<string>('DATABASE_USERNAME'),
      password: this.configService.get<string>('DATABASE_PASSWORD'),
      database: this.configService.get<string>('DATABASE_NAME'),
      ssl: this.configService.get<boolean>('DATABASE_SSL', false)
        ? { rejectUnauthorized: false }
        : false,
      entities: [User, ServiceRequest, Session, Translation, Document, Interpreter, InterpreterSession, Invoice],
      migrations: [__dirname + '/../database/migrations/*{.ts,.js}'],
      synchronize: nodeEnv === 'development',
      logging: nodeEnv === 'development',
      autoLoadEntities: true,
      retryAttempts: 3,
      retryDelay: 3000,
      keepConnectionAlive: true,
      extra: {
        max: 20, // Maximum number of clients in the pool
        min: 5,  // Minimum number of clients in the pool
        idleTimeoutMillis: 30000, // Close connections after 30 seconds of inactivity
        connectionTimeoutMillis: 2000, // Return an error after 2 seconds if connection could not be established
      },
    };
  }
} 