import React from 'react';
import { Paper, Stack, Typography } from '@mui/material';

const EmptyStateCard = ({ title, description, action = null }) => (
  <Paper
    className="surface-card"
    sx={{
      p: 4,
      borderRadius: 4,
      background: '#fff',
      textAlign: 'center',
    }}
  >
    <Stack spacing={1.5} alignItems="center">
      <Typography variant="h6" fontWeight={700}>
        {title}
      </Typography>
      <Typography color="text.secondary" maxWidth="520px">
        {description}
      </Typography>
      {action}
    </Stack>
  </Paper>
);

export default EmptyStateCard;
