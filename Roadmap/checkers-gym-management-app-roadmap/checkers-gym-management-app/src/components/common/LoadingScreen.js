import React from 'react';
import { Box, CircularProgress, Stack, Typography } from '@mui/material';

const LoadingScreen = ({ message = 'Loading your gym app...' }) => (
  <Stack
    alignItems="center"
    justifyContent="center"
    spacing={2}
    sx={{ width: '100%', minHeight: '40vh', textAlign: 'center', px: 2 }}
  >
    <CircularProgress color="error" />
    <Typography color="text.secondary">{message}</Typography>
  </Stack>
);

export default LoadingScreen;
