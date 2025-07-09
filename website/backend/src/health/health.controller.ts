import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { HealthService } from './health.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Health check' })
  @ApiResponse({ status: 200, description: 'Service health status' })
  async getHealth() {
    return this.healthService.getHealth();
  }

  @Get('live')
  @Public()
  @ApiOperation({ summary: 'Liveness probe' })
  @ApiResponse({ status: 200, description: 'Service is alive' })
  async getLiveness() {
    return this.healthService.getLiveness();
  }

  @Get('ready')
  @Public()
  @ApiOperation({ summary: 'Readiness probe' })
  @ApiResponse({ status: 200, description: 'Service is ready' })
  async getReadiness() {
    return this.healthService.getReadiness();
  }

  @Get('detailed')
  @Public()
  @ApiOperation({ summary: 'Detailed health information' })
  @ApiResponse({ status: 200, description: 'Detailed service health metrics' })
  async getDetailedHealth() {
    return this.healthService.getDetailedHealth();
  }
} 