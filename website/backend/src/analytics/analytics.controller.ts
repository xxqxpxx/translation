import { Controller, Get, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';

@ApiTags('Analytics')
@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('usage')
  @ApiOperation({ summary: 'Get usage analytics (user activity, requests, etc.)' })
  @ApiResponse({ status: 200, description: 'Usage analytics data' })
  getUsage(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getUsageAnalytics(from, to);
  }

  @Get('revenue')
  @ApiOperation({ summary: 'Get revenue analytics (invoices, payments)' })
  @ApiResponse({ status: 200, description: 'Revenue analytics data' })
  getRevenue(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getRevenueAnalytics(from, to);
  }

  @Get('performance')
  @ApiOperation({ summary: 'Get performance metrics (API response times, error rates)' })
  @ApiResponse({ status: 200, description: 'Performance metrics data' })
  getPerformance(@Query('from') from?: string, @Query('to') to?: string) {
    return this.analyticsService.getPerformanceMetrics(from, to);
  }

  @Get('export')
  @ApiOperation({ summary: 'Export analytics report (CSV/JSON)' })
  @ApiResponse({ status: 200, description: 'Exported analytics report' })
  async exportReport(
    @Query('type') type: 'csv' | 'json' = 'json',
    @Query('from') from: string | undefined,
    @Query('to') to: string | undefined,
    @Res({ passthrough: false }) res: Response,
  ) {
    const result = await this.analyticsService.exportReport(type, from, to);
    if (type === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="analytics_report.csv"');
      return res.send((result.data as any).csv);
    }
    return res.json(result);
  }
} 