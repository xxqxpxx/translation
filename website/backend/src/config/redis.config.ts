import { Injectable } from '@nestjs/common';
import { CacheOptionsFactory, CacheModuleOptions } from '@nestjs/cache-manager';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisConfig implements CacheOptionsFactory {
  constructor(private configService: ConfigService) {}

  createCacheOptions(): CacheModuleOptions {
    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    
    // Use in-memory cache for development/testing with safe defaults
    if (nodeEnv === 'development') {
      return {
        ttl: 3600000, // 1 hour in milliseconds
        max: 100, // Maximum 100 items
      };
    }

    // Use Redis for production
    const ttlValue = Number(this.configService.get<string>('CACHE_TTL', '3600'));
    const maxValue = Number(this.configService.get<string>('CACHE_MAX_ITEMS', '1000'));
    
    return {
      store: 'redis',
      host: this.configService.get<string>('REDIS_HOST', 'localhost'),
      port: this.configService.get<number>('REDIS_PORT', 6379),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      db: this.configService.get<number>('REDIS_DB', 0),
      ttl: ttlValue,
      max: maxValue,
    };
  }
} 