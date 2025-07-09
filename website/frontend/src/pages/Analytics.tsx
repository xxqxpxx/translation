import React from 'react';
import { 
  Box, 
  Typography, 
  Paper 
} from '@mui/material';

const Analytics: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Analytics
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 8 }}>
          Analytics page coming soon...
          <br />
          This will show performance metrics and insights.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Analytics; 