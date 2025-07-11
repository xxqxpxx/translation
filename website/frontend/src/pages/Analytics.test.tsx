import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Analytics from './Analytics';

jest.mock('dayjs', () => ({
  __esModule: true,
  default: () => ({
    subtract: () => ({ format: () => '2023-01-01' }),
    format: () => '2023-01-31',
  }),
}));

jest.mock('../services/analyticsApi', () => ({
  getUsageAnalytics: jest.fn(() => Promise.resolve({ data: { data: { totalUsers: 10, activeUsers: 8, translationRequests: 5, interpreterSessions: 3 } } })),
  getRevenueAnalytics: jest.fn(() => Promise.resolve({ data: { data: { totalRevenue: 1000, invoiceCount: 4 } } })),
  getPerformanceMetrics: jest.fn(() => Promise.resolve({ data: { data: { avgTurnaroundHours: 2, avgSessionDurationMinutes: 45 } } })),
  exportAnalyticsReport: jest.fn(() => Promise.resolve({ data: { data: { csv: 'metric,value\ntotalUsers,10', json: '{}' } } })),
}));

describe('Analytics Dashboard', () => {
  it('renders dashboard title and export buttons', async () => {
    render(<Analytics />);
    expect(screen.getByText(/Analytics Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/Export CSV/i)).toBeInTheDocument();
    expect(screen.getByText(/Export JSON/i)).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText(/User Activity/i)).toBeInTheDocument());
    await waitFor(() => expect(screen.getByText(/Users:\s*10/i)).toBeInTheDocument());
  });
}); 