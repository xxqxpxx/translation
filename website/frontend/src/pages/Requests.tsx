import React from 'react';
import { 
  Box, 
  Typography, 
  Paper 
} from '@mui/material';

const Requests: React.FC = () => {
  return (
    <Box>
      <Typography variant="h4" component="h1" fontWeight="bold" gutterBottom>
        Requests
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography variant="body1" color="text.secondary" align="center" sx={{ py: 8 }}>
          Requests page coming soon...
          <br />
          This will show translation and interpretation requests.
        </Typography>
      </Paper>
    </Box>
  );
};

export default Requests; 