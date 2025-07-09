import React from 'react';
import { 
  Box, 
  Typography, 
  Paper 
} from '@mui/material';

const Profile: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Profile
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 8 }}>
          Profile page coming soon...
          <br />
          This will show user profile information and settings.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Profile; 