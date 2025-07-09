import { Injectable, Inject } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

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

@Injectable()
export class HealthService {
  constructor(
    @InjectDataSource()
    private dataSource: DataSource,
    @Inject(CACHE_MANAGER)
    private cacheManager: Cache,
  ) {}

  async getHealth(): Promise<HealthCheckResponse> {
    const services = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
      external: await this.checkExternalServices(),
    };

    const isHealthy = Object.values(services).every(status => status === 'up');

    return {
      status: isHealthy ? 'healthy' : 'unhealthy',
      services,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  async getLiveness(): Promise<{ status: string; timestamp: string }> {
    return {
      status: 'alive',
      timestamp: new Date().toISOString(),
    };
  }

  async getReadiness(): Promise<{ status: string; timestamp: string; checks: Record<string, string> }> {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const isReady = Object.values(checks).every(status => status === 'up');

    return {
      status: isReady ? 'ready' : 'not_ready',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkDatabase(): Promise<'up' | 'down'> {
    try {
      await this.dataSource.query('SELECT 1');
      return 'up';
    } catch (error) {
      console.error('Database health check failed:', error);
      return 'down';
    }
  }

  private async checkRedis(): Promise<'up' | 'down'> {
    try {
      await this.cacheManager.set('health_check', 'ok', 1000);
      const result = await this.cacheManager.get('health_check');
      if (result === 'ok') {
        await this.cacheManager.del('health_check');
        return 'up';
      }
      return 'down';
    } catch (error) {
      console.error('Redis health check failed:', error);
      return 'down';
    }
  }

  private async checkExternalServices(): Promise<'up' | 'down'> {
    try {
      // Add checks for external services like Clerk, Stripe, etc.
      // For now, just return 'up' as a placeholder
      return 'up';
    } catch (error) {
      console.error('External services health check failed:', error);
      return 'down';
    }
  }

  async getDetailedHealth() {
    const [databaseStats, redisStats] = await Promise.all([
      this.getDatabaseStats(),
      this.getRedisStats(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      database: databaseStats,
      redis: redisStats,
    };
  }

  private async getDatabaseStats() {
    try {
      const result = await this.dataSource.query(`
        SELECT 
          COUNT(*) as total_connections,
          SUM(CASE WHEN state = 'active' THEN 1 ELSE 0 END) as active_connections
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `);

      return {
        status: 'up',
        connections: result[0],
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }

  private async getRedisStats() {
    try {
      // Basic Redis connectivity check
      await this.cacheManager.set('stats_check', 'ok', 1000);
      await this.cacheManager.del('stats_check');

      return {
        status: 'up',
        connected: true,
      };
    } catch (error) {
      return {
        status: 'down',
        error: error.message,
      };
    }
  }
} 