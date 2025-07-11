import { apiClient } from './api';

export const getUsageAnalytics = (from?: string, to?: string) =>
  apiClient.get('/analytics/usage', { from, to });

export const getRevenueAnalytics = (from?: string, to?: string) =>
  apiClient.get('/analytics/revenue', { from, to });

export const getPerformanceMetrics = (from?: string, to?: string) =>
  apiClient.get('/analytics/performance', { from, to });

export const exportAnalyticsReport = (type: 'csv' | 'json' = 'json', from?: string, to?: string) =>
  apiClient.get('/analytics/export', { type, from, to }); 