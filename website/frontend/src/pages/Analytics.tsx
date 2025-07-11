import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  Button,
  TextField,
  Skeleton,
  Stack,
} from '@mui/material';
import { getUsageAnalytics, getRevenueAnalytics, getPerformanceMetrics, exportAnalyticsReport } from '../services/analyticsApi';
import dayjs from 'dayjs';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from 'recharts';

const Analytics: React.FC = () => {
  const [from, setFrom] = useState(dayjs().subtract(30, 'day').format('YYYY-MM-DD'));
  const [to, setTo] = useState(dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [usage, setUsage] = useState<any>(null);
  const [revenue, setRevenue] = useState<any>(null);
  const [performance, setPerformance] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usageRes, revenueRes, perfRes] = await Promise.all([
        getUsageAnalytics(from, to),
        getRevenueAnalytics(from, to),
        getPerformanceMetrics(from, to),
      ]);
      setUsage((usageRes as any).data.data);
      setRevenue((revenueRes as any).data.data);
      setPerformance((perfRes as any).data.data);
    } catch (err: any) {
      setError('Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line
  }, [from, to]);

  const handleExport = async (type: 'csv' | 'json') => {
    try {
      const res = await exportAnalyticsReport(type, from, to);
      if (type === 'csv') {
        const csv = (res as any).data.data.csv;
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analytics_report.csv';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify((res as any).data.data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'analytics_report.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert('Failed to export report.');
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Analytics Dashboard
      </Typography>
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="space-between">
          <Box>
            <TextField
              label="From"
              type="date"
              size="small"
              value={from}
              onChange={e => setFrom(e.target.value)}
              sx={{ mr: 2 }}
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={to}
              onChange={e => setTo(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Box>
          <Box>
            <Button variant="outlined" sx={{ mr: 1 }} onClick={() => handleExport('csv')}>Export CSV</Button>
            <Button variant="contained" onClick={() => handleExport('json')}>Export JSON</Button>
          </Box>
        </Stack>
      </Paper>
      {error && (
        <Paper sx={{ p: 3, mb: 2 }}>
          <Typography color="error">{error}</Typography>
        </Paper>
      )}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, minHeight: 200 }}>
            <Typography variant="h6" gutterBottom>User Activity</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={120} />
            ) : (
              <Box>
                <Typography variant="body2">Users: {usage?.totalUsers ?? '-'}</Typography>
                <Typography variant="body2">Active Users: {usage?.activeUsers ?? '-'}</Typography>
                <Typography variant="body2">Translation Requests: {usage?.translationRequests ?? '-'}</Typography>
                <Typography variant="body2">Interpreter Sessions: {usage?.interpreterSessions ?? '-'}</Typography>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={[{ name: 'Total Users', value: usage?.totalUsers }, { name: 'Active Users', value: usage?.activeUsers }, { name: 'Translation Requests', value: usage?.translationRequests }, { name: 'Interpreter Sessions', value: usage?.interpreterSessions }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#8884d8" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, minHeight: 200 }}>
            <Typography variant="h6" gutterBottom>Revenue</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={120} />
            ) : (
              <Box>
                <Typography variant="body2">Total Revenue: ${revenue?.totalRevenue ?? '-'}</Typography>
                <Typography variant="body2">Invoice Count: {revenue?.invoiceCount ?? '-'}</Typography>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={[{ name: 'Total Revenue', value: revenue?.totalRevenue }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, minHeight: 200 }}>
            <Typography variant="h6" gutterBottom>Performance</Typography>
            {loading ? (
              <Skeleton variant="rectangular" height={120} />
            ) : (
              <Box>
                <Typography variant="body2">Avg. Turnaround Hours: {performance?.avgTurnaroundHours ?? '-'}</Typography>
                <Typography variant="body2">Avg. Session Duration Minutes: {performance?.avgSessionDurationMinutes ?? '-'}</Typography>
                <ResponsiveContainer width="100%" height={60}>
                  <BarChart data={[{ name: 'Avg. Turnaround Hours', value: performance?.avgTurnaroundHours }, { name: 'Avg. Session Duration Minutes', value: performance?.avgSessionDurationMinutes }]}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" fill="#ffc658" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Analytics; 