import React from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  Paper,
  Chip
} from '@mui/material';
import { 
  TrendingUp,
  Assignment,
  People,
  Schedule 
} from '@mui/icons-material';
import { useAuthContext } from '../contexts/AuthContext';

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactElement;
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error' | 'info';
}

const StatCard: React.FC<StatCardProps> = ({ 
  title, 
  value, 
  icon, 
  color = 'primary' 
}) => (
  <Card sx={{ height: '100%' }}>
    <CardContent>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
        <Box
          sx={{
            p: 1.5,
            borderRadius: 2,
            backgroundColor: `${color}.main`,
            color: `${color}.contrastText`,
            mr: 2,
          }}
        >
          {icon}
        </Box>
        <Typography variant="h6" component="div" color="text.secondary">
          {title}
        </Typography>
      </Box>
      <Typography variant="h4" component="div" fontWeight="bold">
        {value}
      </Typography>
    </CardContent>
  </Card>
);

const Dashboard: React.FC = () => {
  const { user } = useAuthContext();

  const getWelcomeMessage = () => {
    const hour = new Date().getHours();
    let greeting = 'Good morning';
    if (hour >= 12 && hour < 17) greeting = 'Good afternoon';
    if (hour >= 17) greeting = 'Good evening';
    
    return `${greeting}, ${user?.firstName || 'User'}!`;
  };

  const getRoleSpecificStats = () => {
    switch (user?.role) {
      case 'client':
        return [
          { title: 'Active Requests', value: 3, icon: <Assignment />, color: 'primary' as const },
          { title: 'Completed Sessions', value: 12, icon: <Schedule />, color: 'success' as const },
          { title: 'Favorite Interpreters', value: 2, icon: <People />, color: 'info' as const },
          { title: 'This Month Spent', value: '$450', icon: <TrendingUp />, color: 'warning' as const },
        ];
      case 'interpreter':
        return [
          { title: 'Sessions Today', value: 5, icon: <Schedule />, color: 'primary' as const },
          { title: 'Total Earnings', value: '$2,340', icon: <TrendingUp />, color: 'success' as const },
          { title: 'Client Reviews', value: '4.9⭐', icon: <People />, color: 'info' as const },
          { title: 'Pending Requests', value: 8, icon: <Assignment />, color: 'warning' as const },
        ];
      case 'admin':
        return [
          { title: 'Total Users', value: 1247, icon: <People />, color: 'primary' as const },
          { title: 'Active Sessions', value: 23, icon: <Schedule />, color: 'success' as const },
          { title: 'Revenue Today', value: '$3,420', icon: <TrendingUp />, color: 'info' as const },
          { title: 'Pending Reviews', value: 15, icon: <Assignment />, color: 'warning' as const },
        ];
      default:
        return [];
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
          {getWelcomeMessage()}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body1" color="text.secondary">
            Welcome to your TransConnect dashboard
          </Typography>
          <Chip 
            label={user?.role} 
            color="primary" 
            size="small" 
            sx={{ textTransform: 'capitalize' }}
          />
        </Box>
      </Box>

      {/* Stats Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {getRoleSpecificStats().map((stat, index) => (
          <Grid item xs={12} sm={6} lg={3} key={index}>
            <StatCard {...stat} />
          </Grid>
        ))}
      </Grid>

      {/* Recent Activity */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" fontWeight="bold" gutterBottom>
          Recent Activity
        </Typography>
        <Box sx={{ mt: 2 }}>
          <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 8 }}>
            Dashboard content coming soon...
            <br />
            This will show recent requests, sessions, and activity based on your role.
          </Typography>
        </Box>
      </Paper>
    </Box>
  );
};

export default Dashboard; 