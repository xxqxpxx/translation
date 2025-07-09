import React from 'react';
import { 
  Box, 
  Typography, 
  Paper 
} from '@mui/material';

const Settings: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Settings
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 8 }}>
          Settings page coming soon...
          <br />
          This will show application and user preferences.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Settings; 