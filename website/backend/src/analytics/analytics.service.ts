import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Translation } from '../translations/entities/translation.entity';
import { InterpreterSession } from '../sessions/entities/interpreter-session.entity';
import { Invoice } from '../payments/entities/invoice.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Translation)
    private readonly translationRepository: Repository<Translation>,
    @InjectRepository(InterpreterSession)
    private readonly sessionRepository: Repository<InterpreterSession>,
    @InjectRepository(Invoice)
    private readonly invoiceRepository: Repository<Invoice>,
  ) {}

  async getUsageAnalytics(from?: string, to?: string) {
    // Date filter
    const dateFilter: any = {};
    if (from) dateFilter['createdAt'] = { ...(dateFilter['createdAt'] || {}), $gte: new Date(from) };
    if (to) dateFilter['createdAt'] = { ...(dateFilter['createdAt'] || {}), $lte: new Date(to) };

    // Users
    const totalUsers = await this.userRepository.count();
    const activeUsers = await this.userRepository.count({ where: { isActive: true } });

    // Translation Requests
    const translationWhere: any = {};
    if (from || to) translationWhere.createdAt = {};
    if (from) translationWhere.createdAt['$gte'] = new Date(from);
    if (to) translationWhere.createdAt['$lte'] = new Date(to);
    const translationRequests = await this.translationRepository.count({ where: translationWhere });

    // Interpreter Sessions
    const sessionWhere: any = {};
    if (from || to) sessionWhere.createdAt = {};
    if (from) sessionWhere.createdAt['$gte'] = new Date(from);
    if (to) sessionWhere.createdAt['$lte'] = new Date(to);
    const interpreterSessions = await this.sessionRepository.count({ where: sessionWhere });

    return {
      success: true,
      data: {
        totalUsers,
        activeUsers,
        translationRequests,
        interpreterSessions,
        from,
        to,
      },
    };
  }

  async getRevenueAnalytics(from?: string, to?: string) {
    // Date filter
    const invoiceWhere: any = {};
    if (from || to) invoiceWhere.createdAt = {};
    if (from) invoiceWhere.createdAt['$gte'] = new Date(from);
    if (to) invoiceWhere.createdAt['$lte'] = new Date(to);
    const invoices = await this.invoiceRepository.find({ where: invoiceWhere });
    const totalRevenue = invoices.reduce((sum, inv) => sum + Number(inv.amount), 0);
    const invoiceCount = invoices.length;
    return {
      success: true,
      data: {
        totalRevenue,
        invoiceCount,
        from,
        to,
      },
    };
  }

  async getPerformanceMetrics(from?: string, to?: string) {
    // Translation turnaround time (completed only)
    const translationWhere: any = { status: 'completed' };
    if (from || to) translationWhere.completedAt = {};
    if (from) translationWhere.completedAt['$gte'] = new Date(from);
    if (to) translationWhere.completedAt['$lte'] = new Date(to);
    const completedTranslations = await this.translationRepository.find({ where: translationWhere });
    const avgTurnaround = completedTranslations.length
      ? completedTranslations.reduce((sum, t) => sum + ((t.completedAt?.getTime() || 0) - (t.createdAt?.getTime() || 0)), 0) / completedTranslations.length / (1000 * 60 * 60)
      : 0;

    // Interpreter session duration (completed only)
    const sessionWhere: any = { status: 'completed' };
    if (from || to) sessionWhere.actualEndTime = {};
    if (from) sessionWhere.actualEndTime['$gte'] = new Date(from);
    if (to) sessionWhere.actualEndTime['$lte'] = new Date(to);
    const completedSessions = await this.sessionRepository.find({ where: sessionWhere });
    const avgSessionDuration = completedSessions.length
      ? completedSessions.reduce((sum, s) => sum + (s.actualDuration || 0), 0) / completedSessions.length
      : 0;

    return {
      success: true,
      data: {
        avgTurnaroundHours: avgTurnaround,
        avgSessionDurationMinutes: avgSessionDuration,
        from,
        to,
      },
    };
  }

  async exportReport(type: 'csv' | 'json' = 'json', from?: string, to?: string) {
    // Gather all analytics
    const usage = await this.getUsageAnalytics(from, to);
    const revenue = await this.getRevenueAnalytics(from, to);
    const performance = await this.getPerformanceMetrics(from, to);

    const report = {
      usage: usage.data,
      revenue: revenue.data,
      performance: performance.data,
      from,
      to,
    };

    if (type === 'json') {
      return { success: true, data: report };
    }

    // Flatten for CSV
    const rows = [
      { metric: 'totalUsers', value: usage.data.totalUsers },
      { metric: 'activeUsers', value: usage.data.activeUsers },
      { metric: 'translationRequests', value: usage.data.translationRequests },
      { metric: 'interpreterSessions', value: usage.data.interpreterSessions },
      { metric: 'totalRevenue', value: revenue.data.totalRevenue },
      { metric: 'invoiceCount', value: revenue.data.invoiceCount },
      { metric: 'avgTurnaroundHours', value: performance.data.avgTurnaroundHours },
      { metric: 'avgSessionDurationMinutes', value: performance.data.avgSessionDurationMinutes },
    ];
    const csv = 'metric,value\n' + rows.map(r => `${r.metric},${r.value}`).join('\n');
    return { success: true, data: { type: 'csv', csv, from, to } };
  }
} 